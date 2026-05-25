import type { Encounter } from "../types";

/**
 * Returns the encounter's facts, falling back to the legacy `notes` field
 * (split into a pseudo-list by line) for encounters saved before the
 * facts array was introduced.
 */
export function getEncounterFacts(encounter: Encounter): string[] {
  if (encounter.facts && encounter.facts.length > 0) {
    return encounter.facts;
  }
  if (encounter.notes && encounter.notes.trim()) {
    return [encounter.notes.trim()];
  }
  return [];
}
