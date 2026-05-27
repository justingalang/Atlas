import { Timestamp } from "firebase/firestore";

export interface Reminder {
  id: string;
  personId: string;
  /** Free-form reminder text, e.g. "Tomas finishes with Military". */
  message: string;
  /** When the reminder is for. */
  date: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ReminderCreate = Pick<Reminder, "personId" | "message" | "date">;
