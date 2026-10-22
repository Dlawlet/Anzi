import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ findOne: vi.fn(), allow: vi.fn() }));

vi.mock("../../../../models/trustedIpModel.js", () => ({ default: { findOne: m.findOne } }));
vi.mock("../../../../utils/rateLimit.js", () => ({ allow: m.allow, clientIp: () => "1.2.3.4", hashIp: (ip) => `h:${ip}` }));

import { presenceStatus } from "./presence_controller.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.allow.mockResolvedValue(true);
});

describe("presenceStatus", () => {
  it("says exempt only for a trusted, unexpired IP", async () => {
    m.findOne.mockResolvedValue({ ipHash: "h:1.2.3.4" });
    expect(await (await presenceStatus({})).json()).toEqual({ exempt: true });
    expect(m.findOne.mock.calls[0][0]).toMatchObject({ ipHash: "h:1.2.3.4" });
    expect(m.findOne.mock.calls[0][0].expiresAt.$gt).toBeInstanceOf(Date);
    m.findOne.mockResolvedValue(null);
    expect(await (await presenceStatus({})).json()).toEqual({ exempt: false });
  });
  it("is 429 when rate limited and a generic 500 on errors", async () => {
    m.allow.mockResolvedValue(false);
    expect((await presenceStatus({})).status).toBe(429);
    m.allow.mockResolvedValue(true);
    m.findOne.mockRejectedValue(new Error("mongo secret"));
    const res = await presenceStatus({});
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("mongo");
  });
});
