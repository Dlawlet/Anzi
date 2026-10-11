import { describe, expect, it } from "vitest";
import {
  BASE_FULL, BASE_PARTIAL, candidates, distanceM, extendLine, idealNumber, lineLengthM, milestones,
  orientTrace, pointAt, project, sideOfNumber, spotFor, validateLine,
} from "./streetNumbering.js";

// Local metres (x east, y north) around Yaoundé to lng/lat, same model as the code under test.
const ORIGIN = [11.5, 3.87];
const K = Math.cos((ORIGIN[1] * Math.PI) / 180);
const M = (Math.PI / 180) * 6371008.8;
const at = (x, y) => [ORIGIN[0] + x / (M * K), ORIGIN[1] + y / M];

const eastLine = (lengthM, step = 20) => {
  const pts = [];
  for (let x = 0; x < lengthM; x += step) pts.push(at(x, 0));
  pts.push(at(lengthM, 0));
  return pts;
};
const street = (lengthM, extra = {}) => ({ line: eastLine(lengthM), originS: 0, baseSlot: BASE_FULL, evenSide: "right", ...extra });

describe("project", () => {
  it("measures arclength and signed offset (left of travel is positive)", () => {
    const p = project(eastLine(200), at(75, 12));
    expect(p.s).toBeCloseTo(75, 0);
    expect(p.d).toBeCloseTo(12, 0);
    expect(project(eastLine(200), at(75, -12)).d).toBeCloseTo(-12, 0);
    expect(p.lengthM).toBeCloseTo(200, 0);
  });

  it("extends the end segments straight", () => {
    const line = eastLine(100);
    expect(project(line, at(-30, 4)).s).toBeCloseTo(-30, 0);
    expect(project(line, at(160, 4)).s).toBeCloseTo(160, 0);
  });

  it("follows a bend with the nearest segment", () => {
    const bent = [at(0, 0), at(100, 0), at(100, 100)];
    const p = project(bent, at(110, 60));
    expect(p.s).toBeCloseTo(160, 0);
    expect(p.d).toBeCloseTo(-10, 0);
  });
});

describe("idealNumber (worked examples of the spec)", () => {
  it("230 m along an OSM line, right side -> 56", () => {
    expect(idealNumber(street(1000), at(230, -8)).n).toBe(56);
  });

  it("opposite sides of a trace start -> 100 and 101", () => {
    const trace = street(100, { baseSlot: BASE_PARTIAL });
    expect(idealNumber(trace, at(0, -5)).n).toBe(100);
    expect(idealNumber(trace, at(0, 5)).n).toBe(101);
  });

  it("25 m behind the start of a trace -> 96/97 (halves go up)", () => {
    const trace = street(100, { baseSlot: BASE_PARTIAL });
    expect(idealNumber(trace, at(-25, -5)).n).toBe(96);
    expect(idealNumber(trace, at(-25, 5)).n).toBe(97);
  });

  it("80 m past a 40 m line -> 124/125 without changing the line", () => {
    const trace = street(40, { baseSlot: BASE_PARTIAL });
    expect(idealNumber(trace, at(120, -5)).n).toBe(124);
    expect(idealNumber(trace, at(120, 5)).n).toBe(125);
  });

  it("refuses points too far from the line or too far past its ends", () => {
    expect(idealNumber(street(200), at(50, -61)).error).toBe("too_far_from_street");
    expect(idealNumber(street(200), at(50, -59)).error).toBeUndefined();
    expect(idealNumber(street(40), at(170, -5)).error).toBe("past_street_end");
    expect(idealNumber(street(1000), at(-100, -5)).error).toBe("past_street_end"); // number would be below 2
  });

  it("keeps the odd side on the left unless evenSide is left", () => {
    expect(idealNumber(street(300, { evenSide: "left" }), at(100, 5)).n % 2).toBe(0);
  });
});

describe("candidates", () => {
  it("tries the ideal label, the neighbouring slot toward the true position, then letters", () => {
    const list = candidates({ n: 100, frac: -0.3 });
    expect(list.slice(0, 3)).toEqual([
      { houseNumber: 100, houseSuffix: "" },
      { houseNumber: 98, houseSuffix: "" },
      { houseNumber: 100, houseSuffix: "A" },
    ]);
    expect(candidates({ n: 100, frac: 0.2 })[1].houseNumber).toBe(102);
  });

  it("never uses I, L or O and never goes below 2", () => {
    const letters = candidates({ n: 10, frac: 0 }).map((c) => c.houseSuffix).join("");
    expect(letters).not.toMatch(/[ILO]/);
    expect(letters).toHaveLength(23);
    expect(candidates({ n: 2, frac: -0.4 }).some((c) => c.houseNumber < 2)).toBe(false);
  });
});

