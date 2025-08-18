// src/backend/services/EarningService.ts
// Service สำหรับจัดการรายได้และธุรกรรมการเงินของนักเขียน

import mongoose, { Types } from 'mongoose';
import EarningTransactionModel, { IEarningTransaction, TransactionType, TransactionStatus, TransactionCurrency } from '../models/EarningTransaction';
import EarningAnalyticModel from '../models/EarningAnalytic';
import UserModel from '../models/User';
import WriterStatsModel from '../models/WriterStats';

/**
 * ข้อมูลสำหรับสร้างธุรกรรมรายได้
 */
export interface CreateEarningTransactionData {
  // ข้อมูลผู้ที่เกี่ยวข้อง
  primaryUserId?: string; // ID ของผู้ใช้หลัก (เช่น นักเขียนที่ได้รับรายได้)
  payerId?: string; // ID ของผู้จ่าย (เช่น ผู้อ่านที่ซื้อตอน)
  payeeId?: string; // ID ของผู้รับ (เช่น นักเขียนที่ได้รับรายได้)
  
  // ข้อมูลธุรกรรม
  transactionType: TransactionType; // ประเภทธุรกรรม
  description: string; // คำอธิบาย
  amount: number; // จำนวนเงิน/เหรียญ
  currency: TransactionCurrency; // สกุลเงิน
  platformFee?: number; // ค่าธรรมเนียมแพลตฟอร์ม (ถ้ามี)
  
  // ข้อมูลที่เกี่ยวข้อง
  relatedNovelId?: string; // ID นิยายที่เกี่ยวข้อง
  relatedEpisodeId?: string; // ID ตอนที่เกี่ยวข้อง
  relatedPurchaseId?: string; // ID การซื้อที่เกี่ยวข้อง
  relatedDonationId?: string; // ID การบริจาคที่เกี่ยวข้อง
  relatedPaymentId?: string; // ID การชำระเงินที่เกี่ยวข้อง
  
  // ข้อมูลเพิ่มเติม
  status?: TransactionStatus; // สถานะธุรกรรม (default: COMPLETED)
  metadata?: any; // ข้อมูลเพิ่มเติม
  notes?: string; // หมายเหตุ
}

/**
 * Service สำหรับจัดการรายได้และธุรกรรมการเงินของนักเขียน
 */
export class EarningService {
  /**
   * สร้างธุรกรรมรายได้
   * @param data ข้อมูลธุรกรรม
   * @param session MongoDB Session (optional)
   * @returns ธุรกรรมที่สร้าง
   */
  public static async createEarningTransaction(
    data: CreateEarningTransactionData,
    session?: mongoose.ClientSession
  ): Promise<IEarningTransaction> {
    try {
      // สร้าง ID ที่อ่านได้
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const transactionReadableId = `ETX-${timestamp}-${randomSuffix}`;

      // สร้างข้อมูล payer (ถ้ามี)
      const payer = data.payerId ? {
        userId: new Types.ObjectId(data.payerId),
        role: 'payer'
      } : undefined;

      // สร้างข้อมูล payee (ถ้ามี)
      const payee = data.payeeId ? {
        userId: new Types.ObjectId(data.payeeId),
        role: 'payee'
      } : undefined;

      // คำนวณ netAmount
      const netAmount = data.platformFee ? data.amount - data.platformFee : data.amount;

      // สร้างธุรกรรม
      const transaction = new EarningTransactionModel({
        transactionReadableId,
        primaryUserId: data.primaryUserId ? new Types.ObjectId(data.primaryUserId) : undefined,
        payer,
        payee,
        transactionType: data.transactionType,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        platformFee: data.platformFee || 0,
        netAmount,
        relatedNovelId: data.relatedNovelId ? new Types.ObjectId(data.relatedNovelId) : undefined,
        relatedEpisodeId: data.relatedEpisodeId ? new Types.ObjectId(data.relatedEpisodeId) : undefined,
        relatedPurchaseId: data.relatedPurchaseId ? new Types.ObjectId(data.relatedPurchaseId) : undefined,
        relatedDonationId: data.relatedDonationId ? new Types.ObjectId(data.relatedDonationId) : undefined,
        relatedPaymentId: data.relatedPaymentId ? new Types.ObjectId(data.relatedPaymentId) : undefined,
        relatedSourceUserId: data.payerId ? new Types.ObjectId(data.payerId) : undefined,
        relatedTargetUserId: data.payeeId ? new Types.ObjectId(data.payeeId) : undefined,
        status: data.status || TransactionStatus.COMPLETED,
        transactionDate: new Date(),
        processedAt: data.status === TransactionStatus.COMPLETED ? new Date() : undefined,
        metadata: data.metadata,
        notes: data.notes,
        schemaVersion: 1
      });

      // บันทึกธุรกรรม
      await transaction.save({ session: session || undefined });

      // อัปเดต WriterStats สำหรับนักเขียน (ถ้าเป็นรายได้ของนักเขียน)
      if (data.payeeId && 
          (data.transactionType === TransactionType.WRITER_COIN_EARN_FROM_EPISODE_SALE ||
           data.transactionType === TransactionType.WRITER_COIN_EARN_FROM_DONATION ||
           data.transactionType === TransactionType.WRITER_COIN_EARN_FROM_PLATFORM_BONUS)) {
        
        await this.updateWriterEarningStats(data.payeeId, data.amount, data.currency, session);
      }

      return transaction;
    } catch (error) {
      console.error('Error creating earning transaction:', error);
      throw error;
    }
  }

