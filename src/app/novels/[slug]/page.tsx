// src/app/novels/[slug]/page.tsx
'use server'; // ระบุว่าเป็น Server Component

import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { PopulatedNovelForDetailPage } from "@/app/api/novels/[slug]/route"; // Import type จาก API route
import NovelHeader from "@/components/novels/NovelHeader"; // Component สำหรับแสดงส่วนหัวของนิยาย
import NovelTabs from "@/components/novels/NovelTabs"; // Component สำหรับแสดง Tabs เนื้อหาต่างๆ ของนิยาย
// NovelCharactersTab ถูก render ภายใน NovelTabs แล้ว อาจไม่จำเป็นต้อง import โดยตรงที่นี่

// Interface สำหรับ props ของ page component
interface NovelPageProps {
  params: { slug: string }; // params ที่ Next.js ส่งมาให้, มี slug ของนิยาย
}

// ฟังก์ชันสำหรับดึงข้อมูลนิยายจาก API
async function getNovelData(slug: string): Promise<PopulatedNovelForDetailPage | null> {
  // ตรวจสอบความถูกต้องของ slug ก่อนเรียก API
  if (typeof slug !== 'string' || !slug.trim()) {
    console.warn(`⚠️ [page.tsx getNovelData] Invalid slug provided: "${slug}"`);
    return null; // คืนค่า null ถ้า slug ไม่ถูกต้อง
  }

  // กำหนด Base URL สำหรับ API Endpoint
  // Logic การกำหนด Base URL มีความซับซ้อนเล็กน้อยเพื่อให้รองรับทั้ง local development, Vercel, และ self-hosted
  let baseUrl = process.env.NEXT_PUBLIC_API_URL; // ใช้ค่าจาก environment variable ถ้ามี
  if (!baseUrl) {
    if (process.env.VERCEL_URL) { // สำหรับ Vercel deployment
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.NODE_ENV === 'development') { // สำหรับ local development
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    } else { // Fallback สำหรับ production อื่นๆ (เช่น self-hosted)
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
      if (!baseUrl) { // ถ้าไม่ได้ตั้งค่าไว้ ให้ log error เพราะ API call จะ fail
        console.error("❌ CRITICAL: NEXT_PUBLIC_BASE_URL is not set for production API calls.");
        return null; // ป้องกันการเรียก API ไปยัง URL ที่ไม่ถูกต้อง
      }
    }
  }
  // สร้าง URL เต็มสำหรับ API endpoint
  const apiUrl = `${baseUrl}/api/novels/${encodeURIComponent(slug.trim())}`;
  console.log(`📄 [page.tsx getNovelData] กำลังดึงข้อมูลนิยายสำหรับ slug "${slug}" จาก: ${apiUrl}`);

  try {
    // เรียก API ด้วย fetch
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // cache: 'no-store', // สำหรับ development: ยกเลิก cache เพื่อให้ได้ข้อมูลล่าสุดเสมอ (ปิดไว้ก่อน ใช้ revalidate แทน)
      next: { revalidate: 60 } // สำหรับ production: Revalidate ข้อมูลทุกๆ 60 วินาที (ISR)
    });

    // ถ้า API ตอบกลับด้วย 404 (ไม่พบนิยาย)
    if (res.status === 404) {
      console.warn(`⚠️ [page.tsx getNovelData] ไม่พบนิยายสำหรับ slug "${slug}" (404 จาก API: ${apiUrl})`);
      return null; // คืนค่า null เพื่อให้ page component เรียก notFound()
    }

    // ถ้า API ตอบกลับด้วย status อื่นที่ไม่ใช่ success (ไม่ใช่ 2xx)
    if (!res.ok) {
      let errorBody = "Could not read error body"; // ข้อความ fallback หากอ่าน error body ไม่ได้
      try {
        errorBody = await res.text(); // พยายามอ่าน error body จาก response
      } catch (e) { /* ignore error parsing body */ }
      console.error(`❌ [page.tsx getNovelData] ไม่สามารถดึงข้อมูลนิยายได้จาก ${apiUrl}: ${res.status} ${res.statusText}. Body: ${errorBody}`);
      return null; // คืนค่า null, จะทำให้เรียก notFound() ใน page component
    }

    // แปลง JSON response เป็น object
    const data = await res.json();

    // ตรวจสอบว่า API ตอบกลับมาพร้อมข้อมูล novel ที่ถูกต้อง
    if (!data || !data.novel) {
      console.warn(`⚠️ [page.tsx getNovelData] API ตอบกลับสำเร็จ แต่ไม่พบ data.novel สำหรับ slug "${slug}" จาก: ${apiUrl}. Response:`, JSON.stringify(data).substring(0, 500));
      return null; // คืนค่า null
    }

    console.log(`✅ [page.tsx getNovelData] ดึงข้อมูลนิยายสำเร็จ: "${data.novel.title}" (ID: ${data.novel._id})`);
    return data.novel as PopulatedNovelForDetailPage; // คืนข้อมูลนิยายที่ได้

  } catch (error: any) {
    console.error(`❌ [page.tsx getNovelData] เกิดข้อผิดพลาดในการดึงข้อมูลนิยายสำหรับ slug "${slug}" จาก ${apiUrl}:`, error.message, error.stack ? error.stack.substring(0,500) : '');
    return null; // คืนค่า null ในกรณีที่เกิด exception (เช่น network error)
  }
}

