import { describe, expect, it } from "vitest";
import { formatManageKey, generateManageKey, hashManageKey, normalizeManageKey } from "./manageKey.js";

describe("manage key", () => {
  it("generates 12 readable characters and formats them in groups of four", () => {
    const key = generateManageKey();
    expect(key).toMatch(/^[2-9A-HJKMNP-Z]{12}$/);
    expect(formatManageKey("K7QM4TXP9RWD")).toBe("K7QM-4TXP-9RWD");
  });

  it("accepts the usual ways of typing it and rejects anything else", () => {
    expect(normalizeManageKey("k7qm 4txp 9rwd")).toBe("K7QM4TXP9RWD");
    expect(normalizeManageKey(" K7QM-4TXP-9RWD ")).toBe("K7QM4TXP9RWD");
    expect(normalizeManageKey("K7QM4TXP9RW")).toBeNull(); // too short
    expect(normalizeManageKey("K7QM4TXP9RWO")).toBeNull(); // O is not in the alphabet
    expect(normalizeManageKey(undefined)).toBeNull();
    expect(normalizeManageKey("K".repeat(500))).toBeNull();
  });

  it("stores only a hash, the same for every way of typing the key", () => {
    const hash = hashManageKey("K7QM4TXP9RWD");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("K7QM4TXP9RWD");
    expect(hashManageKey(normalizeManageKey("k7qm-4txp-9rwd"))).toBe(hash);
    expect(hashManageKey("K7QM4TXP9RWE")).not.toBe(hash);
  });
});
