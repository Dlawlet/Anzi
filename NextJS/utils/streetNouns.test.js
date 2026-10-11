import { describe, expect, it } from "vitest";
import { NOUNS, suggestNames } from "./streetNouns.js";
import { validateStreetName } from "./streetNames.js";

describe("noun pool", () => {
  it("has the 138 starter entries with unique ids and valid names", () => {
    expect(NOUNS).toHaveLength(138);
    expect(new Set(NOUNS.map((n) => n.id)).size).toBe(138);
    for (const noun of NOUNS) {
      expect(validateStreetName(noun.fr).error, noun.fr).toBeUndefined();
      expect(validateStreetName(noun.en).error, noun.en).toBeUndefined();
    }
  });
});

describe("suggestNames", () => {
  it("offers one fruit, one tree and one bird word, stable for a seed", () => {
    const first = suggestNames({ seed: 42 });
    expect(first.map((s) => s.group)).toEqual(["fruit", "tree", "bird"]);
    expect(suggestNames({ seed: 42 })).toEqual(first);
    expect(suggestNames({ seed: 42, page: 1 })).not.toEqual(first);
  });

  it("follows the language and keeps the twin", () => {
    const [fruit] = suggestNames({ seed: 3, lang: "en" });
    const noun = NOUNS.find((n) => n.en === fruit.name);
    expect(noun.fr).toBe(fruit.twin);
  });

  it("skips names used nearby or sounding like them", () => {
    const used = ["Manguier", "Baobab"];
    for (let seed = 1; seed <= 60; seed++) {
      const names = suggestNames({ used, seed }).map((s) => s.name);
      expect(names).not.toContain("Manguier");
      expect(names).not.toContain("Baobab");
    }
  });

  it("falls back to the second tier when a group is used up", () => {
    const birds = NOUNS.filter((n) => n.group === "bird").map((n) => n.fr);
    const picks = suggestNames({ used: birds, seed: 5 });
    expect(picks).toHaveLength(3);
    expect(picks[2].group).not.toBe("bird");
  });
});
