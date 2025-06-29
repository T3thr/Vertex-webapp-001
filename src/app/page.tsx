// src/app/page.tsx
// หน้านี้เป็น Server Component โดยสมบูรณ์ การดึงข้อมูลเกิดขึ้นบนเซิร์ฟเวอร์
// Next.js App Router ทำให้ Server Components เป็น SSR โดยอัตโนมัติ
// ปรับปรุงเพื่อความเร็วสูงสุดและไม่มี loading flickering

import { Suspense } from 'react';
import { NovelCard, NovelCardData } from "@/components/NovelCard";
import { ImageSlider, SlideData as SliderSlideData } from "@/components/ImageSlider";
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
            <div className="bg-muted rounded-lg aspect-[2/3] mb-2 animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse mb-1" />
            <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}

function NovelRow({
  novels,
  filterKey,
  viewAllLink,
  showViewAllButton
}: {
  novels: NovelCardData[];
  filterKey: string;
  viewAllLink: string;
  showViewAllButton: boolean;
}) {
  // ปรับขนาด card ให้เล็กลงตาม readawrite.com
  const cardWidthClasses = "w-[120px] min-[400px]:w-[130px] sm:w-[140px] md:w-[150px]";
  const imageAspectRatio = "aspect-[2/3]";

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
    <div
      className="flex overflow-x-auto space-x-2 sm:space-x-3 pb-3 -mb-3 custom-scrollbar-horizontal scroll-smooth snap-x snap-mandatory py-2 -mx-0.5 px-0.5 sm:-mx-1 sm:px-1"
      role="region"
      aria-label={`แถวนิยาย ${filterKey}`}
    >
      {novels.map((novel, index) => (
        <div
          key={`${filterKey}-${novel._id}-${index}`}
          className={`flex-shrink-0 ${cardWidthClasses} snap-start`}
        >
          <NovelCard
            novel={novel}
            priority={index < 3}
            className="h-full"
            imageClassName={imageAspectRatio}
          />
        </div>
      ))}

      {showViewAllButton && (
        <div
          className={`flex-shrink-0 ${cardWidthClasses} snap-start`}
        >
          <Link
            href={viewAllLink}
            className="bg-card hover:bg-secondary transition-colors duration-200 rounded-lg shadow-sm hover:shadow-md flex flex-col items-center justify-center h-full group p-3 text-center border border-border/50"
            role="link"
            aria-label={`ดูนิยายทั้งหมดในหมวด ${filterKey}`}
          >
            <div className="flex flex-col items-center justify-center flex-grow">
                <ArrowRightCircle size={28} strokeWidth={1.5} className="text-primary mb-2 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium text-primary group-hover:underline">
                  ดูทั้งหมด
                </span>
                <span className="text-[9px] text-muted-foreground mt-0.5">
                  ({filterKey})
                </span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

// Component สำหรับแสดงผล section พร้อม error boundary
async function SectionRenderer({ configPromise }: { configPromise: Promise<SectionData> }) {
  try {
    const data = await configPromise;
    const { config, novels, showViewAllButton } = data;
    
    return (
      <section aria-labelledby={config.key} className="mb-6 md:mb-10">
        <div className="flex justify-between items-center mb-2.5 md:mb-3">
          <SectionTitle icon={config.icon} title={config.title} description={config.description} />
        </div>
        <NovelRow
          novels={novels}
          filterKey={config.key}
          viewAllLink={config.viewAllLink}
          showViewAllButton={showViewAllButton}
        />
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
      imageUrl: "https://res.cloudinary.com/dr0ao4k6a/image/upload/v1724012744/cld-sample-5.jpg",
      link: "https://res.cloudinary.com/dr0ao4k6a/image/upload/v1724012744/cld-sample-5.jpg",
      category: "Visual Novels",
      highlightColor: "var(--color-primary)",
      primaryAction: { label: "สำรวจวิชวลโนเวล", href: "https://res.cloudinary.com/dr0ao4k6a/image/upload/v1724012744/cld-sample-5.jpg" },
    },
    {
      id: "epic-adventure-awaits",
      title: "ตำนานรักข้ามภพ",
      description: "โชคชะตา ความรัก และการผจญภัยครั้งยิ่งใหญ่ในดินแดนที่ไม่เคยหลับใหล รอคุณมาสัมผัส",
      imageUrl: "/images/featured/banner-fantasy-romance.webp",
      link: "/novels/love-across-dimensions",
      category: "โรแมนติกแฟนตาซี",
      highlightColor: "#ec4899",
      primaryAction: { label: "อ่านตำนานรัก", href: "/novels/love-across-dimensions" },
    },
    {
      id: "author-spotlight-promo",
      title: "นักเขียนไฟแรง สร้างสรรค์ไม่หยุด",
      description: "พบกับผลงานล่าสุดจากนักเขียนดาวรุ่งที่กำลังมาแรงที่สุดใน NovelMaze คัดสรรมาเพื่อคุณโดยเฉพาะ",
      imageUrl: "/images/featured/banner-new-authors.webp",
      link: "/authors",
      category: "นักเขียนยอดนิยม",
      highlightColor: "#14b8a6",
      primaryAction: { label: "ค้นหานักเขียน", href: "/authors" },
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
      title: "โปรโมชันและเรื่องเด่น",
      description: "นิยายคุณภาพพร้อมข้อเสนอพิเศษ",
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
    <div className="bg-background text-foreground min-h-screen">
      <main className="pb-10 md:pb-16">
        {/* แสดง ImageSlider ทันทีโดยไม่ต้องรอ API */}
        <section className="w-full mb-6 md:mb-10 xl:mb-12 relative">
          <ImageSlider slides={imageSlideData} autoPlayInterval={7000} />
        </section>

        <div className="container-custom space-y-8 md:space-y-12">
          {/* ใช้ Suspense แยกแต่ละ section เพื่อ progressive loading */}
          {sectionPromises.map((promise, index) => (
            <Suspense key={sectionsConfig[index].key} fallback={<SectionSkeleton />}>
              <SectionRenderer configPromise={promise} />
            </Suspense>
          ))}
        </div>
      </main>
    </div>
  );
}