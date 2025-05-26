// src/components/novels/NovelTabs.tsx
// Client Component สำหรับจัดการ Tabs และแสดงเนื้อหาตาม Tab ที่เลือก
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
// อ้างอิง PopulatedNovelForDetailPage จากตำแหน่งที่ถูกต้อง (API Route)
import { PopulatedNovelForDetailPage, PopulatedEpisodeSummary } from "@/app/api/novels/[slug]/route";
import { NovelDetailsTab } from "./NovelDetailsTab";
import { NovelEpisodesTab } from "./NovelEpisodesTab";
import { NovelReviewsTab } from "./NovelReviewsTab";
import { BookText, List, MessageSquare, UsersRound, Palette } from "lucide-react"; // เพิ่ม UsersRound และ Palette
import { NovelCharactersTab } from "./NovelCharactersTab"; // (เพิ่มใหม่) คอมโพเนนต์สำหรับ Tab ตัวละคร

interface NovelTabsProps {
  novel: PopulatedNovelForDetailPage;
}

// กำหนดประเภทสำหรับแต่ละ Tab
interface TabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  // countField ไม่จำเป็นต้องเป็น key ของ PopulatedNovelForDetailPage โดยตรง
  // แต่เป็น string ที่ใช้ในการระบุ logic การดึงจำนวน
  countField?: string;
}

const tabsConfig: TabConfig[] = [
  { id: "details", label: "รายละเอียด", icon: BookText },
  { id: "episodes", label: "ตอนทั้งหมด", icon: List, countField: "publishedEpisodesCount" },
  { id: "characters", label: "ตัวละคร", icon: UsersRound, countField: "charactersListLength" }, // Custom identifier
  { id: "reviews", label: "รีวิว", icon: MessageSquare, countField: "commentsCount" }, // Custom identifier
  // เพิ่ม Tab "Art Gallery" ถ้ามีข้อมูล Art Style
  // { id: "gallery", label: "แกลเลอรี่", icon: Palette, countField: "galleryItemsCount" }, // สมมติมี field นี้
];

export function NovelTabs({ novel }: NovelTabsProps) {
  const [selectedTab, setSelectedTab] = useState(tabsConfig[0].id);

  const tabContentVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="border-b border-border mb-6 sticky top-[var(--navbar-height,64px)] bg-background/80 backdrop-blur-sm z-20 -mt-px pt-1">
        <div className="container-custom">
          <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
            {tabsConfig.map((tab) => {
              // ไม่แสดง tab ตัวละคร ถ้าไม่มีข้อมูลตัวละคร
              if (tab.id === "characters" && (!novel.charactersList || novel.charactersList.length === 0)) {
                return null;
              }

              let countValue: number | undefined = undefined;
              // Logic การดึงจำนวนสำหรับแต่ละ tab
              if (tab.countField === "publishedEpisodesCount" && novel.publishedEpisodesCount !== undefined) {
                countValue = novel.publishedEpisodesCount;
              } else if (tab.countField === "charactersListLength") {
                countValue = novel.charactersList?.length;
              } else if (tab.countField === "commentsCount" && novel.rawStats?.commentsCount !== undefined) {
                countValue = novel.rawStats.commentsCount;
              }
              // สามารถเพิ่มเงื่อนไขสำหรับ 'galleryItemsCount' ที่นี่ถ้ามี

              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`
                    relative shrink-0 flex items-center gap-2 whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 text-sm font-medium transition-colors duration-200 ease-in-out focus:outline-none
                    ${
                      selectedTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {selectedTab === tab.id && (
                    <motion.div
                      className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-primary"
                      layoutId="underline"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  {countValue !== undefined && countValue > 0 && (
                    <span className="ml-1.5 bg-secondary text-secondary-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full">
                      {countValue}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container-custom mt-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTab} // สำคัญสำหรับ AnimatePresence ในการ re-render และ animation
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {selectedTab === "details" && <NovelDetailsTab novel={novel} />}
            {selectedTab === "episodes" && (
              <NovelEpisodesTab
                novelSlug={novel.slug}
                episodesList={novel.episodesList || []}
                firstEpisodeSlug={novel.firstEpisodeSlug}
              />
            )}
            {/* (เพิ่มใหม่) แสดง Tab ตัวละคร */}
            {selectedTab === "characters" && novel.charactersList && novel.charactersList.length > 0 && (
               <NovelCharactersTab characters={novel.charactersList} novelId={novel._id} />
            )}
             {/* อาจมีข้อความ fallback ถ้าไม่มีข้อมูลตัวละคร (แต่เราซ่อน tab header ไปแล้ว) */}
            {/* {selectedTab === "characters" && (!novel.charactersList || novel.charactersList.length === 0) && (
              <p className="text-center text-muted-foreground py-8">ไม่มีข้อมูลตัวละครสำหรับนิยายเรื่องนี้</p>
            )} */}

            {selectedTab === "reviews" && <NovelReviewsTab novelId={novel._id} />}
             {/* สามารถเพิ่ม tab อื่นๆ ที่นี่ เช่น Gallery */}
            {/* {selectedTab === "gallery" && novel.artStyleCategory && (
              <div> เนื้อหาแกลเลอรี่สำหรับ {novel.artStyleCategory.name} </div>
            )} */}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}