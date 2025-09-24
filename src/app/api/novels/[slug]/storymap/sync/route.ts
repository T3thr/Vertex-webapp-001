// src/app/api/novels/[slug]/storymap/sync/route.ts
// 🎯 API Route สำหรับ Synchronize StoryMap กับ Episodes

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import StoryMapModel from '@/backend/models/StoryMap';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { Types } from 'mongoose';

// 🔥 Type Definitions
interface SyncRequest {
  action: 'episode_to_storymap' | 'storymap_to_episode' | 'bidirectional';
  episodeIds?: string[]; // สำหรับ sync เฉพาะ episodes ที่ระบุ
  nodeIds?: string[]; // สำหรับ sync เฉพาะ nodes ที่ระบุ
  options?: {
    createMissingEpisodes?: boolean; // สร้าง Episode ใหม่สำหรับ episode_node ที่ไม่มี Episode
    createMissingNodes?: boolean; // สร้าง Node ใหม่สำหรับ Episode ที่ไม่มี Node
    updatePositions?: boolean; // อัปเดตตำแหน่งใน canvas
    preserveManualChanges?: boolean; // รักษาการเปลี่ยนแปลงที่ทำด้วยมือ
  };
}

interface SyncResult {
  success: boolean;
  action: string;
  stats: {
    episodesProcessed: number;
    nodesProcessed: number;
    episodesCreated: number;
    nodesCreated: number;
    episodesUpdated: number;
    nodesUpdated: number;
    errors: number;
  };
  details?: any[];
  errors?: string[];
}

// 📝 POST /api/novels/[slug]/storymap/sync - Synchronize StoryMap กับ Episodes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SyncRequest = await request.json();
    const { 
      action, 
      episodeIds = [], 
      nodeIds = [],
      options = {}
    } = body;

    // Validation
    if (!['episode_to_storymap', 'storymap_to_episode', 'bidirectional'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be: episode_to_storymap, storymap_to_episode, or bidirectional' 
      }, { status: 400 });
    }

    // ค้นหา Novel
    const novel = await NovelModel.findOne({ 
      slug: slug,
      isDeleted: { $ne: true }
    }).select('_id author coAuthors');

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์
    const userId = new Types.ObjectId(session.user.id);
    const hasAccess = (novel.author as any).equals(userId) || 
                     (novel.coAuthors && novel.coAuthors.some((coAuthor: any) => 
                       (coAuthor._id || coAuthor).equals(userId)));

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ดึงข้อมูล StoryMap และ Episodes
    const [storyMap, episodes] = await Promise.all([
      StoryMapModel.findOne({
        novelId: novel._id,
        isActive: true
      }),
      EpisodeModel.find({ 
        novelId: novel._id,
        ...(episodeIds.length > 0 && { 
          _id: { $in: episodeIds.map(id => new Types.ObjectId(id)) } 
        })
      }).select('_id title slug episodeOrder status storyMapNodeId storyMapData')
    ]);

    if (!storyMap) {
      return NextResponse.json({ error: 'Active StoryMap not found' }, { status: 404 });
    }

    // Initialize result stats
    const stats = {
      episodesProcessed: 0,
      nodesProcessed: 0,
      episodesCreated: 0,
      nodesCreated: 0,
      episodesUpdated: 0,
      nodesUpdated: 0,
      errors: 0
    };

    const details: any[] = [];
    const errors: string[] = [];

    // 🎯 Execute sync based on action
    switch (action) {
      case 'episode_to_storymap':
        await syncEpisodesToStoryMap(episodes, storyMap, options, stats, details, errors, userId);
        break;
        
      case 'storymap_to_episode':
        await syncStoryMapToEpisodes(storyMap, novel._id, nodeIds, options, stats, details, errors, userId);
        break;
        
      case 'bidirectional':
        await syncEpisodesToStoryMap(episodes, storyMap, options, stats, details, errors, userId);
        await syncStoryMapToEpisodes(storyMap, novel._id, nodeIds, options, stats, details, errors, userId);
        break;
    }

    // Save StoryMap if modified
    if (stats.nodesCreated > 0 || stats.nodesUpdated > 0) {
      storyMap.lastModifiedByUserId = userId;
      await storyMap.save();
    }

    const result: SyncResult = {
      success: stats.errors === 0,
      action,
      stats,
      details: details.length > 0 ? details : undefined,
      errors: errors.length > 0 ? errors : undefined
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[POST /api/novels/[slug]/storymap/sync] Error:', error);
    return NextResponse.json(
      { 
        error: 'Sync operation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, 
      { status: 500 }
    );
  }
}

// 🔧 Helper Functions

