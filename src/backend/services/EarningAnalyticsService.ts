// src/backend/services/EarningAnalyticsService.ts
// Service สำหรับจัดการการวิเคราะห์รายได้และสร้าง EarningAnalytic records

import mongoose, { Types } from 'mongoose';
import EarningAnalyticModel, { AnalyticTargetType, AnalyticTimePeriod, AnalyticCurrency, IEarningAnalytic } from '../models/EarningAnalytic';
import EarningTransactionModel, { TransactionType, TransactionCurrency } from '../models/EarningTransaction';
import NovelModel from '../models/Novel';
import WriterStatsModel from '../models/WriterStats';

/**
 * Service สำหรับจัดการการวิเคราะห์รายได้
 */
export class EarningAnalyticsService {
  /**
   * สร้างหรืออัปเดตข้อมูลวิเคราะห์รายได้ของนักเขียนรายวัน
   * @param writerId ID ของนักเขียน
   * @param date วันที่ต้องการสร้างข้อมูลวิเคราะห์ (default: วันนี้)
   * @param session MongoDB Session (optional)
   */
  public static async createOrUpdateDailyWriterAnalytics(
    writerId: string,
    date: Date = new Date(),
    session?: mongoose.ClientSession
  ): Promise<IEarningAnalytic> {
    try {
      // กำหนดวันที่เริ่มต้นและสิ้นสุดของวัน
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      // ดึงข้อมูลธุรกรรมรายได้ของนักเขียนในวันนั้น
      const transactions = await EarningTransactionModel.find({
        $or: [
          { primaryUserId: new Types.ObjectId(writerId) },
          { 'payee.userId': new Types.ObjectId(writerId) }
        ],
        transactionType: {
          $in: [
            TransactionType.WRITER_COIN_EARN_FROM_EPISODE_SALE,
            TransactionType.WRITER_COIN_EARN_FROM_DONATION,
            TransactionType.WRITER_COIN_EARN_FROM_PLATFORM_BONUS
          ]
        },
        transactionDate: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        status: 'completed'
      }).session(session || null);

      // คำนวณรายได้แยกตามประเภท
      let fromSales = 0;
      let fromDonations = 0;
      let fromBonuses = 0;
      let platformFee = 0;
      let salesCount = 0;
      let donationsCount = 0;

      transactions.forEach(tx => {
        if (tx.transactionType === TransactionType.WRITER_COIN_EARN_FROM_EPISODE_SALE) {
          fromSales += tx.amount;
          platformFee += tx.platformFee || 0;
          salesCount++;
        } else if (tx.transactionType === TransactionType.WRITER_COIN_EARN_FROM_DONATION) {
          fromDonations += tx.amount;
          platformFee += tx.platformFee || 0;
          donationsCount++;
        } else if (tx.transactionType === TransactionType.WRITER_COIN_EARN_FROM_PLATFORM_BONUS) {
          fromBonuses += tx.amount;
        }
      });

      // สร้างหรืออัปเดตข้อมูลวิเคราะห์
      const filter = {
        targetType: AnalyticTargetType.WRITER,
        targetId: new Types.ObjectId(writerId),
        timePeriod: AnalyticTimePeriod.DAILY,
        summaryDate: startOfDay,
        currency: AnalyticCurrency.COIN
      };

      const update = {
        $set: {
          summaryEndDate: endOfDay,
          'grossRevenue.fromSales': fromSales,
          'grossRevenue.fromDonations': fromDonations,
          'grossRevenue.fromBonuses': fromBonuses,
          'grossRevenue.total': fromSales + fromDonations + fromBonuses,
          platformFeeDeducted: platformFee,
          netEarnings: fromSales + fromDonations + fromBonuses - platformFee,
          'transactionCounts.sales': salesCount,
          'transactionCounts.donations': donationsCount,
          'transactionCounts.total': salesCount + donationsCount,
          isRecalculated: true,
          lastRecalculatedAt: new Date()
        }
      };

      const options = { 
        upsert: true, 
        new: true,
        session: session || undefined,
        setDefaultsOnInsert: true
      };

      return await EarningAnalyticModel.findOneAndUpdate(filter, update, options);
    } catch (error) {
      console.error('Error creating/updating daily writer analytics:', error);
      throw error;
    }
  }

