import { distanceM, lineLengthM, project } from "./streetNumbering.js";
import { fold, nameKey } from "./streetNames.js";

// Automatic trace proposals for the moderator: the OpenStreetMap roads next to a street's first point.
// The moderator always looks at the proposal and saves it (or fixes it) with the name decision.
export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RADIUS_M = 80;
const WINDOW_M = 1200; // longest proposed stretch, centred on the street's point
const KEEP_M = 3; // simplification tolerance
const MIN_STEP_M = 2;
const MAX_POINTS = 120;
const MAX_CANDIDATES = 3;
const ROADS = "motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|road|track|pedestrian";

export const overpassQuery = ([lng, lat]) =>
  `[out:json][timeout:10];way(around:${RADIUS_M},${lat.toFixed(6)},${lng.toFixed(6)})["highway"~"^(${ROADS})$"];out geom tags;`;

const rad = (deg) => (deg * Math.PI) / 180;

// Distance in metres from a point to a polyline (flat approximation, fine at street scale).
function offsetM(line, point) {
  const { s, d, lengthM } = project(line, point);
  if (s < 0) return Math.hypot(s, d);
  if (s > lengthM) return Math.hypot(s - lengthM, d);
  return Math.abs(d);
}

// Douglas-Peucker on a local flat projection, then drop vertices closer than MIN_STEP_M to the previous one.
export function simplify(line) {
  const k = Math.cos(rad(line[0][1]));
  const xy = line.map(([lng, lat]) => [rad(lng - line[0][0]) * k * 6371008.8, rad(lat - line[0][1]) * 6371008.8]);
  const keep = new Array(line.length).fill(false);
  keep[0] = keep[line.length - 1] = true;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1;
    let farD = KEEP_M;
    const [ax, ay] = xy[a];
    const [bx, by] = xy[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = a + 1; i < b; i++) {
      const dist = Math.abs((bx - ax) * (ay - xy[i][1]) - (ax - xy[i][0]) * (by - ay)) / len;
      if (dist > farD) {
        far = i;
        farD = dist;
      }
    }
    if (far > -1) {
      keep[far] = true;
      stack.push([a, far], [far, b]);
    }
  }
  const out = [];
  line.forEach((p, i) => {
    if (!keep[i]) return;
    if (out.length && i !== line.length - 1 && distanceM(out[out.length - 1], p) < MIN_STEP_M) return;
    out.push(p);
  });
  return out;
}

// Keeps at most WINDOW_M of the way, around the vertex nearest to the anchor.
function clip(line, anchor) {
  if (lineLengthM(line) <= WINDOW_M) return line;
  const { s } = project(line, anchor);
  const from = Math.max(0, s - WINDOW_M / 2);
  const to = from + WINDOW_M;
  const out = [];
  let along = 0;
  for (let i = 0; i < line.length; i++) {
    if (i > 0) along += distanceM(line[i - 1], line[i]);
    if (along >= from && along <= to) out.push(line[i]);
  }
  return out;
}

// Overpass elements -> up to 3 proposals, best first: a road whose name matches the street's name, then the closest.
export function proposalsFrom(elements, anchor, streetName) {
  const key = streetName ? nameKey(streetName) : "";
  const found = [];
  for (const way of elements || []) {
    if (way?.type !== "way" || !Array.isArray(way.geometry) || way.geometry.length < 2) continue;
    const raw = way.geometry.map((g) => [g.lon, g.lat]);
    if (!raw.every(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))) continue;
    const line = simplify(clip(raw, anchor));
    if (line.length < 2 || line.length > MAX_POINTS || lineLengthM(line) < 10) continue;
    const osmName = typeof way.tags?.name === "string" ? way.tags.name.slice(0, 60) : "";
    found.push({
      line,
      osmName,
      highway: String(way.tags?.highway || ""),
      lengthM: Math.round(lineLengthM(line)),
      distanceM: Math.round(offsetM(line, anchor)),
      sameName: Boolean(key && osmName && nameKey(fold(osmName)) === key),
    });
  }
  return found.sort((a, b) => Number(b.sameName) - Number(a.sameName) || a.distanceM - b.distanceM).slice(0, MAX_CANDIDATES);
}
