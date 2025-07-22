import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        'MONGODB_URI is not defined. Please set it in your .env file.'
      );
    }
    const db = await mongoose.connect(process.env.MONGODB_URI);
    if (db.connection.readyState === 1) {
      console.log('database connected successfully');
    }
  } catch (error) {
    console.log(error.message);
  }
};

export default connectDB;
