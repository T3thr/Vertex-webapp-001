// src/app/page.tsx
import { Suspense } from "react";
import { NovelCard, NovelCardData } from "@/components/NovelCard";
import Link from "next/link";
import { ImageSlider } from "@/components/ImageSlider";
import {
  ArrowRight,
  TrendingUp,
  Sparkles,
  CheckCircle,
  Clock,
  BookHeart, // ไอคอนสำหรับ Visual Novel
  BookOpen, // สำหรับ fallback
} from "lucide-react";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NovelMaze - คลังเรื่องเล่า นิยาย และวิชวลโนเวลที่คุณออกแบบได้',
  description: 'ค้นพบและสร้างสรรค์เรื่องราวในรูปแบบที่คุณชื่นชอบ ไม่ว่าจะเป็นนิยายแชท นิยายภาพ หรือวิชวลโนเวลแบบอินเทอร์แอคทีฟ ที่ NovelMaze',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * ฟังก์ชันดึงข้อมูลนิยายจาก API
 */
async function getNovels(
  filter: string,
  limit: number = 7, // Fetch 1 more than display limit to check for "View All"
  novelType?: string
): Promise<{ novels: NovelCardData[], total: number }> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      filter,
    });
    if (novelType) {
      params.append("novelType", novelType);
    }

    const url = `${API_URL}/api/novels?${params.toString()}`;
    console.log(`📞 [HomePage] Fetching novels from: ${url}`);

    const res = await fetch(url, {
      next: { revalidate: 300 }, // ISR: 5 นาที
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
      console.error(`❌ [HomePage] Failed to fetch novels for filter: ${filter}, novelType: ${novelType} (HTTP ${res.status})`, errorData);
      return { novels: [], total: 0 };
    }

    const data = await res.json();
    const fetchedNovels = Array.isArray(data.novels) ? data.novels : [];
    const totalNovels = data.pagination?.total || 0;
    console.log(`✅ [HomePage] Received ${fetchedNovels.length} novels (total: ${totalNovels}) for filter: ${filter}, novelType: ${novelType}`);

    return { novels: fetchedNovels, total: totalNovels };
  } catch (error: any) {
    console.error(`❌ [HomePage] Error fetching novels for ${filter}, novelType: ${novelType}:`, error.message, error.stack);
    return { novels: [], total: 0 };
  }
}

/**
 * คอมโพเนนต์สำหรับแสดงหัวข้อส่วน
 */
function SectionTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-2.5 md:gap-3">
      <div className="text-primary p-1.5 md:p-2 bg-primary/10 rounded-md md:rounded-lg shadow-sm">{icon}</div>
      <div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{title}</h2> 
        {description && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>} 
      </div>
    </div>
  );
}

/**
 * คอมโพเนนต์ Skeleton สำหรับโหลดการ์ดในแนวนอน
 */
function NovelRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex space-x-3 sm:space-x-4 overflow-hidden py-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse flex-shrink-0 w-[170px] sm:w-[180px] md:w-[200px] lg:w-[220px]">
          <div className="bg-card rounded-lg md:rounded-xl shadow-sm overflow-hidden h-full"> 
            <div className="aspect-[2/3.05] w-full bg-secondary rounded-t-lg md:rounded-t-xl"></div> 
            <div className="p-2 md:p-2.5">
              <div className="h-3.5 bg-secondary rounded w-3/4 mb-1.5"></div> 
              <div className="h-2.5 bg-secondary rounded w-full mb-1"></div> 
              <div className="h-2.5 bg-secondary rounded w-5/6 mb-2"></div> 
              <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-border/30"> 
                <div className="h-3 bg-secondary rounded w-1/4"></div> 
                <div className="h-3 bg-secondary rounded w-1/4"></div> 
                <div className="h-3 bg-secondary rounded w-1/4"></div> 
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * คอมโพเนนต์แสดงแถวของนิยาย (เลื่อนแนวนอนได้)
 */
