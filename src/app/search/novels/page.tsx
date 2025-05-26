// src/app/search/novels/page.tsx
'use server'; // ระบุว่าเป็น Server Component

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next'; 

// Models (สำหรับ Type Imports เท่านั้น)
import { CategoryType, ICategory as CategoryModelInterface } from '@/backend/models/Category';
import { NovelStatus as NovelModelStatus, NovelAccessLevel as NovelModelAccessLevel } from '@/backend/models/Novel';

// Components
import { NoResultsFound } from '@/components/search/ErrorStates';
import SearchResultsSkeleton from '@/components/search/SearchResultsSkeleton';
// SearchFilters จะถูก import แบบ dynamic ใน page

// Interface จาก SearchNovelCard (เพื่อให้สอดคล้อง)
import { Novel as SearchNovelCardData } from '@/components/search/SearchNovelCard';

// ค่าคงที่
const ITEMS_PER_PAGE = 20;

// Dynamic Imports
const SearchResults = dynamic(() => import('@/components/search/SearchResults'), {
  loading: () => <SearchResultsSkeleton />,
});
const SearchFilters = dynamic(() => import('@/components/search/SearchFilters'), {
  loading: () => <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm min-h-[300px] md:min-h-[200px] flex justify-center items-center">กำลังโหลดตัวกรอง...</div>,
});


