import mongoose, { Schema, model, models } from "mongoose";

const requestSchema = new Schema({
    name: {
        type: String,
        required: true,
        default: "Unnamed",
    },
    city:
    {
        type: String,
        required: true,
        default: "Unnamed",
    },
    email:
    {
        type: String,
        required: true,
        default: "Unnamed",
    },
    phone:
    {
        type: String,
        required: true,
        default: "Unnamed",
    },
    street:
    {
        type: String,
        required: true,
        default: "Unnamed",
    },
    addrStatus:
    {
        type: String,
        required: true,
        default: "Unnamed",
    },
    date: {
        type: Date,
        default: Date.now,
    },
    

});

export default models.Request || model("Request", requestSchema);

