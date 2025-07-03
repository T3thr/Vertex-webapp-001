import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    const { slug } = await params;

    // Find novel by slug
    const novel = await NovelModel.findOne({ 
      slug, 
      isDeleted: { $ne: true },
      status: { $in: ['published', 'completed'] }
    })
      .select('_id title author totalEpisodesCount publishedEpisodesCount')
      .lean();

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // Get episodes for this novel
    const episodes = await EpisodeModel.find({ 
      novelId: novel._id,
      status: 'published'
    })
      .select('_id title episodeOrder publishedAt teaserText accessType priceCoins stats firstSceneId')
      .sort({ episodeOrder: 1 })
      .lean();

    const episodeList = episodes.map(episode => ({
      _id: episode._id.toString(),
      title: episode.title,
      episodeOrder: episode.episodeOrder,
      publishedAt: episode.publishedAt,
      teaserText: episode.teaserText,
      accessType: episode.accessType,
      priceCoins: episode.priceCoins || 0,
      stats: {
        viewsCount: episode.stats?.viewsCount || 0,
        likesCount: episode.stats?.likesCount || 0,
        estimatedReadingTimeMinutes: episode.stats?.estimatedReadingTimeMinutes || 10
      },
      firstSceneId: episode.firstSceneId?.toString()
    }));

    return NextResponse.json({
      novel: {
        _id: novel._id.toString(),
        title: novel.title,
        totalEpisodes: novel.totalEpisodesCount,
        publishedEpisodes: novel.publishedEpisodesCount
      },
      episodes: episodeList
    });

  } catch (error) {
    console.error('Error fetching episodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch episodes' },
      { status: 500 }
    );
  }
} 