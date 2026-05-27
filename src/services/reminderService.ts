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
  Timestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { Reminder, ReminderCreate } from "../types";

const COLLECTION = "reminders";

function toReminder(snap: DocumentSnapshot): Reminder | null {
  const data = snap.data();
  if (!data) return null;
  return { id: snap.id, ...data } as Reminder;
}

export async function createReminder(data: ReminderCreate): Promise<Reminder> {
  const now = Timestamp.now();
  const payload = {
    personId: data.personId,
    message: data.message,
    date: data.date,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, COLLECTION), payload);
  return { id: docRef.id, ...payload } as Reminder;
}

export async function getReminderById(id: string): Promise<Reminder | null> {
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  return toReminder(snapshot);
}

/** Get all reminders for a person, ordered by date ascending (soonest first). */
export async function getRemindersForPerson(
  personId: string,
): Promise<Reminder[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("personId", "==", personId),
      orderBy("date", "asc"),
    ),
  );
  return snapshot.docs.map((d) => toReminder(d)!);
}

export async function updateReminder(
  id: string,
  data: Partial<Pick<Reminder, "message" | "date">>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteReminder(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

/** Delete every reminder for a person (cascade when deleting a person). */
export async function deleteRemindersForPerson(personId: string): Promise<void> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("personId", "==", personId)),
  );
  await Promise.all(
    snapshot.docs.map((d) => deleteDoc(doc(db, COLLECTION, d.id))),
  );
}
