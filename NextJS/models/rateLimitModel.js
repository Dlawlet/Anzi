import { Schema, model, models } from "mongoose";

// One document per (scope, id, time window). MongoDB deletes it after expiresAt.
const rateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.RateLimit || model("RateLimit", rateLimitSchema);
