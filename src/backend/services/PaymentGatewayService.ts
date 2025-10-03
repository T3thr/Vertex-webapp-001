// src/backend/services/PaymentGatewayService.ts
// Service สำหรับเชื่อมต่อกับ Payment Gateway (ตัวอย่างนี้จะใช้การจำลองระบบ QR Payment)

import { Types } from 'mongoose';
import PaymentModel, { IPayment, PaymentStatus, PaymentGateway, PaymentForType } from '../models/Payment';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';
import Stripe from 'stripe';

// สร้าง Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15' as any, // ใช้ API version ที่ Stripe รองรับ
});

/**
 * ข้อมูลการสร้าง QR Code สำหรับชำระเงิน
 */
export interface QRPaymentRequest {
  amount: number;       // จำนวนเงิน (บาท)
  userId: string;       // ID ของผู้ใช้
  description?: string; // รายละเอียดการชำระเงิน
  metadata?: any;       // ข้อมูลเพิ่มเติม
}

/**
 * ผลลัพธ์การสร้าง QR Code
 */
export interface QRPaymentResult {
  success: boolean;
  paymentId?: string;   // ID การชำระเงินในระบบ
  qrData?: string;      // ข้อมูล QR Code (Base64 หรือ URL)
  expiresAt?: Date;     // วันหมดอายุของ QR Code
  amount?: number;      // จำนวนเงิน
  reference?: string;   // รหัสอ้างอิงการชำระเงิน
  transactionId?: string; // ID ธุรกรรมจาก Payment Gateway
  paymentIntentId?: string; // ID Payment Intent จาก Payment Gateway
  error?: string;       // ข้อความแสดงข้อผิดพลาด (ถ้ามี)
}

/**
 * ข้อมูลการยืนยันการชำระเงิน
 */
export interface PaymentConfirmation {
  paymentId: string;    // ID การชำระเงินในระบบ
  status: PaymentStatus;
  transactionId?: string; // ID ธุรกรรมจาก Payment Gateway
  paidAt?: Date;        // วันเวลาที่ชำระเงิน
  amount?: number;      // จำนวนเงินที่ชำระ
  fee?: number;         // ค่าธรรมเนียม
}

/**
 * Service สำหรับเชื่อมต่อกับระบบชำระเงิน
 */
