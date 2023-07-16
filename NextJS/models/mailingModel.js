import mongoose from 'mongoose';

const mailingSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        default: "Unnamed",
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.Mailing || mongoose.model("Mailing", mailingSchema);
