// src/app/page.tsx
// หน้านี้เป็น Server Component โดยสมบูรณ์ การดึงข้อมูลเกิดขึ้นบนเซิร์ฟเวอร์
// Next.js App Router ทำให้ Server Components เป็น SSR โดยอัตโนมัติ
// ปรับปรุงเพื่อความเร็วสูงสุดและไม่มี loading flickering พร้อม ISR และ streaming

import { Suspense } from 'react';
import { NovelCard, NovelCardData } from "@/components/NovelCard";
import { ImageSlider, SlideData as SliderSlideData } from "@/components/ImageSlider";
import { NovelRowNavButton } from "@/components/NovelRowNavigation";
import JulyBonusBanner from "@/components/JulyBonusBanner";
import {
  TrendingUp,
  CheckCircle,
  Clock,
  BookOpen,
  BadgePercent,
  ArrowRightCircle,
  Coins,
} from "lucide-react";
import { Metadata } from 'next';
import Link from "next/link";
import { CacheManager, CacheKeys, CacheTTL } from "@/backend/lib/redis";

// Aggressive ISR revalidation for maximum performance
export const revalidate = 60; // 1 minute for critical content

// Enable static generation with ISR
export const dynamic = 'force-static';
export const fetchCache = 'default-cache';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

export const metadata: Metadata = {
  title: 'DivWy | คลังเรื่องราววิชวลโนเวลที่จะทำให้คุณติดงอมแงม',
  description: 'ค้นพบและสร้างสรรค์เรื่องราวในรูปแบบที่คุณชื่นชอบ ไม่ว่าจะเป็นนิยายแชท นิยายภาพ หรือวิชวลโนเวลแบบอินเทอร์แอคทีฟ ที่ DivWy',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const NOVELS_PER_SECTION = 8; // เพิ่มจำนวนเนื่องจาก card เล็กลง

interface SectionConfig {
  key: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  filter: string;
  novelType?: string;
  viewAllLink: string;
  headerImageUrl?: string;
  priority?: boolean; // เพิ่ม priority สำหรับ sections ที่สำคัญ
}

interface SectionData {
  config: SectionConfig;
  novels: NovelCardData[];
  showViewAllButton: boolean;
}

// Optimized fetch function - now only fetches data, doesn't handle components
async function fetchSectionNovels(
  config: Pick<SectionConfig, "filter" | "novelType" | "priority">
): Promise<{ novels: NovelCardData[], showViewAllButton: boolean }> {
  const cacheKey = CacheKeys.NOVELS_LIST(config.filter, 1, NOVELS_PER_SECTION, undefined, config.novelType);
  
  try {
    // This will now only cache serializable data (novels array and a boolean)
    const result = await CacheManager.getWithFallback(
      cacheKey,
      async () => {
        console.log(`📞 [Homepage] Fetching novels for filter: ${config.filter} from API`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const params = new URLSearchParams({
          limit: NOVELS_PER_SECTION.toString(),
          filter: config.filter,
        });
        if (config.novelType) {
          params.append("novelType", config.novelType);
        }

        const url = `${API_URL}/api/novels?${params.toString()}`;
        
        const res = await fetch(url, { 
          next: { revalidate: config.priority ? 60 : 180 },
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          console.error(`❌ [Homepage] Failed to fetch novels for ${config.filter} (HTTP ${res.status})`);
          return { novels: [], showViewAllButton: false };
        }

        const data = await res.json();
        const fetchedNovels = Array.isArray(data.novels) ? data.novels : [];
        console.log(`✅ [Homepage] Received ${fetchedNovels.length} novels for ${config.filter}`);
        
        return {
          novels: fetchedNovels,
          showViewAllButton: fetchedNovels.length === NOVELS_PER_SECTION
        };
      },
      config.priority ? CacheTTL.NOVELS_LIST : CacheTTL.HOMEPAGE_SECTIONS
    );

    return result;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`⏰ [Homepage] Request timeout for filter: ${config.filter}`);
    } else {
      console.error(`❌ [Homepage] Error fetching novels for ${config.filter}:`, error.message);
    }
    return { novels: [], showViewAllButton: false };
  }
}

// This function now combines static config with fetched data
async function getSectionsData(sectionsConfig: SectionConfig[]): Promise<SectionData[]> {
  console.log('🚀 [Homepage] Starting optimized parallel fetch for all sections');

  try {
    const novelDataPromises = sectionsConfig.map(config => 
      fetchSectionNovels({ 
        filter: config.filter, 
        novelType: config.novelType, 
        priority: config.priority 
      })
    );
    
    const results = await Promise.allSettled(novelDataPromises);

    const sectionsData = sectionsConfig.map((config, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        return {
          config: config,
          novels: result.value.novels,
          showViewAllButton: result.value.showViewAllButton,
        };
      } else {
        console.error(`❌ [Homepage] Section ${config.key} failed:`, result.reason);
        return {
          config: config,
          novels: [],
          showViewAllButton: false,
        };
      }
    });

    console.log('✅ [Homepage] All sections data processed');
    return sectionsData;
  } catch (error) {
    console.error('❌ [Homepage] Critical error in parallel fetch:', error);
    return sectionsConfig.map(config => ({
      config,
      novels: [],
      showViewAllButton: false
    }));
  }
}

