import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ streetFind: vi.fn(), labelFindOne: vi.fn(), placeFindOne: vi.fn(), placeFind: vi.fn(), allow: vi.fn() }));

vi.mock("../../../../models/streetModel.js", () => ({ default: { find: m.streetFind } }));
vi.mock("../../../../models/addressLabelModel.js", () => ({ default: { findOne: m.labelFindOne } }));
vi.mock("../../../../models/placeModel.js", () => ({ default: { findOne: m.placeFindOne, find: m.placeFind } }));
vi.mock("../../../../utils/streetStore.js", () => ({
  streetsById: async () => new Map(),
  streetLineOf: (s) => ({ line: s.geometry.coordinates, originS: s.originS, baseSlot: s.baseSlot, evenSide: s.evenSide }),
}));
vi.mock("../../../../utils/rateLimit.js", () => ({ allow: m.allow, clientIp: () => "1.2.3.4", hashIp: (ip) => ip }));

import { findAddress } from "./find_controller.js";

const req = (q) => ({ nextUrl: { searchParams: new URLSearchParams(q === undefined ? "" : { q }) }, cookies: { get: () => undefined } });

// A straight street going north from (11.5, 3.8), about 400 m long, even numbers on the right.
const street = (over = {}) => ({
  _id: "s1", name: "Manguier", nameKey: "manguier", lang: "fr", nameStatus: "accepted", nameSource: "community",
  quarter: "Bastos", city: "Yaoundé", aliases: [], lineStatus: "ready", status: "live",
  geometry: { type: "LineString", coordinates: [[11.5, 3.8], [11.5, 3.8036]] }, originS: 0, baseSlot: 5, evenSide: "right",
  ...over,
});
const found = (docs) => ({ limit: vi.fn().mockResolvedValue(docs) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.allow.mockResolvedValue(true);
  m.labelFindOne.mockResolvedValue(null);
  m.placeFindOne.mockResolvedValue(null);
});

describe("findAddress street + number", () => {
  it("answers with the spot computed from the line", async () => {
    m.streetFind.mockReturnValue(found([street()]));
    const res = await findAddress(req("Manguier 12"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ambiguous).toBe(false);
    expect(body.results[0]).toMatchObject({ kind: "address", number: 12, side: "even", match: "exact", place: null });
    expect(body.results[0].street).toMatchObject({ name: "Manguier", quarter: "Bastos" });
    expect(body.results[0].spot.precisionM).toBe(15);
    expect(body.results[0].street).not.toHaveProperty("geometry");
  });

  it("gives the same body for a link-only home and for a number nobody has", async () => {
    m.streetFind.mockReturnValue(found([street()]));
    const empty = await (await findAddress(req("Manguier 12"))).json();
    m.labelFindOne.mockResolvedValue({ placeId: "p1" });
    m.placeFindOne.mockResolvedValue(null); // the place exists but is not public: the query filters it out
    const linkOnly = await (await findAddress(req("Manguier 12"))).json();
    expect(linkOnly).toEqual(empty);
    expect(m.placeFindOne.mock.calls[0][0]).toMatchObject({ _id: "p1", visibility: "public", status: "live" });
  });

  it("returns the public card when the place is public", async () => {
    m.streetFind.mockReturnValue(found([street()]));
    m.labelFindOne.mockResolvedValue({ placeId: "p1" });
    m.placeFindOne.mockResolvedValue({
      code: "YDE-7K4M", name: "Salon Rose", category: "salon", city: "Yaoundé", region: "Centre", visibility: "public", ownerId: "secret",
      location: { type: "Point", coordinates: [11.5, 3.801] }, numberStatus: "issued", houseNumber: 12, houseSuffix: "",
    });
    const body = await (await findAddress(req("12 rue manguier"))).json();
    expect(body.results[0].place).toMatchObject({ name: "Salon Rose", code: "YDE-7K4M", isOwner: false });
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("reads the label with the typed suffix", async () => {
    m.streetFind.mockReturnValue(found([street()]));
    await findAddress(req("Manguier 12b"));
    expect(m.labelFindOne).toHaveBeenCalledWith({ streetId: "s1", houseNumber: 12, houseSuffix: "B" });
  });

  it("answers 404 for a number beyond the street or an unknown street", async () => {
    m.streetFind.mockReturnValue(found([street()]));
    expect((await findAddress(req("Manguier 9998"))).status).toBe(404);
    m.streetFind.mockReturnValue(found([]));
    const res = await findAddress(req("Cocotier 4"));
    expect(res.status).toBe(404);
    expect((await res.json()).query).toMatchObject({ type: "address", number: 4 });
  });

  it("uses the quarter or city typed after the street, and finds an old name", async () => {
    m.streetFind.mockReturnValue(found([street()]));
    expect((await findAddress(req("Manguier 12 Bastos"))).status).toBe(200);
    expect((await findAddress(req("Manguier 12 Mvog"))).status).toBe(404);
    m.streetFind.mockReturnValue(found([street({ name: "Avocat", nameKey: "avocat", aliases: [{ name: "Manguier", nameKey: "manguier", until: new Date(Date.now() + 1e9) }] })]));
    const body = await (await findAddress(req("Manguier 12"))).json();
    expect(body.results[0]).toMatchObject({ match: "alias", formerName: "Manguier" });
  });

  it("lists the streets that share a name, accepted names first", async () => {
    m.streetFind.mockReturnValue(found([street({ _id: "s2", nameStatus: "proposed", quarter: "Mvog" }), street()]));
    const body = await (await findAddress(req("Manguier 12"))).json();
    expect(body.ambiguous).toBe(true);
    expect(body.results.map((r) => r.street.id)).toEqual(["s1", "s2"]);
  });
});

describe("findAddress other queries", () => {
  const stored = (visibility) => ({
    code: "YDE-7K4M", name: "A", category: "home", city: "Y", region: "Centre", visibility, ownerId: "o", location: { type: "Point", coordinates: [1, 2] },
  });

  it("looks a code up and hides private places from non-owners", async () => {
    m.placeFindOne.mockResolvedValue(stored("private"));
    expect((await findAddress(req("yde 7k4m"))).status).toBe(404);
    m.placeFindOne.mockResolvedValue(stored("link"));
    const body = await (await findAddress(req("YDE-7K4M"))).json();
    expect(body.results[0]).toMatchObject({ kind: "place", place: { code: "YDE-7K4M", isOwner: false } });
  });

  it("searches public places by name, matching the text literally", async () => {
    m.placeFind.mockReturnValue(found([]));
    const res = await findAddress(req("salon (rose"));
    expect(res.status).toBe(404);
    const filter = m.placeFind.mock.calls[0][0];
    expect(filter).toMatchObject({ visibility: "public", status: "live" });
    expect(Object.values(filter.name)[0]).toBe(String.raw`salon \(rose`); // escaped, so it is matched literally
  });

  it("rejects an empty search and rate limited callers", async () => {
    expect((await findAddress(req(undefined))).status).toBe(400);
    m.allow.mockResolvedValue(false);
    expect((await findAddress(req("Manguier 12"))).status).toBe(429);
  });
});
