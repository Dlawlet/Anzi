import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  create: vi.fn(),
  findOne: vi.fn(),
  find: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOneAndDelete: vi.fn(),
  updateOne: vi.fn(),
  rl: vi.fn(),
}));

vi.mock("../../../../models/placeModel.js", () => ({
  default: { create: m.create, findOne: m.findOne, find: m.find, findOneAndUpdate: m.findOneAndUpdate, findOneAndDelete: m.findOneAndDelete, updateOne: m.updateOne },
}));
vi.mock("../../../../models/rateLimitModel.js", () => ({ default: { findOneAndUpdate: m.rl } }));

import { escapeRegex } from "../../../../utils/validate.js";
import { DEVICE_COOKIE, newDeviceToken } from "../../../../utils/deviceToken.js";
import { generateManageKey, hashManageKey } from "../../../../utils/manageKey.js";
import { claimPlace, createPlace, deletePlace, getPlaceByCode, listPlaces, updatePlace } from "./places_controller.js";

const body = {
  lng: 11.5167, lat: 3.8667, name: "Chez Mama Julie", category: "home", city: "Yaoundé", region: "Centre",
  consent: true, adultOrParentOk: true,
};

function makeReq({ json, cookie, headers = {}, search = "" } = {}) {
  return {
    headers: new Headers({ host: "anzi.test", ...headers }),
    cookies: { get: (name) => (name === DEVICE_COOKIE && cookie ? { value: cookie } : undefined) },
    nextUrl: { searchParams: new URLSearchParams(search) },
    json: json === undefined ? () => Promise.reject(new SyntaxError("bad")) : () => Promise.resolve(json),
  };
}

const stored = (overrides = {}) => ({
  code: "YDE-7K4M", name: "A", category: "home", city: "Yaoundé", region: "Centre", visibility: "link",
  location: { type: "Point", coordinates: [11.5, 3.8] }, ownerId: "owner-1", status: "live", ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.rl.mockResolvedValue({ count: 1 });
});

