import { describe, expect, it } from "vitest";
import { dictionaries } from "../i18n/dictionary";
import { fmt, resolveLang } from "../i18n/lang";
import { regionForCity } from "./cities";
import { gpsQuality, inCameroon } from "./gps";
import { REGIONS } from "./placeValidation.js";
import { addressLine, buildShareText, mapsNavigateUrl, mapsViewUrl, whatsappUrl } from "./share";
import { publicSiteUrl } from "./site";

const place = {
  code: "YDE-7K4M", name: "Chez Mama Julie", street: { name: "Manguier" }, houseNumber: 12, houseSuffix: "", officialNumber: "",
  quarter: "Bastos", city: "Yaoundé",
  landmark: "Behind the pharmacy, yellow gate", lat: 3.866712, lng: 11.516734,
};
const tpl = { street: "{n} Rue {name}", unnamed: "{n}, rue sans nom", houseNo: "N° {n}" };
const labels = { code: "Code Anzi", landmark: "Repère", ...tpl };

describe("share links", () => {
  it("builds key-less Google Maps links", () => {
    expect(mapsViewUrl(place)).toBe("https://www.google.com/maps/search/?api=1&query=3.866712,11.516734");
    expect(mapsNavigateUrl(place)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=3.866712,11.516734&travelmode=driving"
    );
  });
  it("encodes the WhatsApp text", () => {
    const url = whatsappUrl("a b\nc&d");
    expect(url).toBe("https://wa.me/?text=a%20b%0Ac%26d");
  });
  it("joins the address parts and skips empty ones", () => {
    expect(addressLine(place, tpl)).toBe("12 Rue Manguier, Bastos, Yaoundé");
    expect(addressLine({ ...place, houseSuffix: "A" }, tpl)).toBe("12A Rue Manguier, Bastos, Yaoundé");
    expect(addressLine({ ...place, street: { name: "" } }, tpl)).toBe("12, rue sans nom, Bastos, Yaoundé");
    expect(addressLine({ ...place, street: null, houseNumber: null, officialNumber: "7" }, tpl)).toBe("N° 7, Bastos, Yaoundé");
    expect(addressLine({ street: null, houseNumber: null, houseSuffix: "", officialNumber: "", quarter: "", city: "Douala" }, tpl)).toBe("Douala");
  });
  it("leads with name, code and landmark and ends with the maps link", () => {
    const text = buildShareText(place, labels, null);
    expect(text.split("\n")).toEqual([
      "Chez Mama Julie",
      "Code Anzi: YDE-7K4M",
      "12 Rue Manguier, Bastos, Yaoundé",
      "Repère: Behind the pharmacy, yellow gate",
      "https://www.google.com/maps/search/?api=1&query=3.866712,11.516734",
    ]);
  });
  it("appends the site link last, only when one is configured", () => {
    expect(buildShareText(place, labels, "https://anzi.example").endsWith("\nhttps://anzi.example")).toBe(true);
    expect(buildShareText({ ...place, landmark: "" }, labels, null)).not.toContain("Repère");
  });
});

describe("publicSiteUrl", () => {
  it("never exposes a vercel.app address", () => {
    expect(publicSiteUrl("https://anzi-abc.vercel.app")).toBeNull();
    expect(publicSiteUrl("https://vercel.app/x")).toBeNull();
  });
  it("accepts a real domain as a bare origin and rejects junk", () => {
    expect(publicSiteUrl("https://anzi.cm/path?x=1")).toBe("https://anzi.cm");
    for (const bad of [undefined, "", "not a url", "javascript:alert(1)", "ftp://anzi.cm"]) {
      expect(publicSiteUrl(bad)).toBeNull();
    }
  });
});

describe("gps", () => {
  it("grades accuracy", () => {
    expect(gpsQuality(5)).toBe("good");
    expect(gpsQuality(30)).toBe("good");
    expect(gpsQuality(31)).toBe("fair");
    expect(gpsQuality(100)).toBe("fair");
    expect(gpsQuality(101)).toBe("weak");
    expect(gpsQuality(1000)).toBe("weak");
    expect(gpsQuality(1001)).toBe("poor");
  });
  it("checks the Cameroon box", () => {
    expect(inCameroon(3.87, 11.52)).toBe(true);
    expect(inCameroon(48.85, 2.35)).toBe(false);
    expect(inCameroon(Number.NaN, 11)).toBe(false);
  });
});

describe("cities", () => {
  it("finds the region ignoring case and accents", () => {
    expect(regionForCity("yaounde")).toBe("Centre");
    expect(regionForCity(" DOUALA ")).toBe("Littoral");
    expect(regionForCity("Ngaoundere")).toBe("Adamaoua");
    expect(regionForCity("Nowhere")).toBeNull();
  });
});

describe("i18n", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null
      ? Object.entries(value).flatMap(([k, v]) => keys(v, `${prefix}${k}.`))
      : [prefix];

  it("has the same keys in French and English, with no empty string", () => {
    expect(keys(dictionaries.en)).toEqual(keys(dictionaries.fr));
    for (const dict of Object.values(dictionaries)) {
      const empty = JSON.stringify(dict).includes('""');
      expect(empty).toBe(false);
    }
  });
  it("names every API region and category in both languages", () => {
    for (const dict of Object.values(dictionaries)) {
      for (const region of REGIONS) expect(dict.regions).toHaveProperty([region]);
    }
  });
  it("picks the language: saved choice, then browser, then French", () => {
    expect(resolveLang("en", "fr-FR")).toBe("en");
    expect(resolveLang(undefined, "en-GB,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(resolveLang(undefined, "fr-CM,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(resolveLang("de", null)).toBe("fr");
    expect(resolveLang(undefined, undefined)).toBe("fr");
  });
  it("fills placeholders and keeps unknown ones", () => {
    expect(fmt("Étape {n} sur {total}", { n: 2, total: 4 })).toBe("Étape 2 sur 4");
    expect(fmt("{a} {b}", { a: "x" })).toBe("x {b}");
  });
});
