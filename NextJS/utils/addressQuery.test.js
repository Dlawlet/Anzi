import { describe, expect, it } from "vitest";
import { nameWindows, parseQuery } from "./addressQuery.js";

describe("parseQuery", () => {
  it("reads a street and a number in either order", () => {
    expect(parseQuery("Manguier 12")).toEqual({ type: "address", words: ["manguier"], number: 12, suffix: "" });
    expect(parseQuery("12 Manguier")).toEqual({ type: "address", words: ["manguier"], number: 12, suffix: "" });
  });

  it("ignores case, accents, type words, articles and number words", () => {
    expect(parseQuery("N° 12 Avenue des Manguiers")).toMatchObject({ type: "address", words: ["manguiers"], number: 12 });
    expect(parseQuery("12, rue Élégante")).toMatchObject({ type: "address", words: ["elegante"], number: 12 });
    expect(parseQuery("manguier12")).toMatchObject({ type: "address", words: ["manguier"], number: 12 });
    expect(parseQuery("12rue manguier")).toMatchObject({ type: "address", words: ["manguier"], number: 12 });
  });

  it("keeps the trailing words as the quarter or city", () => {
    expect(parseQuery("12 rue manguier bastos")).toMatchObject({ words: ["manguier", "bastos"], number: 12 });
  });

  it("reads a suffix letter, attached or apart", () => {
    expect(parseQuery("Manguier 12b")).toMatchObject({ number: 12, suffix: "B", words: ["manguier"] });
    expect(parseQuery("12 B Manguier")).toMatchObject({ number: 12, suffix: "B", words: ["manguier"] });
    // I, L and O are never issued
    expect(parseQuery("Manguier 12o").type).toBe("words");
  });

  it("recognises a backup code before anything else", () => {
    expect(parseQuery("yde 7k4m")).toEqual({ type: "code", code: "YDE-7K4M" });
    expect(parseQuery("YDE-7K4M")).toEqual({ type: "code", code: "YDE-7K4M" });
  });

  it("falls back to a name search without exactly one usable number", () => {
    expect(parseQuery("Salon Chez Mama")).toEqual({ type: "words", text: "Salon Chez Mama" });
    expect(parseQuery("12")).toEqual({ type: "words", text: "12" });
    expect(parseQuery("manguier 1").type).toBe("words"); // numbers start at 2
    expect(parseQuery("manguier 12 14").type).toBe("words");
    expect(parseQuery("manguier 99999").type).toBe("words");
  });

  it("keeps a dotted numeric name as the name", () => {
    expect(parseQuery("rue 1.750 12")).toMatchObject({ type: "address", words: ["1.750"], number: 12 });
  });

  it("rejects anything that is not text", () => {
    expect(parseQuery(undefined)).toEqual({ type: "invalid" });
    expect(parseQuery("   ")).toEqual({ type: "invalid" });
    expect(parseQuery(42)).toEqual({ type: "invalid" });
  });

  it("caps the length", () => {
    expect(parseQuery(`manguier 12 ${"x".repeat(200)}`)).toMatchObject({ type: "address", number: 12 });
  });
});

describe("nameWindows", () => {
  it("offers the longest names first, the other words become the place", () => {
    expect(nameWindows(["manguier", "bastos"])).toEqual([
      { name: ["manguier", "bastos"], place: [] },
      { name: ["manguier"], place: ["bastos"] },
      { name: ["bastos"], place: ["manguier"] },
    ]);
  });
});
