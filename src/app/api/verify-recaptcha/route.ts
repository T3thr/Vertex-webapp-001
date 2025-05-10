// src/app/api/verify-recaptcha/route.ts
// API สำหรับตรวจสอบโทเค็น reCAPTCHA v2 Invisible
// ส่งคำขอไปยัง Google reCAPTCHA API เพื่อยืนยันความถูกต้องของโทเค็น

import { NextResponse } from "next/server";

interface VerifyRecaptchaRequestBody {
  token: string; // โทเค็นที่ได้จาก client-side reCAPTCHA
}

interface RecaptchaResponseFromGoogle {
  success: boolean;
  challenge_ts?: string; // Timestamp of the challenge load (ISO format yyyy-MM-dd'T'HH:mm:ssZZ)
  hostname?: string;     // The hostname of the site where the reCAPTCHA was solved
  "error-codes"?: string[]; // Optional: https://developers.google.com/recaptcha/docs/verify#error_code_reference
  score?: number; // For v3
  action?: string; // For v3
}

export async function POST(request: Request): Promise<NextResponse> {
  console.log("🔵 [reCAPTCHA Verify API] ได้รับคำขอ...");
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("❌ [reCAPTCHA Verify API] Content-Type ไม่ถูกต้อง:", contentType);
      return NextResponse.json(
        { success: false, error: "คำขอต้องเป็น JSON (Invalid Content-Type)" },
        { status: 415 } // Unsupported Media Type
      );
    }

    let body: VerifyRecaptchaRequestBody;
    try {
      body = await request.json();
    } catch (jsonError: any) {
      console.error("❌ [reCAPTCHA Verify API] JSON ใน body ของคำขอไม่ถูกต้อง:", jsonError.message);
      return NextResponse.json(
        { success: false, error: `รูปแบบ JSON ของคำขอไม่ถูกต้อง: ${jsonError.message}` },
        { status: 400 } // Bad Request
      );
    }

    const { token } = body;
    if (!token || typeof token !== "string" || token.trim() === "") {
      console.error("❌ [reCAPTCHA Verify API] ไม่มี token หรือ token ไม่ถูกต้องใน body ของคำขอ");
      return NextResponse.json(
        { success: false, error: "กรุณาระบุโทเค็น reCAPTCHA ที่ถูกต้อง" },
        { status: 400 } // Bad Request
      );
    }
    // console.log("ℹ️ [reCAPTCHA Verify API] Token ที่ได้รับจาก client:", token.substring(0, 30) + "..."); // แสดง token บางส่วนเพื่อ debug

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error("❌ [reCAPTCHA Verify API] RECAPTCHA_SECRET_KEY ไม่ได้ถูกตั้งค่าใน environment variables!");
      return NextResponse.json(
        { success: false, error: "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง (SK)" },
        { status: 500 } // Internal Server Error
      );
    }

    const verificationUrl = "https://www.google.com/recaptcha/api/siteverify";
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
      // remoteip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') // (Optional but recommended) User's IP address
    });

    console.log("🔄 [reCAPTCHA Verify API] กำลังส่งคำขอตรวจสอบ reCAPTCHA token ไปยัง Google...");
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
      if (googleContentType && googleContentType.includes("application/json")) {
        googleRecaptchaData = await googleResponse.json();
      } else {
        rawGoogleResponseText = await googleResponse.text();
        console.error(`❌ [reCAPTCHA Verify API] การตอบกลับจาก Google ไม่ใช่ JSON Content-Type: ${googleContentType}, Body: ${rawGoogleResponseText}`);
        googleRecaptchaData = { success: false, "error-codes": ["google-non-json-response", `status-${googleResponse.status}`] };
      }
    } catch (parseError: any) {
      console.error("❌ [reCAPTCHA Verify API] ไม่สามารถ parse การตอบกลับจาก Google (คาดหวัง JSON):", parseError.message);
      if (!rawGoogleResponseText) {
        try {
          rawGoogleResponseText = await googleResponse.text();
        } catch (textReadError: any) {
            console.error("❌ [reCAPTCHA Verify API] ไม่สามารถอ่าน body การตอบกลับจาก Google เป็น text หลัง JSON parse error:", textReadError.message);
          rawGoogleResponseText = "[ไม่สามารถอ่าน body การตอบกลับจาก Google ได้]";
        }
      }
      return NextResponse.json(
        { success: false, error: `การตอบกลับจาก Google reCAPTCHA API ไม่ถูกต้องหรือไม่ใช่ JSON: ${rawGoogleResponseText}` },
        { status: 502 } // Bad Gateway
      );
    }

    if (!googleRecaptchaData.success) {
      console.warn(
        `❌ [reCAPTCHA Verify API] การยืนยัน reCAPTCHA โดย Google ล้มเหลว: Success=${googleRecaptchaData.success}, Error Codes=${googleRecaptchaData["error-codes"]?.join(", ") || "ไม่ระบุ"}, Hostname: ${googleRecaptchaData.hostname}`
      );
      // จัดการ error codes ที่เฉพาะเจาะจงจาก Google
      let userFriendlyError = "การยืนยัน reCAPTCHA โดย Google ล้มเหลว";
      if (googleRecaptchaData["error-codes"]?.includes("timeout-or-duplicate")) {
          userFriendlyError = "การยืนยัน reCAPTCHA หมดเวลาหรือซ้ำซ้อน กรุณาลองใหม่";
      } else if (googleRecaptchaData["error-codes"]?.includes("invalid-input-response")) {
          userFriendlyError = "โทเค็น reCAPTCHA ไม่ถูกต้องหรือไม่สมบูรณ์";
      } else if (googleRecaptchaData["error-codes"]?.includes("bad-request")) {
           userFriendlyError = "คำขอ reCAPTCHA ไม่ถูกต้อง";
      }

      return NextResponse.json(
        {
          success: false,
          error: userFriendlyError,
          "error-codes": googleRecaptchaData["error-codes"] || [],
        },
        { status: 400 } // Bad Request จาก client ถ้า token ไม่ผ่าน, หรือ status จาก Google ถ้าเป็นปัญหาอื่น
      );
    }

    // ถ้าทุกอย่างสำเร็จ
    console.log(`✅ [reCAPTCHA Verify API] โทเค็น reCAPTCHA ได้รับการยืนยันสำเร็จโดย Google Hostname: ${googleRecaptchaData.hostname}, Timestamp: ${googleRecaptchaData.challenge_ts}`);
    return NextResponse.json(
      { success: true, message: "การยืนยัน reCAPTCHA สำเร็จ" },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error("❌ [reCAPTCHA Verify API] เกิดข้อผิดพลาดที่ไม่คาดคิดใน POST handler:", error);
    let errorMessage = "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะตรวจสอบ reCAPTCHA";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json(
      {
        success: false,
        error: "เกิดข้อผิดพลาดที่ไม่คาดคิดในการตรวจสอบ reCAPTCHA: " + errorMessage,
      },
      { status: 500 } // Internal Server Error
    );
  }
}