// Static slide data สำหรับ performance
const imageSlideData: SliderSlideData[] = [
  {
    id: "vn-discovery-slide",
    title: "โลกใบใหม่ใน Visual Novel",
    description: "ทุกการตัดสินใจของคุณ กำหนดเรื่องราวและปลายทางที่แตกต่าง ค้นหามหากาพย์ที่คุณเป็นผู้ลิขิต",
    imageUrl: "https://res.cloudinary.com/dzwjogkrz/image/upload/v1751571042/RPReplay_Final1660530696_xdfsau.gif",
    link: "https://res.cloudinary.com/dzwjogkrz/image/upload/v1751571042/RPReplay_Final1660530696_xdfsau.gif",
    category: "Visual Novels",
    highlightColor: "var(--color-primary)",
    primaryAction: { label: "สำรวจวิชวลโนเวล", href: "https://res.cloudinary.com/dzwjogkrz/image/upload/v1751571042/RPReplay_Final1660530696_xdfsau.gif" },
  },
  {
    id: "epic-adventure-awaits",
    title: "สรรค์สร้างโลกนิยาย ดั่งใจนึก",
    description: "เปลี่ยนพล็อตเรื่องในหัวของคุณให้กลายเป็นจริง ด้วยระบบที่ใช้งานง่ายและรวดเร็ว ไม่จำเป็นต้องมีพื้นฐานด้านเทคนิค ก็สร้างสรรค์ผลงานได้ดั่งมืออาชีพ",
    imageUrl: "https://res.cloudinary.com/dzwjogkrz/image/upload/v1751571038/767725075.680000_mffzzx.gif",
    link: "http://localhost:3000/novels/the-chosen-one",
    category: "Visual Novels",
    highlightColor: "#ec4899",
    primaryAction: { label: "สำรวจวิชวลโนเวล", href: "https://res.cloudinary.com/dzwjogkrz/image/upload/v1751571038/767725075.680000_mffzzx.gif" },
  },
  {
    id: "author-spotlight-promo",
    title: "The Chosen One",
    description: "หากต้องเลือกช่วยชีวิตเพียงหนึ่งเดียว คุณจะเลือกใคร",
    imageUrl: "https://res.cloudinary.com/dzwjogkrz/image/upload/v1751572113/train_jbodrw.png",
    link: "https://res.cloudinary.com/dzwjogkrz/image/upload/v1751572113/train_jbodrw.png",
    category: "นักเขียนยอดนิยม",
    highlightColor: "#14b8a6",
    primaryAction: { label: "ค้นหานักเขียน", href: "https://res.cloudinary.com/dzwjogkrz/image/upload/v1751572113/train_jbodrw.png" },
  },
];

