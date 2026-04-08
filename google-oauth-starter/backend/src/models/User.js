import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    googleId: {
      type: String,
      required: true,
      unique: true
    },
    picture: {
      type: String,
      default: ""
    },
    provider: {
      type: String,
      default: "google",
      enum: ["google"]
    }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
