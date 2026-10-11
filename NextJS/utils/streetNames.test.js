import { describe, expect, it } from "vitest";
import { clashesWith, nameKey, phoneticKey, validateStreetName, withinOne } from "./streetNames.js";

describe("nameKey", () => {
  it("ignores accents, case, spaces, type words and plurals", () => {
    expect(nameKey("Manguier")).toBe("manguier");
    expect(nameKey("Rue des Manguiers")).toBe("manguier");
    expect(nameKey("  MANGUIERS ")).toBe("manguier");
    expect(nameKey("Safoutier")).toBe(nameKey("safoutiers"));
    expect(nameKey("Étoile")).toBe("etoile");
    expect(nameKey("Mango Street")).toBe("mango");
  });

  it("keeps short words intact", () => {
    expect(nameKey("Iris")).toBe("iris");
    expect(nameKey("Lilas")).toBe(nameKey("Lila")); // plural endings fold on keys longer than 4 letters
  });
});

describe("sound-alike", () => {
  it("matches words that sound the same", () => {
    expect(phoneticKey("Phare")).toBe(phoneticKey("Fare"));
    expect(withinOne(phoneticKey("Cacaoyer"), phoneticKey("Kakaoyer"))).toBe(true);
    expect(withinOne("abc", "abd")).toBe(true);
    expect(withinOne("abc", "abcd")).toBe(true);
    expect(withinOne("abc", "axyc")).toBe(false);
  });

  it("flags a name that clashes with a nearby one, by spelling or sound", () => {
    expect(clashesWith("Manguier", ["Rue des Manguiers"])).toBe(true);
    expect(clashesWith("Kakaoyer", ["Cacaoyer"])).toBe(true);
    expect(clashesWith("Baobab", ["Manguier", "Safoutier"])).toBe(false);
    expect(clashesWith("Baobab", [])).toBe(false);
  });
});

describe("validateStreetName", () => {
  it("accepts a plain word and capitalises it", () => {
    expect(validateStreetName("manguier")).toEqual({ name: "Manguier", key: "manguier" });
    expect(validateStreetName("Flamboyant Rouge").name).toBe("Flamboyant Rouge");
    expect(validateStreetName("Étoile").name).toBe("Étoile");
    expect(validateStreetName("Jean-Pierre").error).toBeUndefined();
  });

  it("strips a leading type word and refuses a type word alone", () => {
    expect(validateStreetName("Rue Manguier").name).toBe("Manguier");
    expect(validateStreetName("avenue").error).toBe("name");
  });

  it("refuses length, digits, emoji, other scripts and non-strings", () => {
    for (const bad of ["a", "x".repeat(25), "Manguier 12", "Mangu1er12", "🌳 arbre", "Манго", null, 5, undefined, "one two three four", "Abcdefghijklmnopq"]) {
      expect(validateStreetName(bad).error, String(bad)).toBe("name");
    }
  });

  it("catches insults, leetspeak, stretched letters and reserved words", () => {
    for (const bad of ["Merde", "m3rd3", "Meeerde", "Con", "Fuck", "F.u.c.k", "Pharmacie", "École", "Maire", "Yaoundé", "RDPC", "Anzi", "Officiel"]) {
      expect(validateStreetName(bad).error, bad).toBe("name");
    }
  });

  it("does not reject innocent words that contain a short blocked token", () => {
    expect(validateStreetName("Concorde").error).toBeUndefined();
    expect(validateStreetName("Culture").error).toBeUndefined();
  });
});
