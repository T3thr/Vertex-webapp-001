// src/app/page.tsx
// หน้านี้เป็น Server Component โดยสมบูรณ์ การดึงข้อมูลเกิดขึ้นบนเซิร์ฟเวอร์
// Next.js App Router ทำให้ Server Components เป็น SSR โดยอัตโนมัติ
// ปรับปรุงเพื่อความเร็วสูงสุดและไม่มี loading flickering

import { Suspense } from 'react';
import { NovelCard, NovelCardData } from "@/components/NovelCard";
import { ImageSlider, SlideData as SliderSlideData } from "@/components/ImageSlider";
import { NovelRowNavButton } from "@/components/NovelRowNavigation";
import {
  TrendingUp,
  CheckCircle,
  Clock,
  BookOpen,
  BadgePercent,
  ArrowRightCircle,
} from "lucide-react";
import { Metadata } from 'next';
import Link from "next/link";

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
  headerImageUrl?: string; // ✅ [เพิ่มใหม่] รองรับรูปภาพ header
}

interface SectionData {
  config: SectionConfig;
  novels: NovelCardData[];
  showViewAllButton: boolean;
}

// ฟังก์ชันดึงข้อมูลเดียว สำหรับ section เดียว (ใช้สำหรับ parallel fetching)
async function fetchSectionData(config: SectionConfig): Promise<SectionData> {
  try {
    const params = new URLSearchParams({
      limit: NOVELS_PER_SECTION.toString(),
      filter: config.filter,
    });
    if (config.novelType) {
      params.append("novelType", config.novelType);
    }

    const url = `${API_URL}/api/novels?${params.toString()}`;
    console.log(`📞 [HomePage Server] Fetching ${config.key} from: ${url}`);

    // ปรับปรุง: ใช้ timeout และ signal เพื่อป้องกัน hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 วินาที timeout

    const res = await fetch(url, { 
      next: { revalidate: 600 }, // เพิ่ม cache เป็น 10 นาที
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`❌ [HomePage Server] Failed to fetch ${config.key} (HTTP ${res.status})`);
      return {
        config,
        novels: [],
        showViewAllButton: false
      };
    }

    const data = await res.json();
    const fetchedNovels = Array.isArray(data.novels) ? data.novels : [];
    console.log(`✅ [HomePage Server] Received ${fetchedNovels.length} novels for ${config.key}`);
    
    return {
      config,
      novels: fetchedNovels,
      showViewAllButton: fetchedNovels.length === NOVELS_PER_SECTION
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`⏰ [HomePage Server] Request timeout for ${config.key}`);
    } else {
      console.error(`❌ [HomePage Server] Error fetching ${config.key}:`, error.message);
    }
    return {
      config,
      novels: [],
      showViewAllButton: false
    };
  }
}

// ปรับปรุงฟังก์ชันดึงข้อมูลให้รองรับ timeout และ error handling ที่ดีขึ้น
async function getAllNovelsData(sectionsConfig: SectionConfig[]): Promise<SectionData[]> {
  console.log('🚀 [HomePage Server] Starting parallel fetch for all sections');
  
  // ใช้ Promise.allSettled แทน Promise.all เพื่อไม่ให้ section หนึ่งล้มเหลวทำให้ทั้งหมดล้มเหลว
  const results = await Promise.allSettled(
    sectionsConfig.map(config => fetchSectionData(config))
  );

  const sectionsData = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`❌ [HomePage Server] Section ${sectionsConfig[index].key} failed:`, result.reason);
      return {
        config: sectionsConfig[index],
        novels: [],
        showViewAllButton: false
      };
    }
  });

  console.log('✅ [HomePage Server] All sections processed (some may have failed gracefully)');
  return sectionsData;
}

