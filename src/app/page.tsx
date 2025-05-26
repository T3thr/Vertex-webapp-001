// src/app/page.tsx
import { Suspense } from "react";
import { NovelCard, NovelCardData } from "@/components/NovelCard";
import Link from "next/link";
import { ImageSlider, SlideData as SliderSlideData } from "@/components/ImageSlider";
import {
  ArrowRight,
  TrendingUp,
  Sparkles, // สำหรับเรื่องเด่น/โปรโมชั่น
  CheckCircle, // สำหรับจบแล้ว
  Clock, // สำหรับอัปเดตล่าสุด
  BookHeart, // ไอคอนสำหรับ Visual Novel
  BookOpen, // สำหรับ fallback เมื่อไม่พบนิยาย
  BadgePercent, // ไอคอนสำหรับส่วนลดโดยเฉพาะ
} from "lucide-react";
import { Metadata } from 'next';
import { motion } from "framer-motion"; // Import framer-motion

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
  novelType?: string // 'visual-novel' หรือ undefined
): Promise<{ novels: NovelCardData[], total: number }> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      filter,
    });
    if (novelType) {
      params.append("novelType", novelType); // novelType parameter ใน API
    }

    const url = `${API_URL}/api/novels?${params.toString()}`;
    console.log(`📞 [HomePage] Fetching novels from: ${url}`);

    const res = await fetch(url, {
      next: { revalidate: 300 }, // ISR: 5 นาที
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Unknown error", details: "Response not JSON" }));
      console.error(`❌ [HomePage] Failed to fetch novels for filter: ${filter}, novelType: ${novelType} (HTTP ${res.status})`, errorData);
      return { novels: [], total: 0 };
    }

    const data = await res.json();
    // ตรวจสอบให้แน่ใจว่า data.novels เป็น array
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
 * คอมโพเนนต์สำหรับแสดงหัวข้อส่วน (Section Title)
 */
function SectionTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-2.5 md:gap-3">
      {/* Icon Styling ตาม Figma: กล่องมนๆ มีสีพื้นหลังอ่อนๆ ของ primary */}
      <div className="text-primary p-1.5 bg-primary/10 rounded-md shadow-sm">
        {icon} {/* Lucide icon ถูกส่งเข้ามา */}
      </div>
      <div>
        {/* Title Styling ตาม Figma: ตัวหนา ขนาดใหญ่ */}
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
        {/* Description Styling ตาม Figma: ตัวเล็ก สีเทา */}
        {description && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

/**
 * คอมโพเนนต์ Skeleton สำหรับโหลดการ์ดในแนวนอน
 * จำนวนการ์ด (count) และขนาด ควรสอดคล้องกับ NovelRow และ Figma
 */
function NovelRowSkeleton({ count = 6 }: { count?: number }) {
  // ขนาดการ์ดที่ใช้ใน NovelRow เพื่อความสอดคล้อง
  const cardWidths = "w-[164px] sm:w-[175px] md:w-[190px] lg:w-[210px]";
  return (
    <div className={`flex space-x-3 sm:space-x-3.5 overflow-hidden py-1`}> {/* py-1 เหมือน NovelRow */}
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-pulse flex-shrink-0 ${cardWidths}`}>
          {/* โครงสร้าง Skeleton Card ให้คล้าย NovelCard */}
          <div className="bg-card rounded-lg md:rounded-xl shadow-sm overflow-hidden h-full">
            {/* Image Placeholder */}
            <div className="aspect-[2/3.1] w-full bg-secondary rounded-t-lg md:rounded-t-xl"></div> {/* aspect-ratio ตาม NovelCard */}
            {/* Content Placeholder */}
            <div className="p-2 md:p-2.5 text-xs"> {/* padding และ text size ตาม NovelCard */}
              <div className="h-3 bg-secondary rounded w-3/4 mb-1"></div> {/* Genre Tag */}
              <div className="h-5 bg-secondary rounded w-full mb-1.5"></div> {/* Title Line 1 */}
              <div className="h-5 bg-secondary rounded w-5/6 mb-1.5"></div> {/* Title Line 2 */}
              <div className="h-3 bg-secondary rounded w-full mb-1"></div>   {/* Synopsis Line 1 */}
              <div className="h-3 bg-secondary rounded w-5/6 mb-2"></div>   {/* Synopsis Line 2 */}
              {/* Stats Placeholder */}
              <div className="mt-auto pt-1.5 border-t border-border/30"> {/* border-border/30 ตาม NovelCard */}
                <div className="grid grid-cols-3 gap-x-1 mb-1">
                    <div className="h-2.5 bg-secondary rounded w-full"></div>
                    <div className="h-2.5 bg-secondary rounded w-full"></div>
                    <div className="h-2.5 bg-secondary rounded w-full"></div>
                </div>
                <div className="h-2 bg-secondary rounded w-1/2"></div> {/* Updated at */}
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
 * ปรับปรุงให้ responsive และใช้ styling ตาม Figma
 */
function NovelRow({ novelsData, filterKey, cardDisplayLimit = 6 }: { novelsData: { novels: NovelCardData[], total: number }; filterKey: string; cardDisplayLimit?: number }) {
  const { novels, total } = novelsData;

  // ขนาดการ์ดที่ fix ไว้ชัดเจนตาม breakpoints และสอดคล้องกับ Figma
  const cardWidths = "w-[164px] sm:w-[175px] md:w-[190px] lg:w-[210px]";
  // Aspect ratio ของรูปภาพ
  const imageAspectRatio = "aspect-[2/3.1]"; // สอดคล้องกับ Figma ที่การ์ดดูสูง

  // ถ้าไม่พบนิยายเลย (ทั้งจาก API และ total เป็น 0)
  if (!novels || novels.length === 0) {
    // แสดงข้อความ "ยังไม่พบนิยาย" - styling ให้ดูดีขึ้น
    return (
      <div className="text-center text-muted-foreground py-8 md:py-10 col-span-full flex flex-col items-center justify-center min-h-[300px] bg-secondary/30 rounded-lg my-2"> {/* เพิ่ม my-2 */}
        <BookOpen size={36} className="mx-auto mb-2 text-primary/50" /> {/* Icon ใหญ่ขึ้น, สีอ่อนลง */}
        <p className="font-semibold text-base">ยังไม่พบนิยายในหมวดนี้</p>
        <p className="text-sm">ลองค้นหาจากหมวดหมู่อื่น หรือกลับมาใหม่ภายหลังนะ</p>
      </div>
    );
  }

  // แสดงการ์ดตาม cardDisplayLimit
  const novelsToShow = novels.slice(0, cardDisplayLimit);
  // "ดูทั้งหมด" จะแสดงเมื่อ total (จาก API สำหรับ filter นี้) > จำนวนที่แสดงในแถว
  const showViewAll = total > novelsToShow.length && novelsToShow.length > 0;

  // สร้าง URL สำหรับ "ดูทั้งหมด" ให้ถูกต้อง
  const filterParam = filterKey.split('-')[0]; // 'trending', 'published', 'promoted', 'completed'
  const novelTypeParam = filterKey.includes('visual-novel') ? '&novelType=visual-novel' : '';
  const viewAllUrl = `/novels?filter=${filterParam}${novelTypeParam}`;


  return (
    // Container สำหรับแถวแนวนอน
    // Tailwind classes สำหรับ scrollbar (อาจต้อง config plugin ถ้ายังไม่ได้ทำ)
    // เพิ่ม -mx-1 px-1 เพื่อให้ shadow ของ card แรกและ view all ไม่ถูกตัด
    <div className="flex overflow-x-auto space-x-3 sm:space-x-3.5 pb-3.5 -mb-3.5 scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-secondary/30 hover:scrollbar-thumb-primary/60 active:scrollbar-thumb-primary/80 rounded-md py-1.5 -mx-1 px-1"> {/* เพิ่ม py-1.5 */}
      {novelsToShow.map((novel, index) => (
        <NovelCard
          key={`${filterKey}-${novel._id}-${index}`} // ใช้ novel._id เพื่อ key ที่ stable กว่า slug
          novel={novel}
          priority={index < 3} // ให้ priority กับ 2-3 การ์ดแรก (ขึ้นอยู่กับจำนวนที่แสดงผลพร้อมกันบนจอ)
          className={`${cardWidths} h-full`} // กำหนดขนาด width และให้สูงเต็ม container (h-full)
          imageClassName={imageAspectRatio} // กำหนด aspect ratio ของรูปภาพ
        />
      ))}
      {/* ปุ่ม "ดูทั้งหมด" */}
      {showViewAll && (
        <Link
          href={viewAllUrl}
          className={`${cardWidths} ${imageAspectRatio} flex-shrink-0 h-full bg-card/70 hover:bg-card rounded-lg md:rounded-xl shadow-md hover:shadow-lg flex flex-col items-center justify-center text-center group transition-all duration-200 ease-in-out border-2 border-dashed border-primary/40 hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
          // ใช้ aspect ratio เดียวกันกับ NovelCard
        >
          <ArrowRight size={28} className="text-primary mb-1.5 transition-transform duration-200 group-hover:translate-x-1 h-7 w-7" /> {/* Icon ใหญ่ขึ้น */}
          <span className="font-semibold text-sm text-primary">ดูทั้งหมด</span>
          <span className="text-xs text-muted-foreground">({total.toLocaleString()} เรื่อง)</span>
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
  novelType, // 'visual-novel' หรือ undefined
  displayLimit = 6,
  fetchLimit = 7,
  sectionKey // key ที่ไม่ซ้ำกันสำหรับ Suspense และ NovelRow
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
  // Fetch data ภายใน Server Component นี้
  const novelsData = await getNovels(filter, fetchLimit, novelType);

  // สร้าง URL สำหรับปุ่ม "ดูทั้งหมด" ที่ header ของ section
  const filterParam = filter.split('-')[0];
  const novelTypeParamForLink = novelType ? `&novelType=${novelType}` : '';
  const viewAllUrlPath = `/novels?filter=${filterParam}${novelTypeParamForLink}`;

  return (
    <section className="mb-8 md:mb-12"> {/* เพิ่ม margin bottom ระหว่าง section */}
      {/* Header ของ Section */}
      <div className="flex justify-between items-center mb-3 md:mb-4"> {/* ลด margin bottom ของ header */}
        <SectionTitle icon={icon} title={title} description={description} />
        {/* ปุ่ม "ดูทั้งหมด" จะแสดงเมื่อมีนิยายมากกว่าจำนวนที่แสดงในแถว และมีนิยายให้แสดง */}
        {(novelsData.total > 0 && novelsData.novels.length > 0 && novelsData.total > displayLimit) && (
            <Link
                href={viewAllUrlPath}
                className="flex items-center gap-1 text-sm sm:text-base text-primary font-semibold hover:text-primary/80 transition-colors whitespace-nowrap group" // ปรับขนาด font
            >
                <span>ดูทั้งหมด</span>
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 h-4 w-4" /> {/* ปรับขนาด icon */}
            </Link>
        )}
      </div>
      {/* แถวนิยาย */}
      <NovelRow novelsData={novelsData} filterKey={sectionKey} cardDisplayLimit={displayLimit} />
    </section>
  );
}


/**
 * หน้าแรกของเว็บไซต์
 */
export default async function HomePage() {
  // ข้อมูลสำหรับ ImageSlider (Banner) - ปรับปรุงให้สวยงามและ responsive
  const imageSlideData: SliderSlideData[] = [
    {
      id: "vn-discovery-slide",
      title: "โลกใบใหม่ใน Visual Novel",
      description: "ทุกการตัดสินใจของคุณ กำหนดเรื่องราวและปลายทางที่แตกต่าง ค้นหามหากาพย์ที่คุณเป็นผู้ลิขิต",
      imageUrl: "/images/featured/banner-vn-world.webp", // รูปภาพควรแสดงโลกกว้างใหญ่และองค์ประกอบ Visual Novel
      link: "/novels?novelType=visual-novel&filter=trending", // ลิงก์ไปยังหน้าค้นหา VN ที่กำลังมาแรง
      category: "Visual Novels", // อาจใช้แสดงบนสไลด์
      highlightColor: "bg-purple-600", // สีไฮไลท์สำหรับหมวดหมู่ (Tailwind class)
      primaryAction: { label: "สำรวจวิชวลโนเวล", href: "/novels?novelType=visual-novel&filter=trending" },
    },
    {
      id: "epic-adventure-awaits",
      title: "ตำนานรักข้ามภพ", // ชื่อเรื่องที่น่าสนใจ
      description: "โชคชะตา ความรัก และการผจญภัยครั้งยิ่งใหญ่ในดินแดนที่ไม่เคยหลับใหล รอคุณมาสัมผัส",
      imageUrl: "/images/featured/banner-fantasy-romance.webp", // รูปภาพควรสวยงาม สื่อถึงแฟนตาซีและความรัก
      link: "/novels/love-across-dimensions", // สมมติ slug ของนิยายเด่น
      category: "โรแมนติกแฟนตาซี",
      highlightColor: "bg-rose-600",
      primaryAction: { label: "อ่านตำนานรัก", href: "/novels/love-across-dimensions" },
    },
    {
      id: "author-spotlight-promo",
      title: "นักเขียนไฟแรง สร้างสรรค์ไม่หยุด",
      description: "พบกับผลงานล่าสุดจากนักเขียนดาวรุ่งที่กำลังมาแรงที่สุดใน NovelMaze คัดสรรมาเพื่อคุณโดยเฉพาะ",
      imageUrl: "/images/featured/banner-new-authors.webp", // รูปภาพควรแสดงความหลากหลายของนักเขียนหรือผลงาน
      link: "/authors", // ไปยังหน้ารวมนักเขียน หรือหน้านักเขียนเด่น
      category: "นักเขียนยอดนิยม",
      highlightColor: "bg-teal-600",
      primaryAction: { label: "ค้นหานักเขียน", href: "/authors" },
    },
  ];

  // การตั้งค่าสำหรับแต่ละส่วนของหน้าแรก (อัปเดตตามหมวดหมู่ใหม่)
  const sectionsConfig = [
    {
      key: "trending-vn", // Key เฉพาะสำหรับ Visual Novel ยอดนิยม
      title: "Visual Novel ยอดฮิต",
      description: "วิชวลโนเวลอินเทอร์แอคทีฟที่กำลังมาแรงและถูกใจนักอ่าน",
      icon: <BookHeart className="h-6 w-6 text-primary" />, // ใช้ lucide icon และปรับขนาด
      filter: "trending",
      novelType: "visual-novel", // กรองเฉพาะ Visual Novel
      displayLimit: 6, // จำนวนการ์ดที่แสดงในแถว
      fetchLimit: 7,   // จำนวนที่ fetch (displayLimit + 1 เพื่อเช็ค "ดูทั้งหมด")
    },
    {
      key: "trending-all",
      title: "ผลงานยอดนิยม",
      description: "เรื่องราวที่กำลังฮิตติดลมบน ครองใจนักอ่านทั่วทั้งแพลตฟอร์ม",
      icon: <TrendingUp className="h-6 w-6 text-primary" />,
      filter: "trending",
      displayLimit: 6,
      fetchLimit: 7,
    },
    {
      key: "new-releases",
      title: "อัปเดตล่าสุด",
      description: "พบกับตอนใหม่และนิยายเปิดตัวสดใหม่ทุกวัน ห้ามพลาด!",
      icon: <Clock className="h-6 w-6 text-primary" />,
      filter: "published", // "published" คือนิยายที่เพิ่งออกใหม่หรือตอนใหม่ล่าสุด
      displayLimit: 6,
      fetchLimit: 7,
    },
    {
      key: "promoted-deals", // Key สำหรับเรื่องเด่นและโปรโมชั่น
      title: "เรื่องเด่น & โปรโมชั่น", // ชื่อหัวข้อใหม่
      description: "นิยายคุณภาพที่เราคัดสรร พร้อมข้อเสนอสุดพิเศษที่คุณต้องรีบคว้า",
      icon: <BadgePercent className="h-6 w-6 text-primary" />, // ไอคอนสำหรับส่วนลด/โปรโมชั่น
      filter: "promoted", // filter "promoted" ใน API จะดึงทั้ง isFeatured และ activePromotion
      displayLimit: 6,
      fetchLimit: 7,
    },
    {
      key: "completed-stories",
      title: "อ่านรวดเดียวจบ",
      description: "นิยายจบครบบริบูรณ์ อ่านสนุกต่อเนื่องไม่มีสะดุด มันส์ครบรส",
      icon: <CheckCircle className="h-6 w-6 text-primary" />,
      filter: "completed",
      displayLimit: 6,
      fetchLimit: 7,
    },
  ];

  return (
    <div className="bg-background text-foreground min-h-screen"> {/* ใช้ตัวแปร CSS จาก globals.css */}
      <main className="pb-10 md:pb-16"> {/* เพิ่ม padding bottom */}
        {/* ส่วน Banner Image Slider */}
        <section className="w-full mb-8 md:mb-12 xl:mb-16 relative"> {/* เพิ่ม margin bottom ให้ ImageSlider */}
          <ImageSlider slides={imageSlideData} />
        </section>

        {/* ส่วนแสดงนิยายตามหมวดหมู่ */}
        <div className="container-custom space-y-8 md:space-y-12"> {/* ใช้ space-y เพื่อระยะห่างระหว่าง sections */}
          {sectionsConfig.map((section) => (
            <Suspense key={section.key} fallback={<NovelRowSkeleton count={section.displayLimit}/>}>
              <SectionRenderer
                sectionKey={section.key}
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