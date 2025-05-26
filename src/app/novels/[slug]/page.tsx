// src/app/novels/[slug]/page.tsx
// Dynamic Route Page หลักสำหรับแสดงรายละเอียดนิยาย
'use server'; // ระบุว่าเป็น Server Component

import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
// PopulatedNovelForDetailPage ต้อง export จาก API route หรือย้ายไปไฟล์ shared types
// หาก API route file ถูกย้ายหรือเปลี่ยนชื่อ, path นี้ต้องอัปเดต
import { PopulatedNovelForDetailPage } from "@/app/api/novels/[slug]/route";
import { NovelHeader } from "@/components/novels/NovelHeader";
import { NovelTabs } from "@/components/novels/NovelTabs";
// import { NovelCharactersSection } from "@/components/novels/NovelCharactersSection";

// --- Interface สำหรับ Props ---
interface NovelPageProps {
  params: { slug: string };
}

// --- ฟังก์ชัน Fetch ข้อมูลนิยาย ---
async function getNovelData(slug: string): Promise<PopulatedNovelForDetailPage | null> {
  // ตรวจสอบว่า slug เป็น string และไม่
  if (typeof slug !== 'string' || !slug.trim()) {
    console.warn(`⚠️ [page.tsx getNovelData] Invalid slug provided: "${slug}"`);
    return null;
  }

  let baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      // NEXT_PUBLIC_BASE_URL มักใช้สำหรับ client-side, สำหรับ server-side fetch, localhost มักจะถูกต้อง
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    }
  }
  const apiUrl = `${baseUrl}/api/novels/${encodeURIComponent(slug)}`;
  console.log(`📄 [page.tsx getNovelData] กำลังดึงข้อมูลนิยายสำหรับ slug "${slug}" จาก: ${apiUrl}`);

  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // อาจเพิ่ม 'Accept': 'application/json' เพื่อความชัดเจน
      },
      // cache: 'no-store', // หากต้องการข้อมูลล่าสุดเสมอ (สำหรับการทดสอบ)
      next: { revalidate: 60 } // Revalidate ทุก 60 วินาที (ISR)
    });

    if (res.status === 404) {
      console.warn(`⚠️ [page.tsx getNovelData] ไม่พบนิยายสำหรับ slug "${slug}" (404 จาก API: ${apiUrl})`);
      return null; // จะทำให้ notFound() ทำงาน
    }

    if (!res.ok) {
      let errorBody = "Could not read error body";
      try {
        errorBody = await res.text();
      } catch (e) { /* ignore */ }
      console.error(`❌ [page.tsx getNovelData] ไม่สามารถดึงข้อมูลนิยายได้จาก ${apiUrl}: ${res.status} ${res.statusText}. Body: ${errorBody}`);
      // สร้าง Error object เพื่อให้ error boundary (error.tsx) สามารถจัดการได้
      // การ throw error ที่นี่จะถูกจับโดย Next.js error handling
      const error = new Error(`API request failed: ${res.status} ${res.statusText}. URL: ${apiUrl}. Details: ${errorBody}`);
      (error as any).status = res.status;
      throw error;
    }

    const data = await res.json();

    // ตรวจสอบโครงสร้าง data ที่ API ส่งกลับมา
    if (!data || !data.novel) {
      console.warn(`⚠️ [page.tsx getNovelData] API ตอบกลับสำเร็จ แต่ไม่พบ data.novel สำหรับ slug "${slug}" จาก: ${apiUrl}. Response:`, data);
      return null; // จะทำให้ notFound() ทำงาน
    }

    console.log(`✅ [page.tsx getNovelData] ดึงข้อมูลนิยายสำเร็จ: "${data.novel.title}"`);
    return data.novel as PopulatedNovelForDetailPage;
  } catch (error: any) {
    // Log error ที่เกิดขึ้น ไม่ว่าจะเป็น network error, JSON parse error, หรือ error ที่ throw จาก !res.ok
    console.error(`❌ [page.tsx getNovelData] เกิดข้อผิดพลาดในการดึงข้อมูลนิยายสำหรับ slug "${slug}" จาก ${apiUrl}:`, error.message, error.stack);

    // ถ้า error มี status (เช่น มาจาก !res.ok) ให้ re-throw เพื่อให้ error.tsx จัดการ
    if (error.status) {
        throw error;
    }
    // สำหรับ network errors หรือ JSON parsing errors ที่ไม่มี status, ให้คืน null เพื่อให้ notFound() ทำงาน
    return null;
  }
}

