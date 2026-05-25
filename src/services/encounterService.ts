import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  Timestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { Encounter, EncounterCreate } from "../types";

const COLLECTION = "encounters";

function toEncounter(snap: DocumentSnapshot): Encounter | null {
  const data = snap.data();
  if (!data) return null;
  return { id: snap.id, ...data } as Encounter;
}

/** Create a new encounter. Returns the created Encounter with its generated ID. */
export async function createEncounter(
  data: EncounterCreate,
): Promise<Encounter> {
  const now = Timestamp.now();
  const payload = {
    personId: data.personId,
    personName: data.personName,
    date: data.date,
    location: data.location,
    facts: data.facts,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);
  return { id: docRef.id, ...payload } as Encounter;
}

/** Update an encounter's fields. */
export async function updateEncounter(
  id: string,
  data: Partial<Pick<Encounter, "date" | "location" | "facts">>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/** Get all encounters for a person, ordered by date descending. */
export async function getEncountersForPerson(
  personId: string,
): Promise<Encounter[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("personId", "==", personId),
      orderBy("date", "desc"),
    ),
  );
  return snapshot.docs.map((d) => toEncounter(d)!);
}

/** Get all encounters for a specific date. */
export async function getEncountersByDate(date: Date): Promise<Encounter[]> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end)),
      orderBy("date", "desc"),
    ),
  );
  return snapshot.docs.map((d) => toEncounter(d)!);
}

/** Delete every encounter linked to a person. */
export async function deleteEncountersForPerson(
  personId: string,
): Promise<void> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("personId", "==", personId)),
  );
  await Promise.all(
    snapshot.docs.map((d) => deleteDoc(doc(db, COLLECTION, d.id))),
  );
}

/** Get the most recent encounters across all people. */
export async function getRecentEncounters(
  count: number = 20,
): Promise<Encounter[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy("date", "desc"), limit(count)),
  );
  return snapshot.docs.map((d) => toEncounter(d)!);
}

/** Get every encounter across all people, ordered by date descending. */
export async function getAllEncounters(): Promise<Encounter[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy("date", "desc")),
  );
  return snapshot.docs.map((d) => toEncounter(d)!);
}
