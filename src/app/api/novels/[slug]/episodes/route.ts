// src/app/api/novels/[slug]/episodes/route.ts
// 🎯 API Routes สำหรับการจัดการ Episodes ใน Blueprint Tab

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel, { EpisodeStatus, EpisodeAccessType } from '@/backend/models/Episode';
import StoryMapModel from '@/backend/models/StoryMap';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { Types } from 'mongoose';

// 🔥 Type Definitions สำหรับ Request/Response
interface CreateEpisodeRequest {
  title: string;
  episodeOrder: number;
  volumeNumber?: number;
  status?: EpisodeStatus;
  accessType?: EpisodeAccessType;
  priceCoins?: number;
  teaserText?: string;
  // Blueprint Integration
  storyMapData?: {
    nodeId: string;
    position: { x: number; y: number };
    editorVisuals?: any;
  };
}

interface UpdateEpisodeRequest extends Partial<CreateEpisodeRequest> {
  _id: string;
}

// 📝 GET /api/novels/[slug]/episodes - ดึงรายการ Episodes ทั้งหมดของนิยาย
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

    // ค้นหา Novel จาก slug
    const novel = await NovelModel.findOne({ 
      slug: slug,
      isDeleted: { $ne: true }
    }).select('_id author coAuthors');

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    const userId = new Types.ObjectId(session.user.id);
    const hasAccess = (novel.author as Types.ObjectId).equals(userId) || 
                     (novel.coAuthors && novel.coAuthors.some((coAuthor: any) => 
                       coAuthor instanceof Types.ObjectId ? coAuthor.equals(userId) : coAuthor._id?.equals(userId)));

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ดึงรายการ Episodes พร้อม populate ข้อมูลที่จำเป็น
    const episodes = await EpisodeModel.find({ 
      novelId: novel._id 
    })
    .select('_id title slug episodeOrder volumeNumber status accessType priceCoins publishedAt lastContentUpdatedAt storyMapNodeId storyMapData stats createdAt updatedAt')
    .sort({ episodeOrder: 1, createdAt: 1 })
    .lean();

    return NextResponse.json({
      success: true,
      episodes: episodes || [],
      count: episodes?.length || 0
    });

  } catch (error: any) {
    console.error('[GET /api/novels/[slug]/episodes] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch episodes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, 
      { status: 500 }
    );
  }
}

