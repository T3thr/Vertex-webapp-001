// src/app/api/novels/[slug]/episodes/[episodeId]/storymap/route.ts
// 🎯 API สำหรับโหลด StoryMap ตาม Episode

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import StoryMapModel from '@/backend/models/StoryMap';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { Types } from 'mongoose';

// 📝 GET /api/novels/[slug]/episodes/[episodeId]/storymap - โหลด StoryMap ตาม Episode
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    const { slug, episodeId } = await params;
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // ตรวจสอบ Novel
    const novel = await NovelModel.findOne({ slug }).lean();
    if (!novel) {
      return NextResponse.json({ 
        success: false, 
        error: 'Novel not found' 
      }, { status: 404 });
    }

    // ตรวจสอบ Episode
    const episode = await EpisodeModel.findOne({
      _id: new Types.ObjectId(episodeId),
      novelId: novel._id
    }).lean();

    if (!episode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Episode not found' 
      }, { status: 404 });
    }

    // โหลด StoryMap สำหรับ Episode นี้
    const storyMap = await StoryMapModel.findOne({
      novelId: novel._id,
      episodeId: new Types.ObjectId(episodeId),
      isActive: true
    }).lean();

    if (!storyMap) {
      return NextResponse.json({ 
        success: false, 
        error: 'StoryMap not found for this episode' 
      }, { status: 404 });
    }

    // ส่งกลับ StoryMap data
    return NextResponse.json({
      success: true,
      ...storyMap,
      episode: {
        _id: episode._id,
        title: episode.title,
        episodeOrder: episode.episodeOrder,
        status: episode.status
      }
    });

  } catch (error: any) {
    console.error('[Episode StoryMap API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}
