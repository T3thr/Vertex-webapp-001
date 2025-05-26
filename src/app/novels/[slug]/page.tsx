// src/app/novels/[slug]/page.tsx
'use server';

import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { PopulatedNovelForDetailPage } from "@/app/api/novels/[slug]/route"; 
import { NovelHeader } from "@/components/novels/NovelHeader";
import { NovelTabs } from "@/components/novels/NovelTabs";
// NovelCharactersSection is now rendered inside NovelTabs, so direct import might not be needed here
// import { NovelCharactersSection } from "@/components/novels/NovelCharactersSection";

interface NovelPageProps {
  params: { slug: string };
}

async function getNovelData(slug: string): Promise<PopulatedNovelForDetailPage | null> {
  if (typeof slug !== 'string' || !slug.trim()) {
    console.warn(`⚠️ [page.tsx getNovelData] Invalid slug provided: "${slug}"`);
    return null;
  }

  let baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.NODE_ENV === 'development') {
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    } else {
      // Fallback for production if VERCEL_URL is not set (e.g. self-hosted Next.js)
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""; // Ensure this is set for production
      if (!baseUrl) {
        console.error("❌ CRITICAL: NEXT_PUBLIC_BASE_URL is not set for production API calls.");
        // Potentially return null or throw an error to prevent calls to "undefined/api..."
        return null;
      }
    }
  }
  const apiUrl = `${baseUrl}/api/novels/${encodeURIComponent(slug.trim())}`;
  console.log(`📄 [page.tsx getNovelData] กำลังดึงข้อมูลนิยายสำหรับ slug "${slug}" จาก: ${apiUrl}`);

  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // cache: 'no-store', // For development: to ensure fresh data
      next: { revalidate: 60 } // For production: Revalidate every 60 seconds
    });

    if (res.status === 404) {
      console.warn(`⚠️ [page.tsx getNovelData] ไม่พบนิยายสำหรับ slug "${slug}" (404 จาก API: ${apiUrl})`);
      return null;
    }

    if (!res.ok) {
      let errorBody = "Could not read error body";
      try {
        errorBody = await res.text();
      } catch (e) { /* ignore */ }
      console.error(`❌ [page.tsx getNovelData] ไม่สามารถดึงข้อมูลนิยายได้จาก ${apiUrl}: ${res.status} ${res.statusText}. Body: ${errorBody}`);
      // Throw an error that can be caught by Next.js error handling or a try-catch block higher up
      // For server components, throwing an error might lead to an error page.
      // Returning null here will lead to notFound() in the page component.
      return null; // Or throw new Error(...)
    }

    const data = await res.json();

    if (!data || !data.novel) {
      console.warn(`⚠️ [page.tsx getNovelData] API ตอบกลับสำเร็จ แต่ไม่พบ data.novel สำหรับ slug "${slug}" จาก: ${apiUrl}. Response:`, JSON.stringify(data).substring(0, 500));
      return null;
    }

    console.log(`✅ [page.tsx getNovelData] ดึงข้อมูลนิยายสำเร็จ: "${data.novel.title}" (ID: ${data.novel._id})`);
    return data.novel as PopulatedNovelForDetailPage;

  } catch (error: any) {
    console.error(`❌ [page.tsx getNovelData] เกิดข้อผิดพลาดในการดึงข้อมูลนิยายสำหรับ slug "${slug}" จาก ${apiUrl}:`, error.message, error.stack ? error.stack.substring(0,500) : '');
    // For server components, re-throwing or returning null will trigger appropriate Next.js behavior (error page or notFound).
    return null; // This will lead to notFound()
  }
}

