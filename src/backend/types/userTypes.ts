// src/backend/types/userTypes.ts
import { Types } from "mongoose";

export interface IUserProfile {
  displayName?: string;
  avatar?: string;
  bio?: string;
}

export interface IUserBase {
  email: string;
  username: string;
  role: "Reader" | "Writer" | "Admin";
  profile: IUserProfile;
  novels: Types.ObjectId[];
  purchases: Types.ObjectId[];
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser extends IUserBase {
  password?: string;
  isEmailVerified: boolean;
  provider?: string;
}

export interface IGoogleUser extends IUserBase {
  providerId: string;
}

export interface ITwitterUser extends IUserBase {
  providerId: string;
}

export interface IFacebookUser extends IUserBase {
  providerId: string;
}

export interface IAppleUser extends IUserBase {
  providerId: string;
}

export interface ILineUser extends IUserBase {
  providerId: string;
}