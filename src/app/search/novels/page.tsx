'use server'
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Types } from 'mongoose';

// การใช้ dynamic import เพื่อแยกและลดภาระในการโหลด
const SearchResults = dynamic(() => import('@/components/search/SearchResults'), {
  loading: () => <SearchResultsSkeleton />
});

// Models
import dbConnect from '@/backend/lib/mongodb';
import CategoryModel from '@/backend/models/Category';
import NovelModel from '@/backend/models/Novel';
import UserModel from '@/backend/models/User'; // เพิ่มการ import UserModel

// Components
import { NoResultsFound } from '@/components/search/ErrorStates';
import SearchResultsSkeleton from '@/components/search/SearchResultsSkeleton';

// สำหรับการแบ่งหน้าและ sorting options
const ITEMS_PER_PAGE = 20;
const sortOptions = [
  { id: '1', name: 'อัปเดตล่าสุด', value: 'lastUpdated' },
  { id: '2', name: 'ใหม่ล่าสุด', value: 'newest' },
  { id: '3', name: 'ยอดนิยม', value: 'popularity' },
  { id: '4', name: 'คะแนนสูงสุด', value: 'rating' },
  { id: '5', name: 'ถูกใจมากที่สุด', value: 'mostLiked' },
  { id: '6', name: 'จำนวนตอนมากที่สุด', value: 'mostEpisodes' },
];

const statusOptions = [
  { id: '1', name: 'ทั้งหมด', value: '' },
  { id: '2', name: 'กำลังเผยแพร่', value: 'published' },
  { id: '3', name: 'จบแล้ว', value: 'completed' },
  { id: '4', name: 'หยุดชั่วคราว', value: 'onHiatus' },
];

// Interface สำหรับผลลัพธ์ของ author หลัง populate
interface PopulatedAuthor {
  _id: Types.ObjectId;
  username: string;
  profile?: {
    displayName?: string;
  };
}

// Interface สำหรับผลลัพธ์ของ category หลัง populate
interface PopulatedCategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
}

// Interface สำหรับผลลัพธ์ของ novel หลัง lean และ populate
interface LeanNovel {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  author: PopulatedAuthor;
  categories: PopulatedCategory[];
  status: 'draft' | 'published' | 'completed' | 'onHiatus' | 'archived';
  isPremium: boolean;
  isDiscounted: boolean;
  averageRating: number;
  viewsCount: number;
  likesCount: number;
  publishedEpisodesCount: number;
  [key: string]: any; // สำหรับฟิลด์อื่นๆ ที่อาจมีใน INovel
}

