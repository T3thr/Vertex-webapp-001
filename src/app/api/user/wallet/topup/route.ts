// src/app/api/user/wallet/topup/route.ts
// API endpoint สำหรับเติมเหรียญ

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import { z } from "zod";
import CoinTopupService from "@/backend/services/CoinTopupService";

// Schema สำหรับตรวจสอบข้อมูลขาเข้า
const coinTopupSchema = z.object({
  amount: z.number().int().min(1).max(10000),
  paymentAmount: z.number().min(1).max(100000),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Schema สำหรับตรวจสอบข้อมูลการจำลองการชำระเงิน (สำหรับการทดสอบเท่านั้น)
const simulatePaymentSchema = z.object({
  paymentId: z.string().min(1),
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
      const validatedData = coinTopupSchema.parse(requestData);
      requestData = validatedData;
    } catch (error: any) {
      console.error("❌ [API Coin Topup] Invalid request data:", error);
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ถูกต้อง", details: error.errors },
        { status: 400 }
      );
    }

    // 4. สร้างรายการเติมเหรียญและ QR Code
    const result = await CoinTopupService.createCoinTopup({
      userId: session.user.id,
      amount: requestData.amount,
      paymentAmount: requestData.paymentAmount,
      description: requestData.description,
      metadata: requestData.metadata,
    });

    // 5. ตรวจสอบผลลัพธ์และส่งกลับ
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "ไม่สามารถสร้างรายการเติมเหรียญได้" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      qrData: result.qrData,
      expiresAt: result.expiresAt,
      amount: result.amount,
      paymentAmount: result.paymentAmount,
      reference: result.reference,
    });
  } catch (error: any) {
    console.error("❌ [API Coin Topup] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการสร้างรายการเติมเหรียญ" },
      { status: 500 }
    );
  }
}

// API endpoint สำหรับตรวจสอบสถานะการเติมเหรียญ
export async function GET(req: NextRequest) {
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

    // 3. ดึงข้อมูล paymentId จาก URL query
    const searchParams = req.nextUrl.searchParams;
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรหัสรายการชำระเงิน" },
        { status: 400 }
      );
    }

    // 4. ตรวจสอบสถานะการเติมเหรียญ
    const status = await CoinTopupService.checkTopupStatus(paymentId);
    if (!status) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลรายการเติมเหรียญ" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status: status.status,
      processed: status.processed,
      coinAmount: status.coinAmount,
      paymentAmount: status.paymentAmount,
    });
  } catch (error: any) {
    console.error("❌ [API Check Topup Status] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการตรวจสอบสถานะการเติมเหรียญ" },
      { status: 500 }
    );
  }
}

// API endpoint สำหรับจำลองการชำระเงินสำเร็จ (สำหรับการทดสอบเท่านั้น)
export async function PATCH(req: NextRequest) {
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
      const validatedData = simulatePaymentSchema.parse(requestData);
      requestData = validatedData;
    } catch (error: any) {
      console.error("❌ [API Simulate Payment] Invalid request data:", error);
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ถูกต้อง", details: error.errors },
        { status: 400 }
      );
    }

    // 4. จำลองการชำระเงินสำเร็จ
    const result = await CoinTopupService.simulateSuccessfulTopup(requestData.paymentId);

    // 5. ตรวจสอบผลลัพธ์และส่งกลับ
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "ไม่สามารถจำลองการชำระเงินได้" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: result.userId,
      coinAmount: result.coinAmount,
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    console.error("❌ [API Simulate Payment] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการจำลองการชำระเงิน" },
      { status: 500 }
    );
  }
}
