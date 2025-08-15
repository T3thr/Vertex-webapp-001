// src/app/api/payments/webhook/route.ts
// API endpoint สำหรับรับ webhook จาก payment gateway

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import PaymentGatewayService from "@/backend/services/PaymentGatewayService";
import CoinTopupService from "@/backend/services/CoinTopupService";
import { PaymentStatus } from "@/backend/models/Payment";

// ในระบบจริงควรมีการตรวจสอบ signature หรือ token เพื่อยืนยันว่า webhook มาจาก payment gateway จริง
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "test_webhook_secret";

export async function POST(req: NextRequest) {
  try {
    // 1. ตรวจสอบ webhook signature (ในระบบจริง)
    const signature = req.headers.get("x-webhook-signature");
    if (!signature || signature !== WEBHOOK_SECRET) {
      console.warn("⚠️ [Payment Webhook] Invalid signature");
      // ในสภาพแวดล้อมจริง ควรส่งรหัส 401 หรือ 403 แต่บาง payment gateway ต้องการ 200 เสมอ
      // เพื่อป้องกันการส่ง webhook ซ้ำ จึงส่ง 200 แต่ไม่ประมวลผลข้อมูล
      return NextResponse.json({ success: false, error: "Invalid signature" });
    }

    // 2. เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // 3. แปลงข้อมูล webhook
    let webhookData;
    try {
      webhookData = await req.json();
    } catch (error) {
      console.error("❌ [Payment Webhook] Invalid JSON:", error);
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    // 4. ตรวจสอบข้อมูลที่จำเป็น
    const { paymentId, status, transactionId } = webhookData;
    if (!paymentId || !status) {
      console.error("❌ [Payment Webhook] Missing required fields:", webhookData);
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 5. แปลงสถานะการชำระเงินจาก payment gateway เป็นสถานะในระบบ
    let paymentStatus: PaymentStatus;
    switch (status) {
      case "success":
      case "completed":
      case "paid":
        paymentStatus = PaymentStatus.SUCCEEDED;
        break;
      case "pending":
      case "waiting":
        paymentStatus = PaymentStatus.PENDING;
        break;
      case "failed":
      case "error":
        paymentStatus = PaymentStatus.FAILED;
        break;
      case "refunded":
        paymentStatus = PaymentStatus.REFUNDED;
        break;
      case "cancelled":
      case "canceled":
        paymentStatus = PaymentStatus.CANCELLED;
        break;
      default:
        paymentStatus = PaymentStatus.PENDING;
    }

    // 6. อัปเดตสถานะการชำระเงิน
    const confirmResult = await PaymentGatewayService.confirmPayment({
      paymentId,
      status: paymentStatus,
      transactionId,
      paidAt: new Date(),
      amount: webhookData.amount,
      fee: webhookData.fee
    });

    if (!confirmResult) {
      console.error("❌ [Payment Webhook] Failed to confirm payment:", paymentId);
      return NextResponse.json(
        { success: false, error: "Failed to confirm payment" },
        { status: 500 }
      );
    }

    // 7. ถ้าการชำระเงินสำเร็จและเป็นการเติมเหรียญ ให้ประมวลผลการเติมเหรียญ
    if (paymentStatus === PaymentStatus.SUCCEEDED && webhookData.metadata?.topupType === "coin") {
      const topupResult = await CoinTopupService.processCoinTopup(paymentId);
      if (!topupResult.success) {
        console.error("❌ [Payment Webhook] Failed to process coin topup:", topupResult.error);
        // ไม่ส่งข้อผิดพลาดกลับไปยัง payment gateway เพราะการชำระเงินสำเร็จแล้ว
        // แต่บันทึกข้อผิดพลาดไว้เพื่อตรวจสอบและแก้ไขภายหลัง
      }
    }

    // 8. ส่งผลลัพธ์กลับไปยัง payment gateway
    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully"
    });
  } catch (error: any) {
    console.error("❌ [Payment Webhook] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
