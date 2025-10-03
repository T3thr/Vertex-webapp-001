// src/app/api/payments/webhook/route.ts
// API endpoint สำหรับรับ webhook จาก payment gateway

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import PaymentGatewayService from "@/backend/services/PaymentGatewayService";
import CoinTopupService from "@/backend/services/CoinTopupService";
import PaymentModel, { PaymentStatus } from "@/backend/models/Payment";
import Stripe from 'stripe';

// ใช้ webhook secret จาก Stripe CLI หรือ Stripe Dashboard
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || "test_webhook_secret";

// สร้าง Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15' as any, // ใช้ API version ที่ Stripe รองรับ และใช้ type assertion เพื่อแก้ปัญหา TypeScript
});

export async function POST(req: NextRequest) {
  try {
    // 1. ตรวจสอบ webhook signature จาก Stripe
    const payload = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      console.warn("⚠️ [Payment Webhook] Missing Stripe signature");
      return NextResponse.json({ success: false, error: "Missing signature" }, { status: 400 });
    }
    
    let event;
    try {
      // ตรวจสอบ signature เพื่อยืนยันว่า webhook มาจาก Stripe จริง
      event = stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
    } catch (err: any) {
      console.error(`⚠️ [Payment Webhook] Invalid signature: ${err.message}`);
      return NextResponse.json({ success: false, error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // 2. เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // 3. ประมวลผลตามประเภทของ event
    console.log(`🔔 [Payment Webhook] Processing event: ${event.type}`);
    
    let paymentId: string | undefined;
    let paymentStatus: PaymentStatus;
    let transactionId: string | undefined;
    let amount: number | undefined;
    
    // จัดการกับ event ตามประเภท
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      console.log(`💰 [Payment Webhook] PaymentIntent succeeded: ${paymentIntent.id}`);
      
      // ค้นหา payment ในระบบของเราที่เชื่อมโยงกับ paymentIntent นี้
      const payment = await PaymentModel.findOne({
        'gatewayDetails.paymentIntentId': paymentIntent.id
      });
      
      if (!payment) {
        console.error(`❌ [Payment Webhook] Payment not found for PaymentIntent: ${paymentIntent.id}`);
        return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
      }
      
      paymentId = payment._id.toString();
      paymentStatus = PaymentStatus.SUCCEEDED;
      transactionId = paymentIntent.id;
      amount = paymentIntent.amount / 100; // แปลงจากสตางค์เป็นบาท
      
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      console.log(`❌ [Payment Webhook] PaymentIntent failed: ${paymentIntent.id}`);
      
      const payment = await PaymentModel.findOne({
        'gatewayDetails.paymentIntentId': paymentIntent.id
      });
      
      if (!payment) {
        console.error(`❌ [Payment Webhook] Payment not found for failed PaymentIntent: ${paymentIntent.id}`);
        return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
      }
      
      paymentId = payment._id.toString();
      paymentStatus = PaymentStatus.FAILED;
      transactionId = paymentIntent.id;
      
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const paymentIntentId = session.payment_intent;
      const sessionId = session.id;
      const amountTotal = session.amount_total ? session.amount_total / 100 : undefined;
      const customerEmail = session.customer_details?.email;
      console.log(`[Webhook] Checkout session completed: session.id=${sessionId}, paymentIntent=${paymentIntentId}, email=${customerEmail}`);
      console.log('[Webhook] Session object:', JSON.stringify(session, null, 2));

      // 1. ค้นหา Payment ด้วย sessionId ก่อน
      let payment = await PaymentModel.findOne({
        'gatewayDetails.sessionId': sessionId
      });
      // 2. ถ้าไม่เจอ ลองค้นหาด้วย paymentIntentId (fallback)
      if (!payment && paymentIntentId) {
        payment = await PaymentModel.findOne({
          'gatewayDetails.paymentIntentId': paymentIntentId
        });
      }
      if (!payment) {
        console.error(`[Webhook] Payment not found for Checkout Session: ${sessionId}, paymentIntent: ${paymentIntentId}`);
        return NextResponse.json({ success: false, error: 'Payment not found', debug: { paymentIntentId, sessionId, email: customerEmail } }, { status: 404 });
      }
      // 3. อัปเดต paymentIntentId และ transactionId ใน Payment record ถ้ายังไม่มี
      // เราจะทำการอัปเดตฟิลด์เหล่านี้ใน Payment object และบันทึกทีเดียวหลังจากที่ตรวจสอบและตั้งค่าทั้งหมดแล้ว
      let shouldSavePayment = false;

      if (paymentIntentId) {
        if (!payment.gatewayDetails.paymentIntentId) {
          payment.gatewayDetails.paymentIntentId = paymentIntentId;
          shouldSavePayment = true;
        }
        if (!payment.gatewayDetails.transactionId) {
          payment.gatewayDetails.transactionId = paymentIntentId; // ใช้ paymentIntentId เป็น transactionId
          shouldSavePayment = true;
        }
      }
      if (shouldSavePayment) {
        await payment.save();
      }

      // ดึง payment ใหม่ (optional แต่ปลอดภัย)
      const updatedPayment = await PaymentModel.findById(payment._id);
      if (!updatedPayment) {
        console.error(`[Webhook] Updated payment not found after save: ${payment._id}`);
        return NextResponse.json({ success: false, error: 'Updated payment not found' }, { status: 404 });
      }

      paymentId = updatedPayment._id.toString();
      paymentStatus = PaymentStatus.SUCCEEDED;
      transactionId = paymentIntentId;
      amount = amountTotal;

      // 4. อัปเดตสถานะการชำระเงิน
      const confirmResult = await PaymentGatewayService.confirmPayment({
        paymentId,
        status: paymentStatus,
        transactionId,
        paidAt: new Date(),
        amount
      });

      if (!confirmResult) {
        console.error(`❌ [Payment Webhook] Failed to confirm payment: ${paymentId}`);
        return NextResponse.json(
          { success: false, error: "Failed to confirm payment" },
          { status: 500 }
        );
      }

      // 5. เติมเหรียญ
      if (paymentStatus === PaymentStatus.SUCCEEDED) {
        const payment = await PaymentModel.findById(paymentId);
        console.log('[Webhook] Payment object for topup check:', {
          paymentId,
          paymentForType: payment?.paymentForType,
          status: payment?.status,
          userId: payment?.userId,
          amount: payment?.amount
        });
        
        if (payment && payment.paymentForType === 'coin_topup') {
          console.log(`[Webhook] Processing coin topup for payment: ${paymentId}`);
          const topupResult = await CoinTopupService.processCoinTopup(paymentId);
          if (!topupResult.success) {
            console.error(`[Webhook] Failed to process coin topup: ${topupResult.error}`);
          } else {
            console.log(`[Webhook] Coin topup processed successfully: ${topupResult.coinAmount} coins added`);
          }
        } else {
          console.warn('[Webhook] Not a coin_topup payment, skip topup logic.', {
            paymentForType: payment?.paymentForType,
            paymentExists: !!payment
          });
        }
      }
    } else {
      // ประเภท event อื่นๆ ที่ไม่ได้จัดการ
      console.log(`ℹ️ [Payment Webhook] Unhandled event type: ${event.type}`);
      return NextResponse.json({ received: true });
    }

    // โค้ดส่วนนี้ถูกย้ายและปรับปรุงไปอยู่ในบล็อกของแต่ละ event type แล้ว
    // ไม่จำเป็นต้องมีส่วนนี้อีกต่อไปเพื่อป้องกันการทำงานซ้ำซ้อน
    // if (!paymentId) {
    //   console.error("❌ [Payment Webhook] Payment ID not found");
    //   return NextResponse.json({ success: false, error: "Payment ID not found" }, { status: 404 });
    // }

    // const confirmResult = await PaymentGatewayService.confirmPayment({
    //   paymentId,
    //   status: paymentStatus,
    //   transactionId,
    //   paidAt: new Date(),
    //   amount
    // });

    // if (!confirmResult) {
    //   console.error(`❌ [Payment Webhook] Failed to confirm payment: ${paymentId}`);
    //   return NextResponse.json(
    //     { success: false, error: "Failed to confirm payment" },
    //     { status: 500 }
    //   );
    // }

    // if (paymentStatus === PaymentStatus.SUCCEEDED) {
    //   const payment = await PaymentModel.findById(paymentId);
    //   if (payment && payment.paymentForType === 'coin_topup') {
    //     console.log(`💎 [Payment Webhook] Processing coin topup for payment: ${paymentId}`);
    //     const topupResult = await CoinTopupService.processCoinTopup(paymentId);
    //     if (!topupResult.success) {
    //       console.error(`❌ [Payment Webhook] Failed to process coin topup: ${topupResult.error}`);
    //     } else {
    //       console.log(`✅ [Payment Webhook] Coin topup processed successfully: ${topupResult.coinAmount} coins added`);
    //     }
    //   }
    // }

    // 6. ส่งผลลัพธ์กลับไปยัง Stripe
    // Stripe ต้องการ HTTP 200 response และข้อความ received: true
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("❌ [Payment Webhook] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ต้องปิดการแปลง body เป็น JSON โดยอัตโนมัติ
export const config = {
  api: {
    bodyParser: false,
  },
};