export class PaymentGatewayService {
  /**
   * สร้าง QR Code สำหรับการชำระเงิน
   * @param request ข้อมูลการสร้าง QR Code
   */
  async createQRPayment(request: QRPaymentRequest): Promise<QRPaymentResult> {
    try {
      // 1. ตรวจสอบข้อมูลเบื้องต้น
      if (!request.userId || !Types.ObjectId.isValid(request.userId)) {
        return { success: false, error: 'ไม่พบข้อมูลผู้ใช้หรือข้อมูลไม่ถูกต้อง' };
      }

      if (!request.amount || request.amount <= 0) {
        return { success: false, error: 'จำนวนเงินไม่ถูกต้อง' };
      }

      // 2. สร้างรายการชำระเงินในระบบ
      const timestamp = Date.now();
      const paymentReadableId = `PAY-${timestamp}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      const userId = new Types.ObjectId(request.userId);
      const reference = `REF${timestamp}${Math.floor(Math.random() * 1000)}`;
      
      // ตรวจสอบว่ามี STRIPE_SECRET_KEY หรือไม่
      if (process.env.STRIPE_SECRET_KEY) {
        try {
          // สร้าง Payment Intent ใน Stripe
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(request.amount * 100), // แปลงเป็นสตางค์ (เช่น 100 บาท = 10000 สตางค์)
            currency: 'thb',
            payment_method_types: ['promptpay'],
            metadata: {
              userId: request.userId,
              coinAmount: request.metadata?.coinAmount || request.amount,
              topupType: 'coin'
            }
          });
          
          // สร้าง QR code สำหรับ PromptPay ผ่าน Stripe
          let qrData = '';
          
          // ถ้าใช้ Stripe จริงจะได้ QR code จาก Stripe
          // หมายเหตุ: โครงสร้างข้อมูลอาจแตกต่างกันตาม API version ของ Stripe
          // ในกรณีนี้ใช้ type assertion เพื่อเข้าถึงข้อมูล QR code
          if (paymentIntent.next_action?.display_bank_transfer_instructions) {
            const instructions = paymentIntent.next_action.display_bank_transfer_instructions as any;
            if (instructions.image_url_png) {
              qrData = instructions.image_url_png;
            }
          } else {
            // Fallback: สร้าง QR code ด้วย promptpay-qr library ถ้าไม่ได้จาก Stripe
            const promptpayId = "0923288569"; // เบอร์โทรที่ลงทะเบียน PromptPay
            const payload = generatePayload(promptpayId, { amount: request.amount });
            qrData = await QRCode.toDataURL(payload, {
              errorCorrectionLevel: 'M',
              margin: 1,
              scale: 4,
              width: 200,
              rendererOpts: { quality: 0.8 }
            });
          }
          
          // สร้าง Payment ในระบบของเรา
          const payment = new PaymentModel({
            paymentReadableId,
            userId,
            paymentForType: PaymentForType.COIN_TOPUP,
            paymentGateway: PaymentGateway.STRIPE,
            relatedDocumentId: userId,
            amount: request.amount,
            currency: 'THB',
            netAmount: request.amount,
            status: PaymentStatus.PENDING,
            description: request.description || `เติมเหรียญ ${request.amount} บาท`,
            metadata: request.metadata || {},
            initiatedAt: new Date(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            schemaVersion: 1,
            reference,
            gatewayDetails: {
              qrCodeData: qrData,
              paymentIntentId: paymentIntent.id,
              transactionId: paymentIntent.id
            }
          });

          // บันทึกเพียงครั้งเดียว
          await payment.save();

          // ส่งผลลัพธ์กลับ
          return {
            success: true,
            paymentId: payment._id.toString(),
            qrData,
            expiresAt: payment.expiresAt,
            amount: payment.amount,
            reference,
            paymentIntentId: paymentIntent.id
          };
        } catch (stripeError: any) {
          console.error('❌ [PaymentGatewayService] Stripe error:', stripeError);
          // Fallback ไปใช้ PromptPay QR แบบเดิม
        }
      }
      
      // Fallback หรือกรณีไม่มี STRIPE_SECRET_KEY: ใช้ PromptPay QR แบบเดิม
      const tempTransactionId = `TX-${timestamp}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      const tempPaymentIntentId = `PI-${timestamp}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // สร้าง QR code สำหรับ PromptPay
      const promptpayId = "0923288569"; // เบอร์โทรที่ลงทะเบียน PromptPay
      const payload = generatePayload(promptpayId, { amount: request.amount });
      const qrData = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        scale: 4,
        width: 200,
        rendererOpts: { quality: 0.8 }
      });
      
      // สร้าง Payment ด้วยข้อมูลครบถ้วน
      const payment = new PaymentModel({
        paymentReadableId,
        userId,
        paymentForType: PaymentForType.COIN_TOPUP,
        paymentGateway: PaymentGateway.PROMPTPAY_QR,
        relatedDocumentId: userId,
        amount: request.amount,
        currency: 'THB',
        netAmount: request.amount,
        status: PaymentStatus.PENDING,
        description: request.description || `เติมเหรียญ ${request.amount} บาท`,
        metadata: request.metadata || {},
        initiatedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        schemaVersion: 1,
        reference,
        gatewayDetails: {
          qrCodeData: qrData,
          transactionId: tempTransactionId,
          paymentIntentId: tempPaymentIntentId
        }
      });

      // บันทึกเพียงครั้งเดียว
      await payment.save();

      // ส่งผลลัพธ์กลับ
      return {
        success: true,
        paymentId: payment._id.toString(),
        qrData,
        expiresAt: payment.expiresAt,
        amount: payment.amount,
        reference,
        transactionId: tempTransactionId,
        paymentIntentId: tempPaymentIntentId
      };
    } catch (error: any) {
      console.error('❌ [PaymentGatewayService] Error creating QR payment:', error);
      return {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการสร้าง QR Code'
      };
    }
  }

  /**
   * สร้าง Stripe Checkout Session สำหรับเติมเหรียญ
   * @param params ข้อมูลการสร้าง session
   */
  async createCheckoutSession({ userId, amount, description, metadata, successUrl, cancelUrl }: {
    userId: string;
    amount: number;
    description?: string;
    metadata?: any;
    successUrl: string;
    cancelUrl: string;
  }) {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new Error('ไม่พบข้อมูลผู้ใช้หรือข้อมูลไม่ถูกต้อง');
    }
    if (!amount || amount <= 0) {
      throw new Error('จำนวนเงินไม่ถูกต้อง');
    }
    const paymentReadableId = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const reference = `REF${Date.now()}${Math.floor(Math.random() * 1000)}`;
    // 1. สร้าง Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'thb',
            product_data: {
              name: description || `เติมเหรียญ ${amount} บาท`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        userId,
        coinAmount: metadata?.coinAmount || amount,
        topupType: 'coin',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log(`[PaymentGatewayService] Created Stripe Checkout Session ID: ${session.id}`);

    // 2. สร้าง Payment record ในระบบ
    // เพิ่มการกำหนดค่า transactionId เป็นค่าชั่วคราวที่ไม่ซ้ำกัน
    const tempTransactionId = `TEMP-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const payment = new PaymentModel({
      paymentReadableId,
      userId,
      paymentForType: PaymentForType.COIN_TOPUP,
      paymentGateway: PaymentGateway.STRIPE,
      relatedDocumentId: userId,
      amount,
      currency: 'THB',
      netAmount: amount,
      status: PaymentStatus.PENDING,
      description: description || `เติมเหรียญ ${amount} บาท`,
      metadata: metadata || {},
      initiatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      schemaVersion: 1,
      reference,
      gatewayDetails: {
        sessionId: session.id,
        transactionId: tempTransactionId, // เพิ่มค่าชั่วคราวที่ไม่ซ้ำกัน
        paymentIntentId: tempTransactionId, // ใช้ค่าเดียวกับ transactionId ชั่วคราว
      },
    });

    console.log('[PaymentGatewayService] Payment object before save - gatewayDetails:', payment.gatewayDetails);

    await payment.save();
    return {
      sessionId: session.id,
      url: session.url,
      paymentId: payment._id.toString(),
    };
  }

  /**
   * ตรวจสอบสถานะการชำระเงิน
   * @param paymentId ID การชำระเงินในระบบ
   */
  async checkPaymentStatus(paymentId: string): Promise<IPayment | null> {
    try {
      if (!Types.ObjectId.isValid(paymentId)) {
        return null;
      }

      // ในระบบจริงจะต้องเรียก API ของ Payment Gateway เพื่อตรวจสอบสถานะ
      // แต่ในตัวอย่างนี้เราจะดึงข้อมูลจาก DB โดยตรง
      const payment = await PaymentModel.findById(paymentId);
      return payment;
    } catch (error) {
      console.error('❌ [PaymentGatewayService] Error checking payment status:', error);
      return null;
    }
  }

  /**
   * อัปเดตสถานะการชำระเงิน (เรียกจาก Webhook หรือระบบอื่นๆ)
   * @param confirmation ข้อมูลการยืนยันการชำระเงิน
   */
  async confirmPayment(confirmation: PaymentConfirmation): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(confirmation.paymentId)) {
        return false;
      }

