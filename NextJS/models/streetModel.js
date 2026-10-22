import { Schema, model, models } from "mongoose";
import { REGIONS } from "../utils/placeValidation.js";

// Street (docs/street-addressing.md section 7, simplified by the owner answers: one provisional name per street,
// the admin decides, a street with 5 houses accepts its proposer's name).
const aliasSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 60, trim: true },
    nameKey: { type: String, required: true },
    reason: { type: String, required: true, enum: ["renamed", "official"] },
    until: { type: Date, required: true },
  },
  { _id: false }
);

const streetSchema = new Schema(
  {
    name: { type: String, maxlength: 60, trim: true }, // absent while unnamed
    nameKey: { type: String },
    lang: { type: String, enum: ["fr", "en"] },
    nameStatus: { type: String, required: true, enum: ["unnamed", "proposed", "accepted"] },
    nameSource: { type: String, required: true, enum: ["community", "osm", "official"] },
    proposedBy: { type: String }, // device id of the proposer, never returned
    officialSource: { type: String, maxlength: 200 },
    officialAt: { type: Date },
    aliases: { type: [aliasSchema], required: true },

    // Point (the first place) while waiting for a line, LineString once the line exists.
    geometry: {
      type: { type: String, required: true, enum: ["Point", "LineString"] },
      coordinates: { type: Schema.Types.Mixed, required: true },
    },
    lineStatus: { type: String, required: true, enum: ["waiting", "ready"] },
    lineSource: { type: String, enum: ["osm", "trace", "moderator"] },
    originS: { type: Number },
    baseSlot: { type: Number, enum: [5, 50] },
    evenSide: { type: String, enum: ["right", "left"] },
    lengthM: { type: Number, min: 0, max: 3000 },

    quarter: { type: String, maxlength: 60, trim: true },
    city: { type: String, required: true, maxlength: 60, trim: true },
    postalCode: { type: String, match: /^\d{3,6}$/ }, // optional, from the admin's postal-code registry
    region: { type: String, required: true, enum: REGIONS },

    placeCount: { type: Number, required: true, min: 0 }, // cache kept with $inc
    firstOwnerId: { type: String },
    status: { type: String, required: true, enum: ["live", "hidden"] },
  },
  { timestamps: true }
);

streetSchema.pre("validate", function () {
  const coords = this.geometry?.coordinates;
  const pointOk = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
  if (this.geometry?.type === "Point") {
    if (!pointOk(coords)) this.invalidate("geometry", "Point needs [lng, lat]");
    if (this.lineStatus !== "waiting") this.invalidate("lineStatus", "a Point street is waiting");
    return;
  }
  if (!Array.isArray(coords) || coords.length < 2 || coords.length > 200 || !coords.every(pointOk)) {
    this.invalidate("geometry", "LineString needs 2 to 200 points");
  }
  if (this.lineStatus !== "ready") this.invalidate("lineStatus", "a LineString street is ready");
  for (const field of ["lineSource", "originS", "baseSlot", "evenSide", "lengthM"]) {
    if (this[field] == null) this.invalidate(field, `${field} is required once the line exists`);
  }
});

streetSchema.index({ geometry: "2dsphere" });
streetSchema.index({ nameKey: 1 });
streetSchema.index({ "aliases.nameKey": 1 });
streetSchema.index({ lineStatus: 1, createdAt: 1 });
streetSchema.index({ nameStatus: 1, createdAt: 1 });

export default models.Street || model("Street", streetSchema);
