import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ streetFind: vi.fn(), allow: vi.fn() }));

vi.mock("../../../../../models/streetModel.js", () => ({ default: { find: m.streetFind } }));
vi.mock("../../../../../utils/rateLimit.js", () => ({ allow: m.allow, clientIp: () => "1.2.3.4", hashIp: (ip) => ip }));

import { prefixKeys, suggestStreets } from "./suggest_controller.js";

const req = (q) => ({ nextUrl: { searchParams: new URLSearchParams(q === undefined ? "" : { q }) } });
const street = (name, over = {}) => ({ name, nameKey: name.toLowerCase(), lang: "fr", quarter: "Bastos", city: "Yaoundé", ...over });
const found = (docs) => ({ limit: vi.fn().mockResolvedValue(docs) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.allow.mockResolvedValue(true);
});

describe("prefixKeys", () => {
  it("keeps letters only and drops type words", () => {
    expect(prefixKeys("Rue des Mangu")).toEqual(["mangu"]);
    expect(prefixKeys("12 manguier bas")).toEqual(["manguier", "manguierba"]);
  });
  it("ignores one-letter input and empty text", () => {
    expect(prefixKeys("m")).toEqual([]);
    expect(prefixKeys("  12  ")).toEqual([]);
  });
});

describe("suggestStreets", () => {
  it("returns public street fields only, deduplicated and sorted", async () => {
    m.streetFind.mockReturnValue(found([street("Manguier"), street("Manguier"), street("Manioc", { quarter: "", city: "Douala" })]));
    const res = await suggestStreets(req("man"));
    expect(res.status).toBe(200);
    const { suggestions } = await res.json();
    expect(suggestions).toEqual([
      { name: "Manguier", lang: "fr", quarter: "Bastos", city: "Yaoundé" },
      { name: "Manioc", lang: "fr", quarter: "", city: "Douala" },
    ]);
  });

  it("searches live, drawn streets by anchored, escaped prefix", async () => {
    m.streetFind.mockReturnValue(found([]));
    await suggestStreets(req("ma.(n"));
    const filter = m.streetFind.mock.calls[0][0];
    expect(filter).toMatchObject({ status: "live", lineStatus: "ready" });
    expect(filter.$or[0].nameKey.$regex).toBe("^ma");
  });

  it("answers an empty list for short text without touching the database or the limit", async () => {
    const res = await suggestStreets(req("m"));
    expect(await res.json()).toEqual({ suggestions: [] });
    expect(m.streetFind).not.toHaveBeenCalled();
    expect(m.allow).not.toHaveBeenCalled();
  });

  it("is 400 without q and 429 when rate limited", async () => {
    expect((await suggestStreets(req())).status).toBe(400);
    m.allow.mockResolvedValue(false);
    expect((await suggestStreets(req("man"))).status).toBe(429);
  });

  it("returns a generic 500", async () => {
    m.streetFind.mockImplementation(() => { throw new Error("mongo secret"); });
    const res = await suggestStreets(req("man"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("mongo");
  });
});
