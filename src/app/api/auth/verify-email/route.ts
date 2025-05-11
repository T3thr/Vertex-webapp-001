// src/app/api/auth/verify-email/route.ts

import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import crypto from "crypto";

// API สำหรับยืนยันอีเมลโดยใช้โทเค็นที่ส่งมาทางลิงก์
// ตรวจสอบโทเค็นที่แฮชแล้วในฐานข้อมูลและอัปเดตสถานะการยืนยัน
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // 1. ตรวจสอบว่าโทเค็นมีอยู่
  if (!token) {
    console.warn("⚠️ [VerifyEmail] ไม่พบโทเค็นยืนยันในคำขอ");
    return NextResponse.redirect(new URL("/auth/error?error=MissingToken", request.url));
  }

  try {
    // 2. เชื่อมต่อฐานข้อมูล
    await dbConnect();
    console.log("✅ [VerifyEmail] เชื่อมต่อ MongoDB สำเร็จ");

    // 3. สร้าง instance ของ User model
    const UserModelInstance = UserModel();

    // 4. แฮชโทเค็นที่ได้รับเพื่อเปรียบเทียบกับฐานข้อมูล
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    console.log(`🔑 [VerifyEmail] ค้นหาด้วย hashed token: ${hashedToken.substring(0, 10)}...`);

    // 5. ค้นหาผู้ใช้โดยใช้โทเค็นที่แฮชแล้วและตรวจสอบวันหมดอายุ
    const user = await UserModelInstance.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpiry: { $gt: new Date() }, // ตรวจสอบว่าโทเค็นยังไม่หมดอายุ
    });

    // 6. ตรวจสอบว่าพบผู้ใช้หรือไม่
    if (!user) {
      console.warn(`⚠️ [VerifyEmail] ไม่พบผู้ใช้หรือโทเค็นหมดอายุ: ${hashedToken.substring(0, 10)}...`);
      return NextResponse.redirect(new URL("/auth/error?error=InvalidOrExpiredToken", request.url));
    }

    // 7. อัปเดตสถานะยืนยันอีเมลและล้างข้อมูลโทเค็น
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    await user.save();

    console.log(`✅ [VerifyEmail] ยืนยันอีเมลสำเร็จสำหรับผู้ใช้: ${user.username} (${user.email})`);

    // 8. เปลี่ยนเส้นทางไปยังหน้าล็อกอินพร้อมข้อความสำเร็จ
    return NextResponse.redirect(new URL("/", request.url));

  } catch (error: any) {
    console.error("❌ [VerifyEmail] เกิดข้อผิดพลาดในการยืนยันอีเมล:", error.message);
    // เปลี่ยนเส้นทางไปยังหน้าข้อผิดพลาดทั่วไป
    return NextResponse.redirect(new URL("/auth/error?error=VerificationFailed", request.url));
  }
}