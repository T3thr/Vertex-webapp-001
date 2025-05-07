// src/app/api/auth/verify-captcha/route.ts

import { NextResponse } from "next/server";

// ประเภทสำหรับ Request Body
interface CaptchaVerifyRequestBody {
  token: string;
}

// POST: ตรวจสอบ hCAPTCHA token
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as CaptchaVerifyRequestBody;
    const { token } = body;

    // ตรวจสอบว่าได้รับ token
    if (!token) {
      console.error("❌ ไม่ได้รับ CAPTCHA token");
      return NextResponse.json(
        { error: "กรุณายืนยัน CAPTCHA" },
        { status: 400 }
      );
    }

    // ส่งคำขอไปยัง hCAPTCHA verification endpoint
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        response: token,
        secret: process.env.HCAPTCHA_SECRET_KEY!,
      }).toString(),
    });

    const data = await response.json();

    if (!data.success) {
      console.error("❌ การตรวจสอบ CAPTCHA ล้มเหลว:", data["error-codes"]?.join(", ") || "ไม่ทราบสาเหตุ");
      return NextResponse.json(
        { error: "การตรวจสอบ CAPTCHA ล้มเหลว กรุณาลองใหม่" },
        { status: 400 }
      );
    }

    console.log("✅ การตรวจสอบ CAPTCHA สำเร็จ");
    return NextResponse.json(
      { success: true, message: "CAPTCHA ตรวจสอบสำเร็จ" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("❌ เกิดข้อผิดพลาดในการตรวจสอบ CAPTCHA:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการตรวจสอบ CAPTCHA" },
      { status: 500 }
    );
  }
}