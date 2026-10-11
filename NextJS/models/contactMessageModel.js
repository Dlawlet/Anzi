import { Schema, model, models } from "mongoose";

// A message from the About page. Kept 90 days so nothing is lost if the e-mail could not be sent.
const contactMessageSchema = new Schema({
  name: { type: String, default: "" },
  replyTo: { type: String, default: "" },
  message: { type: String, required: true },
  lang: { type: String, enum: ["fr", "en"], default: "fr" },
  emailed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
contactMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default models.ContactMessage || model("ContactMessage", contactMessageSchema);
