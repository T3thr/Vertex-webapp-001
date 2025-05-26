// src/components/novels/NovelTabs.tsx
'use client'; // This component needs client-side interactivity for tabs

import { useState } from 'react';
import { PopulatedNovelForDetailPage } from '@/app/api/novels/[slug]/route';
import { NovelDetailsTab } from './NovelDetailsTab';
import { NovelEpisodesTab } from './NovelEpisodesTab';
import { NovelCharactersSection } from './NovelCharactersSection';
import { NovelReviewsTab } from './NovelReviewsTab';
import { ListChecks, BookText, Users2, MessageCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NovelTabsProps {
  novel: PopulatedNovelForDetailPage;
}

type TabName = 'details' | 'episodes' | 'characters' | 'reviews';

export const NovelTabs: React.FC<NovelTabsProps> = ({ novel }) => {
  const [activeTab, setActiveTab] = useState<TabName>('details');

  const tabs = [
    { id: 'details' as TabName, label: 'รายละเอียด', icon: <Info size={18} /> },
    { id: 'episodes' as TabName, label: `ตอนทั้งหมด (${novel.publishedEpisodesCount || 0})`, icon: <ListChecks size={18} /> },
    { id: 'characters' as TabName, label: `ตัวละคร (${novel.charactersList?.length || 0})`, icon: <Users2 size={18} /> },
    { id: 'reviews' as TabName, label: 'รีวิว', icon: <MessageCircle size={18} /> },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return <NovelDetailsTab novel={novel} />;
      case 'episodes':
        return <NovelEpisodesTab novel={novel} episodes={novel.episodesList || []} />;
      case 'characters':
        return <NovelCharactersSection characters={novel.charactersList || []} />;
      case 'reviews':
        return <NovelReviewsTab novelId={novel._id.toString()} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      <div className="border-b border-border sticky top-0 z-20 bg-background/80 backdrop-blur-md -mx-2 sm:-mx-4 px-2 sm:px-4">
        <nav className="container-custom mx-auto flex space-x-1 sm:space-x-2 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'}
                inline-flex items-center shrink-0 px-3 py-3 sm:px-4 sm:py-4 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6 md:mt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};