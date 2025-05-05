// src/backend/models/User.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ------------------------
// 1. Interface
// ------------------------
export interface IUser extends Document {
  email: string;
  username: string;
  password?: string;
  role: "Reader" | "Writer" | "Admin";
  profile: {
    displayName?: string;
    avatar?: string;
    bio?: string;
  };
  novels: Types.ObjectId[];
  purchases: Types.ObjectId[];
  isEmailVerified: boolean;
  lastLogin: Date;
}

// ------------------------
// 2. Schema
// ------------------------
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "รูปแบบอีเมลไม่ถูกต้อง"],
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ["Reader", "Writer", "Admin"],
      default: "Reader",
    },
    profile: {
      _id: false,
      displayName: { type: String, trim: true, maxlength: 50 },
      avatar: {
        type: String,
        trim: true,
        validate: {
          validator: (v: string) => /^https?:\/\/|^\//.test(v),
          message: "รูปแบบ URL ของรูปโปรไฟล์ไม่ถูกต้อง",
        },
      },
      bio: { type: String, trim: true, maxlength: 500 },
    },
    novels: [
      {
        type: Schema.Types.ObjectId,
        ref: "Novel",
        default: [],
      },
    ],
    purchases: [
      {
        type: Schema.Types.ObjectId,
        ref: "Purchase",
        default: [],
      },
    ],
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ------------------------
// 3. Model Factory Function
// ------------------------
const UserModel = () =>
  models.User || model<IUser>("User", UserSchema);

// ------------------------
// 4. Export
// ------------------------
export default UserModel;
