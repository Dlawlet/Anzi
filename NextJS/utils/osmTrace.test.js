import { describe, expect, it } from "vitest";
import { overpassQuery, proposalsFrom, simplify } from "./osmTrace.js";
import { lineLengthM } from "./streetNumbering.js";

// A road going north from (11.5, 3.8): 0.0001 deg of latitude is about 11 m.
const way = (name, lonOffset, extra = {}) => ({
  type: "way",
  tags: { highway: "residential", ...(name ? { name } : {}) },
  geometry: Array.from({ length: 31 }, (_, i) => ({ lon: 11.5 + lonOffset, lat: 3.8 + i * 0.0001 })),
  ...extra,
});

describe("overpassQuery", () => {
  it("asks for roads around the point", () => {
    expect(overpassQuery([11.5, 3.8])).toContain("way(around:80,3.800000,11.500000)");
  });
});

describe("simplify", () => {
  it("drops the vertices on a straight road and keeps both ends", () => {
    const line = way("x", 0).geometry.map((g) => [g.lon, g.lat]);
    expect(simplify(line)).toEqual([line[0], line[line.length - 1]]);
  });
});

describe("proposalsFrom", () => {
  const anchor = [11.5, 3.8015];
  it("puts the road with the street's name first, even if another is closer", () => {
    const out = proposalsFrom([way("Avenue Autre", 0.00005), way("Rue Manguier", 0.0003)], anchor, "Manguier");
    expect(out.map((p) => p.osmName)).toEqual(["Rue Manguier", "Avenue Autre"]);
    expect(out[0].sameName).toBe(true);
  });
  it("orders by distance when no name matches and ignores broken ways", () => {
    const out = proposalsFrom([way("A", 0.0004), way("B", 0.00005), { type: "way", geometry: [{ lon: 1, lat: 1 }] }, { type: "node" }], anchor, "");
    expect(out.map((p) => p.osmName)).toEqual(["B", "A"]);
    expect(out[0].distanceM).toBeLessThan(10);
  });
  it("clips very long roads to about 1.2 km around the point", () => {
    const long = { type: "way", tags: { highway: "primary" }, geometry: Array.from({ length: 401 }, (_, i) => ({ lon: 11.5 + Math.sin(i / 20) * 0.0004, lat: 3.8 + i * 0.0001 })) };
    const [p] = proposalsFrom([long], [11.5, 3.82], "");
    expect(p.lengthM).toBeLessThanOrEqual(1250);
    expect(lineLengthM(p.line)).toBeGreaterThan(900);
  });
  it("returns nothing for no roads", () => {
    expect(proposalsFrom([], anchor, "x")).toEqual([]);
    expect(proposalsFrom(undefined, anchor, "x")).toEqual([]);
  });
});
