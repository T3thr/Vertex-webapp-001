// src/app/api/novels/[slug]/scenes/[sceneId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import SceneModel from '@/backend/models/Scene';

// GET - ดึงข้อมูลฉาก
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const { slug, sceneId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // ตรวจสอบสิทธิ์ในการเข้าถึงนิยาย
    const novel = await NovelModel.findOne({
      slug: decodeURIComponent(slug),
      author: session.user.id,
      isDeleted: { $ne: true }
    });

    if (!novel) {
      return NextResponse.json(
        { error: 'Novel not found' },
        { status: 404 }
      );
    }

    // ดึงข้อมูลฉาก
    const scene = await SceneModel.findOne({
      _id: sceneId,
      novelId: novel._id
    }).lean();

    if (!scene) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: scene
    });

  } catch (error) {
    console.error('Error fetching scene:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตฉาก
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const { slug, sceneId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    await dbConnect();

    // ตรวจสอบสิทธิ์ในการเข้าถึงนิยาย
    const novel = await NovelModel.findOne({
      slug: decodeURIComponent(slug),
      author: session.user.id,
      isDeleted: { $ne: true }
    });

    if (!novel) {
      return NextResponse.json(
        { error: 'Novel not found' },
        { status: 404 }
      );
    }

    // อัปเดตฉาก
    const updatedScene = await SceneModel.findOneAndUpdate(
      {
        _id: sceneId,
        novelId: novel._id
      },
      {
        $set: {
          ...body,
          updatedAt: new Date()
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedScene) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedScene
    });

  } catch (error) {
    console.error('Error updating scene:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - เพิ่ม Element ลงในฉาก
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const { slug, sceneId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { elementType, elementData } = body;

    await dbConnect();

    // ตรวจสอบสิทธิ์ในการเข้าถึงนิยาย
    const novel = await NovelModel.findOne({
      slug: decodeURIComponent(slug),
      author: session.user.id,
      isDeleted: { $ne: true }
    });

    if (!novel) {
      return NextResponse.json(
        { error: 'Novel not found' },
        { status: 404 }
      );
    }

    // สร้าง Element ใหม่
    const newElement = {
      instanceId: `${elementType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...elementData,
      transform: {
        positionX: elementData.transform?.positionX || 0,
        positionY: elementData.transform?.positionY || 0,
        scaleX: elementData.transform?.scaleX || 1,
        scaleY: elementData.transform?.scaleY || 1,
        rotation: elementData.transform?.rotation || 0,
        opacity: elementData.transform?.opacity || 1,
        zIndex: elementData.transform?.zIndex || 1,
        ...elementData.transform
      },
      isVisible: elementData.isVisible !== false
    };

    let updateField = '';
    switch (elementType) {
      case 'character':
        updateField = 'characters';
        break;
      case 'text':
        updateField = 'textContents';
        break;
      case 'image':
        updateField = 'images';
        break;
      case 'video':
        updateField = 'videos';
        break;
      case 'audio':
        updateField = 'audios';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid element type' },
          { status: 400 }
        );
    }

    // เพิ่ม Element ลงในฉาก
    const updatedScene = await SceneModel.findOneAndUpdate(
      {
        _id: sceneId,
        novelId: novel._id
      },
      {
        $push: { [updateField]: newElement },
        $set: { updatedAt: new Date() }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedScene) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        element: newElement,
        scene: updatedScene
      }
    });

  } catch (error) {
    console.error('Error adding element to scene:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - ลบ Element จากฉาก
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const { slug, sceneId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const elementId = searchParams.get('elementId');
    const elementType = searchParams.get('elementType');

    if (!elementId || !elementType) {
      return NextResponse.json(
        { error: 'Element ID and type are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // ตรวจสอบสิทธิ์ในการเข้าถึงนิยาย
    const novel = await NovelModel.findOne({
      slug: decodeURIComponent(slug),
      author: session.user.id,
      isDeleted: { $ne: true }
    });

    if (!novel) {
      return NextResponse.json(
        { error: 'Novel not found' },
        { status: 404 }
      );
    }

    let updateField = '';
    switch (elementType) {
      case 'character':
        updateField = 'characters';
        break;
      case 'text':
        updateField = 'textContents';
        break;
      case 'image':
        updateField = 'images';
        break;
      case 'video':
        updateField = 'videos';
        break;
      case 'audio':
        updateField = 'audios';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid element type' },
          { status: 400 }
        );
    }

    // ลบ Element จากฉาก
    const updatedScene = await SceneModel.findOneAndUpdate(
      {
        _id: sceneId,
        novelId: novel._id
      },
      {
        $pull: { [updateField]: { instanceId: elementId } },
        $set: { updatedAt: new Date() }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedScene) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedScene
    });

  } catch (error) {
    console.error('Error deleting element from scene:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}