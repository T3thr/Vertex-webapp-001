import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import PurchaseModel from '@/backend/models/Purchase';
import UserModel from '@/backend/models/User';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    const { slug, episodeId } = await params;
    
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบเพื่อซื้อตอน' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Start a transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // Find novel
      const novel = await NovelModel.findOne({ slug }).session(dbSession);
      if (!novel) {
        throw new Error('ไม่พบนิยาย');
      }

      // Find episode
      const episode = await EpisodeModel.findById(episodeId).session(dbSession);
      if (!episode) {
        throw new Error('ไม่พบตอน');
      }

      // Verify episode belongs to novel
      if (episode.novelId.toString() !== novel._id.toString()) {
        throw new Error('ตอนนี้ไม่ใช่ของนิยายนี้');
      }

      // Check if episode is free
      if (episode.accessType === 'free') {
        throw new Error('ตอนนี้ฟรี ไม่จำเป็นต้องซื้อ');
      }

      // Check if user already purchased
      const existingPurchase = await PurchaseModel.findOne({
        userId: session.user.id,
        'items.itemId': episode._id,
        'items.itemType': 'novel_episode',
        status: 'completed'
      }).session(dbSession);

      if (existingPurchase) {
        throw new Error('คุณได้ซื้อตอนนี้ไปแล้ว');
      }

      // Get user
      const user = await UserModel.findById(session.user.id).session(dbSession);
      if (!user) {
        throw new Error('ไม่พบข้อมูลผู้ใช้');
      }

      // Calculate effective price
      const effectivePrice = await episode.getEffectivePrice();
      
      // Check user balance
      if (user.coinBalance < effectivePrice) {
        throw new Error(`Coins ไม่เพียงพอ คุณมี ${user.coinBalance} Coins แต่ต้องใช้ ${effectivePrice} Coins`);
      }

      // Create purchase record
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
          originalPrice: episode.originalPriceCoins || episode.priceCoins || effectivePrice,
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

      // Deduct coins from user
      user.coinBalance -= effectivePrice;
      await user.save({ session: dbSession });

      // Update episode stats
      episode.stats.purchaseCount += 1;
      episode.stats.totalRevenue += effectivePrice;
      await episode.save({ session: dbSession });

      // Update novel stats
      novel.stats.totalRevenue += effectivePrice;
      await novel.save({ session: dbSession });

      // Commit transaction
      await dbSession.commitTransaction();

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
      await dbSession.abortTransaction();
      throw error;
    } finally {
      await dbSession.endSession();
    }

  } catch (error: any) {
    console.error('Purchase error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการซื้อตอน' },
      { status: 400 }
    );
  }
} 