import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import SceneModel from '@/backend/models/Scene';
import NovelModel from '@/backend/models/Novel';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { slug, sceneId } = await params;

    // Verify novel ownership
    const novel = await NovelModel.findOne({ slug });
    if (!novel || novel.author.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Novel not found or access denied' }, { status: 404 });
    }

    // Get scene
    const scene = await SceneModel.findOne({
      _id: sceneId,
      novelId: novel._id
    }).lean();

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    return NextResponse.json({ scene });
  } catch (error) {
    console.error('Error fetching scene:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { slug, sceneId } = await params;

    // Verify novel ownership
    const novel = await NovelModel.findOne({ slug });
    if (!novel || novel.author.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Novel not found or access denied' }, { status: 404 });
    }

    const body = await request.json();
    const updateData = { ...body };

    // Remove _id from update data if present
    delete updateData._id;

    // Update scene
    const scene = await SceneModel.findOneAndUpdate(
      {
        _id: sceneId,
        novelId: novel._id
      },
      updateData,
      { new: true }
    );

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    return NextResponse.json({ scene });
  } catch (error) {
    console.error('Error updating scene:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { slug, sceneId } = await params;

    // Verify novel ownership
    const novel = await NovelModel.findOne({ slug });
    if (!novel || novel.author.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Novel not found or access denied' }, { status: 404 });
    }

    // Delete scene
    const scene = await SceneModel.findOneAndDelete({
      _id: sceneId,
      novelId: novel._id
    });

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Scene deleted successfully' });
  } catch (error) {
    console.error('Error deleting scene:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}