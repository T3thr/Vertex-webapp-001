// src/app/api/auth/resend-verification/route.ts

import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import { generateVerificationToken, sendVerificationEmail } from "@/backend/services/sendemail";

// อินเทอร์เฟซสำหรับคำขอ
interface ResendVerificationRequest {
  email: string;
}

export async function POST(request: NextRequest) {
  console.log("🔵 [ResendVerification API] ได้รับคำขอส่งอีเมลยืนยันใหม่...");
  try {
    await dbConnect();
    console.log("✅ [ResendVerification API] เชื่อมต่อ MongoDB สำเร็จ");

    // 1. ดึงและตรวจสอบข้อมูลจากคำขอ
    let body: ResendVerificationRequest;
    try {
      body = await request.json();
      console.log(`ℹ️ [ResendVerification API] อีเมลที่ได้รับ: ${body.email}`);
    } catch (jsonError: any) {
      console.error("❌ [ResendVerification API] JSON parse error:", jsonError.message);
      return NextResponse.json(
        { error: "รูปแบบข้อมูลไม่ถูกต้อง", success: false },
        { status: 400 }
      );
    }

    const { email } = body;
    if (!email) {
      console.error("❌ [ResendVerification API] ไม่ระบุอีเมล");
      return NextResponse.json(
        { error: "กรุณาระบุอีเมล", success: false },
        { status: 400 }
      );
    }

    const lowerCaseEmail = email.toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(lowerCaseEmail)) {
      console.error(`❌ [ResendVerification API] รูปแบบอีเมลไม่ถูกต้อง: ${lowerCaseEmail}`);
      return NextResponse.json(
        { error: "รูปแบบอีเมลไม่ถูกต้อง", success: false },
        { status: 400 }
      );
    }

    // 2. ค้นหาผู้ใช้ในฐานข้อมูล
    const UserModelInstance = UserModel();
    const user = await UserModelInstance.findOne({ email: lowerCaseEmail });

    if (!user) {
      console.log(`⚠️ [ResendVerification API] ไม่พบบัญชีผู้ใช้สำหรับอีเมล: ${lowerCaseEmail}`);
      // ส่งข้อความทั่วไปเพื่อความปลอดภัย (ไม่เปิดเผยว่าอีเมลมีหรือไม่มีในระบบ)
      return NextResponse.json(
        { success: true, message: "หากมีบัญชีที่เชื่อมโยงกับอีเมลนี้ คุณจะได้รับอีเมลยืนยันในไม่ช้า" },
        { status: 200 }
      );
    }

    // 3. ตรวจสอบว่ายืนยันอีเมลแล้วหรือไม่
    if (user.isEmailVerified) {
      console.log(`⚠️ [ResendVerification API] อีเมล ${lowerCaseEmail} ได้รับการยืนยันแล้ว`);
      return NextResponse.json(
        { success: false, error: "อีเมลนี้ได้รับการยืนยันแล้ว กรุณาเข้าสู่ระบบ" },
        { status: 400 }
      );
    }

    // 4. สร้างโทเค็นยืนยันใหม่
    console.log(`🔄 [ResendVerification API] สร้างโทเค็นใหม่สำหรับ ${lowerCaseEmail}...`);
    const { token: plainToken, hashedToken, expiry } = generateVerificationToken();

    // 5. อัปเดตโทเค็นในฐานข้อมูล
    user.emailVerificationToken = hashedToken; // เก็บ hashed token
    user.emailVerificationTokenExpiry = expiry;
    await user.save();
    console.log(`✅ [ResendVerification API] อัปเดตโทเค็นสำเร็จสำหรับ ${lowerCaseEmail}`);

    // 6. ส่งอีเมลยืนยันใหม่
    try {
      await sendVerificationEmail(lowerCaseEmail, plainToken); // ส่ง plain token ในอีเมล
      console.log(`📧 [ResendVerification API] ส่งอีเมลยืนยันไปยัง ${lowerCaseEmail} สำเร็จ`);
    } catch (emailError: any) {
      console.error(`❌ [ResendVerification API] ไม่สามารถส่งอีเมลยืนยันไปยัง ${lowerCaseEmail}:`, emailError);
      return NextResponse.json(
        { success: false, error: "ไม่สามารถส่งอีเมลยืนยันได้ กรุณาลองใหม่ภายหลัง" },
        { status: 500 }
      );
    }

    // 7. ส่งการตอบสนองสำเร็จ
    return NextResponse.json(
      { success: true, message: "ส่งอีเมลยืนยันใหม่สำเร็จ กรุณาตรวจสอบกล่องจดหมายของคุณ" },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("❌ [ResendVerification API] เกิดข้อผิดพลาดที่ไม่คาดคิด:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดำเนินการ กรุณาลองใหม่ภายหลัง" },
      { status: 500 }
    );
  }
}