function NovelRow({ novelsData, filterKey, cardDisplayLimit = 6 }: { novelsData: { novels: NovelCardData[], total: number }; filterKey: string; cardDisplayLimit?: number }) {
  const { novels, total } = novelsData;

  if (novels.length === 0 && total === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 md:py-10 col-span-full flex flex-col items-center justify-center min-h-[250px] bg-secondary/20 rounded-lg"> 
        <BookOpen size={40} className="mx-auto mb-2.5 text-primary/40 h-10 w-10" />
        <p className="font-semibold text-sm">ยังไม่พบนิยายในหมวดนี้</p>
        <p className="text-xs">ลองค้นหาจากหมวดหมู่อื่น หรือกลับมาใหม่ภายหลังนะ</p>
      </div>
    );
  }

  // แสดงการ์ดตาม cardDisplayLimit
  const novelsToShow = novels.slice(0, cardDisplayLimit);
  // "ดูทั้งหมด" จะแสดงเมื่อ total (จาก API สำหรับ filter นี้) > จำนวนที่แสดงในแถว
  const showViewAll = total > novelsToShow.length && novelsToShow.length > 0;
  const viewAllUrl = `/novels?filter=${filterKey.split('-')[0]}${filterKey.includes('visual-novel') ? '&novelType=visual-novel' : '' }`;


  return (
    <div className="flex overflow-x-auto space-x-3 sm:space-x-3.5 pb-3.5 -mb-3.5 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-secondary/20 hover:scrollbar-thumb-primary/50 active:scrollbar-thumb-primary/70 rounded-md py-1"> 
      {novelsToShow.map((novel, index) => (
        <NovelCard
          key={`${filterKey}-${novel.slug}-${index}`}
          novel={novel}
          priority={index < 2} // ให้ priority กับ 2 การ์ดแรก
          className="flex-shrink-0 w-[164px] sm:w-[175px] md:w-[190px] lg:w-[210px] h-full" // ปรับขนาดเล็กน้อย
          imageClassName="aspect-[2/3.05] sm:aspect-[2/3.1] md:aspect-[2/3.15]"
        />
      ))}
      {showViewAll && (
        <Link
          href={viewAllUrl}
          className="flex-shrink-0 w-[164px] sm:w-[175px] md:w-[190px] lg:w-[210px] h-full bg-card/60 hover:bg-card/90 rounded-lg md:rounded-xl shadow-md hover:shadow-lg flex flex-col items-center justify-center text-center group transition-all duration-200 ease-in-out aspect-[2/3.05] sm:aspect-[2/3.1] md:aspect-[2/3.15] border-2 border-dashed border-primary/30 hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" //
        >
          <ArrowRight size={24} className="text-primary mb-1 transition-transform duration-200 group-hover:translate-x-0.5 h-6 w-6" />
          <span className="font-semibold text-xs text-primary">ดูทั้งหมด</span>
          <span className="text-[10px] text-muted-foreground">({total.toLocaleString()} เรื่อง)</span> 
        </Link>
      )}
    </div>
  );
}

/**
 * คอมโพเนนต์แสดงส่วนพร้อมนิยายแบบแถวเลื่อนแนวนอน (จัดการ Suspense ภายใน)
 */
async function SectionRenderer({
  title,
  description,
  icon,
  filter,
  novelType,
  displayLimit = 6, // จำนวนการ์ดที่แสดงในแถว
  fetchLimit = 7,   // จำนวนที่ fetch (displayLimit + 1)
  sectionKey
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  filter: string;
  novelType?: string;
  displayLimit?: number;
  fetchLimit?: number;
  sectionKey: string;
}) {
  const novelsData = await getNovels(filter, fetchLimit, novelType);
  const viewAllUrlPath = novelType
    ? `/novels?novelType=${novelType}&filter=${filter}`
    : `/novels?filter=${filter}`;

  return (
    <section className="mb-6 md:mb-10">
      <div className="flex justify-between items-center mb-2.5 md:mb-3.5">
        <SectionTitle icon={icon} title={title} description={description} />
        {(novelsData.total > 0 && novelsData.novels.length > 0 && novelsData.total > displayLimit) && (
            <Link
                href={viewAllUrlPath}
                className="flex items-center gap-1 text-xs sm:text-sm text-primary font-semibold hover:text-primary/80 transition-colors whitespace-nowrap group" //
            >
                <span>ดูทั้งหมด</span>
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5 h-3.5 w-3.5" />
            </Link>
        )}
      </div>
      <NovelRow novelsData={novelsData} filterKey={sectionKey} cardDisplayLimit={displayLimit} />
    </section>
  );
}

/**
 * หน้าแรกของเว็บไซต์
 */
