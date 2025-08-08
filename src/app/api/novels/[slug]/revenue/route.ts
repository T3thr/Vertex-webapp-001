// app/api/novels/[slug]/revenue/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import PurchaseModel from '@/backend/models/Purchase';
import PaymentModel from '@/backend/models/Payment';
import { Types } from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    await dbConnect();
    const novel = await NovelModel.findOne({ slug: decodedSlug, author: session.user.id, isDeleted: { $ne: true } }).select('_id title author stats').lean();
    if (!novel) {
      return NextResponse.json({ success: false, error: 'ไม่พบนิยาย' }, { status: 404 });
    }

    const novelId = new Types.ObjectId(novel._id);

    // Aggregate purchases related to this novel's episodes
    const purchases = await PurchaseModel.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.itemType': 'novel_episode', status: { $in: ['completed', 'partially_refunded'] } } },
      {
        $lookup: {
          from: 'episodes',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'episode',
        },
      },
      { $unwind: '$episode' },
      { $match: { 'episode.novelId': novelId } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$finalAmount' },
          totalItems: { $sum: '$items.quantity' },
          purchasesCount: { $sum: 1 },
        },
      },
    ]);

    // Aggregate payments for those purchases (rough summary)
    const payments = await PaymentModel.aggregate([
      { $match: { paymentForType: { $in: ['purchase_order'] }, status: { $in: ['succeeded', 'partially_refunded', 'refunded'] } } },
      {
        $group: {
          _id: '$currency',
          amount: { $sum: '$amount' },
          netAmount: { $sum: '$netAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      revenue: {
        purchasesSummary: purchases[0] || { totalAmount: 0, totalItems: 0, purchasesCount: 0 },
        paymentsByCurrency: payments,
      },
    });
  } catch (error) {
    console.error('[API] Novel Revenue Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


