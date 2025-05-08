// src/app/page.tsx
import { Suspense } from "react";
import { NovelCard } from "@/components/NovelCard";
import Link from "next/link";
import { ImageSlider } from "@/components/ImageSlider";
import { 
  FiArrowRight, 
  FiTrendingUp, 
  FiGift, 
  FiCheck, 
  FiClock, 
  FiStar,
  FiAward 
} from "react-icons/fi";

/**
 * ฟังก์ชันดึงข้อมูลนิยายจาก API
 * @param filter ประเภทการกรอง (trending, published, discount, completed)
 * @param limit จำนวนรายการที่ต้องการ
 * @returns ข้อมูลนิยาย
 */
async function getNovels(filter: string, limit: number = 8) {
  try {
    // สร้าง URL สำหรับเรียก API พร้อมเลือกฟิลด์ที่ต้องการ
    const fields = [
      "title",
      "slug",
      "coverImage",
      "description",
      "status",
      "isExplicitContent",
      "tags",
      "lastEpisodePublishedAt",
      "viewsCount",
      "likesCount",
      "averageRating",
      "author.profile.displayName",
      "author.username"
    ].join(",");
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/novels?limit=${limit}&filter=${filter}&fields=${fields}`;
    console.log(`📞 Fetching novels from: ${url}`);
    
    // เรียกใช้ API และกำหนดการรีวาลิเดต
    const res = await fetch(url, {
      next: { revalidate: 60 }, // รีวาลิเดตทุก 60 วินาที
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch novels for filter: ${filter} (HTTP ${res.status})`);
    }

    const data = await res.json();
    console.log(`✅ Received ${data.novels?.length || 0} novels for filter: ${filter}`, data.novels);
    
    return { novels: data.novels || [] };
  } catch (error: any) {
    console.error(`❌ ข้อผิดพลาดในการดึงนิยายสำหรับ ${filter}:`, error.message);
    return { novels: [] };
  }
}

/**
 * คอมโพเนนต์สำหรับแสดงหัวข้อส่วน
 */
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-primary">{icon}</div>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );
}

/**
 * คอมโพเนนต์ Skeleton สำหรับโหลดการ์ด
 */
function NovelCardSkeleton() {
  return (
    <div className="animate-pulse h-full">
      <div className="bg-card rounded-xl shadow-md overflow-hidden h-full">
        <div className="aspect-[2/3] w-full bg-secondary"></div>
        <div className="p-3">
          <div className="h-4 bg-secondary rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-secondary rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-secondary rounded w-full mt-4"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * คอมโพเนนต์แสดงกริดนิยาย
 */
function NovelGrid({ novels, isLoading, limit = 6 }: { novels: any[]; isLoading?: boolean; limit?: number }) {
  const displayNovels = novels.slice(0, limit);
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {isLoading ? (
        // แสดง skeleton เมื่อกำลังโหลด
        Array.from({ length: limit }).map((_, i) => (
          <NovelCardSkeleton key={i} />
        ))
      ) : displayNovels.length === 0 ? (
        // แสดงข้อความเมื่อไม่มีนิยาย
        <div className="col-span-full text-center text-muted-foreground py-8">
          ไม่พบนิยายในหมวดนี้
        </div>
      ) : (
        // แสดงการ์ดนิยาย
        displayNovels.map((novel, index) => (
          <NovelCard key={novel._id} novel={novel} priority={index < 2} />
        ))
      )}
    </div>
  );
}

/**
 * คอมโพเนนต์แสดงส่วนพร้อมลิงก์ "ดูทั้งหมด"
 */
function SectionWithViewAll({
  title,
  icon,
  novels,
  viewAllUrl,
  isLoading,
}: {
  title: string;
  icon: React.ReactNode;
  novels: any[];
  viewAllUrl: string;
  isLoading?: boolean;
}) {
  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-5">
        <SectionTitle icon={icon} title={title} />
        <Link
          href={viewAllUrl}
          className="flex items-center gap-1 text-sm text-primary font-medium transition-colors hover:text-primary/80"
        >
          ดูทั้งหมด <FiArrowRight size={16} />
        </Link>
      </div>
      <NovelGrid novels={novels} isLoading={isLoading} />
    </section>
  );
}