export default async function HomePage() {
  const ImageSlideData = [
    {
      id: "vn-promo-slide",
      title: "ดื่มด่ำโลก Visual Novel",
      description: "ทุกการเลือกคือเส้นทางใหม่ ค้นพบตอนจบหลากหลายในเรื่องราวที่คุณควบคุม",
      imageUrl: "/images/featured/slide-vn-main-promo.webp", // รูปภาพควรสื่อถึง Visual Novel
      link: "/novels?novelType=visual-novel",
      category: "Visual Novels",
      highlightColor: "bg-purple-500", //
      primaryAction: { label: "สำรวจวิชวลโนเวล", href: "/novels?novelType=visual-novel" },
    },
    {
      id: "new-epic-fantasy",
      title: "มหากาพย์ใหม่ 'อัสนีพลิกสวรรค์'",
      description: "การผจญภัยสุดจินตนาการในดินแดนแห่งเวทมนตร์และพลังลึกลับ",
      imageUrl: "/images/featured/slide-new-fantasy.webp",
      link: "/novels/asani-flips-heaven", // สมมติ slug
      category: "แฟนตาซีผจญภัย",
      highlightColor: "bg-sky-600", //
      primaryAction: { label: "อ่านเลย", href: "/novels/asani-flips-heaven" },
    },
     {
      id: "top-authors-monthly",
      title: "นักเขียนดาวเด่นประจำเดือน",
      description: "ค้นพบผลงานชั้นเยี่ยมจากนักเขียนมากความสามารถที่เราภูมิใจนำเสนอ",
      imageUrl: "/images/featured/slide-top-authors.webp",
      link: "/authors/top-picks", // สมมติ path
      category: "นักเขียนแนะนำ",
      highlightColor: "bg-amber-500", //
      primaryAction: { label: "ดูนักเขียน", href: "/authors/top-picks" },
    },
  ];

  const sectionsConfig = [
    {
      key: "trending-vn",
      title: "Visual Novel มาแรง",
      description: "วิชวลโนเวลที่กำลังอินเทรนด์และถูกพูดถึงมากที่สุด",
      icon: <BookHeart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />,
      filter: "trending",
      novelType: "visual-novel",
      displayLimit: 6,
      fetchLimit: 7,
    },
    {
      key: "trending-all",
      title: "ผลงานยอดนิยม",
      description: "เรื่องราวสุดฮิตที่ครองใจนักอ่านทั่วทั้งแพลตฟอร์ม",
      icon: <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />,
      filter: "trending",
      displayLimit: 6,
      fetchLimit: 7,
    },
    {
      key: "new-releases",
      title: "อัปเดตล่าสุด",
      description: "ตอนใหม่ นิยายใหม่ สดใหม่ทุกวัน",
      icon: <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />, 
      filter: "published",
      displayLimit: 6,
      fetchLimit: 7,
    },
    {
      key: "featured-novels",
      title: "เรื่องเด่นแนะนำ",
      description: "นิยายคุณภาพที่เราคัดสรรมาเป็นพิเศษเพื่อคุณ",
      icon: <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />,
      filter: "promoted",
      displayLimit: 6,
      fetchLimit: 7,
    },
    {
      key: "completed-stories",
      title: "จบครบทุกตอน",
      description: "อ่านสนุกต่อเนื่องไม่มีสะดุด พร้อมบทสรุปที่เข้มข้น",
      icon: <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />,
      filter: "completed",
      displayLimit: 6,
      fetchLimit: 7,
    },
  ];

  return (
    <div className="bg-background text-foreground min-h-screen"> 
      <main className="pb-10 md:pb-14">
        <section className="w-full mb-6 md:mb-10 xl:mb-12 relative">
          <ImageSlider slides={ImageSlideData} />
        </section>

        <div className="container-custom space-y-6 md:space-y-10"> 
          {sectionsConfig.map((section) => (
            <Suspense key={section.key} fallback={<NovelRowSkeleton count={section.displayLimit}/>}>
              <SectionRenderer
                sectionKey={section.key} // ส่ง key ที่ไม่ซ้ำกันสำหรับ Suspense และ NovelRow
                title={section.title}
                description={section.description}
                icon={section.icon}
                filter={section.filter}
                novelType={section.novelType}
                displayLimit={section.displayLimit}
                fetchLimit={section.fetchLimit}
              />
            </Suspense>
          ))}
        </div>
      </main>
    </div>
  );
}