import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  placeCreate: vi.fn(),
  placeFindOneAndDelete: vi.fn(),
  streetFindOne: vi.fn(),
  streetFind: vi.fn(),
  streetCreate: vi.fn(),
  streetUpdateOne: vi.fn(),
  streetDeleteOne: vi.fn(),
  labelCreate: vi.fn(),
  labelDeleteOne: vi.fn(),
  labelUpdateOne: vi.fn(),
  rl: vi.fn(),
  postalFind: vi.fn(),
}));

vi.mock("../../../../models/placeModel.js", () => ({ default: { create: m.placeCreate, findOneAndDelete: m.placeFindOneAndDelete } }));
vi.mock("../../../../models/streetModel.js", () => ({
  default: {
    findOne: m.streetFindOne, find: m.streetFind, create: m.streetCreate, updateOne: m.streetUpdateOne, deleteOne: m.streetDeleteOne,
  },
}));
vi.mock("../../../../models/addressLabelModel.js", () => ({
  default: { create: m.labelCreate, deleteOne: m.labelDeleteOne, updateOne: m.labelUpdateOne },
}));
vi.mock("../../../../models/postalCodeModel.js", () => ({ default: { find: m.postalFind } }));
vi.mock("../../../../models/rateLimitModel.js", () => ({ default: { findOneAndUpdate: m.rl } }));

import { DEVICE_COOKIE } from "../../../../utils/deviceToken.js";
import { createPlace, deletePlace } from "./places_controller.js";

// Local metres around Yaoundé to lng/lat.
const ORIGIN = [11.5, 3.87];
const K = Math.cos((ORIGIN[1] * Math.PI) / 180);
const M = (Math.PI / 180) * 6371008.8;
const at = (x, y) => [ORIGIN[0] + x / (M * K), ORIGIN[1] + y / M];

