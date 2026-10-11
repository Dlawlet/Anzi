import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  streetFind: vi.fn(),
  streetFindOne: vi.fn(),
  streetFindOneAndUpdate: vi.fn(),
  placeFind: vi.fn(),
  placeUpdateOne: vi.fn(),
  labelCreate: vi.fn(),
  rl: vi.fn(),
}));

vi.mock("../../../../models/streetModel.js", () => ({
  default: { find: m.streetFind, findOne: m.streetFindOne, findOneAndUpdate: m.streetFindOneAndUpdate },
}));
vi.mock("../../../../models/placeModel.js", () => ({ default: { find: m.placeFind, updateOne: m.placeUpdateOne } }));
vi.mock("../../../../models/addressLabelModel.js", () => ({ default: { create: m.labelCreate } }));
vi.mock("../../../../models/rateLimitModel.js", () => ({ default: { findOneAndUpdate: m.rl } }));

import { getQueue, setStreetLine, setStreetName } from "./admin_controller.js";

const TOKEN = "t".repeat(40);
const ID = "66f1c0ffee0000000000abcd";

const ORIGIN = [11.5, 3.87];
const K = Math.cos((ORIGIN[1] * Math.PI) / 180);
const M = (Math.PI / 180) * 6371008.8;
const at = (x, y) => [ORIGIN[0] + x / (M * K), ORIGIN[1] + y / M];

const query = (result) => {
  const q = { select: () => q, sort: () => q, limit: () => q, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  return q;
};

function makeReq({ json, token = TOKEN, headers = {} } = {}) {
  return {
    headers: new Headers({ host: "anzi.test", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }),
    json: json === undefined ? () => Promise.reject(new SyntaxError("bad")) : () => Promise.resolve(json),
  };
}

const waitingStreet = (extra = {}) => ({
  _id: ID, name: "Manguier", nameKey: "manguier", lang: "fr", nameStatus: "proposed", nameSource: "community", city: "Yaoundé",
  lineStatus: "waiting", placeCount: 2, geometry: { type: "Point", coordinates: at(100, -5) }, createdAt: new Date(), ...extra,
});
const readyStreet = (extra = {}) =>
  waitingStreet({
    lineStatus: "ready", originS: 0, baseSlot: 5, evenSide: "right", lineSource: "moderator",
    geometry: { type: "LineString", coordinates: [at(0, 0), at(200, 0)] }, ...extra,
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("ADMIN_TOKEN", TOKEN);
  m.rl.mockResolvedValue({ count: 1 });
  m.labelCreate.mockImplementation(async (doc) => ({ _id: "label", ...doc }));
  m.placeUpdateOne.mockResolvedValue({});
  m.placeFind.mockReturnValue(query([]));
});

describe("admin authorization", () => {
  it("answers 401 without a token, with a wrong one, with a malformed header", async () => {
    expect((await getQueue(makeReq({ token: null }))).status).toBe(401);
    expect((await getQueue(makeReq({ token: "x".repeat(40) }))).status).toBe(401);
    expect((await getQueue(makeReq({ token: null, headers: { authorization: TOKEN } }))).status).toBe(401);
    expect(m.streetFind).not.toHaveBeenCalled();
  });

  it("stays closed when ADMIN_TOKEN is unset or shorter than 32 characters", async () => {
    vi.stubEnv("ADMIN_TOKEN", "");
    expect((await getQueue(makeReq({ token: "" }))).status).toBe(401);
    vi.stubEnv("ADMIN_TOKEN", "short");
    expect((await getQueue(makeReq({ token: "short" }))).status).toBe(401);
  });

  it("counts failed attempts against the daily limit and rejects cross-site writes", async () => {
    m.rl.mockResolvedValue({ count: 301 });
    expect((await getQueue(makeReq({ token: "x" }))).status).toBe(429);
    m.rl.mockResolvedValue({ count: 1 });
    const cross = await setStreetName(makeReq({ json: { action: "accept" }, headers: { origin: "https://evil.example" } }), ID);
    expect(cross.status).toBe(403);
  });
});

describe("getQueue", () => {
  it("lists streets waiting for a line and provisional names", async () => {
    m.streetFind.mockReturnValueOnce(query([waitingStreet({ nameStatus: "unnamed", name: undefined })])).mockReturnValueOnce(query([readyStreet()]));
    const res = await getQueue(makeReq());
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.waiting[0]).toMatchObject({ id: ID, lineStatus: "waiting", placeCount: 2 });
    expect(out.waiting[0].anchor).toHaveLength(2);
    expect(out.proposed[0]).toMatchObject({ name: "Manguier", nameStatus: "proposed" });
    expect(JSON.stringify(out)).not.toContain("proposedBy");
  });
});

