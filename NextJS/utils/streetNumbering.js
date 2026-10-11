import { BOUNDS } from "./placeValidation.js";

// Numbering along a street line (docs/street-addressing.md section 1). Pure functions, no I/O.
// A street is { line: [[lng, lat], ...], originS, baseSlot, evenSide }; the line direction is the numbering direction.
export const SLOT_M = 10;
export const BASE_FULL = 5;
export const BASE_PARTIAL = 50;
export const MAX_LATERAL_M = 60;
export const MAX_BEYOND_M = 120;
export const MIN_NUMBER = 2;
export const MAX_NUMBER = 9999;
export const SUFFIXES = "ABCDEFGHJKMNPQRSTUVWXYZ"; // no I, L, O
export const SUFFIX_RE = /^[A-HJKMNP-Z]?$/;
export const SPOT_OFFSET_M = 8; // distance from the centreline of the spot computed for a number
export const SPOT_PRECISION_M = 15;
export const MILESTONE_EVERY_SLOTS = 5; // a tag every 50 m

const EARTH_M = 6371008.8;
const rad = (deg) => (deg * Math.PI) / 180;

// Local equirectangular projection around the first vertex: error < 0.1 % over 5 km at Cameroon latitudes.
function frame(origin) {
  const k = Math.cos(rad(origin[1]));
  return {
    toXY: ([lng, lat]) => [rad(lng - origin[0]) * k * EARTH_M, rad(lat - origin[1]) * EARTH_M],
    toLngLat: ([x, y]) => [origin[0] + (x / (EARTH_M * k)) * (180 / Math.PI), origin[1] + (y / EARTH_M) * (180 / Math.PI)],
  };
}

export function distanceM(a, b) {
  const f = frame(a);
  const [x, y] = f.toXY(b);
  return Math.hypot(x, y);
}

export function lineLengthM(line) {
  const f = frame(line[0]);
  const xy = line.map(f.toXY);
  let total = 0;
  for (let i = 1; i < xy.length; i++) total += Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]);
  return total;
}

// Position of a point relative to a line: s = arclength from the first vertex (the end segments are extended
// straight), d = signed distance (left of the direction of travel > 0).
export function project(line, point) {
  const f = frame(line[0]);
  const xy = line.map(f.toXY);
  const p = f.toXY(point);
  let best = null;
  let before = 0;
  for (let i = 0; i < xy.length - 1; i++) {
    const [ax, ay] = xy[i];
    const dx = xy[i + 1][0] - ax;
    const dy = xy[i + 1][1] - ay;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const t = ((p[0] - ax) * dx + (p[1] - ay) * dy) / (len * len);
      const tc = Math.min(1, Math.max(0, t));
      const dist = Math.hypot(p[0] - (ax + tc * dx), p[1] - (ay + tc * dy));
      if (!best || dist < best.dist - 1e-9) {
        const first = i === 0;
        const last = i === xy.length - 2;
        const tUsed = (first && t < 0) || (last && t > 1) ? t : tc;
        const cross = dx * (p[1] - ay) - dy * (p[0] - ax);
        const perp = Math.abs(cross) / len;
        const offset = tUsed === tc ? dist : perp;
        best = { dist, s: before + tUsed * len, d: cross < 0 ? -offset : offset };
      }
    }
    before += len;
  }
  return { s: best.s, d: best.d, lengthM: before };
}

// Point at arclength s on the line (extended straight past both ends), pushed `offsetM` to the left (negative = right).
export function pointAt(line, s, offsetM = 0) {
  const f = frame(line[0]);
  const xy = line.map(f.toXY);
  let i = 0;
  let before = 0;
  while (i < xy.length - 2 && before + Math.hypot(xy[i + 1][0] - xy[i][0], xy[i + 1][1] - xy[i][1]) < s) {
    before += Math.hypot(xy[i + 1][0] - xy[i][0], xy[i + 1][1] - xy[i][1]);
    i++;
  }
  const [ax, ay] = xy[i];
  const dx = xy[i + 1][0] - ax;
  const dy = xy[i + 1][1] - ay;
  const len = Math.hypot(dx, dy);
  const t = (s - before) / len;
  const x = ax + t * dx + (-dy / len) * offsetM;
  const y = ay + t * dy + (dx / len) * offsetM;
  return f.toLngLat([x, y]);
}

// The number a point would get on a street, before checking which labels are taken.
export function idealNumber(street, point) {
  const { s, d, lengthM } = project(street.line, point);
  if (Math.abs(d) > MAX_LATERAL_M) return { error: "too_far_from_street" };
  if (s < -MAX_BEYOND_M || s > lengthM + MAX_BEYOND_M) return { error: "past_street_end" };
  const x = (s - street.originS) / SLOT_M;
  const rounded = Math.round(x + 1e-6); // halves go up; the epsilon absorbs float noise
  const slot = street.baseSlot + rounded;
  const side = d < 0 ? "right" : "left";
  const n = 2 * slot + (side === street.evenSide ? 0 : 1);
  if (n < MIN_NUMBER || n > MAX_NUMBER) return { error: "past_street_end" };
  return { n, side, frac: x - rounded, alongM: s - street.originS, offsetM: d };
}

