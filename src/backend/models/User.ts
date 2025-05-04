import { Schema, model, models, Types } from "mongoose";

export interface IUser {
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
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
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
    password: {
      type: String,
      required: function () {
        return !this.isEmailVerified;
      },
      minlength: 8,
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

UserSchema.index({ email: 1, username: 1 });

export default () => models.User || model<IUser>("User", UserSchema);