// Sync Episodes to StoryMap (สร้าง/อัปเดต nodes จาก episodes)
async function syncEpisodesToStoryMap(
  episodes: any[],
  storyMap: any,
  options: any,
  stats: any,
  details: any[],
  errors: string[],
  userId: Types.ObjectId
) {
  for (const episode of episodes) {
    try {
      stats.episodesProcessed++;

      // ค้นหา node ที่เชื่อมโยงกับ episode นี้
      let existingNodeIndex = -1;
      if (episode.storyMapNodeId) {
        existingNodeIndex = storyMap.nodes.findIndex(
          (node: any) => node.nodeId === episode.storyMapNodeId
        );
      }

      if (existingNodeIndex !== -1) {
        // อัปเดต node ที่มีอยู่
        const existingNode = storyMap.nodes[existingNodeIndex];
        
        storyMap.nodes[existingNodeIndex] = {
          ...existingNode,
          title: episode.title,
          nodeType: 'episode_node',
          nodeSpecificData: {
            episodeId: episode._id,
            episodeOrder: episode.episodeOrder,
            episodeTitle: episode.title,
            episodeStatus: episode.status,
            autoGenerateScenes: existingNode.nodeSpecificData?.autoGenerateScenes || false
          },
          lastEdited: new Date(),
          ...(options.updatePositions && episode.storyMapData?.position && {
            position: episode.storyMapData.position
          })
        };

        stats.nodesUpdated++;
        details.push({
          type: 'node_updated',
          nodeId: episode.storyMapNodeId,
          episodeId: episode._id.toString(),
          title: episode.title
        });

      } else if (options.createMissingNodes) {
        // สร้าง node ใหม่
        const newNodeId = `episode_${episode._id}_${Date.now()}`;
        const newNode = {
          nodeId: newNodeId,
          nodeType: 'episode_node',
          title: episode.title,
          position: episode.storyMapData?.position || { 
            x: 100 + (stats.nodesCreated * 200), 
            y: 100 + (stats.nodesCreated * 150) 
          },
          nodeSpecificData: {
            episodeId: episode._id,
            episodeOrder: episode.episodeOrder,
            episodeTitle: episode.title,
            episodeStatus: episode.status,
            autoGenerateScenes: false
          },
          editorVisuals: episode.storyMapData?.editorVisuals || {},
          lastEdited: new Date()
        };

        storyMap.nodes.push(newNode);
        
        // อัปเดต Episode ให้เชื่อมโยงกับ node ใหม่
        await EpisodeModel.findByIdAndUpdate(episode._id, {
          storyMapNodeId: newNodeId,
          'storyMapData.nodeId': newNodeId,
          'storyMapData.lastSyncedAt': new Date()
        });

        stats.nodesCreated++;
        details.push({
          type: 'node_created',
          nodeId: newNodeId,
          episodeId: episode._id.toString(),
          title: episode.title
        });
      }

    } catch (error: any) {
      stats.errors++;
      errors.push(`Episode ${episode.title}: ${error.message}`);
    }
  }
}

