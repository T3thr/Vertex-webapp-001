// src/app/novels/[slug]/page.tsx
// Dynamic Route Page หลักสำหรับแสดงรายละเอียดนิยาย
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { PopulatedNovelForDetailPage } from "@/app/api/novels/[slug]/route";
import { NovelHeader } from "@/components/novels/NovelHeader";
import { NovelTabs } from "@/components/novels/NovelTabs";

// --- Interface สำหรับ Props ---
interface NovelPageProps {
  params: Promise<{ slug: string }>; // Explicitly type params as a Promise
}

// --- ฟังก์ชัน Fetch ข้อมูลนิยาย ---
async function getNovelData(slug: string): Promise<PopulatedNovelForDetailPage | null> {
  // ใช้ URL เต็ม หรือ NEXT_PUBLIC_API_URL ถ้าตั้งค่าไว้
  const apiUrl = `${
    process.env.NEXT_PUBLIC_API_URL || process.env.VERCEL_URL || "http://localhost:3000"
  }/api/novels/${slug}`;
  console.log(`📄 กำลังดึงข้อมูลนิยายสำหรับ slug "${slug}" จาก: ${apiUrl}`);

  try {
    // ตั้งค่า revalidate เพื่อให้ข้อมูลสดใหม่เป็นระยะๆ
    const res = await fetch(apiUrl, { next: { revalidate: 60 } });

    if (res.status === 404) {
      console.warn(`⚠️ ไม่พบนิยายสำหรับ slug "${slug}" (404)`);
      return null;
    }

    if (!res.ok) {
      throw new Error(`ไม่สามารถดึงข้อมูลนิยายได้: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log(`✅ ดึงข้อมูลนิยายสำเร็จ: "${data.novel.title}"`);
    return data.novel as PopulatedNovelForDetailPage;
  } catch (error: any) {
    console.error(`❌ เกิดข้อผิดพลาดในการดึงข้อมูลนิยายสำหรับ slug "${slug}":`, error.message);
    return null;
  }
}

// --- ฟังก์ชัน Generate Metadata (สำหรับ SEO และ Social Sharing) ---
export async function generateMetadata(
  { params }: NovelPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // รอ params เพื่อให้แน่ใจว่า slug พร้อมใช้งาน
  const { slug } = await params; // Await params to resolve slug
  const novel = await getNovelData(slug);

  if (!novel) {
    return {
      title: "ไม่พบนิยาย",
      description: `ไม่พบข้อมูลนิยายสำหรับ slug: ${slug}`,
    };
  }

  const title = `${novel.title} - NovelMaze`;
  const description =
    novel.description.substring(0, 160) + (novel.description.length > 160 ? "..." : "");
  const imageUrl = novel.coverImage || "/opengraph-image.png";

  // แปลง firstPublishedAt และ updatedAt เป็น Date ถ้าเป็น string
  const firstPublishedAt = novel.firstPublishedAt
    ? typeof novel.firstPublishedAt === "string"
      ? new Date(novel.firstPublishedAt)
      : novel.firstPublishedAt
    : undefined;
  const updatedAt = novel.updatedAt
    ? typeof novel.updatedAt === "string"
      ? new Date(novel.updatedAt)
      : novel.updatedAt
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/novels/${novel.slug}`,
      siteName: "NovelMaze",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `ปกนิยาย ${novel.title}`,
        },
      ],
      locale: "th_TH",
      type: "article",
      tags: novel.tags,
      authors: [
        novel.author?.profile?.displayName || novel.author?.username || "NovelMaze Author",
      ],
      publishedTime: firstPublishedAt?.toISOString(),
      modifiedTime: updatedAt?.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: imageUrl, alt: `ปกนิยาย ${novel.title}` }],
    },
    keywords: novel.tags,
  };
}

// --- Server Component หลักของหน้า ---
export default async function NovelPage({ params }: NovelPageProps) {
  const { slug } = await params; // Await params to resolve slug
  const novel = await getNovelData(slug);

  // ถ้า getNovelData คืนค่า null (ไม่พบข้อมูล หรือเกิด error)
  if (!novel) {
    notFound();
  }

  return (
    <div className="novel-detail-page">
      {/* ส่วน Header (Hero) */}
      <NovelHeader novel={novel} />

      {/* ส่วน Tabs และเนื้อหา */}
      <NovelTabs novel={novel} />
    </div>
  );
}