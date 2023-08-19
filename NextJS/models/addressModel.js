import  { Schema, model, models } from "mongoose";

const addressSchema = new Schema({
  type: {
    type: String,
    required: true,
    default: "Point",
  },
  coordinates: {
    type: [Number],
    required: true,
    default: [0.00, 0.00],
  },
  name: {
    type: String,
    required: true,
    default: "Unnamed",
  },
  description: {
    type: String,

    default: "No description",
  },
  number: {
    type: Number,
    required: true,
    default: 0,
  },
  streetType: {
    type: String,
    required: true,
    default: "Undefined",
  },
  streetName: {
    type: String,
    required: true,
    default: "Unnamed",
  },
  streetNumber: {
    type: Number,
    required: true,
    default: 0,
  },
  city: {
    type: String,
    required: true,
    default: "Unnamed",
  },
  state: {
    type: String,
    required: true,
    default: "Unnamed",
  },
  country: {
    type: String,
    required: true,
    default: "Unnamed",
  },
  block : {
    type: String,
    required: true,
    default: "Unnamed",
  },
  code : {
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


const Addresso = models.Address || model("Address", addressSchema); 
export default Addresso;
   