// 📝 POST /api/novels/[slug]/episodes - สร้าง Episode ใหม่
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

    // Parse request body
    const body: CreateEpisodeRequest = await request.json();
    const { 
      title, 
      episodeOrder, 
      volumeNumber,
      status = EpisodeStatus.DRAFT,
      accessType = EpisodeAccessType.FREE,
      priceCoins,
      teaserText,
      storyMapData
    } = body;

    // Validation
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Episode title is required' }, { status: 400 });
    }

    if (typeof episodeOrder !== 'number' || episodeOrder < 0) {
      return NextResponse.json({ error: 'Valid episode order is required' }, { status: 400 });
    }

    // ค้นหา Novel
    const novel = await NovelModel.findOne({ 
      slug: slug,
      isDeleted: { $ne: true }
    }).select('_id author coAuthors totalEpisodesCount');

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

    // ตรวจสอบความซ้ำของ episodeOrder
    const existingEpisode = await EpisodeModel.findOne({
      novelId: novel._id,
      episodeOrder: episodeOrder
    });

    if (existingEpisode) {
      return NextResponse.json({ 
        error: `Episode order ${episodeOrder} already exists` 
      }, { status: 400 });
    }

    // สร้าง Episode ใหม่
    const newEpisode = new EpisodeModel({
      novelId: novel._id,
      authorId: userId,
      title: title.trim(),
      slug: `${slug}-episode-${episodeOrder}`, // Generate episode slug
      episodeOrder,
      volumeNumber,
      status,
      accessType,
      priceCoins,
      teaserText: teaserText?.trim(),
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
      // 🎯 StoryMap Integration
      ...(storyMapData && {
        storyMapNodeId: storyMapData.nodeId,
        storyMapData: {
          ...storyMapData,
          lastSyncedAt: new Date()
        }
      })
    });

    const savedEpisode = await newEpisode.save();

    // 🎯 PROFESSIONAL: สร้าง Episode-specific StoryMap พร้อมกับ Episode (ไม่มี Start Node)
    // เพื่อให้แต่ละ Episode มี StoryMap ของตัวเองตาม Architecture @Episode.ts และ @StoryMap.ts
    // ✅ NEW STANDARD: ไม่สร้าง Start Node ทันที - ให้ผู้ใช้สร้างเองตามต้องการ
    try {
      console.log(`[POST Episode] 🎯 Creating empty Episode-specific StoryMap for episode: ${savedEpisode.title}`);
      
      const episodeStoryMap = new StoryMapModel({
        novelId: novel._id,
        episodeId: savedEpisode._id, // 🔥 CRITICAL: เชื่อมโยงกับ Episode
        title: `${savedEpisode.title} - โครงเรื่อง`,
        version: 1,
        description: `แผนผังเรื่องราวสำหรับ ${savedEpisode.title}`,
        nodes: [], // ✅ NEW STANDARD: เริ่มต้นด้วย canvas ว่างเปล่า
        edges: [],
        storyVariables: [],
        startNodeId: null, // ✅ NEW STANDARD: จะถูกกำหนดเมื่อผู้ใช้สร้าง start node
        lastModifiedByUserId: userId,
        isActive: true,
        editorMetadata: {
          zoomLevel: 1,
          viewOffsetX: 0,
          viewOffsetY: 0,
          gridSize: 20,
          showGrid: true,
          showSceneThumbnails: false,
          showNodeLabels: true,
          uiPreferences: {
            nodeDefaultColor: '#3b82f6',
            edgeDefaultColor: '#64748b',
            connectionLineStyle: 'solid',
            showConnectionLines: true,
            autoSaveEnabled: false,
            autoSaveIntervalSec: 30,
            snapToGrid: false,
            enableAnimations: true,
            nodeDefaultOrientation: 'vertical',
            edgeDefaultPathType: 'smooth',
            showMinimap: false,
            enableNodeThumbnails: false
          }
        }
      });

      const savedStoryMap = await episodeStoryMap.save();
      
      // เชื่อมโยง StoryMap กับ Episode
      savedEpisode.storyMapId = savedStoryMap._id;
      await savedEpisode.save();
      
      console.log(`[POST Episode] ✅ Empty Episode-specific StoryMap created successfully:`, {
        episodeId: savedEpisode._id.toString(),
        storyMapId: savedStoryMap._id.toString(),
        episodeTitle: savedEpisode.title,
        noStartNode: true
      });
      
    } catch (storyMapError: any) {
      console.error('[POST Episode] 🚨 Episode StoryMap creation error:', storyMapError);
      // ⚠️ Warning: Episode สร้างสำเร็จแล้ว แต่ StoryMap สร้างไม่สำเร็จ
      // ไม่ throw error เพื่อไม่ rollback การสร้าง Episode
      // User สามารถสร้าง nodes ได้ภายหลัง และ save endpoint จะสร้าง StoryMap อัตโนมัติ
    }

    // Return created episode
    return NextResponse.json({
      success: true,
      episode: {
        _id: savedEpisode._id,
        title: savedEpisode.title,
        slug: savedEpisode.slug,
        episodeOrder: savedEpisode.episodeOrder,
        volumeNumber: savedEpisode.volumeNumber,
        status: savedEpisode.status,
        accessType: savedEpisode.accessType,
        priceCoins: savedEpisode.priceCoins,
        teaserText: savedEpisode.teaserText,
        storyMapNodeId: savedEpisode.storyMapNodeId,
        storyMapData: savedEpisode.storyMapData,
        stats: savedEpisode.stats,
        createdAt: savedEpisode.createdAt,
        updatedAt: savedEpisode.updatedAt
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/novels/[slug]/episodes] Error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json({
        error: 'Validation failed',
        details: Object.values(error.errors).map((err: any) => err.message)
      }, { status: 400 });
    }

    return NextResponse.json(
      { 
        error: 'Failed to create episode',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, 
      { status: 500 }
    );
  }
}

