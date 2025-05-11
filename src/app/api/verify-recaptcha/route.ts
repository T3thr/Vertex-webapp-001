// src/app/api/verify-recaptcha/route.ts
// API สำหรับตรวจสอบโทเค็น reCAPTCHA v2 Invisible
// ส่งคำขอไปยัง Google reCAPTCHA API เพื่อยืนยันความถูกต้องของโทเค็นที่ได้รับจาก Client

import { NextResponse } from "next/server";

// Interface สำหรับ Body ของ Request ที่ส่งมาจาก Client
interface VerifyRecaptchaRequestBody {
  token: string; // โทเค็นที่ได้จาก client-side reCAPTCHA
}

// Interface สำหรับ Response ที่ได้จาก Google reCAPTCHA API
interface RecaptchaResponseFromGoogle {
  success: boolean; // ผลการตรวจสอบ (true = ผ่าน)
  challenge_ts?: string; // Timestamp ของการ challenge (ISO format YYYY-MM-DD'T'HH:mm:ssZZ)
  hostname?: string; // Hostname ของเว็บไซต์ที่ reCAPTCHA ถูกแก้
  "error-codes"?: string[]; // รหัสข้อผิดพลาด (ถ้ามี)
  score?: number; // คะแนน (สำหรับ reCAPTCHA v3)
  action?: string; // action (สำหรับ reCAPTCHA v3)
}

export async function POST(request: Request): Promise<NextResponse> {
  console.log("🔵 [reCAPTCHA Verify API] ได้รับคำขอ..."); // Log: ได้รับคำขอ

  try {
    // ตรวจสอบ Content-Type ของ Request
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("❌ [reCAPTCHA Verify API] Content-Type ไม่ถูกต้อง:", contentType); // Log: Content-Type ไม่ถูกต้อง
      return NextResponse.json(
        { success: false, error: "คำขอต้องเป็น JSON (Invalid Content-Type)" },
        { status: 415 } // Unsupported Media Type
      );
    }

    // พยายาม Parse JSON จาก Body ของ Request
    let body: VerifyRecaptchaRequestBody;
    try {
      body = await request.json();
    } catch (jsonError: any) {
      console.error("❌ [reCAPTCHA Verify API] JSON ใน body ของคำขอไม่ถูกต้อง:", jsonError.message); // Log: JSON ไม่ถูกต้อง
      return NextResponse.json(
        { success: false, error: `รูปแบบ JSON ของคำขอไม่ถูกต้อง: ${jsonError.message}` },
        { status: 400 } // Bad Request
      );
    }

    // ดึง Token จาก Body
    const { token } = body;
    if (!token || typeof token !== "string" || token.trim() === "") {
      console.error("❌ [reCAPTCHA Verify API] ไม่มี token หรือ token ไม่ถูกต้องใน body ของคำขอ"); // Log: Token ไม่ถูกต้อง
      return NextResponse.json(
        { success: false, error: "กรุณาระบุโทเค็น reCAPTCHA ที่ถูกต้อง" },
        { status: 400 } // Bad Request
      );
    }
    // console.log("ℹ️ [reCAPTCHA Verify API] Token ที่ได้รับจาก client:", token.substring(0, 30) + "..."); // แสดง Token บางส่วนเพื่อ Debug

    // ดึง Secret Key จาก Environment Variables
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error("❌ [reCAPTCHA Verify API] RECAPTCHA_SECRET_KEY ไม่ได้ถูกตั้งค่าใน environment variables!"); // Log: Secret Key ไม่ได้ตั้งค่า
      return NextResponse.json(
        { success: false, error: "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง (SK)" },
        { status: 500 } // Internal Server Error
      );
    }

    // URL สำหรับ Verify Token กับ Google
    const verificationUrl = "https://www.google.com/recaptcha/api/siteverify";
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
      // remoteip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') // (Optional but recommended) User's IP address
    });

    console.log("🔄 [reCAPTCHA Verify API] กำลังส่งคำขอตรวจสอบ reCAPTCHA token ไปยัง Google..."); // Log: กำลังส่งคำขอไป Google
    const googleResponse = await fetch(verificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    // Parse Response จาก Google
    let googleRecaptchaData: RecaptchaResponseFromGoogle;
    let rawGoogleResponseText: string | null = null;

    try {
      const googleContentType = googleResponse.headers.get("content-type");
      if (googleContentType && googleContentType.includes("application/json")) {
        googleRecaptchaData = await googleResponse.json();
      } else {
        rawGoogleResponseText = await googleResponse.text();
        console.error(`❌ [reCAPTCHA Verify API] การตอบกลับจาก Google ไม่ใช่ JSON Content-Type: ${googleContentType}, Body: ${rawGoogleResponseText}`); // Log: Google ตอบกลับไม่ใช่ JSON
        googleRecaptchaData = { success: false, "error-codes": ["google-non-json-response", `status-${googleResponse.status}`] };
      }
    } catch (parseError: any) {
      console.error("❌ [reCAPTCHA Verify API] ไม่สามารถ parse การตอบกลับจาก Google (คาดหวัง JSON):", parseError.message); // Log: Parse JSON จาก Google ล้มเหลว
      if (!rawGoogleResponseText) {
        try { rawGoogleResponseText = await googleResponse.text(); }
        catch (textReadError: any) {
            console.error("❌ [reCAPTCHA Verify API] ไม่สามารถอ่าน body การตอบกลับจาก Google เป็น text หลัง JSON parse error:", textReadError.message); // Log: อ่าน Body จาก Google ล้มเหลว
            rawGoogleResponseText = "[ไม่สามารถอ่าน body การตอบกลับจาก Google ได้]";
        }
      }
      return NextResponse.json(
        { success: false, error: `การตอบกลับจาก Google reCAPTCHA API ไม่ถูกต้องหรือไม่ใช่ JSON: ${rawGoogleResponseText}` },
        { status: 502 } // Bad Gateway
      );
    }

    // ตรวจสอบผลลัพธ์จาก Google
    if (!googleRecaptchaData.success) {
      console.warn(
        `❌ [reCAPTCHA Verify API] การยืนยัน reCAPTCHA โดย Google ล้มเหลว: Success=${googleRecaptchaData.success}, Error Codes=${googleRecaptchaData["error-codes"]?.join(", ") || "ไม่ระบุ"}, Hostname: ${googleRecaptchaData.hostname}`
      ); // Log: Google ยืนยันล้มเหลว

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
        { status: 400 } // Bad Request จาก client ถ้า token ไม่ผ่าน
      );
    }

    // ถ้าทุกอย่างสำเร็จ
    console.log(`✅ [reCAPTCHA Verify API] โทเค็น reCAPTCHA ได้รับการยืนยันสำเร็จโดย Google Hostname: ${googleRecaptchaData.hostname}, Timestamp: ${googleRecaptchaData.challenge_ts}`); // Log: Google ยืนยันสำเร็จ
    return NextResponse.json(
      { success: true, message: "การยืนยัน reCAPTCHA สำเร็จ" },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error("❌ [reCAPTCHA Verify API] เกิดข้อผิดพลาดที่ไม่คาดคิดใน POST handler:", error); // Log: ข้อผิดพลาดที่ไม่คาดคิด
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