import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  streetFind: vi.fn(),
  streetFindOne: vi.fn(),
  streetFindOneAndUpdate: vi.fn(),
  placeFind: vi.fn(),
  placeUpdateOne: vi.fn(),
  placeUpdateMany: vi.fn(),
  placeFindOneAndUpdate: vi.fn(),
  placeExists: vi.fn(),
  streetUpdateOne: vi.fn(),
  labelUpdateOne: vi.fn(),
  labelCreate: vi.fn(),
  rl: vi.fn(),
  trustedUpsert: vi.fn(),
  trustedDelete: vi.fn(),
  streetBulkWrite: vi.fn(),
  postalUpsert: vi.fn(),
  postalDelete: vi.fn(),
  postalFind: vi.fn(),
}));

vi.mock("../../../../models/streetModel.js", () => ({
  default: { find: m.streetFind, findOne: m.streetFindOne, findOneAndUpdate: m.streetFindOneAndUpdate, bulkWrite: m.streetBulkWrite, updateOne: m.streetUpdateOne },
}));
vi.mock("../../../../models/postalCodeModel.js", () => ({
  default: { findOneAndUpdate: m.postalUpsert, deleteOne: m.postalDelete, find: m.postalFind },
}));
vi.mock("../../../../models/placeModel.js", () => ({
  default: { find: m.placeFind, updateOne: m.placeUpdateOne, updateMany: m.placeUpdateMany, findOneAndUpdate: m.placeFindOneAndUpdate, exists: m.placeExists },
}));
vi.mock("../../../../models/addressLabelModel.js", () => ({ default: { create: m.labelCreate, updateOne: m.labelUpdateOne } }));
vi.mock("../../../../models/trustedIpModel.js", () => ({ default: { findOneAndUpdate: m.trustedUpsert, deleteOne: m.trustedDelete } }));
vi.mock("../../../../models/rateLimitModel.js", () => ({ default: { findOneAndUpdate: m.rl } }));

import { getQueue, listPostalCodes, reviewPlace, setPostalCode, setStreetLine, setStreetName, setTrustedIp, suggestStreetLine } from "./admin_controller.js";

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
const PLACE_ID = "66f1c0ffee0000000000beef";
const pendingPlace = (extra = {}) => ({
  _id: PLACE_ID, code: "YDE-7K4M", name: "Chez Mama", category: "home", visibility: "link", status: "pending",
  location: { type: "Point", coordinates: at(50, 5) }, accuracyM: 8, landmark: "Near the well", city: "Yaoundé", region: "Centre",
  streetId: ID, numberStatus: "issued", houseNumber: 12, ownerId: "device-1", createdAt: new Date(), ...extra,
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
  m.placeUpdateMany.mockResolvedValue({});
  m.streetUpdateOne.mockResolvedValue({});
  m.labelUpdateOne.mockResolvedValue({});
  m.placeExists.mockResolvedValue(null);
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
  it("lists places to review, streets waiting for a line and provisional names", async () => {
    m.placeFind.mockReturnValueOnce(query([pendingPlace()]));
    m.streetFind.mockReturnValueOnce(query([waitingStreet({ nameStatus: "unnamed", name: undefined })])).mockReturnValueOnce(query([readyStreet()])).mockReturnValueOnce(query([readyStreet()]));
    const res = await getQueue(makeReq());
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.waiting[0]).toMatchObject({ id: ID, lineStatus: "waiting", placeCount: 2 });
    expect(out.waiting[0].anchor).toHaveLength(2);
    expect(out.proposed[0]).toMatchObject({ name: "Manguier", nameStatus: "proposed" });
    expect(out.pending[0]).toMatchObject({ id: PLACE_ID, code: "YDE-7K4M", name: "Chez Mama", number: "12", landmark: "Near the well" });
    expect(out.pending[0].street).toMatchObject({ id: ID, name: "Manguier", lineStatus: "ready" });
    expect(m.placeFind).toHaveBeenCalledWith({ status: "pending" });
    expect(JSON.stringify(out)).not.toContain("proposedBy");
    expect(JSON.stringify(out)).not.toContain("device-1");
  });
});

