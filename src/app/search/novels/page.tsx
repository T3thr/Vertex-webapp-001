// src/app/search/novels/page.tsx
'use server'; // ระบุว่าเป็น Server Component

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Types } from 'mongoose'; // สำหรับ type hinting ถ้าจำเป็น

// Models (สำหรับ Type Imports เท่านั้น)
import { CategoryType } from '@/backend/models/Category';

// Components
import { NoResultsFound } from '@/components/search/ErrorStates';
import SearchResultsSkeleton from '@/components/search/SearchResultsSkeleton';
// SearchFilters จะถูก import แบบ dynamic

// Interface จาก SearchNovelCard (เพื่อให้สอดคล้อง)
import { Novel as SearchNovelCardData } from '@/components/search/SearchNovelCard';

// ค่าคงที่
const ITEMS_PER_PAGE = 20; // ควรตรงกับ API default หรือส่งเป็น parameter

// Dynamic Imports
const SearchResults = dynamic(() => import('@/components/search/SearchResults'), {
  loading: () => <SearchResultsSkeleton />,
});
const SearchFilters = dynamic(() => import('@/components/search/SearchFilters'), {
  loading: () => <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm min-h-[200px]">กำลังโหลดตัวกรอง...</div>,
});


// --- Helper Function to Fetch Data from API ---
// (ควรย้ายไปไว้ในไฟล์ utility/helper หากใช้ซ้ำในหลายที่)
async function fetchApiData(endpoint: string, params: Record<string, string | number | undefined | null>) {
  const SITEDOMAIN = process.env.NEXT_PUBLIC_SITEDOMAIN || 'http://localhost:3000';
  const apiUrl = new URL(`${SITEDOMAIN}/api/search${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      apiUrl.searchParams.append(key, String(value));
    }
  });

  // console.log(`[Page Fetch] Calling API: ${apiUrl.toString()}`);
  try {
    const response = await fetch(apiUrl.toString(), { cache: 'no-store' }); // no-store สำหรับข้อมูลที่เปลี่ยนแปลงบ่อย
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: response.statusText }));
      console.error(`[Page Fetch] API Error for ${endpoint}: ${response.status}`, errorBody);
      // สำหรับการค้นหานิยาย หาก error ให้ return โครงสร้างข้อมูลเปล่าเพื่อไม่ให้หน้าพัง
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
        return { data: [], pagination: { totalItems: 0 } }; // ปรับตามโครงสร้าง response ของ categories
      }
      return null; // หรือ throw error ตามความเหมาะสม
    }
    return await response.json();
  } catch (error) {
    console.error(`[Page Fetch] Network or processing error for ${endpoint}:`, error);
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
        return { data: [], pagination: { totalItems: 0 } };
    }
    return null;
  }
}

// --- Interfaces for API data structures ---
// (ควรย้ายไปไฟล์ types กลาง)
export interface PopulatedCategory { // สำหรับ mainCategories ที่ส่งให้ Filters
  _id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  color?: string;
  description?: string; // เพิ่มตามการใช้งาน
  novelCount?: number;  // เพิ่มตามการใช้งาน
}

interface ApiNovelData { // โครงสร้างข้อมูลนิยายที่ได้รับจาก API
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
  status: string; // NovelStatus enum as string
  mainThemeCategory?: PopulatedCategory | null;
  // ... (เพิ่ม fields อื่นๆ ที่ API ส่งมาและจำเป็นต้องใช้)
  stats: {
    viewsCount: number;
    likesCount: number;
    averageRating: number;
    // ...
  };
  monetizationSettings?: {
    activePromotion?: { isActive: boolean; promotionalPriceCoins?: number; } | null;
    defaultEpisodePriceCoins?: number;
  };
  currentEpisodePriceCoins?: number;
  publishedEpisodesCount: number;
}

interface ApiCategoryData { // โครงสร้างข้อมูลหมวดหมู่ที่ได้รับจาก API
    _id: string;
    name: string;
    slug: string;
    iconUrl?: string;
    color?: string;
    description?: string;
    novelCount?: number;
    // ... (เพิ่ม fields อื่นๆ)
}


interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string; // category slug
    status?: string;
    sortBy?: string;
    page?: string;
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';
  const categorySlug = searchParams.category || '';
  const status = searchParams.status || '';
  const sortBy = searchParams.sortBy || 'lastContentUpdatedAt'; // ค่า default สำหรับการเรียงลำดับ
  const page = parseInt(searchParams.page || '1', 10);

  if (isNaN(page) || page < 1) {
    notFound(); // ถ้า page ไม่ถูกต้อง ให้แสดง 404
  }

  // --- ดึงข้อมูลจาก API ---
  // 1. ดึงหมวดหมู่หลักสำหรับ Filter
  const mainCategoriesResponse = await fetchApiData('/categories', {
    type: CategoryType.GENRE, // ดึงเฉพาะหมวดหมู่หลัก (Genre)
    parentId: "null",         // หมวดหมู่ที่ไม่มีแม่
    limit: 50,                // จำนวนหมวดหมู่สูงสุดที่ดึงมาแสดง
    forNovelCreation: "false" // ไม่ใช่สำหรับหน้าสร้างนิยาย
  });
  const mainCategories: PopulatedCategory[] = mainCategoriesResponse?.data?.map((cat: ApiCategoryData) => ({
    _id: cat._id.toString(),
    name: cat.name,
    slug: cat.slug,
    iconUrl: cat.iconUrl,
    color: cat.color,
  })) || [];


  // 2. ค้นหานิยาย
  // แปลง sortBy ของ frontend เป็น sortBy ของ API
  let apiSortParam = 'latestUpdate'; // default ของ API ถ้าไม่ตรง
  if (sortBy === 'publishedAt') apiSortParam = 'latestEpisode';
  else if (sortBy === 'stats.viewsCount') apiSortParam = 'popular';
  else if (sortBy === 'stats.averageRating') apiSortParam = 'rating';
  else if (sortBy === 'stats.likesCount') apiSortParam = 'followers'; // หรือ API อาจมี sort by likes โดยตรง
  else if (sortBy === 'publishedEpisodesCount') apiSortParam = 'latestUpdate'; // หรือ API อาจมี sort by episode count
  else if (query && sortBy === 'lastContentUpdatedAt') apiSortParam = 'relevance'; // ถ้ามี query ให้ default เป็น relevance
  else if (sortBy === 'lastContentUpdatedAt') apiSortParam = 'latestUpdate';


  // หากมี categorySlug, ต้องหา ID ของ category นั้นก่อนเพื่อส่งให้ API /novels
  let mainThemeIdForApi = '';
  if (categorySlug) {
    // API /categories สามารถค้นหาด้วย slug ได้ ถ้ามีการ implement
    // สมมติว่า API /categories สามารถ query ด้วย slug ได้ (หรือปรับ API ให้ทำได้)
    const categoryDetailResponse = await fetchApiData('/categories', { slug: categorySlug, limit: 1 });
    if (categoryDetailResponse?.data && categoryDetailResponse.data.length > 0) {
      mainThemeIdForApi = categoryDetailResponse.data[0]._id;
    } else if (categorySlug) {
      // ถ้า slug ระบุมาแต่หาไม่เจอ, อาจจะแสดงว่าไม่พบหมวดหมู่ หรือไม่ค้นหานิยายเลย
      console.warn(`Category slug "${categorySlug}" not found via API.`);
    }
  }

  const novelSearchResponse = await fetchApiData('/novels', {
    q: query,
    mainTheme: mainThemeIdForApi, // ส่ง ID ของ mainTheme ถ้ามี
    status: status,
    sort: apiSortParam,
    limit: ITEMS_PER_PAGE,
    page: page,
  });

  const novelsFromApi: ApiNovelData[] = novelSearchResponse?.novels || [];
  const pagination = novelSearchResponse?.pagination || { total: 0, page: page, limit: ITEMS_PER_PAGE, totalPages: 0 };
  const apiSelectedMainTheme: PopulatedCategory | null = novelSearchResponse?.mainThemeCategory || null;
  const popularCustomTags: { tag: string; count: number }[] = novelSearchResponse?.relatedTags || [];


  // --- เตรียมข้อมูลสำหรับ Components ---
  const hasNoResults = novelsFromApi.length === 0 && (!!query || !!categorySlug);

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
          profile: novel.author.profile || { displayName: novel.author.username || 'ผู้เขียนไม่ระบุชื่อ' },
        }
      : { _id: 'unknown', username: 'ผู้เขียนไม่ระบุชื่อ', profile: { displayName: 'ผู้เขียนไม่ระบุชื่อ' } },
    status: novel.status as SearchNovelCardData['status'], // Cast type, ควรมีการ validate
    categories: novel.mainThemeCategory ? [{ _id: novel.mainThemeCategory._id.toString(), name: novel.mainThemeCategory.name, slug: novel.mainThemeCategory.slug }] : [],
    isPremium: !!novel.monetizationSettings?.defaultEpisodePriceCoins && novel.monetizationSettings.defaultEpisodePriceCoins > 0 && !(novel.monetizationSettings?.activePromotion?.isActive),
    isDiscounted: novel.monetizationSettings?.activePromotion?.isActive || false,
    averageRating: novel.stats?.averageRating || 0,
    viewsCount: novel.stats?.viewsCount || 0,
    likesCount: novel.stats?.likesCount || 0,
    publishedEpisodesCount: novel.publishedEpisodesCount || 0,
    // currentEpisodePriceCoins: novel.currentEpisodePriceCoins // ถ้ามีใน SearchNovelCardData
  }));

  const selectedCategoryName = apiSelectedMainTheme?.name || (mainCategories.find(c => c.slug === categorySlug)?.name || '');


  return (
    <div className="space-y-6 container mx-auto px-4 py-8">
      {/* ส่วนการค้นหาและตัวกรอง (Client Component) */}
      <Suspense fallback={<div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm min-h-[200px]">กำลังโหลดตัวกรอง...</div>}>
        <SearchFilters
          query={query}
          categorySlug={categorySlug}
          status={status}
          sortBy={sortBy}
          mainCategories={mainCategories}
          selectedCategoryName={selectedCategoryName}
          totalItems={pagination.total || 0}
        />
      </Suspense>

      {/* แท็กยอดนิยม/ที่เกี่ยวข้อง */}
      {popularCustomTags.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-3 text-foreground">แท็กที่เกี่ยวข้อง</h2>
          <div className="flex flex-wrap gap-2">
            {popularCustomTags.map((tagItem) => (
              <Link
                key={tagItem.tag}
                href={`/search/novels?q=${encodeURIComponent(tagItem.tag)}`}
                className="px-3 py-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full text-sm transition-colors"
              >
                {tagItem.tag} ({tagItem.count})
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ผลการค้นหา */}
      <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 text-foreground">
          {query
            ? `ผลการค้นหา "${query}"`
            : selectedCategoryName
            ? `นิยายในหมวดหมู่ ${selectedCategoryName}`
            : 'นิยายทั้งหมด'}
          {status && status !== '' && (
            <span className="text-base text-muted-foreground ml-2">
              ({status === 'completed' ? 'จบแล้ว' : status === 'PUBLISHED' ? 'กำลังเผยแพร่' : status === 'UNPUBLISHED' ? 'หยุดพัก' : status})
            </span>
          )}
        </h2>

        <Suspense fallback={<SearchResultsSkeleton />}>
          {hasNoResults ? (
            <NoResultsFound searchTerm={query || selectedCategoryName} />
          ) : (
            <SearchResults
              novels={novelsForSearchResults}
              pagination={pagination} // ส่ง pagination ที่ได้จาก API
              searchParams={{ // ส่ง searchParams ปัจจุบันสำหรับสร้าง link ใน pagination
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