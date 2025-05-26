// app/search/novels/page.tsx (หรือ path ที่ถูกต้องสำหรับหน้า Search)
'use server' // ระบุว่าเป็น Server Component

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Types } from 'mongoose';

// การใช้ dynamic import เพื่อแยกและลดภาระในการโหลด
const SearchResults = dynamic(() => import('@/components/search/SearchResults'), {
  loading: () => <SearchResultsSkeleton /> // แสดง Skeleton ขณะโหลด
});

// Models
import dbConnect from '@/backend/lib/mongodb';
import CategoryModel, { ICategory, CategoryType, CategoryVisibility } from '@/backend/models/Category';
import NovelModel, { INovel, NovelStatus, NovelAccessLevel, INovelStats, IMonetizationSettings } from '@/backend/models/Novel';
import UserModel, { IUser } from '@/backend/models/User';

// Components
import { NoResultsFound } from '@/components/search/ErrorStates';
import SearchResultsSkeleton from '@/components/search/SearchResultsSkeleton';

// ค่าคงที่สำหรับการแบ่งหน้าและตัวเลือกการเรียงลำดับ
const ITEMS_PER_PAGE = 20;

// ตัวเลือกการเรียงลำดับ (ปรับ value ให้ตรงกับ field ใน NovelModel.stats หรือ INovel)
const sortOptions = [
  { id: '1', name: 'อัปเดตล่าสุด', value: 'lastContentUpdatedAt' },
  { id: '2', name: 'ออกใหม่ล่าสุด', value: 'publishedAt' },
  { id: '3', name: 'ยอดนิยม (วิว)', value: 'stats.viewsCount' },
  { id: '4', name: 'คะแนนสูงสุด', value: 'stats.averageRating' },
  { id: '5', name: 'ถูกใจมากที่สุด', value: 'stats.likesCount' },
  { id: '6', name: 'จำนวนตอนมากที่สุด', value: 'publishedEpisodesCount' },
];

// ตัวเลือกสถานะนิยาย (ปรับ value ให้ตรงกับ NovelStatus enum)
const statusOptions = [
  { id: '1', name: 'ทั้งหมด', value: '' },
  { id: '2', name: 'กำลังเผยแพร่', value: NovelStatus.PUBLISHED },
  { id: '3', name: 'จบแล้ว', value: 'completed' },
  { id: '4', name: 'หยุดพัก', value: NovelStatus.UNPUBLISHED },
];

// --- Interfaces สำหรับข้อมูลที่ Populate และ Lean ---

interface PopulatedAuthor {
  _id: Types.ObjectId;
  username?: string;
  profile?: {
    displayName?: string;
    penName?: string;
    avatarUrl?: string;
  };
}

interface PopulatedCategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  iconUrl?: string;
  color?: string;
}

// Interface สำหรับ Novel แต่ละรายการ (พยายามทำให้เข้ากันได้กับ 'Novel' ที่ SearchResults คาดหวัง)
interface SearchResultNovelCompat {
  _id: string;
  title: string;
  slug: string;
  description: string;         // Map จาก synopsis
  coverImage?: string;        // Map จาก coverImageUrl
  author?: PopulatedAuthor;
  categories: PopulatedCategory[]; // จะถูกสร้างจาก mainThemeCategory (และ subThemes ถ้ามี)
  mainThemeCategory_original?: PopulatedCategory; // เก็บ mainTheme เดิมไว้เผื่อใช้
  status: NovelStatus;
  isPremium: boolean;          // Map จาก monetizationSettings.isPremiumExclusive
  isDiscounted: boolean;       // Map จาก monetizationSettings.activePromotion
  // monetizationSettings ดั้งเดิมเผื่อ components ใหม่ๆ ต้องการใช้
  monetizationSettingsOriginal?: IMonetizationSettings;
  currentEpisodePriceCoins?: number;
  stats: {
    averageRating: number;
    viewsCount: number;
    likesCount: number;
    followersCount: number;
    commentsCount: number;
  };
  publishedEpisodesCount: number;
  isCompleted: boolean;
  updatedAt?: Date;
  publishedAt?: Date;
}

// --- Data Fetching Functions ---

/**
 * ดึงข้อมูลหมวดหมู่หลักทั้งหมด
 * @returns Promise<PopulatedCategory[]> รายการหมวดหมู่หลัก
 */
