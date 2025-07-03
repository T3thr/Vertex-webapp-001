// src/app/api/novels/[slug]/episodes/[episodeId]/purchase/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import PurchaseModel from '@/backend/models/Purchase';
import UserModel from '@/backend/models/User';
import mongoose from 'mongoose';

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

      // 8. ดึงข้อมูลผู้ใช้
      const user = await UserModel.findById(session.user.id).session(dbSession);
      if (!user) {
        throw new Error('ไม่พบข้อมูลผู้ใช้');
      }

      // 9. คำนวณราคาที่ต้องจ่ายจริง (Effective Price) โดยเรียก method จาก episode model
      const effectivePrice = await episode.getEffectivePrice();

      // 10. ตรวจสอบว่าผู้ใช้มีเหรียญเพียงพอหรือไม่
      if (user.coinBalance < effectivePrice) {
        throw new Error(`Coins ไม่เพียงพอ คุณมี ${user.coinBalance} Coins แต่ต้องใช้ ${effectivePrice} Coins`);
      }

      // 11. สร้างรายการสั่งซื้อ (Purchase Record)
      const purchase = new PurchaseModel({
        purchaseReadableId: `PUR-EP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: user._id,
        status: 'completed',
        totalAmount: effectivePrice,
        currency: 'coin',
        items: [{
          itemId: episode._id,
          itemType: 'novel_episode',
          priceAtPurchase: effectivePrice,
          originalPrice: await episode.getOriginalPrice(), // เรียกใช้ getOriginalPrice เพื่อความถูกต้อง
          quantity: 1
        }],
        paymentDetails: {
          method: 'coin_balance',
          coinBalanceBefore: user.coinBalance,
          coinBalanceAfter: user.coinBalance - effectivePrice
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

      // 12. หักเหรียญจากบัญชีผู้ใช้
      user.coinBalance -= effectivePrice;
      await user.save({ session: dbSession });

      // 13. อัปเดตสถิติของตอน
      // [FIXED] แก้ไขจาก purchaseCount เป็น purchasesCount เพื่อให้ตรงกับ Model
      episode.stats.purchasesCount += 1;
      // [REMOVED] ลบการอัปเดต totalRevenue ใน episode.stats ออก เนื่องจาก Model ไม่ได้กำหนด field นี้ไว้
      // รายรับจะถูกเก็บในระดับ Novel แทน
      await episode.save({ session: dbSession });

      // 14. อัปเดตสถิติของนิยาย (เพิ่มรายรับรวม)
      novel.stats.totalRevenue += effectivePrice;
      await novel.save({ session: dbSession });

      // 15. Commit Transaction เมื่อทุกอย่างสำเร็จ
      await dbSession.commitTransaction();

      // 16. ส่งผลลัพธ์การซื้อสำเร็จกลับไป
      return NextResponse.json({
        success: true,
        purchase: {
          id: purchase._id,
          purchaseReadableId: purchase.purchaseReadableId,
          amount: effectivePrice,
          newBalance: user.coinBalance
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