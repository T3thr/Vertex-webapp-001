// app/novels/[slug]/overview/page.tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import StoryMapModel from '@/backend/models/StoryMap';
import { ICategory } from '@/backend/models/Category'; // Import interface สำหรับ type checking

import StoryCanvas from './components/StoryCanvas';
import CreateStoryMapPrompt from './components/CreateStoryMapPrompt';
import NovelHeader from './components/NovelHeader';

// SECTION: Interfaces สำหรับข้อมูลที่ Serialize แล้ว (ปรับปรุงให้สมบูรณ์)
// =================================================================

/**
 * @interface CategoryData
 * @description ข้อมูลหมวดหมู่ที่ถูก Serialize แล้วสำหรับส่งให้ Client Component
 */
export interface CategoryData {
  _id: string;
  name: string;
  slug: string;
  categoryType: string;
  color?: string;
}

/**
 * @interface AuthorData
 * @description ข้อมูลผู้เขียนที่ถูก Serialize แล้ว
 */
export interface AuthorData {
  _id: string;
  profile: {
    displayName?: string;
    penNames?: string[];
    primaryPenName?: string;
    avatarUrl?: string;
  };
}

/**
 * @interface NarrativeFocusData
 * @description ข้อมูล NarrativeFocus ที่ถูก Serialize แล้ว
 */
export interface NarrativeFocusData {
  narrativePacingTags?: CategoryData[];
  primaryConflictTypes?: CategoryData[];
  narrativePerspective?: CategoryData | null;
  storyArcStructure?: CategoryData | null;
  artStyle?: CategoryData | null;
  gameplayMechanics?: CategoryData[];
  interactivityLevel?: CategoryData | null;
  playerAgencyLevel?: CategoryData | null;
  lengthTag?: CategoryData | null;
  commonTropes?: CategoryData[];
  targetAudienceProfileTags?: CategoryData[];
  avoidIfYouDislikeTags?: CategoryData[];
}

/**
 * @interface NovelData
 * @description ข้อมูลนิยายที่ถูก populate และ serialize เรียบร้อยแล้ว
 */
export interface NovelData {
  [x: string]: any;
  _id: string;
  slug: string;
  title: string;
  synopsis: string;
  status: string;
  author: AuthorData | null;
  themeAssignment: {
    mainTheme: { categoryId: CategoryData | null; customName?: string } | null;
    subThemes: Array<{ categoryId: CategoryData | null; customName?: string }>;
    moodAndTone: CategoryData[];
    contentWarnings: CategoryData[];
    customTags: string[];
  };
  narrativeFocus?: NarrativeFocusData; // เพิ่มเข้ามา
  ageRatingCategoryId: CategoryData | null;
  language: CategoryData | null;
  totalEpisodesCount: number;
  stats: {
    [x: string]: number;
    viewsCount: number;
    totalWords: number;
    followersCount: number;
    bookmarksCount: number;
    averageRating: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * @interface EpisodeData
 * @description ข้อมูลตอนที่ถูก Serialize แล้ว
 */
export interface EpisodeData {
  _id: string;
  novelId: string;
  title: string;
  episodeOrder: number;
  status: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    viewsCount: number;
    totalWords: number;
    estimatedReadingTimeMinutes: number;
  };
}

/**
 * @interface StoryMapData
 * @description ข้อมูล StoryMap ที่ถูก Serialize แล้ว
 */
export interface StoryMapData {
  _id: string;
  novelId: string;
  title: string;
  version: number;
  nodes: any[];
  edges: any[];
  storyVariables: any[];
  startNodeId: string;
  lastModifiedByUserId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// SECTION: Page Component หลัก (ปรับปรุงการ Query และ Serialize)
// =================================================================

/**
 * @description A helper function to safely serialize populated Mongoose documents.
 * It converts ObjectId to string and handles null/undefined cases.
 * @param category - The Mongoose document or lean object to serialize.
 * @returns A plain object suitable for client components, or null.
 */
const serializeCategory = (category: any): CategoryData | null => {
  if (!category || !category._id) return null;
  return {
    _id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    categoryType: category.categoryType,
    color: category.color,
  };
};

function safePlainObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// SECTION: ปรับปรุง Interface สำหรับ Next.js 15+ ที่ params เป็น Promise
// =================================================================
interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function NovelOverviewPage({ params }: PageProps) {
  // รอให้ params resolve ก่อนใช้งาน (สำหรับ Next.js 15+)
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  console.log(`[DEBUG] Slug ดั้งเดิม (URL-encoded): ${slug}`);
  console.log(`[DEBUG] Slug ที่ถอดรหัสแล้ว: ${decodedSlug}`);

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.log('[DEBUG] ไม่พบ session หรือ user id, เปลี่ยนเส้นทางไปยัง /auth/signin');
    redirect('/auth/signin?callbackUrl=/novels');
  }

  console.log(`[DEBUG] Author ID: ${session.user.id}`);
  
  await dbConnect();

