// src/app/api/auth/verify-recaptcha/route.ts

import { NextResponse } from "next/server";

// ประเภทสำหรับ Request Body
interface VerifyRecaptchaRequestBody {
  token: string;
}

// ประเภทสำหรับ Response จาก Google reCAPTCHA API
interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as VerifyRecaptchaRequestBody;
    const { token } = body;

    // ตรวจสอบว่าได้รับโ VITAMIN_TOKEN หรือไม่
    if (!token) {
      console.error('❌ ไม่ได้รับโทเค็น reCAPTCHA');
      return NextResponse.json(
        { error: 'กรุณายืนยัน reCAPTCHA' },
        { status: 400 }
      );
    }

    // ส่งคำขอไปยัง Google reCAPTCHA API
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY!,
        response: token,
      }).toString(),
    });

    const data: RecaptchaResponse = await response.json();

    if (!data.success || (data.score && data.score < 0.5)) {
      console.error(`❌ การยืนยัน reCAPTCHA ล้มเหลว: ${JSON.stringify(data)}`);
      return NextResponse.json(
        { error: 'การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่' },
        { status: 400 }
      );
    }

    console.log(`✅ การยืนยัน reCAPTCHA สำเร็จ: score=${data.score}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('❌ เกิดข้อผิดพลาดในการยืนยัน reCAPTCHA:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยืนยัน reCAPTCHA' },
      { status: 500 }
    );
  }
}