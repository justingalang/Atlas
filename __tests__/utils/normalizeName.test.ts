import { normalizeName } from "../../src/utils/normalizeName";

describe("normalizeName", () => {
  it("lowercases", () => {
    expect(normalizeName("Alice")).toBe("alice");
  });

  it("trims whitespace", () => {
    expect(normalizeName("  Alice  ")).toBe("alice");
  });

  it("strips diacritics", () => {
    expect(normalizeName("José")).toBe("jose");
    expect(normalizeName("François")).toBe("francois");
    expect(normalizeName("Ångström")).toBe("angstrom");
  });

  it("handles full names", () => {
    expect(normalizeName("Alice Smith")).toBe("alice smith");
  });

  it("handles empty string", () => {
    expect(normalizeName("")).toBe("");
  });
});
