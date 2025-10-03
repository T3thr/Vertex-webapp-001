// 🎯 API สำหรับดึง StoryMap ของแต่ละ Episode
// GET /api/novels/[slug]/episodes/[episodeId]/storymap

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import StoryMapModel from '@/backend/models/StoryMap';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { Types } from 'mongoose';

// 📝 GET /api/novels/[slug]/episodes/[episodeId]/storymap - ดึง StoryMap ของ Episode
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
    const novel = await NovelModel.findOne({ 
      slug,
      isDeleted: { $ne: true }
    }).select('_id author coAuthors');

    if (!novel) {
      return NextResponse.json({ 
        success: false, 
        error: 'Novel not found' 
      }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    const userId = new Types.ObjectId(session.user.id);
    const isAuthor = novel.author.toString() === userId.toString();
    const isCoAuthor = novel.coAuthors?.some((coAuthor: any) => 
      coAuthor.userId.toString() === userId.toString()
    );

    if (!isAuthor && !isCoAuthor) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied' 
      }, { status: 403 });
    }

    // ตรวจสอบ Episode
    const episode = await EpisodeModel.findOne({
      _id: new Types.ObjectId(episodeId),
      novelId: novel._id
    }).select('_id title episodeOrder status');

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
      console.log(`[Episode StoryMap GET] StoryMap not found for episode ${episodeId}, creating empty structure`);
      
      // Return empty storymap structure with start node
      return NextResponse.json({
        success: true,
        nodes: [],
        edges: [],
        storyVariables: [],
        editorMetadata: {
          zoomLevel: 1,
          viewOffsetX: 0,
          viewOffsetY: 0,
          gridSize: 20,
          showGrid: true,
          showSceneThumbnails: false,
          showNodeLabels: true
        },
        version: 1,
        episode: {
          _id: episode._id,
          title: episode.title,
          episodeOrder: episode.episodeOrder,
          status: episode.status
        }
      });
    }

    // ส่งกลับ StoryMap data
    return NextResponse.json({
      success: true,
      _id: storyMap._id,
      nodes: storyMap.nodes || [],
      edges: storyMap.edges || [],
      storyVariables: storyMap.storyVariables || [],
      editorMetadata: storyMap.editorMetadata || {},
      version: storyMap.version || 1,
      lastModifiedAt: storyMap.updatedAt,
      episode: {
        _id: episode._id,
        title: episode.title,
        episodeOrder: episode.episodeOrder,
        status: episode.status
      }
    });

  } catch (error: any) {
    console.error('[Episode StoryMap Get API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}