// Labels to try, in order: the ideal one, the neighbouring slot on the same side, then 100A, 100B...
export function candidates(ideal) {
  const out = [{ houseNumber: ideal.n, houseSuffix: "" }];
  const near = ideal.n + 2 * (ideal.frac < -1e-4 ? -1 : 1); // exactly on a slot centre: go up
  if (near >= MIN_NUMBER && near <= MAX_NUMBER) out.push({ houseNumber: near, houseSuffix: "" });
  for (const letter of SUFFIXES) out.push({ houseNumber: ideal.n, houseSuffix: letter });
  return out;
}

export const sideOfNumber = (houseNumber) => (houseNumber % 2 === 0 ? "even" : "odd");

// Where a number stands, computed from the line only (never from a stored pin).
export function spotFor(street, houseNumber) {
  const slot = Math.floor(houseNumber / 2);
  const side = houseNumber % 2 === 0 ? street.evenSide : street.evenSide === "right" ? "left" : "right";
  const s = street.originS + (slot - street.baseSlot) * SLOT_M;
  const [lng, lat] = pointAt(street.line, s, side === "left" ? SPOT_OFFSET_M : -SPOT_OFFSET_M);
  return { lng, lat, precisionM: SPOT_PRECISION_M };
}

// Tags every 50 m along the line ("numbers go up this way") that reveal no registration.
export function milestones(street) {
  const length = lineLengthM(street.line);
  const first = street.baseSlot + Math.ceil((0 - street.originS) / SLOT_M);
  const last = street.baseSlot + Math.floor((length - street.originS) / SLOT_M);
  const tags = [];
  for (let slot = first; slot <= last; slot++) {
    if (slot < 1 || slot % MILESTONE_EVERY_SLOTS !== 0) continue;
    const s = street.originS + (slot - street.baseSlot) * SLOT_M;
    const [lng, lat] = pointAt(street.line, s);
    tags.push({ n: 2 * slot, lng, lat });
  }
  return tags;
}

const samePoint = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;

// A used line is frozen: it may only gain vertices at either end. Returns the new line, originS and length.
export function extendLine(street, nextLine) {
  const old = street.line;
  let start = -1;
  for (let i = 0; i + old.length <= nextLine.length && start < 0; i++) {
    if (old.every((p, k) => samePoint(p, nextLine[i + k]))) start = i;
  }
  if (start < 0) throw new Error("line_frozen");
  const added = start === 0 ? 0 : lineLengthM(nextLine.slice(0, start + 1));
  return { line: nextLine, originS: street.originS + added, lengthM: lineLengthM(nextLine) };
}

const inBounds = ([lng, lat]) =>
  Number.isFinite(lng) && Number.isFinite(lat) &&
  lng >= BOUNDS.lng[0] && lng <= BOUNDS.lng[1] && lat >= BOUNDS.lat[0] && lat <= BOUNDS.lat[1];

const LIMITS = {
  trace: { maxPoints: 8, minStep: 5, maxStep: 400, minTotal: 20, maxTotal: 400 },
  moderator: { maxPoints: 200, minStep: 1, maxStep: 3000, minTotal: 10, maxTotal: 3000 },
};

// Checks a drawn line. Returns { line, lengthM } or { error: "line" }.
export function validateLine(points, kind = "trace") {
  const limits = LIMITS[kind];
  if (!Array.isArray(points) || points.length < 2 || points.length > limits.maxPoints) return { error: "line" };
  const line = [];
  for (const p of points) {
    if (!Array.isArray(p) || p.length !== 2) return { error: "line" };
    const point = [Number(p[0]), Number(p[1])];
    if (!inBounds(point)) return { error: "line" };
    line.push(point);
  }
  for (let i = 1; i < line.length; i++) {
    const step = distanceM(line[i - 1], line[i]);
    if (step < limits.minStep || step > limits.maxStep) return { error: "line" };
  }
  const lengthM = lineLengthM(line);
  if (lengthM < limits.minTotal || lengthM > limits.maxTotal) return { error: "line" };
  return { line, lengthM };
}

// A user trace starts at the first tap, unless one end touches another street: then the numbers start there.
export function orientTrace(line, nearbyLines, joinM = 30) {
  const touches = (point) => nearbyLines.some((other) => {
    const { s, d, lengthM } = project(other, point);
    return Math.abs(d) <= joinM && s >= -joinM && s <= lengthM + joinM;
  });
  const startTouches = touches(line[0]);
  const endTouches = touches(line[line.length - 1]);
  if (endTouches && !startTouches) return { line: [...line].reverse(), baseSlot: BASE_FULL };
  return { line, baseSlot: startTouches ? BASE_FULL : BASE_PARTIAL };
}
