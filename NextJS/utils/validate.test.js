import { describe, expect, it } from "vitest";
import { cleanSearch, escapeHtml, escapeRegex, isValidId, MAX_SEARCH_LENGTH, parseCoordinates } from "./validate.js";

describe("escapeRegex", () => {
  it("makes metacharacters literal", () => {
    expect(new RegExp(escapeRegex(".*")).test("abc")).toBe(false);
    expect(new RegExp(escapeRegex("a.b")).test("a.b")).toBe(true);
    expect(new RegExp(escapeRegex("(a+)+$")).test("(a+)+$")).toBe(true);
  });
});

describe("cleanSearch", () => {
  it("trims, caps the length and rejects empty or non-string input", () => {
    expect(cleanSearch("  pharmacie ")).toBe("pharmacie");
    expect(cleanSearch("x".repeat(500))).toHaveLength(MAX_SEARCH_LENGTH);
    expect(cleanSearch("   ")).toBeNull();
    expect(cleanSearch(null)).toBeNull();
    expect(cleanSearch({ $ne: "" })).toBeNull();
  });
});

describe("parseCoordinates", () => {
  it("parses lng,lat", () => {
    expect(parseCoordinates("11.5167,3.8667")).toEqual([11.5167, 3.8667]);
    expect(parseCoordinates("-74.5, 40")).toEqual([-74.5, 40]);
  });
  it("rejects anything else", () => {
    for (const bad of ["", "1", "1,2,3", "a,b", "NaN,1", "Infinity,1", "181,0", "0,91", "1,", "[1,2]", "1;process.exit()", null, undefined]) {
      expect(parseCoordinates(bad)).toBeNull();
    }
  });
});

describe("isValidId", () => {
  it("accepts only 24 hex characters", () => {
    expect(isValidId("64f1c2a3b4d5e6f708192a3b")).toBe(true);
    expect(isValidId("123456789012")).toBe(false);
    expect(isValidId("zzz")).toBe(false);
    expect(isValidId(null)).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("neutralises markup", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe("&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;");
  });
});