// 📝 PUT /api/novels/[slug]/episodes - อัปเดต Episode (Batch Update Support)
export async function PUT(
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

    const body: UpdateEpisodeRequest | UpdateEpisodeRequest[] = await request.json();
    const updates = Array.isArray(body) ? body : [body];

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

    const results = [];

    for (const update of updates) {
      try {
        const { _id, ...updateData } = update;
        
        if (!_id || !Types.ObjectId.isValid(_id)) {
          results.push({
            success: false,
            episodeId: _id,
            error: 'Invalid episode ID'
          });
          continue;
        }

        // อัปเดต Episode
        const updatedEpisode = await EpisodeModel.findOneAndUpdate(
          { 
            _id: new Types.ObjectId(_id),
            novelId: novel._id 
          },
          {
            ...updateData,
            lastContentUpdatedAt: new Date()
          },
          { 
            new: true, 
            runValidators: true 
          }
        ).select('_id title slug episodeOrder volumeNumber status accessType priceCoins storyMapNodeId storyMapData stats updatedAt');

        if (!updatedEpisode) {
          results.push({
            success: false,
            episodeId: _id,
            error: 'Episode not found'
          });
          continue;
        }

        // 🎯 Sync กับ StoryMap ถ้าจำเป็น
        if (updateData.storyMapData || updateData.title || updateData.status) {
          try {
            const storyMap = await StoryMapModel.findOne({
              novelId: novel._id,
              isActive: true
            });

            if (storyMap && updatedEpisode.storyMapNodeId) {
              const nodeIndex = storyMap.nodes.findIndex(
                node => node.nodeId === updatedEpisode.storyMapNodeId
              );

              if (nodeIndex !== -1) {
                storyMap.nodes[nodeIndex] = {
                  ...storyMap.nodes[nodeIndex],
                  ...(updateData.title && { title: updateData.title }),
                  ...(updateData.storyMapData && {
                    position: updateData.storyMapData.position,
                    editorVisuals: updateData.storyMapData.editorVisuals
                  }),
                  nodeSpecificData: {
                    ...storyMap.nodes[nodeIndex].nodeSpecificData,
                    episodeTitle: updatedEpisode.title,
                    episodeStatus: updatedEpisode.status
                  },
                  lastEdited: new Date()
                };

                storyMap.lastModifiedByUserId = userId;
                await storyMap.save();
              }
            }
          } catch (storyMapError) {
            console.error('[PUT Episode] StoryMap sync error:', storyMapError);
          }
        }

        results.push({
          success: true,
          episode: updatedEpisode
        });

      } catch (episodeError: any) {
        results.push({
          success: false,
          episodeId: update._id,
          error: episodeError.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error: any) {
    console.error('[PUT /api/novels/[slug]/episodes] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update episodes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, 
      { status: 500 }
    );
  }
}

// 📝 DELETE /api/novels/[slug]/episodes - ลบ Episode (Batch Delete Support)
export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const episodeIds = searchParams.get('ids')?.split(',') || [];

    if (episodeIds.length === 0) {
      return NextResponse.json({ error: 'No episode IDs provided' }, { status: 400 });
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

    const validIds = episodeIds.filter(id => Types.ObjectId.isValid(id));
    const results = [];

    for (const episodeId of validIds) {
      try {
        // ค้นหา Episode ก่อนลบเพื่อเก็บข้อมูล storyMapNodeId
        const episodeToDelete = await EpisodeModel.findOne({
          _id: new Types.ObjectId(episodeId),
          novelId: novel._id
        }).select('_id storyMapNodeId title');

        if (!episodeToDelete) {
          results.push({
            success: false,
            episodeId,
            error: 'Episode not found'
          });
          continue;
        }

        // ลบ Episode
        await EpisodeModel.findByIdAndDelete(episodeToDelete._id);

        // 🎯 ลบ node จาก StoryMap ถ้ามี
        if (episodeToDelete.storyMapNodeId) {
          try {
            const storyMap = await StoryMapModel.findOne({
              novelId: novel._id,
              isActive: true
            });

            if (storyMap) {
              // ลบ node และ edges ที่เกี่ยวข้อง
              storyMap.nodes = storyMap.nodes.filter(
                node => node.nodeId !== episodeToDelete.storyMapNodeId
              );
              
              storyMap.edges = storyMap.edges.filter(
                edge => edge.sourceNodeId !== episodeToDelete.storyMapNodeId && 
                       edge.targetNodeId !== episodeToDelete.storyMapNodeId
              );

              storyMap.lastModifiedByUserId = userId;
              await storyMap.save();
            }
          } catch (storyMapError) {
            console.error('[DELETE Episode] StoryMap cleanup error:', storyMapError);
          }
        }

        results.push({
          success: true,
          episodeId,
          title: episodeToDelete.title
        });

      } catch (deleteError: any) {
        results.push({
          success: false,
          episodeId,
          error: deleteError.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      deletedCount: results.filter(r => r.success).length
    });

  } catch (error: any) {
    console.error('[DELETE /api/novels/[slug]/episodes] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete episodes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, 
      { status: 500 }
    );
  }
}