// src/app/api/novels/[slug]/episodes/blueprint/route.ts
// 🎯 Blueprint-specific API สำหรับการจัดการ Episodes ใน Blueprint Tab
// 🔥 Enterprise-Grade Real-time Episode Management

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel, { EpisodeStatus, EpisodeAccessType } from '@/backend/models/Episode';
import StoryMapModel, { StoryMapNodeType, StoryVariableDataType, IStoryVariableDefinition, IStoryMapNode } from '@/backend/models/StoryMap';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// 🔥 Type Definitions สำหรับ Blueprint Episode Management
interface BlueprintEpisodeRequest {
  action: 'create' | 'update' | 'delete' | 'reorder' | 'bulk_update' | 'sync_canvas';
  episodes?: Array<{
    title: string;
    episodeOrder: number;
    canvasPosition: { x: number; y: number };
    visualStyle?: {
      color?: string;
      icon?: string;
      borderStyle?: 'solid' | 'dashed' | 'dotted';
      borderRadius?: number;
      opacity?: number;
    };
    displaySettings?: {
      showThumbnail?: boolean;
      showLabel?: boolean;
      labelPosition?: 'top' | 'bottom' | 'left' | 'right';
    };
    status?: EpisodeStatus;
    accessType?: EpisodeAccessType;
    priceCoins?: number;
    teaserText?: string;
  }>;
  episodeIds?: string[];
  updateData?: {
    canvasPosition?: { x: number; y: number };
    visualStyle?: any;
    displaySettings?: any;
    connections?: {
      incomingEdges?: string[];
      outgoingEdges?: string[];
    };
  };
  // 🎯 Bulk operations
  bulkData?: Array<{
    episodeId: string;
    updates: any;
  }>;
  // 🎯 Canvas sync data
  canvasData?: {
    nodes: Array<{
      id: string;
      position: { x: number; y: number };
      data: any;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  };
}

interface BlueprintEpisodeResponse {
  success: boolean;
  action: string;
  data?: any;
  episodes?: any[];
  stats?: {
    created: number;
    updated: number;
    deleted: number;
    errors: number;
  };
  errors?: string[];
  error?: string; // 🔧 Add error field for single error messages
  message?: string;
}

// 📝 POST /api/novels/[slug]/episodes/blueprint - Blueprint Episode Management
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Parse request body
    const body: BlueprintEpisodeRequest = await request.json();
    const { action, episodes = [], episodeIds = [], updateData, bulkData = [], canvasData } = body;

    // ค้นหา Novel และตรวจสอบสิทธิ์
    const novel = await NovelModel.findOne({ 
      slug: slug,
      isDeleted: { $ne: true }
    }).select('_id author coAuthors title');

    if (!novel) {
      return NextResponse.json({ 
        success: false, 
        error: 'Novel not found' 
      }, { status: 404 });
    }

    const userId = new Types.ObjectId(session.user.id);
    const hasAccess = (novel.author as any).equals(userId) || 
                     (novel.coAuthors && novel.coAuthors.some((coAuthor: any) => 
                       (coAuthor._id || coAuthor).equals(userId)));

