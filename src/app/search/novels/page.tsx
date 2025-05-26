// src/app/search/novels/page.tsx
'use server'; // ระบุว่าเป็น Server Component

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Models (สำหรับ Type Imports เท่านั้น)
import { CategoryType, ICategory as CategoryModelInterface } from '@/backend/models/Category';
import { NovelStatus as NovelModelStatus } from '@/backend/models/Novel';

// Components
import { NoResultsFound } from '@/components/search/ErrorStates';
import SearchResultsSkeleton from '@/components/search/SearchResultsSkeleton';

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
/**
 * ดึงข้อมูลจาก API ด้วย endpoint และ parameters
 * @param endpoint เส้นทาง API เช่น /novels, /categories
 * @param params พารามิเตอร์สำหรับ query string
 * @returns ข้อมูลจาก API หรือ fallback หากเกิดข้อผิดพลาด
 */
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

// Props สำหรับ Page component
interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>; // ปรับให้ searchParams เป็น Promise
}

// ======== FUNCTION TO GENERATE DYNAMIC METADATA BASED ON SEARCH PARAMS ========
/**
 * สร้าง metadata แบบ dynamic สำหรับหน้าค้นหานิยาย
 * @param props SearchPageProps
 * @returns Promise<Metadata> ข้อมูล metadata สำหรับ SEO
 */
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams; // Resolve Promise
  const query = typeof params.q === 'string' ? params.q : '';
  const categorySlug = typeof params.category === 'string' ? params.category : '';

  // ค่าเริ่มต้นสำหรับ title และ description
  let title = 'ค้นหานิยายทั้งหมด | NovelMaze';
  let description = 'ค้นหานิยายและการ์ตูนออนไลน์จากทั่วทุกมุมโลก แบ่งตามหมวดหมู่ สถานะ และอื่นๆ บน NovelMaze';

  // ปรับ title และ description ตาม query และ category
  if (query && categorySlug) {
    title = `ผลการค้นหา "${query}" ในหมวดหมู่ '${categorySlug}' | NovelMaze`;
    description = `ผลการค้นหานิยายและการ์ตูนสำหรับ "${query}" ในหมวดหมู่ '${categorySlug}' บน NovelMaze`;
  } else if (query) {
    title = `ผลการค้นหา "${query}" | NovelMaze`;
    description = `ผลการค้นหานิยายและการ์ตูนสำหรับ "${query}" บน NovelMaze`;
  } else if (categorySlug) {
    title = `นิยายในหมวดหมู่ '${categorySlug}' | NovelMaze`;
    description = `สำรวจนิยายและการ์ตูนในหมวดหมู่ '${categorySlug}' บน NovelMaze`;
  }

  return {
    title,
    description,
    keywords: `ค้นหานิยาย, นิยายออนไลน์, ${query ? query + ',' : ''} ${categorySlug ? categorySlug + ',' : ''} NovelMaze, การ์ตูน`,
    openGraph: {
      title,
      description,
    }
  };
}
// ======== END FUNCTION TO GENERATE DYNAMIC METADATA ========

/**
 * หน้าค้นหานิยาย
 * @param props SearchPageProps
 * @returns JSX.Element หน้าสำหรับแสดงผลการค้นหานิยาย
 */
export default async function SearchNovelsPage({ searchParams }: SearchPageProps) {
  const params = await searchParams; // Resolve Promise
  const query = typeof params.q === 'string' ? params.q : '';
  const categorySlug = typeof params.category === 'string' ? params.category : '';
  const status = typeof params.status === 'string' ? params.status : '';
  const sortBy = typeof params.sortBy === 'string' ? params.sortBy : (query ? 'relevance' : 'lastContentUpdatedAt');
  const page = parseInt(typeof params.page === 'string' ? params.page : '1', 10);

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
      console.warn(`[Page Search] ไม่พบหมวดหมู่ slug "${categorySlug}" ใน main categories`);
    }
  }

  const novelSearchResponse: ApiNovelsSearchResponse | null = await fetchApiData('/novels', {
    q: query,
    mainTheme: mainThemeIdForApi,
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
  const hasNoResults = novelsFromApi.length === 0 && (!!query || !!categorySlug || !!status);

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

  // หาชื่อหมวดหมู่ที่เลือก
  const selectedCategoryName = apiSelectedMainTheme?.name || (categorySlug && mainCategories.find(c => c.slug === categorySlug)?.name) || '';

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm min-h-[300px] md:min-h-[200px] flex justify-center items-center">กำลังโหลดตัวกรอง...</div>}>
        <SearchFilters
          initialQuery={query}
          initialCategorySlug={categorySlug}
          initialStatus={status}
          initialSortBy={sortBy}
          mainCategories={mainCategories}
          selectedCategoryName={selectedCategoryName}
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