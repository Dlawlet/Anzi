import { Schema, model, models } from "mongoose";
import { CATEGORIES, REGIONS, VISIBILITIES } from "../utils/placeValidation.js";

// Phase 1 Place (docs/refresh-plan.md section 2). Street and contact phone arrive in later slices.
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
    houseNumber: { type: String, maxlength: 20, trim: true },
    quarter: { type: String, maxlength: 60, trim: true },
    city: { type: String, required: true, maxlength: 60, trim: true },
    region: { type: String, required: true, enum: REGIONS },
    landmark: { type: String, maxlength: 140, trim: true },
    visibility: { type: String, required: true, enum: VISIBILITIES },
    consentAt: { type: Date, required: true },
    consentVersion: { type: String, required: true },
    adultOrParentOk: { type: Boolean, required: true },
    status: { type: String, required: true, enum: ["live", "pending", "hidden"] },
    ownerId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

placeSchema.index({ location: "2dsphere" });
placeSchema.index({ visibility: 1, status: 1, name: 1 });

export default models.Place || model("Place", placeSchema);
