import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/backend/lib/mongodb';
import UserLibraryItem from '@/backend/models/UserLibraryItem';
import { IReadingProgress } from '@/backend/models/UserLibraryItem';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { userId, novelId, episodeId, lastSceneId, isCompleted } = body;

    if (!userId || !novelId || !episodeId || !lastSceneId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const progressUpdate: Partial<IReadingProgress> = {
      lastReadEpisodeId: new Types.ObjectId(episodeId),
      // The model expects a scene *index* (number), but we have a scene *ID* (string).
      // For now, we'll store the scene ID in `customProgressMarker` as a simple solution.
      // A proper fix would involve converting scene ID to index or changing the model.
      customProgressMarker: { lastSceneId },
      lastReadAt: new Date(),
    };

    const updatedItem = await UserLibraryItem.updateReadingProgress(
      new Types.ObjectId(userId),
      new Types.ObjectId(novelId),
      progressUpdate
    );

    if (!updatedItem) {
      // If the item doesn't exist, we might want to create it.
      // For now, we'll just return a 404.
      return NextResponse.json({ message: 'Library item not found for this user and novel' }, { status: 404 });
    }

    if (isCompleted) {
        // Logic to handle episode completion if needed in the future
    }

    return NextResponse.json({ message: 'Progress saved successfully', data: updatedItem }, { status: 200 });

  } catch (error: any) {
    console.error('Error saving reading progress:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
