// src/app/page.tsx
// หน้านี้เป็น Server Component ที่ปรับปรุงให้โหลดเร็วสูงสุด
// ใช้ parallel fetching และ static generation เพื่อลด loading time ให้เหลือศูนย์
// ลบ Suspense boundaries ที่ไม่จำเป็นเพื่อป้องกัน loading flicker

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
  title: 'NovelMaze - คลังเรื่องเล่า นิยาย และวิชวลโนเวลที่คุณออกแบบได้',
  description: 'ค้นพบและสร้างสรรค์เรื่องราวในรูปแบบที่คุณชื่นชอบ ไม่ว่าจะเป็นนิยายแชท นิยายภาพ หรือวิชวลโนเวลแบบอินเทอร์แอคทีฟ ที่ NovelMaze',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const NOVELS_PER_SECTION = 8; // เพิ่มจำนวนเนื่องจาก card เล็กลง

// ✨ Pre-define static slider data เพื่อไม่ให้มี delay ในการโหลด
const STATIC_SLIDER_DATA: SliderSlideData[] = [
  {
    id: "vn-discovery-slide",
    title: "โลกใบใหม่ใน Visual Novel",
    description: "ทุกการตัดสินใจของคุณ กำหนดเรื่องราวและปลายทางที่แตกต่าง ค้นหามหากาพย์ที่คุณเป็นผู้ลิขิต",
    imageUrl: "/images/featured/banner-vn-world.webp",
    link: "/novels?novelType=interactive_fiction&filter=trending",
    category: "Visual Novels",
    highlightColor: "var(--color-primary)",
    primaryAction: { label: "สำรวจวิชวลโนเวล", href: "/novels?novelType=interactive_fiction&filter=trending" },
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

interface SectionConfig {
  key: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  filter: string;
  novelType?: string;
  viewAllLink: string;
}

// ⚡ ปรับปรุง fetch function ให้รวดเร็วและมี timeout protection
async function getNovels(
  filter: string,
  limit: number = NOVELS_PER_SECTION,
  novelType?: string
): Promise<{ novels: NovelCardData[], totalAvailable?: number }> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      filter,
    });
    if (novelType) {
      params.append("novelType", novelType);
    }

    const url = `${API_URL}/api/novels?${params.toString()}`;
    console.log(`⚡ [HomePage Server] Fast fetching from: ${url}`);

    // ✨ ใช้ revalidation แทน no-store เพื่อให้ faster caching
    // ✨ เพิ่ม timeout protection เพื่อป้องกัน slow API calls
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const res = await fetch(url, { 
      next: { revalidate: 300 }, // cache 5 minutes instead of no-store
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'max-age=300', // client-side caching
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`❌ [HomePage Server] API error for ${filter} (HTTP ${res.status})`);
      return { novels: [], totalAvailable: 0 };
    }

    const data = await res.json();
    const fetchedNovels = Array.isArray(data.novels) ? data.novels : [];
    console.log(`✅ [HomePage Server] Got ${fetchedNovels.length} novels for ${filter}`);
    
    return { novels: fetchedNovels };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`⏰ [HomePage Server] Timeout for ${filter}, returning empty`);
    } else {
      console.error(`❌ [HomePage Server] Error for ${filter}:`, error.message);
    }
    return { novels: [], totalAvailable: 0 };
  }
}

// ✨ Pre-defined section configurations สำหรับ faster rendering
const SECTIONS_CONFIG: SectionConfig[] = [
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

// ⚡ Optimized component สำหรับ section title (no re-renders)
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

// ⚡ Optimized empty state component
function EmptyState({ filterKey }: { filterKey: string }) {
  return (
    <div className="text-center text-muted-foreground py-8 md:py-10 col-span-full flex flex-col items-center justify-center min-h-[200px] bg-secondary/20 rounded-lg my-2">
      <BookOpen size={36} strokeWidth={1.5} className="mx-auto mb-3 text-primary/60" />
      <p className="font-semibold text-base text-foreground/80">ยังไม่พบนิยายในหมวดนี้</p>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">ลองสำรวจหมวดหมู่อื่นๆ หรือแวะมาใหม่เร็วๆ นี้นะ</p>
    </div>
  );
}

// ⚡ Optimized novel row component (no skeleton needed)
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
  const cardWidthClasses = "w-[120px] min-[400px]:w-[130px] sm:w-[140px] md:w-[150px]";
  const imageAspectRatio = "aspect-[2/3]";

  if (!novels || novels.length === 0) {
    return <EmptyState filterKey={filterKey} />;
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

      {showViewAllButton && novels.length >= NOVELS_PER_SECTION && (
        <div className={`flex-shrink-0 ${cardWidthClasses} snap-start`}>
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

// ⚡ Fast section component - renders immediately with data
function FastSection({
  title,
  description,
  icon,
  sectionKey,
  viewAllLink,
  novels
}: SectionConfig & { 
  sectionKey: string; 
  novels: NovelCardData[];
}) {
  const showViewAllButton = novels.length >= NOVELS_PER_SECTION;

  return (
    <section aria-labelledby={sectionKey} className="mb-6 md:mb-10">
      <div className="flex justify-between items-center mb-2.5 md:mb-3">
        <SectionTitle icon={icon} title={title} description={description} />
      </div>
      <NovelRow
        novels={novels}
        filterKey={sectionKey}
        viewAllLink={viewAllLink}
        showViewAllButton={showViewAllButton}
      />
    </section>
  );
}

// ⚡ MAIN OPTIMIZED HOMEPAGE - ใช้ parallel fetching เพื่อความเร็วสูงสุด
export default async function HomePage() {
  console.log("🚀 [HomePage] Starting ultra-fast parallel data fetching...");
  
  // ✨ PARALLEL FETCHING - ดึงข้อมูลทุก section พร้อมกันเพื่อลด loading time
  const startTime = Date.now();
  
  const dataPromises = SECTIONS_CONFIG.map(async (section) => {
    const { novels } = await getNovels(section.filter, NOVELS_PER_SECTION, section.novelType);
    return {
      section,
      novels
    };
  });

  // ⚡ รอให้ทุก API calls เสร็จพร้อมกัน (แทนการรอทีละตัว)
  const sectionsData = await Promise.all(dataPromises);
  
  const totalTime = Date.now() - startTime;
  console.log(`✅ [HomePage] All data fetched in ${totalTime}ms using parallel fetching!`);

  // ✨ IMMEDIATE RENDER - ไม่มี Suspense boundaries ที่ทำให้เกิด loading flicker
  return (
    <div className="bg-background text-foreground min-h-screen">
      <main className="pb-10 md:pb-16">
        {/* ⚡ Static slider renders immediately - no loading delay */}
        <section className="w-full mb-6 md:mb-10 xl:mb-12 relative">
          <ImageSlider slides={STATIC_SLIDER_DATA} autoPlayInterval={7000} />
        </section>

        {/* ⚡ All sections render immediately with pre-fetched data */}
        <div className="container-custom space-y-8 md:space-y-12">
          {sectionsData.map(({ section, novels }) => (
            <FastSection
              key={section.key}
              sectionKey={section.key}
              title={section.title}
              description={section.description}
              icon={section.icon}
              filter={section.filter}
              novelType={section.novelType}
              viewAllLink={section.viewAllLink}
              novels={novels}
            />
          ))}
        </div>
      </main>
    </div>
  );
}