// --- Helper Function to Fetch Data from API ---
async function fetchApiData(endpoint: string, params: Record<string, string | number | undefined | null | string[]>) {
  const SITEDOMAIN = process.env.NEXT_PUBLIC_SITEDOMAIN || 'http://localhost:3000';
  const apiUrl = new URL(`${SITEDOMAIN}/api/search${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => {
          if (String(v).trim() !== '') {
            apiUrl.searchParams.append(key, String(v));
          }
        });
      } else if (String(value).trim() !== '') {
        apiUrl.searchParams.append(key, String(value));
      }
    }
  });

  try {
    const response = await fetch(apiUrl.toString(), { next: { revalidate: 0 } });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: response.statusText, details: `Status code: ${response.status}` }));
      console.error(`[Page Fetch] API Error for ${endpoint} (${apiUrl.toString()}): ${response.status}`, errorBody);
      if (endpoint === '/novels') {
        return {
          novels: [],
          mainThemeCategory: null,
          subThemeCategory: null,
          relatedTags: [],
          pagination: { total: 0, page: 1, limit: ITEMS_PER_PAGE, totalPages: 0 }
        };
      }
      if (endpoint === '/categories') {
        return { data: [], pagination: { totalItems: 0, currentPage: 1, totalPages: 0 } };
      }
      return null;
    }
    return await response.json();
  } catch (error: any) {
    console.error(`[Page Fetch] Network or processing error for ${endpoint} (${apiUrl.toString()}):`, error.message, error.stack);
    if (endpoint === '/novels') {
      return {
        novels: [],
        mainThemeCategory: null,
        subThemeCategory: null,
        relatedTags: [],
        pagination: { total: 0, page: 1, limit: ITEMS_PER_PAGE, totalPages: 0 }
      };
    }
    if (endpoint === '/categories') {
        return { data: [], pagination: { totalItems: 0, currentPage: 1, totalPages: 0 } };
    }
    return null;
  }
}

// --- Interfaces for API data structures and Props ---
export interface PopulatedCategory {
  _id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  color?: string;
  description?: string;
  novelCount?: number;
}

interface ApiNovelData {
  _id: string;
  title: string;
  slug: string;
  author?: {
    _id: string;
    username?: string;
    profile?: {
      displayName?: string;
      penName?: string;
      avatarUrl?: string;
    };
  };
  coverImageUrl?: string;
  synopsis: string;
  status: keyof typeof NovelModelStatus;
  mainThemeCategory?: PopulatedCategory | null;
  customTags?: string[];
  stats: {
    viewsCount: number;
    likesCount: number;
    averageRating: number;
    followersCount: number;
    lastPublishedEpisodeAt?: string;
    totalWords: number;
  };
  monetizationSettings?: {
    activePromotion?: {
        isActive: boolean;
        promotionalPriceCoins?: number;
        promotionStartDate?: string;
        promotionEndDate?: string;
    } | null;
    defaultEpisodePriceCoins?: number;
  };
  currentEpisodePriceCoins?: number;
  publishedEpisodesCount: number;
  totalEpisodesCount: number;
  lastContentUpdatedAt: string;
  score?: number;
}

interface ApiCategoriesResponse {
  success: boolean;
  data: PopulatedCategory[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface ApiNovelsSearchResponse {
  novels: ApiNovelData[];
  mainThemeCategory: PopulatedCategory | null;
  subThemeCategory: PopulatedCategory | null;
  relatedTags: { tag: string; count: number }[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Props สำหรับ Page component (Next.js จัดการ searchParams เป็น object string)
interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string; // category slug
    status?: string;
    sortBy?: string;
    page?: string;
    // เพิ่มพารามิเตอร์อื่นๆ ที่ใช้ในการ filter ถ้ามี เช่น lang, ageRating
  };
}

// ======== FUNCTION TO GENERATE DYNAMIC METADATA BASED ON SEARCH PARAMS ========
// ย้าย generateMetadata มาที่ page.tsx เพื่อให้เข้าถึง searchParams ได้อย่างถูกต้องสำหรับ dynamic metadata
// ฟังก์ชันนี้จะถูกเรียกโดย Next.js เพื่อสร้าง metadata สำหรับหน้านี้
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = searchParams.q;
  const categorySlug = searchParams.category; // นี่คือ slug ของหมวดหมู่

  // ค่าเริ่มต้นสำหรับ title และ description
  let title = 'ค้นหานิยายทั้งหมด | NovelMaze';
  let description = 'ค้นหานิยายและการ์ตูนออนไลน์จากทั่วทุกมุมโลก แบ่งตามหมวดหมู่ สถานะ และอื่นๆ บน NovelMaze';

  // ปรับ title และ description ตาม query และ category ที่ระบุ
  // หมายเหตุ: หากต้องการแสดง "ชื่อหมวดหมู่" แทน "slug หมวดหมู่" ใน title/description
  // อาจจะต้องมีการ fetch ข้อมูลหมวดหมู่จาก slug ที่นี่ (เช่นเดียวกับที่ทำใน Page component)
  // แต่เพื่อความเรียบง่ายและลดการ fetch ซ้ำซ้อนในตัวอย่างนี้ จะใช้ slug โดยตรง หรือค่าที่พอหาได้
  // (ใน Page component มีการดึง mainCategories ซึ่งอาจนำมาใช้หาชื่อ category ได้ถ้าโครงสร้างตรงกัน)

  if (query && categorySlug) {
    // หากมีทั้งคำค้นหาและหมวดหมู่
    // ตัวอย่างการใช้ slug: title = `ผลการค้นหา "${query}" ในหมวดหมู่ ${categorySlug} | NovelMaze`;
    // ถ้าต้องการชื่อหมวดหมู่จริงๆ: อาจจะต้องมี logic คล้ายๆ `selectedCategoryName` ใน Page component
    // หรือ fetch category name จาก API โดยใช้ slug (อาจ cache ผลลัพธ์เพื่อ performance)
    title = `ผลการค้นหา "${query}" ในหมวดหมู่ '${categorySlug}' | NovelMaze`;
    description = `ผลการค้นหานิยายและการ์ตูนสำหรับ "${query}" ในหมวดหมู่ '${categorySlug}' บน NovelMaze`;
  } else if (query) {
    // หากมีเฉพาะคำค้นหา
    title = `ผลการค้นหา "${query}" | NovelMaze`;
    description = `ผลการค้นหานิยายและการ์ตูนสำหรับ "${query}" บน NovelMaze`;
  } else if (categorySlug) {
    // หากมีเฉพาะหมวดหมู่
    // ตัวอย่างการใช้ slug: title = `นิยายในหมวดหมู่ ${categorySlug} | NovelMaze`;
    title = `นิยายในหมวดหมู่ '${categorySlug}' | NovelMaze`;
    description = `สำรวจนิยายและการ์ตูนในหมวดหมู่ '${categorySlug}' บน NovelMaze`;
  }

  return {
    title,
    description,
    // Keywords สามารถปรับให้ dynamic ได้เช่นกันตาม query หรือ category
    keywords: `ค้นหานิยาย, นิยายออนไลน์, ${query ? query + ',' : ''} ${categorySlug ? categorySlug + ',' : ''} NovelMaze, การ์ตูน`,
    // OpenGraph และ metadata tags อื่นๆ สามารถ dynamic ได้เช่นกัน
    openGraph: {
        title,
        description,
        // สามารถเพิ่ม images, url, type ฯลฯ ได้ที่นี่
    }
  };
}
// ======== END FUNCTION TO GENERATE DYNAMIC METADATA ========


export default async function SearchNovelsPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';
  const categorySlug = searchParams.category || '';
  const status = searchParams.status || '';
  const sortBy = searchParams.sortBy || (query ? 'relevance' : 'lastContentUpdatedAt');
  const page = parseInt(searchParams.page || '1', 10);

  if (isNaN(page) || page < 1) {
    notFound();
  }

  // --- ดึงข้อมูลจาก API ---
  // 1. ดึงหมวดหมู่หลักสำหรับ Filter
  const mainCategoriesResponse: ApiCategoriesResponse | null = await fetchApiData('/categories', {
    type: CategoryType.GENRE,
    parentId: "null",
    limit: 60,
    forNovelCreation: "false",
  });
  const mainCategories: PopulatedCategory[] = mainCategoriesResponse?.data || [];

  // 2. ค้นหานิยาย
  let mainThemeIdForApi = '';
  if (categorySlug) {
    const foundCat = mainCategories.find(cat => cat.slug === categorySlug);
    if (foundCat) {
      mainThemeIdForApi = foundCat._id;
    } else {
      console.warn(`[Page Search] Category slug "${categorySlug}" not found in fetched main categories. API call for novels might not filter by this category unless API handles slug directly.`);
      // หาก API /novels สามารถรับ category slug ได้โดยตรง ก็ไม่จำเป็นต้องแปลงเป็น ID ที่นี่
      // หรือถ้าจำเป็นต้องใช้ ID และไม่เจอ อาจจะต้อง fetch category โดย slug เพื่อเอา ID มา (แต่จะเพิ่ม API call)
      // ปัจจุบันโค้ดส่ง mainThemeIdForApi ซึ่งอาจเป็นค่าว่างถ้าหาไม่เจอ
    }
  }
  
  const novelSearchResponse: ApiNovelsSearchResponse | null = await fetchApiData('/novels', {
    q: query,
    mainTheme: mainThemeIdForApi, // API ปัจจุบันคาดหวัง ID, ถ้า API รับ slug ได้ จะดีกว่า
    // categorySlug: categorySlug, // หาก API รองรับการส่ง slug โดยตรง
    status: status,
    sort: sortBy,
    limit: ITEMS_PER_PAGE,
    page: page,
  });

  const novelsFromApi: ApiNovelData[] = novelSearchResponse?.novels || [];
  const paginationFromApi = novelSearchResponse?.pagination || { total: 0, page: page, limit: ITEMS_PER_PAGE, totalPages: 0 };
  const apiSelectedMainTheme: PopulatedCategory | null = novelSearchResponse?.mainThemeCategory || null;
  const popularCustomTags: { tag: string; count: number }[] = novelSearchResponse?.relatedTags || [];

  // --- เตรียมข้อมูลสำหรับ Components ---
  const hasNoResults = novelsFromApi.length === 0 && (!!query || !!categorySlug || !!status );

  const novelsForSearchResults: SearchNovelCardData[] = novelsFromApi.map((novel) => ({
    _id: novel._id.toString(),
    title: novel.title,
    slug: novel.slug,
    description: novel.synopsis,
    coverImage: novel.coverImageUrl || '/placeholder-cover.jpg',
    author: novel.author
      ? {
          _id: novel.author._id.toString(),
          username: novel.author.username || 'ผู้เขียนไม่ระบุชื่อ',
          profile: {
            displayName: novel.author.profile?.displayName || novel.author.username || 'ผู้เขียนไม่ระบุชื่อ',
            penName: novel.author.profile?.penName,
            avatarUrl: novel.author.profile?.avatarUrl,
          },
        }
      : { _id: 'unknown', username: 'ผู้เขียนไม่ระบุชื่อ', profile: { displayName: 'ผู้เขียนไม่ระบุชื่อ' } },
    status: novel.status as SearchNovelCardData['status'],
    categories: novel.mainThemeCategory ? [{
        _id: novel.mainThemeCategory._id.toString(),
        name: novel.mainThemeCategory.name,
        slug: novel.mainThemeCategory.slug
    }] : [],
    isPremium: (novel.currentEpisodePriceCoins ?? novel.monetizationSettings?.defaultEpisodePriceCoins ?? 0) > 0 && !(novel.monetizationSettings?.activePromotion?.isActive),
    isDiscounted: novel.monetizationSettings?.activePromotion?.isActive || false,
    averageRating: novel.stats?.averageRating || 0,
    viewsCount: novel.stats?.viewsCount || 0,
    likesCount: novel.stats?.likesCount || 0,
    publishedEpisodesCount: novel.publishedEpisodesCount || 0,
  }));
  
  const paginationForComponent = {
    currentPage: paginationFromApi.page,
    totalPages: paginationFromApi.totalPages,
    totalItems: paginationFromApi.total,
    hasNextPage: paginationFromApi.page < paginationFromApi.totalPages,
    hasPrevPage: paginationFromApi.page > 1,
  };

  // หาก API คืน mainThemeCategory มา (ซึ่งควรจะตรงกับ categorySlug ถ้ามีการ filter) ก็ใช้ชื่อนั้น
  // หรือถ้าไม่มี (เช่น API ไม่ได้คืนมา หรือไม่ได้ filter ด้วย category) แต่มี categorySlug ให้ลองหาจาก mainCategories
  const selectedCategoryName = apiSelectedMainTheme?.name || (categorySlug && mainCategories.find(c => c.slug === categorySlug)?.name) || '';

  return (
    <div className="space-y-6"> {/* Container หลักอยู่ใน layout.tsx แล้ว */}
      <Suspense fallback={<div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm min-h-[300px] md:min-h-[200px] flex justify-center items-center">กำลังโหลดตัวกรอง...</div>}>
        <SearchFilters
          initialQuery={query}
          initialCategorySlug={categorySlug}
          initialStatus={status}
          initialSortBy={sortBy}
          mainCategories={mainCategories}
          selectedCategoryName={selectedCategoryName} // ส่งชื่อหมวดหมู่ที่เลือก (ถ้ามี)
          totalItems={paginationFromApi.total}
        />
      </Suspense>

      {popularCustomTags.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-3 text-foreground">แท็กที่เกี่ยวข้อง</h2>
          <div className="flex flex-wrap gap-2">
            {popularCustomTags.map((tagItem) => (
              <Link
                key={tagItem.tag}
                // เมื่อคลิกแท็ก จะเป็นการค้นหาใหม่ด้วย q=tag และลบ filter category/status/sortBy เดิม
                // เพื่อให้ user เริ่มต้นการค้นหาด้วยแท็กนั้นๆ อย่างเดียว
                href={`/search/novels?q=${encodeURIComponent(tagItem.tag)}`}
                className="px-3 py-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full text-sm transition-colors"
                prefetch={false}
              >
                {tagItem.tag} ({tagItem.count})
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 text-foreground">
          {query
            ? `ผลการค้นหา "${query}"`
            : selectedCategoryName
            ? `นิยายในหมวดหมู่ "${selectedCategoryName}"`
            : 'นิยายทั้งหมด'}
          {selectedCategoryName && query && (
            <span className="text-base text-muted-foreground ml-2">(ในหมวดหมู่ "{selectedCategoryName}")</span>
          )}
          {status && status !== '' && (
            <span className="text-base text-muted-foreground ml-2">
              (สถานะ: {status === 'COMPLETED' ? 'จบแล้ว' : status === 'PUBLISHED' ? 'กำลังเผยแพร่' : status === 'ONGOING' ? 'กำลังดำเนินเรื่อง' : status})
            </span>
          )}
        </h2>

        <Suspense fallback={<SearchResultsSkeleton />}>
          {hasNoResults ? (
            <NoResultsFound searchTerm={query || selectedCategoryName || "ที่ระบุ"} />
          ) : (
            <SearchResults
              novels={novelsForSearchResults}
              pagination={paginationForComponent}
              searchParams={{
                q: query,
                category: categorySlug,
                status,
                sortBy,
              }}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}