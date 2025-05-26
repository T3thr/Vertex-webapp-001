// src/app/novels/[slug]/page.tsx
'use server'; // ระบุว่าเป็น Server Component

import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { PopulatedNovelForDetailPage } from "@/app/api/novels/[slug]/route";
import NovelHeader from "@/components/novels/NovelHeader";
import NovelTabs from "@/components/novels/NovelTabs";

interface NovelPageProps {
  params: Promise<{ slug: string }>; // ปรับให้ params เป็น Promise ตาม Next.js App Router 2025
}

/**
 * ดึงข้อมูลนิยายจาก API ตาม slug
 * @param slug Slug ของนิยาย
 * @returns Promise<PopulatedNovelForDetailPage | null> ข้อมูลนิยายหรือ null หากไม่พบ
 */
async function getNovelData(slug: string): Promise<PopulatedNovelForDetailPage | null> {
  if (typeof slug !== 'string' || !slug.trim()) {
    console.warn(`⚠️ [page.tsx getNovelData] Slug ไม่ถูกต้อง: "${slug}"`);
    return null;
  }

  // กำหนด base URL สำหรับเรียก API
  let baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.NODE_ENV === 'development') {
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    } else {
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
      if (!baseUrl) {
        console.error("❌ [page.tsx getNovelData] NEXT_PUBLIC_BASE_URL ไม่ได้ตั้งค่าสำหรับ production");
        return null;
      }
    }
  }

  const apiUrl = `${baseUrl}/api/novels/${encodeURIComponent(slug.trim())}`;
  console.log(`📡 [page.tsx getNovelData] เรียก API สำหรับ slug "${slug}": ${apiUrl}`);

  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 } // Revalidate ทุก 60 วินาทีใน production
    });

    if (res.status === 404) {
      console.warn(`⚠️ [page.tsx getNovelData] ไม่พบนิยายสำหรับ slug "${slug}" (404 จาก API)`);
      return null;
    }

    if (!res.ok) {
      let errorBody = "ไม่สามารถอ่าน error body ได้";
      try {
        errorBody = await res.text();
      } catch (e) { /* ละเว้น */ }
      console.error(`❌ [page.tsx getNovelData] ไม่สามารถดึงข้อมูลจาก ${apiUrl}: ${res.status} ${res.statusText}. Body: ${errorBody}`);
      return null;
    }

    const data = await res.json();

    if (!data?.novel) {
      console.warn(`⚠️ [page.tsx getNovelData] API ตอบกลับสำเร็จแต่ไม่มี data.novel สำหรับ slug "${slug}"`);
      return null;
    }

    console.log(`✅ [page.tsx getNovelData] ดึงข้อมูลนิยายสำเร็จ: "${data.novel.title}" (ID: ${data.novel._id})`);
    return data.novel as PopulatedNovelForDetailPage;

  } catch (error: any) {
    console.error(`❌ [page.tsx getNovelData] ข้อผิดพลาดในการดึงข้อมูลนิยายสำหรับ slug "${slug}": ${error.message}`);
    return null;
  }
}

/**
 * สร้าง metadata สำหรับหน้ารายละเอียดนิยาย
 * @param props NovelPageProps
 * @param parent ResolvingMetadata
 * @returns Promise<Metadata> ข้อมูล metadata สำหรับ SEO
 */
