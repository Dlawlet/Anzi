import { describe, expect, it } from "vitest";
import { newDeviceToken, verifyDeviceToken } from "./deviceToken.js";
import { CODE_ALPHABET, generateCode, normalizeCode } from "./placeCode.js";
import { publicPlace, validateNewPlace, validatePlacePatch } from "./placeValidation.js";

const valid = {
  lng: 11.5167, lat: 3.8667, name: "Chez Mama Julie", category: "home", city: "Yaoundé", region: "Centre",
  landmark: "Behind the pharmacy, yellow gate", consent: true, adultOrParentOk: true,
};

describe("placeCode", () => {
  it("generates readable codes that survive normalisation", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode("Yaoundé");
      expect(code).toMatch(/^YDE-[2-9A-HJKMNP-Z]{4}$/);
      expect(normalizeCode(code)).toBe(code);
    }
    expect(CODE_ALPHABET).not.toMatch(/[01OIL]/);
    expect(generateCode("Somewhere")).toMatch(/^CMR-/);
  });
  it("normalises typed input and rejects junk", () => {
    expect(normalizeCode(" yde 7k4m ")).toBe("YDE-7K4M");
    expect(normalizeCode("YDE7K4M")).toBe("YDE-7K4M");
    for (const bad of ["", "YDE-7K40", "YDE-7K4", "7K4M", "{$ne:1}", null, 12]) expect(normalizeCode(bad)).toBeNull();
  });
});

describe("deviceToken", () => {
  it("verifies its own tokens and rejects tampering", () => {
    const { id, token } = newDeviceToken();
    expect(verifyDeviceToken(token)).toBe(id);
    expect(verifyDeviceToken(`${id}x.${token.split(".")[1]}`)).toBeNull();
    expect(verifyDeviceToken(`${token}.extra`)).toBeNull();
    expect(verifyDeviceToken(`other.${token.split(".")[1]}`)).toBeNull();
    for (const bad of [undefined, "", "abc", ".", "a."]) expect(verifyDeviceToken(bad)).toBeNull();
  });
});

describe("validateNewPlace", () => {
  it("accepts a good request and defaults to link-only visibility", () => {
    const { errors, value } = validateNewPlace(valid);
    expect(errors).toEqual([]);
    expect(value).toMatchObject({ name: "Chez Mama Julie", visibility: "link", lng: 11.5167, lat: 3.8667 });
  });
  it("requires consent and coordinates inside Cameroon", () => {
    expect(validateNewPlace({ ...valid, consent: false }).errors).toContain("consent");
    // The phone's own reading: a pin near it is fine, one far away is refused.
    expect(validateNewPlace({ ...valid, fix: { lng: 11.5168, lat: 3.8668 } }).errors).toEqual([]);
    expect(validateNewPlace({ ...valid, fix: { lng: 11.6, lat: 3.9 } }).errors).toContain("location");
    expect(validateNewPlace({ ...valid, fix: { lng: "x", lat: 3.9 } }).errors).toContain("location");
    expect(validateNewPlace({ ...valid, adultOrParentOk: undefined }).errors).toContain("adultOrParentOk");
    expect(validateNewPlace({ ...valid, lng: -74.5, lat: 40 }).errors).toContain("location");
    expect(validateNewPlace({ ...valid, lng: "abc" }).errors).toContain("location");
  });
  it("rejects bad enums and over-long text, ignores client-set server fields", () => {
    const { errors } = validateNewPlace({ ...valid, category: "castle", region: "Mars", landmark: "x".repeat(141), visibility: "everyone" });
    expect(errors).toEqual(expect.arrayContaining(["category", "region", "landmark", "visibility"]));
    const ok = validateNewPlace({ ...valid, status: "hidden", code: "AAA-1111", ownerId: "me" }).value;
    expect(ok).not.toHaveProperty("status");
    expect(ok).not.toHaveProperty("code");
    expect(ok).not.toHaveProperty("ownerId");
  });
  it("rejects non-object bodies", () => {
    for (const bad of [null, [], "x", 3]) expect(validateNewPlace(bad).errors).toEqual(["body"]);
  });
});

describe("validatePlacePatch", () => {
  it("only allows the editable fields", () => {
    const { errors, value } = validatePlacePatch({ name: "New name", visibility: "public", ownerId: "me", status: "hidden", lng: 1 });
    expect(errors).toEqual([]);
    expect(value).toEqual({ name: "New name", visibility: "public" });
  });
  it("rejects empty and invalid patches", () => {
    expect(validatePlacePatch({}).errors).toEqual(["empty"]);
    expect(validatePlacePatch({ ownerId: "me" }).errors).toEqual(["empty"]);
    expect(validatePlacePatch({ name: "x" }).errors).toEqual(["name"]);
    expect(validatePlacePatch({ visibility: "all" }).errors).toEqual(["visibility"]);
  });
});

describe("publicPlace", () => {
  it("never exposes owner, consent or moderation fields", () => {
    const out = publicPlace({
      code: "YDE-7K4M", name: "A", category: "home", city: "Yaoundé", region: "Centre", visibility: "link",
      location: { type: "Point", coordinates: [11.5, 3.8] }, ownerId: "secret", consentAt: new Date(), status: "live",
    });
    expect(out).toMatchObject({ code: "YDE-7K4M", lng: 11.5, lat: 3.8 });
    for (const key of ["ownerId", "consentAt", "status", "adultOrParentOk"]) expect(out).not.toHaveProperty(key);
  });
});
