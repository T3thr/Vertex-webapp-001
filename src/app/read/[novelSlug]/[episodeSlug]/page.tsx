import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import PurchaseModel from '@/backend/models/Purchase';
import UserModel, { IUser } from '@/backend/models/User';
import PaywallDialog from './PaywallDialog';
import VisualNovelFrameReader, { SerializedScene } from '@/components/read/VisualNovelFrameReader';
import type { Metadata } from 'next';
import SceneModel from '@/backend/models/Scene';

interface ReadPageProps {
  params: Promise<{ novelSlug: string; episodeSlug: string }>;
  searchParams: Promise<{ sceneId?: string }>;
}

// Parse episode slug format: "1-การมาถึงย่านเก่า" -> { order: 1, slug: "การมาถึงย่านเก่า" }
function parseEpisodeSlug(episodeSlug: string): { order: number; slug: string } | null {
  // Decode URL-encoded Thai characters
  let decodedSlug = episodeSlug;
  try {
    decodedSlug = decodeURIComponent(episodeSlug);
  } catch (e) {
    // ใช้ slug เดิมหากไม่สามารถ decode ได้
  }
  
  const match = decodedSlug.match(/^(\d+)-(.+)$/);
  if (match) {
    return {
      order: parseInt(match[1]),
      slug: match[2]
    };
  }
  
  // Fallback: หากเป็นแค่ตัวเลข ให้ถือว่าเป็น episode order
  const orderOnly = parseInt(decodedSlug);
  if (!isNaN(orderOnly)) {
    return { order: orderOnly, slug: '' };
  }
  
  return null;
}

// ✅ [ปรับปรุง] ดึงข้อมูล Episode ทั้งหมดที่เข้าถึงได้ในครั้งเดียว
async function getAllAccessibleEpisodes(novelId: string, userId?: string) {
  const allEpisodes = await EpisodeModel.find({
    novelId: novelId,
    status: 'published'
  }).sort({ episodeOrder: 1 }).lean();

  const accessibleEpisodesData = [];
  const purchaseCheck = new Set();

  if (userId) {
    const purchases = await PurchaseModel.find({
      userId,
      'items.itemType': 'novel_episode',
      status: 'completed'
    }).select('items.itemId').lean();
    purchases.forEach(p => p.items.forEach(item => purchaseCheck.add(item.itemId.toString())));
  }

  const novel = await NovelModel.findById(novelId).select('author').lean();
  const isAuthor = novel?.author?.toString() === userId;

  for (const episode of allEpisodes) {
    let hasAccess = false;
    if (episode.accessType === 'free' || isAuthor || purchaseCheck.has(episode._id.toString())) {
        hasAccess = true;
    }

    if (hasAccess) {
      // ดึงข้อมูลฉากทั้งหมดสำหรับตอนนี้
      const scenes = await SceneModel.find({ episodeId: episode._id }).sort({ sceneOrder: 1 }).lean();
      accessibleEpisodesData.push({ ...episode, scenes });
    } else {
      // ยังคงเพิ่มตอนที่เข้าถึงไม่ได้ แต่ไม่มีข้อมูลฉาก
      accessibleEpisodesData.push(episode);
    }
  }
  return accessibleEpisodesData;
}

async function getNovelAndEpisode(novelSlug: string, episodeSlug: string) {
  await dbConnect();
  
  const episodeInfo = parseEpisodeSlug(episodeSlug);
  if (!episodeInfo) {
    return null;
  }
  
  let decodedNovelSlug = novelSlug;
  try {
    decodedNovelSlug = decodeURIComponent(novelSlug);
  } catch (e) {
    // Use original slug if decoding fails
  }
  
  try {
    // 1. Find the novel first. This is fast as slug should be indexed.
    const novel = await NovelModel.findOne({
      slug: decodedNovelSlug,
      isDeleted: { $ne: true },
      status: { $in: ['published', 'completed'] }
    })
    .select('_id title author slug coverImageUrl synopsis')
    .populate({
      path: 'author',
      select: '_id username primaryPenName avatarUrl',
      model: UserModel
    })
    .lean();

    if (!novel) {
      return null; // Novel not found
    }

    // 2. Find the episode using the novel's ID. This is much more efficient.
    const episode = await EpisodeModel.findOne({
      novelId: novel._id,
      episodeOrder: episodeInfo.order,
      status: 'published'
    })
    .select('_id title slug episodeOrder accessType priceCoins originalPriceCoins promotions earlyAccessStartDate earlyAccessEndDate firstSceneId teaserText stats')
    .lean();

    if (!episode) {
      return null; // Episode not found for this novel
    }
    
    // 3. Handle slug mismatches and redirect if necessary.
    if (episodeInfo.slug && episode.slug && episode.slug !== episodeInfo.slug) {
      const redirectUrl = `/read/${novel.slug}/${episode.episodeOrder}-${episode.slug}`;
      return { redirect: redirectUrl };
    }

    // ✅ [เพิ่มใหม่] ดึงข้อมูล Episodes ทั้งหมด
    const allEpisodes = await getAllAccessibleEpisodes(novel._id.toString(), undefined); // userId will be handled later

    return { novel, episode, allEpisodes };
  } catch (error) {
    console.error("Error in getNovelAndEpisode:", error);
    return null;
  }
}

