import { Schema, model, models } from "mongoose";

// An IP the admin trusts for testing (skips the "be at the house" check). Deleted by MongoDB after expiresAt.
const trustedIpSchema = new Schema({
  ipHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});
trustedIpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.TrustedIp || model("TrustedIp", trustedIpSchema);
