import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import PurchaseModel from '@/backend/models/Purchase';
import UserModel, { IUser } from '@/backend/models/User';
import PaywallDialog from './PaywallDialog';
import VisualNovelFrameReader from '@/components/read/VisualNovelFrameReader';
import type { Metadata } from 'next';

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

async function getNovelAndEpisode(novelSlug: string, episodeSlug: string) {
  await dbConnect();
  
  // Parse episode information
  const episodeInfo = parseEpisodeSlug(episodeSlug);
  if (!episodeInfo) {
    return null;
  }
  
  // Decode novel slug
  let decodedNovelSlug = novelSlug;
  try {
    decodedNovelSlug = decodeURIComponent(novelSlug);
  } catch (e) {
    // ใช้ slug เดิมหากไม่สามารถ decode ได้
  }
  
  try {
    // ค้นหา novel และ episode พร้อมกัน
    const [novel, episode] = await Promise.all([
      NovelModel.findOne({ 
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
        .lean(),
      
      // ค้นหา episode โดยใช้ novel slug เพื่อความเร็ว
      EpisodeModel.findOne({
        episodeOrder: episodeInfo.order,
        status: 'published'
      })
        .populate({
          path: 'novelId',
          match: { slug: decodedNovelSlug, isDeleted: { $ne: true } },
          select: '_id'
        })
        .select('_id title slug episodeOrder accessType priceCoins originalPriceCoins promotions earlyAccessStartDate earlyAccessEndDate firstSceneId teaserText stats novelId')
        .lean()
    ]);

    if (!novel) {
      return null;
    }

    // ตรวจสอบว่า episode เป็นของ novel นี้
    if (!episode || !episode.novelId || episode.novelId._id.toString() !== novel._id.toString()) {
      // ลองหาด้วย novel ID
      const correctEpisode = await EpisodeModel.findOne({
        novelId: novel._id,
        episodeOrder: episodeInfo.order,
        status: 'published'
      }).select('_id title slug episodeOrder accessType priceCoins originalPriceCoins promotions earlyAccessStartDate earlyAccessEndDate firstSceneId teaserText stats').lean();
      
      if (!correctEpisode) {
        return null;
      }
      
      // หาก slug ไม่ตรงให้ redirect
      if (episodeInfo.slug && correctEpisode.slug && correctEpisode.slug !== episodeInfo.slug) {
        const redirectUrl = `/read/${novel.slug}/${episodeInfo.order}-${correctEpisode.slug}`;
        return { redirect: redirectUrl };
      }
      
      return { novel, episode: correctEpisode };
    }

    return { novel, episode };
  } catch (error) {
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
  
  const { novel, episode } = data;
  
  // ตรวจสอบสิทธิ์การเข้าถึง
  const accessResult = await checkEpisodeAccess(userId, episode, novel);
  
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
      totalWords: episode.stats?.totalWords || 0
    }
  };

  // แสดง reader โดยไม่มี loading
  return (
    <VisualNovelFrameReader
      novel={serializedNovel}
      episode={serializedEpisode}
      initialSceneId={sceneId || episode.firstSceneId?.toString()}
      userId={userId}
    />
  );
} 