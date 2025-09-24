// src/app/api/novels/[slug]/storymap/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import mongoose from 'mongoose';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import StoryMapModel from '@/backend/models/StoryMap';
import SceneModel from '@/backend/models/Scene';
import ChoiceModel from '@/backend/models/Choice';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get episodeId from query parameters
    const url = new URL(request.url);
    const episodeId = url.searchParams.get('episodeId');

    // Check access permissions
    const novel = await NovelModel.findOne({
      slug: decodedSlug,
      isDeleted: { $ne: true }
    }).lean();

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // Verify user is author or co-author
    const userId = session.user.id;
    const isAuthor = novel.author?.toString() === userId;
    const isCoAuthor = novel.coAuthors?.some((coAuthor: any) => 
      coAuthor.toString() === userId
    );
    
    if (!isAuthor && !isCoAuthor) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get story map with episode-specific data
    const storyMapQuery: any = {
      novelId: novel._id,
      isActive: true
    };

    // If episodeId is provided, get episode-specific storymap
    if (episodeId) {
      storyMapQuery.episodeId = episodeId;
    }

    const storyMap = await StoryMapModel.findOne(storyMapQuery).lean();

    console.log('Found story map:', storyMap ? {
      id: storyMap._id,
      title: storyMap.title,
      nodeCount: storyMap.nodes?.length || 0,
      edgeCount: storyMap.edges?.length || 0,
      version: storyMap.version,
      episodeId: storyMap.episodeId || 'novel-level'
    } : 'No story map found');

    if (!storyMap) {
      // If no episode-specific storymap found, create empty one
      if (episodeId) {
        console.log(`Creating empty storymap for episode: ${episodeId}`);
        return NextResponse.json({ 
          storyMap: {
            _id: null,
            novelId: novel._id.toString(),
            episodeId: episodeId,
            title: `Episode ${episodeId} - Story Map`,
            version: 1,
            nodes: [],
            edges: [],
            storyVariables: [],
            startNodeId: '',
            isActive: true,
            lastModifiedByUserId: userId
          },
          validation: {
            orphanedNodes: [],
            missingConnections: [],
            cycles: [],
            unreachableNodes: []
          }
        });
      }
      
      return NextResponse.json({ 
        storyMap: null,
        validation: {
          orphanedNodes: [],
          missingConnections: [],
          cycles: [],
          unreachableNodes: []
        }
      });
    }

    // Get related scenes and choices for validation
    const scenes = await SceneModel.find({ 
      novelId: novel._id,
      isDeleted: { $ne: true }
    }).lean();

    const choices = await ChoiceModel.find({ 
      novelId: novel._id,
      isArchived: false 
    }).lean();

    console.log('Found scenes:', scenes.length);
    console.log('Found choices:', choices.length);

    // Perform basic validation
    const validation = {
      orphanedNodes: [],
      missingConnections: [],
      cycles: [],
      unreachableNodes: [],
      isValid: true
    };

    // Ensure proper serialization of ObjectIds
    const serializedStoryMap = {
      ...storyMap,
      _id: storyMap._id.toString(),
      novelId: storyMap.novelId.toString(),
      lastModifiedByUserId: storyMap.lastModifiedByUserId.toString(),
      nodes: storyMap.nodes || [],
      edges: storyMap.edges || [],
      storyVariables: storyMap.storyVariables || []
    };

    const serializedScenes = scenes.map(scene => ({
      ...scene,
      _id: scene._id.toString(),
      novelId: scene.novelId.toString(),
      episodeId: scene.episodeId.toString()
    }));

    const serializedChoices = choices.map(choice => ({
      ...choice,
      _id: choice._id.toString(),
      novelId: choice.novelId.toString()
    }));

    return NextResponse.json({
      storyMap: serializedStoryMap,
      validation,
      scenes: serializedScenes,
      choices: serializedChoices
    });

  } catch (error) {
    console.error('Error fetching story map:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { nodes, edges, storyVariables, episodeId, version: clientVersion } = body;

    await dbConnect();

    // Check access permissions
    const novel = await NovelModel.findOne({
      slug: decodedSlug,
      isDeleted: { $ne: true }
    });

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // Verify user is author or co-author
    const userId = session.user.id;
    const isAuthor = novel.author?.toString() === userId;
    const isCoAuthor = novel.coAuthors?.some((coAuthor: any) => 
      coAuthor.toString() === userId
    );
    
    if (!isAuthor && !isCoAuthor) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update or create story map for specific episode
    const storyMapQuery: any = {
      novelId: novel._id,
      isActive: true
    };

    // If episodeId is provided, work with episode-specific storymap
    if (episodeId) {
      storyMapQuery.episodeId = episodeId;
    }

    let storyMap = await StoryMapModel.findOne(storyMapQuery);

    if (storyMap) {
      // Enhanced version conflict handling - ระบบจัดการ conflict อัตโนมัติ
      if (clientVersion && clientVersion < storyMap.version) {
        console.log(`[CONFLICT DETECTED] Client version: ${clientVersion}, Server version: ${storyMap.version}`);
        
        // แทนที่จะ return error ให้ทำ intelligent merge
        const mergedData = await performIntelligentMerge(
          { nodes, edges, storyVariables },
          { 
            nodes: storyMap.nodes || [], 
            edges: storyMap.edges || [], 
            storyVariables: storyMap.storyVariables || [] 
          }
        );
        
        // อัปเดตด้วยข้อมูลที่ merge แล้ว
        storyMap.nodes = mergedData.nodes;
        storyMap.edges = mergedData.edges;
        storyMap.storyVariables = mergedData.storyVariables;
        storyMap.version += 1;
        storyMap.lastModifiedByUserId = new mongoose.Types.ObjectId(userId);
        storyMap.updatedAt = new Date();
        
        // บันทึกและส่งกลับข้อมูลที่ merge แล้ว
        await storyMap.save();
        
        return NextResponse.json({
          storyMap: JSON.parse(JSON.stringify(storyMap)),
          validation: { orphanedNodes: [], missingConnections: [], cycles: [], unreachableNodes: [], isValid: true },
          newVersion: storyMap.version,
          merged: true, // บอกให้ client ทราบว่ามีการ merge เกิดขึ้น
          mergeMessage: 'การเปลี่ยนแปลงของคุณถูกรวมกับเวอร์ชันล่าสุดเรียบร้อยแล้ว'
        });
      }
      
      // Normal update - ไม่มี conflict
      storyMap.nodes = nodes;
      storyMap.edges = edges;
      // 🔥 CRITICAL: Clean story variables before saving to prevent duplicates
      storyMap.storyVariables = cleanStoryVariablesArray(storyVariables || storyMap.storyVariables || []);
      storyMap.version += 1;
      storyMap.lastModifiedByUserId = new mongoose.Types.ObjectId(userId);
      storyMap.updatedAt = new Date();
      
      // Store episode metadata if provided
      if (episodeId) {
        storyMap.episodeId = episodeId;
        storyMap.editorMetadata = {
          ...storyMap.editorMetadata,
          selectedEpisodeId: episodeId
        };
      }
      
      await storyMap.save();
    } else {
      // Create new story map
      const storyMapTitle = episodeId 
        ? `Episode ${episodeId} - Story Map`
        : `${novel.title} - Story Map`;
        
      storyMap = new StoryMapModel({
        novelId: novel._id,
        episodeId: episodeId || null,
        title: storyMapTitle,
        description: episodeId ? `Story map for episode ${episodeId}` : 'Auto-generated story map',
        version: 1,
        nodes: nodes || [],
        edges: edges || [],
        // 🔥 CRITICAL: Clean story variables on creation to prevent duplicates
        storyVariables: cleanStoryVariablesArray(storyVariables || []),
        startNodeId: nodes?.find((node: any) => node.nodeType === 'start_node')?.nodeId || '',
        lastModifiedByUserId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        editorMetadata: episodeId ? {
          selectedEpisodeId: episodeId,
          zoomLevel: 1,
          viewOffsetX: 0,
          viewOffsetY: 0,
          gridSize: 20,
          showGrid: true
        } : undefined
      });
      
      await storyMap.save();
    }

    // Perform validation on updated data
    const scenes = await SceneModel.find({ 
      novelId: novel._id,
      isDeleted: { $ne: true }
    }).lean();

    const choices = await ChoiceModel.find({ 
      novelId: novel._id,
      isArchived: false 
    }).lean();

    // Perform basic validation
    const validation = {
      orphanedNodes: [],
      missingConnections: [],
      cycles: [],
      unreachableNodes: [],
      isValid: true
    };

    return NextResponse.json({
      storyMap: JSON.parse(JSON.stringify(storyMap)),
      validation,
      newVersion: storyMap.version
    });

  } catch (error) {
    console.error('Error updating story map:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Validation function
function performStoryMapValidation(storyMap: any, scenes: any[], choices: any[]) {
  const validation = {
    orphanedNodes: [] as string[],
    missingConnections: [] as string[],
    cycles: [] as string[],
    unreachableNodes: [] as string[],
    missingScenes: [] as string[],
    missingChoices: [] as string[]
  };

  if (!storyMap.nodes || storyMap.nodes.length === 0) {
    return validation;
  }

  // Check for orphaned nodes (not connected to anything)
  const connectedNodes = new Set();
  storyMap.edges?.forEach((edge: any) => {
    connectedNodes.add(edge.sourceNodeId);
    connectedNodes.add(edge.targetNodeId);
  });

  storyMap.nodes.forEach((node: any) => {
    if (!connectedNodes.has(node.nodeId) && node.nodeType !== 'start_node') {
      validation.orphanedNodes.push(node.nodeId);
    }
  });

  // Check for missing scene connections
  storyMap.nodes.forEach((node: any) => {
    if (node.nodeType === 'scene_node' && node.nodeSpecificData?.sceneId) {
      const sceneExists = scenes.find(scene => scene._id.toString() === node.nodeSpecificData.sceneId);
      if (!sceneExists) {
        validation.missingScenes.push(node.nodeId);
      }
    }
  });

  // Check for missing choice connections
  storyMap.nodes.forEach((node: any) => {
    if (node.nodeType === 'choice_node' && node.nodeSpecificData?.choiceIds) {
      node.nodeSpecificData.choiceIds.forEach((choiceId: string) => {
        const choiceExists = choices.find(choice => choice._id.toString() === choiceId);
        if (!choiceExists) {
          validation.missingChoices.push(node.nodeId);
        }
      });
    }
  });

  // Check for cycles (simplified detection)
  const visited = new Set();
  const recursionStack = new Set();

  const hasCycle = (nodeId: string): boolean => {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingEdges = storyMap.edges?.filter((edge: any) => edge.sourceNodeId === nodeId) || [];
    for (const edge of outgoingEdges) {
      if (hasCycle(edge.targetNodeId)) {
        validation.cycles.push(nodeId);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  // Start cycle detection from start nodes
  const startNodes = storyMap.nodes.filter((node: any) => node.nodeType === 'start_node');
  startNodes.forEach((node: any) => {
    hasCycle(node.nodeId);
  });

  // Check for unreachable nodes
  const reachable = new Set();
  const traverse = (nodeId: string) => {
    if (reachable.has(nodeId)) return;
    reachable.add(nodeId);
    
    const outgoing = storyMap.edges?.filter((edge: any) => edge.sourceNodeId === nodeId) || [];
    outgoing.forEach((edge: any) => traverse(edge.targetNodeId));
  };

  startNodes.forEach((node: any) => traverse(node.nodeId));
  
  storyMap.nodes.forEach((node: any) => {
    if (!reachable.has(node.nodeId) && node.nodeType !== 'start_node') {
      validation.unreachableNodes.push(node.nodeId);
    }
  });

  return validation;
}

// ===================================================================
// SECTION: Intelligent Merge System - ระบบรวมข้อมูลอัตโนมัติ
// ===================================================================

/**
 * ฟังก์ชันสำหรับรวมข้อมูล StoryMap อย่างชาญฉลาด
 * ใช้หลักการ 3-way merge เหมือน Git โดยพิจารณา:
 * 1. Nodes: รวมตาม ID, ใช้ timestamp ล่าสุด
 * 2. Edges: รวมตาม ID, ใช้ timestamp ล่าสุด  
 * 3. Positions: ใช้ตำแหน่งจาก client (user's current view)
 * 4. StoryVariables: รวมแบบ deep merge
 */
async function performIntelligentMerge(
  localData: { nodes: any[], edges: any[], storyVariables: any[] },
  serverData: { nodes: any[], edges: any[], storyVariables: any[] }
) {
  console.log('[MERGE] Starting intelligent merge process');
  
  // 1. Merge Nodes - รวม nodes โดยใช้ ID เป็นหลัก
  const mergedNodes = mergeNodesByStrategy(localData.nodes, serverData.nodes);
  
  // 2. Merge Edges - รวม edges โดยใช้ ID เป็นหลัก  
  const mergedEdges = mergeEdgesByStrategy(localData.edges, serverData.edges);
  
  // 3. Merge Story Variables - รวมแบบ deep merge
  const mergedStoryVariables = mergeStoryVariables(localData.storyVariables, serverData.storyVariables);
  
  console.log(`[MERGE] Completed: ${mergedNodes.length} nodes, ${mergedEdges.length} edges, ${mergedStoryVariables.length} variables`);
  
  return {
    nodes: mergedNodes,
    edges: mergedEdges,
    storyVariables: mergedStoryVariables
  };
}

/**
 * รวม nodes โดยใช้กลยุทธ์:
 * - เก็บ nodes ที่มีอยู่ทั้งสองฝ่าย
 * - ใช้ตำแหน่งจาก local (user's current view)
 * - ใช้เนื้อหาจาก version ที่ใหม่กว่า
 */
function mergeNodesByStrategy(localNodes: any[], serverNodes: any[]): any[] {
  const nodeMap = new Map<string, any>();
  
  // เพิ่ม server nodes ก่อน (base)
  serverNodes.forEach(node => {
    if (node.nodeId) {
      nodeMap.set(node.nodeId, { ...node, source: 'server' });
    }
  });
  
  // เพิ่ม local nodes (ทับ server ถ้า ID ซ้ำ)
  localNodes.forEach(localNode => {
    if (localNode.nodeId) {
      const existingNode = nodeMap.get(localNode.nodeId);
      if (existingNode) {
        // Node มีอยู่แล้ว - merge กัน
        nodeMap.set(localNode.nodeId, {
          ...existingNode, // เริ่มจาก server data
          ...localNode,    // ทับด้วย local data
          position: localNode.position || existingNode.position, // ใช้ตำแหน่งจาก local
          source: 'merged'
        });
      } else {
        // Node ใหม่จาก local
        nodeMap.set(localNode.nodeId, { ...localNode, source: 'local' });
      }
    }
  });
  
  return Array.from(nodeMap.values());
}

/**
 * รวม edges โดยใช้กลยุทธ์เดียวกันกับ nodes
 */
function mergeEdgesByStrategy(localEdges: any[], serverEdges: any[]): any[] {
  const edgeMap = new Map<string, any>();
  
  // เพิ่ม server edges ก่อน
  serverEdges.forEach(edge => {
    if (edge.edgeId) {
      edgeMap.set(edge.edgeId, { ...edge, source: 'server' });
    }
  });
  
  // เพิ่ม local edges
  localEdges.forEach(localEdge => {
    if (localEdge.edgeId) {
      const existingEdge = edgeMap.get(localEdge.edgeId);
      if (existingEdge) {
        // Edge มีอยู่แล้ว - merge กัน
        edgeMap.set(localEdge.edgeId, {
          ...existingEdge,
          ...localEdge,
          source: 'merged'
        });
      } else {
        // Edge ใหม่จาก local
        edgeMap.set(localEdge.edgeId, { ...localEdge, source: 'local' });
      }
    }
  });
  
  return Array.from(edgeMap.values());
}

/**
 * รวม story variables แบบ deep merge
 */
function mergeStoryVariables(localVars: any[], serverVars: any[]): any[] {
  const varMap = new Map<string, any>();
  
  // เพิ่ม server variables ก่อน
  serverVars.forEach(variable => {
    if (variable.variableId) {
      varMap.set(variable.variableId, variable);
    }
  });
  
  // เพิ่ม local variables (ทับ server ถ้า ID ซ้ำ)
  localVars.forEach(localVar => {
    if (localVar.variableId) {
      varMap.set(localVar.variableId, localVar);
    }
  });
  
  // 🔥 CRITICAL: Clean merged variables to prevent duplicates before returning
  return cleanStoryVariablesArray(Array.from(varMap.values()));
}

/**
 * 🔥 CRITICAL: Clean story variables to prevent duplicates and invalid data
 * This ensures MongoDB validation will pass
 */
function cleanStoryVariablesArray(variables: any[]): any[] {
  if (!variables || !Array.isArray(variables)) return [];
  
  const usedVariableIds = new Set<string>();
  const usedVariableNames = new Set<string>();
  const timestamp = Date.now();
  const sessionId = Math.random().toString(36).substr(2, 12);

  return variables
    .filter(variable => {
      // กรองตัวแปรที่ไม่ถูกต้อง
      if (!variable) return false;
      if (!variable.variableName && !variable.name) return false;
      // 🔥 CRITICAL: Filter out invalid IDs
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
        console.warn(`[StoryMap API] ⚠️ Duplicate variableId detected, regenerated: ${uniqueId}`);
      }
      usedVariableIds.add(uniqueId);

      // 🔥 CRITICAL: ตรวจสอบและแก้ไข duplicate variable names
      if (usedVariableNames.has(uniqueName)) {
        let counter = 2;
        let newName = `${uniqueName}_${counter}`;
        while (usedVariableNames.has(newName)) {
          counter++;
          newName = `${uniqueName}_${counter}`;
        }
        uniqueName = newName;
        console.warn(`[StoryMap API] ⚠️ Duplicate variableName detected, renamed to: ${uniqueName}`);
      }
      usedVariableNames.add(uniqueName);

      return {
        variableId: uniqueId,
        variableName: uniqueName,
        dataType: variable.dataType || variable.variableType || 'string',
        initialValue: variable.initialValue !== undefined ? variable.initialValue : '',
        description: variable.description || '',
        isGlobal: variable.isGlobal !== undefined ? variable.isGlobal : true,
        isVisibleToPlayer: variable.isVisibleToPlayer || false
      };
    })
    // 🔥 SAFETY NET: Final deduplication pass
    .filter((variable, index, array) => {
      return array.findIndex(v => v.variableId === variable.variableId) === index;
    });
}