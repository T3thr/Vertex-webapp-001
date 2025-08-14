import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import SceneModel from '@/backend/models/Scene';
import EpisodeModel from '@/backend/models/Episode';
import NovelModel from '@/backend/models/Novel';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { slug } = await params;

    // Verify novel ownership
    const novel = await NovelModel.findOne({ slug });
    if (!novel || novel.author.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Novel not found or access denied' }, { status: 404 });
    }

    // Get all scenes for the novel
    const scenes = await SceneModel.find({ novelId: novel._id })
      .sort({ episodeId: 1, sceneOrder: 1 })
      .lean();

    return NextResponse.json({ scenes });
  } catch (error) {
    console.error('Error fetching scenes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { slug } = await params;

    // Verify novel ownership
    const novel = await NovelModel.findOne({ slug });
    if (!novel || novel.author.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Novel not found or access denied' }, { status: 404 });
    }

    const body = await request.json();
    const { episodeId, title, nodeId } = body;

    // Verify episode ownership
    const episode = await EpisodeModel.findOne({
      _id: episodeId,
      novelId: novel._id
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    // Get next scene order
    const lastScene = await SceneModel.findOne({ episodeId })
      .sort({ sceneOrder: -1 })
      .lean();

    const sceneOrder = (lastScene?.sceneOrder || 0) + 1;

    // Create new scene
    const scene = new SceneModel({
      novelId: novel._id,
      episodeId,
      sceneOrder,
      nodeId,
      title: title || `Scene ${sceneOrder}`,
      background: {
        type: 'color',
        value: '#ffffff'
      },
      version: 1,
      layers: [
        {
          layerId: 'background',
          layerName: 'Background',
          zIndex: 0,
          isVisible: true,
          isLocked: false
        },
        {
          layerId: 'characters',
          layerName: 'Characters',
          zIndex: 1,
          isVisible: true,
          isLocked: false
        },
        {
          layerId: 'ui',
          layerName: 'UI',
          zIndex: 10,
          isVisible: true,
          isLocked: false
        }
      ],
      characters: [],
      textContents: [],
      images: [],
      videos: [],
      audios: [],
      choiceGroupsAvailable: [],
      choiceIds: [],
      interactiveHotspots: [],
      statusUIElements: [],
      activeSceneEffects: [],
      timelineTracks: [],
      sceneVariables: []
    });

    await scene.save();

    return NextResponse.json({ scene }, { status: 201 });
  } catch (error) {
    console.error('Error creating scene:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}