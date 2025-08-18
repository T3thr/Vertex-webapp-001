// src/app/api/auth/verify-email/route.ts

import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  console.log("🔵 [VerifyEmail API] ได้รับคำขอตรวจสอบอีเมล...");
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // 1. ตรวจสอบว่ามีโทเค็นหรือไม่
  if (!token) {
    console.error("❌ [VerifyEmail API] ไม่พบโทเค็นยืนยันใน URL");
    return NextResponse.json(
      { error: "ไม่พบโทเค็นยืนยัน", success: false },
      { status: 400 }
    );
  }

  try {
    await dbConnect();
    console.log("✅ [VerifyEmail API] เชื่อมต่อ MongoDB สำเร็จ");

    const UserModelInstance = UserModel;

    // 2. แปลง plain token เป็น hashed token เพื่อเปรียบเทียบกับ DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    console.log(`🔍 [VerifyEmail API] Hashed token: ${hashedToken.substring(0, 10)}...`);

    // 3. ค้นหาผู้ใช้ที่มี hashed token และโทเค็นยังไม่หมดอายุ
    const user = await UserModelInstance.findOne({
      emailVerificationToken: hashedToken,
      // allow token even if expiry has passed so we can detect already verified later
    });

    if (!user) {
      // ถ้าไม่พบผู้ใช้ที่มีโทเค็นนี้ อาจเป็นเพราะหมดอายุหรือลบโทเค็นไปแล้ว
      // ลองตรวจสอบว่าผู้ใช้ได้รับการยืนยันแล้วหรือไม่ (มักเกิดจากการกดลิงก์ซ้ำ)
      const alreadyVerifiedUser = await UserModelInstance.findOne({
        emailVerificationToken: hashedToken,
        isEmailVerified: true,
      });

      if (alreadyVerifiedUser) {
        console.log(`ℹ️ [VerifyEmail API] ผู้ใช้ได้รับการยืนยันแล้ว: ${alreadyVerifiedUser.email}`);
        const redirectUrl = new URL("/verify-email", request.url);
        redirectUrl.searchParams.set("status", "already-verified");
        redirectUrl.searchParams.set("email", alreadyVerifiedUser.email || "");
        return NextResponse.redirect(redirectUrl);
      }

      console.warn(`⚠️ [VerifyEmail API] โทเค็นไม่ถูกต้องหรือหมดอายุ: ${token.substring(0, 10)}...`);
      // redirect พร้อมสถานะ error แทนการตอบ JSON เพื่อลดโอกาสเกิด 404
      const redirectUrl = new URL("/verify-email", request.url);
      redirectUrl.searchParams.set("status", "error");
      redirectUrl.searchParams.set("message", "โทเค็นยืนยันไม่ถูกต้องหรือหมดอายุ กรุณาขออีเมลยืนยันใหม่");
      return NextResponse.redirect(redirectUrl);

    }

    // 4. อัปเดตสถานะยืนยันอีเมลและล้างโทเค็น
    user.isEmailVerified = true;
    // เก็บโทเค็นเอาไว้ (ไม่ลบ) แต่ทำให้หมดอายุแล้ว เพื่อให้การกดลิงก์ซ้ำสามารถตรวจสอบสถานะได้
    user.emailVerificationTokenExpiry = new Date();

    await user.save();
    console.log(`✅ [VerifyEmail API] ยืนยันอีเมลสำเร็จสำหรับผู้ใช้: ${user.username} (${user.email})`);

    // 5. Redirect ไปยังหน้า verify-email เพื่อแสดงผล UI
    const redirectUrl = new URL("/verify-email", request.url);
    redirectUrl.searchParams.set("status", "success");
    redirectUrl.searchParams.set("email", user.email || "");
    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    console.error("❌ [VerifyEmail API] เกิดข้อผิดพลาดในการยืนยันอีเมล:", error);
    // ส่ง redirect ไปยังหน้า verify-email พร้อมสถานะข้อผิดพลาด
    const redirectUrl = new URL("/verify-email", request.url);
    redirectUrl.searchParams.set("status", "error");
    redirectUrl.searchParams.set("message", "เกิดข้อผิดพลาดในการยืนยันอีเมล กรุณาลองใหม่ภายหลัง");
    return NextResponse.redirect(redirectUrl);
  }
}
