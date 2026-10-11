import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { create, updateOne, allow, sameOrigin } = vi.hoisted(() => ({ create: vi.fn(), updateOne: vi.fn(), allow: vi.fn(), sameOrigin: vi.fn() }));

vi.mock("../../../../models/contactMessageModel.js", () => ({ default: { create, updateOne } }));
vi.mock("../../../../utils/rateLimit.js", () => ({ allow, sameOrigin, clientIp: () => "1.2.3.4", hashIp: (ip) => ip }));

import { sendContact } from "./contact_controller.js";

const req = (body) => ({
  json: async () => {
    if (body === undefined) throw new Error("bad");
    return body;
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  allow.mockResolvedValue(true);
  sameOrigin.mockReturnValue(true);
  create.mockResolvedValue({ _id: "m1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendContact", () => {
  it("stores a clean message and answers 201 without e-mail settings", async () => {
    const res = await sendContact(req({ name: " Paul\n", replyTo: "677000000", message: "  Bonjour,\n une idée  ", lang: "en" }));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({ name: "Paul", replyTo: "677000000", message: "Bonjour, une idée", lang: "en" });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("e-mails the owner through Resend and marks the message as sent", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_TO_EMAIL", "owner@example.com");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await sendContact(req({ replyTo: "a@b.cd", message: "Une question sur ma rue" }));
    const [url, init] = fetchMock.mock.calls[0];
    const sent = JSON.parse(init.body);
    expect(url).toBe("https://api.resend.com/emails");
    expect(sent.to).toEqual(["owner@example.com"]);
    expect(sent.reply_to).toBe("a@b.cd");
    expect(updateOne).toHaveBeenCalledWith({ _id: "m1" }, { $set: { emailed: true } });
  });

  it("still answers 201 when the e-mail service fails", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_TO_EMAIL", "owner@example.com");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect((await sendContact(req({ message: "Un message valide" }))).status).toBe(201);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("rejects short messages, bad bodies, cross-site calls and floods; drops bot submissions quietly", async () => {
    expect((await sendContact(req({ message: "ok" }))).status).toBe(400);
    expect((await sendContact(req(undefined))).status).toBe(400);
    expect((await sendContact(req(["x"]))).status).toBe(400);
    expect((await sendContact(req({ message: "Un message valide", website: "http://spam" }))).status).toBe(201);
    expect(create).not.toHaveBeenCalled();
    sameOrigin.mockReturnValue(false);
    expect((await sendContact(req({ message: "Un message valide" }))).status).toBe(403);
    sameOrigin.mockReturnValue(true);
    allow.mockResolvedValue(false);
    expect((await sendContact(req({ message: "Un message valide" }))).status).toBe(429);
  });

  it("hides database errors", async () => {
    create.mockRejectedValue(new Error("secret mongo detail"));
    const res = await sendContact(req({ message: "Un message valide" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});
