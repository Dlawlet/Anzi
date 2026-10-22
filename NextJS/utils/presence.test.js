import { describe, expect, it } from "vitest";
import { metresBetween, metresToTarget, pinIsCoherent } from "./presence.js";

const here = { lat: 3.8667, lng: 11.5174 };
const northBy = (m) => ({ lat: here.lat + m / 111195, lng: here.lng });

describe("presence", () => {
  it("measures distances in metres", () => {
    expect(Math.round(metresBetween(here, northBy(100)))).toBe(100);
    expect(metresBetween(here, here)).toBe(0);
  });
  it("lets a phone near the target through", () => {
    expect(metresToTarget({ ...here, accuracyM: 10 }, northBy(60))).toBe(0);
    expect(metresToTarget({ ...here, accuracyM: 5 }, northBy(104))).toBe(0);
  });
  it("tells how far a phone still is, minus a poor reading's doubt", () => {
    expect(metresToTarget({ ...here, accuracyM: 10 }, northBy(500))).toBe(490);
    expect(metresToTarget({ ...here, accuracyM: 900 }, northBy(500))).toBe(450);
  });
  it("keeps the pin near the phone's own reading", () => {
    expect(pinIsCoherent(here, northBy(200))).toBe(true);
    expect(pinIsCoherent(here, northBy(400))).toBe(false);
  });
});