    if (!hasAccess) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied' 
      }, { status: 403 });
    }

    // 🎯 Execute action based on request
    let result: BlueprintEpisodeResponse;

    switch (action) {
      case 'create':
        result = await handleEpisodeCreate(novel._id, episodes[0], userId);
        break;
        
      case 'update':
        result = await handleEpisodeUpdate(novel._id, episodeIds[0], updateData, userId);
        break;
        
      case 'delete':
        result = await handleEpisodeDelete(novel._id, episodeIds, userId);
        break;
        
      case 'reorder':
        result = await handleEpisodeReorder(novel._id, bulkData, userId);
        break;
        
      case 'bulk_update':
        result = await handleBulkUpdate(novel._id, bulkData, userId);
        break;
        
      case 'sync_canvas':
        result = await handleCanvasSync(novel._id, canvasData!, userId);
        break;
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[Blueprint Episode API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}

// 🎯 สร้าง StoryMap เปล่าสำหรับ Episode ใหม่
async function createEmptyStoryMapForEpisode(
  novelId: Types.ObjectId,
  episodeId: Types.ObjectId,
  userId: Types.ObjectId,
  episodeTitle: string
) {
  try {
    console.log(`📊 กำลังสร้าง StoryMap เปล่าสำหรับ Episode: ${episodeTitle}...`);

    // สร้าง start node เดียวสำหรับ episode ใหม่
    const startNodeId = uuidv4();
    
    const nodes: IStoryMapNode[] = [
      {
        nodeId: startNodeId,
        nodeType: StoryMapNodeType.START_NODE,
        title: 'จุดเริ่มต้น',
        position: { x: 400, y: 300 }, // ตำแหน่งกลางของ canvas
        nodeSpecificData: {},
        notesForAuthor: `จุดเริ่มต้นของ ${episodeTitle} - พร้อมสำหรับการพัฒนาเนื้อเรื่อง`,
        authorDefinedEmotionTags: ['beginning', 'neutral'],
        authorDefinedPsychologicalImpact: 0,
        editorVisuals: {
          color: '#10B981', // สีเขียวสำหรับ start node
          icon: 'play-circle',
          orientation: 'horizontal',
          borderRadius: 12,
          borderStyle: 'solid',
          gradient: {
            from: '#10B981',
            to: '#059669',
            direction: 'horizontal'
          },
          animation: {
            enter: 'fadeIn',
            exit: 'fadeOut'
          }
        },
        layoutConfig: {
          mode: 'manual',
          tier: 0,
          order: 0
        },
        lastEdited: new Date()
      }
    ];

    // ไม่มี edges สำหรับ StoryMap เปล่า
    const edges: any[] = [];

    // ตัวแปรเรื่องราวพื้นฐาน (สามารถแก้ไขได้ภายหลัง)
    const storyVariables: IStoryVariableDefinition[] = [
      {
        variableId: uuidv4(),
        variableName: 'episode_progress',
        dataType: StoryVariableDataType.NUMBER,
        initialValue: 0,
        description: 'ความคืบหน้าของตอนนี้ (0-100)',
        allowedValues: [0, 100],
        isGlobal: false,
        isVisibleToPlayer: false
      },
      {
        variableId: uuidv4(),
        variableName: 'scene_count',
        dataType: StoryVariableDataType.NUMBER,
        initialValue: 0,
        description: 'จำนวนฉากที่ผู้เล่นผ่านมาแล้วในตอนนี้',
        isGlobal: false,
        isVisibleToPlayer: false
      }
    ];

    // สร้าง StoryMap document
    const storyMap = new StoryMapModel({
      novelId,
      episodeId, // 🎯 เชื่อมโยงกับ Episode เฉพาะ
      title: `${episodeTitle} - โครงเรื่อง`,
      version: 1,
      description: `แผนผังเรื่องราวสำหรับ ${episodeTitle}`,
      nodes,
      edges,
      storyVariables,
      startNodeId,
      lastModifiedByUserId: userId,
      isActive: true,
      editorMetadata: {
        zoomLevel: 1,
        viewOffsetX: -200,
        viewOffsetY: -100,
        gridSize: 20,
        showGrid: true,
        showSceneThumbnails: false,
        showNodeLabels: true,
        autoLayoutAlgorithm: 'dagre',
        layoutPreferences: {
          defaultOrientation: 'horizontal',
          nodeSpacing: { x: 200, y: 300 },
          tierSpacing: 300,
          autoAlign: false,
          preserveManualPositions: true,
          flowDirection: 'left-right'
        },
        uiPreferences: {
          nodeDefaultColor: '#3B82F6',
          edgeDefaultColor: '#6B7280',
          connectionLineStyle: 'smooth',
          showConnectionLines: true,
          autoSaveEnabled: false,
          autoSaveIntervalSec: 30,
          snapToGrid: true,
          enableAnimations: true,
          nodeDefaultOrientation: 'horizontal',
          edgeDefaultPathType: 'smooth',
          showMinimap: false,
          enableNodeThumbnails: false
        },
        collaborationSettings: {
          allowMultipleEditors: true,
          showCursors: true,
          showUserAvatars: true,
          lockTimeout: 300
        },
        performanceSettings: {
          virtualizeNodes: false,
          maxVisibleNodes: 100,
          chunkSize: 50,
          enableCaching: true
        }
      }
    });

    const savedStoryMap = await storyMap.save();
    console.log(`✅ สร้าง StoryMap เปล่าสำเร็จ: ${savedStoryMap._id} สำหรับ ${episodeTitle}`);
    
    return savedStoryMap;
  } catch (error) {
    console.error('[createEmptyStoryMapForEpisode] Error:', error);
    throw error;
  }
}

// 🔧 Helper Functions

// 🎯 สร้าง Episode ใหม่พร้อม Blueprint integration
async function handleEpisodeCreate(
  novelId: Types.ObjectId, 
  episodeData: any, 
  userId: Types.ObjectId
): Promise<BlueprintEpisodeResponse> {
  try {
    // ตรวจสอบ episodeOrder ซ้ำ
    const existingEpisode = await EpisodeModel.findOne({
      novelId,
      episodeOrder: episodeData.episodeOrder
    });

    if (existingEpisode) {
      return {
        success: false,
        action: 'create',
        error: `Episode order ${episodeData.episodeOrder} already exists`
      };
    }

    // สร้าง Episode ใหม่
    const newEpisode = new EpisodeModel({
      novelId,
      authorId: userId,
      title: episodeData.title,
      slug: generateSlug(episodeData.title),
      episodeOrder: episodeData.episodeOrder,
      status: episodeData.status || EpisodeStatus.DRAFT,
      accessType: episodeData.accessType || EpisodeAccessType.FREE,
      priceCoins: episodeData.priceCoins || 0,
      teaserText: episodeData.teaserText || '',
      sceneIds: [],
      stats: {
        viewsCount: 0,
        uniqueViewersCount: 0,
        likesCount: 0,
        commentsCount: 0,
        totalWords: 0,
        estimatedReadingTimeMinutes: 0,
        purchasesCount: 0
      },
      isPreviewAllowed: true,
      lastContentUpdatedAt: new Date(),
      // 🎯 Blueprint Integration
      blueprintMetadata: {
        canvasPosition: episodeData.canvasPosition,
        visualStyle: {
          color: episodeData.visualStyle?.color || '#3b82f6',
          icon: episodeData.visualStyle?.icon || 'episode',
          borderStyle: episodeData.visualStyle?.borderStyle || 'solid',
          borderRadius: episodeData.visualStyle?.borderRadius || 8,
          opacity: episodeData.visualStyle?.opacity || 1,
        },
        connections: {
          incomingEdges: [],
          outgoingEdges: []
        },
        displaySettings: {
          showThumbnail: episodeData.displaySettings?.showThumbnail ?? true,
          showLabel: episodeData.displaySettings?.showLabel ?? true,
          labelPosition: episodeData.displaySettings?.labelPosition || 'bottom'
        },
        lastCanvasUpdate: new Date(),
        version: 1
      }
    });

    const savedEpisode = await newEpisode.save();

    // 🎯 สร้าง StoryMap ใหม่สำหรับ Episode นี้
    await createEmptyStoryMapForEpisode(novelId, savedEpisode._id, userId, savedEpisode.title);

    return {
      success: true,
      action: 'create',
      data: savedEpisode,
      message: 'Episode created successfully'
    };

  } catch (error: any) {
    console.error('[handleEpisodeCreate] Error:', error);
    return {
      success: false,
      action: 'create',
      error: error.message
    };
  }
}

// 🎯 อัปเดต Episode พร้อม Blueprint data
async function handleEpisodeUpdate(
  novelId: Types.ObjectId,
  episodeId: string,
  updateData: any,
  userId: Types.ObjectId
): Promise<BlueprintEpisodeResponse> {
  try {
    const episode = await EpisodeModel.findOne({
      _id: new Types.ObjectId(episodeId),
      novelId
    });

    if (!episode) {
      return {
        success: false,
        action: 'update',
        error: 'Episode not found'
      };
    }

    // 🎯 อัปเดต Blueprint metadata (Concise Fix)
    // Initialize blueprintMetadata if it's missing to prevent runtime errors.
    if (!episode.blueprintMetadata) {
      episode.blueprintMetadata = {
        canvasPosition: { x: 0, y: 0 },
        visualStyle: {},
        connections: { incomingEdges: [], outgoingEdges: [] },
        displaySettings: { showThumbnail: true, showLabel: true, labelPosition: 'bottom' },
        lastCanvasUpdate: new Date(),
        version: 1
      };
    }

    let hasChanges = false;

    if (updateData.canvasPosition) {
      episode.blueprintMetadata.canvasPosition = updateData.canvasPosition;
      hasChanges = true;
    }
    
    if (updateData.visualStyle) {
      episode.blueprintMetadata.visualStyle = {
        ...(episode.blueprintMetadata.visualStyle || {}),
        ...updateData.visualStyle,
      };
      hasChanges = true;
    }
    
    if (updateData.connections) {
      episode.blueprintMetadata.connections = {
        ...(episode.blueprintMetadata.connections || {}),
        ...updateData.connections,
      };
      hasChanges = true;
    }
    
    // Only update version and timestamp if there were actual changes
    if (hasChanges) {
      episode.blueprintMetadata.lastCanvasUpdate = new Date();
      episode.blueprintMetadata.version = (episode.blueprintMetadata.version || 1) + 1;
    }

    const updatedEpisode = await episode.save();

    // 🎯 Sync กับ StoryMap (ถ้าจำเป็น)
    await syncEpisodeToStoryMap(novelId, updatedEpisode, userId);

    return {
      success: true,
      action: 'update',
      data: updatedEpisode,
      message: 'Episode updated successfully'
    };

  } catch (error: any) {
    console.error('[handleEpisodeUpdate] Error:', error);
    return {
      success: false,
      action: 'update',
      error: error.message
    };
  }
}

// 🎯 ลบ Episode พร้อมทำความสะอาด Canvas
async function handleEpisodeDelete(
  novelId: Types.ObjectId,
  episodeIds: string[],
  userId: Types.ObjectId
): Promise<BlueprintEpisodeResponse> {
  const results = [];
  let deletedCount = 0;
  let errorCount = 0;

  for (const episodeId of episodeIds) {
    try {
      const episode = await EpisodeModel.findOne({
        _id: new Types.ObjectId(episodeId),
        novelId
      });

      if (!episode) {
        results.push({
          episodeId,
          success: false,
          error: 'Episode not found'
        });
        errorCount++;
        continue;
      }

      // 🎯 ลบ Episode
      await EpisodeModel.findByIdAndDelete(episode._id);

      // 🎯 ทำความสะอาด StoryMap
      await cleanupStoryMapNode(novelId, episode.storyMapNodeId, userId);

      results.push({
        episodeId,
        success: true,
        title: episode.title
      });
      deletedCount++;

    } catch (error: any) {
      results.push({
        episodeId,
        success: false,
        error: error.message
      });
      errorCount++;
    }
  }

  return {
    success: errorCount === 0,
    action: 'delete',
    data: results,
    stats: {
      created: 0,
      updated: 0,
      deleted: deletedCount,
      errors: errorCount
    },
    message: `Deleted ${deletedCount} episodes, ${errorCount} errors`
  };
}

// 🎯 จัดลำดับ Episodes ใหม่
async function handleEpisodeReorder(
  novelId: Types.ObjectId,
  bulkData: Array<{ episodeId: string; updates: any }>,
  userId: Types.ObjectId
): Promise<BlueprintEpisodeResponse> {
  const session = await EpisodeModel.startSession();
  
  try {
    await session.withTransaction(async () => {
      for (const item of bulkData) {
        await EpisodeModel.findOneAndUpdate(
          { 
            _id: new Types.ObjectId(item.episodeId), 
            novelId 
          },
          { 
            episodeOrder: item.updates.episodeOrder,
            'blueprintMetadata.lastCanvasUpdate': new Date(),
            'blueprintMetadata.version': { $inc: 1 }
          },
          { session }
        );
      }
    });

    return {
      success: true,
      action: 'reorder',
      message: `Reordered ${bulkData.length} episodes`
    };

  } catch (error: any) {
    return {
      success: false,
      action: 'reorder',
      error: error.message
    };
  } finally {
    await session.endSession();
  }
}

// 🎯 อัปเดตหลาย Episode พร้อมกัน
async function handleBulkUpdate(
  novelId: Types.ObjectId,
  bulkData: Array<{ episodeId: string; updates: any }>,
  userId: Types.ObjectId
): Promise<BlueprintEpisodeResponse> {
  const results = [];
  let updatedCount = 0;
  let errorCount = 0;

  for (const item of bulkData) {
    try {
      const episode = await EpisodeModel.findOneAndUpdate(
        { 
          _id: new Types.ObjectId(item.episodeId), 
          novelId 
        },
        {
          ...item.updates,
          'blueprintMetadata.lastCanvasUpdate': new Date(),
          'blueprintMetadata.version': { $inc: 1 }
        },
        { new: true }
      );

      if (episode) {
        results.push({
          episodeId: item.episodeId,
          success: true,
          data: episode
        });
        updatedCount++;
      } else {
        results.push({
          episodeId: item.episodeId,
          success: false,
          error: 'Episode not found'
        });
        errorCount++;
      }

    } catch (error: any) {
      results.push({
        episodeId: item.episodeId,
        success: false,
        error: error.message
      });
      errorCount++;
    }
  }

  return {
    success: errorCount === 0,
    action: 'bulk_update',
    data: results,
    stats: {
      created: 0,
      updated: updatedCount,
      deleted: 0,
      errors: errorCount
    }
  };
}

// 🎯 Sync Canvas data กับ Database
async function handleCanvasSync(
  novelId: Types.ObjectId,
  canvasData: any,
  userId: Types.ObjectId
): Promise<BlueprintEpisodeResponse> {
  try {
    const syncPromises = canvasData.nodes
      .filter((node: any) => node.data?.episodeId)
      .map(async (node: any) => {
        return EpisodeModel.findOneAndUpdate(
          { 
            _id: new Types.ObjectId(node.data.episodeId), 
            novelId 
          },
          {
            'blueprintMetadata.canvasPosition': node.position,
            'blueprintMetadata.lastCanvasUpdate': new Date(),
            'blueprintMetadata.version': { $inc: 1 }
          }
        );
      });

    await Promise.all(syncPromises);

    return {
      success: true,
      action: 'sync_canvas',
      message: `Synced ${canvasData.nodes.length} nodes to database`
    };

  } catch (error: any) {
    return {
      success: false,
      action: 'sync_canvas',
      error: error.message
    };
  }
}

// 🔧 Utility Functions

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

async function createStoryMapNode(
  novelId: Types.ObjectId,
  episode: any,
  userId: Types.ObjectId
) {
  try {
    const storyMap = await StoryMapModel.findOne({
      novelId,
      isActive: true
    });

    if (storyMap && episode.blueprintMetadata?.canvasPosition) {
      const newNodeId = `episode_${episode._id}_${Date.now()}`;
      
      const newNode = {
        nodeId: newNodeId,
        nodeType: 'episode_node' as any,
        title: episode.title,
        position: episode.blueprintMetadata.canvasPosition,
        nodeSpecificData: {
          episodeId: episode._id,
          episodeOrder: episode.episodeOrder,
          episodeTitle: episode.title,
          episodeStatus: episode.status,
          autoGenerateScenes: false
        },
        editorVisuals: episode.blueprintMetadata?.visualStyle || {},
        lastEdited: new Date()
      };

      storyMap.nodes.push(newNode as any);
      storyMap.lastModifiedByUserId = userId;
      await storyMap.save();

      // อัปเดต Episode ให้เชื่อมโยงกับ node
      episode.storyMapNodeId = newNodeId;
      await episode.save();
    }
  } catch (error) {
    console.error('[createStoryMapNode] Error:', error);
  }
}

async function syncEpisodeToStoryMap(
  novelId: Types.ObjectId,
  episode: any,
  userId: Types.ObjectId
) {
  try {
    if (!episode.storyMapNodeId) return;

    const storyMap = await StoryMapModel.findOne({
      novelId,
      isActive: true
    });

    if (storyMap) {
      const nodeIndex = storyMap.nodes.findIndex(
        (node: any) => node.nodeId === episode.storyMapNodeId
      );

      if (nodeIndex !== -1) {
        storyMap.nodes[nodeIndex] = {
          ...storyMap.nodes[nodeIndex],
          title: episode.title,
          position: episode.blueprintMetadata?.canvasPosition || storyMap.nodes[nodeIndex].position,
          nodeSpecificData: {
            ...storyMap.nodes[nodeIndex].nodeSpecificData,
            episodeTitle: episode.title,
            episodeStatus: episode.status
          },
          editorVisuals: episode.blueprintMetadata?.visualStyle || storyMap.nodes[nodeIndex].editorVisuals,
          lastEdited: new Date()
        };

        storyMap.lastModifiedByUserId = userId;
        await storyMap.save();
      }
    }
  } catch (error) {
    console.error('[syncEpisodeToStoryMap] Error:', error);
  }
}

async function cleanupStoryMapNode(
  novelId: Types.ObjectId,
  nodeId: string | undefined,
  userId: Types.ObjectId
) {
  try {
    if (!nodeId) return;

    const storyMap = await StoryMapModel.findOne({
      novelId,
      isActive: true
    });

    if (storyMap) {
      // ลบ node
      storyMap.nodes = storyMap.nodes.filter(
        (node: any) => node.nodeId !== nodeId
      );
      
      // ลบ edges ที่เกี่ยวข้อง
      storyMap.edges = storyMap.edges.filter(
        (edge: any) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId
      );

      storyMap.lastModifiedByUserId = userId;
      await storyMap.save();
    }
  } catch (error) {
    console.error('[cleanupStoryMapNode] Error:', error);
  }
}

// 📝 GET /api/novels/[slug]/episodes/blueprint - ดึงข้อมูล Episodes สำหรับ Blueprint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const novel = await NovelModel.findOne({ 
      slug: slug,
      isDeleted: { $ne: true }
    }).select('_id author coAuthors');

    if (!novel) {
      return NextResponse.json({ 
        success: false, 
        error: 'Novel not found' 
      }, { status: 404 });
    }

    const userId = new Types.ObjectId(session.user.id);
    const hasAccess = (novel.author as any).equals(userId) || 
                     (novel.coAuthors && novel.coAuthors.some((coAuthor: any) => 
                       (coAuthor._id || coAuthor).equals(userId)));

    if (!hasAccess) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied' 
      }, { status: 403 });
    }

    // ดึงข้อมูล Episodes พร้อม Blueprint metadata
    const episodes = await EpisodeModel.find({ 
      novelId: novel._id 
    })
    .select('_id title slug episodeOrder status accessType priceCoins teaserText stats blueprintMetadata storyMapNodeId createdAt updatedAt')
    .sort({ episodeOrder: 1 })
    .lean();

    return NextResponse.json({
      success: true,
      episodes,
      total: episodes.length
    });

  } catch (error: any) {
    console.error('[Blueprint Episodes GET] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}
