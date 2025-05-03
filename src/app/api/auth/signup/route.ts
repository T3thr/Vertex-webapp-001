import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { hash } from "bcryptjs";
import dbConnect from "@/backend/lib/mongodb";

export async function POST(request: Request) {
  try {
    const { email, username, password } = await request.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "Email, username, and password are required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const UserModel = mongoose.models.User || 
      mongoose.model("User", require("@/backend/models/User").default().schema);

    // Check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email or username already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create new user
    const newUser = new UserModel({
      email,
      username,
      password: hashedPassword,
      role: "Reader", // Default role
      profile: {
        displayName: username,
      },
      isEmailVerified: false, // Requires email verification
      lastLogin: new Date(),
    });

    await newUser.save();

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Sign-up error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}