describe("setStreetLine", () => {
  const line = [at(0, 0), at(100, 0), at(200, 0)];

  it("rejects bad ids, bodies and lines", async () => {
    expect((await setStreetLine(makeReq({ json: { line } }), "nope")).status).toBe(400);
    expect((await setStreetLine(makeReq(), ID)).status).toBe(400);
    expect((await setStreetLine(makeReq({ json: { line: [at(0, 0)] } }), ID)).status).toBe(400);
    expect((await setStreetLine(makeReq({ json: { line: [[0, 0], [0.001, 0]] } }), ID)).status).toBe(400);
  });

  it("returns 404 for an unknown street", async () => {
    m.streetFindOne.mockResolvedValue(null);
    expect((await setStreetLine(makeReq({ json: { line } }), ID)).status).toBe(404);
  });

  it("gives a waiting street its line and numbers the waiting places in creation order", async () => {
    m.streetFindOne.mockResolvedValue(waitingStreet());
    m.streetFindOneAndUpdate.mockResolvedValue(readyStreet());
    m.placeFind.mockReturnValue(query([
      { _id: "p1", location: { coordinates: at(55, -6) } }, // right side, 55 m along
      { _id: "p2", location: { coordinates: at(55, 6) } }, // left side
      { _id: "p3", location: { coordinates: at(55, -300) } }, // too far from the new line: stays waiting
    ]));
    const res = await setStreetLine(makeReq({ json: { line } }), ID);
    expect(res.status).toBe(200);

    const [filter, update] = m.streetFindOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ _id: ID, lineStatus: "waiting" });
    expect(update.$set).toMatchObject({ lineStatus: "ready", lineSource: "moderator", originS: 0, baseSlot: 5, evenSide: "right" });
    expect(update.$set.geometry.type).toBe("LineString");

    const issued = m.labelCreate.mock.calls.map(([doc]) => [doc.placeId, doc.houseNumber]);
    expect(issued).toEqual([["p1", 2 * (5 + 6)], ["p2", 2 * (5 + 6) + 1]]); // 55 m / 10 m rounds to 6
    expect(m.placeUpdateOne.mock.calls.map(([f]) => f._id)).toEqual(["p1", "p2"]);
    expect(m.placeUpdateOne.mock.calls[0][1].$set).toMatchObject({ numberStatus: "issued", houseNumber: 22 });
    expect(await res.json()).toMatchObject({ numbered: 2, skipped: 1 });
  });

  it("answers 409 when another request drew the line first", async () => {
    m.streetFindOne.mockResolvedValue(waitingStreet());
    m.streetFindOneAndUpdate.mockResolvedValue(null);
    const res = await setStreetLine(makeReq({ json: { line } }), ID);
    expect(res.status).toBe(409);
    expect(m.labelCreate).not.toHaveBeenCalled();
  });

  it("only extends a used line at its ends", async () => {
    m.streetFindOne.mockResolvedValue(readyStreet());
    const moved = await setStreetLine(makeReq({ json: { line: [at(0, 0), at(100, 4), at(200, 0)] } }), ID);
    expect(moved.status).toBe(409);
    expect((await moved.json()).reason).toBe("line_frozen");
    expect(m.streetFindOneAndUpdate).not.toHaveBeenCalled();

    m.streetFindOneAndUpdate.mockResolvedValue(readyStreet({ originS: 80 }));
    const extended = await setStreetLine(makeReq({ json: { line: [at(-80, 0), at(0, 0), at(200, 0)] } }), ID);
    expect(extended.status).toBe(200);
    const [filter, update] = m.streetFindOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ _id: ID, originS: 0 });
    expect(update.$set.originS).toBeCloseTo(80, 0);
    expect(update.$set["geometry.coordinates"]).toHaveLength(3);
  });
});

