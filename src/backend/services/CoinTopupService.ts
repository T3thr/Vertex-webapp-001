// src/backend/services/CoinTopupService.ts
// Service สำหรับจัดการการเติมเหรียญ

import { Types } from 'mongoose';
import mongoose from 'mongoose';
import UserGamificationModel from '../models/UserGamification';
import PaymentModel, { PaymentStatus, PaymentForType } from '../models/Payment';
import PaymentGatewayService from './PaymentGatewayService';

/**
 * ข้อมูลการเติมเหรียญ
 */
export interface CoinTopupRequest {
  userId: string;       // ID ของผู้ใช้
  amount: number;       // จำนวนเหรียญที่ต้องการเติม
  paymentAmount: number; // จำนวนเงินที่ชำระ (บาท)
  description?: string; // รายละเอียดการเติมเหรียญ
  metadata?: any;       // ข้อมูลเพิ่มเติม
}

/**
 * ผลลัพธ์การเติมเหรียญ
 */
export interface CoinTopupResult {
  success: boolean;
  paymentId?: string;   // ID การชำระเงินในระบบ
  qrData?: string;      // ข้อมูล QR Code (Base64 หรือ URL)
  expiresAt?: Date;     // วันหมดอายุของ QR Code
  amount?: number;      // จำนวนเหรียญที่จะได้รับ
  paymentAmount?: number; // จำนวนเงินที่ต้องชำระ
  reference?: string;   // รหัสอ้างอิงการชำระเงิน
  error?: string;       // ข้อความแสดงข้อผิดพลาด (ถ้ามี)
}

/**
 * ผลลัพธ์การประมวลผลการเติมเหรียญ
 */
export interface ProcessTopupResult {
  success: boolean;
  userId?: string;      // ID ของผู้ใช้
  coinAmount?: number;  // จำนวนเหรียญที่เติม
  newBalance?: number;  // ยอดเหรียญใหม่
  error?: string;       // ข้อความแสดงข้อผิดพลาด (ถ้ามี)
}

/**
 * Service สำหรับจัดการการเติมเหรียญ
 */
export class CoinTopupService {
  /**
   * สร้างรายการเติมเหรียญและ QR Code สำหรับชำระเงิน
   * @param request ข้อมูลการเติมเหรียญ
   */
  async createCoinTopup(request: CoinTopupRequest): Promise<CoinTopupResult> {
    try {
      // 1. ตรวจสอบข้อมูลเบื้องต้น
      if (!request.userId || !Types.ObjectId.isValid(request.userId)) {
        return { success: false, error: 'ไม่พบข้อมูลผู้ใช้หรือข้อมูลไม่ถูกต้อง' };
      }

      if (!request.amount || request.amount <= 0) {
        return { success: false, error: 'จำนวนเหรียญไม่ถูกต้อง' };
      }

      if (!request.paymentAmount || request.paymentAmount <= 0) {
        return { success: false, error: 'จำนวนเงินไม่ถูกต้อง' };
      }

      // 2. เรียกใช้ PaymentGatewayService เพื่อสร้าง QR Code
      const description = request.description || `เติม ${request.amount} เหรียญ`;
      const metadata = {
        ...request.metadata,
        coinAmount: request.amount,
        topupType: 'coin'
      };

      const qrResult = await PaymentGatewayService.createQRPayment({
        userId: request.userId,
        amount: request.paymentAmount,
        description,
        metadata
      });

      // 3. ตรวจสอบผลลัพธ์และส่งกลับ
      if (!qrResult.success) {
        return { success: false, error: qrResult.error || 'ไม่สามารถสร้าง QR Code ได้' };
      }

      return {
        success: true,
        paymentId: qrResult.paymentId,
        qrData: qrResult.qrData,
        expiresAt: qrResult.expiresAt,
        amount: request.amount,
        paymentAmount: request.paymentAmount,
        reference: qrResult.reference
      };
    } catch (error: any) {
      console.error('❌ [CoinTopupService] Error creating coin topup:', error);
      return {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการสร้างรายการเติมเหรียญ'
      };
    }
  }

  /**
   * ประมวลผลการเติมเหรียญเมื่อการชำระเงินสำเร็จ
   * @param paymentId ID การชำระเงินในระบบ
   */
  async processCoinTopup(paymentId: string): Promise<ProcessTopupResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log(`[CoinTopupService] Processing coin topup for payment ID: ${paymentId}`);
      // 1. ตรวจสอบข้อมูลการชำระเงิน
      if (!Types.ObjectId.isValid(paymentId)) {
        return { success: false, error: 'รหัสการชำระเงินไม่ถูกต้อง' };
      }

      const payment = await PaymentModel.findById(paymentId).session(session);
      if (!payment) {
        return { success: false, error: 'ไม่พบข้อมูลการชำระเงิน' };
      }

      // 2. ตรวจสอบสถานะการชำระเงิน
      if (payment.status !== PaymentStatus.SUCCEEDED) {
        return { success: false, error: 'การชำระเงินยังไม่สำเร็จ' };
      }

