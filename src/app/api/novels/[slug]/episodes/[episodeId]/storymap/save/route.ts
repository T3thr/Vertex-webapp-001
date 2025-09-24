// src/app/api/novels/[slug]/episodes/[episodeId]/storymap/save/route.ts
// 🎯 Episode-specific StoryMap Save API
// Professional-grade save endpoint for episode-specific content

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import StoryMapModel from '@/backend/models/StoryMap';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { Types } from 'mongoose';

interface SaveStoryMapRequest {
  nodes: any[];
  edges: any[];
  storyVariables: any[];
  version?: number;
}

// 📝 POST /api/novels/[slug]/episodes/[episodeId]/storymap/save
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    const { slug, episodeId } = await params;
    console.log(`[Episode StoryMap Save API] 🎯 Saving StoryMap for episode: ${episodeId}`);
    
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // ตรวจสอบ Novel และสิทธิ์
    const novel = await NovelModel.findOne({ 
      slug,
      isDeleted: { $ne: true }
    }).select('_id author coAuthors title');

    if (!novel) {
      return NextResponse.json({ 
        success: false, 
        error: 'Novel not found' 
      }, { status: 404 });
    }

    const userId = new Types.ObjectId(session.user.id);
    const isAuthor = novel.author.toString() === userId.toString();
    const isCoAuthor = novel.coAuthors?.some((coAuthor: any) => 
      coAuthor.userId?.toString() === userId.toString()
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

    // Parse request body
    const body: SaveStoryMapRequest = await request.json();
    const { nodes = [], edges = [], storyVariables = [], version } = body;

    console.log(`[Episode StoryMap Save API] 📊 Received data:`, {
      episodeId,
      episodeTitle: episode.title,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      variableCount: storyVariables.length,
      requestedVersion: version
    });

    // 🔥 CRITICAL: ทำความสะอาดและตรวจสอบ storyVariables - ENHANCED with variableName deduplication
    const usedVariableIds = new Set<string>();
    const usedVariableNames = new Set<string>();
    const timestamp = Date.now();
    const sessionId = Math.random().toString(36).substr(2, 12);

    const cleanedStoryVariables = storyVariables
      .filter(variable => {
        // กรองตัวแปรที่ไม่ถูกต้อง
        if (!variable) return false;
        if (!variable.variableName && !variable.name) return false;
        // 🔥 ENHANCED: Filter out invalid IDs more thoroughly
        const id = String(variable.variableId || '').trim();
        if (!id || id === 'null' || id === 'undefined' || id === 'NaN' || id === '') return false;
        return true;
      })
      .map((variable, index) => {
        let uniqueId = String(variable.variableId).trim();
        let uniqueName = String(variable.variableName || variable.name || `Variable_${index + 1}`).trim();

        // 🔥 CRITICAL: ตรวจสอบและแก้ไข duplicate IDs
        if (usedVariableIds.has(uniqueId)) {
          const randomSuffix = Math.random().toString(36).substr(2, 9);
          uniqueId = `var_${timestamp}_${sessionId}_${index}_${randomSuffix}`;
          console.warn(`[Episode StoryMap Save] ⚠️ Duplicate variableId detected, regenerated: ${uniqueId}`);
        }
        usedVariableIds.add(uniqueId);

        // 🔥 ENHANCED: ตรวจสอบและแก้ไข duplicate variable names (ตามมาตรฐาน MongoDB validation)
        if (usedVariableNames.has(uniqueName)) {
          let counter = 2;
          let newName = `${uniqueName}_${counter}`;
          while (usedVariableNames.has(newName)) {
            counter++;
            newName = `${uniqueName}_${counter}`;
          }
          uniqueName = newName;
          console.warn(`[Episode StoryMap Save] ⚠️ Duplicate variableName detected, renamed to: ${uniqueName}`);
        }
        usedVariableNames.add(uniqueName);

        return {
          variableId: uniqueId,
          variableName: uniqueName,
          dataType: variable.dataType || variable.variableType || 'string',
          initialValue: variable.initialValue !== undefined ? variable.initialValue : '',
          description: variable.description || '',
          isGlobal: variable.isGlobal !== undefined ? variable.isGlobal : false,
          isVisibleToPlayer: variable.isVisibleToPlayer || false
        };
      })
      // 🔥 SAFETY NET: Final deduplication pass to absolutely ensure no duplicates
      .filter((variable, index, array) => {
        return array.findIndex(v => v.variableId === variable.variableId) === index;
      });

    // ทำความสะอาด nodes
    const cleanedNodes = nodes.map(node => ({
      nodeId: node.id || node.nodeId,
      nodeType: node.type || node.nodeType || node.data?.nodeType || 'scene_node',
      title: node.data?.title || node.title || 'Untitled Node',
      position: { 
        x: Math.round(node.position?.x || 0), 
        y: Math.round(node.position?.y || 0)
      },
      nodeSpecificData: node.data?.nodeSpecificData || {},
      notesForAuthor: node.data?.notesForAuthor || '',
      authorDefinedEmotionTags: node.data?.authorDefinedEmotionTags || [],
      editorVisuals: {
        color: node.data?.editorVisuals?.color || node.data?.color || '#3b82f6',
        orientation: node.data?.editorVisuals?.orientation || node.data?.nodeOrientation || 'vertical',
        icon: node.data?.editorVisuals?.icon || 'circle',
        borderStyle: node.data?.editorVisuals?.borderStyle || 'solid'
      }
    }));

    // ทำความสะอาด edges
    const cleanedEdges = edges.map(edge => ({
      edgeId: edge.id || edge.edgeId,
      sourceNodeId: edge.source || edge.sourceNodeId,
      targetNodeId: edge.target || edge.targetNodeId,
      sourceHandleId: edge.sourceHandle,
      targetHandleId: edge.targetHandle,
      label: edge.label || edge.data?.label || '',
      condition: edge.data?.condition,
      editorVisuals: {
        color: edge.data?.editorVisuals?.color || edge.style?.stroke || '#64748b',
        lineStyle: edge.data?.editorVisuals?.lineStyle || 'solid',
        animated: edge.animated || false
      }
    }));

    console.log(`[Episode StoryMap Save API] 🧹 Cleaned data:`, {
      cleanedNodeCount: cleanedNodes.length,
      cleanedEdgeCount: cleanedEdges.length,
      cleanedVariableCount: cleanedStoryVariables.length
    });

    // ค้นหาหรือสร้าง StoryMap สำหรับ Episode นี้
    let storyMap = await StoryMapModel.findOne({
      novelId: novel._id,
      episodeId: new Types.ObjectId(episodeId),
      isActive: true
    });

    if (!storyMap) {
      console.log(`[Episode StoryMap Save API] 📝 Creating new StoryMap for episode: ${episode.title}`);
      
      // สร้าง StoryMap ใหม่
      storyMap = new StoryMapModel({
        novelId: novel._id,
        episodeId: new Types.ObjectId(episodeId),
        title: `${episode.title} - โครงเรื่อง`,
        version: 1,
        description: `แผนผังเรื่องราวสำหรับ ${episode.title}`,
        nodes: cleanedNodes,
        edges: cleanedEdges,
        storyVariables: cleanedStoryVariables,
        startNodeId: cleanedNodes.find(n => n.nodeType === 'start_node')?.nodeId || cleanedNodes[0]?.nodeId || '',
        lastModifiedByUserId: userId,
        isActive: true,
        editorMetadata: {
          zoomLevel: 1,
          viewOffsetX: 0,
          viewOffsetY: 0,
          gridSize: 20,
          showGrid: true,
          showSceneThumbnails: false,
          showNodeLabels: true
        }
      });
    } else {
      console.log(`[Episode StoryMap Save API] 🔄 Updating existing StoryMap (version: ${storyMap.version})`);
      
      // อัปเดต StoryMap ที่มีอยู่
      storyMap.nodes = cleanedNodes;
      storyMap.edges = cleanedEdges;
      storyMap.storyVariables = cleanedStoryVariables;
      storyMap.lastModifiedByUserId = userId;
      storyMap.version = (storyMap.version || 1) + 1;
      
      // อัปเดต startNodeId หากมี start_node ใหม่
      const startNode = cleanedNodes.find(n => n.nodeType === 'start_node');
      if (startNode) {
        storyMap.startNodeId = startNode.nodeId;
      }
    }

    // บันทึก StoryMap
    try {
      await storyMap.save();
      console.log(`[Episode StoryMap Save API] ✅ StoryMap saved successfully (version: ${storyMap.version})`);
    } catch (saveError: any) {
      console.error(`[Episode StoryMap Save API] ❌ Save error:`, saveError);
      
      // จัดการ duplicate key error
      if (saveError.code === 11000 && saveError.message.includes('storyVariables.variableId')) {
        console.log(`[Episode StoryMap Save API] Duplicate variableId error, attempting to fix...`);
        
        // ลองสร้าง variableId ใหม่ทั้งหมด
        storyMap.storyVariables = cleanedStoryVariables.map((v, idx) => ({
          ...v,
          variableId: `var_fix_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`
        }));
        
        await storyMap.save();
        console.log(`[Episode StoryMap Save API] ✅ Fixed and saved successfully`);
      } else {
        throw saveError;
      }
    }

    // ส่ง response กลับ
    return NextResponse.json({
      success: true,
      message: 'StoryMap saved successfully',
      storyMap: {
        _id: storyMap._id,
        version: storyMap.version,
        nodes: storyMap.nodes,
        edges: storyMap.edges,
        storyVariables: storyMap.storyVariables,
        updatedAt: storyMap.updatedAt
      },
      episode: {
        _id: episode._id,
        title: episode.title,
        episodeOrder: episode.episodeOrder,
        status: episode.status
      },
      newVersion: storyMap.version,
      version: storyMap.version
    });

  } catch (error: any) {
    console.error('[Episode StoryMap Save API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

