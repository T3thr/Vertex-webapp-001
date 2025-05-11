// src/app/api/verify-recaptcha/route.ts
// API สำหรับตรวจสอบโทเค็น reCAPTCHA v2 Invisible
// ส่งคำขอไปยัง Google reCAPTCHA API เพื่อยืนยันความถูกต้องของโทเค็น
// อัปเดต: เพิ่ม console log สำหรับการ debug และการจัดการ error ที่ครอบคลุม

import { NextResponse } from "next/server";

interface VerifyRecaptchaRequestBody {
  token: string;
}

interface RecaptchaResponseFromGoogle {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  score?: number;
  action?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  console.log("🔵 [reCAPTCHA Verify API] ได้รับคำขอตรวจสอบ reCAPTCHA...");
  try {
    const contentType = request.headers.get("content-type");
    console.log(`ℹ️ [reCAPTCHA Verify API] Content-Type: ${contentType}`);
    if (!contentType || !contentType.includes("application/json")) {
      console.error("❌ [reCAPTCHA Verify API] Content-Type ไม่ถูกต้อง:", contentType);
      return NextResponse.json(
        { success: false, error: "คำขอต้องเป็น JSON (Invalid Content-Type)" },
        { status: 415 }
      );
    }

    let body: VerifyRecaptchaRequestBody;
    try {
      body = await request.json();
      console.log(`ℹ️ [reCAPTCHA Verify API] Body ที่ได้รับ:`, { token: body.token ? `${body.token.substring(0, 15)}...` : 'ไม่มี token' });
    } catch (jsonError: any) {
      console.error("❌ [reCAPTCHA Verify API] JSON parse error:", jsonError.message);
      return NextResponse.json(
        { success: false, error: `รูปแบบ JSON ไม่ถูกต้อง: ${jsonError.message}` },
        { status: 400 }
      );
    }

    const { token } = body;
    if (!token || typeof token !== "string" || token.trim() === "") {
      console.error("❌ [reCAPTCHA Verify API] token ไม่ถูกต้องหรือขาดหาย");
      return NextResponse.json(
        { success: false, error: "กรุณาระบุโทเค็น reCAPTCHA ที่ถูกต้อง" },
        { status: 400 }
      );
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    console.log(`ℹ️ [reCAPTCHA Verify API] RECAPTCHA_SECRET_KEY: ${secretKey ? 'มี' : 'ไม่มี'}`);
    if (!secretKey) {
      console.error("❌ [reCAPTCHA Verify API] RECAPTCHA_SECRET_KEY ไม่ได้ตั้งค่า");
      return NextResponse.json(
        { success: false, error: "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง (SK)" },
        { status: 500 }
      );
    }

    const verificationUrl = "https://www.google.com/recaptcha/api/siteverify";
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });
    console.log("🔄 [reCAPTCHA Verify API] ส่งคำขอไปยัง Google reCAPTCHA API...");

    const googleResponse = await fetch(verificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    let googleRecaptchaData: RecaptchaResponseFromGoogle;
    let rawGoogleResponseText: string | null = null;

    try {
      const googleContentType = googleResponse.headers.get("content-type");
      console.log(`ℹ️ [reCAPTCHA Verify API] Google Response Content-Type: ${googleContentType}`);
      if (googleContentType && googleContentType.includes("application/json")) {
        googleRecaptchaData = await googleResponse.json();
        console.log(`ℹ️ [reCAPTCHA Verify API] การตอบกลับจาก Google:`, googleRecaptchaData);
      } else {
        rawGoogleResponseText = await googleResponse.text();
        console.error(`❌ [reCAPTCHA Verify API] การตอบกลับไม่ใช่ JSON: ${rawGoogleResponseText}`);
        googleRecaptchaData = { success: false, "error-codes": ["google-non-json-response", `status-${googleResponse.status}`] };
      }
    } catch (parseError: any) {
      console.error("❌ [reCAPTCHA Verify API] ไม่สามารถ parse การตอบกลับจาก Google:", parseError.message);
      if (!rawGoogleResponseText) {
        try {
          rawGoogleResponseText = await googleResponse.text();
        } catch (textReadError: any) {
          console.error("❌ [reCAPTCHA Verify API] ไม่สามารถอ่าน body:", textReadError.message);
          rawGoogleResponseText = "[ไม่สามารถอ่าน body ได้]";
        }
      }
      return NextResponse.json(
        { success: false, error: `การตอบกลับจาก Google ไม่ถูกต้อง: ${rawGoogleResponseText}` },
        { status: 502 }
      );
    }

    if (!googleRecaptchaData.success) {
      console.warn(`❌ [reCAPTCHA Verify API] การยืนยันล้มเหลว:`, {
        success: googleRecaptchaData.success,
        errorCodes: googleRecaptchaData["error-codes"]?.join(", ") || "ไม่ระบุ",
        hostname: googleRecaptchaData.hostname
      });
      let userFriendlyError = "การยืนยัน reCAPTCHA ล้มเหลว";
      if (googleRecaptchaData["error-codes"]?.includes("timeout-or-duplicate")) {
        userFriendlyError = "การยืนยัน reCAPTCHA หมดเวลาหรือซ้ำซ้อน กรุณาลองใหม่";
      } else if (googleRecaptchaData["error-codes"]?.includes("invalid-input-response")) {
        userFriendlyError = "โทเค็น reCAPTCHA ไม่ถูกต้อง";
      } else if (googleRecaptchaData["error-codes"]?.includes("bad-request")) {
        userFriendlyError = "คำขอ reCAPTCHA ไม่ถูกต้อง";
      }

      return NextResponse.json(
        {
          success: false,
          error: userFriendlyError,
          "error-codes": googleRecaptchaData["error-codes"] || [],
        },
        { status: 400 }
      );
    }

    console.log(`✅ [reCAPTCHA Verify API] การยืนยันสำเร็จ:`, {
      hostname: googleRecaptchaData.hostname,
      timestamp: googleRecaptchaData.challenge_ts
    });
    return NextResponse.json(
      {
        success: true,
        message: "การยืนยัน reCAPTCHA สำเร็จ",
        hostname: googleRecaptchaData.hostname,
        timestamp: googleRecaptchaData.challenge_ts
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error("❌ [reCAPTCHA Verify API] ข้อผิดพลาดที่ไม่คาดคิด:", error);
    let errorMessage = "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะตรวจสอบ reCAPTCHA";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { success: false, error: `ข้อผิดพลาดในการตรวจสอบ reCAPTCHA: ${errorMessage}` },
      { status: 500 }
    );
  }
}