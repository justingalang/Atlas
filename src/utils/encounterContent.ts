import type { Encounter, Fact } from "../types";

/**
 * Returns the encounter's facts as a normalized `Fact[]`. Handles three cases:
 *
 *  1. New shape — `facts` is already `Fact[]` with optional `favorite` flags.
 *  2. Legacy shape — `facts` is `string[]`; each entry becomes `{ text }`.
 *  3. Pre-facts shape — encounter has only a `notes` string; treated as one fact.
 */
export function getEncounterFacts(encounter: Encounter): Fact[] {
  const raw = encounter.facts as unknown as (string | Fact)[] | undefined;
  if (raw && raw.length > 0) {
    return raw.map((f) =>
      typeof f === "string" ? { text: f } : f,
    );
  }
  if (encounter.notes && encounter.notes.trim()) {
    return [{ text: encounter.notes.trim() }];
  }
  return [];
}
