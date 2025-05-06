// src/app/api/auth/resend-verification/route.ts

import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import { generateVerificationToken, sendVerificationEmail } from "@/backend/services/sendemail"; // Ensure path is correct

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { email } = await request.json();

    // 1. Validate Input
    if (!email) {
      return NextResponse.json({ error: "กรุณาระบุอีเมล" }, { status: 400 });
    }
    const lowerCaseEmail = email.toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(lowerCaseEmail)) {
        return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
    }

    // 2. Find User (Credentials User Only)
    const UserModelInstance = UserModel();
    const user = await UserModelInstance.findOne({ email: lowerCaseEmail });

    if (!user) {
      console.log(`[ResendVerify] ไม่พบบัญชีผู้ใช้สำหรับอีเมล: ${lowerCaseEmail}`);
      // Return a generic message to avoid revealing if an email exists
      return NextResponse.json({ message: "หากมีบัญชีที่เชื่อมโยงกับอีเมลนี้ คุณจะได้รับอีเมลยืนยันในไม่ช้า" }, { status: 200 });
    }

    // 3. Check if Already Verified
    if (user.isEmailVerified) {
      console.log(`[ResendVerify] อีเมล ${lowerCaseEmail} ได้รับการยืนยันแล้ว`);
      return NextResponse.json({ message: "อีเมลนี้ได้รับการยืนยันแล้ว" }, { status: 200 }); // Or 400 Bad Request
    }

    // 4. Generate New Token and Expiry
    const { token: newVerificationToken, expiry: newVerificationTokenExpiry } = generateVerificationToken();

    // 5. Update User with New Token
    user.emailVerificationToken = newVerificationToken;
    user.emailVerificationTokenExpiry = newVerificationTokenExpiry;
    await user.save();
    console.log(`[ResendVerify] สร้าง Token ใหม่สำหรับ ${lowerCaseEmail}`);

    // 6. Resend Verification Email
    try {
      await sendVerificationEmail(lowerCaseEmail, newVerificationToken);
    } catch (emailError) {
      console.error(`❌ [ResendVerify] ไม่สามารถส่งอีเมลยืนยันซ้ำได้สำหรับ ${lowerCaseEmail}:`, emailError);
      // Even if email fails, don't reveal specific error to user
      // Log the error server-side
      return NextResponse.json(
        { error: "เกิดข้อผิดพลาดในการส่งอีเมลยืนยัน กรุณาลองใหม่อีกครั้งในภายหลัง" },
        { status: 500 }
      );
    }

    // 7. Return Success Response
    return NextResponse.json(
      { success: true, message: "ส่งอีเมลยืนยันอีกครั้งแล้ว กรุณาตรวจสอบกล่องจดหมายเข้าของคุณ" },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("❌ [ResendVerify] เกิดข้อผิดพลาดที่ไม่คาดคิด:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดำเนินการตามคำขอ", details: error.message },
      { status: 500 }
    );
  }
}

