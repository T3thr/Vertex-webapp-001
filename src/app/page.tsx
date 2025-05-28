// src/app/page.tsx
// หน้านี้เป็น Server Component โดยสมบูรณ์ การดึงข้อมูลเกิดขึ้นบนเซิร์ฟเวอร์
// Next.js App Router ทำให้ Server Components เป็น SSR โดยอัตโนมัติ
// 'use server' ไม่จำเป็นต้องประกาศที่นี่สำหรับ SSR ของหน้าเพจ; มันใช้สำหรับ Server Actions

import { Suspense } from "react";
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

interface SectionConfig {
  key: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  filter: string;
  novelType?: string;
  viewAllLink: string;
}

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
    console.log(`📞 [HomePage Server] Fetching novels from: ${url}`);

    // ใช้ { cache: 'no-store' } เพื่อให้ข้อมูลสดใหม่เสมอ (ตามโค้ดเดิม)
    // หรือพิจารณาใช้ revalidation strategies อื่นๆ เช่น { next: { revalidate: 3600 } } หากข้อมูลไม่เปลี่ยนบ่อย
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Unknown error", details: "Response not JSON" }));
      console.error(`❌ [HomePage Server] Failed to fetch novels for filter: ${filter}, novelType: ${novelType} (HTTP ${res.status})`, errorData);
      return { novels: [], totalAvailable: 0 };
    }

    const data = await res.json();
    const fetchedNovels = Array.isArray(data.novels) ? data.novels : [];
    console.log(`✅ [HomePage Server] Received ${fetchedNovels.length} novels for filter: ${filter}, novelType: ${novelType}`);
    
    return { novels: fetchedNovels };
  } catch (error: any) {
    console.error(`❌ [HomePage Server] Error fetching novels for ${filter}, novelType: ${novelType}:`, error.message, error.stack);
    return { novels: [], totalAvailable: 0 };
  }
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

function NovelRowSkeleton({ count = NOVELS_PER_SECTION }: { count?: number }) {
  // ปรับขนาด skeleton ให้ตรงกับ card ใหม่
  const cardWidthClasses = "w-[120px] min-[400px]:w-[130px] sm:w-[140px] md:w-[150px]";
  const cardAspectRatio = "aspect-[2/3]";

  return (
    <div className={`flex space-x-2 sm:space-x-3 overflow-hidden py-2`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-pulse flex-shrink-0 ${cardWidthClasses}`}>
          <div className={`bg-card rounded-lg shadow-sm overflow-hidden h-full flex flex-col border border-border/50`}>
            <div className={`${cardAspectRatio} w-full bg-secondary rounded-t-lg`}></div>
            <div className="p-2 text-xs flex flex-col flex-grow">
              <div className="h-3 bg-secondary rounded w-3/4 mb-1"></div>
              <div className="h-2.5 bg-secondary rounded w-1/2 mb-1"></div>
              <div className="h-2 bg-secondary rounded w-1/3 mb-1"></div>
              <div className="mt-auto pt-1 border-t border-border/50">
                <div className="grid grid-cols-3 gap-x-0.5 mb-0.5">
                  <div className="h-2 bg-secondary rounded w-full"></div>
                  <div className="h-2 bg-secondary rounded w-full"></div>
                  <div className="h-2 bg-secondary rounded w-full"></div>
                </div>
                <div className="h-1.5 bg-secondary rounded w-3/4 mt-0.5"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className={`flex-shrink-0 ${cardWidthClasses}`}>
         <div className={`bg-secondary/50 rounded-lg shadow-sm overflow-hidden h-full flex flex-col items-center justify-center border border-border/50`}>
           <div className="h-4 w-4 bg-secondary rounded-full mb-1"></div>
           <div className="h-2.5 w-10 bg-secondary rounded"></div>
         </div>
      </div>
    </div>
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

  const shouldShowViewAll = showViewAllButton;

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

      {shouldShowViewAll && (
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

async function SectionRenderer({
  title,
  description,
  icon,
  filter,
  novelType,
  sectionKey,
  viewAllLink,
}: SectionConfig & { sectionKey: string }) {
  const { novels } = await getNovels(filter, NOVELS_PER_SECTION, novelType);
  const showViewAllButton = novels.length === NOVELS_PER_SECTION;

  return (
    <section aria-labelledby={sectionKey} className="mb-6 md:mb-10">
      <div className="flex justify-between items-center mb-2.5 md:mb-3">
        <SectionTitle icon={icon} title={title} description={description} />
      </div>
      <Suspense fallback={<NovelRowSkeleton count={NOVELS_PER_SECTION} />}>
        <NovelRow
            novels={novels}
            filterKey={sectionKey}
            viewAllLink={viewAllLink}
            showViewAllButton={showViewAllButton}
        />
      </Suspense>
    </section>
  );
}

export default async function HomePage() {
  const imageSlideData: SliderSlideData[] = [
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

  return (
    <div className="bg-background text-foreground min-h-screen">
      <main className="pb-10 md:pb-16">
        <section className="w-full mb-6 md:mb-10 xl:mb-12 relative">
          <Suspense fallback={
            // Fallback UI สำหรับ ImageSlider
            <div className="w-full h-[300px] sm:h-[380px] md:h-[450px] lg:h-[500px] xl:h-[550px] bg-secondary animate-pulse rounded-lg md:rounded-xl flex items-center justify-center">
                <p className="text-muted-foreground">กำลังโหลดสไลด์โชว์...</p>
            </div>
          }>
            <ImageSlider slides={imageSlideData} autoPlayInterval={7000} />
          </Suspense>
        </section>

        <div className="container-custom space-y-8 md:space-y-12">
          {sectionsConfig.map((section) => (
            <Suspense key={section.key} fallback={<NovelRowSkeleton count={NOVELS_PER_SECTION} />}>
              <SectionRenderer
                key={section.key}
                sectionKey={section.key}
                title={section.title}
                description={section.description}
                icon={section.icon}
                filter={section.filter}
                novelType={section.novelType}
                viewAllLink={section.viewAllLink}
              />
            </Suspense>
          ))}
        </div>
      </main>
    </div>
  );
}