// ✅ [เพิ่มใหม่] Component สำหรับ Section Header ที่รองรับรูปภาพ
function SectionHeader({ config }: { config: SectionConfig }) {
  const hasImage = config.headerImageUrl;
  
  return (
    <div 
      className={`section-header ${hasImage ? 'section-header-with-image' : ''} smooth-appear`}
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

function SectionTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-2.5 md:gap-3">
      <div className="text-primary bg-primary/10 p-2 sm:p-2.5 rounded-md shadow-sm flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">{title}</h2>
        {description && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

// ปรับปรุง: เพิ่ม minimal skeleton loader สำหรับ Suspense
function SectionSkeleton() {
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

// ✅ [ปรับปรุงใหม่] Component สำหรับ Featured Section แบบ Asymmetrical Grid รองรับ responsive mobile
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

  const mainNovel = novels[0]; // นิยายหลักด้านซ้าย
  const sideNovels = novels.slice(1, 5); // เอา 4 ตัวสำหรับ grid 2x2 ด้านขวา

  return (
    <div className="featured-section-wrapper"> {/* ✅ [เพิ่มใหม่] wrapper สำหรับเพิ่มพื้นที่ด้านล่าง */}
      <div className="featured-grid"> {/* ✅ [ลบ smooth-appear] เพื่อความเร็วสูงสุด */}
        {/* Main Novel (ใหญ่ ซ้าย) - สัดส่วน 2 ส่วน */}
        <div className="featured-main">
          <NovelCard
            novel={mainNovel}
            priority={true}
            variant="large"
            className="novel-card h-full w-full !m-0" /* ✅ [เพิ่ม !m-0] เพื่อลบ margin ทั้งหมดโดย override inline style */
          />
        </div>

        {/* Side Novels (ขวา 2x2) - สัดส่วน 1 ส่วน */}
        <div className="featured-side">
          {/* Grid 2x2: แสดงการ์ด 4 ตัวหรือน้อยกว่า */}
          {sideNovels.map((novel, idx) => (
            <NovelCard
              key={`featured-side-${novel._id}-${idx}`}
              novel={novel}
              priority={true}
              variant="featured" /* ✅ [แก้ไขจาก default เป็น featured] เพื่อให้ใช้ขนาดที่เหมาะสม */
              className="novel-card h-full w-full !m-0" /* ✅ [เพิ่ม !m-0] เพื่อลบ margin ทั้งหมดโดย override inline style */
            />
          ))}
          
          {/* ✅ [ปรับใหม่] ปุ่มดูเพิ่มเติมอยู่ใต้ grid แบบสมมาตร */}
          {/* ปิดการแสดงปุ่ม "ดูเพิ่ม" ชั่วคราว
            {showViewAllButton && (
            <div className="view-more-button-container">
              <Link
                href={viewAllLink}
                className="view-more-circle"
                role="link"
                aria-label="ดูนิยายทั้งหมดในหมวดผลงานยอดนิยม"
              >
                <div className="view-more-content">
                  <ArrowRightCircle size={14} strokeWidth={1.5} className="text-primary mb-0.5" />
                  <span className="text-[8px] sm:text-[9px] font-medium text-primary">ดูเพิ่ม</span>
                </div>
              </Link>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
}

// ✅ [ปรับปรุง] NovelRow ที่รองรับปุ่มเลื่อนซ้าย-ขวา
function NovelRow({
  novels,
  filterKey,
  viewAllLink,
  showViewAllButton,
  showNavigation = true // ✅ [เพิ่มใหม่] ควบคุมการแสดงปุ่ม navigation
}: {
  novels: NovelCardData[];
  filterKey: string;
  viewAllLink: string;
  showViewAllButton: boolean;
  showNavigation?: boolean;
}) {
  // ปรับขนาด card ให้เล็กลงตาม readawrite.com
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
      {/* ✅ [เพิ่มใหม่] Navigation Buttons สำหรับ Desktop */}
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
              className="h-full" /* ✅ [ลบ hover-lift gpu-accelerated] เพื่อความเร็วสูงสุด */
            />
          </div>
        ))}
        {/*}
        {showViewAllButton && (
          <div className={`novel-card-item ${cardWidthClasses} flex items-center justify-center`}>
            <Link
              href={viewAllLink}
              className="view-more-circle"
              role="link"
              aria-label={`ดูนิยายทั้งหมดในหมวด ${filterKey}`}
            >
              <div className="view-more-content">
                <ArrowRightCircle size={20} strokeWidth={1.5} className="text-primary mb-1" />
                <span className="text-[10px] font-medium text-primary">
                  ดูเพิ่ม
                </span>
              </div>
            </Link>
          </div>
        )} */}
      </div>
    </div>
  );
}

// Component สำหรับแสดงผล section พร้อม error boundary
async function SectionRenderer({ 
  configPromise, 
  isFeatured = false 
}: { 
  configPromise: Promise<SectionData>; 
  isFeatured?: boolean;
}) {
  try {
    const data = await configPromise;
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
  console.log('🎯 [HomePage Server] Starting homepage render');
  
  // ข้อมูล slider แบบ static เพื่อไม่ต้อง fetch
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
      link: "https://res.cloudinary.com/dzwjogkrz/image/upload/v1751571038/767725075.680000_mffzzx.gif",
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

  const sectionsConfig: SectionConfig[] = [
    {
      key: "trending-all",
      title: "ผลงานยอดนิยม",
      description: "เรื่องราวที่กำลังฮิตติดลมบน",
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
      filter: "trending",
      viewAllLink: "/novels?filter=trending",
      // headerImageUrl: "/images/section-headers/trending-bg.webp", // ✅ [ตัวอย่าง] สำหรับอนาคต
    },
    {
      key: "new-releases",
      title: "อัปเดตล่าสุด",
      description: "ตอนใหม่และนิยายเปิดตัวสดใหม่",
      icon: <Clock className="h-5 w-5 text-primary" />,
      filter: "published",
      viewAllLink: "/novels?filter=published",
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

  // เริ่ม fetch ข้อมูลทั้งหมดแบบ parallel แต่ไม่รอให้เสร็จ
  const sectionPromises = sectionsConfig.map(config => fetchSectionData(config));
  
  console.log('✅ [HomePage Server] Homepage setup complete, starting render...');

  return (
    <div className="bg-background text-foreground min-h-screen pt-5">
      <main className="pb-10 md:pb-16">
        {/* แสดง ImageSlider ทันทีโดยไม่ต้องรอ API */}
        <section className="w-full mb-8 md:mb-12 relative">
          <ImageSlider slides={imageSlideData} autoPlayInterval={7000} />
          {/* เพิ่มเส้น border ใต้ slide bar */}
          <div className="h-4 md:h-6 bg-background mt-1 border-b border-border"></div>
        </section>

        <div className="container-custom space-y-8 md:space-y-12">
          {/* ✅ [เปลี่ยนแปลง] Section แรก (ผลงานยอดนิยม) ใช้ Asymmetrical Grid */}
          <Suspense key="trending-featured" fallback={<SectionSkeleton />}>
            <SectionRenderer configPromise={sectionPromises[0]} isFeatured={true} />
          </Suspense>

          {/* ✅ [เปลี่ยนแปลง] Section อื่นๆ ใช้ NovelRow ปกติพร้อมปุ่มเลื่อน */}
          {sectionPromises.slice(1).map((promise, index) => (
            <Suspense key={sectionsConfig[index + 1].key} fallback={<SectionSkeleton />}>
              <SectionRenderer configPromise={promise} isFeatured={false} />
            </Suspense>
          ))}
        </div>
      </main>
    </div>
  );
}