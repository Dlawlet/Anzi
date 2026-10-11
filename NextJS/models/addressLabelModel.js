import { Schema, model, models } from "mongoose";
import { SUFFIX_RE } from "../utils/streetNumbering.js";

// Every label ever issued on a street. Labels are never deleted: a retired label is never given to another place.
// The unique index is the allocation lock (no transaction needed).
const addressLabelSchema = new Schema(
  {
    streetId: { type: Schema.Types.ObjectId, ref: "Street", required: true },
    houseNumber: { type: Number, required: true, min: 2, max: 9999, validate: Number.isInteger },
    houseSuffix: { type: String, match: SUFFIX_RE }, // always written: "" or one letter (required would reject "")
    placeId: { type: Schema.Types.ObjectId, ref: "Place" }, // removed when retired
    state: { type: String, required: true, enum: ["active", "moved", "retired"] },
  },
  { timestamps: true }
);

addressLabelSchema.index({ streetId: 1, houseNumber: 1, houseSuffix: 1 }, { unique: true });
addressLabelSchema.index({ placeId: 1 });

export default models.AddressLabel || model("AddressLabel", addressLabelSchema);
