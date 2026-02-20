import {
  doc,
  getDoc,
  limit,
  orderBy,
  Timestamp,
  where,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {db as firebaseDb, isFirebaseConfigured} from '../firebase';
import {addDocument, queryDocuments, updateDocument} from './firebaseService';

// --- Data contracts ---
export interface Fact {
  orderIndex: number;
  text: string;
}

export interface Person {
  id: string;
  displayName: string;
  normalizedName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  memo?: string;
}

export interface Encounter {
  id: string;
  personId: string;
  personName: string;
  date: Timestamp;
  placeLabel: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  facts: Fact[];
}

// Input shape for creating a new encounter
export interface NewEncounterInput {
  personId: string;
  personName?: string;
  date: Date | string | Timestamp;
  placeLabel: string;
  facts: Fact[];
}

export interface EncounterUpdateInput {
  personId?: string;
  personName?: string;
  date?: Date | string | Timestamp;
  placeLabel?: string;
  facts?: Fact[];
}

const requireDb = (): Firestore => {
  if (!isFirebaseConfigured || !firebaseDb) {
    throw new Error('Firestore is not initialized. Provide firebaseConfig before calling helpers.');
  }
  return firebaseDb;
};

// --- Utilities ---
const normalizePersonName = (rawName: string): string =>
  rawName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

const toTimestamp = (value: Date | string | Timestamp): Timestamp => {
  if (value instanceof Timestamp) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? Timestamp.now() : Timestamp.fromDate(parsed);
  }
  return Number.isNaN(value.getTime()) ? Timestamp.now() : Timestamp.fromDate(value);
};

const normalizeFacts = (facts: Fact[] = []): Fact[] =>
  (facts || [])
    .map((fact, index) => ({
      orderIndex: typeof fact?.orderIndex === 'number' ? fact.orderIndex : index,
      text: String(fact?.text ?? '').trim(),
    }))
    .filter((fact) => fact.text.length > 0);

const mapEncounterDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): Encounter => {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    personId: data.personId,
    personName: data.personName,
    date: data.date,
    placeLabel: data.placeLabel,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    facts: (data.facts || []).map((fact: Fact, index: number) => ({
      orderIndex: typeof fact?.orderIndex === 'number' ? fact.orderIndex : index,
      text: String(fact?.text ?? '').trim(),
    })),
  };
};

// --- Helpers ---

/**
 * Creates a person under /users/{userId}/people with normalizedName for case-insensitive lookups.
 * Allows optional extra metadata (e.g., memo) to be stored alongside the person record.
 */
export const createPerson = async (
  userId: string,
  displayName: string,
  extra: Record<string, unknown> = {},
): Promise<Person> => {
  requireDb();
  const normalizedName = normalizePersonName(displayName);
  const now = Timestamp.now();

  const payload = {
    ...extra,
    displayName: displayName.trim(),
    normalizedName,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDocument(`users/${userId}/people`, payload);

  return {
    id: docRef.id,
    displayName: payload.displayName,
    normalizedName: payload.normalizedName,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    memo: typeof payload.memo === 'string' ? payload.memo : undefined,
  };
};

/**
 * Looks up a person by normalizedName; returns null when no match is found.
 * Normalization removes diacritics/extra whitespace so user input can be fuzzy but consistent.
 */
export const findPersonByName = async (
  userId: string,
  inputName: string,
): Promise<Person | null> => {
  requireDb();
  const normalizedName = normalizePersonName(inputName);
  const constraints = [
    where('normalizedName', '==', normalizedName),
    orderBy('createdAt'),
    limit(1),
  ];
  const snapshot = await queryDocuments(`users/${userId}/people`, constraints);

  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    displayName: data.displayName,
    normalizedName: data.normalizedName,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    memo: data.memo,
  };
};

/**
 * Finds a person by normalizedName and updates memo/displayName when present; creates when missing.
 */
export const upsertPersonByName = async (
  userId: string,
  displayName: string,
  extra: Record<string, unknown> = {},
): Promise<Person> => {
  const existing = await findPersonByName(userId, displayName);
  const trimmedDisplayName = displayName.trim();
  const normalizedName = normalizePersonName(trimmedDisplayName);
  const now = Timestamp.now();

  if (existing) {
    const updates = {
      ...extra,
      displayName: trimmedDisplayName,
      normalizedName,
      updatedAt: now,
    };
    await updateDocument(`users/${userId}/people`, existing.id, updates);
    return {
      ...existing,
      ...updates,
      memo: typeof updates.memo === 'string' ? updates.memo : existing.memo,
    };
  }

  return createPerson(userId, trimmedDisplayName, extra);
};

/**
 * Persists a new encounter under /users/{userId}/encounters.
 * Ensures personName is denormalized from the person document when missing and trims empty facts.
 */
export const createEncounter = async (
  userId: string,
  encounterInput: NewEncounterInput,
): Promise<Encounter> => {
  const db = requireDb();
  const encounterDate = toTimestamp(encounterInput.date);
  const now = Timestamp.now();

  let personName = encounterInput.personName?.trim();
  if (!personName) {
    const personRef = doc(db, 'users', userId, 'people', encounterInput.personId);
    const personSnap = await getDoc(personRef);
    if (!personSnap.exists()) {
      throw new Error('Person not found for provided personId.');
    }
    personName = (personSnap.data()?.displayName as string) ?? '';
  }

  const facts: Fact[] = normalizeFacts(encounterInput.facts);

  const encounterPayload = {
    personId: encounterInput.personId,
    personName,
    date: encounterDate,
    placeLabel: encounterInput.placeLabel.trim(),
    createdAt: now,
    updatedAt: now,
    facts,
  };

  const docRef = await addDocument(`users/${userId}/encounters`, encounterPayload);

  return {...encounterPayload, id: docRef.id};
};

/**
 * Updates an encounter document and refreshes updatedAt; supports partial updates.
 */
export const updateEncounter = async (
  userId: string,
  encounterId: string,
  updates: EncounterUpdateInput,
): Promise<void> => {
  requireDb();
  if (!encounterId) {
    throw new Error('encounterId is required to update an encounter.');
  }

  const payload: Record<string, unknown> = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  if (updates.date) {
    payload.date = toTimestamp(updates.date);
  }

  if (updates.facts) {
    payload.facts = normalizeFacts(updates.facts);
  }

  if (typeof updates.placeLabel === 'string') {
    payload.placeLabel = updates.placeLabel.trim();
  }

  await updateDocument(`users/${userId}/encounters`, encounterId, payload);
};

/**
 * Returns all encounters for a person ordered by date (most recent first) for timeline views.
 */
export const getEncountersForPerson = async (
  userId: string,
  personId: string,
): Promise<Encounter[]> => {
  const constraints = [
    where('personId', '==', personId),
    orderBy('date', 'desc'),
  ];
  const snapshot = await queryDocuments(`users/${userId}/encounters`, constraints);
  return snapshot.docs.map(mapEncounterDoc);
};

/**
 * Returns encounters whose date is between startDate and endDate, ordered by date.
 * Dates are coerced to Firestore Timestamp to work with range queries and indexes.
 */
export const getEncountersByDateRange = async (
  userId: string,
  startDate: Date | string | Timestamp,
  endDate: Date | string | Timestamp,
): Promise<Encounter[]> => {
  const constraints = [
    where('date', '>=', toTimestamp(startDate)),
    where('date', '<=', toTimestamp(endDate)),
    orderBy('date', 'desc'),
  ];
  const snapshot = await queryDocuments(`users/${userId}/encounters`, constraints);
  return snapshot.docs.map(mapEncounterDoc);
};