      // 1. ดึงข้อมูลการชำระเงิน
      const payment = await PaymentModel.findById(confirmation.paymentId);
      if (!payment) {
        console.error(`❌ [PaymentGatewayService] Payment not found: ${confirmation.paymentId}`);
        return false;
      }

      // 2. ตรวจสอบว่าการชำระเงินยังไม่ถูกประมวลผลไปแล้ว
      if (payment.status === PaymentStatus.SUCCEEDED || payment.status === PaymentStatus.REFUNDED) {
        console.warn(`⚠️ [PaymentGatewayService] Payment already processed: ${confirmation.paymentId}`);
        return true; // ถือว่าสำเร็จเพราะการชำระเงินถูกประมวลผลไปแล้ว
      }

      // 3. อัปเดตสถานะการชำระเงิน
      payment.status = confirmation.status;
      payment.transactionId = confirmation.transactionId || payment.transactionId;
      payment.paidAt = confirmation.paidAt || (confirmation.status === PaymentStatus.SUCCEEDED ? new Date() : undefined);
      
      if (confirmation.amount) {
        payment.amountReceived = confirmation.amount;
      }
      
      if (confirmation.fee) {
        payment.fee = confirmation.fee;
      }

      await payment.save();
      return true;
    } catch (error) {
      console.error('❌ [PaymentGatewayService] Error confirming payment:', error);
      return false;
    }
  }

  /**
   * จำลองการชำระเงินสำเร็จ (สำหรับการทดสอบเท่านั้น)
   * @param paymentId ID การชำระเงินในระบบ
   */
  async simulateSuccessfulPayment(paymentId: string): Promise<boolean> {
    try {
      // ตรวจสอบว่าอยู่ในโหมดพัฒนาหรือไม่
      if (process.env.NODE_ENV !== 'development') {
        console.warn('⚠️ [PaymentGatewayService] Attempt to simulate payment in non-development environment');
        return false;
      }
      
      if (!Types.ObjectId.isValid(paymentId)) {
        return false;
      }

      const payment = await PaymentModel.findById(paymentId);
      if (!payment) {
        return false;
      }

      return this.confirmPayment({
        paymentId,
        status: PaymentStatus.SUCCEEDED,
        transactionId: `SIM${Date.now()}`,
        paidAt: new Date(),
        amount: payment.amount
      });
    } catch (error) {
      console.error('❌ [PaymentGatewayService] Error simulating payment:', error);
      return false;
    }
  }
}

// สร้าง instance เดียวเพื่อใช้งานทั่วทั้งแอป
const paymentGatewayService = new PaymentGatewayService();
export default paymentGatewayService;
