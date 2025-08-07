// src/app/api/novels/[slug]/storymap/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import StoryMapModel from '@/backend/models/StoryMap';

// GET - ดึงข้อมูล StoryMap
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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

    // ดึงข้อมูล StoryMap
    const storyMap = await StoryMapModel.findOne({
      novelId: novel._id,
      isActive: true
    }).lean();

    return NextResponse.json({
      success: true,
      data: storyMap
    });

  } catch (error) {
    console.error('Error fetching StoryMap:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - อัปเดต StoryMap
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nodes, edges, editorMetadata } = body;

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

    // อัปเดต StoryMap
    const updatedStoryMap = await StoryMapModel.findOneAndUpdate(
      {
        novelId: novel._id,
        isActive: true
      },
      {
        $set: {
          nodes: nodes || [],
          edges: edges || [],
          editorMetadata: editorMetadata || {},
          lastModifiedByUserId: session.user.id,
          version: { $inc: 1 }
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedStoryMap
    });

  } catch (error) {
    console.error('Error updating StoryMap:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - สร้าง Node ใหม่
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nodeType, title, position, nodeSpecificData } = body;

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

    // สร้าง Node ใหม่
    const newNode = {
      nodeId: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodeType,
      title: title || `${nodeType} Node`,
      position: position || { x: 100, y: 100 },
      nodeSpecificData: nodeSpecificData || {},
      notesForAuthor: '',
      authorDefinedEmotionTags: [],
      authorDefinedPsychologicalImpact: 0,
      lastEdited: new Date(),
      editorVisuals: {
        color: '#3B82F6',
        icon: 'default',
        zIndex: 1
      }
    };

    // เพิ่ม Node ลงใน StoryMap
    const updatedStoryMap = await StoryMapModel.findOneAndUpdate(
      {
        novelId: novel._id,
        isActive: true
      },
      {
        $push: { nodes: newNode },
        $set: {
          lastModifiedByUserId: session.user.id,
          version: { $inc: 1 }
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        node: newNode,
        storyMap: updatedStoryMap
      }
    });

  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}