// เพิ่ม SectionHeader component สำหรับ consistency
function SectionHeader({ config }: { config: SectionConfig }) {
  const hasImage = config.headerImageUrl;
  
  return (
    <div 
      className={`section-header ${hasImage ? 'section-header-with-image' : ''}`}
      style={hasImage ? { backgroundImage: `url(${config.headerImageUrl})` } : {}}
    >
      {hasImage && <div className="section-header-overlay" />}
      <div className={hasImage ? 'section-header-content' : 'py-2'}>
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="text-primary bg-primary/10 p-2 sm:p-2.5 rounded-md shadow-sm flex items-center justify-center">
            {config.icon}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">{config.title}</h2>
            {config.description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{config.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Optimized skeleton loader
function OptimizedSectionSkeleton() {
  return (
    <section className="mb-6 md:mb-10">
      <div className="flex justify-between items-center mb-2.5 md:mb-3">
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="w-10 h-10 bg-muted rounded-md animate-pulse" />
          <div>
            <div className="h-6 w-32 bg-muted rounded animate-pulse mb-1" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="flex overflow-hidden space-x-2 sm:space-x-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex-shrink-0 w-[120px] min-[400px]:w-[130px] sm:w-[140px] md:w-[150px]">
            <div className="bg-muted rounded-lg aspect-square mb-2 animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse mb-1" />
            <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}

// Enhanced FeaturedSection สำหรับ performance
function FeaturedSection({ novels, viewAllLink, showViewAllButton }: {
  novels: NovelCardData[];
  viewAllLink: string;
  showViewAllButton: boolean;
}) {
  if (!novels || novels.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 md:py-10 col-span-full flex flex-col items-center justify-center min-h-[200px] bg-secondary/20 rounded-lg my-2">
        <BookOpen size={36} strokeWidth={1.5} className="mx-auto mb-3 text-primary/60" />
        <p className="font-semibold text-base text-foreground/80">ยังไม่พบนิยายในหมวดนี้</p>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">ลองสำรวจหมวดหมู่อื่นๆ หรือแวะมาใหม่เร็วๆ นี้นะ</p>
      </div>
    );
  }

  const mainNovel = novels[0];
  const sideNovels = novels.slice(1, 5);

  return (
    <div className="featured-section-wrapper">
      <div className="featured-grid">
        {/* Main Novel */}
        <div className="featured-main">
          <NovelCard
            novel={mainNovel}
            priority={true}
            variant="large"
            className="novel-card h-full w-full !m-0"
          />
        </div>

        {/* Side Novels */}
        <div className="featured-side">
          {sideNovels.map((novel, idx) => (
            <NovelCard
              key={`featured-side-${novel._id}-${idx}`}
              novel={novel}
              priority={true}
              variant="featured"
              className="novel-card h-full w-full !m-0"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Enhanced NovelRow พร้อม performance optimizations
function NovelRow({
  novels,
  filterKey,
  viewAllLink,
  showViewAllButton,
  showNavigation = true
}: {
  novels: NovelCardData[];
  filterKey: string;
  viewAllLink: string;
  showViewAllButton: boolean;
  showNavigation?: boolean;
}) {
  const cardWidthClasses = "w-[160px] min-[400px]:w-[170px] sm:w-[180px] md:w-[190px]";

  if (!novels || novels.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 md:py-10 col-span-full flex flex-col items-center justify-center min-h-[200px] bg-secondary/20 rounded-lg my-2">
        <BookOpen size={36} strokeWidth={1.5} className="mx-auto mb-3 text-primary/60" />
        <p className="font-semibold text-base text-foreground/80">ยังไม่พบนิยายในหมวดนี้</p>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">ลองสำรวจหมวดหมู่อื่นๆ หรือแวะมาใหม่เร็วๆ นี้นะ</p>
      </div>
    );
  }

  return (
    <div className={`novel-row-container ${showNavigation ? '' : 'overflow-hidden'}`}>
      {showNavigation && (
        <>
          <NovelRowNavButton direction="left" targetId={`novel-row-${filterKey}`} />
          <NovelRowNavButton direction="right" targetId={`novel-row-${filterKey}`} />
        </>
      )}

      <div
        id={`novel-row-${filterKey}`}
        className="novel-row-scroll novel-cards-grid custom-scrollbar-horizontal py-2 -mx-0.5 px-0.5 sm:-mx-1 sm:px-1 contain-layout"
        role="region"
        aria-label={`แถวนิยาย ${filterKey}`}
      >
        {novels.map((novel, index) => (
          <div
            key={`${filterKey}-${novel._id}-${index}`}
            className={`novel-card-item ${cardWidthClasses}`}
          >
            <NovelCard
              novel={novel}
              priority={index < 3}
              className="h-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Streaming section renderer พร้อม error boundary
async function StreamingSectionRenderer({ 
  dataPromise, // Changed prop name for clarity
  isFeatured = false 
}: { 
  dataPromise: Promise<SectionData>; 
  isFeatured?: boolean;
}) {
  try {
    const data = await dataPromise;
    const { config, novels, showViewAllButton } = data;
    
    return (
      <section aria-labelledby={config.key} className="mb-6 md:mb-10">
        <div className="flex justify-between items-center mb-2.5 md:mb-3">
          <SectionHeader config={config} />
        </div>
        
        {isFeatured ? (
          <FeaturedSection 
            novels={novels}
            viewAllLink={config.viewAllLink}
            showViewAllButton={showViewAllButton}
          />
        ) : (
          <NovelRow
            novels={novels}
            filterKey={config.key}
            viewAllLink={config.viewAllLink}
            showViewAllButton={showViewAllButton}
            showNavigation={true}
          />
        )}
      </section>
    );
  } catch (error) {
    console.error('❌ Section rendering error:', error);
    return (
      <section className="mb-6 md:mb-10">
        <div className="text-center text-muted-foreground py-8 md:py-10 flex flex-col items-center justify-center min-h-[200px] bg-secondary/20 rounded-lg">
          <BookOpen size={36} strokeWidth={1.5} className="mx-auto mb-3 text-red-500/60" />
          <p className="font-semibold text-base text-foreground/80">เกิดข้อผิดพลาดในการโหลดเนื้อหา</p>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">กรุณาลองรีเฟรชหน้าใหม่อีกครั้ง</p>
        </div>
      </section>
    );
  }
}

export default async function HomePage() {
  console.log('🎯 [Homepage] Starting ultra-optimized homepage render with aggressive caching');

  const sectionsConfig: SectionConfig[] = [
    {
      key: "trending-all",
      title: "ผลงานยอดนิยม",
      description: "เรื่องราวที่กำลังฮิตติดลมบน",
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
      filter: "trending",
      viewAllLink: "/novels?filter=trending",
      priority: true, // High priority section
    },
    {
      key: "new-releases",
      title: "อัปเดตล่าสุด",
      description: "ตอนใหม่และนิยายเปิดตัวสดใหม่",
      icon: <Clock className="h-5 w-5 text-primary" />,
      filter: "published",
      viewAllLink: "/novels?filter=published",
      priority: true, // High priority section
    },
    {
      key: "promoted-deals",
      title: "ส่วนลด",
      description: "นิยายลดราคาพิเศษ อ่านคุ้มกว่าเดิม",
      icon: <BadgePercent className="h-5 w-5 text-primary" />,
      filter: "promoted",
      viewAllLink: "/novels?filter=promoted",
    },
    {
      key: "completed-stories",
      title: "อ่านรวดเดียวจบ",
      description: "นิยายจบครบบริบูรณ์ อ่านสนุก",
      icon: <CheckCircle className="h-5 w-5 text-primary" />,
      filter: "completed",
      viewAllLink: "/novels?filter=completed",
    },
  ];

  // Parallel data fetching with aggressive caching
  const allSectionsData = await getSectionsData(sectionsConfig);
  
  console.log('✅ [Homepage] All data fetched, rendering optimized homepage');

  return (
    <div className="bg-background text-foreground min-h-screen pt-5">
      <main className="pb-10 md:pb-16">
        {/* Critical path: Show ImageSlider immediately */}
        <section className="w-full mb-8 md:mb-12 relative">
          <ImageSlider slides={imageSlideData} autoPlayInterval={7000} />
          <div className="h-4 md:h-6 bg-background mt-1 border-b border-border"></div>
        </section>

        <div className="container-custom space-y-8 md:space-y-12">
          {/* Wallet Top-up Banner */}
          <Link href="/user/wallet" className="block mb-8">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/30 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500/20 p-3 rounded-full">
                  <Coins className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">เติมเหรียญ</h3>
                  <p className="text-sm text-muted-foreground">เติมเหรียญเพื่อซื้อตอนนิยายและสนับสนุนนักเขียน</p>
                </div>
              </div>
              <ArrowRightCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
          </Link>
          
          {/* July 2025 Bonus Banner - Show for eligible users */}
          <JulyBonusBanner className="mb-8" />
          
          {/* Featured section (trending) - render immediately */}
          {allSectionsData[0] && (
            <FeaturedSection 
              novels={allSectionsData[0].novels}
              viewAllLink={allSectionsData[0].config.viewAllLink}
              showViewAllButton={allSectionsData[0].showViewAllButton}
            />
          )}

          {/* Other sections - render immediately without suspense */}
          {allSectionsData.slice(1).map((sectionData, index) => (
            <section key={sectionData.config.key} className="mb-6 md:mb-10">
              <SectionHeader config={sectionData.config} />
              <NovelRow
                novels={sectionData.novels}
                filterKey={sectionData.config.filter}
                viewAllLink={sectionData.config.viewAllLink}
                showViewAllButton={sectionData.showViewAllButton}
                showNavigation={true}
              />
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}