  /**
   * สร้างหรืออัปเดตข้อมูลวิเคราะห์รายได้ของนิยายรายวัน
   * @param novelId ID ของนิยาย
   * @param date วันที่ต้องการสร้างข้อมูลวิเคราะห์ (default: วันนี้)
   * @param session MongoDB Session (optional)
   */
  public static async createOrUpdateDailyNovelAnalytics(
    novelId: string,
    date: Date = new Date(),
    session?: mongoose.ClientSession
  ): Promise<IEarningAnalytic> {
    try {
      // กำหนดวันที่เริ่มต้นและสิ้นสุดของวัน
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      // ดึงข้อมูลธุรกรรมรายได้ของนิยายในวันนั้น
      const transactions = await EarningTransactionModel.find({
        relatedNovelId: new Types.ObjectId(novelId),
        transactionType: {
          $in: [
            TransactionType.WRITER_COIN_EARN_FROM_EPISODE_SALE,
            TransactionType.WRITER_COIN_EARN_FROM_DONATION
          ]
        },
        transactionDate: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        status: 'completed'
      }).session(session || null);

      // คำนวณรายได้แยกตามประเภท
      let fromSales = 0;
      let fromDonations = 0;
      let platformFee = 0;
      let salesCount = 0;
      let donationsCount = 0;

      transactions.forEach(tx => {
        if (tx.transactionType === TransactionType.WRITER_COIN_EARN_FROM_EPISODE_SALE) {
          fromSales += tx.amount;
          platformFee += tx.platformFee || 0;
          salesCount++;
        } else if (tx.transactionType === TransactionType.WRITER_COIN_EARN_FROM_DONATION) {
          fromDonations += tx.amount;
          platformFee += tx.platformFee || 0;
          donationsCount++;
        }
      });

      // สร้างหรืออัปเดตข้อมูลวิเคราะห์
      const filter = {
        targetType: AnalyticTargetType.NOVEL,
        novelId: new Types.ObjectId(novelId),
        timePeriod: AnalyticTimePeriod.DAILY,
        summaryDate: startOfDay,
        currency: AnalyticCurrency.COIN
      };

      const update = {
        $set: {
          summaryEndDate: endOfDay,
          'grossRevenue.fromSales': fromSales,
          'grossRevenue.fromDonations': fromDonations,
          'grossRevenue.total': fromSales + fromDonations,
          platformFeeDeducted: platformFee,
          netEarnings: fromSales + fromDonations - platformFee,
          'transactionCounts.sales': salesCount,
          'transactionCounts.donations': donationsCount,
          'transactionCounts.total': salesCount + donationsCount,
          isRecalculated: true,
          lastRecalculatedAt: new Date()
        }
      };

      const options = { 
        upsert: true, 
        new: true,
        session: session || undefined,
        setDefaultsOnInsert: true
      };

      return await EarningAnalyticModel.findOneAndUpdate(filter, update, options);
    } catch (error) {
      console.error('Error creating/updating daily novel analytics:', error);
      throw error;
    }
  }

  /**
   * อัปเดตข้อมูลวิเคราะห์รายได้หลังจากการซื้อตอนนิยาย
   * @param purchaseId ID ของการซื้อ
   * @param buyerId ID ของผู้ซื้อ
   * @param writerId ID ของนักเขียน
   * @param novelId ID ของนิยาย
   * @param episodeId ID ของตอน
   * @param amount จำนวนเหรียญ
   * @param platformFee ค่าธรรมเนียมแพลตฟอร์ม
   * @param session MongoDB Session (optional)
   */
  public static async updateAnalyticsAfterEpisodePurchase(
    purchaseId: string,
    buyerId: string,
    writerId: string,
    novelId: string,
    episodeId: string,
    amount: number,
    platformFee: number,
    session?: mongoose.ClientSession
  ): Promise<void> {
    try {
      // 1. อัปเดตข้อมูลวิเคราะห์รายได้ของนักเขียนรายวัน
      await this.createOrUpdateDailyWriterAnalytics(writerId, new Date(), session);
      
      // 2. อัปเดตข้อมูลวิเคราะห์รายได้ของนิยายรายวัน
      await this.createOrUpdateDailyNovelAnalytics(novelId, new Date(), session);
      
      // 3. อัปเดตข้อมูลสรุปผลงานนิยายใน WriterStats
      const novel = await NovelModel.findById(novelId).select('title').session(session || null);
      if (novel) {
        // ค้นหา novelPerformanceSummary ที่มีอยู่แล้ว
        const writerStats = await WriterStatsModel.findOne({ 
          userId: new Types.ObjectId(writerId),
          'novelPerformanceSummaries.novelId': new Types.ObjectId(novelId)
        }).session(session || null);

        if (writerStats) {
          // อัปเดต novelPerformanceSummary ที่มีอยู่แล้ว
          await WriterStatsModel.updateOne(
            { 
              userId: new Types.ObjectId(writerId),
              'novelPerformanceSummaries.novelId': new Types.ObjectId(novelId)
            },
            { 
              $inc: { 
                'novelPerformanceSummaries.$.totalEarningsFromNovel': amount - platformFee
              }
            },
            { session: session || null }
          );
        } else {
          // เพิ่ม novelPerformanceSummary ใหม่
          await WriterStatsModel.updateOne(
            { userId: new Types.ObjectId(writerId) },
            { 
              $push: { 
                novelPerformanceSummaries: {
                  novelId: new Types.ObjectId(novelId),
                  novelTitle: novel.title,
                  totalViews: 0,
                  totalReads: 0,
                  totalLikes: 0,
                  totalComments: 0,
                  totalFollowers: 0,
                  totalEarningsFromNovel: amount - platformFee
                }
              }
            },
            { upsert: true, session: session || null }
          );
        }
      }
    } catch (error) {
      console.error('Error updating analytics after episode purchase:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลนิยายที่ทำรายได้สูงสุดของนักเขียน
   * @param writerId ID ของนักเขียน
   * @param limit จำนวนนิยายที่ต้องการ (default: 10)
   * @returns รายการนิยายที่ทำรายได้สูงสุด
   */
  public static async getTopEarningNovelsByWriter(
    writerId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      // ดึงข้อมูลจาก WriterStats.novelPerformanceSummaries
      const writerStats = await WriterStatsModel.findOne({ 
        userId: new Types.ObjectId(writerId) 
      }).populate('novelPerformanceSummaries.novelId', 'title slug coverImageUrl');

      if (!writerStats || !writerStats.novelPerformanceSummaries || writerStats.novelPerformanceSummaries.length === 0) {
        return [];
      }

      // เรียงลำดับตามรายได้และจำกัดจำนวน
      const topNovels = writerStats.novelPerformanceSummaries
        .sort((a, b) => (b.totalEarningsFromNovel || 0) - (a.totalEarningsFromNovel || 0))
        .slice(0, limit)
        .map(summary => ({
          novelId: summary.novelId,
          title: summary.novelTitle,
          earnings: summary.totalEarningsFromNovel || 0
        }));

      return topNovels;
    } catch (error) {
      console.error('Error getting top earning novels by writer:', error);
      throw error;
    }
  }
}

export default EarningAnalyticsService;