      // 3. ตรวจสอบว่าเป็นการเติมเหรียญ
      if (payment.paymentForType !== PaymentForType.COIN_TOPUP || !payment.metadata?.coinAmount) {
        return { success: false, error: 'ไม่ใช่รายการเติมเหรียญ' };
      }

      // 4. ตรวจสอบว่ารายการนี้ถูกประมวลผลไปแล้วหรือไม่
      if (payment.metadata.processed) {
        console.warn(`⚠️ [CoinTopupService] Payment ID ${paymentId} already processed. Skipping.`);
        return { success: false, error: 'รายการนี้ถูกประมวลผลไปแล้ว' };
      }

      const userId = payment.userId.toString();
      const coinAmount = parseInt(payment.metadata.coinAmount as string);

      console.log(`[CoinTopupService] Found payment: userId=${userId}, coinAmount (from metadata)=${payment.metadata.coinAmount}`);
      console.log(`[CoinTopupService] Parsed coinAmount: ${coinAmount}`);

      if (isNaN(coinAmount) || coinAmount <= 0) {
        await session.abortTransaction();
        session.endSession();
        return { success: false, error: 'จำนวนเหรียญที่จะเติมไม่ถูกต้อง (Invalid coin amount)' };
      }

      // 5. อัปเดตเหรียญในกระเป๋าของผู้ใช้
      const userGamification = await UserGamificationModel.findOne({ userId }).session(session);
      if (!userGamification) {
        await session.abortTransaction();
        session.endSession();
        return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };
      }

      // เพิ่มเหรียญและอัปเดตเวลาทำรายการล่าสุด
      const oldBalance = userGamification.wallet.coinBalance;
      userGamification.wallet.coinBalance += coinAmount;
      userGamification.wallet.lastCoinTransactionAt = new Date();
      await userGamification.save({ session });

      console.log(`[CoinTopupService] User ${userId}: Old balance = ${oldBalance}, Added = ${coinAmount}, New balance = ${userGamification.wallet.coinBalance}`);

      // 6. อัปเดตสถานะการประมวลผลในรายการชำระเงิน
      payment.metadata.processed = true;
      payment.metadata.processedAt = new Date();
      payment.metadata.oldCoinBalance = oldBalance;
      payment.metadata.newCoinBalance = userGamification.wallet.coinBalance;
      await payment.save({ session });

      console.log(`[CoinTopupService] Payment ID ${paymentId} marked as processed.`);

      // 7. ยืนยันการทำธุรกรรม
      await session.commitTransaction();
      session.endSession();

      // 8. ส่งผลลัพธ์กลับ
      return {
        success: true,
        userId,
        coinAmount,
        newBalance: userGamification.wallet.coinBalance
      };
    } catch (error: any) {
      // ยกเลิกการทำธุรกรรมหากเกิดข้อผิดพลาด
      await session.abortTransaction();
      session.endSession();

      console.error('❌ [CoinTopupService] Error processing coin topup:', error);
      return {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการประมวลผลการเติมเหรียญ'
      };
    }
  }

  /**
   * ตรวจสอบสถานะการเติมเหรียญ
   * @param paymentId ID การชำระเงินในระบบ
   */
  async checkTopupStatus(paymentId: string): Promise<{
    status: PaymentStatus;
    processed: boolean;
    coinAmount?: number;
    paymentAmount?: number;
  } | null> {
    try {
      if (!Types.ObjectId.isValid(paymentId)) {
        return null;
      }

      const payment = await PaymentModel.findById(paymentId);
      if (!payment) {
        return null;
      }

      return {
        status: payment.status,
        processed: !!payment.metadata?.processed,
        coinAmount: payment.metadata?.coinAmount,
        paymentAmount: payment.amount
      };
    } catch (error) {
      console.error('❌ [CoinTopupService] Error checking topup status:', error);
      return null;
    }
  }

  /**
   * จำลองการเติมเหรียญสำเร็จ (สำหรับการทดสอบเท่านั้น)
   * @param paymentId ID การชำระเงินในระบบ
   */
  async simulateSuccessfulTopup(paymentId: string): Promise<ProcessTopupResult> {
    try {
      // 0. ตรวจสอบว่าอยู่ในโหมดพัฒนาหรือไม่
      if (process.env.NODE_ENV !== 'development') {
        console.warn('⚠️ [CoinTopupService] Attempt to simulate payment in non-development environment');
        return { success: false, error: 'การจำลองการชำระเงินสามารถทำได้เฉพาะในโหมดพัฒนาเท่านั้น' };
      }
      
      // 1. จำลองการชำระเงินสำเร็จ
      const paymentSuccess = await PaymentGatewayService.simulateSuccessfulPayment(paymentId);
      if (!paymentSuccess) {
        return { success: false, error: 'ไม่สามารถจำลองการชำระเงินได้' };
      }

      // 2. ประมวลผลการเติมเหรียญ
      return this.processCoinTopup(paymentId);
    } catch (error: any) {
      console.error('❌ [CoinTopupService] Error simulating topup:', error);
      return {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการจำลองการเติมเหรียญ'
      };
    }
  }
}

// สร้าง instance เดียวเพื่อใช้งานทั่วทั้งแอป
const coinTopupService = new CoinTopupService();
export default coinTopupService;
