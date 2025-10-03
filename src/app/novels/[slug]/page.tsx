// src/app/novels/[slug]/page.tsx
'use server'; // ระบุว่าเป็น Server Component

import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
// เพิ่มการเชื่อมต่อและโมเดลสำหรับการดึงข้อมูลโดยตรงจากฐานข้อมูล
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel, INovelStats, ISourceType, INarrativeFocus, IWorldBuildingDetails, IMonetizationSettings, IPsychologicalAnalysisConfig, ICollaborationSettings } from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User";
import CategoryModel, { ICategory } from "@/backend/models/Category";
import CharacterModel, { CharacterRoleInStory } from "@/backend/models/Character";
import EpisodeModel, { EpisodeStatus, EpisodeAccessType } from "@/backend/models/Episode";
import NovelHeader from "@/components/novels/NovelHeader";
import NovelTabs from "@/components/novels/NovelTabs";

interface NovelPageProps {
  params: Promise<{ slug: string }>; // ปรับให้ params เป็น Promise ตาม Next.js App Router 2025
}

interface PopulatedCategoryInfo {
  _id: string;
  name: string;
  slug: string;
  color?: string;
}

interface PopulatedNovelForDetailPage {
  _id: string;
  title: string;
  slug: string;
  author: {
    _id: string;
    username?: string;
    profile?: any;
    writerStats?: any;
  };
  synopsis?: string;
  longDescription?: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  themeAssignment: any;
  narrativeFocus?: any;
  worldBuildingDetails?: any;
  ageRatingCategoryId?: PopulatedCategoryInfo;
  status: INovel["status"];
  accessLevel: INovel["accessLevel"];
  isCompleted?: boolean;
  endingType?: INovel["endingType"];
  sourceType?: ISourceType;
  language: PopulatedCategoryInfo;
  firstEpisodeId?: string;
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  stats?: INovelStats;
  monetizationSettings?: IMonetizationSettings;
  psychologicalAnalysisConfig?: IPsychologicalAnalysisConfig;
  collaborationSettings?: ICollaborationSettings;
  isFeatured?: boolean;
  publishedAt?: string;
  scheduledPublicationDate?: string;
  lastContentUpdatedAt: string;
  relatedNovels?: string[];
  seriesId?: string;
  seriesOrder?: number;
  createdAt: string;
  updatedAt: string;
  characters?: any[];
  episodes?: any[];
}

const toPopulatedCategoryInfo = (cat: any): PopulatedCategoryInfo | undefined => {
  if (!cat || typeof cat !== "object" || !("_id" in cat)) return undefined;
  return {
    _id: cat._id.toString(),
    name: cat.name,
    slug: cat.slug,
    color: cat.color,
  };
};

const toPopulatedCategoryInfoArray = (cats: any[]): PopulatedCategoryInfo[] => {
  if (!Array.isArray(cats)) return [];
  return cats
    .map(toPopulatedCategoryInfo)
    .filter((cat): cat is PopulatedCategoryInfo => Boolean(cat));
};

const toPopulatedCharacter = (char: any) => {
  if (!char || typeof char !== "object" || !("_id" in char)) return undefined;
  const imageUrl =
    char.profileImageUrl ||
    (char.characterCode ? `/images/character/${char.characterCode}_fullbody.png` : "/images/default-avatar.png");
  return {
    _id: char._id.toString(),
    name: char.name,
    characterCode: char.characterCode,
    profileImageUrl: imageUrl,
    description: char.description,
    roleInStory: char.roleInStory as CharacterRoleInStory,
    colorTheme: char.colorTheme,
  };
};