async function checkEpisodeAccess(
  userId: string | undefined, 
  episode: any,
  novel: any
): Promise<{ hasAccess: boolean; reason?: string; effectivePrice?: number }> {
  const now = new Date();
  
  // ตรวจสอบ access type
  if (episode.accessType === 'free') {
    return { hasAccess: true, effectivePrice: 0 };
  }
  
  // ตรวจสอบการ login
  if (!userId) {
    return { 
      hasAccess: false, 
      reason: 'login_required',
      effectivePrice: await calculateEffectivePrice(episode)
    };
  }
  
  // ตรวจสอบว่าเป็นผู้เขียนหรือไม่
  const populatedAuthor = novel.author as IUser;
  const authorId = populatedAuthor && typeof populatedAuthor === 'object' && populatedAuthor._id 
    ? populatedAuthor._id.toString() 
    : novel.author?.toString();
  if (authorId === userId) {
    return { hasAccess: true, effectivePrice: 0 };
  }
  
  // ตรวจสอบ early access
  if (episode.accessType === 'early_access_paid') {
    if (episode.earlyAccessEndDate && now > new Date(episode.earlyAccessEndDate)) {
      episode.accessType = 'paid_unlock';
    }
  }
  
  // ตรวจสอบการซื้อ
  try {
    const purchase = await PurchaseModel.findOne({
      userId,
      'items.itemId': episode._id,
      'items.itemType': 'novel_episode',
      status: 'completed'
    }).lean();
    
    if (purchase) {
      return { hasAccess: true, effectivePrice: 0 };
    }
  } catch (error) {
    // ไม่แสดง error สำหรับ performance
  }
  
  // คำนวณราคา
  const effectivePrice = await calculateEffectivePrice(episode);
  
  return { 
    hasAccess: false, 
    reason: 'purchase_required',
    effectivePrice
  };
}

async function calculateEffectivePrice(episode: any): Promise<number> {
  const now = new Date();
  
  // ตรวจสอบโปรโมชั่น
  if (episode.promotions && episode.promotions.length > 0) {
    const activePromotion = episode.promotions.find((promo: any) => {
      return new Date(promo.startDate) <= now && new Date(promo.endDate) >= now;
    });
    
    if (activePromotion) {
      const basePrice = episode.priceCoins || 0;
      if (activePromotion.promotionType === 'percentage_discount' && activePromotion.discountPercentage) {
        return Math.round(basePrice * (1 - activePromotion.discountPercentage / 100));
      } else if (activePromotion.promotionType === 'fixed_discount' && activePromotion.discountAmount) {
        return Math.max(0, basePrice - activePromotion.discountAmount);
      }
    }
  }
  
  return episode.priceCoins || 0;
}

export async function generateMetadata({ params }: ReadPageProps): Promise<Metadata> {
  const { novelSlug, episodeSlug } = await params;
  
  try {
    const data = await getNovelAndEpisode(novelSlug, episodeSlug);
    
    if (!data || 'redirect' in data) {
      return {
        title: "ไม่พบตอนที่ต้องการอ่าน - DivWy",
        description: "ไม่พบตอนที่คุณต้องการอ่าน",
        robots: { index: false, follow: false }
      };
    }

    const { novel, episode } = data;
    
    return {
      title: `${episode.title} - ${novel.title} | DivWy`,
      description: episode.teaserText || `อ่าน "${novel.title}" ตอนที่ ${episode.episodeOrder}: ${episode.title} บน DivWy`,
      openGraph: {
        title: `${episode.title} - ${novel.title}`,
        description: episode.teaserText || novel.synopsis,
        images: novel.coverImageUrl ? [{ url: novel.coverImageUrl }] : [],
        type: 'article',
      },
      robots: { index: false, follow: false },
    };
  } catch (error) {
    return {
      title: "ไม่พบตอนที่ต้องการอ่าน - DivWy",
      description: "ไม่พบตอนที่คุณต้องการอ่าน",
      robots: { index: false, follow: false }
    };
  }
}

