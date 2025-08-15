import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/backend/lib/mongodb';
import UserLibraryItem from '@/backend/models/UserLibraryItem';
import { IReadingProgress } from '@/backend/models/UserLibraryItem';
import { emitUserCompletedStory } from '@/backend/events/GamificationEvents';
import { gamificationService } from '@/backend/services/GamificationService';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { userId, novelId, episodeId, lastSceneId, isCompleted } = body;

    if (!userId || !novelId || !episodeId || !lastSceneId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Validate ObjectId strings to avoid runtime exceptions
    const invalidIds: string[] = [];
    if (!Types.ObjectId.isValid(userId)) invalidIds.push('userId');
    if (!Types.ObjectId.isValid(novelId)) invalidIds.push('novelId');
    if (!Types.ObjectId.isValid(episodeId)) invalidIds.push('episodeId');
    if (invalidIds.length > 0) {
      return NextResponse.json({ message: `Invalid ObjectId for: ${invalidIds.join(', ')}` }, { status: 400 });
    }

    const progressUpdate: Partial<IReadingProgress> = {
      lastReadEpisodeId: new Types.ObjectId(episodeId),
      // The model expects a scene *index* (number), but we have a scene *ID* (string).
      // For now, we'll store the scene ID in `customProgressMarker` as a simple solution.
      // A proper fix would involve converting scene ID to index or changing the model.
      customProgressMarker: { lastSceneId },
      lastReadAt: new Date(),
    };

    let libraryItem = await UserLibraryItem.findOne({
        userId: new Types.ObjectId(userId),
        novelId: new Types.ObjectId(novelId),
    });

    if (!libraryItem) {
        // If the item doesn't exist, create it.
        libraryItem = new UserLibraryItem({
            userId: new Types.ObjectId(userId),
            novelId: new Types.ObjectId(novelId),
            // Use the correct schema field name (array of statuses)
            statuses: ['reading'],
            addedAt: new Date(),
        });
    }

    // Apply the progress update
    libraryItem.readingProgress = {
        ...libraryItem.readingProgress,
        ...progressUpdate,
    };
    
    const updatedItem = await libraryItem.save();


    let achievementResult: { unlocked: boolean; unlockedTierLevel?: number; unlockedTitle?: string } | null = null;
    if (isCompleted) {
        // Emit the original event for any other listeners
        try {
          emitUserCompletedStory(userId, novelId);
        } catch (e) {
          console.warn('Warning: emitUserCompletedStory failed:', e);
        }
        
        // Trigger gamification progress tracking for reading (do not block save on failure)
        try {
          const result = await gamificationService.trackAchievementProgress(userId, 'FIRST_READER', 1);
          achievementResult = result;
          if (result?.unlocked) {
            console.log(`[ReadingProgress] Unlocked achievement '${result.unlockedTitle}' at tier ${result.unlockedTierLevel} for user ${userId}`);
          } else if (result?.error) {
            console.warn(`[ReadingProgress] trackAchievementProgress returned error: ${result.error}`);
          }
        } catch (e) {
          console.warn('Warning: trackAchievementProgress failed:', e);
        }
    }

    return NextResponse.json({ message: 'Progress saved successfully', data: updatedItem, achievement: achievementResult }, { status: 200 });

  } catch (error: any) {
    console.error('Error saving reading progress:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