// Sync StoryMap to Episodes (สร้าง/อัปเดต episodes จาก episode nodes)
async function syncStoryMapToEpisodes(
  storyMap: any,
  novelId: Types.ObjectId,
  nodeIds: string[],
  options: any,
  stats: any,
  details: any[],
  errors: string[],
  userId: Types.ObjectId
) {
  // Filter episode nodes
  const episodeNodes = storyMap.nodes.filter((node: any) => {
    const isEpisodeNode = node.nodeType === 'episode_node';
    const isTargetNode = nodeIds.length === 0 || nodeIds.includes(node.nodeId);
    return isEpisodeNode && isTargetNode;
  });

  for (const node of episodeNodes) {
    try {
      stats.nodesProcessed++;

      const nodeData = node.nodeSpecificData;
      if (!nodeData) continue;

      // ค้นหา Episode ที่เชื่อมโยงกับ node นี้
      let existingEpisode = null;
      if (nodeData.episodeId) {
        existingEpisode = await EpisodeModel.findById(nodeData.episodeId);
      }

      if (existingEpisode) {
        // อัปเดต Episode ที่มีอยู่
        const updateData: any = {
          title: node.title,
          storyMapNodeId: node.nodeId,
          'storyMapData.nodeId': node.nodeId,
          'storyMapData.position': node.position,
          'storyMapData.editorVisuals': node.editorVisuals,
          'storyMapData.lastSyncedAt': new Date(),
          lastContentUpdatedAt: new Date()
        };

        // อัปเดตเฉพาะข้อมูลที่ไม่ conflict กับการเปลี่ยนแปลงด้วยมือ
        if (!options.preserveManualChanges || !existingEpisode.lastContentUpdatedAt || 
            new Date(node.lastEdited || 0) > existingEpisode.lastContentUpdatedAt) {
          
          if (nodeData.episodeOrder !== undefined) {
            updateData.episodeOrder = nodeData.episodeOrder;
          }
          if (nodeData.episodeStatus) {
            updateData.status = nodeData.episodeStatus;
          }
        }

        await EpisodeModel.findByIdAndUpdate(existingEpisode._id, updateData);

        stats.episodesUpdated++;
        details.push({
          type: 'episode_updated',
          episodeId: existingEpisode._id.toString(),
          nodeId: node.nodeId,
          title: node.title
        });

      } else if (options.createMissingEpisodes && nodeData.episodeOrder !== undefined) {
        // สร้าง Episode ใหม่
        const newEpisode = new EpisodeModel({
          novelId: novelId,
          authorId: userId,
          title: node.title,
          episodeOrder: nodeData.episodeOrder,
          status: nodeData.episodeStatus || 'draft',
          accessType: 'free',
          sceneIds: [],
          storyMapNodeId: node.nodeId,
          storyMapData: {
            nodeId: node.nodeId,
            position: node.position,
            editorVisuals: node.editorVisuals,
            lastSyncedAt: new Date()
          },
          stats: {
            viewsCount: 0,
            uniqueViewersCount: 0,
            likesCount: 0,
            commentsCount: 0,
            totalWords: 0,
            estimatedReadingTimeMinutes: 0,
            purchasesCount: 0
          }
        });

        const savedEpisode = await newEpisode.save();

        // อัปเดต node ให้เชื่อมโยงกับ Episode ใหม่
        const nodeIndex = storyMap.nodes.findIndex((n: any) => n.nodeId === node.nodeId);
        if (nodeIndex !== -1) {
          storyMap.nodes[nodeIndex].nodeSpecificData.episodeId = savedEpisode._id;
        }

        stats.episodesCreated++;
        details.push({
          type: 'episode_created',
          episodeId: savedEpisode._id.toString(),
          nodeId: node.nodeId,
          title: node.title,
          episodeOrder: nodeData.episodeOrder
        });
      }

    } catch (error: any) {
      stats.errors++;
      errors.push(`Node ${node.nodeId}: ${error.message}`);
    }
  }
}

// 📝 GET /api/novels/[slug]/storymap/sync - ดู sync status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ค้นหา Novel
    const novel = await NovelModel.findOne({ 
      slug: slug,
      isDeleted: { $ne: true }
    }).select('_id author coAuthors');

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์
    const userId = new Types.ObjectId(session.user.id);
    const hasAccess = (novel.author as any).equals(userId) || 
                     (novel.coAuthors && novel.coAuthors.some((coAuthor: any) => 
                       (coAuthor._id || coAuthor).equals(userId)));

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ดึงข้อมูลสถานะ sync
    const [storyMap, episodes] = await Promise.all([
      StoryMapModel.findOne({
        novelId: novel._id,
        isActive: true
      }).select('nodes lastModifiedByUserId updatedAt'),
      EpisodeModel.find({ 
        novelId: novel._id 
      }).select('_id title episodeOrder status storyMapNodeId storyMapData')
    ]);

    if (!storyMap) {
      return NextResponse.json({ error: 'Active StoryMap not found' }, { status: 404 });
    }

    // วิเคราะห์สถานะ sync
    const episodeNodes = storyMap.nodes.filter((node: any) => node.nodeType === 'episode_node');
    const episodesWithNodes = episodes.filter(ep => ep.storyMapNodeId);
    const episodesWithoutNodes = episodes.filter(ep => !ep.storyMapNodeId);
    const nodesWithoutEpisodes = episodeNodes.filter(node => 
      !episodes.some(ep => ep._id.toString() === node.nodeSpecificData?.episodeId?.toString())
    );

    const syncStatus = {
      storyMapLastModified: storyMap.updatedAt,
      totalEpisodes: episodes.length,
      totalEpisodeNodes: episodeNodes.length,
      episodesWithNodes: episodesWithNodes.length,
      episodesWithoutNodes: episodesWithoutNodes.length,
      nodesWithoutEpisodes: nodesWithoutEpisodes.length,
      isInSync: episodesWithoutNodes.length === 0 && nodesWithoutEpisodes.length === 0,
      issues: [
        ...episodesWithoutNodes.map(ep => ({
          type: 'episode_without_node',
          episodeId: ep._id.toString(),
          title: ep.title,
          episodeOrder: ep.episodeOrder
        })),
        ...nodesWithoutEpisodes.map(node => ({
          type: 'node_without_episode',
          nodeId: node.nodeId,
          title: node.title,
          expectedEpisodeId: node.nodeSpecificData?.episodeId?.toString()
        }))
      ]
    };

    return NextResponse.json({
      success: true,
      syncStatus
    });

  } catch (error: any) {
    console.error('[GET /api/novels/[slug]/storymap/sync] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get sync status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, 
      { status: 500 }
    );
  }
}
