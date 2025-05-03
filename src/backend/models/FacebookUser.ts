import { Schema, model, models, Types } from "mongoose";

export interface IFacebookUser {
  email: string;
  username: string;
  providerId: string;
  role: "Reader" | "Writer" | "Admin";
  profile: {
    displayName?: string;
    avatar?: string;
    bio?: string;
  };
  novels: Types.ObjectId[];
  purchases: Types.ObjectId[];
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FacebookUserSchema = new Schema<IFacebookUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
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
    providerId: {
      type: String,
      required: true,
      unique: true,
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
    novels: [{
      type: Schema.Types.ObjectId,
      ref: "Novel",
      default: [],
    }],
    purchases: [{
      type: Schema.Types.ObjectId,
      ref: "Purchase",
      default: [],
    }],
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

FacebookUserSchema.index({ email: 1, providerId: 1 });

export default () => models.FacebookUser || model<IFacebookUser>("FacebookUser", FacebookUserSchema);