import { resolveDisplayName, resolveAllDisplayNames } from "../../src/utils/displayName";
import type { Person } from "../../src/types";

const ts = { seconds: 1000, nanoseconds: 0 } as Person["createdAt"];

function makePerson(
  overrides: Partial<Person> & { id: string; firstName: string },
): Person {
  return {
    normalizedName: overrides.firstName.toLowerCase(),
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  } as Person;
}

describe("resolveDisplayName", () => {
  it("returns first+last when no nickname", () => {
    const alice = makePerson({ id: "1", firstName: "Alice", lastName: "Smith" });
    expect(resolveDisplayName(alice, [alice])).toBe("Alice Smith");
  });

  it("returns first name only when no last name and no nickname", () => {
    const alice = makePerson({ id: "1", firstName: "Alice" });
    expect(resolveDisplayName(alice, [alice])).toBe("Alice");
  });

  it("appends nickname when set", () => {
    const alice = makePerson({
      id: "1",
      firstName: "Alice",
      lastName: "Smith",
      nickname: "Professor",
    });
    expect(resolveDisplayName(alice, [alice])).toBe("Alice Smith (Professor)");
  });

  it("appends nickname even when name is unique (always-on, not conditional)", () => {
    const alice = makePerson({
      id: "1",
      firstName: "Alice",
      nickname: "Blue eyes",
    });
    const bob = makePerson({ id: "2", firstName: "Bob" });
    expect(resolveDisplayName(alice, [alice, bob])).toBe("Alice (Blue eyes)");
  });
});

describe("resolveAllDisplayNames", () => {
  it("returns a map of id to display name", () => {
    const alice = makePerson({ id: "1", firstName: "Alice", lastName: "Smith" });
    const bob = makePerson({ id: "2", firstName: "Bob", nickname: "Bobby" });
    const result = resolveAllDisplayNames([alice, bob]);

    expect(result.get("1")).toBe("Alice Smith");
    expect(result.get("2")).toBe("Bob (Bobby)");
  });

  it("handles empty list", () => {
    const result = resolveAllDisplayNames([]);
    expect(result.size).toBe(0);
  });
});
