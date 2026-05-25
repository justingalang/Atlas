/**
 * Parse a name input string into first and last name.
 * First word is firstName, everything after is lastName.
 */
export function parseName(input: string): {
  firstName: string;
  lastName?: string;
} {
  const trimmed = input.trim();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return { firstName: trimmed };
  }

  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim() || undefined,
  };
}
