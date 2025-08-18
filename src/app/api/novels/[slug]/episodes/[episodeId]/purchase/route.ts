// src/app/api/novels/[slug]/episodes/[episodeId]/purchase/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import PurchaseModel, { PurchaseStatus, PurchaseItemType } from '@/backend/models/Purchase';
import UserModel from '@/backend/models/User';
import UserGamificationModel from '@/backend/models/UserGamification';
import mongoose from 'mongoose';
import EarningService from '@/backend/services/EarningService';
import EarningAnalyticsService from '@/backend/services/EarningAnalyticsService';
import { TransactionCurrency } from '@/backend/models/EarningTransaction';

/**
 * @route   POST /api/novels/{slug}/episodes/{episodeId}/purchase
 * @desc    API สำหรับการซื้อตอนนิยายด้วยเหรียญ (Coin)
 * @access  Private (ต้อง Login)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    const { slug, episodeId } = await params;

    // 1. ตรวจสอบ Session และยืนยันตัวตนผู้ใช้
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบเพื่อซื้อตอน' },
        { status: 401 }
      );
    }

    await dbConnect();

    // 2. เริ่ม Transaction เพื่อให้แน่ใจว่าทุกอย่างทำงานสำเร็จทั้งหมดหรือไม่ก็ไม่ทำเลย
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // 3. ค้นหานิยายจาก slug
      const novel = await NovelModel.findOne({ slug }).session(dbSession);
      if (!novel) {
        throw new Error('ไม่พบนิยาย');
      }

      // 4. ค้นหาตอนจาก episodeId
      const episode = await EpisodeModel.findById(episodeId).session(dbSession);
      if (!episode) {
        throw new Error('ไม่พบตอน');
      }

      // 5. ตรวจสอบว่าตอนที่พบเป็นของนิยายเรื่องนี้จริง
      if (episode.novelId.toString() !== novel._id.toString()) {
        throw new Error('ตอนนี้ไม่ใช่ของนิยายนี้');
      }

      // 6. ตรวจสอบว่าตอนเป็นแบบฟรีหรือไม่ (ไม่ควรซื้อตอนฟรี)
      if (episode.accessType === 'free') {
        throw new Error('ตอนนี้ฟรี ไม่จำเป็นต้องซื้อ');
      }

      // 7. ตรวจสอบว่าผู้ใช้เคยซื้อตอนนี้ไปแล้วหรือยัง
      const existingPurchase = await PurchaseModel.findOne({
        userId: session.user.id,
        'items.itemId': episode._id,
        'items.itemType': 'novel_episode',
        status: 'completed'
      }).session(dbSession);

      if (existingPurchase) {
        throw new Error('คุณได้ซื้อตอนนี้ไปแล้ว');
      }

      // 8. ดึงข้อมูลผู้ใช้และข้อมูล Gamification
      const user = await UserModel.findById(session.user.id).session(dbSession);
      if (!user) {
        throw new Error('ไม่พบข้อมูลผู้ใช้');
      }
      
      // 8.1 ดึงข้อมูล UserGamification สำหรับตรวจสอบยอดเหรียญ
      const userGamification = await UserGamificationModel.findOne({ userId: user._id }).session(dbSession);
      if (!userGamification) {
        throw new Error('ไม่พบข้อมูลกระเป๋าเงินของผู้ใช้');
      }

      // 9. คำนวณราคาที่ต้องจ่ายจริง (Effective Price) โดยเรียก method จาก episode model
      const effectivePrice = await episode.getEffectivePrice();

      // 10. ตรวจสอบว่าผู้ใช้มีเหรียญเพียงพอหรือไม่
      if (userGamification.wallet.coinBalance < effectivePrice) {
        throw new Error(`Coins ไม่เพียงพอ คุณมี ${userGamification.wallet.coinBalance} Coins แต่ต้องใช้ ${effectivePrice} Coins`);
      }

      // 11. สร้างรายการสั่งซื้อ (Purchase Record)
      const purchase = new PurchaseModel({
        purchaseReadableId: `PUR-EP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: user._id,
        status: PurchaseStatus.COMPLETED,
        totalAmount: effectivePrice,
        totalDiscountAmount: 0,
        finalAmount: effectivePrice,
        finalCurrency: 'COIN',
        items: [{
          itemId: episode._id,
          itemType: PurchaseItemType.NOVEL_EPISODE,
          title: episode.title,
          description: `ตอนที่ ${episode.episodeOrder}: ${episode.title} (${novel.title})`,
          quantity: 1,
          unitPrice: effectivePrice,
          currency: 'COIN',
          subtotal: effectivePrice,
          sellerId: novel.author // เพิ่ม sellerId เพื่อระบุผู้เขียนที่จะได้รับรายได้
        }],
        paymentDetails: {
          method: 'coin_balance',
          coinBalanceBefore: userGamification.wallet.coinBalance,
          coinBalanceAfter: userGamification.wallet.coinBalance - effectivePrice
        },
        metadata: {
          novelId: novel._id.toString(),
          novelTitle: novel.title,
          episodeTitle: episode.title,
          episodeOrder: episode.episodeOrder,
          accessType: episode.accessType
        }
      });

      await purchase.save({ session: dbSession });

      // 12. หักเหรียญจากกระเป๋าเงินของผู้ใช้
      userGamification.wallet.coinBalance -= effectivePrice;
      userGamification.wallet.lastCoinTransactionAt = new Date();
      await userGamification.save({ session: dbSession });

      // 13. อัปเดตสถิติของตอน (ไม่เรียกใช้ firstSceneId)
      episode.stats.purchasesCount = (episode.stats.purchasesCount || 0) + 1;
      await EpisodeModel.findByIdAndUpdate(
        episode._id,
        { $inc: { 'stats.purchasesCount': 1 } },
        { session: dbSession }
      );

      // 14. อัปเดตสถิติของนิยาย (เพิ่มรายรับรวม)
      // [FIXED] แก้ไขจาก totalRevenue เป็น totalRevenueCoins เพื่อให้ตรงกับ Model
      // ใช้ findByIdAndUpdate แทนการเรียก save เพื่อหลีกเลี่ยงการเรียกใช้ middleware ที่อาจมีปัญหา
      await NovelModel.findByIdAndUpdate(
        novel._id,
        { $inc: { 'stats.totalRevenueCoins': effectivePrice, 'stats.purchasesCount': 1 } },
        { session: dbSession }
      );

      // 15. สร้างธุรกรรมรายได้สำหรับนักเขียน
      await EarningService.createEpisodePurchaseEarningTransaction(
        purchase._id.toString(),
        user._id.toString(),
        novel.author.toString(),
        novel._id.toString(),
        episode._id.toString(),
        effectivePrice,
        30, // ค่าธรรมเนียมแพลตฟอร์ม 30%
        dbSession
      );
      
      // 15.1 อัปเดตข้อมูลวิเคราะห์รายได้
      const platformFee = Math.round(effectivePrice * 0.3); // 30% ของราคา
      await EarningAnalyticsService.updateAnalyticsAfterEpisodePurchase(
        purchase._id.toString(),
        user._id.toString(),
        novel.author.toString(),
        novel._id.toString(),
        episode._id.toString(),
        effectivePrice,
        platformFee,
        dbSession
      );

      // 16. Commit Transaction เมื่อทุกอย่างสำเร็จ
      await dbSession.commitTransaction();

      // 17. ส่งผลลัพธ์การซื้อสำเร็จกลับไป
      return NextResponse.json({
        success: true,
        purchase: {
          id: purchase._id,
          purchaseReadableId: purchase.purchaseReadableId,
          amount: effectivePrice,
          newBalance: userGamification.wallet.coinBalance
        }
      });

    } catch (error) {
      // หากเกิดข้อผิดพลาดใน try block ด้านบน ให้ยกเลิก Transaction ทั้งหมด
      await dbSession.abortTransaction();
      throw error; // ส่ง error ต่อไปให้ catch block ด้านนอกจัดการ
    } finally {
      // สิ้นสุด Session ไม่ว่าจะสำเร็จหรือล้มเหลว
      await dbSession.endSession();
    }

  } catch (error: any) {
    // Catch block สำหรับจัดการ Error ทั้งหมดและส่ง Response กลับไปหา Client
    console.error('Purchase error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการซื้อตอน' },
      { status: error.status || 400 } // ใช้ status จาก error ถ้ามี, หรือใช้ 400 เป็น default
    );
  }
}
