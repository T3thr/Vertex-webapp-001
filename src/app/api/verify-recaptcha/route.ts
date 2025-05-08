// src/app/api/auth/verify-recaptcha/route.ts

import { NextResponse } from "next/server";
import { headers } from "next/headers";

// ประเภทสำหรับ Request Body
interface VerifyRecaptchaRequestBody {
  token: string;
}

// ประเภทสำหรับ Response จาก Google reCAPTCHA API
interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  // สำหรับ reCAPTCHA v2 Invisible ไม่มี score แต่จะมีการตอบกลับสถานะ success
  "error-codes"?: string[];
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // กำหนดเวลาหมดเวลาสำหรับการเรียก API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 วินาที
    
    const body = await request.json() as VerifyRecaptchaRequestBody;
    const { token } = body;

    // ตรวจสอบว่าได้รับโทเค็นหรือไม่
    if (!token) {
      console.error('❌ ไม่ได้รับโทเค็น reCAPTCHA');
      return NextResponse.json(
        { error: 'กรุณายืนยัน reCAPTCHA' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีคีย์ลับหรือไม่
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error('❌ ไม่พบ RECAPTCHA_SECRET_KEY');
      return NextResponse.json(
        { error: 'การกำหนดค่าเซิร์ฟเวอร์ไม่ถูกต้อง' },
        { status: 500 }
      );
    }

    // ดึง IP address ของผู้ใช้ (ถ้ามี) สำหรับการยืนยันเพิ่มเติม
    const headersList = await headers();
    const remoteIp = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') ||
                     'unknown';

    // สร้างพารามิเตอร์สำหรับการยืนยัน reCAPTCHA v2 Invisible
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: remoteIp
    });

    // ส่งคำขอไปยัง Google reCAPTCHA API พร้อมกำหนดเวลาหมดเวลา
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: controller.signal
    });

    clearTimeout(timeoutId); // ยกเลิกการนับเวลาหมดเวลา

    if (!response.ok) {
      console.error(`❌ API Google reCAPTCHA ตอบกลับด้วยสถานะ: ${response.status}`);
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการตรวจสอบกับ Google reCAPTCHA API' },
        { status: 502 }
      );
    }

    const data: RecaptchaResponse = await response.json();

    // ตรวจสอบผลลัพธ์
    if (!data.success) {
      const errorCodes = data["error-codes"] || ["unknown-error"];
      console.error(`❌ การยืนยัน reCAPTCHA v2 Invisible ล้มเหลว: ${JSON.stringify(data)}`);
      
      // ส่งข้อความข้อผิดพลาดที่เหมาะสมตาม error code
      let errorMessage = 'การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่';
      
      if (errorCodes.includes('missing-input-secret')) {
        errorMessage = 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์: ไม่พบ secret key';
      } else if (errorCodes.includes('invalid-input-secret')) {
        errorMessage = 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์: secret key ไม่ถูกต้อง';
      } else if (errorCodes.includes('missing-input-response')) {
        errorMessage = 'กรุณายืนยัน reCAPTCHA อีกครั้ง';
      } else if (errorCodes.includes('invalid-input-response')) {
        errorMessage = 'โทเค็น reCAPTCHA ไม่ถูกต้อง กรุณาลองใหม่';
      } else if (errorCodes.includes('bad-request')) {
        errorMessage = 'คำขอไม่ถูกต้อง กรุณาลองใหม่';
      } else if (errorCodes.includes('timeout-or-duplicate')) {
        errorMessage = 'โทเค็น reCAPTCHA หมดอายุหรือถูกใช้ไปแล้ว กรุณาลองใหม่';
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? errorCodes : undefined 
        },
        { status: 400 }
      );
    }

    // บันทึกข้อมูลเพิ่มเติม (เฉพาะในโหมด development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ การยืนยัน reCAPTCHA v2 Invisible สำเร็จ: `, {
        timestamp: data.challenge_ts,
        hostname: data.hostname
      });
    } else {
      console.log(`✅ การยืนยัน reCAPTCHA v2 Invisible สำเร็จ`);
    }

    return NextResponse.json(
      { 
        success: true,
        timestamp: data.challenge_ts,
        hostname: data.hostname
      }, 
      { status: 200 }
    );
  } catch (error: unknown) {
    // จัดการกรณี timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('❌ การยืนยัน reCAPTCHA หมดเวลา');
      return NextResponse.json(
        { error: 'การยืนยัน reCAPTCHA หมดเวลา กรุณาลองใหม่' },
        { status: 408 }
      );
    }
    
    // จัดการข้อผิดพลาดทั่วไป
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
    console.error('❌ เกิดข้อผิดพลาดในการยืนยัน reCAPTCHA:', error);
    
    return NextResponse.json(
      { 
        error: 'เกิดข้อผิดพลาดในการยืนยัน reCAPTCHA',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      },
      { status: 500 }
    );
  }
}