// ฟังก์ชันสำหรับสร้าง Metadata ของหน้า (SEO และ Social Sharing)
export async function generateMetadata(
  { params }: NovelPageProps,
  parent: ResolvingMetadata // parent metadata ที่ถูก resolve มาจาก layout ด้านบน
): Promise<Metadata> {
  const slug = params.slug; // ดึง slug จาก params (await ไม่จำเป็นสำหรับ object property)
  // ตรวจสอบ slug ก่อนใช้งาน
  if (typeof slug !== 'string' || !slug.trim()) {
    console.warn(`⚠️ [generateMetadata] Invalid slug for metadata: "${slug}"`);
    return {
      title: "ข้อมูลไม่ถูกต้อง - NovelMaze",
      description: "ไม่สามารถโหลดข้อมูลสำหรับเนื้อหานี้ได้เนื่องจาก slug ไม่ถูกต้อง",
      robots: { index: false, follow: false } // ไม่ให้ search engine index หน้านี้
    };
  }
  // ดึงข้อมูลนิยาย
  const novel = await getNovelData(slug.trim());

  // ถ้าไม่พบนิยาย ให้ return metadata สำหรับหน้า "Not Found"
  if (!novel) {
    return {
      title: "ไม่พบนิยาย - NovelMaze",
      description: `ขออภัย ไม่พบข้อมูลนิยายที่คุณกำลังค้นหา (slug: ${slug})`,
      robots: { index: false, follow: false } // สำคัญสำหรับ SEO ไม่ให้ index หน้าที่ไม่มีเนื้อหา
    };
  }

  // ดึงชื่อเว็บไซต์จาก parent metadata หรือ environment variable หรือ fallback
  const siteName = (await parent).openGraph?.siteName || process.env.NEXT_PUBLIC_SITE_NAME || "NovelMaze";
  // กำหนดชื่อผู้เขียน
  const authorName = novel.author?.profile?.penName || novel.author?.profile?.displayName || novel.author?.username || 'ผู้เขียนนิรนาม';
  // สร้าง Title ของหน้า
  const pageTitle = `${novel.title} - โดย ${authorName} | ${siteName}`;
  // สร้าง Description ของหน้า
  const description = novel.synopsis
    ? novel.synopsis.substring(0, 160).trim() + (novel.synopsis.length > 160 ? "..." : "") // ตัดเรื่องย่อให้ไม่เกิน 160 ตัวอักษร
    : `อ่านนิยาย "${novel.title}" เขียนโดย ${authorName} บน ${siteName} แพลตฟอร์ม Visual Novel และนิยายออนไลน์หลากหลายแนว`;

  // กำหนด Base URL สำหรับรูปภาพ (สำคัญสำหรับ Open Graph และ Twitter Card)
  let baseUrlForImage = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrlForImage) {
    baseUrlForImage = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'; // Default สำหรับ local
  }
  
  // เตรียม URL รูปภาพปก
  let imageUrl = novel.coverImageUrl;
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) { // ถ้าเป็น relative path
    imageUrl = `${baseUrlForImage}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`; // ทำให้เป็น absolute path
  } else if (!imageUrl) { // ถ้าไม่มีรูปปก ให้ใช้ default
    imageUrl = `${baseUrlForImage}/images/default-og-image.png`; // ตรวจสอบว่ามีไฟล์นี้ใน public/images
  }

  // แปลงวันที่เป็น ISO string สำหรับ Open Graph
  const publishedTime = novel.publishedAt ? new Date(novel.publishedAt).toISOString() : undefined;
  const modifiedTime = novel.lastContentUpdatedAt ? new Date(novel.lastContentUpdatedAt).toISOString() : (novel.updatedAt ? new Date(novel.updatedAt).toISOString() : undefined);

  // เตรียม Keywords
  const keywordsSet = new Set<string>();
  novel.themeAssignment?.customTags?.forEach((tag: string) => keywordsSet.add(tag.trim()));
  if (novel.themeAssignment?.mainTheme?.categoryId?.name) keywordsSet.add(novel.themeAssignment.mainTheme.categoryId.name.trim());
  novel.themeAssignment?.subThemes?.forEach((st) => { if (st?.categoryId?.name) keywordsSet.add(st.categoryId.name.trim()); });
  novel.themeAssignment?.moodAndTone?.forEach((mt) => { if (mt?.name) keywordsSet.add(mt.name.trim()); });
  if (novel.language?.name) keywordsSet.add(novel.language.name.trim());
  keywordsSet.add("visual novel");
  keywordsSet.add("นิยาย");
  keywordsSet.add(authorName); // เพิ่มชื่อผู้เขียนเป็น keyword
  keywordsSet.add(novel.title); // เพิ่มชื่อนิยายเป็น keyword


  // Return Metadata object
  return {
    metadataBase: new URL(baseUrlForImage), // **สำคัญมาก:** สำหรับให้ Next.js resolve relative image URLs ใน OpenGraph
    title: pageTitle,
    description: description,
    keywords: Array.from(keywordsSet).filter(Boolean), // แปลง Set เป็น Array และกรองค่าว่าง
    authors: [{ name: authorName, url: novel.author?.username ? `${baseUrlForImage}/u/${novel.author.username}` : undefined }], // ข้อมูลผู้เขียน
    alternates: {
      canonical: `/novels/${novel.slug}`, // URL หลักของหน้านี้
    },
    openGraph: {
      title: pageTitle,
      description: description,
      url: `${baseUrlForImage}/novels/${novel.slug}`, // URL เต็มของหน้า (Absolute URL)
      siteName: siteName,
      images: imageUrl ? [{ // รูปภาพสำหรับ Open Graph
          url: imageUrl, // Next.js จะ resolve path นี้โดยใช้ metadataBase ถ้าเป็น relative
          width: 1200,
          height: 630,
          alt: `ปกนิยายเรื่อง ${novel.title}`,
        }] : [],
      locale: novel.language?.slug?.startsWith('th') ? "th_TH" : (novel.language?.slug?.startsWith('en') ? "en_US" : undefined), // Locale ของเนื้อหา
      type: "article", // ประเภทเนื้อหา (article เหมาะสำหรับนิยาย)
      tags: novel.themeAssignment?.customTags || [], // Tags ที่เกี่ยวข้อง
      publishedTime: publishedTime, // วันที่เผยแพร่
      modifiedTime: modifiedTime, // วันที่แก้ไขล่าสุด
      section: novel.themeAssignment?.mainTheme?.categoryId?.name, // หมวดหมู่หลัก เช่น "Fantasy"
      authors: novel.author?.username ? [`${baseUrlForImage}/u/${novel.author.username}`] : [authorName], // Link ไปยังโปรไฟล์ผู้เขียน
    },
    twitter: { // Metadata สำหรับ Twitter Card
      card: "summary_large_image", // ประเภทของ Card
      title: pageTitle,
      description: description,
      images: imageUrl ? [{ url: imageUrl, alt: `ปกนิยายเรื่อง ${novel.title}` }] : [],
      // site: "@YourTwitterHandle", // (Optional) Twitter Handle ของเว็บไซต์
      // creator: novel.author?.twitterHandle ? `@${novel.author.twitterHandle}` : undefined, // (Optional) Twitter Handle ของผู้เขียน
    },
  };
}

