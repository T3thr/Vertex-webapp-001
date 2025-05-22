// src/app/novels/[slug]/page.tsx
// Dynamic Route Page หลักสำหรับแสดงรายละเอียดนิยาย
'use server'; // ระบุว่าเป็น Server Component

import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
// Import interface จาก API route ที่เราอัปเดตไปแล้ว
import { PopulatedNovelForDetailPage } from "@/app/api/novels/[slug]/route";
import { NovelHeader } from "@/components/novels/NovelHeader";
import { NovelTabs } from "@/components/novels/NovelTabs";

// --- Interface สำหรับ Props ---
interface NovelPageProps {
  params: Promise<{ slug: string }>; // params ถูกกำหนดให้เป็น Promise ตามโค้ดเดิม
}

// --- ฟังก์ชัน Fetch ข้อมูลนิยาย ---
async function getNovelData(slug: string): Promise<PopulatedNovelForDetailPage | null> {
  let baseUrl = process.env.NEXT_PUBLIC_API_URL; // ใช้ค่าจาก NEXT_PUBLIC_API_URL ถ้ามี
  if (!baseUrl) {
    // ถ้าไม่มี ให้ตรวจสอบ VERCEL_URL (สำหรับ Vercel deployment)
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`; // VERCEL_URL ไม่ได้ใส่ https มาให้
    } else {
      // ถ้าเป็นการรัน local หรือไม่พบ VERCEL_URL ให้ใช้ localhost
      baseUrl = "http://localhost:3000";
    }
  }
  const apiUrl = `${baseUrl}/api/novels/${slug}`;
  console.log(`📄 กำลังดึงข้อมูลนิยายสำหรับ slug "${slug}" จาก: ${apiUrl}`);

  try {
    // ตั้งค่า revalidate เพื่อให้ข้อมูลสดใหม่เป็นระยะๆ (เช่น ทุก 60 วินาที)
    const res = await fetch(apiUrl, { next: { revalidate: 60 } });

    if (res.status === 404) {
      console.warn(`⚠️ ไม่พบนิยายสำหรับ slug "${slug}" (404 จาก API: ${apiUrl})`);
      return null; // คืนค่า null เมื่อ API ตอบกลับด้วย 404
    }

    if (!res.ok) {
      // ถ้า response ไม่ใช่ 2xx ให้ throw error พร้อม status
      const errorText = await res.text(); // พยายามอ่าน error message จาก response body
      console.error(`❌ ไม่สามารถดึงข้อมูลนิยายได้จาก ${apiUrl}: ${res.status} ${res.statusText}. Body: ${errorText}`);
      throw new Error(`ไม่สามารถดึงข้อมูลนิยายได้: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    // ตรวจสอบว่า data.novel มีอยู่จริงก่อน return
    if (!data.novel) {
        console.warn(`⚠️ API ตอบกลับสำเร็จ แต่ไม่พบ data.novel สำหรับ slug "${slug}" จาก: ${apiUrl}`);
        return null;
    }

    console.log(`✅ ดึงข้อมูลนิยายสำเร็จ: "${data.novel.title}"`);
    // ทำ type assertion เนื่องจากเราคาดหวังโครงสร้างนี้จาก API endpoint ของเรา
    return data.novel as PopulatedNovelForDetailPage;
  } catch (error: any) {
    console.error(`❌ เกิดข้อผิดพลาดในการดึงข้อมูลนิยายสำหรับ slug "${slug}" จาก ${apiUrl}:`, error.message, error.stack);
    return null; // คืนค่า null เมื่อเกิดข้อผิดพลาดอื่นๆ
  }
}

