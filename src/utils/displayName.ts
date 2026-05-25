import type { Person } from "../types";

function fullName(person: Person): string {
  return person.lastName
    ? `${person.firstName} ${person.lastName}`
    : person.firstName;
}

/**
 * Resolve the display name for a person. Nickname is always shown when set
 * (it's the explicit identifier for distinguishing same-named people).
 */
export function resolveDisplayName(person: Person, _allPeople: Person[]): string {
  const name = fullName(person);
  return person.nickname ? `${name} (${person.nickname})` : name;
}

/** Batch version. Same logic, just a Map keyed by person id. */
export function resolveAllDisplayNames(
  allPeople: Person[],
): Map<string, string> {
  const result = new Map<string, string>();
  for (const person of allPeople) {
    result.set(person.id, resolveDisplayName(person, allPeople));
  }
  return result;
}
