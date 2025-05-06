// src/app/api/auth/signup/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUser } from "@/backend/models/User";

// Helper function to send verification email (Placeholder)
// In a real application, you would use a service like Nodemailer, SendGrid, Resend, etc.
async function sendVerificationEmail(email: string, token: string) {
  // TODO: Implement actual email sending logic here
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;
  console.log(`📧 [Signup] Sending verification email to ${email}`);
  console.log(`🔗 Verification URL: ${verificationUrl}`); // Log URL for testing
  // Example: await sendEmail({ to: email, subject: "Verify your email", html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>` });
  return Promise.resolve(); // Simulate successful sending
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { email, username, password } = await request.json();

    // 1. Validate Input
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน (อีเมล, ชื่อผู้ใช้, รหัสผ่าน)" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" },
        { status: 400 }
      );
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร, ตัวเลข หรือเครื่องหมาย _ เท่านั้น" },
        { status: 400 }
      );
    }
    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้ต้องมีระหว่าง 3 ถึง 30 ตัวอักษร" },
        { status: 400 }
      );
    }

    const lowerCaseEmail = email.toLowerCase();

    // 2. Check for existing user
    const existingUser = await UserModel().findOne({
      $or: [{ email: lowerCaseEmail }, { username }],
    });
    if (existingUser) {
      const conflictField = existingUser.email === lowerCaseEmail ? "อีเมล" : "ชื่อผู้ใช้";
      return NextResponse.json(
        { error: `${conflictField}นี้ถูกใช้งานแล้ว` },
        { status: 409 } // 409 Conflict
      );
    }

    // 3. Create New User (Unverified)
    const newUser = new (UserModel())({
      email: lowerCaseEmail,
      username,
      password, // Will be hashed by pre-save middleware
      role: "Reader",
      isEmailVerified: false,
      profile: {
        displayName: username,
      },
      stats: {
        followers: 0,
        following: 0,
        novels: 0,
        purchases: 0,
      },
      preferences: {
        language: "th",
        theme: "system",
        notifications: {
          email: true,
          push: true,
        },
      },
      wallet: {
        balance: 0,
        currency: "THB",
      },
      lastLogin: new Date(),
      isActive: true,
    });

    // 4. Generate Verification Token
    const verificationToken = newUser.getEmailVerificationToken();
    await newUser.save();
    console.log(`✅ [Signup] สร้างผู้ใช้ใหม่ (ยังไม่ยืนยัน): ${username} (${lowerCaseEmail})`);

    // 5. Send Verification Email
    try {
      await sendVerificationEmail(lowerCaseEmail, verificationToken);
    } catch (emailError) {
      console.error("❌ [Signup] ไม่สามารถส่งอีเมลยืนยันได้:", emailError);
      // User is created, but email failed. Log the error but proceed.
    }

    // 6. Return Success Response
    return NextResponse.json(
      { success: true, message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ [Signup] เกิดข้อผิดพลาด:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      return NextResponse.json(
        { error: `${field === "email" ? "อีเมล" : "ชื่อผู้ใช้"} '${value}' นี้ถูกใช้งานแล้ว` },
        { status: 409 }
      );
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสมัครสมาชิก", details: error.message },
      { status: 500 }
    );
  }
}