// --- ฟังก์ชัน Generate Metadata (สำหรับ SEO และ Social Sharing) ---
export async function generateMetadata(
  { params }: NovelPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params; // Await params เพื่อให้ได้ slug
  const novel = await getNovelData(slug);

  if (!novel) {
    // ถ้าไม่พบนิยาย ให้ return metadata สำหรับหน้า 404
    return {
      title: "ไม่พบนิยาย - NovelMaze",
      description: `ขออภัย ไม่พบข้อมูลนิยายที่คุณกำลังค้นหา (slug: ${slug})`,
    };
  }

  const siteName = "NovelMaze"; // ชื่อเว็บไซต์ของคุณ
  const pageTitle = `${novel.title} - ${siteName}`;
  // ใช้ synopsis สำหรับ description สั้นๆ (จำกัด 160 ตัวอักษร)
  const description = novel.synopsis
    ? novel.synopsis.substring(0, 160) + (novel.synopsis.length > 160 ? "..." : "")
    : `อ่านนิยาย ${novel.title} เขียนโดย ${novel.author?.profile?.displayName || novel.author?.username || ''} ได้ที่ ${siteName}`;

  // ใช้ coverImageUrl หรือ fallback image
  const imageUrl = novel.coverImageUrl || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/opengraph-image.png`; // ควรมี NEXT_PUBLIC_BASE_URL

  // PopulatedNovelForDetailPage ควรจะให้ firstPublishedAt และ updatedAt เป็น Date object หรือ null แล้ว
  // ไม่จำเป็นต้องแปลงซ้ำถ้า API response ถูกต้อง
  const publishedTime = novel.publishedAt?.toISOString(); // ใช้ publishedAt ของนิยาย
  const modifiedTime = novel.updatedAt.toISOString(); // updatedAt ควรเป็น Date object จาก API

  return {
    title: pageTitle,
    description: description,
    keywords: novel.customTags || [], // ใช้ customTags แทน tags
    authors: [{ name: novel.author?.profile?.displayName || novel.author?.username || "NovelMaze Author" }],
    alternates: { // เพิ่ม canonical URL
      canonical: `/novels/${novel.slug}`,
    },
    openGraph: {
      title: pageTitle,
      description: description,
      url: `/novels/${novel.slug}`, // URL ของหน้านิยายนี้
      siteName: siteName,
      images: [
        {
          url: imageUrl,
          width: 1200, // ขนาดที่แนะนำสำหรับ Open Graph
          height: 630,
          alt: `ปกนิยายเรื่อง ${novel.title}`,
        },
      ],
      locale: "th_TH", // ภาษาและภูมิภาค
      type: "article", // ประเภทเนื้อหา
      tags: novel.customTags || [], // ใช้ customTags
      // authors: [novel.author?.profile?.displayName || novel.author?.username || "NovelMaze Author"], // OpenGraph แนะนำให้ใช้ profile URL ถ้ามี
      publishedTime: publishedTime,
      modifiedTime: modifiedTime,
      section: novel.mainThemeCategory?.name, // หมวดหมู่หลักของนิยาย
    },
    twitter: {
      card: "summary_large_image", // ประเภทการ์ด Twitter
      title: pageTitle,
      description: description,
      images: [{ url: imageUrl, alt: `ปกนิยายเรื่อง ${novel.title}` }],
      // site: "@YourTwitterHandle", // Twitter handle ของเว็บไซต์ (ถ้ามี)
      // creator: "@AuthorTwitterHandle", // Twitter handle ของผู้เขียน (ถ้ามี)
    },
    // เพิ่มเติม: Schema.org JSON-LD (แนะนำสำหรับ SEO ขั้นสูง)
    // manifest: "/manifest.json" // ถ้ามี Progressive Web App
  };
}

// --- Server Component หลักของหน้า ---
export default async function NovelPage({ params }: NovelPageProps) {
  const { slug } = await params; // Await params เพื่อให้ได้ slug
  const novel = await getNovelData(slug);

  // ถ้า getNovelData คืนค่า null (ไม่พบข้อมูล หรือเกิด error)
  if (!novel) {
    notFound(); // แสดงหน้า 404 มาตรฐานของ Next.js
  }

  return (
    <div className="novel-detail-page container mx-auto px-4 py-8"> {/* เพิ่ม layout พื้นฐาน */}
      {/* ส่วน Header (Hero Section) ของนิยาย */}
      <NovelHeader novel={novel} /> {/* ส่ง props novel ที่มี type PopulatedNovelForDetailPage */}

      {/* ส่วน Tabs และเนื้อหาต่างๆ ของนิยาย (เรื่องย่อ, ตอน, รีวิว ฯลฯ) */}
      <NovelTabs novel={novel} /> {/* ส่ง props novel ที่มี type PopulatedNovelForDetailPage */}
    </div>
  );
}