// ฟังก์ชันสำหรับดึงข้อมูลหมวดหมู่
async function getCategories() {
  try {
    await dbConnect();
    const Category = CategoryModel();
    
    // ดึงหมวดหมู่หลักที่เป็นประเภท genre
    const categories = await Category.find({
      categoryType: 'genre',
      level: 0, // หมวดหมู่ระดับบนสุด
      isVisible: true,
      isDeleted: false
    })
    .sort({ isFeatured: -1, displayOrder: 1 })
    .select('_id name slug iconUrl')
    .lean();
    
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

// ฟังก์ชันสำหรับค้นหานิยาย
async function searchNovels(
  q: string = '',
  category: string = '',
  status: string = '',
  sortBy: string = 'lastUpdated',
  page: number = 1
) {
  try {
    await dbConnect();
    const Novel = NovelModel();
    UserModel(); // เรียก UserModel เพื่อลงทะเบียน schema
    
    // สร้างเงื่อนไขการค้นหา
    const query: any = {
      status: status || { $in: ['published', 'completed', 'onHiatus'] },
      visibility: 'public',
      isDeleted: false
    };
    
    // ค้นหาด้วยข้อความ
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }
    
    // กรองตามหมวดหมู่
    if (category) {
      try {
        const Category = CategoryModel();
        const categoryDoc = await Category.findOne({ slug: category, isDeleted: false });
        if (categoryDoc) {
          query.categories = categoryDoc._id;
        }
      } catch (error) {
        console.error('Error finding category:', error);
      }
    }
    
    // กำหนดการเรียงลำดับ
    let sort: any = {};
    
    switch (sortBy) {
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'popularity':
        sort = { viewsCount: -1 };
        break;
      case 'rating':
        sort = { averageRating: -1 };
        break;
      case 'mostLiked':
        sort = { likesCount: -1 };
        break;
      case 'mostEpisodes':
        sort = { publishedEpisodesCount: -1 };
        break;
      case 'lastUpdated':
      default:
        sort = { lastSignificantUpdateAt: -1 };
        break;
    }
    
    // ดึงจำนวนนิยายทั้งหมดที่ตรงกับเงื่อนไข
    const totalNovels = await Novel.countDocuments(query);
    
    // ดึงข้อมูลนิยายจากฐานข้อมูล
    const novels = await Novel.find(query)
      .sort(sort)
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .populate('author', '_id username profile.displayName')
      .populate('categories', '_id name slug')
      .lean() as unknown as LeanNovel[];
    
    // แปลงข้อมูลให้ตรงกับ type Novel
    const formattedNovels = novels.map(novel => ({
      ...novel,
      _id: novel._id.toString(),
      // แปลง author ให้มีโครงสร้างตาม interface Novel
      author: {
        _id: novel.author._id.toString(),
        username: novel.author.username || 'Unknown',
        profile: novel.author.profile || { displayName: undefined }
      },
      // แปลง categories ให้มีโครงสร้างตาม interface Novel
      categories: Array.isArray(novel.categories)
        ? novel.categories.map((cat) => ({
            _id: cat._id.toString(),
            name: cat.name || '',
            slug: cat.slug || ''
          }))
        : []
    }));
    
    // คำนวณข้อมูลการแบ่งหน้า
    const totalPages = Math.ceil(totalNovels / ITEMS_PER_PAGE);
    
    return {
      novels: formattedNovels, // ส่ง novels ที่แปลงข้อมูลแล้ว
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
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }
}

// ฟังก์ชันสำหรับดึงข้อมูลแท็กยอดนิยม
async function getPopularTags() {
  try {
    await dbConnect();
    const Novel = NovelModel();
    
    // คำสั่ง aggregation เพื่อค้นหาแท็กที่นิยม
    const popularTags = await Novel.aggregate([
      // กรองเฉพาะนิยายที่เผยแพร่แล้วและไม่ถูกลบ
      { $match: { status: { $in: ['published', 'completed'] }, visibility: 'public', isDeleted: false } },
      
      // แตกอาร์เรย์แท็กเป็นเอกสารแยก
      { $unwind: '$tags' },
      
      // จัดกลุ่มตามแท็กและนับจำนวน
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      
      // เรียงลำดับตามจำนวนมากไปน้อย
      { $sort: { count: -1 } },
      
      // จำกัดจำนวนผลลัพธ์
      { $limit: 15 },
      
      // จัดรูปแบบผลลัพธ์
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
    console.error('Error fetching popular tags:', error);
    return [];
  }
}

// หน้าค้นหานิยาย
interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    sortBy?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  // แปลง params จาก URL
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || '';
  const category = resolvedSearchParams.category || '';
  const status = resolvedSearchParams.status || '';
  const sortBy = resolvedSearchParams.sortBy || 'lastUpdated';
  const page = parseInt(resolvedSearchParams.page || '1', 10);
  
  // ตรวจสอบการแบ่งหน้าที่ไม่ถูกต้อง
  if (isNaN(page) || page < 1) {
    notFound();
  }
  
  // ดึงข้อมูลพร้อมกันด้วย Promise.all
  const [categories, searchResults, popularTags] = await Promise.all([
    getCategories(),
    searchNovels(query, category, status, sortBy, page),
    getPopularTags()
  ]);
  
  const { novels, pagination } = searchResults;
  const hasNoResults = novels.length === 0;

  return (
    <div className="space-y-6">
      {/* ส่วนการค้นหาและตัวกรอง */}
      <div className="bg-card rounded-lg border border-border p-4 md:p-6">
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
                placeholder="ค้นหาชื่อนิยาย ผู้เขียน หรือแท็ก..."
                className="w-full px-3 py-2 bg-input text-foreground rounded-md border border-border focus:border-primary focus:ring-0 transition-colors"
              />
              <input type="hidden" name="category" value={category} />
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
          
          {/* Breadcrumb สำหรับหมวดหมู่ที่เลือก */}
          {category && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Link href="/search/novels" className="hover:text-foreground">
                หมวดหมู่ทั้งหมด
              </Link>
              <ChevronRight className="w-4 h-4 mx-1" />
              <span className="font-medium text-foreground">
                {categories.find(c => c.slug === category)?.name || category}
              </span>
            </div>
          )}
          
          {/* หมวดหมู่ */}
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-max">
              <Link
                href="/search/novels"
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                  ${!category ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
              >
                ทั้งหมด
              </Link>
              
              {categories.map((cat) => (
                <Link
                  key={cat._id.toString()} // แปลง _id เป็น string เพื่อให้ตรงกับ type ของ key
                  href={`/search/novels?category=${cat.slug}${status ? `&status=${status}` : ''}${sortBy ? `&sortBy=${sortBy}` : ''}`}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5
                    ${category === cat.slug ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                >
                  {cat.iconUrl && (
                    <img src={cat.iconUrl} alt="" className="w-4 h-4" />
                  )}
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
          
          {/* ตัวกรองและการเรียงลำดับ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* เรียงตาม */}
            <div>
              <label className="block text-sm mb-1">เรียงตาม</label>
              <form method="GET" action="/search/novels" className="flex items-center gap-2">
                <input type="hidden" name="q" value={query} />
                <input type="hidden" name="category" value={category} />
                <input type="hidden" name="status" value={status} />
                <select
                  name="sortBy"
                  defaultValue={sortBy}
                  className="w-full px-3 py-2 bg-input text-foreground rounded-md border border-border focus:border-primary focus:ring-0 transition-colors"
                >
                  {sortOptions.map(option => (
                    <option key={option.id} value={option.value}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  ใช้
                </button>
              </form>
            </div>
            
            {/* สถานะ */}
            <div>
              <label className="block text-sm mb-1">สถานะ</label>
              <form method="GET" action="/search/novels" className="flex items-center gap-2">
                <input type="hidden" name="q" value={query} />
                <input type="hidden" name="category" value={category} />
                <input type="hidden" name="sortBy" value={sortBy} />
                <select
                  name="status"
                  defaultValue={status}
                  className="w-full px-3 py-2 bg-input text-foreground rounded-md border border-border focus:border-primary focus:ring-0 transition-colors"
                >
                  {statusOptions.map(option => (
                    <option key={option.id} value={option.value}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  ใช้
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* แท็กยอดนิยม */}
      {popularTags.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-3">แท็กยอดนิยม</h2>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag: { tag: string; count: number }) => (
              <Link
                key={tag.tag}
                href={`/search/novels?q=${encodeURIComponent(tag.tag)}`}
                className="px-3 py-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full text-sm transition-colors"
              >
                {tag.tag} ({tag.count})
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ผลการค้นหา */}
      <div className="bg-card rounded-lg border border-border p-4 md:p-6">
        <h2 className="text-xl font-semibold mb-6">
          {query 
            ? `ผลการค้นหา "${query}"`
            : category
              ? `นิยายในหมวดหมู่ ${categories.find(c => c.slug === category)?.name || category}`
              : 'นิยายทั้งหมด'
          }
        </h2>
        
        <Suspense fallback={<SearchResultsSkeleton />}>
          {hasNoResults ? (
            <NoResultsFound searchTerm={query} />
          ) : (
            <SearchResults 
              novels={novels} 
              pagination={pagination}
              searchParams={{
                q: query,
                category,
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