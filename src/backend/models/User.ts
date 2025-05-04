import { Schema, model, models, Types } from "mongoose";

export interface IUser {
  email: string;
  username: string;
  password?: string;
  provider?: string;
  providerId?: string;
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
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    password: {
      type: String,
      required: function () {
        return !this.provider; // Password required only for non-OAuth users
      },
      minlength: 8,
    },
    provider: {
      type: String,
      enum: ["credentials", "google", "twitter", "facebook", "apple", "line"],
    },
    providerId: {
      type: String,
    },
    role: {
      type: String,
      enum: ["Reader", "Writer", "Admin"],
      default: "Reader",
    },
    profile: {
      displayName: { type: String, trim: true, maxlength: 50 },
      avatar: { type: String, trim: true },
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
      default: function () {
        return !!this.provider; // OAuth users are verified by default
      },
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

UserSchema.index({ email: 1, provider: 1 }, { unique: true });

export default () => models.User || model<IUser>("User", UserSchema);