describe("reviewPlace", () => {
  it("needs the token, a valid id and a known decision", async () => {
    expect((await reviewPlace(makeReq({ token: null, json: { action: "approve" } }), PLACE_ID)).status).toBe(401);
    expect((await reviewPlace(makeReq({ json: { action: "approve" } }), "nope")).status).toBe(400);
    expect((await reviewPlace(makeReq(), PLACE_ID)).status).toBe(400);
    expect((await reviewPlace(makeReq({ json: { action: "delete" } }), PLACE_ID)).status).toBe(400);
    expect((await reviewPlace(makeReq({ json: { action: "refuse", reason: "ugly" } }), PLACE_ID)).status).toBe(400);
    expect((await reviewPlace(makeReq({ json: { action: "refuse", reason: "other" } }), PLACE_ID)).status).toBe(400); // "other" needs a note
    expect((await reviewPlace(makeReq({ json: { action: "refuse", reason: "test", note: "x".repeat(201) } }), PLACE_ID)).status).toBe(400);
    expect(m.placeFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("approves a pending place, which then counts on its street (five houses keep the proposed name)", async () => {
    m.placeFindOneAndUpdate.mockResolvedValue(pendingPlace({ status: "live" }));
    const res = await reviewPlace(makeReq({ json: { action: "approve" } }), PLACE_ID);
    expect(res.status).toBe(200);
    expect(m.placeFindOneAndUpdate.mock.calls[0].slice(0, 2)).toEqual([{ _id: PLACE_ID, status: "pending" }, { $set: { status: "live" } }]);
    expect(m.streetUpdateOne.mock.calls[0]).toEqual([{ _id: ID }, { $inc: { placeCount: 1 } }]);
    const [filter, update] = m.streetUpdateOne.mock.calls[1];
    expect(filter).toMatchObject({ _id: ID, nameStatus: "proposed", nameSource: "community", placeCount: { $gte: 5 } });
    expect(update).toEqual({ $set: { nameStatus: "accepted" } });
  });

  it("refuses with a reason and note kept for the owner, retires the number and hides an emptied waiting street", async () => {
    m.placeFindOneAndUpdate.mockResolvedValue(pendingPlace());
    const res = await reviewPlace(makeReq({ json: { action: "refuse", reason: "wrong_spot", note: "  Pin in the river " } }), PLACE_ID);
    expect(res.status).toBe(200);
    const [filter, update] = m.placeFindOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ _id: PLACE_ID, status: "pending" });
    expect(update.$set).toMatchObject({ status: "refused", numberStatus: "none", review: { reason: "wrong_spot", note: "Pin in the river" } });
    expect(update.$unset).toHaveProperty("houseNumber");
    expect(m.labelUpdateOne).toHaveBeenCalledWith({ placeId: PLACE_ID }, { $set: { state: "retired" }, $unset: { placeId: "" } });
    expect(m.streetUpdateOne).toHaveBeenCalledWith({ _id: ID, lineStatus: "waiting", placeCount: 0 }, { $set: { status: "hidden" } });
  });

  it("keeps a street that other places use", async () => {
    m.placeFindOneAndUpdate.mockResolvedValue(pendingPlace());
    m.placeExists.mockResolvedValue({ _id: "other" });
    await reviewPlace(makeReq({ json: { action: "refuse", reason: "duplicate" } }), PLACE_ID);
    expect(m.streetUpdateOne).not.toHaveBeenCalled();
  });

  it("answers 409 for a place already decided and 404 for an unknown one", async () => {
    m.placeFindOneAndUpdate.mockResolvedValue(null);
    m.placeExists.mockResolvedValueOnce({ _id: PLACE_ID });
    expect((await reviewPlace(makeReq({ json: { action: "approve" } }), PLACE_ID)).status).toBe(409);
    expect((await reviewPlace(makeReq({ json: { action: "refuse", reason: "test" } }), PLACE_ID)).status).toBe(404);
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

  it("clears a name that must go and tells the proposer why on their places", async () => {
    m.streetFindOne.mockResolvedValue(waitingStreet({ proposedBy: "device-1" }));
    m.streetFindOneAndUpdate.mockResolvedValue(waitingStreet({ nameStatus: "unnamed", name: undefined }));
    expect((await setStreetName(makeReq({ json: { action: "reject" } }), ID)).status).toBe(400); // a reason is needed
    expect((await setStreetName(makeReq({ json: { action: "reject", reason: "not_local", note: "Locals say Rue des Palmiers" } }), ID)).status).toBe(200);
    const update = m.streetFindOneAndUpdate.mock.calls[0][1];
    expect(update.$set).toMatchObject({ nameStatus: "unnamed" });
    expect(update.$unset).toHaveProperty("name");
    const [filter, notice] = m.placeUpdateMany.mock.calls[0];
    expect(filter).toMatchObject({ streetId: ID, ownerId: "device-1" });
    expect(notice.$set.nameNotice).toMatchObject({ name: "Manguier", reason: "not_local", note: "Locals say Rue des Palmiers" });
    m.streetFindOne.mockResolvedValue(waitingStreet({ nameStatus: "unnamed" }));
    expect((await setStreetName(makeReq({ json: { action: "reject", reason: "other", note: "x" } }), ID)).status).toBe(409);
  });

  it("clears the name notices once the street gets a new name", async () => {
    m.streetFindOne.mockResolvedValue(waitingStreet({ nameStatus: "unnamed", name: undefined, nameKey: undefined }));
    m.streetFind.mockReturnValue(query([]));
    m.streetFindOneAndUpdate.mockResolvedValue(waitingStreet({ name: "Palmiers", nameStatus: "accepted" }));
    expect((await setStreetName(makeReq({ json: { action: "set", name: "Palmiers" } }), ID)).status).toBe(200);
    expect(m.placeUpdateMany).toHaveBeenCalledWith({ streetId: ID, nameNotice: { $exists: true } }, { $unset: { nameNotice: "" } });
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

describe("suggestStreetLine", () => {
  const road = (name) => ({ type: "way", tags: { highway: "residential", name }, geometry: Array.from({ length: 21 }, (_, i) => ({ lon: ORIGIN[0] + 100 / (M * K), lat: ORIGIN[1] - 100 / M + i * 0.0001 })) });

  it("answers 401 without the token and 404 for an unknown street", async () => {
    expect((await suggestStreetLine(makeReq({ token: "" }), ID)).status).toBe(401);
    m.streetFindOne.mockResolvedValue(null);
    expect((await suggestStreetLine(makeReq(), ID)).status).toBe(404);
  });

  it("proposes OpenStreetMap roads for a waiting street and saves nothing", async () => {
    m.streetFindOne.mockResolvedValue(waitingStreet());
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ elements: [road("Rue Manguier")] }) });
    vi.stubGlobal("fetch", fetchMock);
    const res = await suggestStreetLine(makeReq(), ID);
    expect(res.status).toBe(200);
    const { proposals } = await res.json();
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({ osmName: "Rue Manguier", sameName: true });
    expect(proposals[0].line.length).toBeGreaterThanOrEqual(2);
    expect(m.streetFindOneAndUpdate).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("refuses a street that already has its line and survives a map outage", async () => {
    m.streetFindOne.mockResolvedValue(readyStreet());
    expect((await suggestStreetLine(makeReq(), ID)).status).toBe(409);
    m.streetFindOne.mockResolvedValue(waitingStreet());
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect((await suggestStreetLine(makeReq(), ID)).status).toBe(502);
    vi.unstubAllGlobals();
  });
});

describe("setTrustedIp", () => {
  const post = (json, extra = {}) => makeReq({ json, headers: { origin: "http://anzi.test", "x-forwarded-for": "9.9.9.9" }, ...extra });

  it("needs the admin token and a boolean", async () => {
    expect((await setTrustedIp(post({ on: true }, { token: "" }))).status).toBe(401);
    expect((await setTrustedIp(post({ on: "yes" }))).status).toBe(400);
  });

  it("trusts the caller's IP for 24 h by default and can stop", async () => {
    const res = await setTrustedIp(post({ on: true }));
    expect(res.status).toBe(200);
    const [filter, update] = m.trustedUpsert.mock.calls[0];
    expect(filter.ipHash).toMatch(/^[0-9a-f]{32}$/);
    const hours = (update.$set.expiresAt.getTime() - Date.now()) / 3600000;
    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThan(24.1);
    await setTrustedIp(post({ on: false }));
    expect(m.trustedDelete).toHaveBeenCalledWith({ ipHash: filter.ipHash });
  });
});

describe("postal codes", () => {
  const post = (json, extra = {}) => makeReq({ json, headers: { origin: "http://anzi.test", "x-forwarded-for": "9.9.9.9" }, ...extra });

  it("needs the admin token", async () => {
    expect((await setPostalCode(post({ city: "Yaoundé", postalCode: "1060" }, { token: "" }))).status).toBe(401);
    expect((await listPostalCodes(makeReq({ token: "" }))).status).toBe(401);
    expect(m.postalUpsert).not.toHaveBeenCalled();
  });

  it("answers 400 for a bad city, quarter or code", async () => {
    for (const body of [{ postalCode: "1060" }, { city: "Y", postalCode: "1060" }, { city: "Yaoundé", postalCode: "12" }, { city: "Yaoundé", postalCode: "1234567" },
      { city: "Yaoundé", postalCode: 1060 }, { city: "Yaoundé", postalCode: "10a0" }, { city: "Yaoundé" }, { city: "Yaoundé", quarter: 5, postalCode: "1060" }]) {
      expect((await setPostalCode(post(body))).status, JSON.stringify(body)).toBe(400);
    }
    expect((await setPostalCode(makeReq({ headers: { origin: "http://anzi.test" } }))).status).toBe(400);
    expect(m.postalUpsert).not.toHaveBeenCalled();
  });

  it("saves the code and copies it to the live streets of that city and quarter only", async () => {
    m.streetFind.mockReturnValue(query([
      { _id: "a", city: "Yaoundé", quarter: "Bastos" },
      { _id: "b", city: "yaounde", quarter: " bastos " },
      { _id: "c", city: "Yaoundé", quarter: "Mvog-Ada" },
      { _id: "d", city: "Yaoundé" },
    ]));
    const res = await setPostalCode(post({ city: " Yaoundé ", quarter: "Bastos", postalCode: "1060" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ updated: 2 });
    expect(m.postalUpsert.mock.calls[0]).toEqual([
      { cityKey: "yaounde", quarterKey: "bastos" },
      { $set: { city: "Yaoundé", quarter: "Bastos", postalCode: "1060" } },
      { upsert: true },
    ]);
    expect(m.streetBulkWrite.mock.calls[0][0].map((op) => op.updateOne)).toEqual([
      { filter: { _id: "a" }, update: { $set: { postalCode: "1060" } } },
      { filter: { _id: "b" }, update: { $set: { postalCode: "1060" } } },
    ]);
  });

  it("applies a city-wide code to the streets without a quarter and removes a code with null", async () => {
    m.streetFind.mockReturnValue(query([{ _id: "a", city: "Yaoundé", quarter: "Bastos" }, { _id: "d", city: "Yaoundé" }]));
    expect(await (await setPostalCode(post({ city: "Yaoundé", postalCode: "1000" }))).json()).toEqual({ updated: 1 });
    expect(m.postalUpsert.mock.calls[0][0]).toEqual({ cityKey: "yaounde", quarterKey: "" });

    const removed = await setPostalCode(post({ city: "Yaoundé", postalCode: null }));
    expect(await removed.json()).toEqual({ updated: 1 });
    expect(m.postalDelete).toHaveBeenCalledWith({ cityKey: "yaounde", quarterKey: "" });
    expect(m.streetBulkWrite.mock.calls[1][0][0].updateOne.update).toEqual({ $unset: { postalCode: "" } });
  });

  it("lists the registry", async () => {
    m.postalFind.mockReturnValue(query([{ city: "Yaoundé", quarter: "Bastos", postalCode: "1060", cityKey: "x" }, { city: "Douala", postalCode: "2000" }]));
    const res = await listPostalCodes(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ codes: [{ city: "Yaoundé", quarter: "Bastos", postalCode: "1060" }, { city: "Douala", quarter: "", postalCode: "2000" }] });
  });
});