describe("extendLine", () => {
  const base = street(100, { baseSlot: BASE_PARTIAL });
  const probe = at(60, -5);

  it("appending keeps every number", () => {
    const next = extendLine(base, [...base.line, at(200, 0)]);
    expect(next.originS).toBe(0);
    expect(next.lengthM).toBeCloseTo(200, 0);
    expect(idealNumber({ ...base, line: next.line, originS: next.originS }, probe).n).toBe(idealNumber(base, probe).n);
  });

  it("prepending moves originS so numbers stay on the same spots", () => {
    const next = extendLine(base, [at(-80, 0), ...base.line]);
    expect(next.originS).toBeCloseTo(80, 0);
    const moved = { ...base, line: next.line, originS: next.originS };
    expect(idealNumber(moved, probe).n).toBe(idealNumber(base, probe).n);
    expect(idealNumber(moved, at(-25, -5)).n).toBe(96);
  });

  it("refuses to change an interior vertex", () => {
    const moved = base.line.map((p, i) => (i === 2 ? at(40, 3) : p));
    expect(() => extendLine(base, moved)).toThrow("line_frozen");
    expect(() => extendLine(base, base.line.slice(0, -1))).toThrow("line_frozen");
  });

  it("accepts the same line (no-op)", () => {
    expect(extendLine(base, base.line).originS).toBe(0);
  });
});

describe("spotFor", () => {
  // Quarter circle of radius 300 m, 16 segments.
  const arc = Array.from({ length: 17 }, (_, i) => {
    const a = (i / 16) * (Math.PI / 2);
    return at(300 * Math.sin(a), 300 - 300 * Math.cos(a));
  });
  const curved = { line: arc, originS: 0, baseSlot: BASE_FULL, evenSide: "right" };

  it("round-trips for both sides along a curved line", () => {
    for (let n = 12; n <= 80; n++) {
      expect(idealNumber(curved, (({ lng, lat }) => [lng, lat])(spotFor(curved, n))).n).toBe(n);
    }
  });

  it("puts even numbers on the evenSide", () => {
    const even = spotFor(street(300), 56);
    const odd = spotFor(street(300), 57);
    expect(project(street(300).line, [even.lng, even.lat]).d).toBeLessThan(0);
    expect(project(street(300).line, [odd.lng, odd.lat]).d).toBeGreaterThan(0);
    expect(even.precisionM).toBe(15);
  });

  it("gives milestone tags every 50 m that start at the street start", () => {
    const tags = milestones(street(240));
    expect(tags.map((t) => t.n)).toEqual([10, 20, 30, 40, 50]);
    expect(distanceM(at(0, 0), [tags[0].lng, tags[0].lat])).toBeLessThan(1);
    expect(distanceM(at(50, 0), [tags[1].lng, tags[1].lat])).toBeLessThan(1);
  });

  it("derives parity", () => {
    expect(sideOfNumber(12)).toBe("even");
    expect(sideOfNumber(13)).toBe("odd");
  });
});

describe("validateLine", () => {
  it("accepts a 2-point trace and rejects bad shapes", () => {
    expect(validateLine([at(0, 0), at(60, 0)]).lengthM).toBeCloseTo(60, 0);
    expect(validateLine([at(0, 0)]).error).toBe("line");
    expect(validateLine("x").error).toBe("line");
    expect(validateLine([[0, 0], [0.001, 0]]).error).toBe("line"); // outside Cameroon
    expect(validateLine([at(0, 0), at(2, 0)]).error).toBe("line"); // step under 5 m
    expect(validateLine([at(0, 0), at(450, 0)]).error).toBe("line"); // step over 400 m
    expect(validateLine([at(0, 0), at(10, 0)]).error).toBe("line"); // total under 20 m
    expect(validateLine(Array.from({ length: 9 }, (_, i) => at(i * 30, 0))).error).toBe("line"); // 9 points
    expect(validateLine([at(0, 0), [NaN, 3.8]]).error).toBe("line");
  });

  it("lets the moderator draw long lines", () => {
    const pts = Array.from({ length: 40 }, (_, i) => at(i * 50, 0));
    expect(validateLine(pts).error).toBe("line");
    expect(validateLine(pts, "moderator").lengthM).toBeCloseTo(1950, -1);
    expect(validateLine([at(0, 0), at(3500, 0)], "moderator").error).toBe("line");
  });
});

describe("orientTrace", () => {
  const other = eastLine(300);
  it("starts at a junction when an end touches another street", () => {
    const trace = [at(100, 200), at(100, 100), at(100, 20)];
    const r = orientTrace(trace, [other]);
    expect(r.baseSlot).toBe(BASE_FULL);
    expect(r.line[0]).toEqual(trace[2]); // reversed so the junction end is the start
  });

  it("keeps the first tap and 500 m of room when nothing touches", () => {
    const trace = [at(100, 400), at(100, 500)];
    expect(orientTrace(trace, [other])).toEqual({ line: trace, baseSlot: BASE_PARTIAL });
    expect(orientTrace(trace, [])).toEqual({ line: trace, baseSlot: BASE_PARTIAL });
  });
});

describe("helpers", () => {
  it("pointAt and lineLengthM agree", () => {
    const line = eastLine(100);
    expect(lineLengthM(line)).toBeCloseTo(100, 0);
    const p = pointAt(line, 40, 10);
    expect(project(line, p).s).toBeCloseTo(40, 0);
    expect(project(line, p).d).toBeCloseTo(10, 0);
  });
});