export async function generateMetadata(
  { params }: NovelPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const slug = await params.slug; // No need for await params
  if (typeof slug !== 'string' || !slug.trim()) {
    console.warn(`⚠️ [generateMetadata] Invalid slug for metadata: "${slug}"`);
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
      robots: { index: false, follow: false } // Important for SEO
    };
  }

  const siteName = (await parent).openGraph?.siteName || process.env.NEXT_PUBLIC_SITE_NAME || "NovelMaze";
  const authorName = novel.author?.profile?.penName || novel.author?.profile?.displayName || novel.author?.username || 'ผู้เขียนนิรนาม';
  const pageTitle = `${novel.title} - โดย ${authorName} | ${siteName}`;
  const description = novel.synopsis
    ? novel.synopsis.substring(0, 160).trim() + (novel.synopsis.length > 160 ? "..." : "")
    : `อ่านนิยาย "${novel.title}" เขียนโดย ${authorName} บน ${siteName} แพลตฟอร์ม Visual Novel และนิยายออนไลน์หลากหลายแนว`;

  // Determine base URL for images carefully
  let baseUrlForImage = process.env.NEXT_PUBLIC_BASE_URL; // Preferred for explicit control
  if (!baseUrlForImage) {
    baseUrlForImage = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  }
  
  let imageUrl = novel.coverImageUrl;
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
    imageUrl = `${baseUrlForImage}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  } else if (!imageUrl) {
    imageUrl = `${baseUrlForImage}/images/default-og-image.png`; // Ensure this default image exists
  }

  const publishedTime = novel.publishedAt ? new Date(novel.publishedAt).toISOString() : undefined;
  const modifiedTime = novel.lastContentUpdatedAt ? new Date(novel.lastContentUpdatedAt).toISOString() : (novel.updatedAt ? new Date(novel.updatedAt).toISOString() : undefined);

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
    metadataBase: new URL(baseUrlForImage), // Important for resolving relative image URLs
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
      url: `${baseUrlForImage}/novels/${novel.slug}`, // Use absolute URL
      siteName: siteName,
      images: imageUrl ? [{
          url: imageUrl, // Should be absolute URL or Next.js will resolve it with metadataBase
          width: 1200,
          height: 630,
          alt: `ปกนิยายเรื่อง ${novel.title}`,
        }] : [],
      locale: novel.language?.slug?.startsWith('th') ? "th_TH" : (novel.language?.slug?.startsWith('en') ? "en_US" : undefined),
      type: "article", // More specific than "website" for a novel page
      tags: novel.themeAssignment?.customTags || [],
      publishedTime: publishedTime,
      modifiedTime: modifiedTime,
      section: novel.themeAssignment?.mainTheme?.categoryId?.name, // e.g., "Fantasy"
      authors: novel.author?.username ? [`${baseUrlForImage}/u/${novel.author.username}`] : [authorName],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: description,
      images: imageUrl ? [{ url: imageUrl, alt: `ปกนิยายเรื่อง ${novel.title}` }] : [],
      // site: "@YourTwitterHandle", // Optional: Your site's Twitter handle
      // creator: novel.author?.twitterHandle ? `@${novel.author.twitterHandle}` : undefined, // Optional: Author's Twitter handle
    },
  };
}

export default async function NovelPage({ params }: NovelPageProps) {
  const slug = await params.slug; 
  if (typeof slug !== 'string' || !slug.trim()) {
      console.warn(`[NovelPage] Invalid slug detected: "${slug}". Calling notFound().`);
      notFound();
  }
  const novel = await getNovelData(slug.trim());

  if (!novel) {
    console.log(`[NovelPage] Novel data for slug "${slug}" is null after getNovelData. Calling notFound().`);
    notFound(); // Triggers the not-found UI
  }

  return (
    <div className="novel-detail-page-container bg-background text-foreground min-h-screen">
      <NovelHeader novel={novel} /> {/* NovelHeader is a Server Component if novel is passed */}
      <main className="container-custom mx-auto px-2 sm:px-4 py-6 md:py-8">
        {/* NovelTabs is a Client Component because it uses useState */}
        <NovelTabs novel={novel} /> 
      </main>
    </div>
  );
}