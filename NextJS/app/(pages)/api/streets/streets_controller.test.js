import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ find: vi.fn(), findOne: vi.fn(), rl: vi.fn() }));

vi.mock("../../../../models/streetModel.js", () => ({ default: { find: m.find, findOne: m.findOne } }));
vi.mock("../../../../models/rateLimitModel.js", () => ({ default: { findOneAndUpdate: m.rl } }));

import { getStreet, listNearbyStreets } from "./streets_controller.js";

const ORIGIN = [11.5, 3.87];
const K = Math.cos((ORIGIN[1] * Math.PI) / 180);
const M = (Math.PI / 180) * 6371008.8;
const at = (x, y) => [ORIGIN[0] + x / (M * K), ORIGIN[1] + y / M];

const query = (result) => {
  const q = { limit: () => q, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  return q;
};

const street = (extra = {}) => ({
  _id: "66f1c0ffee0000000000abcd", name: "Manguier", lang: "fr", nameStatus: "accepted", nameSource: "community", city: "Yaoundé",
  quarter: "Bastos", lineStatus: "ready", originS: 0, baseSlot: 5, evenSide: "right", placeCount: 7, proposedBy: "device-secret",
  firstOwnerId: "device-secret", aliases: [{ name: "Ancien", nameKey: "ancien", reason: "renamed", until: new Date() }],
  geometry: { type: "LineString", coordinates: Array.from({ length: 26 }, (_, i) => at(i * 20, 0)) }, ...extra,
});

const makeReq = (search) => ({
  headers: new Headers({ host: "anzi.test" }),
  nextUrl: { searchParams: new URLSearchParams(search) },
});
const near = (x, y) => `near=${at(x, y).join(",")}`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.rl.mockResolvedValue({ count: 1 });
});

describe("listNearbyStreets", () => {
  it("rejects a missing, malformed or out-of-Cameroon location", async () => {
    for (const search of ["", "near=abc", "near=1,2,3", "near=-74,40", "near=NaN,NaN"]) {
      expect((await listNearbyStreets(makeReq(search))).status, search).toBe(400);
    }
    expect(m.find).not.toHaveBeenCalled();
  });

  it("asks for streets within 150 m, nearest first, and gives the number each would issue", async () => {
    m.find.mockReturnValue(query([
      street({ _id: "66f1c0ffee0000000000aaaa", name: "Far", geometry: { type: "LineString", coordinates: [at(0, -40), at(400, -40)] } }),
      street(),
    ]));
    const res = await listNearbyStreets(makeReq(near(230, -8)));
    expect(res.status).toBe(200);
    const filter = m.find.mock.calls[0][0];
    expect(filter.status).toBe("live");
    expect(filter.geometry.$nearSphere.$maxDistance).toBe(150);
    const { streets } = await res.json();
    expect(streets.map((s) => s.name)).toEqual(["Manguier", "Far"]);
    expect(streets[0]).toMatchObject({ distanceM: 8, ideal: { number: 56, parity: "even", side: "right" }, count: "some", lineStatus: "ready" });
  });

  it("never exposes geometry, device ids, exact counts or aliases", async () => {
    m.find.mockReturnValue(query([street()]));
    const body = JSON.stringify(await (await listNearbyStreets(makeReq(near(230, -8)))).json());
    for (const secret of ["device-secret", "coordinates", "placeCount", "proposedBy", "firstOwnerId", "Ancien"]) {
      expect(body).not.toContain(secret);
    }
  });

  it("lists a waiting street without a number and skips a street the pin is not on", async () => {
    m.find.mockReturnValue(query([
      street({ lineStatus: "waiting", geometry: { type: "Point", coordinates: at(250, 0) } }),
      street({ _id: "66f1c0ffee0000000000bbbb", name: "Past end", geometry: { type: "LineString", coordinates: [at(-400, 0), at(-300, 0)] } }),
    ]));
    const { streets } = await (await listNearbyStreets(makeReq(near(230, -8)))).json();
    expect(streets).toHaveLength(1);
    expect(streets[0]).toMatchObject({ lineStatus: "waiting", ideal: null });
  });

  it("is rate limited", async () => {
    m.rl.mockResolvedValue({ count: 61 });
    expect((await listNearbyStreets(makeReq(near(0, 0)))).status).toBe(429);
  });
});

describe("getStreet", () => {
  it("rejects bad ids and unknown streets", async () => {
    expect((await getStreet(makeReq(""), "nope")).status).toBe(400);
    m.findOne.mockResolvedValue(null);
    expect((await getStreet(makeReq(""), "66f1c0ffee0000000000abcd")).status).toBe(404);
  });

  it("returns the public street with milestone tags and a bucketed count", async () => {
    m.findOne.mockResolvedValue(street());
    const res = await getStreet(makeReq(""), "66f1c0ffee0000000000abcd");
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out).toMatchObject({ name: "Manguier", count: "some", aliases: [{ name: "Ancien", reason: "renamed" }], lineStatus: "ready" });
    expect(out.milestones.map((t) => t.n).slice(0, 3)).toEqual([10, 20, 30]);
    const body = JSON.stringify(out);
    for (const secret of ["device-secret", "placeCount", "originS"]) expect(body).not.toContain(secret);
  });

  it("has no milestones while the street waits for its line", async () => {
    m.findOne.mockResolvedValue(street({ lineStatus: "waiting", geometry: { type: "Point", coordinates: at(0, 0) }, placeCount: 1 }));
    const out = await (await getStreet(makeReq(""), "66f1c0ffee0000000000abcd")).json();
    expect(out.milestones).toEqual([]);
    expect(out.count).toBe("few");
  });
});
