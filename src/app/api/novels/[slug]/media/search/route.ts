// app/api/novels/[slug]/media/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import MediaModel from '@/backend/models/Media';
import OfficialMediaModel from '@/backend/models/OfficialMedia';

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

    const novel = await NovelModel.findOne({ slug: decodedSlug, author: session.user.id, isDeleted: { $ne: true } }).select('_id');
    if (!novel) {
      return NextResponse.json({ success: false, error: 'ไม่พบนิยาย' }, { status: 404 });
    }

    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim() || '';
    const mediaType = url.searchParams.get('mediaType') || undefined;
    const mediaSubType = url.searchParams.get('mediaSubType') || undefined;
    const source = url.searchParams.get('source') || 'all'; // user|official|all
    const limit = Math.min(Number(url.searchParams.get('limit') || 20), 50);

    const filters: any = {};
    if (mediaType) filters.mediaType = mediaType;
    if (mediaSubType) filters.mediaSubType = mediaSubType;

    const queries: Promise<any[]>[] = [];
    if (source === 'all' || source === 'user') {
      queries.push(
        MediaModel.find({
          userId: session.user.id,
          status: 'available',
          isDeleted: { $ne: true },
          ...(q ? { 'metadata.title': { $regex: q, $options: 'i' } } : {}),
          ...filters,
        })
          .limit(limit)
          .lean()
      );
    }
    if (source === 'all' || source === 'official') {
      queries.push(
        OfficialMediaModel.find({
          status: { $in: ['approved_for_library', 'processing'] },
          ...(q ? { 'metadata.title': { $regex: q, $options: 'i' } } : {}),
          ...filters,
        })
          .limit(limit)
          .lean()
      );
    }

    const results = await Promise.all(queries);
    const [userMedia = [], officialMedia = []] = results.length === 2 ? results : [results[0] || [], []];

    return NextResponse.json({ success: true, userMedia, officialMedia });
  } catch (error) {
    console.error('[API] Media Search Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


