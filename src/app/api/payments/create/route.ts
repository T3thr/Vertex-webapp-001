// src/app/api/payments/create/route.ts
// API endpoint สำหรับสร้างรายการชำระเงิน

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import { z } from "zod";
import PaymentGatewayService from "@/backend/services/PaymentGatewayService";

// Schema สำหรับตรวจสอบข้อมูลขาเข้า
const createPaymentSchema = z.object({
  amount: z.number().min(1).max(100000),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. ตรวจสอบการยืนยันตัวตนของผู้ใช้
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" },
        { status: 401 }
      );
    }

    // 2. เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // 3. ตรวจสอบและแปลงข้อมูลขาเข้า
    let requestData;
    try {
      requestData = await req.json();
      const validatedData = createPaymentSchema.parse(requestData);
      requestData = validatedData;
    } catch (error: any) {
      console.error("❌ [API Create Payment] Invalid request data:", error);
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ถูกต้อง", details: error.errors },
        { status: 400 }
      );
    }

    // 4. สร้าง QR Code สำหรับการชำระเงิน
    const result = await PaymentGatewayService.createQRPayment({
      userId: session.user.id,
      amount: requestData.amount,
      description: requestData.description,
      metadata: requestData.metadata,
    });

    // 5. ตรวจสอบผลลัพธ์และส่งกลับ
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "ไม่สามารถสร้าง QR Code ได้" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      qrData: result.qrData,
      expiresAt: result.expiresAt,
      amount: result.amount,
      reference: result.reference,
    });
  } catch (error: any) {
    console.error("❌ [API Create Payment] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน" },
      { status: 500 }
    );
  }
}
