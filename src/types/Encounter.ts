import { Timestamp } from "firebase/firestore";

export interface Fact {
  text: string;
  favorite?: boolean;
}

export interface Encounter {
  id: string;
  personId: string;
  /** Denormalized for quick rendering without a join. */
  personName: string;
  /** Date of the encounter (no time component). Stored as a Firestore Timestamp. */
  date: Timestamp;
  location: string;
  /** Short facts captured during the encounter. New encounters write Fact[];
   * legacy encounters may have string[] which `getEncounterFacts` normalizes. */
  facts: Fact[];
  /** Legacy free-form notes from older encounters. New encounters write `facts` instead. */
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Fields required to create a new Encounter (id and timestamps are generated). */
export type EncounterCreate = Pick<
  Encounter,
  "personId" | "personName" | "date" | "location" | "facts"
>;
