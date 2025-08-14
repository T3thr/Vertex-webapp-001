// app/api/novels/[slug]/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import StoryMapModel from '@/backend/models/StoryMap';

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
    const novel = await NovelModel.findOne({ slug: decodedSlug, author: session.user.id, isDeleted: { $ne: true } }).lean();
    if (!novel) {
      return NextResponse.json({ success: false, error: 'ไม่พบนิยาย' }, { status: 404 });
    }

    const storyMap = await StoryMapModel.findOne({ novelId: novel._id, isActive: true }).select('analyticsSummary').lean();

    const stats = novel.stats || {};
    const analytics = {
      viewsCount: stats.viewsCount || 0,
      uniqueViewersCount: stats.uniqueViewersCount || 0,
      likesCount: stats.likesCount || 0,
      commentsCount: stats.commentsCount || 0,
      bookmarksCount: stats.bookmarksCount || 0,
      averageRating: stats.averageRating || 0,
      totalWords: stats.totalWords || 0,
      completionRate: stats.completionRate || 0,
      purchasesCount: stats.purchasesCount || 0,
      trending: stats.trendingStats || null,
      pathAnalytics: storyMap?.analyticsSummary || null,
    };

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    console.error('[API] Novel Analytics Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


