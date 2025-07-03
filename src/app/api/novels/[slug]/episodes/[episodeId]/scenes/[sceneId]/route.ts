import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import SceneModel from '@/backend/models/Scene';
import CharacterModel from '@/backend/models/Character';
import ChoiceModel from '@/backend/models/Choice';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string; sceneId: string }> }
) {
  try {
    await dbConnect();
    const { slug, episodeId, sceneId } = await params;

    // Find novel by slug
    const novel = await NovelModel.findOne({ slug, isDeleted: { $ne: true } })
      .select('_id title author')
      .lean();

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // Find episode
    const episode = await EpisodeModel.findOne({ 
      _id: episodeId, 
      novelId: novel._id 
    })
      .select('_id title firstSceneId')
      .lean();

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    let scene;
    
    // Handle special scene IDs
    if (sceneId === 'first') {
      scene = await SceneModel.findOne({ 
        episodeId: episode._id,
        sceneOrder: 1 
      });
    } else {
      scene = await SceneModel.findById(sceneId);
    }

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    // Get all characters in this novel for reference
    const characters = await CharacterModel.find({ 
      novelId: novel._id,
      isArchived: { $ne: true }
    }).lean();

    // Create character lookup
    const characterLookup = characters.reduce((acc, char) => {
      acc[char._id.toString()] = char;
      return acc;
    }, {} as Record<string, any>);

    // Process characters in scene
    const processedCharacters = scene.characters.map((char: any) => ({
      instanceId: char.instanceId,
      characterId: char.characterId.toString(),
      characterData: characterLookup[char.characterId.toString()],
      expressionId: char.expressionId,
      transform: char.transform,
      isVisible: char.isVisible !== false
    }));

    // Get choices for this scene (if any)
    const choices = await ChoiceModel.find({
      novelId: novel._id,
      originStoryMapNodeId: scene._id.toString()
    }).lean();

    // Create dialogue from text contents
    const dialogue = scene.textContents.map((text: any, index: number) => ({
      id: text.instanceId || `dialogue-${index}`,
      speaker: text.speakerDisplayName,
      speakerId: text.characterId?.toString(),
      content: text.content,
      characterExpression: null,
      voiceFile: text.voiceOverMediaId ? `/api/media/${text.voiceOverMediaId}` : null
    }));

    // Process audio elements
    const audioElements = scene.audios.map((audio: any) => ({
      instanceId: audio.instanceId,
      type: audio.type,
      mediaId: audio.mediaId.toString(),
      volume: audio.volume || 1,
      loop: audio.loop || false
    }));

    // Construct scene response
    const sceneResponse = {
      _id: scene._id.toString(),
      title: scene.title,
      background: scene.background,
      characters: processedCharacters,
      dialogue,
      choices: choices.map((choice: any) => ({
        _id: choice._id.toString(),
        text: choice.text,
        hoverText: choice.hoverText,
        actions: choice.actions,
        isTimedChoice: choice.isTimedChoice,
        timeLimitSeconds: choice.timeLimitSeconds
      })),
      nextSceneId: scene.defaultNextSceneId?.toString(),
      audioElements
    };

    return NextResponse.json(sceneResponse);

  } catch (error) {
    console.error('Error fetching scene:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scene data' },
      { status: 500 }
    );
  }
} 