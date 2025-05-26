// src/components/novels/NovelEpisodesTab.tsx
import Link from 'next/link';
import { PopulatedNovelForDetailPage, PopulatedEpisodeForDetailPage } from '@/app/api/novels/[slug]/route';
import { Lock, Zap, CalendarDays, Eye, ThumbsUp, MessageSquare, Sparkles, BookOpen } from 'lucide-react';
import { EpisodeAccessType } from '@/backend/models/Episode'; //
import { motion } from 'framer-motion';

interface NovelEpisodesTabProps {
  novel: PopulatedNovelForDetailPage;
  episodes: PopulatedEpisodeForDetailPage[];
}

export const NovelEpisodesTab: React.FC<NovelEpisodesTabProps> = ({ novel, episodes }) => {
  if (!episodes || episodes.length === 0) {
    return (
      <div className="text-center py-10">
        <BookOpen size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">ยังไม่มีตอนที่เผยแพร่สำหรับนิยายเรื่องนี้</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {episodes.map((episode, index) => (
        <motion.div
          key={episode._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <Link href={episode.episodeUrl || `/novels/${novel.slug}/read/${episode.slug}`} passHref legacyBehavior>
            <a className="block p-4 sm:p-5 bg-card hover:bg-secondary dark:hover:bg-secondary/50 rounded-lg shadow-sm border border-border transition-all duration-200 ease-in-out group">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                <h4 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  ตอนที่ {episode.episodeOrder}: {episode.title}
                </h4>
                <div className="flex items-center space-x-2 mt-1 sm:mt-0 text-xs text-muted-foreground shrink-0">
                  {episode.accessType === EpisodeAccessType.PAID_UNLOCK && episode.effectivePrice && episode.effectivePrice > 0 && ( //
                    <span className="flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-700 dark:text-amber-100">
                      <Lock size={12} className="mr-1" /> {episode.effectivePrice} เหรียญ
                      {episode.originalPrice && episode.originalPrice > episode.effectivePrice && (
                        <span className="ml-1.5 line-through text-muted-foreground/70">{episode.originalPrice}</span>
                      )}
                    </span>
                  )}
                  {episode.accessType === EpisodeAccessType.EARLY_ACCESS_PAID && ( //
                     <span className="flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-700 dark:text-purple-100">
                      <Sparkles size={12} className="mr-1" /> อ่านก่อนใคร
                    </span>
                  )}
                   {episode.accessType === EpisodeAccessType.FREE && ( //
                     <span className="flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100">
                      <Zap size={12} className="mr-1" /> ฟรี
                    </span>
                  )}
                  {episode.publishedAt && (
                    <span className="flex items-center">
                      <CalendarDays size={12} className="mr-1" />
                      {new Date(episode.publishedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
              {episode.teaserText && (
                <p className="text-sm text-foreground/80 dark:text-foreground/70 line-clamp-2 mb-2 sm:mb-3">
                  {episode.teaserText}
                </p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center"><Eye size={14} className="mr-1" />{episode.stats.viewsCount.toLocaleString()}</span>
                <span className="flex items-center"><ThumbsUp size={14} className="mr-1" />{episode.stats.likesCount.toLocaleString()}</span>
                <span className="flex items-center"><MessageSquare size={14} className="mr-1" />{episode.stats.commentsCount.toLocaleString()}</span>
                {episode.stats.totalWords > 0 && (
                  <span>{episode.stats.totalWords.toLocaleString()} คำ</span>
                )}
                {episode.stats.estimatedReadingTimeMinutes > 0 && (
                  <span>~{episode.stats.estimatedReadingTimeMinutes} นาทีในการอ่าน</span>
                )}
              </div>
            </a>
          </Link>
        </motion.div>
      ))}
    </div>
  );
};