async function getNovelDataDirect(slug: string): Promise<PopulatedNovelForDetailPage | null> {
  await dbConnect();

  // Decode URL-encoded Thai slug with error handling
  let decodedSlug: string;
  try {
    decodedSlug = decodeURIComponent(slug.trim());
  } catch (error) {
    console.error(`[NovelPage] Error decoding slug "${slug}":`, error);
    return null;
  }
  
  const novelFromDb = await NovelModel.findOne({ slug: decodedSlug, isDeleted: false })
    .populate<{ author: IUser }>({ path: "author", select: "_id username profile writerStats", model: UserModel })
    .populate<{ "themeAssignment.mainTheme.categoryId": ICategory }>({
      path: "themeAssignment.mainTheme.categoryId",
      select: "_id name slug color",
      model: CategoryModel,
    })
    .populate<{ "themeAssignment.subThemes.categoryId": ICategory[] }>({
      path: "themeAssignment.subThemes.categoryId",
      select: "_id name slug color",
      model: CategoryModel,
    })
    .populate<{ "themeAssignment.moodAndTone": ICategory[] }>({
      path: "themeAssignment.moodAndTone",
      select: "_id name slug color",
      model: CategoryModel,
    })
    .populate<{ "themeAssignment.contentWarnings": ICategory[] }>({
      path: "themeAssignment.contentWarnings",
      select: "_id name slug color",
      model: CategoryModel,
    })
    .populate<{ ageRatingCategoryId: ICategory }>({
      path: "ageRatingCategoryId",
      select: "_id name slug color",
      model: CategoryModel,
    })
    .populate<{ language: ICategory }>({
      path: "language",
      select: "_id name slug",
      model: CategoryModel,
    })
    .lean();

  if (!novelFromDb) return null;

  const charactersRaw = await CharacterModel.find({ novelId: novelFromDb._id }).lean();
  const characters = charactersRaw.map(toPopulatedCharacter).filter(Boolean);

  const episodesRaw = await EpisodeModel.find({
    novelId: novelFromDb._id,
    status: { $in: [EpisodeStatus.PUBLISHED, EpisodeStatus.SCHEDULED] },
  })
    .select(
      "_id title slug episodeOrder status accessType priceCoins originalPriceCoins publishedAt teaserText stats"
    )
    .sort({ episodeOrder: 1 })
    .limit(10)
    .lean();

  const episodes = episodesRaw.map((ep) => ({
    _id: ep._id.toString(),
    title: ep.title,
    slug: ep.slug || "no-slug",
    episodeOrder: ep.episodeOrder,
    status: ep.status as EpisodeStatus,
    accessType: ep.accessType as EpisodeAccessType,
    priceCoins: ep.priceCoins,
    originalPriceCoins: ep.originalPriceCoins,
    publishedAt: ep.publishedAt?.toISOString(),
    teaserText: ep.teaserText,
    stats: {
      viewsCount: ep.stats?.viewsCount || 0,
      likesCount: ep.stats?.likesCount || 0,
      commentsCount: ep.stats?.commentsCount || 0,
      totalWords: ep.stats?.totalWords || 0,
      estimatedReadingTimeMinutes: ep.stats?.estimatedReadingTimeMinutes || 0,
    },
  }));

  const populatedAuthor = novelFromDb.author as unknown as IUser;

  // Helper to convert ObjectId(s) to string to avoid Next.js serialization error
  const toId = (val: any): string | undefined => {
    if (!val) return undefined;
    return typeof val === 'string' ? val : val.toString();
  };

  const toIdArray = (arr: any): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((v) => toId(v)).filter(Boolean) as string[];
  };

  const narrativeFocusSanitized = novelFromDb.narrativeFocus
    ? {
        narrativePacingTags: toIdArray((novelFromDb.narrativeFocus as any).narrativePacingTags),
        primaryConflictTypes: toIdArray((novelFromDb.narrativeFocus as any).primaryConflictTypes),
        narrativePerspective: toId((novelFromDb.narrativeFocus as any).narrativePerspective) as any,
        storyArcStructure: toId((novelFromDb.narrativeFocus as any).storyArcStructure) as any,
        artStyle: toId((novelFromDb.narrativeFocus as any).artStyle) as any,
        gameplayMechanics: toIdArray((novelFromDb.narrativeFocus as any).gameplayMechanics),
        interactivityLevel: toId((novelFromDb.narrativeFocus as any).interactivityLevel) as any,
        playerAgencyLevel: toId((novelFromDb.narrativeFocus as any).playerAgencyLevel) as any,
        lengthTag: toId((novelFromDb.narrativeFocus as any).lengthTag) as any,
        commonTropes: toIdArray((novelFromDb.narrativeFocus as any).commonTropes),
        targetAudienceProfileTags: toIdArray((novelFromDb.narrativeFocus as any).targetAudienceProfileTags),
        avoidIfYouDislikeTags: toIdArray((novelFromDb.narrativeFocus as any).avoidIfYouDislikeTags),
      }
    : undefined;

  const worldBuildingDetailsSanitized = novelFromDb.worldBuildingDetails
    ? {
        ...novelFromDb.worldBuildingDetails,
        keyLocationsAtlasId: toId((novelFromDb.worldBuildingDetails as any).keyLocationsAtlasId) as any,
      }
    : undefined;

  const responseData: PopulatedNovelForDetailPage = {
    _id: novelFromDb._id.toString(),
    title: novelFromDb.title,
    slug: novelFromDb.slug,
    author: {
      _id: populatedAuthor._id.toString(),
      username: populatedAuthor.username,
      profile: populatedAuthor.profile,
      writerStats: populatedAuthor.writerStats
        ? {
            totalNovelsPublished: populatedAuthor.writerStats.totalNovelsPublished,
            totalViewsAcrossAllNovels: populatedAuthor.writerStats.totalViewsAcrossAllNovels,
            totalLikesReceivedOnNovels: populatedAuthor.writerStats.totalLikesReceivedOnNovels,
          }
        : undefined,
    },
    synopsis: novelFromDb.synopsis,
    longDescription: novelFromDb.longDescription,
    coverImageUrl: novelFromDb.coverImageUrl,
    bannerImageUrl: novelFromDb.bannerImageUrl,
    themeAssignment: {
      mainTheme: {
        categoryId: toPopulatedCategoryInfo(novelFromDb.themeAssignment?.mainTheme?.categoryId)!,
        customName: novelFromDb.themeAssignment?.mainTheme?.customName,
      },
      subThemes:
        novelFromDb.themeAssignment?.subThemes?.map((st, idx) => ({
          categoryId: toPopulatedCategoryInfo(
            novelFromDb.themeAssignment?.subThemes?.[idx]?.categoryId as any
          )!,
          customName: st.customName,
        })) || [],
      moodAndTone: toPopulatedCategoryInfoArray(novelFromDb.themeAssignment?.moodAndTone as any[] || []),
      contentWarnings: toPopulatedCategoryInfoArray(
        novelFromDb.themeAssignment?.contentWarnings as any[] || []
      ),
      customTags: novelFromDb.themeAssignment?.customTags || [],
    },
    narrativeFocus: narrativeFocusSanitized as any,
    worldBuildingDetails: worldBuildingDetailsSanitized as any,
    ageRatingCategoryId: toPopulatedCategoryInfo(novelFromDb.ageRatingCategoryId as any),
    status: novelFromDb.status as INovel["status"],
    accessLevel: novelFromDb.accessLevel as INovel["accessLevel"],
    isCompleted: novelFromDb.isCompleted,
    endingType: novelFromDb.endingType as INovel["endingType"],
    sourceType: novelFromDb.sourceType as ISourceType,
    language: toPopulatedCategoryInfo(novelFromDb.language as any)!,
    firstEpisodeId: novelFromDb.firstEpisodeId?.toString(),
    totalEpisodesCount: novelFromDb.totalEpisodesCount,
    publishedEpisodesCount: novelFromDb.publishedEpisodesCount,
    stats: novelFromDb.stats as INovelStats,
    monetizationSettings: novelFromDb.monetizationSettings as IMonetizationSettings,
    psychologicalAnalysisConfig: novelFromDb.psychologicalAnalysisConfig as IPsychologicalAnalysisConfig,
    collaborationSettings: novelFromDb.collaborationSettings as ICollaborationSettings,
    isFeatured: novelFromDb.isFeatured,
    publishedAt: novelFromDb.publishedAt?.toISOString(),
    scheduledPublicationDate: novelFromDb.scheduledPublicationDate?.toISOString(),
    lastContentUpdatedAt: novelFromDb.lastContentUpdatedAt.toISOString(),
    relatedNovels: novelFromDb.relatedNovels?.map((id) => id.toString()),
    seriesId: novelFromDb.seriesId?.toString(),
    seriesOrder: novelFromDb.seriesOrder,
    createdAt: novelFromDb.createdAt.toISOString(),
    updatedAt: novelFromDb.updatedAt.toISOString(),
    characters: characters as any,
    episodes: episodes as any,
  };

  return responseData;
}

