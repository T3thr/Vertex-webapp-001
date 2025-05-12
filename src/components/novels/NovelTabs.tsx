// src/components/novels/NovelTabs.tsx
// Client Component สำหรับจัดการ Tabs และแสดงเนื้อหาตาม Tab ที่เลือก
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PopulatedNovelForDetailPage } from "@/app/api/novels/[slug]/route";
import { NovelDetailsTab } from "./NovelDetailsTab"; // เนื้อหา Tab รายละเอียด
import { NovelEpisodesTab } from "./NovelEpisodesTab"; // เนื้อหา Tab ตอน
import { NovelReviewsTab } from "./NovelReviewsTab"; // เนื้อหา Tab รีวิว (Placeholder)
import { BookText, List, MessageSquare } from "lucide-react";

interface NovelTabsProps {
  novel: PopulatedNovelForDetailPage;
}

const tabs = [
  { id: "details", label: "รายละเอียด", icon: BookText },
  { id: "episodes", label: "ตอนทั้งหมด", icon: List },
  { id: "reviews", label: "รีวิว", icon: MessageSquare },
];

export function NovelTabs({ novel }: NovelTabsProps) {
  const [selectedTab, setSelectedTab] = useState(tabs[0].id);

  const tabContentVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="border-b border-border mb-6 sticky top-[var(--navbar-height,64px)] bg-background/80 backdrop-blur-sm z-20 -mt-px pt-1"> {/* ทำให้ Tab ติดตามเมื่อเลื่อน */}
         <div className="container-custom">
          <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`
                  relative shrink-0 flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium transition-colors duration-200 ease-in-out focus:outline-none
                  ${
                    selectedTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {/* Animated underline */}
                {selectedTab === tab.id && (
                  <motion.div
                    className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-primary"
                    layoutId="underline" // สำคัญสำหรับ animation
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                 {/* Badge จำนวนตอน/รีวิว */}
                 {tab.id === 'episodes' && novel.episodesCount > 0 && (
                   <span className="ml-1 bg-secondary text-secondary-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full">
                     {novel.episodesCount}
                   </span>
                 )}
                 {/* {tab.id === 'reviews' && novel.commentsCount > 0 && ( // สมมติว่า commentsCount คือจำนวนรีวิว
                   <span className="ml-1 bg-secondary text-secondary-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full">
                     {novel.commentsCount}
                   </span>
                 )} */}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container-custom mt-1"> {/* ลด mt เพื่อให้ชิด tab bar */}
        <AnimatePresence mode="wait"> {/* mode="wait" ทำให้ animation เล่นเสร็จก่อนเปลี่ยน content */}
          <motion.div
            key={selectedTab} // key เปลี่ยน -> component re-render และ animation เล่น
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {selectedTab === "details" && <NovelDetailsTab novel={novel} />}
            {selectedTab === "episodes" && <NovelEpisodesTab novel={novel} />}
            {selectedTab === "reviews" && <NovelReviewsTab novelId={novel._id.toString()} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}