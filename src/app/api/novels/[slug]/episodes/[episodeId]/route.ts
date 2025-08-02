import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import SceneModel from '@/backend/models/Scene';
import CharacterModel from '@/backend/models/Character';
import ChoiceModel from '@/backend/models/Choice';
import StoryMapModel from '@/backend/models/StoryMap';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; episodeId: string }> }
) {
  try {
    await dbConnect();
    const { slug, episodeId } = await params;

    const novel = await NovelModel.findOne({ slug, isDeleted: { $ne: true } }).select('_id').lean();
    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    const episode = await EpisodeModel.findOne({ _id: episodeId, novelId: novel._id }).lean();
    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    const [scenes, characters, choices, storyMap] = await Promise.all([
      SceneModel.find({ episodeId: episode._id }).sort({ sceneOrder: 1 }).lean(),
      CharacterModel.find({ novelId: novel._id, isArchived: { $ne: true } }).lean(),
      ChoiceModel.find({ novelId: novel._id, isArchived: { $ne: true } }).lean(),
      StoryMapModel.findOne({ novelId: novel._id, isActive: true }).lean()
    ]);

    const characterLookup = characters.reduce((acc, char) => {
      acc[char._id.toString()] = char;
      return acc;
    }, {} as Record<string, any>);

    const choiceLookup = choices.reduce((acc, choice) => {
        acc[choice._id.toString()] = choice;
        return acc;
    }, {} as Record<string, any>);

    const processedScenes = scenes.map((scene: any) => {
      const sceneCharacters = (scene.characters || []).map((char: any) => ({
        instanceId: char.instanceId,
        characterId: char.characterId.toString(),
        characterData: characterLookup[char.characterId.toString()],
        expressionId: char.expressionId,
        transform: char.transform,
        isVisible: char.isVisible !== false,
      }));
      
      const textContents = (scene.textContents || []).map((tc: any) => ({
        instanceId: tc.instanceId,
        type: tc.type,
        characterId: tc.characterId?.toString(),
        speakerDisplayName: tc.speakerDisplayName,
        content: tc.content,
      }));
      
      const sceneChoices = (scene.choiceIds || []).map((choiceId: any) => {
          const choiceData = choiceLookup[choiceId.toString()];
          return choiceData ? {
              _id: choiceData._id.toString(),
              text: choiceData.text,
              hoverText: choiceData.hoverText,
              actions: choiceData.actions,
          } : null;
      }).filter(Boolean);

      return {
        _id: scene._id.toString(),
        nodeId: scene.nodeId,
        sceneOrder: scene.sceneOrder,
        title: scene.title,
        background: scene.background,
        characters: sceneCharacters,
        textContents,
        choices: sceneChoices,
        defaultNextSceneId: scene.defaultNextSceneId?.toString(),
        ending: scene.ending, // เพิ่มการส่ง ending data
        audioElements: scene.audios || [],
      };
    });

    const response = {
      ...episode,
      _id: episode._id.toString(),
      firstSceneId: episode.firstSceneId?.toString(),
      scenes: processedScenes,
      storyMap: storyMap ? {
        _id: storyMap._id.toString(),
        nodes: storyMap.nodes,
        edges: storyMap.edges,
        storyVariables: storyMap.storyVariables,
        startNodeId: storyMap.startNodeId
      } : null,
    };
    
    // The top-level choices property is removed as choices are now embedded in scenes
    delete (response as any).choices;

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching episode:', error);
    return NextResponse.json(
      { error: 'Failed to fetch episode data' },
      { status: 500 }
    );
  }
} 