/**
 * ดึงข้อมูลนิยายจาก API ตาม slug
 * @param slug Slug ของนิยาย
 * @returns Promise<PopulatedNovelForDetailPage | null> ข้อมูลนิยายหรือ null หากไม่พบ
 */
async function getNovelData(slug: string): Promise<PopulatedNovelForDetailPage | null> {
  try {
    return await getNovelDataDirect(slug);
  } catch (err) {
    console.error(`[NovelPage] Error fetching novel via direct DB:`, err);
    return null;
  }
}

/**
 * สร้าง metadata สำหรับหน้ารายละเอียดนิยาย
 * @param props NovelPageProps
 * @param parent ResolvingMetadata
 * @returns Promise<Metadata> ข้อมูล metadata สำหรับ SEO
 */
export async function generateMetadata(
  { params }: NovelPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params; // Resolve Promise จาก params
  if (typeof slug !== 'string' || !slug.trim()) {
    console.warn(`⚠️ [generateMetadata] Slug ไม่ถูกต้อง: "${slug}"`);
    return {
      title: "ข้อมูลไม่ถูกต้อง - DivWy",
      description: "ไม่สามารถโหลดข้อมูลสำหรับเนื้อหานี้ได้เนื่องจาก slug ไม่ถูกต้อง",
      robots: { index: false, follow: false }
    };
  }

  let decodedSlug: string;
  try {
    decodedSlug = decodeURIComponent(slug.trim());
  } catch (error) {
    console.error(`[generateMetadata] Error decoding slug "${slug}":`, error);
    return {
      title: "ข้อมูลไม่ถูกต้อง - DivWy",
      description: "ไม่สามารถโหลดข้อมูลสำหรับเนื้อหานี้ได้เนื่องจาก slug ไม่ถูกต้อง",
      robots: { index: false, follow: false }
    };
  }
  const novel = await getNovelData(decodedSlug);

  if (!novel) {
    return {
      title: "ไม่พบนิยาย - DivWy",
      description: `ขออภัย ไม่พบข้อมูลนิยายที่คุณกำลังค้นหา (slug: ${decodedSlug})`,
      robots: { index: false, follow: false }
    };
  }
  const siteName = (await parent).openGraph?.siteName || process.env.NEXT_PUBLIC_SITE_NAME || "DivWy";
  const authorName = novel.author?.profile?.penNames?.[0] || novel.author?.profile?.displayName || novel.author?.username || 'ผู้เขียนนิรนาม';
  const pageTitle = `${novel.title} - โดย ${authorName} | ${siteName}`;
  const description = novel.synopsis
    ? novel.synopsis.substring(0, 160).trim() + (novel.synopsis.length > 160 ? "..." : "")
    : `อ่านนิยาย "${novel.title}" เขียนโดย ${authorName} บน ${siteName} แพลตฟอร์ม Visual Novel และนิยายออนไลน์หลากหลายแนว`;

  // กำหนด base URL สำหรับรูปภาพ
  let baseUrlForImage = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrlForImage) {
    baseUrlForImage = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  }

  let imageUrl = novel.coverImageUrl;
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
    imageUrl = `${baseUrlForImage}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  } else if (!imageUrl) {
    imageUrl = `${baseUrlForImage}/images/default-og-image.png`;
  }

  const publishedTime = novel.publishedAt ? new Date(novel.publishedAt).toISOString() : undefined;
  const modifiedTime = novel.lastContentUpdatedAt ? new Date(novel.lastContentUpdatedAt).toISOString() : (novel.updatedAt ? new Date(novel.updatedAt).toISOString() : undefined);

  // สร้าง keywords จากข้อมูลนิยาย
  const keywordsSet = new Set<string>();
  novel.themeAssignment?.customTags?.forEach((tag: string) => keywordsSet.add(tag.trim()));
  if (novel.themeAssignment?.mainTheme?.categoryId?.name) keywordsSet.add(novel.themeAssignment.mainTheme.categoryId.name.trim());
  novel.themeAssignment?.subThemes?.forEach((st: any) => { if (st?.categoryId?.name) keywordsSet.add(st.categoryId.name.trim()); });
  novel.themeAssignment?.moodAndTone?.forEach((mt: any) => { if (mt?.name) keywordsSet.add(mt.name.trim()); });
  if (novel.language?.name) keywordsSet.add(novel.language.name.trim());
  keywordsSet.add("visual novel");
  keywordsSet.add("นิยาย");
  keywordsSet.add(authorName);
  keywordsSet.add(novel.title);

  return {
    metadataBase: new URL(baseUrlForImage),
    title: pageTitle,
    description: description,
    keywords: Array.from(keywordsSet).filter(Boolean),
    authors: [{ name: authorName, url: novel.author?.username ? `${baseUrlForImage}/u/${novel.author.username}` : undefined }],
    alternates: {
      canonical: `/novels/${novel.slug}`,
    },
    openGraph: {
      title: pageTitle,
      description: description,
      url: `${baseUrlForImage}/novels/${novel.slug}`,
      siteName: siteName,
      images: imageUrl ? [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: `ปกนิยายเรื่อง ${novel.title}`,
      }] : [],
      locale: novel.language?.slug?.startsWith('th') ? "th_TH" : (novel.language?.slug?.startsWith('en') ? "en_US" : undefined),
      type: "article",
      tags: novel.themeAssignment?.customTags || [],
      publishedTime: publishedTime,
      modifiedTime: modifiedTime,
      section: novel.themeAssignment?.mainTheme?.categoryId?.name,
      authors: novel.author?.username ? [`${baseUrlForImage}/u/${novel.author.username}`] : [authorName],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: description,
      images: imageUrl ? [{ url: imageUrl, alt: `ปกนิยายเรื่อง ${novel.title}` }] : [],
    },
  };
}

/**
 * หน้ารายละเอียดนิยาย
 * @param props NovelPageProps
 * @returns JSX.Element หน้าสำหรับแสดงรายละเอียดนิยาย
 */
export default async function NovelPage({ params }: NovelPageProps) {
  const { slug } = await params; // Resolve Promise จาก params
  if (typeof slug !== 'string' || !slug.trim()) {
    console.warn(`⚠️ [NovelPage] Slug ไม่ถูกต้อง: "${slug}"`);
    notFound();
  }

  let decodedSlug: string;
  try {
    decodedSlug = decodeURIComponent(slug.trim());
  } catch (error) {
    console.error(`[NovelPage] Error decoding slug "${slug}":`, error);
    notFound();
  }
  const novel = await getNovelData(decodedSlug);

  if (!novel) {
    console.log(`⚠️ [NovelPage] ไม่พบข้อมูลนิยายสำหรับ slug "${slug}"`);
    notFound();
  }

  return (
    <div className="novel-detail-page-container bg-background text-foreground min-h-screen">
      <NovelHeader novel={novel} />
      <main className="container-custom mx-auto px-2 sm:px-4 py-6 md:py-8">
        <NovelTabs novel={novel} />
      </main>
    </div>
  );
}