describe("createPlace", () => {
  it("creates a place, sets the device cookie and never trusts client-set fields", async () => {
    m.create.mockImplementation(async (doc) => stored({ ...doc }));
    const res = await createPlace(makeReq({ json: { ...body, status: "hidden", ownerId: "me", code: "AAA-2222" } }));
    expect(res.status).toBe(201);
    const doc = m.create.mock.calls[0][0];
    expect(doc.status).toBe("pending");
    expect(doc.ownerId).not.toBe("me");
    expect(doc.code).toMatch(/^YDE-/);
    expect(doc.visibility).toBe("link");
    expect(res.cookies.get(DEVICE_COOKIE)?.value).toBeTruthy();
    const out = await res.json();
    expect(out).toMatchObject({ status: "pending", refusal: null, isOwner: true });
    expect(out).not.toHaveProperty("ownerId");
    expect(out.isOwner).toBe(true);
    // The management key is shown once; only its hash is stored.
    expect(out.manageKey).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    expect(doc.manageKeyHash).toBe(hashManageKey(out.manageKey.replaceAll("-", "")));
    expect(JSON.stringify(doc)).not.toContain(out.manageKey.replaceAll("-", ""));
  });

  it("reuses a valid device cookie instead of minting a new one", async () => {
    m.create.mockImplementation(async (doc) => stored({ ...doc }));
    const { id, token } = newDeviceToken();
    const res = await createPlace(makeReq({ json: body, cookie: token }));
    expect(res.status).toBe(201);
    expect(m.create.mock.calls[0][0].ownerId).toBe(id);
    expect(res.cookies.get(DEVICE_COOKIE)).toBeUndefined();
  });

  it("retries on a duplicate code", async () => {
    m.create.mockRejectedValueOnce({ code: 11000 }).mockImplementation(async (doc) => stored({ ...doc }));
    expect((await createPlace(makeReq({ json: body }))).status).toBe(201);
    expect(m.create).toHaveBeenCalledTimes(2);
  });

  it("returns 400 for bad JSON, missing consent and invalid data", async () => {
    expect((await createPlace(makeReq())).status).toBe(400);
    expect((await createPlace(makeReq({ json: { ...body, consent: false } }))).status).toBe(400);
    expect(m.create).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited and 403 for a cross-site origin", async () => {
    m.rl.mockResolvedValue({ count: 1000000 });
    expect((await createPlace(makeReq({ json: body }))).status).toBe(429);
    m.rl.mockResolvedValue({ count: 1 });
    expect((await createPlace(makeReq({ json: body, headers: { origin: "https://evil.example" } }))).status).toBe(403);
    expect(m.create).not.toHaveBeenCalled();
  });

  it("hides database errors", async () => {
    m.create.mockRejectedValue(new Error("secret mongo detail"));
    const res = await createPlace(makeReq({ json: body }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});

describe("getPlaceByCode", () => {
  it("returns a link-only place to anyone with the code", async () => {
    m.findOne.mockResolvedValue(stored());
    const res = await getPlaceByCode(makeReq(), "yde-7k4m");
    expect(res.status).toBe(200);
    expect(m.findOne).toHaveBeenCalledWith({ code: "YDE-7K4M", status: { $in: ["live", "pending", "refused"] } });
    const out = await res.json();
    expect(out.isOwner).toBe(false);
    expect(out).not.toHaveProperty("status");
  });

  it("shows a pending or refused place only to its owner, with the refusal reason", async () => {
    m.findOne.mockResolvedValue(stored({ status: "pending" }));
    expect((await getPlaceByCode(makeReq(), "YDE-7K4M")).status).toBe(404);
    const { id, token } = newDeviceToken();
    m.findOne.mockResolvedValue(stored({ status: "refused", ownerId: id, review: { reason: "wrong_spot", note: "Pin in the river", at: new Date() } }));
    const res = await getPlaceByCode(makeReq({ cookie: token }), "YDE-7K4M");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ isOwner: true, status: "refused", refusal: { reason: "wrong_spot", note: "Pin in the river" } });
  });

  it("makes private places look missing except to their owner", async () => {
    m.findOne.mockResolvedValue(stored({ visibility: "private" }));
    expect((await getPlaceByCode(makeReq(), "YDE-7K4M")).status).toBe(404);
    const { id, token } = newDeviceToken();
    m.findOne.mockResolvedValue(stored({ visibility: "private", ownerId: id }));
    const res = await getPlaceByCode(makeReq({ cookie: token }), "YDE-7K4M");
    expect(res.status).toBe(200);
    expect((await res.json()).isOwner).toBe(true);
  });

  it("rejects malformed codes without touching the database, and rate limits", async () => {
    expect((await getPlaceByCode(makeReq(), "{$ne:1}")).status).toBe(400);
    m.rl.mockResolvedValue({ count: 1000000 });
    expect((await getPlaceByCode(makeReq(), "YDE-7K4M")).status).toBe(429);
    expect(m.findOne).not.toHaveBeenCalled();
  });
});

describe("listPlaces", () => {
  it("searches only public places with an escaped, limited regex", async () => {
    const limit = vi.fn().mockResolvedValue([stored({ visibility: "public" })]);
    m.find.mockReturnValue({ limit });
    const res = await listPlaces(makeReq({ search: "search=.*" }));
    expect(res.status).toBe(200);
    expect(m.find).toHaveBeenCalledWith({ visibility: "public", status: "live", name: { $regex: escapeRegex(".*"), $options: "i" } });
    expect(limit).toHaveBeenCalledWith(20);
  });

  it("lists nothing for mine without a valid device cookie", async () => {
    const res = await listPlaces(makeReq({ search: "mine=1", cookie: "forged.value" }));
    expect((await res.json()).places).toEqual([]);
    expect(m.find).not.toHaveBeenCalled();
  });

  it("returns only the caller's places for mine", async () => {
    const { id, token } = newDeviceToken();
    const limit = vi.fn().mockResolvedValue([stored({ ownerId: id })]);
    m.find.mockReturnValue({ sort: () => ({ limit }) });
    await listPlaces(makeReq({ search: "mine=1", cookie: token }));
    expect(m.find).toHaveBeenCalledWith({ ownerId: id });
  });

  it("requires a search term otherwise", async () => {
    expect((await listPlaces(makeReq({ search: "" }))).status).toBe(400);
  });
});

describe("updatePlace and deletePlace", () => {
  it("are scoped to the owner device and answer 404 to everyone else", async () => {
    m.findOneAndUpdate.mockResolvedValue(null);
    m.findOneAndDelete.mockResolvedValue(null);
    const { id, token } = newDeviceToken();
    expect((await updatePlace(makeReq({ json: { name: "New" } }), "YDE-7K4M")).status).toBe(404);
    expect((await updatePlace(makeReq({ json: { name: "New" }, cookie: token }), "YDE-7K4M")).status).toBe(404);
    expect(m.findOneAndUpdate.mock.calls[0][0]).toMatchObject({ code: "YDE-7K4M", ownerId: id });
    expect((await deletePlace(makeReq({ cookie: token }), "YDE-7K4M")).status).toBe(404);
    expect(m.findOneAndDelete).toHaveBeenCalledWith({ code: "YDE-7K4M", ownerId: id });
  });

  it("updates only whitelisted fields", async () => {
    const { id, token } = newDeviceToken();
    m.findOneAndUpdate.mockResolvedValue(stored({ ownerId: id, name: "New" }));
    const res = await updatePlace(makeReq({ json: { name: "New", ownerId: "me", status: "hidden" }, cookie: token }), "YDE-7K4M");
    expect(res.status).toBe(200);
    expect(m.findOneAndUpdate.mock.calls[0][1]).toEqual({ $set: { name: "New" } });
  });

  it("blocks cross-site writes", async () => {
    const { token } = newDeviceToken();
    const headers = { origin: "https://evil.example" };
    expect((await updatePlace(makeReq({ json: { name: "New" }, cookie: token, headers }), "YDE-7K4M")).status).toBe(403);
    expect((await deletePlace(makeReq({ cookie: token, headers }), "YDE-7K4M")).status).toBe(403);
    expect(m.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("deletes the owner's place", async () => {
    const { token } = newDeviceToken();
    m.findOneAndDelete.mockResolvedValue(stored());
    expect((await deletePlace(makeReq({ cookie: token }), "YDE-7K4M")).status).toBe(200);
  });
});

describe("claimPlace", () => {
  const key = generateManageKey();
  const typed = `${key.slice(0, 4)}-${key.slice(4, 8)} ${key.slice(8).toLowerCase()}`;

  it("hands the place to this device when the key is right", async () => {
    m.findOne.mockResolvedValue(stored({ _id: "p1" }));
    const res = await claimPlace(makeReq({ json: { key: typed } }));
    expect(res.status).toBe(200);
    expect(m.findOne.mock.calls[0][0]).toMatchObject({ manageKeyHash: hashManageKey(key) });
    const body = await res.json();
    expect(body).toMatchObject({ code: "YDE-7K4M", isOwner: true });
    expect(body).not.toHaveProperty("manageKeyHash");
    expect(m.updateOne).toHaveBeenCalledWith({ _id: "p1" }, { $set: { ownerId: expect.any(String) } });
    expect(res.cookies.get(DEVICE_COOKIE)?.value).toBeTruthy();
  });

  it("keeps the device the caller already has", async () => {
    m.findOne.mockResolvedValue(stored({ _id: "p1" }));
    const { id, token } = newDeviceToken();
    const res = await claimPlace(makeReq({ json: { key }, cookie: token }));
    expect(res.status).toBe(200);
    expect(m.updateOne).toHaveBeenCalledWith({ _id: "p1" }, { $set: { ownerId: id } });
    expect(res.cookies.get(DEVICE_COOKIE)).toBeUndefined();
  });

  it("answers 404 for an unknown key and changes nothing", async () => {
    m.findOne.mockResolvedValue(null);
    expect((await claimPlace(makeReq({ json: { key } }))).status).toBe(404);
    expect(m.updateOne).not.toHaveBeenCalled();
  });

  it("rejects a malformed key, cross-site calls and too many tries", async () => {
    expect((await claimPlace(makeReq({ json: { key: "short" } }))).status).toBe(400);
    expect((await claimPlace(makeReq())).status).toBe(400);
    expect((await claimPlace(makeReq({ json: { key }, headers: { origin: "https://evil.example" } }))).status).toBe(403);
    m.rl.mockResolvedValue({ count: 21 });
    expect((await claimPlace(makeReq({ json: { key } }))).status).toBe(429);
    expect(m.findOne).not.toHaveBeenCalled();
  });
});
