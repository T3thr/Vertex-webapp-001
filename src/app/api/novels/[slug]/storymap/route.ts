// API Route: /api/novels/[slug]/storymap
// GET: Fetch StoryMap data
// POST: Create new StoryMap
// PUT: Update existing StoryMap
// DELETE: Delete StoryMap

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import StoryMapModel, { IStoryMap } from '@/backend/models/StoryMap';
import { validateNovelAccess } from './auth-helper';
import { Types } from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    // Get active StoryMap
    const storyMap = await StoryMapModel.findOne({
      novelId: novel!._id,
      isActive: true
    }).lean();

    if (!storyMap) {
      return NextResponse.json({ 
        storyMap: null,
        message: 'ไม่พบ StoryMap สำหรับนิยายนี้' 
      });
    }

    return NextResponse.json({ 
      storyMap: JSON.parse(JSON.stringify(storyMap)),
      success: true 
    });

  } catch (error) {
    console.error('[StoryMap GET] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล StoryMap' 
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    const body = await request.json();
    const { title, description, startNodeId, nodes = [], edges = [], storyVariables = [] } = body;

    // Validate required fields
    if (!title || !startNodeId) {
      return NextResponse.json({ 
        error: 'ข้อมูลไม่ครบถ้วน: ต้องมี title และ startNodeId' 
      }, { status: 400 });
    }

    // Check if active StoryMap already exists
    const existingStoryMap = await StoryMapModel.findOne({
      novelId: novel!._id,
      isActive: true
    });

    if (existingStoryMap) {
      return NextResponse.json({ 
        error: 'มี StoryMap ที่ใช้งานอยู่แล้ว ใช้ PUT เพื่ออัพเดต' 
      }, { status: 409 });
    }

    // Create new StoryMap
    const newStoryMap = new StoryMapModel({
      novelId: novel!._id,
      title,
      description,
      version: 1,
      nodes,
      edges,
      storyVariables,
      startNodeId,
      lastModifiedByUserId: new Types.ObjectId(session.user.id),
      isActive: true,
      editorMetadata: {
        zoomLevel: 1,
        viewOffsetX: 0,
        viewOffsetY: 0,
        gridSize: 20,
        showGrid: true,
        autoLayoutAlgorithm: 'dagre'
      }
    });

    await newStoryMap.save();

    return NextResponse.json({ 
      storyMap: JSON.parse(JSON.stringify(newStoryMap.toObject())),
      success: true,
      message: 'สร้าง StoryMap สำเร็จ'
    }, { status: 201 });

  } catch (error) {
    console.error('[StoryMap POST] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการสร้าง StoryMap' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    const body = await request.json();
    const { 
      title, 
      description, 
      nodes, 
      edges, 
      storyVariables, 
      startNodeId, 
      editorMetadata 
    } = body;

    // Find existing active StoryMap
    const existingStoryMap = await StoryMapModel.findOne({
      novelId: novel!._id,
      isActive: true
    });

    if (!existingStoryMap) {
      return NextResponse.json({ 
        error: 'ไม่พบ StoryMap ที่ใช้งานอยู่' 
      }, { status: 404 });
    }

    // Update StoryMap
    const updateData: Partial<IStoryMap> = {
      lastModifiedByUserId: new Types.ObjectId(session.user.id),
      version: existingStoryMap.version + 1,
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (nodes !== undefined) updateData.nodes = nodes;
    if (edges !== undefined) updateData.edges = edges;
    if (storyVariables !== undefined) updateData.storyVariables = storyVariables;
    if (startNodeId !== undefined) updateData.startNodeId = startNodeId;
    if (editorMetadata !== undefined) updateData.editorMetadata = editorMetadata;

    // Add edit history entry
    if (!existingStoryMap.editHistory) {
      existingStoryMap.editHistory = [];
    }
    existingStoryMap.editHistory.push({
      timestamp: new Date(),
      userId: new Types.ObjectId(session.user.id),
      operationType: 'update',
      description: 'Updated StoryMap via API',
      details: { fieldsChanged: Object.keys(updateData) }
    });

    const updatedStoryMap = await StoryMapModel.findByIdAndUpdate(
      existingStoryMap._id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({ 
      storyMap: JSON.parse(JSON.stringify(updatedStoryMap!.toObject())),
      success: true,
      message: 'อัพเดต StoryMap สำเร็จ'
    });

  } catch (error) {
    console.error('[StoryMap PUT] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการอัพเดต StoryMap' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    // Find and deactivate StoryMap instead of hard delete
    const storyMap = await StoryMapModel.findOne({
      novelId: novel!._id,
      isActive: true
    });

    if (!storyMap) {
      return NextResponse.json({ 
        error: 'ไม่พบ StoryMap ที่ใช้งานอยู่' 
      }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    storyMap.isActive = false;
    storyMap.lastModifiedByUserId = new Types.ObjectId(session.user.id);
    await storyMap.save();

    return NextResponse.json({ 
      success: true,
      message: 'ปิดการใช้งาน StoryMap สำเร็จ'
    });

  } catch (error) {
    console.error('[StoryMap DELETE] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการลบ StoryMap' 
    }, { status: 500 });
  }
}