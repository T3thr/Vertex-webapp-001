// src/app/library/page.tsx หรือไฟล์ที่เหมาะสมตามโครงสร้างโปรเจคของคุณ
import FavoriteFilterTabs from '@/components/FavoriteFilterTabs';
import FavoriteItem from '@/components/FavouriteItem';
import FilterTabs from '@/components/FilterTabs';
import LibraryItemCard from '@/components/LibraryItemCard';
import TabNavigation from '@/components/TabNavigation';
import Link from 'next/link';

interface LibraryItem {
  _id: string;
  itemType: string;
  novelId: string;
  title: string;
  author: string;
  coverImage: string;
  statuses: string[];
  views: number;
  likes: number;
  userRating: number;
  readingProgress: {
    overallProgressPercentage: number;
    lastReadAt: string;
  };
  addedAt: string;
}

// Function to fetch library items from API
async function getLibraryItems() {
  // TODO: Implement actual API call to fetch library items
  return [];
}

// แก้ไข Props type ให้สอดคล้องกับ Next.js App Router
// searchParams ถูกส่งเข้ามาเป็น Promise ที่จะ resolve เป็น object ของ query parameters
interface LibraryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// เพิ่มค่าคงที่สำหรับจำนวนรายการต่อหน้า
const ITEMS_PER_PAGE = 6;

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const resolvedSearchParams = await searchParams;
  const tabQueryParam = resolvedSearchParams?.tab;
  const pageQueryParam = resolvedSearchParams?.page;
  const activeTab = Array.isArray(tabQueryParam) ? (tabQueryParam[0] || 'recent') : (tabQueryParam || 'recent');
  const currentPage = Array.isArray(pageQueryParam) 
    ? parseInt(pageQueryParam[0] || '1', 10) 
    : parseInt(pageQueryParam || '1', 10);

  let libraryItems: LibraryItem[] = [];
  let hasMore = false;

  try {
    // ดึงข้อมูลทั้งหมดก่อน
    const allItems = await getLibraryItems();
    
    // คำนวณ index เริ่มต้นและสิ้นสุดสำหรับหน้าปัจจุบัน
    const startIndex = 0;
    const endIndex = currentPage * ITEMS_PER_PAGE;
    
    // ตัดเฉพาะรายการที่ต้องการแสดง
    libraryItems = allItems.slice(startIndex, endIndex);
    
    // ตรวจสอบว่ายังมีรายการที่สามารถโหลดเพิ่มได้หรือไม่
    hasMore = endIndex < allItems.length;
  } catch (error) {
    console.error('Error fetching library items:', error);
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-8">นิยายของฉัน</h1>
          <TabNavigation />
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">
              เกิดข้อผิดพลาด
            </h3>
            <p className="text-muted-foreground">
              ไม่สามารถโหลดรายการนิยายได้ กรุณาลองใหม่ภายหลัง
            </p>
          </div>
        </div>
      </div>
    );
  }

  // สร้าง query string สำหรับหน้าถัดไป
  const nextPageParams = new URLSearchParams();
  nextPageParams.set('tab', activeTab);
  nextPageParams.set('page', (currentPage + 1).toString());
  const nextPageQuery = nextPageParams.toString();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">นิยายของฉัน</h1>
        <TabNavigation />
        {/* Show appropriate FilterTabs based on active tab */}
        {activeTab === 'history' && (
          <div className="mt-6">
            <FilterTabs />
          </div>
        )}
        {activeTab === 'favorites' && (
          <div className="mt-6">
            <FavoriteFilterTabs />
          </div>
        )}
        <div className="space-y-4 mt-6">
          {libraryItems.length > 0 ? (
            libraryItems.map((item) => (
              activeTab === 'favorites' ? (
                <FavoriteItem key={item._id} item={item} />
              ) : (
                <LibraryItemCard key={item._id} item={item} />
              )
            ))
          ) : (
            // ส่วนแสดงเมื่อไม่มีข้อมูล
            <div className="text-center py-12">
              <div className="mx-auto text-muted-foreground mb-4">
                {/* SVG Icon for empty state */}
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 006 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                ไม่พบรายการในห้องสมุด
              </h3>
              <p className="text-muted-foreground mb-4">
                {/* ปรับข้อความตาม activeTab */}
                {activeTab === 'recent' && 'ยังไม่มีนิยายที่ดูล่าสุดในช่วง 30 วันนี้'}
                {activeTab === 'history' && 'ยังไม่มีประวัติการอ่านนิยาย'}
                {activeTab === 'favorites' && 'ยังไม่มีนิยายที่คุณชื่นชอบ'}
                {activeTab !== 'recent' && activeTab !== 'history' && activeTab !== 'favorites' && 'ยังไม่มีนิยายในห้องสมุดของคุณ'}
              </p>
              {/* แสดง Link ค้นหาเฉพาะบาง tab หรือตามเงื่อนไขที่ต้องการ */}
              {(activeTab === 'history' || activeTab === 'favorites' || activeTab === 'recent') && (
                <p className="text-muted-foreground">
                  ลองดูสิ?{' '}
                  <Link href="/search" className="text-primary hover:text-primary/80 hover:underline">
                    ค้นหานิยาย
                  </Link>{' '}
                  ที่น่าสนใจ
                </p>
              )}
            </div>
          )}
        </div>
        {/* แสดงปุ่มโหลดเพิ่มเติมเฉพาะเมื่อยังมีข้อมูลที่สามารถโหลดได้ */}
        {hasMore && (
          <div className="text-center mt-8">
            <Link
              href={`?${nextPageQuery}`}
              className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              โหลดเพิ่มเติม
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}