  // SECTION: แก้ไขการ Query และ Populate ให้ครอบคลุมทุก Fields
  // =================================================================
  const novel = await NovelModel.findOne({
    slug: decodedSlug,
    author: session.user.id,
    isDeleted: { $ne: true }
  })
  .populate<{ author: AuthorData }>('author', 'profile') // Populate profile ของผู้เขียน
  // Populate themeAssignment ทั้งหมด
  .populate<{ themeAssignment: { mainTheme: { categoryId: ICategory }, subThemes: { categoryId: ICategory }[], moodAndTone: ICategory[], contentWarnings: ICategory[] } }>([
    { path: 'themeAssignment.mainTheme.categoryId' },
    { path: 'themeAssignment.subThemes.categoryId' },
    { path: 'themeAssignment.moodAndTone' },
    { path: 'themeAssignment.contentWarnings' },
  ])
  // Populate narrativeFocus ทั้งหมด (นี่คือส่วนสำคัญที่ขาดไป)
  .populate<{ narrativeFocus: NarrativeFocusData }>([
    { path: 'narrativeFocus.narrativePacingTags' },
    { path: 'narrativeFocus.primaryConflictTypes' },
    { path: 'narrativeFocus.narrativePerspective' },
    { path: 'narrativeFocus.storyArcStructure' },
    { path: 'narrativeFocus.artStyle' },
    { path: 'narrativeFocus.gameplayMechanics' },
    { path: 'narrativeFocus.interactivityLevel' },
    { path: 'narrativeFocus.playerAgencyLevel' },
    { path: 'narrativeFocus.lengthTag' },
    { path: 'narrativeFocus.commonTropes' },
    { path: 'narrativeFocus.targetAudienceProfileTags' },
    { path: 'narrativeFocus.avoidIfYouDislikeTags' },
  ])
  // Populate fields ที่เหลือ
  .populate<{ ageRatingCategoryId: ICategory }>('ageRatingCategoryId')
  .populate<{ language: ICategory }>('language')
  .lean({ virtuals: true }); // ใช้ .lean() เพื่อประสิทธิภาพ

  if (!novel) {
    console.log(`[DEBUG] ไม่พบนิยายสำหรับ slug: ${decodedSlug} และ author: ${session.user.id}`);
    redirect('/novels');
  }

  console.log(`[DEBUG] พบนิยาย: ${novel.title} (ID: ${novel._id})`);

  // ดึงข้อมูล Episodes, StoryMap, Characters, Scenes, และ Media
  const episodes = await EpisodeModel.find({ novelId: novel._id }).sort({ episodeOrder: 1 }).lean();
  const storyMap = await StoryMapModel.findOne({ novelId: novel._id, isActive: true }).lean();
  
  // Import additional models
  const CharacterModel = (await import('@/backend/models/Character')).default;
  const SceneModel = (await import('@/backend/models/Scene')).default;
  const MediaModel = (await import('@/backend/models/Media')).default;
  const OfficialMediaModel = (await import('@/backend/models/OfficialMedia')).default;
  
  const characters = await CharacterModel.find({ novelId: novel._id, isArchived: false }).lean();
  const scenes = await SceneModel.find({ novelId: novel._id }).sort({ episodeId: 1, sceneOrder: 1 }).lean();
  const userMedia = await MediaModel.find({ userId: session.user.id, status: 'available', isDeleted: { $ne: true } }).lean();
  const officialMedia = await OfficialMediaModel.find({ status: 'available', isDeleted: { $ne: true } }).lean();
  
  // SECTION: วิธีที่ง่ายและปลอดภัยที่สุดในการ Serialize คือใช้ JSON.stringify และ JSON.parse
  // วิธีนี้จะแปลง ObjectId, Date, และ BSON types อื่นๆ เป็น string โดยอัตโนมัติ
  // =================================================================
  const serializedNovel: NovelData = JSON.parse(JSON.stringify(novel, null, 2));
  const serializedEpisodes: EpisodeData[] = JSON.parse(JSON.stringify(episodes, null, 2));
  const serializedStoryMap: StoryMapData | null = storyMap ? JSON.parse(JSON.stringify(storyMap, null, 2)) : null;
  const serializedCharacters = JSON.parse(JSON.stringify(characters, null, 2));
  const serializedScenes = JSON.parse(JSON.stringify(scenes, null, 2));
  const serializedUserMedia = JSON.parse(JSON.stringify(userMedia, null, 2));
  const serializedOfficialMedia = JSON.parse(JSON.stringify(officialMedia, null, 2));

  console.log(`[DEBUG] จำนวนตอนที่พบ: ${serializedEpisodes.length}`);
  console.log(`[DEBUG] สถานะ StoryMap: ${serializedStoryMap ? 'พบ StoryMap' : 'ไม่พบ StoryMap'}`);
  console.log(`[DEBUG] จำนวนตัวละคร: ${serializedCharacters.length}`);
  console.log(`[DEBUG] จำนวนฉาก: ${serializedScenes.length}`);

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><p>กำลังโหลด...</p></div>}>
        {serializedStoryMap ? (
          <StoryCanvas
            novel={serializedNovel}
            episodes={serializedEpisodes}
            storyMap={serializedStoryMap}
            characters={serializedCharacters}
            scenes={serializedScenes}
            userMedia={serializedUserMedia}
            officialMedia={serializedOfficialMedia}
            initialMode="blueprint"
            selectedSceneId={undefined}
          />
        ) : (
          <div className="container-custom py-6">
            <NovelHeader novel={serializedNovel} />
            <div className="mt-6 bg-card border border-border rounded-xl p-6 flex items-center justify-center">
              <CreateStoryMapPrompt novelSlug={serializedNovel.slug} />
            </div>
          </div>
        )}
      </Suspense>
    </div>
  );
}