  /**
   * สร้างธุรกรรมรายได้จากการซื้อตอนนิยาย
   * @param purchaseId ID ของการซื้อ
   * @param buyerId ID ของผู้ซื้อ
   * @param writerId ID ของนักเขียน
   * @param novelId ID ของนิยาย
   * @param episodeId ID ของตอน
   * @param amount จำนวนเหรียญ
   * @param platformFeePercent เปอร์เซ็นต์ค่าธรรมเนียมแพลตฟอร์ม (default: 30%)
   * @param session MongoDB Session (optional)
   * @returns ธุรกรรมที่สร้าง
   */
  public static async createEpisodePurchaseEarningTransaction(
    purchaseId: string,
    buyerId: string,
    writerId: string,
    novelId: string,
    episodeId: string,
    amount: number,
    platformFeePercent: number = 30,
    session?: mongoose.ClientSession
  ): Promise<IEarningTransaction> {
    try {
      // คำนวณค่าธรรมเนียมแพลตฟอร์ม
      const platformFee = Math.round(amount * (platformFeePercent / 100));
      const writerAmount = amount - platformFee;

      // ดึงข้อมูลนักเขียนเพื่อใช้ในคำอธิบาย
      const writer = await UserModel.findById(writerId).select('username profile.penNames').lean();
      const writerName = writer?.profile?.penNames?.[0] || writer?.username || 'นักเขียน';

      // สร้างธุรกรรมรายได้สำหรับนักเขียน
      return await this.createEarningTransaction({
        primaryUserId: writerId,
        payerId: buyerId,
        payeeId: writerId,
        transactionType: TransactionType.WRITER_COIN_EARN_FROM_EPISODE_SALE,
        description: `รายได้จากการขายตอนนิยาย (${writerName})`,
        amount,
        currency: TransactionCurrency.COIN,
        platformFee,
        relatedNovelId: novelId,
        relatedEpisodeId: episodeId,
        relatedPurchaseId: purchaseId,
        metadata: {
          platformFeePercent,
          writerAmount,
          platformAmount: platformFee
        }
      }, session);
    } catch (error) {
      console.error('Error creating episode purchase earning transaction:', error);
      throw error;
    }
  }

  /**
   * อัปเดตสถิติรายได้ของนักเขียน
   * @param writerId ID ของนักเขียน
   * @param amount จำนวนเงิน/เหรียญ
   * @param currency สกุลเงิน
   * @param session MongoDB Session (optional)
   */
  private static async updateWriterEarningStats(
    writerId: string,
    amount: number,
    currency: TransactionCurrency,
    session?: mongoose.ClientSession
  ): Promise<void> {
    try {
      // อัปเดต WriterStats
      const updateQuery: any = {};
      
      if (currency === TransactionCurrency.COIN) {
        updateQuery.$inc = { 
          totalCoinsReceived: amount,
          totalEarningsToDate: amount // อัปเดตรายได้รวมด้วย (แปลงเป็นบาท)
        };
      } else if (currency === TransactionCurrency.THB) {
        updateQuery.$inc = { 
          totalEarningsToDate: amount,
          totalRealMoneyReceived: amount
        };
      }

      await WriterStatsModel.findOneAndUpdate(
        { userId: new Types.ObjectId(writerId) },
        updateQuery,
        { upsert: true, session: session || undefined }
      );
    } catch (error) {
      console.error('Error updating writer earning stats:', error);
      throw error;
    }
  }

  /**
   * ดึงธุรกรรมรายได้ของผู้ใช้
   * @param userId ID ของผู้ใช้
   * @param limit จำนวนรายการที่ต้องการ (default: 10)
   * @param skip จำนวนรายการที่ต้องการข้าม (default: 0)
   * @returns รายการธุรกรรม
   */
  public static async getUserEarningTransactions(
    userId: string,
    limit: number = 10,
    skip: number = 0
  ): Promise<any[]> {
    try {
      return await EarningTransactionModel.find({
        $or: [
          { primaryUserId: new Types.ObjectId(userId) },
          { 'payer.userId': new Types.ObjectId(userId) },
          { 'payee.userId': new Types.ObjectId(userId) }
        ]
      })
      .sort({ transactionDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedNovelId', 'title slug')
      .lean();
    } catch (error) {
      console.error('Error fetching user earning transactions:', error);
      throw error;
    }
  }

  /**
   * ดึงสรุปรายได้ของนักเขียน
   * @param writerId ID ของนักเขียน
   * @returns สรุปรายได้
   */
  public static async getWriterEarningSummary(writerId: string): Promise<any> {
    try {
      // ดึงข้อมูลจาก WriterStats
      const writerStats = await WriterStatsModel.findOne({ userId: new Types.ObjectId(writerId) }).lean();
      
      // ดึงข้อมูลรายได้รายเดือนล่าสุด
      const monthlyEarnings = await EarningAnalyticModel.find({
        targetType: 'writer',
        targetId: new Types.ObjectId(writerId)
      })
      .sort({ summaryDate: -1 })
      .limit(12)
      .lean();

      // ดึงข้อมูลธุรกรรมล่าสุด
      const recentTransactions = await this.getUserEarningTransactions(writerId, 5);

      return {
        totalEarnings: writerStats?.totalEarningsToDate || 0,
        totalCoinsReceived: writerStats?.totalCoinsReceived || 0,
        monthlyEarnings,
        recentTransactions
      };
    } catch (error) {
      console.error('Error fetching writer earning summary:', error);
      throw error;
    }
  }
}

export default EarningService;