export async function generateMetadata(
  { params }: NovelPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params; // Resolve Promise จาก params
  if (typeof slug !== 'string' || !slug.trim()) {
    console.warn(`⚠️ [generateMetadata] Slug ไม่ถูกต้อง: "${slug}"`);
    return {
      title: "ข้อมูลไม่ถูกต้อง - NovelMaze",
      description: "ไม่สามารถโหลดข้อมูลสำหรับเนื้อหานี้ได้เนื่องจาก slug ไม่ถูกต้อง",
      robots: { index: false, follow: false }
    };
  }

  const novel = await getNovelData(slug.trim());

  if (!novel) {
    return {
      title: "ไม่พบนิยาย - NovelMaze",
      description: `ขออภัย ไม่พบข้อมูลนิยายที่คุณกำลังค้นหา (slug: ${slug})`,
      robots: { index: false, follow: false }
    };
  }

  const siteName = (await parent).openGraph?.siteName || process.env.NEXT_PUBLIC_SITE_NAME || "NovelMaze";
  const authorName = novel.author?.profile?.penName || novel.author?.profile?.displayName || novel.author?.username || 'ผู้เขียนนิรนาม';
  const pageTitle = `${novel.title} - โดย ${authorName} | ${siteName}`;
  const description = novel.synopsis
    ? novel.synopsis.substring(0, 160).trim() + (novel.synopsis.length > 160 ? "..." : "")
    : `อ่านนิยาย "${novel.title}" เขียนโดย ${authorName} บน ${siteName} แพลตฟอร์ม Visual Novel และนิยายออนไลน์หลากหลายแนว`;

  // กำหนด base URL สำหรับรูปภาพ
  let baseUrlForImage = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrlForImage) {
    baseUrlForImage = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  }

  let imageUrl = novel.coverImageUrl;
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
    imageUrl = `${baseUrlForImage}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  } else if (!imageUrl) {
    imageUrl = `${baseUrlForImage}/images/default-og-image.png`;
  }

  const publishedTime = novel.publishedAt ? new Date(novel.publishedAt).toISOString() : undefined;
  const modifiedTime = novel.lastContentUpdatedAt ? new Date(novel.lastContentUpdatedAt).toISOString() : (novel.updatedAt ? new Date(novel.updatedAt).toISOString() : undefined);

  // สร้าง keywords จากข้อมูลนิยาย
  const keywordsSet = new Set<string>();
  novel.themeAssignment?.customTags?.forEach((tag: string) => keywordsSet.add(tag.trim()));
  if (novel.themeAssignment?.mainTheme?.categoryId?.name) keywordsSet.add(novel.themeAssignment.mainTheme.categoryId.name.trim());
  novel.themeAssignment?.subThemes?.forEach((st) => { if (st?.categoryId?.name) keywordsSet.add(st.categoryId.name.trim()); });
  novel.themeAssignment?.moodAndTone?.forEach((mt) => { if (mt?.name) keywordsSet.add(mt.name.trim()); });
  if (novel.language?.name) keywordsSet.add(novel.language.name.trim());
  keywordsSet.add("visual novel");
  keywordsSet.add("นิยาย");
  keywordsSet.add(authorName);
  keywordsSet.add(novel.title);

  return {
    metadataBase: new URL(baseUrlForImage),
    title: pageTitle,
    description: description,
    keywords: Array.from(keywordsSet).filter(Boolean),
    authors: [{ name: authorName, url: novel.author?.username ? `${baseUrlForImage}/u/${novel.author.username}` : undefined }],
    alternates: {
      canonical: `/novels/${novel.slug}`,
    },
    openGraph: {
      title: pageTitle,
      description: description,
      url: `${baseUrlForImage}/novels/${novel.slug}`,
      siteName: siteName,
      images: imageUrl ? [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: `ปกนิยายเรื่อง ${novel.title}`,
      }] : [],
      locale: novel.language?.slug?.startsWith('th') ? "th_TH" : (novel.language?.slug?.startsWith('en') ? "en_US" : undefined),
      type: "article",
      tags: novel.themeAssignment?.customTags || [],
      publishedTime: publishedTime,
      modifiedTime: modifiedTime,
      section: novel.themeAssignment?.mainTheme?.categoryId?.name,
      authors: novel.author?.username ? [`${baseUrlForImage}/u/${novel.author.username}`] : [authorName],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: description,
      images: imageUrl ? [{ url: imageUrl, alt: `ปกนิยายเรื่อง ${novel.title}` }] : [],
    },
  };
}

/**
 * หน้ารายละเอียดนิยาย
 * @param props NovelPageProps
 * @returns JSX.Element หน้าสำหรับแสดงรายละเอียดนิยาย
 */
export default async function NovelPage({ params }: NovelPageProps) {
  const { slug } = await params; // Resolve Promise จาก params
  if (typeof slug !== 'string' || !slug.trim()) {
    console.warn(`⚠️ [NovelPage] Slug ไม่ถูกต้อง: "${slug}"`);
    notFound();
  }

  const novel = await getNovelData(slug.trim());

  if (!novel) {
    console.log(`⚠️ [NovelPage] ไม่พบข้อมูลนิยายสำหรับ slug "${slug}"`);
    notFound();
  }

  return (
    <div className="novel-detail-page-container bg-background text-foreground min-h-screen">
      <NovelHeader novel={novel} />
      <main className="container-custom mx-auto px-2 sm:px-4 py-6 md:py-8">
        <NovelTabs novel={novel} />
      </main>
    </div>
  );
}