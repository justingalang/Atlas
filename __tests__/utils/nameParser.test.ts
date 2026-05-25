import { parseName } from "../../src/utils/nameParser";

describe("parseName", () => {
  it("parses first name only", () => {
    expect(parseName("Alice")).toEqual({ firstName: "Alice" });
  });

  it("parses first and last name", () => {
    expect(parseName("Alice Smith")).toEqual({
      firstName: "Alice",
      lastName: "Smith",
    });
  });

  it("handles multiple last name words", () => {
    expect(parseName("Alice Van Der Berg")).toEqual({
      firstName: "Alice",
      lastName: "Van Der Berg",
    });
  });

  it("trims whitespace", () => {
    expect(parseName("  Alice  Smith  ")).toEqual({
      firstName: "Alice",
      lastName: "Smith",
    });
  });

  it("returns undefined lastName for single word", () => {
    const result = parseName("Bob");
    expect(result.lastName).toBeUndefined();
  });
});