async function getMainCategories(): Promise<PopulatedCategory[]> {
  try {
    await dbConnect();
    const categories = await CategoryModel.find({
      categoryType: CategoryType.GENRE,
      parentCategoryId: null,
      visibility: CategoryVisibility.PUBLIC,
      isActive: true,
    })
    .sort({ isPromoted: -1, displayOrder: 1, name: 1 })
    .select('_id name slug iconUrl color')
    .lean();
    
    return categories.map(cat => ({...cat, _id: cat._id})); // คืน ObjectId สำหรับ map ภายใน
  } catch (error) {
    console.error('Error fetching main categories:', error);
    return [];
  }
}

/**
 * ค้นหานิยายตามเงื่อนไขต่างๆ
 * @param q คำค้นหา
 * @param categorySlugParam slug ของหมวดหมู่
 * @param statusParam สถานะของนิยาย
 * @param sortBy การเรียงลำดับ
 * @param page หน้าที่ต้องการ
 * @returns Promise<{novels: SearchResultNovelCompat[]; pagination: any}> ผลการค้นหาและข้อมูล pagination
 */
async function searchNovels(
  q: string = '',
  categorySlugParam: string = '',
  statusParam: string = '',
  sortBy: string = 'lastContentUpdatedAt',
  page: number = 1
): Promise<{ novels: SearchResultNovelCompat[]; pagination: any }> {
  try {
    await dbConnect();
    
    // สร้าง query object สำหรับการค้นหา
    const query: any = {
      accessLevel: NovelAccessLevel.PUBLIC,
    };

    // กำหนดเงื่อนไขสถานะ
    if (!statusParam) {
      query.status = { $in: [NovelStatus.PUBLISHED] }; // เริ่มต้นให้แสดงเฉพาะที่ published
      query.isCompleted = { $in: [true, false]}; // ทั้งจบแล้วและยังไม่จบ
    } else if (statusParam === 'completed') {
      query.isCompleted = true;
      query.status = NovelStatus.PUBLISHED;
    } else if (Object.values(NovelStatus).includes(statusParam as NovelStatus)) {
      query.status = statusParam as NovelStatus;
    }

    // กำหนดเงื่อนไขการค้นหาคำสำคัญ
    if (q) {
      const searchRegex = { $regex: q, $options: 'i' };
      query.$or = [
        { title: searchRegex },
        { synopsis: searchRegex },
        { longDescription: searchRegex },
        { "themeAssignment.customTags": { $in: [new RegExp(q, 'i')] } }
      ];
    }

    // กำหนดเงื่อนไขหมวดหมู่
    if (categorySlugParam) {
      const categoryDoc = await CategoryModel.findOne({ slug: categorySlugParam, isActive: true }).select('_id').lean();
      if (categoryDoc) {
        const categoryCondition = {
             $or: [
                { "themeAssignment.mainTheme.categoryId": categoryDoc._id },
                { "themeAssignment.subThemes.categoryId": categoryDoc._id }
            ]
        };
        if (query.$or) {
            query.$and = [ { $or: query.$or } , categoryCondition ];
            delete query.$or; // ลบ $or เก่าถ้ามีการสร้าง $and ใหม่
        } else {
            query.$or = categoryCondition.$or;
        }
      } else {
        // ถ้าไม่พบหมวดหมู่ที่ระบุ ให้คืนผลลัพธ์ว่าง
        return { novels: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, hasNextPage: false, hasPrevPage: false } };
      }
    }

    // กำหนดการเรียงลำดับ
    let sort: Record<string, 1 | -1> = {};
    switch (sortBy) {
      case 'publishedAt':
        sort = { publishedAt: -1 };
        break;
      case 'stats.viewsCount':
        sort = { "stats.viewsCount": -1 };
        break;
      case 'stats.averageRating':
        sort = { "stats.averageRating": -1 };
        break;
      case 'stats.likesCount':
        sort = { "stats.likesCount": -1 };
        break;
      case 'publishedEpisodesCount':
        sort = { publishedEpisodesCount: -1 };
        break;
      case 'lastContentUpdatedAt':
      default:
        sort = { lastContentUpdatedAt: -1 };
        break;
    }
    sort._id = -1; // เพิ่ม secondary sort เพื่อความสม่ำเสมอ

    // นับจำนวนรายการทั้งหมด
    const totalNovels = await NovelModel.countDocuments(query);

    // กำหนด fields ที่ต้องการดึง
    const selectedFields = [
        '_id', 'title', 'slug', 'synopsis', 'coverImageUrl', 'author',
        'themeAssignment.mainTheme.categoryId', // สำหรับ populate mainThemeCategory
        'themeAssignment.subThemes.categoryId', // สำหรับ populate subThemeCategories (ถ้าจะใช้)
        'status', 'monetizationSettings', 'stats', 'publishedEpisodesCount',
        'isCompleted', 'updatedAt', 'publishedAt', 'lastContentUpdatedAt'
    ].join(' ');

    // ดึงข้อมูลนิยายพร้อม populate
    const rawNovels = await NovelModel.find(query)
      .select(selectedFields)
      .sort(sort)
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .populate<{ author: PopulatedAuthor }>({
        path: 'author',
        select: '_id username profile.displayName profile.penName profile.avatarUrl',
        model: UserModel
      })
      .populate<{ mainThemeCategoryPopulated: PopulatedCategory }>({
        path: 'themeAssignment.mainTheme.categoryId',
        select: '_id name slug iconUrl color',
        model: CategoryModel
      })
      // หากต้องการ populate subThemes ด้วย (จะทำให้ query ซับซ้อนขึ้น)
      // .populate<{ subThemesPopulated: { categoryId: PopulatedCategory }[] }>({
      //   path: 'themeAssignment.subThemes.categoryId',
      //   select: '_id name slug iconUrl color',
      //   model: CategoryModel
      // })
      .lean();

    // แปลงข้อมูลให้เข้ากับ interface ที่ต้องการ
    const formattedNovels: SearchResultNovelCompat[] = rawNovels.map((novel: any) => {
      // คำนวณราคาปัจจุบันรวมส่วนลด
      let currentPrice = novel.monetizationSettings?.defaultEpisodePriceCoins ?? 0;
      const promo = novel.monetizationSettings?.activePromotion;
      const now = new Date();
      
      if (
          promo &&
          promo.isActive &&
          promo.promotionalPriceCoins !== undefined &&
          (!promo.promotionStartDate || new Date(promo.promotionStartDate) <= now) &&
          (!promo.promotionEndDate || new Date(promo.promotionEndDate) >= now)
      ) {
          currentPrice = promo.promotionalPriceCoins;
      }

      // ตรวจสอบว่ามีส่วนลดหรือไม่
      const isDiscountedNow = promo?.isActive &&
                             (!promo.promotionStartDate || new Date(promo.promotionStartDate) <= now) &&
                             (!promo.promotionEndDate || new Date(promo.promotionEndDate) >= now);

      // จัดการข้อมูลหมวดหมู่หลัก
      const mainThemeCat = novel.mainThemeCategoryPopulated ? {
          _id: novel.mainThemeCategoryPopulated._id,
          name: novel.mainThemeCategoryPopulated.name,
          slug: novel.mainThemeCategoryPopulated.slug,
          iconUrl: novel.mainThemeCategoryPopulated.iconUrl,
          color: novel.mainThemeCategoryPopulated.color,
      } : undefined;

      // สร้าง array ของหมวดหมู่
      const categoriesArray: PopulatedCategory[] = [];
      if (mainThemeCat) {
        categoriesArray.push(mainThemeCat);
      }
      // ถ้ามีการ populate subThemes สามารถเพิ่มลงใน categoriesArray ได้ที่นี่
      // novel.subThemesPopulated?.forEach(subTheme => {
      //   if (subTheme.categoryId) categoriesArray.push(subTheme.categoryId);
      // });

      return {
        _id: novel._id.toString(),
        title: novel.title,
        slug: novel.slug,
        description: novel.synopsis || '', // Map synopsis to description
        coverImage: novel.coverImageUrl,   // Map coverImageUrl to coverImage
        author: novel.author ? {
          _id: novel.author._id,
          username: novel.author.username,
          profile: novel.author.profile,
        } : undefined,
        categories: categoriesArray, // สร้าง array categories
        mainThemeCategory_original: mainThemeCat,
        status: novel.status,
        isPremium: novel.monetizationSettings?.isPremiumExclusive || false, // Map isPremium
        isDiscounted: isDiscountedNow || false, // Map isDiscounted
        monetizationSettingsOriginal: novel.monetizationSettings,
        currentEpisodePriceCoins: currentPrice,
        stats: {
          averageRating: novel.stats?.averageRating || 0,
          viewsCount: novel.stats?.viewsCount || 0,
          likesCount: novel.stats?.likesCount || 0,
          followersCount: novel.stats?.followersCount || 0,
          commentsCount: novel.stats?.commentsCount || 0,
        },
        publishedEpisodesCount: novel.publishedEpisodesCount || 0,
        isCompleted: novel.isCompleted,
        updatedAt: novel.updatedAt ? new Date(novel.updatedAt) : undefined,
        publishedAt: novel.publishedAt ? new Date(novel.publishedAt) : undefined,
      };
    });

    // คำนวณข้อมูล pagination
    const totalPages = Math.ceil(totalNovels / ITEMS_PER_PAGE);

    return {
      novels: formattedNovels,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalNovels,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    console.error('Error searching novels:', error);
    return {
      novels: [],
      pagination: { currentPage: 1, totalPages: 0, totalItems: 0, hasNextPage: false, hasPrevPage: false }
    };
  }
}