describe("setStreetName", () => {
  it("accepts a provisional name", async () => {
    m.streetFindOne.mockResolvedValue(waitingStreet());
    m.streetFindOneAndUpdate.mockResolvedValue(waitingStreet({ nameStatus: "accepted" }));
    const res = await setStreetName(makeReq({ json: { action: "accept" } }), ID);
    expect(res.status).toBe(200);
    expect(m.streetFindOneAndUpdate.mock.calls[0][0]).toEqual({ _id: ID, nameStatus: "proposed" });
  });

  it("answers 409 when there is no proposal to accept", async () => {
    m.streetFindOne.mockResolvedValue(waitingStreet({ nameStatus: "accepted" }));
    m.streetFindOneAndUpdate.mockResolvedValue(null);
    expect((await setStreetName(makeReq({ json: { action: "accept" } }), ID)).status).toBe(409);
  });

  it("clears a name that must go", async () => {
    m.streetFindOne.mockResolvedValue(waitingStreet());
    m.streetFindOneAndUpdate.mockResolvedValue(waitingStreet({ nameStatus: "unnamed", name: undefined }));
    expect((await setStreetName(makeReq({ json: { action: "reject" } }), ID)).status).toBe(200);
    const update = m.streetFindOneAndUpdate.mock.calls[0][1];
    expect(update.$set).toMatchObject({ nameStatus: "unnamed" });
    expect(update.$unset).toHaveProperty("name");
    m.streetFindOne.mockResolvedValue(waitingStreet({ nameStatus: "unnamed" }));
    expect((await setStreetName(makeReq({ json: { action: "reject" } }), ID)).status).toBe(409);
  });

  it("renames a street, keeps the old name as an alias and checks the 2 km rule", async () => {
    m.streetFindOne.mockResolvedValue(waitingStreet({ nameStatus: "accepted" }));
    m.streetFind.mockReturnValue(query([]));
    m.streetFindOneAndUpdate.mockResolvedValue(waitingStreet({ name: "Baobab", nameStatus: "accepted" }));
    const res = await setStreetName(makeReq({ json: { action: "set", name: "baobab", lang: "fr" } }), ID);
    expect(res.status).toBe(200);
    const update = m.streetFindOneAndUpdate.mock.calls[0][1];
    expect(update.$set).toMatchObject({ name: "Baobab", nameKey: "baobab", nameStatus: "accepted", nameSource: "community" });
    expect(update.$push.aliases).toMatchObject({ name: "Manguier", nameKey: "manguier", reason: "renamed" });
    // the street itself is excluded from the uniqueness check
    expect(m.streetFind.mock.calls[0][0]._id).toEqual({ $ne: ID });

    m.streetFind.mockReturnValue(query([{ name: "Baobabs", aliases: [] }]));
    m.streetFindOneAndUpdate.mockClear();
    const taken = await setStreetName(makeReq({ json: { action: "set", name: "Baobab" } }), ID);
    expect(taken.status).toBe(409);
    expect(m.streetFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("sets an official name only with a source", async () => {
    m.streetFindOne.mockResolvedValue(waitingStreet({ nameStatus: "accepted" }));
    m.streetFind.mockReturnValue(query([]));
    const noSource = await setStreetName(makeReq({ json: { action: "official", name: "Lumumba" } }), ID);
    expect(noSource.status).toBe(400);
    m.streetFindOneAndUpdate.mockResolvedValue(waitingStreet({ name: "Lumumba", nameSource: "official" }));
    const ok = await setStreetName(makeReq({ json: { action: "official", name: "Lumumba", officialSource: "Délibération 12/2026" } }), ID);
    expect(ok.status).toBe(200);
    const update = m.streetFindOneAndUpdate.mock.calls[0][1];
    expect(update.$set).toMatchObject({ nameSource: "official", officialSource: "Délibération 12/2026" });
    expect(update.$push.aliases.reason).toBe("official");
  });

  it("refuses names the filter blocks and unknown actions", async () => {
    m.streetFindOne.mockResolvedValue(waitingStreet());
    expect((await setStreetName(makeReq({ json: { action: "set", name: "Pharmacie" } }), ID)).status).toBe(400);
    expect((await setStreetName(makeReq({ json: { action: "delete" } }), ID)).status).toBe(400);
    expect((await setStreetName(makeReq({ json: { action: "set", name: "Baobab", lang: "de" } }), ID)).status).toBe(400);
  });
});
