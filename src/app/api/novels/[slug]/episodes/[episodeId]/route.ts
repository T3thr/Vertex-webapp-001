// API Route: /api/novels/[slug]/episodes/[episodeId]
// GET: Fetch Episode data
// PUT: Update existing Episode
// DELETE: Delete Episode

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import EpisodeModel, { IEpisode } from '@/backend/models/Episode';
import { validateNovelAccess } from '../../storymap/auth-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    const { slug, episodeId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    // Get episode
    const episode = await EpisodeModel.findOne({
      _id: episodeId,
      novelId: novel!._id
    }).lean();

    if (!episode) {
      return NextResponse.json({ 
        error: 'ไม่พบตอนที่ระบุ' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      episode: JSON.parse(JSON.stringify(episode)),
      success: true 
    });

  } catch (error) {
    console.error('[Episode GET] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตอน' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    const { slug, episodeId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    const body = await request.json();

    // Find existing episode
    const existingEpisode = await EpisodeModel.findOne({
      _id: episodeId,
      novelId: novel!._id
    });

    if (!existingEpisode) {
      return NextResponse.json({ 
        error: 'ไม่พบตอนที่ระบุ' 
      }, { status: 404 });
    }

    // Update episode
    const updateData: Partial<IEpisode> = {
      ...body,
      updatedAt: new Date()
    };

    // Remove _id from updateData to prevent conflicts
    delete (updateData as any)._id;

    // Handle status changes
    if (updateData.status === 'published' && existingEpisode.status !== 'published') {
      updateData.publishedAt = new Date();
    }

    const updatedEpisode = await EpisodeModel.findByIdAndUpdate(
      episodeId,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({ 
      episode: JSON.parse(JSON.stringify(updatedEpisode!.toObject())),
      success: true,
      message: 'อัพเดตตอนสำเร็จ'
    });

  } catch (error) {
    console.error('[Episode PUT] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการอัพเดตตอน' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    const { slug, episodeId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    // Find and delete episode
    const episode = await EpisodeModel.findOne({
      _id: episodeId,
      novelId: novel!._id
    });

    if (!episode) {
      return NextResponse.json({ 
        error: 'ไม่พบตอนที่ระบุ' 
      }, { status: 404 });
    }

    await EpisodeModel.findByIdAndDelete(episodeId);

    return NextResponse.json({ 
      success: true,
      message: 'ลบตอนสำเร็จ'
    });

  } catch (error) {
    console.error('[Episode DELETE] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการลบตอน' 
    }, { status: 500 });
  }
}