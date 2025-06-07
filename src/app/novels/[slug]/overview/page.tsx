// app/novels/[slug]/overview/page.tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import StoryMapModel from '@/backend/models/StoryMap';

import NovelWorkspace from './components/NovelWorkspace';
import CreateStoryMapPrompt from './components/CreateStoryMapPrompt';
import NovelHeader from './components/NovelHeader';

/**
 * @interface PageProps
 * @description Props สำหรับ Page Component
 */
interface PageProps {
  params: {
    slug: string;
  };
  searchParams: {
    view?: string;
  };
}

/**
 * @interface NovelData
 * @description ข้อมูลนิยาย
 */
export interface NovelData {
  [x: string]: any;
  _id: string;
  slug: string;
  title: string;
  synopsis: string;
  status: string;
  author: any;
  categories: any[];
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
 * @description ข้อมูลตอน
 */
export interface EpisodeData {
  _id: string;
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
 * @description ข้อมูล StoryMap
 */
export interface StoryMapData {
  _id: string;
  nodes: any[];
  edges: any[];
  storyVariables: any[];
  startNodeId: string | null;
}

/**
 * @function NovelOverviewPage
 * @description หน้า Novel Overview
 */
export default async function NovelOverviewPage({ params, searchParams }: PageProps) {
  // Await params to ensure it's resolved before using it
  const { slug } = await params;

  // ตรวจสอบ session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/novels');
  }

  await dbConnect();

  // ดึงข้อมูลนิยาย
  const novel = await NovelModel.findOne({ 
    slug: slug,
    author: session.user.id,
    isDeleted: { $ne: true }
  })
  .populate('author', 'profile')
  .populate('categories')
  .lean();

  // ถ้าไม่พบนิยาย
  if (!novel) {
    redirect('/novels');
  }

  // ดึงข้อมูลตอน
  const episodes = await EpisodeModel.find({
    novelId: novel._id,
    isDeleted: { $ne: true }
  })
  .sort({ episodeOrder: 1 })
  .lean();

  // ดึงข้อมูล StoryMap
  const storyMap = await StoryMapModel.findOne({
    novelId: novel._id,
    isActive: true
  }).lean();

  // แปลง _id เป็น string
  const serializedNovel = {
    ...novel,
    _id: novel._id.toString(),
    author: {
      ...novel.author,
      _id: novel.author._id.toString()
    },
    createdAt: novel.createdAt.toISOString(),
    updatedAt: novel.updatedAt.toISOString(),
    categories: (novel as any).categories || [],
    stats: {
      viewsCount: novel.stats.viewsCount,
      totalWords: novel.stats.totalWords,
      followersCount: novel.stats.followersCount,
      bookmarksCount: novel.stats.bookmarksCount,
      averageRating: novel.stats.averageRating,
    }
  };

  // แปลง _id เป็น string
  const serializedEpisodes = episodes.map((episode: any) => ({
    ...episode,
    _id: episode._id.toString(),
    novelId: episode.novelId.toString()
  }));

  // แปลง _id เป็น string
  const serializedStoryMap = storyMap ? {
    ...storyMap,
    _id: storyMap._id.toString(),
    novelId: storyMap.novelId.toString()
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><p>กำลังโหลด...</p></div>}>
        {serializedStoryMap ? (
          <NovelWorkspace 
            novel={serializedNovel} 
            episodes={serializedEpisodes} 
            storyMap={serializedStoryMap}
          />
        ) : (
          <div className="container-custom py-6">
            <NovelHeader novel={serializedNovel} />
            <div className="mt-6 bg-card border border-border rounded-xl p-6 flex items-center justify-center">
              <CreateStoryMapPrompt novelId={serializedNovel._id} />
            </div>
          </div>
        )}
      </Suspense>
    </div>
  );
}

