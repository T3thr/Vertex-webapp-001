// src/app/api/user/wallet/topup/checkout/route.ts
// API endpoint สำหรับสร้าง Stripe Checkout Session เพื่อเติมเหรียญ

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import { z } from "zod";
import PaymentGatewayService from '@/backend/services/PaymentGatewayService';

// Schema สำหรับตรวจสอบข้อมูลขาเข้า
const checkoutSessionSchema = z.object({
  amount: z.number().min(1).max(100000), // จำนวนเงินที่ชำระ (บาท)
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. ตรวจสอบการยืนยันตัวตนของผู้ใช้
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
    }

    // 2. เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // 3. ตรวจสอบและแปลงข้อมูลขาเข้า
    let requestData;
    try {
      requestData = await req.json();
      const validatedData = checkoutSessionSchema.parse(requestData);
      requestData = validatedData;
    } catch (error: any) {
      console.error("❌ [API Stripe Checkout] Invalid request data:", error);
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ถูกต้อง", details: error.errors },
        { status: 400 }
      );
    }

    // 4. สร้าง Stripe Checkout Session ผ่าน PaymentGatewayService
    const result = await PaymentGatewayService.createCheckoutSession({
      userId: session.user.id,
      amount: requestData.amount,
      description: requestData.description,
      metadata: requestData.metadata,
      successUrl: requestData.successUrl,
      cancelUrl: requestData.cancelUrl,
    });

    // 5. ตรวจสอบผลลัพธ์และส่งกลับ
    if (!result.sessionId || !result.url) {
      throw new Error('ไม่สามารถสร้าง Stripe Checkout Session ได้');
    }

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      url: result.url,
      paymentId: result.paymentId,
    });

  } catch (error: any) {
    console.error("❌ [API Stripe Checkout] Unexpected error:", error);
    return NextResponse.json({ success: false, error: error.message || 'เกิดข้อผิดพลาดในการสร้าง Stripe Checkout Session' }, { status: 500 });
  }
}