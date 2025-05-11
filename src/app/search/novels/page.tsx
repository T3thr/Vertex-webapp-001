// src/app/search/novels/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { NovelCard } from "@/components/NovelCard";
import SearchFilters from "@/components/search/SearchFilters";
import Pagination from "@/components/search/SearchPagination";
import { 
  Search, 
  Filter, 
  BookOpen,
  ArrowLeft,
  BookX,
  Tag,
  TagsIcon,
  X
} from "lucide-react";
import Image from "next/image";
import Footer from "@/components/layouts/Footer";

// Type definition for search params
type SearchParams = {
  query?: string;
  categories?: string | string[];
  tags?: string | string[];
  status?: string;
  ageRating?: string;
  isExplicit?: string;
  sort?: string;
  page?: string;
  limit?: string;
};

// Function to fetch novels based on search parameters
async function searchNovels(searchParams: SearchParams) {
  try {
    // Build URL with all search parameters
    const params = new URLSearchParams();
    
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else if (value !== undefined) {
        params.append(key, value);
      }
    });
    
    // Ensure we have default pagination and sort
    if (!params.has('page')) params.set('page', '1');
    if (!params.has('limit')) params.set('limit', '12');
    if (!params.has('sort')) params.set('sort', 'trending');
    
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/search/novels?${params.toString()}`;
    console.log(`📡 Searching novels from: ${apiUrl}`);
    
    const res = await fetch(apiUrl, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds for fresh results
    });
    
    if (!res.ok) {
      throw new Error(`Failed to search novels (HTTP ${res.status})`);
    }
    
    const data = await res.json();
    console.log(`✅ Received ${data.novels?.length || 0} novels for search`);
    
    return data;
  } catch (error: any) {
    console.error(`❌ Error searching novels:`, error.message);
    return { 
      novels: [], 
      categories: [], 
      popularTags: [],
      pagination: { total: 0, page: 1, limit: 12, totalPages: 0 } 
    };
  }
}

// NovelCardSkeleton for loading state
function NovelCardSkeleton() {
  return (
    <div className="animate-pulse h-full">
      <div className="bg-card rounded-xl shadow-md overflow-hidden h-full">
        <div className="aspect-[2/3] w-full bg-secondary"></div>
        <div className="p-3">
          <div className="h-4 bg-secondary rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-secondary rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-secondary rounded w-full mt-4"></div>
        </div>
      </div>
    </div>
  );
}

// Component to render the active filters with clear buttons
function ActiveFilters({ 
  query, 
  selectedCategories = [], 
  selectedTags = [], 
  categories, 
  onClear 
}: { 
  query?: string;
  selectedCategories: string[];
  selectedTags: string[];
  categories: any[];
  onClear: (type: 'query' | 'category' | 'tag', value?: string) => void;
}) {
  if (!query && selectedCategories.length === 0 && selectedTags.length === 0) {
    return null;
  }
  
  // Find category names from IDs
  const getCategoryName = (id: string) => {
    // Check in top-level categories
    const topCategory = categories.find(cat => cat._id === id);
    if (topCategory) return topCategory.name;
    
    // Check in child categories
    for (const parent of categories) {
      if (parent.children) {
        const child = parent.children.find((child: any) => child._id === id);
        if (child) return child.name;
      }
    }
    
    return id;
  };
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {query && (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-full text-xs">
          <Search size={12} />
          {query}
          <button 
            onClick={() => onClear('query')}
            className="ml-1 hover:text-primary"
            aria-label="ล้างคำค้นหา"
          >
            <X size={14} />
          </button>
        </span>
      )}
      
      {selectedCategories.map(catId => (
        <span key={catId} className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-full text-xs">
          <TagsIcon size={12} />
          {getCategoryName(catId)}
          <button 
            onClick={() => onClear('category', catId)}
            className="ml-1 hover:text-primary"
            aria-label={`ลบหมวดหมู่ ${getCategoryName(catId)}`}
          >
            <X size={14} />
          </button>
        </span>
      ))}
      
      {selectedTags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-full text-xs">
          <Tag size={12} />
          {tag}
          <button 
            onClick={() => onClear('tag', tag)}
            className="ml-1 hover:text-primary"
            aria-label={`ลบแท็ก ${tag}`}
          >
            <X size={14} />
          </button>
        </span>
      ))}
    </div>
  );
}

// Main search page component
export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Process search parameters
  const query = searchParams.query;
  const selectedCategories = Array.isArray(searchParams.categories) 
    ? searchParams.categories 
    : searchParams.categories ? [searchParams.categories] : [];
  const selectedTags = Array.isArray(searchParams.tags) 
    ? searchParams.tags 
    : searchParams.tags ? [searchParams.tags] : [];
  const currentPage = parseInt(searchParams.page || '1', 10);
  
  // Fetch search results
  const { novels, categories, popularTags, pagination } = await searchNovels(searchParams);
  
  return (
    <div>
      <main className="pb-16 min-h-[80vh]">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
          {/* Search page header */}
          <div className="mb-8 animate-fadeIn">
            <Link 
              href="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft size={14} />
              กลับไปหน้าหลัก
            </Link>
            
            <div className="flex items-center gap-2">
              <Search className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">ค้นหานิยาย</h1>
            </div>
            
            <p className="text-muted-foreground mt-1">
              ค้นหานิยายจากหมวดหมู่ แท็ก และคำสำคัญต่างๆ
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar with filters */}
            <aside className="w-full md:w-64 lg:w-72 shrink-0">
              <div className="sticky top-24 bg-card rounded-xl shadow-sm border border-border p-4 animate-fadeIn">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Filter className="text-primary" size={18} />
                  ตัวกรองค้นหา
                </h2>
                
                <Suspense fallback={<div className="h-96 bg-secondary animate-pulse rounded-lg"></div>}>
                  <SearchFilters 
                    categories={categories} 
                    popularTags={popularTags}
                    selectedCategories={selectedCategories}
                    selectedTags={selectedTags}
                    searchParams={searchParams}
                  />
                </Suspense>
              </div>
            </aside>
            
            {/* Main content */}
            <div className="flex-1 animate-fadeIn">
              {/* Search info and active filters */}
              <div className="mb-6">
                <ActiveFilters
                  query={query}
                  selectedCategories={selectedCategories}
                  selectedTags={selectedTags}
                  categories={categories}
                  onClear={(type, value) => {
                    // This is just for display; the actual clearing happens in the client component
                    console.log('Clear filter:', type, value);
                  }}
                />
                
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    พบนิยาย <span className="font-medium text-foreground">{pagination.total}</span> เรื่อง
                  </p>
                </div>
              </div>
              
              {/* Novel grid */}
              {novels.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-8">
                  {novels.map((novel: any) => (
                    <NovelCard key={novel._id} novel={novel} />
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center">
                  <BookX size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">ไม่พบนิยายที่ตรงกับเงื่อนไข</h3>
                  <p className="text-muted-foreground">
                    ลองเปลี่ยนคำค้นหาหรือตัวกรองเพื่อดูผลลัพธ์เพิ่มเติม
                  </p>
                </div>
              )}
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <Pagination 
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  searchParams={searchParams}
                />
              )}
              
              {/* Featured novels if no search results and no filters */}
              {novels.length === 0 && !query && selectedCategories.length === 0 && selectedTags.length === 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">นิยายแนะนำ</h3>
                  
                  <Suspense fallback={
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <NovelCardSkeleton key={i} />
                      ))}
                    </div>
                  }>
                    {/* You can fetch featured novels here */}
                    <p className="text-muted-foreground">
                      เลือกหมวดหมู่หรือค้นหาเพื่อเริ่มต้น
                    </p>
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}