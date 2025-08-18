// src/backend/webhooks/PaymentWebhookHandler.ts
// Handler สำหรับจัดการ Webhook จาก Payment Gateway

import { PaymentStatus, PaymentForType } from '../models/Payment';
import PaymentGatewayService from '../services/PaymentGatewayService';
import CoinTopupService from '../services/CoinTopupService';

/**
 * ข้อมูล Webhook ที่ได้รับจาก Payment Gateway
 */
export interface PaymentWebhookData {
  type: string;                // ประเภทของ event (เช่น payment.success, payment.failed)
  paymentId: string;           // ID การชำระเงินในระบบของเรา (ที่เราส่งไปให้ payment gateway)
  gatewayPaymentId?: string;   // ID การชำระเงินในระบบของ payment gateway
  status: string;              // สถานะการชำระเงินจาก payment gateway
  amount?: number;             // จำนวนเงินที่ชำระ
  currency?: string;           // สกุลเงิน
  fee?: number;                // ค่าธรรมเนียม
  metadata?: any;              // ข้อมูลเพิ่มเติมที่เราส่งไปให้ payment gateway
  timestamp?: string;          // เวลาที่เกิด event
  signature?: string;          // ลายเซ็นสำหรับตรวจสอบความถูกต้องของ webhook
}

/**
 * Handler สำหรับจัดการ Webhook จาก Payment Gateway
 */
export class PaymentWebhookHandler {
  /**
   * ตรวจสอบความถูกต้องของ Webhook
   * @param webhookData ข้อมูล Webhook
   * @param signature ลายเซ็น Webhook
   * @param secret Secret key สำหรับตรวจสอบ
   */
  validateWebhook(webhookData: PaymentWebhookData, signature: string, secret: string): boolean {
    // ในระบบจริงต้องมีการตรวจสอบลายเซ็นตามวิธีของ payment gateway
    // แต่ในตัวอย่างนี้เราจะสมมติว่าถูกต้องเสมอ
    return true;
  }

  /**
   * แปลงสถานะจาก Payment Gateway เป็นสถานะในระบบ
   * @param gatewayStatus สถานะจาก Payment Gateway
   */
  mapPaymentStatus(gatewayStatus: string): PaymentStatus {
    switch (gatewayStatus.toLowerCase()) {
      case 'success':
      case 'completed':
      case 'paid':
      case 'successful':
        return PaymentStatus.SUCCEEDED;
      
      case 'pending':
      case 'awaiting_payment':
      case 'waiting':
        return PaymentStatus.PENDING;
      
      case 'processing':
      case 'in_process':
        return PaymentStatus.PROCESSING;
      
      case 'failed':
      case 'error':
      case 'declined':
        return PaymentStatus.FAILED;
      
      case 'cancelled':
      case 'canceled':
      case 'abandoned':
        return PaymentStatus.CANCELLED;
      
      case 'refunded':
      case 'refund':
        return PaymentStatus.REFUNDED;
      
      case 'partially_refunded':
      case 'partial_refund':
        return PaymentStatus.PARTIALLY_REFUNDED;
      
      case 'disputed':
      case 'dispute':
      case 'chargeback':
        return PaymentStatus.DISPUTED;
      
      case 'expired':
      case 'timeout':
        return PaymentStatus.EXPIRED;
      
      default:
        return PaymentStatus.PENDING;
    }
  }

  /**
   * ประมวลผล Webhook
   * @param webhookData ข้อมูล Webhook
   */
  async processWebhook(webhookData: PaymentWebhookData): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // 1. ตรวจสอบข้อมูลที่จำเป็น
      if (!webhookData.paymentId || !webhookData.status) {
        return { success: false, error: 'ข้อมูลไม่ครบถ้วน' };
      }

      // 2. แปลงสถานะการชำระเงิน
      const paymentStatus = this.mapPaymentStatus(webhookData.status);

      // 3. อัปเดตสถานะการชำระเงินในระบบ
      const confirmResult = await PaymentGatewayService.confirmPayment({
        paymentId: webhookData.paymentId,
        status: paymentStatus,
        transactionId: webhookData.gatewayPaymentId,
        paidAt: webhookData.timestamp ? new Date(webhookData.timestamp) : new Date(),
        amount: webhookData.amount,
        fee: webhookData.fee
      });

      if (!confirmResult) {
        return { success: false, error: 'ไม่สามารถอัปเดตสถานะการชำระเงินได้' };
      }

      // 4. ถ้าการชำระเงินสำเร็จและเป็นการเติมเหรียญ ให้ประมวลผลการเติมเหรียญ
      if (paymentStatus === PaymentStatus.SUCCEEDED && webhookData.metadata?.topupType === 'coin') {
        const topupResult = await CoinTopupService.processCoinTopup(webhookData.paymentId);
        
        if (!topupResult.success) {
          // บันทึกข้อผิดพลาด แต่ไม่ส่งกลับเป็น error เพราะการชำระเงินสำเร็จแล้ว
          console.error('❌ [PaymentWebhookHandler] Error processing coin topup:', topupResult.error);
          return { 
            success: true, 
            message: 'การชำระเงินสำเร็จ แต่มีปัญหาในการประมวลผลการเติมเหรียญ (จะมีการแก้ไขโดยทีมงาน)' 
          };
        }

        return { 
          success: true, 
          message: `การชำระเงินสำเร็จ เติม ${topupResult.coinAmount} เหรียญเรียบร้อยแล้ว` 
        };
      }

      // 5. ส่งผลลัพธ์กลับ
      return { 
        success: true, 
        message: `อัปเดตสถานะการชำระเงินเป็น ${paymentStatus} สำเร็จแล้ว` 
      };
    } catch (error: any) {
      console.error('❌ [PaymentWebhookHandler] Error processing webhook:', error);
      return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการประมวลผล webhook' };
    }
  }
}

// สร้าง instance เดียวเพื่อใช้งานทั่วทั้งแอป
const paymentWebhookHandler = new PaymentWebhookHandler();
export default paymentWebhookHandler;
