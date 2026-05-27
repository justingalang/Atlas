import { Timestamp } from "firebase/firestore";

export interface Person {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  firstMetLocation?: string;
  /** ISO date string YYYY-MM-DD (no time component). */
  birthday?: string;
  profession?: string;
  normalizedName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Fields required to create a new Person (id and timestamps are generated). */
export type PersonCreate = Pick<Person, "firstName"> &
  Partial<
    Pick<Person, "lastName" | "nickname" | "firstMetLocation" | "birthday" | "profession">
  >;