// A query result that supports .select(), .sort() and .limit() and can be awaited.
const query = (result) => {
  const q = { select: () => q, sort: () => q, limit: () => q, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  return q;
};

const STREET_ID = "66f1c0ffee0000000000abcd";
const eastLine = Array.from({ length: 51 }, (_, i) => at(i * 20, 0)); // 1000 m
const readyStreet = (extra = {}) => ({
  _id: STREET_ID, name: "Manguier", lang: "fr", nameStatus: "proposed", nameSource: "community", city: "Yaoundé", quarter: "Bastos",
  lineStatus: "ready", geometry: { type: "LineString", coordinates: eastLine }, originS: 0, baseSlot: 5, evenSide: "right", placeCount: 2,
  ...extra,
});

const pin = at(230, -8); // 230 m along, right side -> number 56
const base = {
  lng: pin[0], lat: pin[1], name: "Chez Mama Julie", category: "home", city: "Yaoundé", region: "Centre", quarter: "Bastos",
  consent: true, adultOrParentOk: true,
};

function makeReq({ json, cookie } = {}) {
  return {
    headers: new Headers({ host: "anzi.test" }),
    cookies: { get: (name) => (name === DEVICE_COOKIE && cookie ? { value: cookie } : undefined) },
    nextUrl: { searchParams: new URLSearchParams() },
    json: () => Promise.resolve(json),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.rl.mockResolvedValue({ count: 1 });
  m.streetFind.mockReturnValue(query([]));
  m.postalFind.mockReturnValue(query([]));
  m.streetUpdateOne.mockResolvedValue({});
  m.labelCreate.mockImplementation(async (doc) => ({ _id: "label-1", ...doc }));
  m.placeCreate.mockImplementation(async (doc) => ({ ...doc, ownerId: "owner-1" }));
  m.streetCreate.mockImplementation(async (doc) => ({ _id: STREET_ID, createdAt: new Date(), ...doc }));
});

describe("createPlace with a street", () => {
  it("joins a ready street and issues the number from the pin", async () => {
    m.streetFindOne.mockResolvedValue(readyStreet());
    const res = await createPlace(makeReq({ json: { ...base, street: { streetId: STREET_ID } } }));
    expect(res.status).toBe(201);
    const out = await res.json();
    expect(out).toMatchObject({ houseNumber: 56, houseSuffix: "", side: "even", numberStatus: "issued" });
    expect(out.street).toMatchObject({ id: STREET_ID, name: "Manguier" });
    expect(out.street).not.toHaveProperty("proposedBy");
    const doc = m.placeCreate.mock.calls[0][0];
    expect(doc).toMatchObject({ streetId: readyStreet()._id, houseNumber: 56, numberStatus: "issued" });
    expect(m.labelCreate.mock.calls[0][0]).toMatchObject({ streetId: STREET_ID, houseNumber: 56, houseSuffix: "", state: "active", placeId: doc._id });
    expect(m.streetUpdateOne.mock.calls[0][1]).toEqual({ $inc: { placeCount: 1 } });
  });

  it("falls back to the neighbouring slot, then to a letter, when a label is taken", async () => {
    m.streetFindOne.mockResolvedValue(readyStreet());
    const taken = Object.assign(new Error("dup"), { code: 11000 });
    m.labelCreate.mockRejectedValueOnce(taken).mockImplementation(async (doc) => ({ _id: "label-2", ...doc }));
    const out = await (await createPlace(makeReq({ json: { ...base, street: { streetId: STREET_ID } } }))).json();
    expect(out.houseNumber).toBe(58);

    vi.clearAllMocks();
    m.rl.mockResolvedValue({ count: 1 });
    m.streetUpdateOne.mockResolvedValue({});
    m.streetFindOne.mockResolvedValue(readyStreet());
    m.placeCreate.mockImplementation(async (doc) => ({ ...doc }));
    m.labelCreate.mockRejectedValueOnce(taken).mockRejectedValueOnce(taken).mockImplementation(async (doc) => ({ _id: "label-3", ...doc }));
    const second = await (await createPlace(makeReq({ json: { ...base, street: { streetId: STREET_ID } } }))).json();
    expect(second).toMatchObject({ houseNumber: 56, houseSuffix: "A" });
  });

  it("rejects server-owned number fields from the client", async () => {
    for (const field of ["houseNumber", "houseSuffix", "numberStatus", "streetId"]) {
      const res = await createPlace(makeReq({ json: { ...base, [field]: field === "houseNumber" ? 12 : "x" } }));
      expect(res.status, field).toBe(400);
      expect((await res.json()).fields).toContain(field);
    }
    expect(m.placeCreate).not.toHaveBeenCalled();
  });

  it("answers 400 for a malformed street part", async () => {
    for (const street of ["x", [], {}, { streetId: "nope" }, { streetId: STREET_ID, extra: 1 }, { new: "x" }, { new: { lang: "de" } }, { new: { line: [[1, 2]] } }]) {
      const res = await createPlace(makeReq({ json: { ...base, street } }));
      expect(res.status, JSON.stringify(street)).toBe(400);
    }
  });

  it("answers 404 for an unknown street and 409 when the pin is too far from the line", async () => {
    m.streetFindOne.mockResolvedValue(null);
    expect((await createPlace(makeReq({ json: { ...base, street: { streetId: STREET_ID } } }))).status).toBe(404);

    m.streetFindOne.mockResolvedValue(readyStreet());
    const far = at(230, -61);
    const res = await createPlace(makeReq({ json: { ...base, lng: far[0], lat: far[1], street: { streetId: STREET_ID } } }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ reason: "too_far_from_street" });
    const beyond = at(1200, -5);
    const past = await createPlace(makeReq({ json: { ...base, lng: beyond[0], lat: beyond[1], street: { streetId: STREET_ID } } }));
    expect((await past.json()).reason).toBe("past_street_end");
    expect(m.labelCreate).not.toHaveBeenCalled();
    expect(m.placeCreate).not.toHaveBeenCalled();
  });

  it("makes a place on a waiting street wait for its number", async () => {
    m.streetFindOne.mockResolvedValue(readyStreet({ lineStatus: "waiting", geometry: { type: "Point", coordinates: at(235, -8) } }));
    const out = await (await createPlace(makeReq({ json: { ...base, street: { streetId: STREET_ID } } }))).json();
    expect(out).toMatchObject({ numberStatus: "waiting", houseNumber: null });
    expect(m.labelCreate).not.toHaveBeenCalled();
  });

  it("refuses to join a waiting street from far away", async () => {
    m.streetFindOne.mockResolvedValue(readyStreet({ lineStatus: "waiting", geometry: { type: "Point", coordinates: at(900, 0) } }));
    expect((await createPlace(makeReq({ json: { ...base, street: { streetId: STREET_ID } } }))).status).toBe(409);
  });

  it("creates a street with a traced line (numbers near 100) and a provisional name", async () => {
    const trace = [at(200, -2), at(260, -2)];
    const res = await createPlace(makeReq({ json: { ...base, street: { new: { name: "manguier", lang: "fr", line: trace } } } }));
    expect(res.status).toBe(201);
    const street = m.streetCreate.mock.calls[0][0];
    expect(street).toMatchObject({
      name: "Manguier", nameStatus: "proposed", nameSource: "community", lineStatus: "ready", lineSource: "trace", baseSlot: 50, originS: 0,
    });
    expect(street.geometry.type).toBe("LineString");
    expect(street.proposedBy).toBeTruthy();
    const out = await res.json();
    // The trace starts at x=200 m, the pin is 30 m along on the right: slot 50 + 3 -> 106.
    expect(out.houseNumber).toBe(106);
    expect(res.cookies.get(DEVICE_COOKIE)?.value).toBeTruthy();
  });

  it("gives a new street the postal code of its quarter, else of its city", async () => {
    m.postalFind.mockReturnValue(query([{ quarterKey: "", postalCode: "1000" }, { quarterKey: "bastos", postalCode: "1060" }]));
    await createPlace(makeReq({ json: { ...base, street: { new: { lang: "fr" } } } }));
    expect(m.postalFind.mock.calls[0][0]).toEqual({ cityKey: "yaounde", quarterKey: { $in: ["bastos", ""] } });
    expect(m.streetCreate.mock.calls[0][0].postalCode).toBe("1060");

    m.postalFind.mockReturnValue(query([{ quarterKey: "", postalCode: "1000" }]));
    await createPlace(makeReq({ json: { ...base, street: { new: { lang: "fr" } } } }));
    expect(m.streetCreate.mock.calls[1][0].postalCode).toBe("1000");

    m.postalFind.mockReturnValue(query([]));
    await createPlace(makeReq({ json: { ...base, street: { new: { lang: "fr" } } } }));
    expect(m.streetCreate.mock.calls[2][0].postalCode).toBeUndefined();
  });

  it("creates an unnamed street waiting for its line when no trace is sent", async () => {
    const res = await createPlace(makeReq({ json: { ...base, street: { new: { lang: "fr" } } } }));
    expect(res.status).toBe(201);
    expect(m.streetCreate.mock.calls[0][0]).toMatchObject({ nameStatus: "unnamed", lineStatus: "waiting", geometry: { type: "Point" } });
    expect((await res.json()).numberStatus).toBe("waiting");
    expect(m.labelCreate).not.toHaveBeenCalled();
  });

  it("warns about a street that already exists at the pin, unless confirmNew is sent", async () => {
    m.streetFind.mockReturnValue(query([readyStreet()]));
    const res = await createPlace(makeReq({ json: { ...base, street: { new: { lang: "fr" } } } }));
    expect(res.status).toBe(409);
    const out = await res.json();
    expect(out.reason).toBe("street_exists_nearby");
    expect(out.street).toMatchObject({ id: STREET_ID, name: "Manguier" });
    expect(m.streetCreate).not.toHaveBeenCalled();

    const forced = await createPlace(makeReq({ json: { ...base, street: { new: { lang: "fr", confirmNew: true } } } }));
    expect(forced.status).toBe(201);
  });

  it("refuses a name used or sounding like one used within 2 km", async () => {
    m.streetFind
      .mockReturnValueOnce(query([])) // nearby streets
      .mockReturnValueOnce(query([{ name: "Manguiers", aliases: [] }])); // names within 2 km
    const res = await createPlace(makeReq({ json: { ...base, street: { new: { name: "Manguier", lang: "fr" } } } }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe("name_taken_nearby");
    expect(m.streetCreate).not.toHaveBeenCalled();
  });

  it("rate limits street creation per device", async () => {
    m.rl.mockImplementation(async ({ key }) => ({ count: key.startsWith("street-create-device") ? 4 : 1 }));
    const res = await createPlace(makeReq({ json: { ...base, street: { new: { lang: "fr" } } } }));
    expect(res.status).toBe(429);
    expect(m.streetCreate).not.toHaveBeenCalled();
  });

  it("gives the label back (and the new street) when the place cannot be stored", async () => {
    m.placeCreate.mockRejectedValue(new Error("db down"));
    const trace = [at(200, -2), at(260, -2)];
    const res = await createPlace(makeReq({ json: { ...base, street: { new: { lang: "fr", line: trace } } } }));
    expect(res.status).toBe(500);
    expect(m.labelDeleteOne).toHaveBeenCalledWith({ _id: "label-1" });
    expect(m.streetDeleteOne).toHaveBeenCalledWith({ _id: STREET_ID });
  });

  it("keeps a joined street when the place cannot be stored", async () => {
    m.streetFindOne.mockResolvedValue(readyStreet());
    m.placeCreate.mockRejectedValue(new Error("db down"));
    await createPlace(makeReq({ json: { ...base, street: { streetId: STREET_ID } } }));
    expect(m.labelDeleteOne).toHaveBeenCalled();
    expect(m.streetDeleteOne).not.toHaveBeenCalled();
  });

  it("accepts the proposed name once the street has five houses", async () => {
    m.streetFindOne.mockResolvedValue(readyStreet({ placeCount: 4 }));
    await createPlace(makeReq({ json: { ...base, street: { streetId: STREET_ID } } }));
    const [filter, update] = m.streetUpdateOne.mock.calls[1];
    expect(filter).toMatchObject({ nameStatus: "proposed", nameSource: "community", placeCount: { $gte: 5 } });
    expect(update).toEqual({ $set: { nameStatus: "accepted" } });
  });

  it("still creates a place without a street (code only)", async () => {
    const res = await createPlace(makeReq({ json: base }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ street: null, houseNumber: null, numberStatus: "none" });
    expect(m.streetFindOne).not.toHaveBeenCalled();
    expect(m.labelCreate).not.toHaveBeenCalled();
  });
});

describe("deletePlace with a street", () => {
  it("retires the label and lowers the counter", async () => {
    m.placeFindOneAndDelete.mockResolvedValue({ _id: "p1", streetId: STREET_ID });
    const { newDeviceToken } = await import("../../../../utils/deviceToken.js");
    const { token } = newDeviceToken();
    const res = await deletePlace(makeReq({ cookie: token }), "YDE-7K4M");
    expect(res.status).toBe(200);
    expect(m.labelUpdateOne).toHaveBeenCalledWith({ placeId: "p1" }, { $set: { state: "retired" }, $unset: { placeId: "" } });
    expect(m.streetUpdateOne).toHaveBeenCalledWith({ _id: STREET_ID, placeCount: { $gt: 0 } }, { $inc: { placeCount: -1 } });
  });

  it("leaves labels alone for a place without a street", async () => {
    m.placeFindOneAndDelete.mockResolvedValue({ _id: "p1" });
    const { newDeviceToken } = await import("../../../../utils/deviceToken.js");
    await deletePlace(makeReq({ cookie: newDeviceToken().token }), "YDE-7K4M");
    expect(m.labelUpdateOne).not.toHaveBeenCalled();
  });
});
