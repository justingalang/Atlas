/**
 * Normalize a name for case-insensitive, accent-insensitive matching.
 * NFD decomposition strips diacritics, then lowercase.
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
