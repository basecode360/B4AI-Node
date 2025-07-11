import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const db = await mongoose.connect(process.env.MONGODB_URI);
    if (db.connection.readyState === 1) {
      console.log("database connected successfully");
    }
  } catch (error) {
    console.log(error.message);
  }
};

export default connectDB
