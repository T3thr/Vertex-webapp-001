// src/app/api/verify-recaptcha/route.ts
// API สำหรับตรวจสอบโทเค็น reCAPTCHA v2 Invisible
// ส่งคำขอไปยัง Google reCAPTCHA API เพื่อยืนยันความถูกต้องของโทเค็น
// อัปเดต: เพิ่ม console log สำหรับการ debug และการจัดการ error ที่ครอบคลุม

// หมายเหตุสำคัญ: ตามการแก้ไขปัญหา reCAPTCHA token ทับซ้อนในขั้นตอนการสมัครสมาชิก (AuthModal.tsx),
// API route นี้ไม่ได้ถูกเรียกใช้งานจาก AuthModal.tsx ในขั้นตอนการสมัครสมาชิกอีกต่อไป
// การตรวจสอบ reCAPTCHA สำหรับการสมัครสมาชิกจะเกิดขึ้นเพียงครั้งเดียวที่ /api/auth/signup/route.ts
// หาก API route นี้ (/api/verify-recaptcha) ไม่ได้ถูกใช้งานจากส่วนอื่นของแอปพลิเคชัน
// สามารถพิจารณาลบออกได้

import { NextResponse } from "next/server";

interface VerifyRecaptchaRequestBody {
  token: string;
}

interface RecaptchaResponseFromGoogle {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  score?: number; // สำหรับ reCAPTCHA v3
  action?: string; // สำหรับ reCAPTCHA v3
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
      // สามารถเพิ่ม remoteip ของผู้ใช้ได้ที่นี่ หากต้องการ (request.ip)
      // remoteip: request.ip // ตัวอย่าง, การเข้าถึง IP อาจขึ้นกับ environment (Vercel, Node.js)
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
        console.error(`❌ [reCAPTCHA Verify API] การตอบกลับไม่ใช่ JSON (Status: ${googleResponse.status}): ${rawGoogleResponseText}`);
        // กำหนดโครงสร้าง error ให้สอดคล้องกับการ parse ล้มเหลว
        googleRecaptchaData = { success: false, "error-codes": ["google-non-json-response", `status-${googleResponse.status}`] };
      }
    } catch (parseError: any) {
      console.error("❌ [reCAPTCHA Verify API] ไม่สามารถ parse การตอบกลับจาก Google:", parseError.message);
      if (!rawGoogleResponseText) { // พยายามอ่าน text อีกครั้งถ้ายังไม่ได้ทำ
        try {
          // การเรียก googleResponse.text() ซ้ำอาจมีปัญหาถ้า stream ถูกอ่านไปแล้ว
          // ควรจะอ่าน text() เพียงครั้งเดียว
          // อย่างไรก็ตาม ในกรณีนี้ googleResponse.json() ล้มเหลว อาจจะยังอ่าน text() ได้
          rawGoogleResponseText = await googleResponse.text(); // อาจจะ error ถ้า body ถูก consume ไปแล้ว
        } catch (textReadError: any) {
          console.error("❌ [reCAPTCHA Verify API] ไม่สามารถอ่าน body ของการตอบกลับจาก Google (หลัง parse error):", textReadError.message);
          rawGoogleResponseText = "[ไม่สามารถอ่าน body ของการตอบกลับได้]";
        }
      }
      return NextResponse.json(
        { success: false, error: `การตอบกลับจาก Google ไม่ถูกต้อง หรือไม่สามารถประมวลผลได้: ${rawGoogleResponseText}` },
        { status: 502 } // Bad Gateway - ปัญหาในการสื่อสารกับ Google
      );
    }

    if (!googleRecaptchaData.success) {
      console.warn(`❌ [reCAPTCHA Verify API] การยืนยัน reCAPTCHA ล้มเหลวจาก Google:`, {
        success: googleRecaptchaData.success,
        errorCodes: googleRecaptchaData["error-codes"]?.join(", ") || "ไม่ระบุ",
        hostname: googleRecaptchaData.hostname,
        // score: googleRecaptchaData.score, (สำหรับ v3)
        // action: googleRecaptchaData.action, (สำหรับ v3)
      });
      let userFriendlyError = "การยืนยัน reCAPTCHA ล้มเหลว";
      // จัดการ error codes จาก Google reCAPTCHA
      if (googleRecaptchaData["error-codes"]?.includes("missing-input-secret")) {
        userFriendlyError = "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง (Secret Key ขาดหาย)";
      } else if (googleRecaptchaData["error-codes"]?.includes("invalid-input-secret")) {
        userFriendlyError = "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง (Secret Key ไม่ถูกต้อง)";
      } else if (googleRecaptchaData["error-codes"]?.includes("missing-input-response")) {
        userFriendlyError = "โทเค็น reCAPTCHA ขาดหายหรือไม่ถูกส่งมา";
      } else if (googleRecaptchaData["error-codes"]?.includes("invalid-input-response")) {
        userFriendlyError = "โทเค็น reCAPTCHA ไม่ถูกต้องหรือหมดอายุ";
      } else if (googleRecaptchaData["error-codes"]?.includes("bad-request")) {
        userFriendlyError = "คำขอ reCAPTCHA ไม่ถูกต้อง หรือรูปแบบไม่สมบูรณ์";
      } else if (googleRecaptchaData["error-codes"]?.includes("timeout-or-duplicate")) {
        userFriendlyError = "การยืนยัน reCAPTCHA หมดเวลาหรือซ้ำซ้อน กรุณาลองใหม่";
      }

      return NextResponse.json(
        {
          success: false,
          error: userFriendlyError,
          "error-codes": googleRecaptchaData["error-codes"] || [],
        },
        // ใช้ status code ที่เหมาะสมกับ error จาก Google
        // 400 สำหรับ client-side errors (เช่น invalid token)
        // 500 สำหรับ server-side errors (เช่น config ผิด)
        { status: googleRecaptchaData["error-codes"]?.some(code => code.includes("secret")) ? 500 : 400 }
      );
    }

    // สำหรับ reCAPTCHA v2 (Invisible/Checkbox), `score` และ `action` จะไม่มี
    // การตรวจสอบ hostname และ challenge_ts สามารถทำได้เพื่อเพิ่มความปลอดภัย
    // if (googleRecaptchaData.hostname !== process.env.EXPECTED_HOSTNAME) {
    //   console.error("❌ [reCAPTCHA Verify API] Hostname ไม่ตรงกัน");
    //   return NextResponse.json({ success: false, error: "การยืนยันล้มเหลว (Hostname mismatch)" }, { status: 400 });
    // }

    console.log(`✅ [reCAPTCHA Verify API] การยืนยัน reCAPTCHA สำเร็จ:`, {
      hostname: googleRecaptchaData.hostname,
      timestamp: googleRecaptchaData.challenge_ts
    });
    return NextResponse.json(
      {
        success: true,
        message: "การยืนยัน reCAPTCHA สำเร็จ",
        hostname: googleRecaptchaData.hostname,
        timestamp: googleRecaptchaData.challenge_ts
        // score: googleRecaptchaData.score, (สำหรับ v3)
        // action: googleRecaptchaData.action, (สำหรับ v3)
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error("❌ [reCAPTCHA Verify API] ข้อผิดพลาดที่ไม่คาดคิดใน API:", error);
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