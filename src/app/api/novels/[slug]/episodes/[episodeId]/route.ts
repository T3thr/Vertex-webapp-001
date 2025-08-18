// API Route: /api/novels/[slug]/episodes/[episodeId]
// GET: Fetch Episode data
// PUT: Update existing Episode
// DELETE: Delete Episode

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel, { IEpisode } from '@/backend/models/Episode';
import SceneModel from '@/backend/models/Scene';
import CharacterModel from '@/backend/models/Character';
import ChoiceModel from '@/backend/models/Choice';
import StoryMapModel from '@/backend/models/StoryMap';
import { validateNovelAccess } from '../../storymap/auth-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    const { slug, episodeId } = await params;

    await dbConnect();

    // 1) Find public novel by slug
    const novel = await NovelModel.findOne({
      slug,
      isDeleted: { $ne: true },
      status: { $in: ['published', 'completed'] }
    })
      .select('_id title status')
      .lean();

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // 2) Find public episode in this novel
    const episode = await EpisodeModel.findOne({
      _id: episodeId,
      novelId: novel._id,
      status: 'published'
    })
      .select(
        '_id novelId authorId title slug episodeOrder accessType priceCoins originalPriceCoins teaserText stats firstSceneId nextEpisodeId previousEpisodeId'
      )
      .lean();

    if (!episode) {
      return NextResponse.json({ error: 'ไม่พบตอนที่ระบุ' }, { status: 404 });
    }

    // 3) Preload characters of this novel for lookup
    const characters = await CharacterModel.find({
      novelId: novel._id,
      isArchived: { $ne: true }
    })
      .select('_id name profileImageMediaId profileImageSourceType expressions')
      .lean();
    const characterMap = new Map(characters.map((c: any) => [c._id.toString(), c]));

    // 4) Load scenes of this episode (ordered)
    const rawScenes = await SceneModel.find({
      novelId: novel._id,
      episodeId: episode._id,
    })
      .sort({ sceneOrder: 1 })
      .lean();

    // 5) For each scene, attach characters, text contents, and choices
    const sceneIds = rawScenes.map((s: any) => s._id);
    // Prefer explicit choiceIds if present; otherwise skip
    const allChoiceIds = rawScenes.flatMap((s: any) => (Array.isArray(s.choiceIds) ? s.choiceIds : []));
    const choicesById = new Map<string, any>();
    if (allChoiceIds.length > 0) {
      const foundChoices = await ChoiceModel.find({ _id: { $in: allChoiceIds } })
        .select('_id text hoverText actions isTimedChoice timeLimitSeconds isArchived')
        .lean();
      for (const ch of foundChoices) {
        choicesById.set(ch._id.toString(), ch);
      }
    }

    const scenes = rawScenes.map((scene: any) => {
      // characters with embedded characterData
      const charactersInScene = (scene.characters || []).map((char: any) => ({
        instanceId: char.instanceId,
        characterId: char.characterId?.toString(),
        characterData: char.characterId ? characterMap.get(char.characterId.toString()) : undefined,
        expressionId: char.expressionId,
        transform: char.transform,
        isVisible: char.isVisible !== false,
        enterAnimation: char.enterAnimation,
        exitAnimation: char.exitAnimation,
        layerId: char.layerId,
        currentStatusEffects: char.currentStatusEffects || [],
      }));

      // text contents with stringified ids
      const textContents = (scene.textContents || []).map((t: any) => ({
        ...t,
        characterId: t.characterId ? t.characterId.toString() : undefined,
        voiceOverMediaId: t.voiceOverMediaId ? t.voiceOverMediaId.toString() : undefined,
      }));

      // choices
      const sceneChoices: any[] = Array.isArray(scene.choiceIds)
        ? scene.choiceIds
            .map((id: any) => choicesById.get(id.toString()))
            .filter((c: any) => c && c.isArchived !== true)
            .map((c: any) => ({
              _id: c._id.toString(),
              text: c.text,
              hoverText: c.hoverText,
              actions: c.actions,
              isTimedChoice: c.isTimedChoice,
              timeLimitSeconds: c.timeLimitSeconds,
            }))
        : [];

      return {
        _id: scene._id.toString(),
        novelId: scene.novelId.toString(),
        episodeId: scene.episodeId.toString(),
        nodeId: scene.nodeId,
        title: scene.title,
        background: scene.background,
        version: scene.version,
        layers: scene.layers,
        characters: charactersInScene,
        textContents,
        images: scene.images,
        videos: scene.videos,
        audios: (scene.audios || []).map((a: any) => ({
          ...a,
          mediaId: a.mediaId?.toString(),
        })),
        choices: sceneChoices,
        interactiveHotspots: scene.interactiveHotspots,
        statusUIElements: scene.statusUIElements,
        activeSceneEffects: scene.activeSceneEffects,
        timelineTracks: scene.timelineTracks,
        camera: scene.camera,
        defaultNextSceneId: scene.defaultNextSceneId ? scene.defaultNextSceneId.toString() : undefined,
        previousSceneId: scene.previousSceneId ? scene.previousSceneId.toString() : undefined,
        sceneTransitionOut: scene.sceneTransitionOut,
        autoAdvanceDelayMs: scene.autoAdvanceDelayMs,
        sceneVariables: scene.sceneVariables,
        onLoadScriptContent: scene.onLoadScriptContent,
        onExitScriptContent: scene.onExitScriptContent,
        editorNotes: scene.editorNotes,
        thumbnailUrl: scene.thumbnailUrl,
        authorDefinedEmotionTags: scene.authorDefinedEmotionTags,
        sceneTags: scene.sceneTags,
        entryConditions: scene.entryConditions,
        estimatedComplexity: scene.estimatedComplexity,
        criticalAssets: scene.criticalAssets,
        ending: scene.ending || undefined,
      };
    });

    // 6) Optional: include story map for client-side branch resolution
    const storyMap = await StoryMapModel.findOne({ novelId: novel._id, isActive: true })
      .select('_id nodes edges storyVariables startNodeId')
      .lean();

    // 7) Construct response object to match client expectations
    const detailedEpisode = {
      _id: episode._id.toString(),
      novelId: episode.novelId.toString(),
      authorId: episode.authorId?.toString?.() || '',
      title: episode.title,
      slug: episode.slug,
      episodeOrder: episode.episodeOrder,
      accessType: episode.accessType,
      priceCoins: episode.priceCoins || 0,
      originalPriceCoins: episode.originalPriceCoins || 0,
      teaserText: episode.teaserText || '',
      stats: episode.stats || undefined,
      firstSceneId: episode.firstSceneId ? episode.firstSceneId.toString() : undefined,
      nextEpisodeId: episode.nextEpisodeId ? episode.nextEpisodeId.toString() : undefined,
      previousEpisodeId: episode.previousEpisodeId ? episode.previousEpisodeId.toString() : undefined,
      scenes,
      storyMap: storyMap
        ? {
            _id: storyMap._id.toString(),
            nodes: storyMap.nodes,
            edges: storyMap.edges,
            storyVariables: storyMap.storyVariables,
            startNodeId: storyMap.startNodeId,
          }
        : null,
    };

    return NextResponse.json(detailedEpisode);
  } catch (error) {
    console.error('[Episode GET] Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตอน' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    const { slug, episodeId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    const body = await request.json();

    // Find existing episode
    const existingEpisode = await EpisodeModel.findOne({
      _id: episodeId,
      novelId: novel!._id
    });

    if (!existingEpisode) {
      return NextResponse.json({ 
        error: 'ไม่พบตอนที่ระบุ' 
      }, { status: 404 });
    }

    // Update episode
    const updateData: Partial<IEpisode> = {
      ...body,
      updatedAt: new Date()
    };

    // Remove _id from updateData to prevent conflicts
    delete (updateData as any)._id;

    // Handle status changes
    if (updateData.status === 'published' && existingEpisode.status !== 'published') {
      updateData.publishedAt = new Date();
    }

    const updatedEpisode = await EpisodeModel.findByIdAndUpdate(
      episodeId,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({ 
      episode: JSON.parse(JSON.stringify(updatedEpisode!.toObject())),
      success: true,
      message: 'อัพเดตตอนสำเร็จ'
    });

  } catch (error) {
    console.error('[Episode PUT] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการอัพเดตตอน' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    const { slug, episodeId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    // Find and delete episode
    const episode = await EpisodeModel.findOne({
      _id: episodeId,
      novelId: novel!._id
    });

    if (!episode) {
      return NextResponse.json({ 
        error: 'ไม่พบตอนที่ระบุ' 
      }, { status: 404 });
    }

    await EpisodeModel.findByIdAndDelete(episodeId);

    return NextResponse.json({ 
      success: true,
      message: 'ลบตอนสำเร็จ'
    });

  } catch (error) {
    console.error('[Episode DELETE] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการลบตอน' 
    }, { status: 500 });
  }
}