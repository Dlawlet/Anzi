import mongoose from "mongoose";

let isConnected = false;

export async function connectToDatabase () {
  if (isConnected) {
    //console.log("Using existing connection");
    return;
  }
  try {
    //console.log('Connecting to MongoDB');
    await mongoose.connect(process.env.NEXT_PUBLIC_MONGODB_URI);
    

    isConnected = true; // Set isConnected to true immediately after successful connection

    // No need to wait for the "open" event, as the connection is already established

    console.log('Connected to MongoDB');
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
    throw error;
    // Handle the connection error appropriately
    // For example, you can throw an error or exit the application
  }
};

