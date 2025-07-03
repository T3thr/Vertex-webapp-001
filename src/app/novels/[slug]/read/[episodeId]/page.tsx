import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import VisualNovelReader from '@/components/VisualNovelReader';
import type { Metadata } from 'next';

interface ReadNovelPageProps {
  params: Promise<{ slug: string; episodeId: string }>;
  searchParams: Promise<{ sceneId?: string }>;
}

async function getNovelAndEpisode(slug: string, episodeId: string) {
  await dbConnect();
  
  // Find novel by slug
  const novel = await NovelModel.findOne({ 
    slug, 
    isDeleted: { $ne: true },
    status: { $in: ['published', 'completed'] }
  })
    .select('_id title author')
    .lean();

  if (!novel) {
    return null;
  }

  // Find episode
  const episode = await EpisodeModel.findOne({ 
    _id: episodeId, 
    novelId: novel._id,
    status: 'published'
  })
    .select('_id title episodeOrder accessType priceCoins firstSceneId')
    .lean();

  if (!episode) {
    return null;
  }

  return { novel, episode };
}

export async function generateMetadata(
  { params }: ReadNovelPageProps
): Promise<Metadata> {
  const { slug, episodeId } = await params;
  
  const data = await getNovelAndEpisode(slug, episodeId);
  
  if (!data) {
    return {
      title: "ไม่พบนิยาย - DivWy",
      description: "ไม่พบนิยายที่คุณต้องการอ่าน",
      robots: { index: false, follow: false }
    };
  }

  const { novel, episode } = data;
  
  return {
    title: `อ่าน ${episode.title} - ${novel.title} | DivWy`,
    description: `อ่านนิยาย Visual Novel "${novel.title}" ตอน "${episode.title}" บน DivWy`,
    robots: { index: false, follow: false }, // ไม่ต้องการให้ search engine index หน้าอ่าน
  };
}

export default async function ReadNovelPage({ 
  params, 
  searchParams 
}: ReadNovelPageProps) {
  const { slug, episodeId } = await params;
  const { sceneId } = await searchParams;
  
  const data = await getNovelAndEpisode(slug, episodeId);
  
  if (!data) {
    notFound();
  }

  const { novel, episode } = data;

  return (
    <div className="min-h-screen bg-black">
      <Suspense fallback={
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <div className="text-white text-xl">กำลังโหลด...</div>
        </div>
      }>
        <VisualNovelReader
          novelSlug={slug}
          episodeId={episodeId}
          initialSceneId={sceneId || episode.firstSceneId?.toString()}
        />
      </Suspense>
    </div>
  );
} 