// Page Component หลัก
export default async function NovelPage({ params }: NovelPageProps) {
  const slug = params.slug; // ดึง slug จาก params (await ไม่จำเป็นสำหรับ object property)
  // ตรวจสอบ slug อีกครั้งก่อน fetch (อาจซ้ำซ้อนกับ getNovelData แต่เป็นการป้องกันที่ดี)
  if (typeof slug !== 'string' || !slug.trim()) {
      console.warn(`[NovelPage] Invalid slug detected: "${slug}". Calling notFound().`);
      notFound(); // เรียก notFound() ถ้า slug ไม่ถูกต้อง
  }
  // ดึงข้อมูลนิยาย
  const novel = await getNovelData(slug.trim());

  // ถ้าไม่พบนิยาย (getNovelData คืนค่า null)
  if (!novel) {
    console.log(`[NovelPage] Novel data for slug "${slug}" is null after getNovelData. Calling notFound().`);
    notFound(); // แสดงหน้า Not Found UI (สร้าง not-found.tsx ใน app directory)
  }

  // Render หน้าเว็บ
  return (
    <div className="novel-detail-page-container bg-background text-foreground min-h-screen">
      {/* NovelHeader เป็น Server Component ถ้า novel ถูกส่งเป็น prop โดยตรง */}
      <NovelHeader novel={novel} />
      <main className="container-custom mx-auto px-2 sm:px-4 py-6 md:py-8">
        {/* NovelTabs เป็น Client Component เพราะมีการใช้ useState ภายใน */}
        <NovelTabs novel={novel} />
      </main>
    </div>
  );
}