import { Schema, model, models } from "mongoose";
import { CATEGORIES, NAME_REFUSAL_REASONS, PLACE_STATUSES, REFUSAL_REASONS, REGIONS, VISIBILITIES } from "../utils/placeValidation.js";
import { SUFFIX_RE } from "../utils/streetNumbering.js";

// Phase 1 Place (docs/refresh-plan.md section 2). Contact phone arrives in a later slice.
const placeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, match: /^[A-Z]{3}-[A-Z0-9]{4}$/ },
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
    accuracyM: { type: Number, min: 0 },
    name: { type: String, required: true, minlength: 2, maxlength: 80, trim: true },
    category: { type: String, required: true, enum: CATEGORIES },
    // Street address: all server-owned, issued from the street line (docs/street-addressing.md).
    streetId: { type: Schema.Types.ObjectId, ref: "Street" }, // absent = street unknown, code only
    houseNumber: { type: Number, min: 2, max: 9999, validate: Number.isInteger },
    houseSuffix: { type: String, match: SUFFIX_RE },
    numberStatus: { type: String, required: true, enum: ["none", "waiting", "issued"] },
    numberedAt: { type: Date },
    alongM: { type: Number },
    offsetM: { type: Number },
    pinAdjusted: { type: Boolean },
    officialNumber: { type: String, maxlength: 20, trim: true }, // plate typed by the owner, never ours
    quarter: { type: String, maxlength: 60, trim: true },
    city: { type: String, required: true, maxlength: 60, trim: true },
    region: { type: String, required: true, enum: REGIONS },
    landmark: { type: String, maxlength: 140, trim: true },
    visibility: { type: String, required: true, enum: VISIBILITIES },
    consentAt: { type: Date, required: true },
    consentVersion: { type: String, required: true },
    adultOrParentOk: { type: Boolean, required: true },
    // pending = waits for the admin, only its owner sees it; refused = the owner sees why (review).
    status: { type: String, required: true, enum: PLACE_STATUSES },
    review: {
      reason: { type: String, enum: REFUSAL_REASONS },
      note: { type: String, maxlength: 200 },
      at: { type: Date },
    },
    // Set when the admin removed the street name this owner proposed; cleared once the street gets a name.
    nameNotice: {
      name: { type: String, maxlength: 40 },
      reason: { type: String, enum: NAME_REFUSAL_REASONS },
      note: { type: String, maxlength: 200 },
      at: { type: Date },
    },
    ownerId: { type: String, required: true, index: true },
    // SHA-256 of the management key shown once at creation (utils/manageKey.js); it finds the place on "claim".
    // Never returned, never selected by default.
    manageKeyHash: { type: String, select: false, index: { unique: true, sparse: true } },
  },
  { timestamps: true }
);

placeSchema.index({ location: "2dsphere" });
placeSchema.index({ visibility: 1, status: 1, name: 1 });
placeSchema.index({ streetId: 1, visibility: 1, status: 1, houseNumber: 1 });
placeSchema.index({ streetId: 1, numberStatus: 1, createdAt: 1 });
placeSchema.index({ status: 1, createdAt: 1 }); // admin review queue

export default models.Place || model("Place", placeSchema);