export default async function ReadPage({ params, searchParams }: ReadPageProps) {
  const { novelSlug, episodeSlug } = await params;
  const { sceneId } = await searchParams;
  
  // รับ session และข้อมูลพร้อมกัน
  const [session, data] = await Promise.all([
    getServerSession(authOptions),
    getNovelAndEpisode(novelSlug, episodeSlug)
  ]);
  
  const userId = session?.user?.id;
  
  if (!data) {
    notFound();
  }
  
  if ('redirect' in data) {
    redirect(data.redirect!);
  }
  
  const { novel, episode, allEpisodes } = data;
  
  // ตรวจสอบสิทธิ์การเข้าถึง
  const accessResult = await checkEpisodeAccess(userId, episode, novel);
  
  // ✅ [เพิ่มใหม่] โหลดข้อมูล Episode ทั้งหมดพร้อมการตรวจสอบสิทธิ์
  const allEpisodesWithAccess = await getAllAccessibleEpisodes(novel._id.toString(), userId);
  
  // หากไม่มีสิทธิ์ แสดง paywall
  if (!accessResult.hasAccess) {
    const serializedNovelForPaywall = {
      _id: novel._id.toString(),
      title: novel.title,
      slug: novel.slug || novelSlug,
      coverImageUrl: novel.coverImageUrl || '',
      synopsis: novel.synopsis || ''
    };

    const serializedEpisodeForPaywall = {
      _id: episode._id.toString(),
      title: episode.title,
      slug: episode.slug || '',
      episodeOrder: episode.episodeOrder,
      accessType: episode.accessType,
      priceCoins: episode.priceCoins || 0,
      originalPriceCoins: episode.originalPriceCoins || 0,
      teaserText: episode.teaserText || ''
    };

    const serializedUser = session?.user ? {
      id: session.user.id,
      name: session.user.name || '',
      email: session.user.email || '',
      coinBalance: (session.user as any).coinBalance || 0
    } : undefined;

    return (
      <PaywallDialog
        novel={serializedNovelForPaywall}
        episode={serializedEpisodeForPaywall}
        effectivePrice={accessResult.effectivePrice || 0}
        originalPrice={episode.originalPriceCoins || episode.priceCoins || 0}
        requiresLogin={accessResult.reason === 'login_required'}
        currentUser={serializedUser}
      />
    );
  }
  
  // เตรียมข้อมูลสำหรับ client components
  const populatedAuthor = novel.author as IUser;
  const serializedNovel = {
    _id: novel._id.toString(),
    title: novel.title,
    slug: novel.slug || novelSlug,
    coverImageUrl: novel.coverImageUrl || '',
    synopsis: novel.synopsis || '',
    author: populatedAuthor && typeof populatedAuthor === 'object' && populatedAuthor._id ? {
      _id: populatedAuthor._id.toString(),
      username: populatedAuthor.username || '',
      primaryPenName: populatedAuthor.primaryPenName || '',
      avatarUrl: populatedAuthor.avatarUrl || ''
    } : {
      _id: novel.author?.toString() || '',
      username: '',
      primaryPenName: '',
      avatarUrl: ''
    }
  };

  const serializedEpisode = {
    _id: episode._id.toString(),
    title: episode.title,
    slug: episode.slug || '',
    episodeOrder: episode.episodeOrder,
    accessType: episode.accessType,
    priceCoins: episode.priceCoins || 0,
    originalPriceCoins: episode.originalPriceCoins || 0,
    firstSceneId: episode.firstSceneId?.toString() || '',
    teaserText: episode.teaserText || '',
    stats: {
      viewsCount: episode.stats?.viewsCount || 0,
      likesCount: episode.stats?.likesCount || 0,
      commentsCount: episode.stats?.commentsCount || 0,
      estimatedReadingTimeMinutes: episode.stats?.estimatedReadingTimeMinutes || 10,
      totalWords: episode.stats?.totalWords || 0,
      uniqueViewersCount: episode.stats?.uniqueViewersCount || 0,
      purchasesCount: episode.stats?.purchasesCount || 0,
    }
  };

  // ✅ [เพิ่มใหม่] Serialize ข้อมูล allEpisodes
  const serializedAllEpisodes = toPlainObject(allEpisodesWithAccess);

  // แสดง reader โดยไม่มี loading
  return (
    <div className="flex items-center justify-center w-screen h-screen bg-black p-2 sm:p-4">
      <div className="relative w-full h-full max-w-full max-h-full aspect-[16/10] shadow-2xl rounded-lg overflow-hidden">
        <VisualNovelFrameReader
          novel={serializedNovel}
          episode={serializedEpisode}
          allEpisodes={serializedAllEpisodes}
          initialSceneId={sceneId || episode.firstSceneId?.toString()}
          userId={userId}
        />
      </div>
    </div>
  );
}

// ✅ [เพิ่มใหม่] Helper function to serialize complex objects
function toPlainObject(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
} 