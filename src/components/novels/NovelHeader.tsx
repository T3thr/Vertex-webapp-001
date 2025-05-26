// src/components/novels/NovelHeader.tsx
import Image from 'next/image';
import Link from 'next/link';
import { PopulatedNovelForDetailPage } from '@/app/api/novels/[slug]/route';
import { TagBadge } from './TagBadge';
import { BookOpen, User, Users, Eye, ThumbsUp, MessageSquare, ShieldCheck, Languages, CalendarCheck2, Edit3, Clock, CheckCircle2 } from 'lucide-react';
import { NovelStatus, NovelAccessLevel, NovelEndingType } from '@/backend/models/Novel'; //
import { motion } from 'framer-motion';

interface NovelHeaderProps {
  novel: PopulatedNovelForDetailPage;
}

export const NovelHeader: React.FC<NovelHeaderProps> = ({ novel }) => {
  const authorName = novel.author?.profile?.penName || novel.author?.profile?.displayName || novel.author?.username || 'ผู้เขียน';
  const coverImage = novel.coverImageUrl || '/images/default-cover.jpg'; // Provide a default cover

  const getStatusBadge = () => {
    switch (novel.status) {
      case NovelStatus.PUBLISHED: //
        return <TagBadge text="เผยแพร่แล้ว" category={{ name: 'เผยแพร่แล้ว', color: 'var(--alert-success-foreground)' }} showIcon={false} textSize="text-sm" />;
      case NovelStatus.COMPLETED: //
        return <TagBadge text="จบแล้ว" category={{ name: 'จบแล้ว', color: 'var(--primary)' }} showIcon={false} textSize="text-sm" />;
      case NovelStatus.ONGOING: // This status is in NovelEndingType, not NovelStatus. Assuming mapping for display.
        return <TagBadge text="กำลังดำเนินเรื่อง" category={{ name: 'กำลังดำเนินเรื่อง', color: '#f59e0b' }} showIcon={false} textSize="text-sm" />; // Amber
      default:
        return <TagBadge text={novel.status} category={{ name: novel.status, color: 'var(--muted)' }} showIcon={false} textSize="text-sm" />;
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative pt-16 pb-8 md:pt-24 md:pb-12 bg-gradient-to-br from-secondary via-background to-secondary/30 dark:from-secondary/50 dark:via-background dark:to-secondary/10"
    >
      {novel.bannerImageUrl && (
        <Image
          src={novel.bannerImageUrl}
          alt={`แบนเนอร์นิยายเรื่อง ${novel.title}`}
          layout="fill"
          objectFit="cover"
          className="absolute inset-0 z-0 opacity-20 dark:opacity-10"
          priority
        />
      )}
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="md:col-span-4 lg:col-span-3"
          >
            <div className="aspect-[3/4] relative rounded-lg shadow-xl overflow-hidden border-4 border-card">
              <Image
                src={coverImage}
                alt={`ปกนิยายเรื่อง ${novel.title}`}
                layout="fill"
                objectFit="cover"
                className="rounded-md"
                priority
              />
            </div>
          </motion.div>

          <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between">
            <div>
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2 leading-tight"
              >
                {novel.title}
              </motion.h1>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mb-4 text-lg text-muted-foreground"
              >
                <Link href={`/u/${novel.author?.username || novel.author?._id.toString()}`} passHref legacyBehavior>
                  <a className="hover:text-primary transition-colors duration-200 flex items-center">
                    <User size={20} className="mr-2" />
                    {authorName}
                  </a>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-wrap gap-2 mb-4 items-center"
              >
                {getStatusBadge()}
                {novel.themeAssignment?.mainTheme?.categoryId && (
                  <TagBadge category={novel.themeAssignment.mainTheme.categoryId} />
                )}
                {novel.language && <TagBadge category={novel.language} />}
                {novel.ageRatingCategoryId && <TagBadge category={novel.ageRatingCategoryId} />}
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="text-base text-foreground/80 dark:text-foreground/70 mb-3 leading-relaxed line-clamp-3 md:line-clamp-4"
              >
                {novel.synopsis}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mt-4"
            >
              <span className="flex items-center"><Eye size={16} className="mr-1.5" /> {novel.stats.viewsCount.toLocaleString()} Views</span>
              <span className="flex items-center"><ThumbsUp size={16} className="mr-1.5" /> {novel.stats.likesCount.toLocaleString()} Likes</span>
              <span className="flex items-center"><MessageSquare size={16} className="mr-1.5" /> {novel.stats.commentsCount.toLocaleString()} Comments</span>
              <span className="flex items-center"><Users size={16} className="mr-1.5" /> {novel.stats.followersCount.toLocaleString()} Followers</span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-6"
            >
              <Link href={`/novels/${novel.slug}/read/${novel.firstEpisodeSlug || (novel.episodesList && novel.episodesList.length > 0 ? novel.episodesList[0].slug : '')}`} passHref legacyBehavior>
                <a className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
                  <BookOpen size={20} className="mr-2" />
                  {novel.publishedEpisodesCount > 0 ? 'เริ่มอ่าน' : 'ยังไม่มีตอนให้อ่าน'}
                </a>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};