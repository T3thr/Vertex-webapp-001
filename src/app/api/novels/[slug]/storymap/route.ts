// app/api/novels/[slug]/storymap/route.ts
// API สำหรับจัดการแผนผังเรื่อง (StoryMap) ของนิยาย
// รองรับการสร้าง อัปเดต และดึงข้อมูล StoryMap

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import StoryMapModel, { StoryMapNodeType } from '@/backend/models/StoryMap';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Define the context type for route handlers to ensure correctness.
type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

/**
 * GET - ดึงข้อมูล StoryMap ของนิยาย
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { slug } = await context.params; // Await the params promise
  try {
    console.log(`🔍 [StoryMap API] GET request for novel slug: ${slug}`);

    // ตรวจสอบ session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ [StoryMap API] Unauthorized - No session');
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    await dbConnect();

    // ค้นหานิยายจาก slug
    const novel = await NovelModel.findOne({ 
      slug: slug,
      isDeleted: { $ne: true }
    }).lean();

    if (!novel) {
      console.log(`❌ [StoryMap API] Novel not found for slug: ${slug}`);
      return NextResponse.json(
        { error: 'ไม่พบนิยายที่ระบุ' },
        { status: 404 }
      );
    }

    // ตรวจสอบสิทธิ์ - เฉพาะเจ้าของนิยาย
    if (novel.author.toString() !== session.user.id) {
      console.log(`❌ [StoryMap API] Access denied for user ${session.user.id} on novel ${novel._id}`);
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์เข้าถึงนิยายนี้' },
        { status: 403 }
      );
    }

    // ค้นหา StoryMap ที่ active
    const storyMap = await StoryMapModel.findOne({
      novelId: novel._id,
      isActive: true
    }).lean();

    if (!storyMap) {
      console.log(`📝 [StoryMap API] No active StoryMap found for novel ${novel._id}, returning empty structure`);
      // ส่งคืนโครงสร้างเปล่าแทนการ error
      return NextResponse.json({
        success: true,
        data: {
          _id: null,
          nodes: [],
          edges: [],
          storyVariables: [],
          startNodeId: null
        }
      });
    }

    console.log(`✅ [StoryMap API] StoryMap found for novel ${novel._id}`);
    return NextResponse.json({
      success: true,
      data: {
        _id: storyMap._id,
        nodes: storyMap.nodes || [],
        edges: storyMap.edges || [],
        storyVariables: storyMap.storyVariables || [],
        startNodeId: storyMap.startNodeId
      }
    });

  } catch (error: any) {
    console.error('❌ [StoryMap API] GET Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * POST - สร้างหรืออัปเดต StoryMap
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { slug } = await context.params; // Await the params promise
  try {
    console.log(`📝 [StoryMap API] POST request for novel slug: ${slug}`);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ [StoryMap API] Unauthorized - No session');
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    // Body can be empty for creation, so we handle it gracefully.
    let body;
    try {
        body = await request.json();
    } catch (e) {
        body = {}; // Default to an empty object if body is missing or malformed
    }
    
    const { 
      nodes: customNodes, 
      edges: customEdges, 
      storyVariables: customStoryVariables, 
      startNodeId: customStartNodeId 
    } = body || {};

    console.log(`📊 [StoryMap API] Received data: ${customNodes?.length || 0} nodes, ${customEdges?.length || 0} edges`);

    await dbConnect();

    const novel = await NovelModel.findOne({ 
      slug: slug,
      isDeleted: { $ne: true }
    }); // Use full model instance to get title

    if (!novel) {
      console.log(`❌ [StoryMap API] Novel not found for slug: ${slug}`);
      return NextResponse.json(
        { error: 'ไม่พบนิยายที่ระบุ' },
        { status: 404 }
      );
    }

    if (novel.author.toString() !== session.user.id) {
      console.log(`❌ [StoryMap API] Access denied for user ${session.user.id} on novel ${novel._id}`);
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์แก้ไขนิยายนี้' },
        { status: 403 }
      );
    }

    const existingStoryMap = await StoryMapModel.findOne({
      novelId: novel._id,
      isActive: true
    });

    if (existingStoryMap) {
      // Logic for updating an existing StoryMap
      console.log(`🔄 [StoryMap API] Updating existing StoryMap ${existingStoryMap._id}`);
      
      existingStoryMap.nodes = customNodes ?? existingStoryMap.nodes;
      existingStoryMap.edges = customEdges ?? existingStoryMap.edges;
      existingStoryMap.storyVariables = customStoryVariables ?? existingStoryMap.storyVariables;
      existingStoryMap.startNodeId = customStartNodeId ?? existingStoryMap.startNodeId;
      existingStoryMap.lastModifiedByUserId = new mongoose.Types.ObjectId(session.user.id);
      
      // Only increment version if there are actual changes
      if (customNodes || customEdges || customStoryVariables || customStartNodeId) {
        existingStoryMap.version = (existingStoryMap.version || 1) + 1;
      }

      await existingStoryMap.save();
      
      console.log(`✅ [StoryMap API] StoryMap updated successfully, version: ${existingStoryMap.version}`);
      
      return NextResponse.json({
        success: true,
        message: 'อัปเดตแผนผังเรื่องสำเร็จ',
        data: existingStoryMap,
      });

    } else {
      // Logic for creating a new StoryMap
      console.log(`🆕 [StoryMap API] Creating new StoryMap for novel ${novel._id}`);
      
      // Create a default start node to ensure the storymap is valid
      const startNodeId = uuidv4();
      const defaultNodes = [
        {
          nodeId: startNodeId,
          nodeType: StoryMapNodeType.START_NODE,
          title: 'จุดเริ่มต้น',
          position: { x: 250, y: 150 },
          nodeSpecificData: {},
        }
      ];
      
      const newStoryMap = new StoryMapModel({
        novelId: novel._id,
        title: `แผนผังเรื่อง - ${novel.title}`,
        version: 1,
        nodes: defaultNodes,
        edges: [],
        storyVariables: [],
        startNodeId: startNodeId, // Set the ID of the created start node
        lastModifiedByUserId: new mongoose.Types.ObjectId(session.user.id),
        isActive: true,
        editorMetadata: {
          zoomLevel: 1,
          viewOffsetX: 0,
          viewOffsetY: 0,
          gridSize: 20,
          showGrid: true
        }
      });

      await newStoryMap.save();
      
      console.log(`✅ [StoryMap API] New StoryMap created with ID: ${newStoryMap._id}`);
      
      return NextResponse.json({
        success: true,
        message: 'สร้างแผนผังเรื่องสำเร็จ',
        data: newStoryMap,
      }, { status: 201 });
    }

  } catch (error: any) {
    console.error('❌ [StoryMap API] POST Error:', error);
    
    // ตรวจสอบ validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * PUT - อัปเดต StoryMap เฉพาะส่วน (partial update)
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const { slug } = await context.params; // Await the params promise
  try {
    console.log(`🔄 [StoryMap API] PUT request for novel slug: ${slug}`);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { operation, data } = body;

    await dbConnect();

    // ค้นหานิยาย
    const novel = await NovelModel.findOne({ 
      slug: slug,
      isDeleted: { $ne: true }
    }).lean();

    if (!novel) {
      return NextResponse.json(
        { error: 'ไม่พบนิยายที่ระบุ' },
        { status: 404 }
      );
    }

    // ตรวจสอบสิทธิ์
    if (novel.author.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์แก้ไขนิยายนี้' },
        { status: 403 }
      );
    }

    // ค้นหา StoryMap
    const storyMap = await StoryMapModel.findOne({
      novelId: novel._id,
      isActive: true
    });

    if (!storyMap) {
      return NextResponse.json(
        { error: 'ไม่พบแผนผังเรื่องของนิยายนี้' },
        { status: 404 }
      );
    }

    // ดำเนินการตาม operation
    switch (operation) {
      case 'add_node':
        if (data.node) {
          storyMap.nodes.push(data.node);
          console.log(`➕ [StoryMap API] Added node: ${data.node.nodeId}`);
        }
        break;

      case 'update_node':
        if (data.nodeId && data.updates) {
          const nodeIndex = storyMap.nodes.findIndex(n => n.nodeId === data.nodeId);
          if (nodeIndex !== -1) {
            Object.assign(storyMap.nodes[nodeIndex], data.updates);
            console.log(`🔄 [StoryMap API] Updated node: ${data.nodeId}`);
          }
        }
        break;

      case 'delete_node':
        if (data.nodeId) {
          storyMap.nodes = storyMap.nodes.filter(n => n.nodeId !== data.nodeId);
          // ลบ edges ที่เกี่ยวข้องด้วย
          storyMap.edges = storyMap.edges.filter(e => 
            e.sourceNodeId !== data.nodeId && e.targetNodeId !== data.nodeId
          );
          console.log(`🗑️ [StoryMap API] Deleted node: ${data.nodeId}`);
        }
        break;

      case 'add_edge':
        if (data.edge) {
          storyMap.edges.push(data.edge);
          console.log(`➕ [StoryMap API] Added edge: ${data.edge.edgeId}`);
        }
        break;

      case 'delete_edge':
        if (data.edgeId) {
          storyMap.edges = storyMap.edges.filter(e => e.edgeId !== data.edgeId);
          console.log(`🗑️ [StoryMap API] Deleted edge: ${data.edgeId}`);
        }
        break;

      case 'update_metadata':
        if (data.metadata) {
          storyMap.editorMetadata = { ...storyMap.editorMetadata, ...data.metadata };
          console.log(`🔄 [StoryMap API] Updated metadata`);
        }
        break;
        
      case 'update_nodes_positions':
        if (data.nodes && Array.isArray(data.nodes)) {
          // อัปเดตตำแหน่ง Node แบบ debounce
          const updatedNodes = data.nodes as { nodeId: string, position: { x: number, y: number }}[];
          
          // อัปเดตเฉพาะตำแหน่งของ Node ที่มีอยู่แล้ว
          storyMap.nodes = storyMap.nodes.map(existingNode => {
            const updatedNode = updatedNodes.find(n => n.nodeId === existingNode.nodeId);
            if (updatedNode && updatedNode.position) {
              return {
                ...existingNode,
                position: updatedNode.position
              };
            }
            return existingNode;
          });
          
          console.log(`🔄 [StoryMap API] Updated positions for ${updatedNodes.length} nodes`);
        }
        break;

      default:
        return NextResponse.json(
          { error: 'การดำเนินการไม่ถูกต้อง' },
          { status: 400 }
        );
    }

    // บันทึกการเปลี่ยนแปลง
    storyMap.lastModifiedByUserId = new mongoose.Types.ObjectId(session.user.id);
    await storyMap.save();

    return NextResponse.json({
      success: true,
      message: 'อัปเดตแผนผังเรื่องสำเร็จ',
      data: {
        operation,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ [StoryMap API] PUT Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - ลบ StoryMap (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const { slug } = await context.params; // Await the params promise
  try {
    console.log(`🗑️ [StoryMap API] DELETE request for novel slug: ${slug}`);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    await dbConnect();

    // ค้นหานิยาย
    const novel = await NovelModel.findOne({ 
      slug: slug,
      isDeleted: { $ne: true }
    }).lean();

    if (!novel) {
      return NextResponse.json(
        { error: 'ไม่พบนิยายที่ระบุ' },
        { status: 404 }
      );
    }

    // ตรวจสอบสิทธิ์
    if (novel.author.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์ลบแผนผังเรื่องของนิยายนี้' },
        { status: 403 }
      );
    }

    // ทำ soft delete โดยการตั้ง isActive เป็น false
    const result = await StoryMapModel.updateMany(
      { novelId: novel._id, isActive: true },
      { 
        $set: { 
          isActive: false,
          lastModifiedByUserId: new mongoose.Types.ObjectId(session.user.id)
        }
      }
    );

    console.log(`✅ [StoryMap API] Soft deleted ${result.modifiedCount} StoryMaps for novel ${novel._id}`);

    return NextResponse.json({
      success: true,
      message: 'ลบแผนผังเรื่องสำเร็จ',
      data: {
        deletedCount: result.modifiedCount
      }
    });

  } catch (error: any) {
    console.error('❌ [StoryMap API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบข้อมูล' },
      { status: 500 }
    );
  }
}