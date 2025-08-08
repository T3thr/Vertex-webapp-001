// API Route: /api/novels/[slug]/scenes/[sceneId]
// GET: Fetch Scene data
// PUT: Update existing Scene
// DELETE: Delete Scene

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import SceneModel, { IScene } from '@/backend/models/Scene';
import { validateNovelAccess } from '../../storymap/auth-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const { slug, sceneId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    // Get scene
    const scene = await SceneModel.findOne({
      _id: sceneId,
      novelId: novel!._id
    }).lean();

    if (!scene) {
      return NextResponse.json({ 
        error: 'ไม่พบฉากที่ระบุ' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      scene: JSON.parse(JSON.stringify(scene)),
      success: true 
    });

  } catch (error) {
    console.error('[Scene GET] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลฉาก' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const { slug, sceneId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    const body = await request.json();

    // Find existing scene
    const existingScene = await SceneModel.findOne({
      _id: sceneId,
      novelId: novel!._id
    });

    if (!existingScene) {
      return NextResponse.json({ 
        error: 'ไม่พบฉากที่ระบุ' 
      }, { status: 404 });
    }

    // Update scene
    const updateData: Partial<IScene> = {
      ...body,
      updatedAt: new Date()
    };

    // Remove _id from updateData to prevent conflicts
    delete (updateData as any)._id;

    const updatedScene = await SceneModel.findByIdAndUpdate(
      sceneId,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({ 
      scene: JSON.parse(JSON.stringify(updatedScene!.toObject())),
      success: true,
      message: 'อัพเดตฉากสำเร็จ'
    });

  } catch (error) {
    console.error('[Scene PUT] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการอัพเดตฉาก' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const { slug, sceneId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    // Find and delete scene
    const scene = await SceneModel.findOne({
      _id: sceneId,
      novelId: novel!._id
    });

    if (!scene) {
      return NextResponse.json({ 
        error: 'ไม่พบฉากที่ระบุ' 
      }, { status: 404 });
    }

    await SceneModel.findByIdAndDelete(sceneId);

    return NextResponse.json({ 
      success: true,
      message: 'ลบฉากสำเร็จ'
    });

  } catch (error) {
    console.error('[Scene DELETE] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการลบฉาก' 
    }, { status: 500 });
  }
}