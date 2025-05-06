// src/app/api/auth/verify-email/route.ts

import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    // Redirect to an error page or show an error message
    // For now, returning JSON error
    return NextResponse.json({ error: "Verification token is missing." }, { status: 400 });
    // Alternatively, redirect:
    // return NextResponse.redirect(new URL("/auth/error?error=MissingToken", request.url));
  }

  try {
    await dbConnect();
    const UserModelInstance = UserModel();

    // Find user by the verification token
    const user = await UserModelInstance.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpiry: { $gt: new Date() }, // Check if token is not expired
    });

    if (!user) {
      // Token is invalid or expired
      console.log(`⚠️ [VerifyEmail] Invalid or expired token: ${token}`);
      // Redirect to an error page or show an error message
      return NextResponse.json({ error: "Invalid or expired verification token." }, { status: 400 });
      // Alternatively, redirect:
      // return NextResponse.redirect(new URL("/auth/error?error=InvalidOrExpiredToken", request.url));
    }

    // Mark user as verified and clear token fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;

    await user.save();

    console.log(`✅ [VerifyEmail] Email verified successfully for user: ${user.username}`);

    // Redirect user to a success page or the sign-in page
    // You might want to add a query param to show a success message on the sign-in page
    return NextResponse.redirect(new URL("/auth/signin?verified=true", request.url));

  } catch (error: any) {
    console.error("❌ [VerifyEmail] Error during email verification:", error);
    // Redirect to a generic error page
    return NextResponse.json({ error: "An error occurred during email verification." }, { status: 500 });
    // Alternatively, redirect:
    // return NextResponse.redirect(new URL("/auth/error?error=VerificationFailed", request.url));
  }
}

