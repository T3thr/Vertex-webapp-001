import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import PurchaseModel from '@/backend/models/Purchase';
import PaymentModel from '@/backend/models/Payment';
import UserModel from '@/backend/models/User';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import mongoose, { Types } from 'mongoose';

// GET - Check episode access
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    await dbConnect();
    const { slug, episodeId } = await params;
    
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Find novel and episode
    const novel = await NovelModel.findOne({ 
      slug, 
      isDeleted: { $ne: true }
    }).select('_id').lean();

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    const episode = await EpisodeModel.findOne({
      _id: episodeId,
      novelId: novel._id,
      status: 'published'
    }).lean();

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    // Get pricing info
    const episodeDoc = await EpisodeModel.hydrate(episode);
    const effectivePrice = await episodeDoc.getEffectivePrice();
    const originalPrice = await episodeDoc.getOriginalPrice();

    // Check if free
    const isFree = episode.accessType === 'free' || effectivePrice === 0;
    
    // Check ownership if user is logged in
    let isOwned = false;
    let userCoins = 0;
    
    if (userId) {
      // Check purchase history
      const purchase = await PurchaseModel.findOne({
        userId,
        'items.itemType': 'novel_episode',
        'items.itemId': episodeId,
        status: 'completed'
      }).lean();
      
      isOwned = !!purchase;
      
      // Get user coin balance
      const user = await UserModel.findById(userId).select('gamification.coinBalance').lean();
      userCoins = user?.gamification?.coinBalance || 0;
    }

    const hasAccess = isFree || isOwned;
    const canPurchase = !hasAccess && userId && userCoins >= effectivePrice;

    return NextResponse.json({
      episode: {
        _id: episode._id.toString(),
        title: episode.title,
        accessType: episode.accessType,
        effectivePrice,
        originalPrice,
        hasPromotion: originalPrice > effectivePrice
      },
      access: {
        hasAccess,
        isFree,
        isOwned,
        canPurchase,
        requiresLogin: !userId && !isFree
      },
      user: userId ? {
        coinBalance: userCoins,
        coinsNeeded: Math.max(0, effectivePrice - userCoins)
      } : null
    });

  } catch (error) {
    console.error('Error checking episode access:', error);
    return NextResponse.json(
      { error: 'Failed to check episode access' },
      { status: 500 }
    );
  }
}

// POST - Purchase episode
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    await dbConnect();
    const { slug, episodeId } = await params;
    
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Find novel and episode
    const novel = await NovelModel.findOne({ 
      slug, 
      isDeleted: { $ne: true }
    }).select('_id title author').lean();

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    const episode = await EpisodeModel.findOne({
      _id: episodeId,
      novelId: novel._id,
      status: 'published'
    }).lean();

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    // Check if already owned
    const existingPurchase = await PurchaseModel.findOne({
      userId,
      'items.itemType': 'novel_episode',
      'items.itemId': episodeId,
      status: 'completed'
    }).lean();

    if (existingPurchase) {
      return NextResponse.json({ error: 'Episode already owned' }, { status: 400 });
    }

    // Get pricing and check if free
    const episodeDoc = await EpisodeModel.hydrate(episode);
    const effectivePrice = await episodeDoc.getEffectivePrice();
    
    if (effectivePrice === 0) {
      return NextResponse.json({ error: 'Episode is free' }, { status: 400 });
    }

    // Check user coin balance
    const user = await UserModel.findById(userId).select('gamification.coinBalance').lean();
    const userCoins = user?.gamification?.coinBalance || 0;

    if (userCoins < effectivePrice) {
      return NextResponse.json({ 
        error: 'Insufficient coins',
        required: effectivePrice,
        current: userCoins
      }, { status: 400 });
    }

    // Start transaction
    const mongooseSession = await mongoose.startSession();
    mongooseSession.startTransaction();

    try {
      // Create purchase record
      const purchase = await PurchaseModel.create([{
        purchaseReadableId: `EP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: new Types.ObjectId(userId),
        items: [{
          itemId: new Types.ObjectId(episodeId),
          itemType: 'novel_episode',
          title: `${novel.title} - ${episode.title}`,
          quantity: 1,
          unitPrice: effectivePrice,
          currency: 'COIN',
          subtotal: effectivePrice,
          sellerId: novel.author
        }],
        totalAmount: effectivePrice,
        finalAmount: effectivePrice,
        finalCurrency: 'COIN',
        status: 'completed',
        purchasedAt: new Date()
      }], { session: mongooseSession });

      // Deduct coins from user
      await UserModel.findByIdAndUpdate(
        userId,
        { 
          $inc: { 'gamification.coinBalance': -effectivePrice },
          $push: { 
            'gamification.coinTransactionHistory': {
              transactionType: 'purchase',
              amount: -effectivePrice,
              description: `Purchased episode: ${episode.title}`,
              relatedPurchaseId: purchase[0]._id,
              timestamp: new Date()
            }
          }
        },
        { session: mongooseSession }
      );

      // Update episode stats
      await EpisodeModel.findByIdAndUpdate(
        episodeId,
        { $inc: { 'stats.purchasesCount': 1 } },
        { session: mongooseSession }
      );

      await mongooseSession.commitTransaction();

      return NextResponse.json({
        success: true,
        purchase: {
          _id: purchase[0]._id.toString(),
          purchaseReadableId: purchase[0].purchaseReadableId,
          amount: effectivePrice,
          purchasedAt: purchase[0].purchasedAt
        },
        newCoinBalance: userCoins - effectivePrice
      });

    } catch (error) {
      await mongooseSession.abortTransaction();
      throw error;
    } finally {
      mongooseSession.endSession();
    }

  } catch (error) {
    console.error('Error purchasing episode:', error);
    return NextResponse.json(
      { error: 'Failed to purchase episode' },
      { status: 500 }
    );
  }
} 