// --- ฟังก์ชัน Generate Metadata (สำหรับ SEO และ Social Sharing) ---
export async function generateMetadata(
  { params }: NovelPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = params; // เข้าถึง slug โดยตรง
  if (typeof slug !== 'string' || !slug.trim()) {
    console.warn(`⚠️ [generateMetadata] Invalid slug for metadata: "${slug}"`);
    return {
      title: "ข้อมูลไม่ถูกต้อง - NovelMaze",
      description: "ไม่สามารถโหลดข้อมูลสำหรับเนื้อหานี้ได้เนื่องจาก slug ไม่ถูกต้อง",
    };
  }
  const novel = await getNovelData(slug);

  if (!novel) {
    return {
      title: "ไม่พบนิยาย - NovelMaze",
      description: `ขออภัย ไม่พบข้อมูลนิยายที่คุณกำลังค้นหา (slug: ${slug})`,
    };
  }

  const siteName = (await parent).openGraph?.siteName || process.env.NEXT_PUBLIC_SITE_NAME || "NovelMaze";
  const pageTitle = `${novel.title} - โดย ${novel.author?.profile?.penName || novel.author?.profile?.displayName || novel.author?.username || 'ผู้เขียน'} | ${siteName}`;
  const description = novel.synopsis
    ? novel.synopsis.substring(0, 160) + (novel.synopsis.length > 160 ? "..." : "")
    : `อ่านนิยาย ${novel.title} เขียนโดย ${novel.author?.profile?.penName || novel.author?.profile?.displayName || novel.author?.username || ''} บนแพลตฟอร์ม ${siteName} ที่รวบรวม Visual Novel และนิยายหลากหลายแนว`;

  let imageUrl = novel.coverImageUrl;
  // ใช้ NEXT_PUBLIC_BASE_URL เพื่อสร้าง absolute URL สำหรับรูปภาพ
  const baseUrlForImage = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
    imageUrl = `${baseUrlForImage}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  } else if (!imageUrl) {
    // ควรมี default opengraph image ใน public folder
    imageUrl = `${baseUrlForImage}/default-og-image.png`;
  }


  const publishedTime = novel.firstPublishedAt ? new Date(novel.firstPublishedAt).toISOString() : undefined;
  const modifiedTime = novel.lastContentUpdatedAt ? new Date(novel.lastContentUpdatedAt).toISOString() : (novel.updatedAt ? new Date(novel.updatedAt).toISOString() : undefined);

  const keywordsSet = new Set<string>();
  novel.customTags?.forEach((tag: string) => keywordsSet.add(tag));
  if (novel.mainThemeCategory?.name) keywordsSet.add(novel.mainThemeCategory.name);
  novel.subThemeCategories?.forEach(st => { if (st.name) keywordsSet.add(st.name); });
  novel.moodAndToneCategories?.forEach(mt => { if (mt.name) keywordsSet.add(mt.name); });


  return {
    metadataBase: new URL(baseUrlForImage), // เพิ่ม metadataBase
    title: pageTitle,
    description: description,
    keywords: Array.from(keywordsSet),
    authors: [{ name: novel.author?.profile?.penName || novel.author?.profile?.displayName || novel.author?.username || "NovelMaze Author" }],
    alternates: {
      canonical: `/novels/${novel.slug}`,
    },
    openGraph: {
      title: pageTitle,
      description: description,
      url: `/novels/${novel.slug}`, // ควรเป็น absolute URL หรือ Next.js จะจัดการให้ถ้ามี metadataBase
      siteName: siteName,
      images: imageUrl ? [{
          url: imageUrl, // ควรเป็น absolute URL
          width: 1200,
          height: 630,
          alt: `ปกนิยายเรื่อง ${novel.title}`,
        }] : [],
      locale: novel.languageCategory?.slug?.startsWith('th') ? "th_TH" : "en_US", // ปรับปรุง logic การเลือก locale
      type: "article", // หรือ "book"
      tags: novel.customTags || [],
      publishedTime: publishedTime,
      modifiedTime: modifiedTime,
      section: novel.mainThemeCategory?.name,
      authors: novel.author?.profile?.penName ? [novel.author.profile.penName] : (novel.author?.profile?.displayName ? [novel.author.profile.displayName] : undefined),
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: description,
      images: imageUrl ? [{ url: imageUrl, alt: `ปกนิยายเรื่อง ${novel.title}` }] : [],
      // site: "@YourTwitterHandle",
      // creator: novel.author?.twitterHandle ? novel.author.twitterHandle : undefined,
    },
  };
}

// --- Server Component หลักของหน้า ---
export default async function NovelPage({ params }: NovelPageProps) {
  const { slug } = params;
  const novel = await getNovelData(slug);

  if (!novel) {
    console.log(`[NovelPage] Novel data for slug "${slug}" is null, calling notFound().`);
    notFound();
  }

  return (
    <div className="novel-detail-page container-custom mx-auto px-2 sm:px-4 py-6 md:py-8">
      <NovelHeader novel={novel} />
      <NovelTabs novel={novel} />
      {/*
        {novel.charactersList && novel.charactersList.length > 0 && (
          <NovelCharactersSection characters={novel.charactersList} />
        )}
      */}
    </div>
  );
}