import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import PurchaseModel from '@/backend/models/Purchase';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    const { slug } = await params;
    
    // Get current user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Find novel by slug
    const novel = await NovelModel.findOne({ 
      slug, 
      isDeleted: { $ne: true },
      status: { $in: ['published', 'completed'] }
    })
      .select('_id title author totalEpisodesCount publishedEpisodesCount monetizationSettings coverImageUrl synopsis')
      .lean();

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // Get episodes for this novel
    const episodes = await EpisodeModel.find({ 
      novelId: novel._id,
      status: 'published'
    })
      .select('_id title slug episodeOrder publishedAt teaserText accessType priceCoins originalPriceCoins stats firstSceneId authorNotesBefore novelId')
      .sort({ episodeOrder: 1 })
      .lean();

    // Check user purchases if logged in
    let userPurchases: any[] = [];
    if (userId) {
      userPurchases = await PurchaseModel.find({
        userId,
        'items.itemType': 'novel_episode',
        'items.itemId': { $in: episodes.map(ep => ep._id) },
        status: 'completed'
      })
        .select('items.itemId')
        .lean();
    }

    // Extract purchased episode IDs
    const purchasedEpisodeIds = new Set(
      userPurchases.flatMap(purchase => 
        purchase.items
          .filter((item: { itemType: string; }) => item.itemType === 'novel_episode')
          .map((item: { itemId: { toString: () => any; }; }) => item.itemId.toString())
      )
    );

    // Process episodes with access info
    const episodeList = await Promise.all(episodes.map(async (episode) => {
      const episodeDoc = await EpisodeModel.hydrate(episode);
      const effectivePrice = await episodeDoc.getEffectivePrice();
      const originalPrice = await episodeDoc.getOriginalPrice();
      
      const isOwned = userId && purchasedEpisodeIds.has(episode._id.toString());
      const isFree = episode.accessType === 'free' || effectivePrice === 0;
      const hasAccess = isFree || isOwned;

      return {
        _id: episode._id.toString(),
        title: episode.title,
        slug: episode.slug,
        episodeOrder: episode.episodeOrder,
        publishedAt: episode.publishedAt,
        teaserText: episode.teaserText,
        accessType: episode.accessType,
        effectivePrice,
        originalPrice,
        priceCoins: episode.priceCoins || 0,
        originalPriceCoins: episode.originalPriceCoins || episode.priceCoins || 0,
        hasAccess,
        isOwned,
        isFree,
        stats: {
          viewsCount: episode.stats?.viewsCount || 0,
          likesCount: episode.stats?.likesCount || 0,
          commentsCount: episode.stats?.commentsCount || 0,
          estimatedReadingTimeMinutes: episode.stats?.estimatedReadingTimeMinutes || 10,
          totalWords: episode.stats?.totalWords || 0
        },
        firstSceneId: episode.firstSceneId?.toString(),
        authorNotesBefore: episode.authorNotesBefore
      };
    }));

    // Calculate novel progress for user
    const totalEpisodes = episodeList.length;
    const ownedEpisodes = episodeList.filter(ep => ep.isOwned).length;
    const freeEpisodes = episodeList.filter(ep => ep.isFree).length;
    const lockedEpisodes = episodeList.filter(ep => !ep.hasAccess).length;

    return NextResponse.json({
      novel: {
        _id: novel._id.toString(),
        title: novel.title,
        coverImageUrl: novel.coverImageUrl,
        synopsis: novel.synopsis,
        totalEpisodes: novel.totalEpisodesCount,
        publishedEpisodes: novel.publishedEpisodesCount,
        monetizationSettings: novel.monetizationSettings,
        author: novel.author?.toString() || ''
      },
      episodes: episodeList,
      userProgress: {
        totalEpisodes,
        ownedEpisodes,
        freeEpisodes,
        lockedEpisodes,
        isLoggedIn: !!userId
      }
    });

  } catch (error) {
    console.error('Error fetching episodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch episodes' },
      { status: 500 }
    );
  }
} 