/**
 * ดึงแท็กยอดนิยมจากการ aggregate
 * @returns Promise<{tag: string; count: number}[]> รายการแท็กยอดนิยม
 */
async function getPopularCustomTags() {
  try {
    await dbConnect();
    const popularTags = await NovelModel.aggregate([
      { $match: { status: { $in: [NovelStatus.PUBLISHED, NovelStatus.COMPLETED] }, accessLevel: NovelAccessLevel.PUBLIC } },
      { $unwind: '$themeAssignment.customTags' },
      {
        $group: {
          _id: { $toLower: '$themeAssignment.customTags' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 15 },
      {
        $project: {
          _id: 0,
          tag: '$_id',
          count: 1
        }
      }
    ]);
    return popularTags;
  } catch (error) {
    console.error('Error fetching popular custom tags:', error);
    return [];
  }
}

// Interface สำหรับ props ของหน้า - แก้ไขให้ searchParams เป็น Promise
interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    sortBy?: string;
    page?: string;
  }>;
}

/**
 * หน้าหลักสำหรับการค้นหานิยาย
 * @param props SearchPageProps ที่มี searchParams เป็น Promise
 * @returns JSX.Element หน้าค้นหานิยาย
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  // รอให้ searchParams resolve เนื่องจากเป็น Promise ใน Next.js App Router เวอร์ชันใหม่
  const resolvedSearchParams = await searchParams;
  
  // ดึงค่าพารามิเตอร์จาก URL
  const query = resolvedSearchParams.q || '';
  const categorySlug = resolvedSearchParams.category || '';
  const status = resolvedSearchParams.status || '';
  const sortBy = resolvedSearchParams.sortBy || 'lastContentUpdatedAt';
  const page = parseInt(resolvedSearchParams.page || '1', 10);

  // ตรวจสอบความถูกต้องของหมายเลขหน้า
  if (isNaN(page) || page < 1) {
    notFound();
  }

  // ดึงข้อมูลทั้งหมดแบบ parallel
  const [mainCategoriesData, searchResults, popularCustomTags] = await Promise.all([
    getMainCategories(),
    searchNovels(query, categorySlug, status, sortBy, page),
    getPopularCustomTags()
  ]);

  // แปลง _id ของ mainCategoriesData เป็น string สำหรับ Link key และการเปรียบเทียบ
  const mainCategories = mainCategoriesData.map(cat => ({...cat, _id: cat._id.toString()}));

  const { novels, pagination } = searchResults;
  const hasNoResults = novels.length === 0 && !!query;

  // หาชื่อหมวดหมู่ที่เลือก
  const selectedCategoryName = categorySlug
    ? mainCategories.find(c => c.slug === categorySlug)?.name || categorySlug
    : '';

  return (
    <div className="space-y-6 container mx-auto px-4 py-8">
      {/* ส่วนการค้นหาและตัวกรอง */}
      <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm">
        <div className="grid gap-6">
          {/* แสดงจำนวนผลการค้นหา */}
          {query && (
            <div className="text-sm text-muted-foreground">
              ผลการค้นหาสำหรับ <span className="font-medium text-foreground">&quot;{query}&quot;</span> - พบทั้งหมด {pagination.totalItems} รายการ
            </div>
          )}

          {/* ช่องค้นหา */}
          <div className="mb-2">
            <form method="GET" action="/search/novels" className="flex items-center gap-2">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="ค้นหาชื่อนิยาย, เรื่องย่อ, หรือแท็ก..."
                className="w-full px-3 py-2 bg-input text-foreground rounded-md border border-border focus:border-primary focus:ring-0 transition-colors"
              />
              <input type="hidden" name="category" value={categorySlug} />
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="sortBy" value={sortBy} />
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                ค้นหา
              </button>
            </form>
          </div>

          {/* Breadcrumb - แสดงเส้นทางการนำทาง */}
          {selectedCategoryName && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Link href="/search/novels" className="hover:text-foreground">
                หมวดหมู่ทั้งหมด
              </Link>
              <ChevronRight className="w-4 h-4 mx-1" />
              <span className="font-medium text-foreground">
                {selectedCategoryName}
              </span>
            </div>
          )}

          {/* หมวดหมู่หลัก - แสดงเป็น tabs */}
          {mainCategories.length > 0 && (
            <div className="overflow-x-auto pb-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">เลือกประเภท:</p>
              <div className="flex items-center gap-2 md:gap-3 min-w-max">
                <Link
                  href={`/search/novels?q=${encodeURIComponent(query)}&status=${status}&sortBy=${sortBy}`}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                    ${!categorySlug ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                >
                  ทั้งหมด
                </Link>
                {mainCategories.map((cat) => (
                  <Link
                    key={cat._id} // ใช้ _id ที่เป็น string แล้ว
                    href={`/search/novels?category=${cat.slug}&q=${encodeURIComponent(query)}&status=${status}&sortBy=${sortBy}`}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5
                      ${categorySlug === cat.slug ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                  >
                    {cat.iconUrl && (
                      <img 
                        src={cat.iconUrl} 
                        alt={cat.name} 
                        className="w-4 h-4" 
                        style={cat.color ? { backgroundColor: cat.color, borderRadius: '50%' } : {}} 
                      />
                    )}
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ตัวกรองและการเรียงลำดับ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
            {/* ตัวเลือกการเรียงลำดับ */}
            <div>
              <label htmlFor="sortBySelect" className="block text-sm font-medium text-muted-foreground mb-1">เรียงตาม</label>
              <form method="GET" action="/search/novels" className="flex items-center gap-2">
                <input type="hidden" name="q" value={query} />
                <input type="hidden" name="category" value={categorySlug} />
                <input type="hidden" name="status" value={status} />
                <select
                  id="sortBySelect"
                  name="sortBy"
                  defaultValue={sortBy}
                  className="w-full px-3 py-2 bg-input text-foreground rounded-md border border-border focus:border-primary focus:ring-0 transition-colors"
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                >
                  {sortOptions.map(option => (
                    <option key={option.id} value={option.value}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </form>
            </div>
            
            {/* ตัวเลือกสถานะ */}
            <div>
              <label htmlFor="statusSelect" className="block text-sm font-medium text-muted-foreground mb-1">สถานะ</label>
              <form method="GET" action="/search/novels" className="flex items-center gap-2">
                <input type="hidden" name="q" value={query} />
                <input type="hidden" name="category" value={categorySlug} />
                <input type="hidden" name="sortBy" value={sortBy} />
                <select
                  id="statusSelect"
                  name="status"
                  defaultValue={status}
                  className="w-full px-3 py-2 bg-input text-foreground rounded-md border border-border focus:border-primary focus:ring-0 transition-colors"
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                >
                  {statusOptions.map(option => (
                    <option key={option.id} value={option.value}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* แท็กยอดนิยม */}
      {popularCustomTags.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-3 text-foreground">แท็กยอดนิยม</h2>
          <div className="flex flex-wrap gap-2">
            {popularCustomTags.map((tagItem: { tag: string; count: number }) => (
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
              : 'นิยายทั้งหมด'
          }
          {status && status !== '' && (
            <span className="text-base text-muted-foreground ml-2">
              ({statusOptions.find(s => s.value === status)?.name || status})
            </span>
          )}
        </h2>

        {/* แสดงผลการค้นหาพร้อม Suspense สำหรับการโหลด */}
        <Suspense fallback={<SearchResultsSkeleton />}>
          {hasNoResults ? (
            <NoResultsFound searchTerm={query} />
          ) : (
            <SearchResults
              novels={novels} // ส่ง novels ที่ type เป็น SearchResultNovelCompat[]
              pagination={pagination}
              searchParams={{
                q: query,
                category: categorySlug,
                status,
                sortBy
              }}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
