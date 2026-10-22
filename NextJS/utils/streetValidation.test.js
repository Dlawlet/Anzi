import { describe, expect, it } from "vitest";
import { validateNewPlace, publicPlace } from "./placeValidation.js";
import { validateStreetInput } from "./streetValidation.js";

const ID = "66f1c0ffee0000000000abcd";
const trace = [[11.5, 3.87], [11.5005, 3.87]];

describe("validateStreetInput", () => {
  it("accepts no street, a join and a new street", () => {
    expect(validateStreetInput(undefined)).toEqual({ errors: [], value: null });
    expect(validateStreetInput(null).value).toBeNull();
    expect(validateStreetInput({ streetId: ID }).value).toEqual({ kind: "join", streetId: ID });
    const created = validateStreetInput({ new: { name: "manguier", lang: "fr", line: trace, confirmNew: true } });
    expect(created.errors).toEqual([]);
    expect(created.value).toMatchObject({ kind: "new", name: "Manguier", nameKey: "manguier", lang: "fr", confirmNew: true });
    expect(created.value.lengthM).toBeGreaterThan(40);
  });

  it("defaults to an unnamed, line-less street in French", () => {
    expect(validateStreetInput({ new: {} }).value).toEqual({ kind: "new", confirmNew: false, lang: "fr" });
  });

  it("rejects wrong shapes and unknown keys", () => {
    for (const bad of ["x", 5, [], {}, { streetId: "nope" }, { streetId: ID, new: {} }, { new: null }, { new: [] }, { new: { extra: 1 } },
      { new: { lang: "de" } }, { new: { confirmNew: "yes" } }, { new: { line: [[1, 2]] } }]) {
      expect(validateStreetInput(bad).errors, JSON.stringify(bad)).toEqual(["street"]);
    }
  });

  it("flags a refused name without saying why", () => {
    expect(validateStreetInput({ new: { name: "Pharmacie" } }).errors).toEqual(["streetName"]);
    expect(validateStreetInput({ new: { name: "Rue 12" } }).errors).toEqual(["streetName"]);
  });
});

describe("validateNewPlace with street addressing", () => {
  const valid = { lng: 11.5167, lat: 3.8667, name: "Chez Mama Julie", category: "home", city: "Yaoundé", region: "Centre", consent: true, adultOrParentOk: true };

  it("refuses server-owned number fields", () => {
    expect(validateNewPlace({ ...valid, houseNumber: "12" }).errors).toEqual(["houseNumber"]);
    expect(validateNewPlace({ ...valid, houseSuffix: "A", numberStatus: "issued", streetId: ID }).errors).toEqual(["houseSuffix", "numberStatus", "streetId"]);
  });

  it("takes the official plate and the pin flag", () => {
    expect(validateNewPlace({ ...valid, officialNumber: " 7B ", pinAdjusted: true }).value).toMatchObject({ officialNumber: "7B", pinAdjusted: true });
    expect(validateNewPlace(valid).value).toMatchObject({ officialNumber: "", pinAdjusted: false });
    expect(validateNewPlace({ ...valid, officialNumber: "x".repeat(21) }).errors).toEqual(["officialNumber"]);
    expect(validateNewPlace({ ...valid, pinAdjusted: "yes" }).errors).toEqual(["pinAdjusted"]);
  });
});

describe("publicPlace with a street", () => {
  const place = {
    code: "YDE-7K4M", name: "A", category: "home", city: "Yaoundé", region: "Centre", visibility: "link", location: { type: "Point", coordinates: [11.5, 3.8] },
    ownerId: "secret", numberStatus: "issued", houseNumber: 13, houseSuffix: "A", alongM: 120, offsetM: 9, pinAdjusted: true, streetId: ID,
  };
  const street = { _id: ID, name: "Manguier", lang: "fr", nameStatus: "accepted", nameSource: "community", city: "Yaoundé", quarter: "Bastos", proposedBy: "secret" };

  it("shows street, number and side, and nothing from the numbering audit", () => {
    const out = publicPlace(place, street);
    expect(out).toMatchObject({ houseNumber: 13, houseSuffix: "A", side: "odd", numberStatus: "issued", street: { id: ID, name: "Manguier" } });
    const body = JSON.stringify(out);
    for (const hidden of ["secret", "alongM", "offsetM", "pinAdjusted", "ownerId"]) expect(body).not.toContain(hidden);
  });

  it("exposes the postal code of the street, empty when there is none", () => {
    expect(publicPlace(place, { ...street, postalCode: "1060" }).street.postalCode).toBe("1060");
    expect(publicPlace(place, street).street.postalCode).toBe("");
  });

  it("hides a number that is not issued", () => {
    expect(publicPlace({ ...place, numberStatus: "waiting" }, street)).toMatchObject({ houseNumber: null, side: null, numberStatus: "waiting" });
    expect(publicPlace({ ...place, numberStatus: undefined, houseNumber: undefined }).numberStatus).toBe("none");
    expect(publicPlace(place).street).toBeNull();
  });
});
