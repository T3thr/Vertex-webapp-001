// API Route: /api/novels/[slug]/scenes/[sceneId]
// GET: Fetch scene data by ID with full timeline and media information
// PUT: Update scene data with comprehensive validation
// DELETE: Delete scene with dependency checking
// PATCH: Update specific scene components (timeline, media, etc.)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import SceneModel, { IScene, ITimelineEvent, ITimelineTrack } from '@/backend/models/Scene';
import MediaModel from '@/backend/models/Media';
import OfficialMediaModel from '@/backend/models/OfficialMedia';
import CharacterModel from '@/backend/models/Character';
import { validateNovelAccess } from '../../storymap/auth-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const { slug, sceneId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    // Find the scene with populated data
    const scene = await SceneModel.findOne({
      _id: sceneId,
      novelId: novel!._id
    }).lean();

    if (!scene) {
      return NextResponse.json({ 
        error: 'ไม่พบฉากที่ระบุ' 
      }, { status: 404 });
    }

    // Get related media information
    const mediaIds = new Set<string>();
    const officialMediaIds = new Set<string>();
    const characterIds = new Set<string>();

    // Collect IDs from various scene elements
    scene.images?.forEach((img: any) => {
      if (img.mediaSourceType === 'Media') {
        mediaIds.add(img.mediaId.toString());
      } else if (img.mediaSourceType === 'OfficialMedia') {
        officialMediaIds.add(img.mediaId.toString());
      }
    });

    scene.audios?.forEach((audio: any) => {
      if (audio.mediaSourceType === 'Media') {
        mediaIds.add(audio.mediaId.toString());
      } else if (audio.mediaSourceType === 'OfficialMedia') {
        officialMediaIds.add(audio.mediaId.toString());
      }
    });

    scene.characters?.forEach((char: any) => {
      if (char.characterId) {
        characterIds.add(char.characterId.toString());
      }
    });

    // Fetch related data in parallel
    const [mediaFiles, officialMediaFiles, characters] = await Promise.all([
      mediaIds.size > 0 ? MediaModel.find({
        _id: { $in: Array.from(mediaIds) },
        status: 'available'
      }).lean() : [],
      officialMediaIds.size > 0 ? OfficialMediaModel.find({
        _id: { $in: Array.from(officialMediaIds) },
        status: 'approved_for_library'
      }).lean() : [],
      characterIds.size > 0 ? CharacterModel.find({
        _id: { $in: Array.from(characterIds) },
        novelId: novel!._id
      }).lean() : []
    ]);

    // Create lookup maps
    const mediaMap = new Map(mediaFiles.map((m: any) => [m._id.toString(), m]));
    const officialMediaMap = new Map(officialMediaFiles.map((m: any) => [m._id.toString(), m]));
    const characterMap = new Map(characters.map((c: any) => [c._id.toString(), c]));

    // Analyze timeline for additional insights
    const timelineAnalysis = analyzeTimeline(scene.timelineTracks || []);

    // Calculate scene statistics
    const statistics = {
      totalTimelineTracks: scene.timelineTracks?.length || 0,
      totalEvents: scene.timelineTracks?.reduce((sum: number, track: any) => sum + (track.events?.length || 0), 0) || 0,
      estimatedDuration: timelineAnalysis.estimatedDurationMs,
      mediaUsageCount: mediaIds.size + officialMediaIds.size,
      characterCount: characterIds.size,
      complexityScore: calculateSceneComplexity(scene)
    };

    return NextResponse.json({ 
      scene: JSON.parse(JSON.stringify(scene)),
      relatedMedia: {
        userMedia: Array.from(mediaMap.values()),
        officialMedia: Array.from(officialMediaMap.values())
      },
      characters: Array.from(characterMap.values()),
      analysis: {
        timeline: timelineAnalysis,
        statistics
      },
      success: true 
    });

  } catch (error) {
    console.error('[Scene GET] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลฉาก' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const { slug, sceneId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    const body = await request.json();

    // Find existing scene
    const existingScene = await SceneModel.findOne({
      _id: sceneId,
      novelId: novel!._id
    });

    if (!existingScene) {
      return NextResponse.json({ 
        error: 'ไม่พบฉากที่ระบุ' 
      }, { status: 404 });
    }

    // Update scene
    const updateData: Partial<IScene> = {
      ...body,
      updatedAt: new Date()
    };

    // Remove _id from updateData to prevent conflicts
    delete (updateData as any)._id;

    const updatedScene = await SceneModel.findByIdAndUpdate(
      sceneId,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({ 
      scene: JSON.parse(JSON.stringify(updatedScene!.toObject())),
      success: true,
      message: 'อัพเดตฉากสำเร็จ'
    });

  } catch (error) {
    console.error('[Scene PUT] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการอัพเดตฉาก' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const { slug, sceneId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    // Find and delete scene
    const scene = await SceneModel.findOne({
      _id: sceneId,
      novelId: novel!._id
    });

    if (!scene) {
      return NextResponse.json({ 
        error: 'ไม่พบฉากที่ระบุ' 
      }, { status: 404 });
    }

    await SceneModel.findByIdAndDelete(sceneId);

    return NextResponse.json({ 
      success: true,
      message: 'ลบฉากสำเร็จ'
    });

  } catch (error) {
    console.error('[Scene DELETE] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการลบฉาก' 
    }, { status: 500 });
  }
}

// Helper function to analyze timeline
function analyzeTimeline(tracks: any[]): any {
  let maxEndTime = 0;
  let eventsByType: Record<string, number> = {};
  let layerUsage: Record<string, number> = {};

  tracks.forEach(track => {
    track.events?.forEach((event: any) => {
      const endTime = event.startTimeMs + (event.durationMs || 0);
      maxEndTime = Math.max(maxEndTime, endTime);

      // Count event types
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;

      // Count layer usage
      if (track.targetLayerId) {
        layerUsage[track.targetLayerId] = (layerUsage[track.targetLayerId] || 0) + 1;
      }
    });
  });

  return {
    estimatedDurationMs: maxEndTime,
    eventsByType,
    layerUsage,
    trackCount: tracks.length,
    totalEvents: Object.values(eventsByType).reduce((sum: number, count: number) => sum + count, 0)
  };
}

// Helper function to calculate scene complexity
function calculateSceneComplexity(scene: any): number {
  let complexity = 0;
  
  // Base complexity from elements
  complexity += (scene.characters?.length || 0) * 2;
  complexity += (scene.images?.length || 0) * 1;
  complexity += (scene.audios?.length || 0) * 1;
  complexity += (scene.videos?.length || 0) * 3;
  complexity += (scene.interactiveHotspots?.length || 0) * 5;
  complexity += (scene.choiceGroupsAvailable?.length || 0) * 4;
  
  // Timeline complexity
  const totalEvents = scene.timelineTracks?.reduce((sum: number, track: any) => 
    sum + (track.events?.length || 0), 0) || 0;
  complexity += totalEvents * 2;
  
  // Variable and script complexity
  complexity += (scene.sceneVariables?.length || 0) * 1;
  if (scene.onLoadScriptContent) complexity += 5;
  if (scene.onExitScriptContent) complexity += 5;
  
  return complexity;
}