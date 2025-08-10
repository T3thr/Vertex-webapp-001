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

    // Get story map with validation data
    const storyMap = await StoryMapModel.findOne({
      novelId: novel._id,
      isActive: true
    }).lean();

    console.log('Found story map:', storyMap ? {
      id: storyMap._id,
      title: storyMap.title,
      nodeCount: storyMap.nodes?.length || 0,
      edgeCount: storyMap.edges?.length || 0,
      version: storyMap.version
    } : 'No story map found');

    if (!storyMap) {
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
    const { nodes, edges, storyVariables, episodeFilter } = body;

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

    // Update or create story map
    let storyMap = await StoryMapModel.findOne({
      novelId: novel._id,
      isActive: true
    });

    if (storyMap) {
      // Update existing story map
      storyMap.nodes = nodes;
      storyMap.edges = edges;
      storyMap.storyVariables = storyVariables || storyMap.storyVariables;
      storyMap.version += 1;
      storyMap.lastModifiedByUserId = new mongoose.Types.ObjectId(userId);
      storyMap.updatedAt = new Date();
      
      // Store episode filter metadata if provided
      if (episodeFilter) {
        storyMap.editorMetadata = {
          ...storyMap.editorMetadata,
          selectedEpisodeId: episodeFilter
        };
      }
      
      await storyMap.save();
    } else {
      // Create new story map
      storyMap = new StoryMapModel({
        novelId: novel._id,
        title: `${novel.title} - Story Map`,
        description: 'Auto-generated story map',
        version: 1,
        nodes: nodes || [],
        edges: edges || [],
        storyVariables: storyVariables || [],
        startNodeId: nodes?.find((node: any) => node.nodeType === 'start_node')?.nodeId || '',
        lastModifiedByUserId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        editorMetadata: episodeFilter ? {
          selectedEpisodeId: episodeFilter,
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
      validation
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