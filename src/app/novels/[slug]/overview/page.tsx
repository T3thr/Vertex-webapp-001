// app/novels/[slug]/overview/page.tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

// Professional Refresh Protection Component
import RefreshProtectionWrapper from './components/RefreshProtectionWrapper';

import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import StoryMapModel from '@/backend/models/StoryMap';
import CategoryModel, { ICategory } from '@/backend/models/Category'; // Import both model and interface

import NovelEditor from './components/NovelEditor';

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
  slug?: string;
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
  description?: string;
  version: number;
  nodes: any[];
  edges: any[];
  storyVariables: any[];
  startNodeId: string;
  lastModifiedByUserId: string;
  isActive: boolean;
  editorMetadata?: {
    zoomLevel: number;
    viewOffsetX: number;
    viewOffsetY: number;
    gridSize: number;
    showGrid: boolean;
  };
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
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NovelOverviewPage({ params, searchParams }: PageProps) {
  // รอให้ params และ searchParams resolve ก่อนใช้งาน (สำหรับ Next.js 15+)
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const decodedSlug = decodeURIComponent(slug);
  
  // 🎯 Extract episode selection from URL
  const selectedEpisodeId = typeof resolvedSearchParams?.episodeId === 'string' ? resolvedSearchParams.episodeId : null;

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
  // Ensure CategoryModel is loaded before populate operations
  void CategoryModel; // This ensures the model is registered
  
  // Access Control: Check if user is author or co-author
  const novel = await NovelModel.findOne({
    slug: decodedSlug,
    isDeleted: { $ne: true }
  })
  .populate('author', 'profile') // Populate profile ของผู้เขียน
  // Populate themeAssignment ทั้งหมด - simplified without complex type annotations
  .populate([
    { path: 'themeAssignment.mainTheme.categoryId' },
    { path: 'themeAssignment.subThemes.categoryId' },
    { path: 'themeAssignment.moodAndTone' },
    { path: 'themeAssignment.contentWarnings' },
  ])
  // Populate narrativeFocus ทั้งหมด (นี่คือส่วนสำคัญที่ขาดไป)
  .populate([
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
  .populate('ageRatingCategoryId')
  .populate('language')
  .populate('coAuthors', 'profile') // Populate co-authors
  .lean({ virtuals: true }); // ใช้ .lean() เพื่อประสิทธิภาพ

  if (!novel) {
    console.log(`[DEBUG] ไม่พบนิยายสำหรับ slug: ${decodedSlug}`);
    redirect('/novels');
  }

  // Access Control: Verify user is author or co-author
  const userId = session.user!.id; // We already checked for session.user.id above
  const isAuthor = novel.author?._id?.toString() === userId;
  const isCoAuthor = novel.coAuthors?.some((coAuthor: any) => 
    coAuthor._id?.toString() === userId || coAuthor.toString() === userId
  );
  
  if (!isAuthor && !isCoAuthor) {
    console.log(`[DEBUG] ผู้ใช้ ${userId} ไม่มีสิทธิ์เข้าถึงนิยาย ${novel.title}`);
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
  const userMedia = await MediaModel.find({ userId: userId, status: 'available', isDeleted: { $ne: true } }).lean();
  const officialMedia = await OfficialMediaModel.find({ status: 'approved_for_library', isDeleted: { $ne: true } }).lean();
  
  // Debug logging
  console.log(`[DEBUG] StoryMap raw data:`, storyMap ? {
    id: storyMap._id,
    title: storyMap.title,
    nodeCount: storyMap.nodes?.length || 0,
    edgeCount: storyMap.edges?.length || 0,
    version: storyMap.version,
    isActive: storyMap.isActive
  } : 'No story map found');
  
  console.log(`[DEBUG] Scenes found:`, scenes.length);
  console.log(`[DEBUG] Characters found:`, characters.length);
  
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
  if (serializedStoryMap) {
    console.log(`[DEBUG] StoryMap details:`, {
      id: serializedStoryMap._id,
      title: serializedStoryMap.title,
      nodeCount: serializedStoryMap.nodes?.length || 0,
      edgeCount: serializedStoryMap.edges?.length || 0,
      version: serializedStoryMap.version
    });
  }
  console.log(`[DEBUG] จำนวนตัวละคร: ${serializedCharacters.length}`);
  console.log(`[DEBUG] จำนวนฉาก: ${serializedScenes.length}`);

  return (
    <RefreshProtectionWrapper>
      <div className="min-h-screen bg-background text-foreground">
        <Suspense fallback={
          <div className="h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">กำลังโหลด...</p>
            </div>
          </div>
        }>
          <NovelEditor
            novel={serializedNovel}
            episodes={serializedEpisodes}
            storyMap={serializedStoryMap}
            characters={serializedCharacters}
            scenes={serializedScenes}
            userMedia={serializedUserMedia}
            officialMedia={serializedOfficialMedia}
          />
        </Suspense>
      </div>
    </RefreshProtectionWrapper>
  );
}

