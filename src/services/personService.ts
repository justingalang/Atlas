import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { Person, PersonCreate } from "../types";
import { normalizeName } from "../utils/normalizeName";

const COLLECTION = "people";

function toPerson(snap: DocumentSnapshot): Person | null {
  const data = snap.data();
  if (!data) return null;
  return { id: snap.id, ...data } as Person;
}

/** Create a new person. Returns the created Person with its generated ID. */
export async function createPerson(data: PersonCreate): Promise<Person> {
  const now = Timestamp.now();
  const normalized = normalizeName(
    data.lastName ? `${data.firstName} ${data.lastName}` : data.firstName,
  );
  const payload = {
    firstName: data.firstName,
    lastName: data.lastName ?? null,
    nickname: data.nickname ?? null,
    firstMetLocation: data.firstMetLocation ?? null,
    birthday: data.birthday ?? null,
    profession: data.profession ?? null,
    normalizedName: normalized,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);
  return { id: docRef.id, ...payload } as Person;
}

/** Find people by normalized name (case/accent insensitive). Returns all matches. */
export async function findPeopleByName(name: string): Promise<Person[]> {
  const normalized = normalizeName(name);
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("normalizedName", "==", normalized)),
  );
  return snapshot.docs.map((d) => toPerson(d)!).filter(Boolean) as Person[];
}

/**
 * Pick the "canonical" match for a typed name when looking up to populate
 * the nickname field. Prefers the person with no nickname (the original);
 * falls back to the first match otherwise.
 */
export async function findCanonicalPersonByName(
  name: string,
): Promise<Person | null> {
  const matches = await findPeopleByName(name);
  if (matches.length === 0) return null;
  const noNickname = matches.find((p) => !p.nickname);
  return noNickname ?? matches[0];
}

/** Get a single person by ID. */
export async function getPersonById(id: string): Promise<Person | null> {
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  return toPerson(snapshot);
}

/** Get all people, ordered by first name. */
export async function getAllPeople(): Promise<Person[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy("firstName", "asc")),
  );
  return snapshot.docs.map((d) => toPerson(d)!);
}

/** Update a person's fields. Undefined values are coerced to null (Firestore JS SDK rejects undefined).
 *
 * If first or last name changes, also rewrites the denormalized `personName`
 * on every encounter belonging to this person, so renames propagate to
 * Timeline / Calendar / encounter cards.
 */
export async function updatePerson(
  id: string,
  data: Partial<
    Pick<
      Person,
      "firstName" | "lastName" | "nickname" | "firstMetLocation" | "birthday" | "profession"
    >
  >,
): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
  for (const [key, value] of Object.entries(data)) {
    updates[key] = value === undefined ? null : value;
  }

  let nameChanged = false;
  let newDisplayName: string | null = null;

  if (data.firstName !== undefined || data.lastName !== undefined) {
    const current = await getPersonById(id);
    if (current) {
      const first = data.firstName ?? current.firstName;
      const last = data.lastName ?? current.lastName;
      updates.normalizedName = normalizeName(
        last ? `${first} ${last}` : first,
      );
      newDisplayName = last ? `${first} ${last}` : first;
      const oldDisplayName = current.lastName
        ? `${current.firstName} ${current.lastName}`
        : current.firstName;
      nameChanged = newDisplayName !== oldDisplayName;
    }
  }

  if (nameChanged && newDisplayName) {
    // Batch the person update + every encounter's personName rewrite so they
    // either all land together or all fail together.
    const encounters = await getDocs(
      query(collection(db, "encounters"), where("personId", "==", id)),
    );
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTION, id), updates);
    for (const enc of encounters.docs) {
      batch.update(enc.ref, {
        personName: newDisplayName,
        updatedAt: Timestamp.now(),
      });
    }
    await batch.commit();
    return;
  }

  await updateDoc(doc(db, COLLECTION, id), updates);
}

/** Delete a person record. Does NOT cascade to encounters — call deleteEncountersForPerson separately. */
export async function deletePerson(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

/** Atomically delete a person and all their encounters + reminders in a
 * single Firestore batch. If any write fails the whole thing rolls back,
 * so we never leak orphan encounter/reminder docs. */
export async function deletePersonCascade(id: string): Promise<void> {
  const [encounters, reminders] = await Promise.all([
    getDocs(query(collection(db, "encounters"), where("personId", "==", id))),
    getDocs(query(collection(db, "reminders"), where("personId", "==", id))),
  ]);
  const batch = writeBatch(db);
  for (const enc of encounters.docs) batch.delete(enc.ref);
  for (const rem of reminders.docs) batch.delete(rem.ref);
  batch.delete(doc(db, COLLECTION, id));
  await batch.commit();
}
