import { beforeEach, describe, expect, it, vi } from "vitest";

const { find, findById, aggregate } = vi.hoisted(() => ({
  find: vi.fn(),
  findById: vi.fn(),
  aggregate: vi.fn(),
}));

vi.mock("../../../../models/addressModel.js", () => ({
  default: { find, findById, aggregate, createIndexes: vi.fn() },
}));

import { addAddress, getAddFromCoord, getAddFromId, getAddFromName } from "./address_controller.js";

const reqWithId = (id) => ({ nextUrl: { searchParams: new URLSearchParams(id === undefined ? "" : { id }) } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getAddFromName", () => {
  it("matches user text literally and limits the result", async () => {
    const limit = vi.fn().mockResolvedValue([{ name: "Chez Paul" }]);
    find.mockReturnValue({ limit });
    const res = await getAddFromName({}, {}, ".*");
    expect(res.status).toBe(200);
    expect(find).toHaveBeenCalledWith({ name: { $regex: String.raw`\.\*`, $options: "i" } });
    expect(limit).toHaveBeenCalledWith(20);
  });

  it("rejects empty or non-string search", async () => {
    expect((await getAddFromName({}, {}, "  ")).status).toBe(400);
    expect((await getAddFromName({}, {}, undefined)).status).toBe(400);
    expect(find).not.toHaveBeenCalled();
  });

  it("returns a generic message when the database fails", async () => {
    find.mockReturnValue({ limit: vi.fn().mockRejectedValue(new Error("secret mongo detail")) });
    const res = await getAddFromName({}, {}, "paul");
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});

describe("getAddFromCoord", () => {
  it("rejects non-numeric coordinates before querying", async () => {
    const res = await getAddFromCoord({}, {}, "1;process.exit()");
    expect(res.status).toBe(400);
    expect(aggregate).not.toHaveBeenCalled();
  });

  it("passes parsed numbers to $geoNear", async () => {
    aggregate.mockResolvedValue([{ name: "x" }]);
    const res = await getAddFromCoord({}, {}, "11.5,3.8");
    expect(res.status).toBe(200);
    expect(aggregate.mock.calls[0][0][0].$geoNear.near.coordinates).toEqual([11.5, 3.8]);
  });
});

describe("getAddFromId", () => {
  it("400 on a malformed id, 404 when missing", async () => {
    expect((await getAddFromId(reqWithId("zzz"))).status).toBe(400);
    expect((await getAddFromId(reqWithId())).status).toBe(400);
    findById.mockResolvedValue(null);
    expect((await getAddFromId(reqWithId("64f1c2a3b4d5e6f708192a3b"))).status).toBe(404);
  });
});

describe("addAddress", () => {
  it("400 on invalid JSON", async () => {
    const req = { json: () => Promise.reject(new SyntaxError("bad")) };
    expect((await addAddress(req)).status).toBe(400);
  });
});
