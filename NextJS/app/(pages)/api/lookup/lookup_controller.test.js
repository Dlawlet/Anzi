import { beforeEach, describe, expect, it, vi } from "vitest";

const { find, allow } = vi.hoisted(() => ({ find: vi.fn(), allow: vi.fn() }));

vi.mock("../../../../models/addressModel.js", () => ({ default: { find } }));
vi.mock("../../../../utils/rateLimit.js", () => ({ allow, clientIp: () => "1.2.3.4", hashIp: (ip) => ip }));

import { lookupAddresses } from "./lookup_controller.js";

const req = (q) => ({ nextUrl: { searchParams: new URLSearchParams(q === undefined ? "" : { q }) } });
const chain = (docs) => {
  const lean = vi.fn().mockResolvedValue(docs);
  const limit = vi.fn().mockReturnValue({ lean });
  const select = vi.fn().mockReturnValue({ limit });
  find.mockReturnValue({ select });
  return { select, limit };
};

beforeEach(() => {
  vi.clearAllMocks();
  allow.mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("lookupAddresses", () => {
  it("requires every word, matches them literally and selects only public fields", async () => {
    const { select, limit } = chain([]);
    const res = await lookupAddresses(req("Idriss 1.8"));
    expect(res.status).toBe(200);
    expect(find).toHaveBeenCalledWith({
      $and: [{ name: { $regex: "Idriss", $options: "i" } }, { name: { $regex: String.raw`1\.8`, $options: "i" } }],
    });
    expect(select).toHaveBeenCalledWith("name coordinates city");
    expect(limit).toHaveBeenCalledWith(10);
  });

  it("returns title, city and position, not the description", async () => {
    chain([
      { _id: "a1", name: "138 Rue Idriss 7104 Yaounde VI\n", coordinates: [11.47, 3.84], city: "yaoundé", description: "call 677" },
      { _id: "a2", name: "Unnamed", coordinates: [1, 2], city: "x" },
      { _id: "a3", name: "No position", coordinates: [], city: "x" },
    ]);
    const body = await (await lookupAddresses(req("idriss"))).json();
    expect(body.matches).toEqual([{ id: "a1", title: "138 Rue Idriss 7104 Yaounde VI", city: "yaoundé", lng: 11.47, lat: 3.84 }]);
  });

  it("rejects empty search and applies the rate limit", async () => {
    expect((await lookupAddresses(req("  "))).status).toBe(400);
    expect((await lookupAddresses(req(undefined))).status).toBe(400);
    allow.mockResolvedValue(false);
    expect((await lookupAddresses(req("idriss"))).status).toBe(429);
    expect(find).not.toHaveBeenCalled();
  });

  it("caps the number of words and hides database errors", async () => {
    chain([]);
    await lookupAddresses(req("a b c d e f g"));
    expect(find.mock.calls[0][0].$and).toHaveLength(5);
    find.mockImplementation(() => {
      throw new Error("secret mongo detail");
    });
    const res = await lookupAddresses(req("paul"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});
