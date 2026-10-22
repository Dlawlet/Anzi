import { Schema, model, models } from "mongoose";

// Optional postal code of a (city, quarter) pair, set by the admin. quarterKey "" = the code of the whole city.
// Keys are the folded names (lower case, no accents, single spaces); city and quarter keep the display spelling.
const postalCodeSchema = new Schema(
  {
    cityKey: { type: String, required: true },
    quarterKey: { type: String, default: "" },
    city: { type: String, required: true, maxlength: 60, trim: true },
    quarter: { type: String, maxlength: 60, trim: true },
    postalCode: { type: String, required: true, match: /^\d{3,6}$/ },
  },
  { timestamps: true }
);

postalCodeSchema.index({ cityKey: 1, quarterKey: 1 }, { unique: true });

export default models.PostalCode || model("PostalCode", postalCodeSchema);
