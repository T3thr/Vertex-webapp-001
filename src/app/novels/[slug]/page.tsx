// src/app/novels/[slug]/page.tsx
// Dynamic Route Page หลักสำหรับแสดงรายละเอียดนิยาย
'use server'; // ระบุว่าเป็น Server Component

import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
// Import interface จาก API route ที่เราอัปเดตไปแล้ว
import { PopulatedNovelForDetailPage } from "@/app/api/novels/[slug]/route"; // ใช้ชื่อ interface ที่ถูกต้องตาม API
import { NovelHeader } from "@/components/novels/NovelHeader";
import { NovelTabs } from "@/components/novels/NovelTabs";
// (อาจจะเพิ่ม) Component สำหรับแสดง Character List โดยเฉพาะ
// import { NovelCharactersSection } from "@/components/novels/NovelCharactersSection";

// --- Interface สำหรับ Props ---
interface NovelPageProps {
  params: Promise<{ slug: string }>; // params ใน Next.js 15+ เป็น Promise
}

// --- ฟังก์ชัน Fetch ข้อมูลนิยาย ---
async function getNovelData(slug: string): Promise<PopulatedNovelForDetailPage | null> {
  let baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      baseUrl = "http://localhost:3000"; // Fallback สำหรับ local development
    }
  }
  const apiUrl = `${baseUrl}/api/novels/${encodeURIComponent(slug)}`; // Encode slug เสมอ
  console.log(`📄 [page.tsx] กำลังดึงข้อมูลนิยายสำหรับ slug "${slug}" จาก: ${apiUrl}`);

  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 } // Revalidate ทุก 60 วินาที
    });

    if (res.status === 404) {
      console.warn(`⚠️ [page.tsx] ไม่พบนิยายสำหรับ slug "${slug}" (404 จาก API: ${apiUrl})`);
      return null; // คืนค่า null เมื่อ API ตอบกลับด้วย 404
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ [page.tsx] ไม่สามารถดึงข้อมูลนิยายได้จาก ${apiUrl}: ${res.status} ${res.statusText}. Body: ${errorText}`);
      // สร้าง Error ที่มีข้อมูล status เพื่อให้ Next.js error boundary (error.tsx) ทำงาน
      const error = new Error(`API request failed with status ${res.status}: ${res.statusText}`);
      (error as any).status = res.status;
      throw error;
    }

    const data = await res.json();
    if (!data.novel) {
      console.warn(`⚠️ [page.tsx] API ตอบกลับสำเร็จ แต่ไม่พบ data.novel สำหรับ slug "${slug}" จาก: ${apiUrl}`);
      return null; // คืนค่า null ถ้า data.novel ไม่มีอยู่
    }

    console.log(`✅ [page.tsx] ดึงข้อมูลนิยายสำเร็จ: "${data.novel.title}"`);
    return data.novel as PopulatedNovelForDetailPage;
  } catch (error: any) {
    console.error(`❌ [page.tsx] เกิดข้อผิดพลาดในการดึงข้อมูลนิยายสำหรับ slug "${slug}" จาก ${apiUrl}:`, error.message, error.stack);
    // ถ้า error มี status (เช่น จาก res.ok = false ที่ throw error ออกมา) ให้ re-throw
    if (error.status) {
      throw error;
    }
    // สำหรับ error อื่นๆ (เช่น network error, JSON parse error จาก try-catch นอก) ให้คืน null เพื่อให้ notFound() ทำงาน
    return null;
  }
}

// --- ฟังก์ชัน Generate Metadata (สำหรับ SEO และ Social Sharing) ---
export async function generateMetadata(
  { params }: NovelPageProps, // ใช้ interface เดียวกับ component หลัก
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params; // รอให้ params ถูก resolve
  const novel = await getNovelData(slug);

  if (!novel) {
    return {
      title: "ไม่พบนิยาย - NovelMaze",
      description: `ขออภัย ไม่พบข้อมูลนิยายที่คุณกำลังค้นหา (slug: ${slug})`,
    };
  }

  const siteName = "NovelMaze";
  const pageTitle = `${novel.title} - ${siteName}`;
  const description = novel.synopsis
    ? novel.synopsis.substring(0, 160) + (novel.synopsis.length > 160 ? "..." : "")
    : `อ่านนิยาย ${novel.title} เขียนโดย ${novel.author?.profile?.penName || novel.author?.profile?.displayName || novel.author?.username || ''} ได้ที่ ${siteName}`;

  let imageUrl = novel.coverImageUrl || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/opengraph-image.png`;
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  } else if (!imageUrl) {
      imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/opengraph-image.png`;
  }

  const publishedTime = novel.firstPublishedAt ? new Date(novel.firstPublishedAt).toISOString() : undefined;
  const modifiedTime = novel.updatedAt ? new Date(novel.updatedAt).toISOString() : undefined;

  return {
    title: pageTitle,
    description: description,
    keywords: novel.customTags || [],
    authors: [{ name: novel.author?.profile?.penName || novel.author?.profile?.displayName || novel.author?.username || "NovelMaze Author" }],
    alternates: {
      canonical: `/novels/${novel.slug}`,
    },
    openGraph: {
      title: pageTitle,
      description: description,
      url: `/novels/${novel.slug}`,
      siteName: siteName,
      images: imageUrl ? [{
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `ปกนิยายเรื่อง ${novel.title}`,
        }] : [],
      locale: "th_TH",
      type: "article",
      tags: novel.customTags || [],
      publishedTime: publishedTime,
      modifiedTime: modifiedTime,
      section: novel.mainThemeCategory?.name,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: description,
      images: imageUrl ? [{ url: imageUrl, alt: `ปกนิยายเรื่อง ${novel.title}` }] : [],
    },
  };
}

// --- Server Component หลักของหน้า ---
export default async function NovelPage({ params }: NovelPageProps) {
  const { slug } = await params; // รอให้ params ถูก resolve
  const novel = await getNovelData(slug);

  if (!novel) {
    notFound(); // เรียก notFound() ถ้า getNovelData คืนค่า null
  }

  return (
    <div className="novel-detail-page container-custom mx-auto px-2 sm:px-4 py-6 md:py-8">
      <NovelHeader novel={novel} />
      <NovelTabs novel={novel} />
      {/*
        (อาจจะเพิ่ม) ส่วนแสดงรายชื่อตัวละคร
        ถ้า charactersList มีข้อมูลและต้องการแสดงในส่วนแยก
        {novel.charactersList && novel.charactersList.length > 0 && (
          <NovelCharactersSection characters={novel.charactersList} />
        )}
      */}
    </div>
  );
}
