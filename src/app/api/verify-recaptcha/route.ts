// src/app/api/auth/verify-recaptcha/route.ts
// API สำหรับตรวจสอบโทเค็น reCAPTCHA v2 Invisible
// ส่งคำขอไปยัง Google reCAPTCHA API เพื่อยืนยันความถูกต้องของโทเค็น

import { NextResponse } from "next/server";

interface VerifyRecaptchaRequestBody {
  token: string;
}

interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("❌ [reCAPTCHA] Invalid Content-Type:", contentType);
      return NextResponse.json(
        { success: false, error: "คำขอต้องเป็น JSON" },
        { status: 400 }
      );
    }

    let body: VerifyRecaptchaRequestBody;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error("❌ [reCAPTCHA] Invalid JSON:", jsonError);
      return NextResponse.json(
        { success: false, error: "รูปแบบ JSON ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const { token } = body;
    if (!token || typeof token !== "string" || token.trim() === "") {
      console.error("❌ [reCAPTCHA] Missing or invalid token");
      return NextResponse.json(
        { success: false, error: "กรุณาระบุโทเค็น reCAPTCHA" },
        { status: 400 }
      );
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error("❌ [reCAPTCHA] RECAPTCHA_SECRET_KEY missing");
      return NextResponse.json(
        { success: false, error: "การกำหนดค่าเซิร์ฟเวอร์ไม่ถูกต้อง" },
        { status: 500 }
      );
    }

    const verificationUrl = "https://www.google.com/recaptcha/api/siteverify";
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    const response = await fetch(verificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error(
        `❌ [reCAPTCHA] Google API error: status=${response.status}, response=${responseText}`
      );
      return NextResponse.json(
        { success: false, error: "การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่" },
        { status: 500 }
      );
    }

    let recaptchaData: RecaptchaResponse;
    try {
      recaptchaData = await response.json();
    } catch (jsonError) {
      console.error("❌ [reCAPTCHA] Failed to parse Google response:", jsonError);
      return NextResponse.json(
        { success: false, error: "การตอบกลับจาก Google ไม่ถูกต้อง" },
        { status: 500 }
      );
    }

    if (!recaptchaData.success) {
      console.error(
        `❌ [reCAPTCHA] Verification failed: error-codes=${recaptchaData["error-codes"]?.join(", ") || "unknown"}`
      );
      return NextResponse.json(
        {
          success: false,
          error: `การยืนยัน reCAPTCHA ล้มเหลว: ${recaptchaData["error-codes"]?.join(", ") || "ข้อผิดพลาดที่ไม่รู้จัก"}`,
        },
        { status: 400 }
      );
    }

    console.log("✅ [reCAPTCHA] Verification successful");
    return NextResponse.json(
      { success: true, message: "การยืนยัน reCAPTCHA สำเร็จ" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("❌ [reCAPTCHA] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "เกิดข้อผิดพลาดในการตรวจสอบ reCAPTCHA กรุณาลองใหม่",
      },
      { status: 500 }
    );
  }
}