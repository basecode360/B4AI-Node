import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "student"],
    required: true,
    default: "student",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  profile: {
    profilePic: {
      type: String,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    DOB: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
      default: "male",
    },
    institute: {
      type: String,
    },
    residence: {
      type: String,
    },
    DOG: {
      type: String,
    },
    speciality: {
      type: String,
    },
    // ✅ Added social media fields
    facebookUrl: {
      type: String,
      default: "",
    },
    twitterUrl: {
      type: String,
      default: "",
    },
    instagramUrl: {
      type: String,
      default: "",
    },
  },
});

export const userModel =
  mongoose.models.Users || mongoose.model("User", userSchema);