/**
 * หน้าแรกของเว็บไซต์
 */
export default async function HomePage() {
  // ดึงข้อมูลนิยายจาก API ตามหมวดหมู่
  const [trendingData, newReleaseData, discountData, completedData] = await Promise.all([
    getNovels("trending"),
    getNovels("published"),
    getNovels("discount"),
    getNovels("completed"),
  ]);

  const trendingNovels = trendingData.novels;
  const newReleaseNovels = newReleaseData.novels;
  const discountNovels = discountData.novels;
  const completedNovels = completedData.novels;

  // ข้อมูลสไลด์โปรโมชั่น
  const featuredSlides = [
    {
      id: "1",
      title: "ACT PHEC",
      description: "ผจญภัยในโลกแฟนตาซีที่เต็มไปด้วยเวทมนตร์และการต่อสู้",
      imageUrl: "/images/slider/slide1.jpg",
      link: "/novels/act-phec",
    },
    {
      id: "2",
      title: "SINISTER",
      description: "สืบสวนคดีสยองขวัญที่จะทำให้คุณนอนไม่หลับ",
      imageUrl: "/images/slider/slide2.jpg",
      link: "/novels/sinister",
    },
    {
      id: "3",
      title: "BLOOD MOON",
      description: "เมื่อพระจันทร์สีเลือดปรากฏ ทุกอย่างจะเปลี่ยนไป",
      imageUrl: "/images/slider/slide3.jpg",
      link: "/novels/blood-moon",
    },
  ];

  return (
    <main className="pb-16">
      {/* ส่วนสไลด์ภาพหน้าแรก */}
      <section className="w-full mb-12">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <ImageSlider slides={featuredSlides} />
        </div>
      </section>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        {/* ส่วนนิยายยอดนิยม */}
        <Suspense
          fallback={
            <SectionWithViewAll
              title="ผลงานยอดนิยม"
              icon={<FiTrendingUp size={20} />}
              novels={[]}
              viewAllUrl="/novels?sort=trending"
              isLoading={true}
            />
          }
        >
          <SectionWithViewAll
            title="ผลงานยอดนิยม"
            icon={<FiTrendingUp size={20} />}
            novels={trendingNovels}
            viewAllUrl="/novels?sort=trending"
          />
        </Suspense>

        {/* ส่วนผลงานอัพเดตล่าสุด */}
        <Suspense
          fallback={
            <SectionWithViewAll
              title="อัพเดตล่าสุด"
              icon={<FiClock size={20} />}
              novels={[]}
              viewAllUrl="/novels?sort=published"
              isLoading={true}
            />
          }
        >
          <SectionWithViewAll
            title="อัพเดตล่าสุด"
            icon={<FiClock size={20} />}
            novels={newReleaseNovels}
            viewAllUrl="/novels?sort=published"
          />
        </Suspense>

        {/* ส่วนส่วนลดพิเศษ */}
        <Suspense
          fallback={
            <SectionWithViewAll
              title="ส่วนลดพิเศษ"
              icon={<FiGift size={20} />}
              novels={[]}
              viewAllUrl="/novels?filter=discount"
              isLoading={true}
            />
          }
        >
          <SectionWithViewAll
            title="ส่วนลดพิเศษ"
            icon={<FiGift size={20} />}
            novels={discountNovels}
            viewAllUrl="/novels?filter=discount"
          />
        </Suspense>

        {/* ส่วนนิยายที่จบแล้ว */}
        <Suspense
          fallback={
            <SectionWithViewAll
              title="จบบริบูรณ์"
              icon={<FiCheck size={20} />}
              novels={[]}
              viewAllUrl="/novels?filter=completed"
              isLoading={true}
            />
          }
        >
          <SectionWithViewAll
            title="จบบริบูรณ์"
            icon={<FiCheck size={20} />}
            novels={completedNovels}
            viewAllUrl="/novels?filter=completed"
          />
        </Suspense>
      </div>
    </main>
  );
}