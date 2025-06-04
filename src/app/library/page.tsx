// src/app/library/page.tsx หรือไฟล์ที่เหมาะสมตามโครงสร้างโปรเจคของคุณ
import FavoriteItem from '@/components/FavouriteItem'; 
import LibraryItemCard from '@/components/LibraryItemCard'; 
import TabNavigation from '@/components/TabNavigation'; 
import Link from 'next/link';

// Mock data with 3 additional novels for "recent" tab only
const mockLibraryItems = [
  {
    _id: '1',
    itemType: 'novel',
    novelId: 'novel-1',
    title: 'เด้งเนย',
    author: 'ดุงดุง',
    coverImage: 'https://picsum.photos/96/128?random=1',
    statuses: ['reading', 'following'],
    views: 100,
    likes: 200,
    userRating: 4,
    readingProgress: {
      overallProgressPercentage: 45,
      lastReadAt: '2024-01-15T00:00:00.000Z',
    },
    addedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    _id: '2',
    itemType: 'novel',
    novelId: 'novel-2',
    title: 'เงาแห่งจานทรา',
    author: 'สายลมแห่งท้องทุ่ง',
    coverImage: 'https://picsum.photos/96/128?random=2',
    statuses: ['owned', 'finished_reading'],
    views: 250,
    likes: 180,
    userRating: 5,
    readingProgress: {
      overallProgressPercentage: 100,
      lastReadAt: '2024-01-10T00:00:00.000Z',
    },
    addedAt: '2023-12-15T00:00:00.000Z',
  },
  {
    _id: '3',
    itemType: 'novel',
    novelId: 'novel-3',
    title: 'สายหมอกในหุบเขา',
    author: 'น้ำค้างยามเช้า',
    coverImage: 'https://picsum.photos/96/128?random=3',
    statuses: ['reading'],
    views: 150,
    likes: 90,
    userRating: 3,
    readingProgress: {
      overallProgressPercentage: 20,
      lastReadAt: '2024-02-01T00:00:00.000Z',
    },
    addedAt: '2024-01-20T00:00:00.000Z',
  },
  {
    _id: '4',
    itemType: 'novel',
    novelId: 'novel-4',
    title: 'รอยเท้าในสายลม',
    author: 'แสงดาว',
    coverImage: 'https://picsum.photos/96/128?random=4',
    statuses: ['following'],
    views: 80,
    likes: 50,
    userRating: 4,
    readingProgress: {
      overallProgressPercentage: 0,
      lastReadAt: '2023-11-01T00:00:00.000Z',
    },
    addedAt: '2023-10-15T00:00:00.000Z',
  },
  {
    _id: '5',
    itemType: 'novel',
    novelId: 'novel-5',
    title: 'ดวงตะวันสีเงิน',
    author: 'เมฆฝน',
    coverImage: 'https://picsum.photos/96/128?random=5',
    statuses: ['owned', 'reading'],
    views: 300,
    likes: 220,
    userRating: 5,
    readingProgress: {
      overallProgressPercentage: 75,
      lastReadAt: '2024-03-01T00:00:00.000Z',
    },
    addedAt: '2024-02-10T00:00:00.000Z',
  },
  {
    _id: '6',
    itemType: 'novel',
    novelId: 'novel-6',
    title: 'กระซิบแห่งมหาสมุทร',
    author: 'คลื่นทะเล',
    coverImage: 'https://picsum.photos/96/128?random=6',
    statuses: ['finished_reading'],
    views: 120,
    likes: 70,
    userRating: 2,
    readingProgress: {
      overallProgressPercentage: 100,
      lastReadAt: '2023-12-01T00:00:00.000Z',
    },
    addedAt: '2023-11-20T00:00:00.000Z',
  },
  // New novels for "recent" tab only (0% progress to exclude from "history")
  {
    _id: '7',
    itemType: 'novel',
    novelId: 'novel-7',
    title: 'แสงสุดขอบฟ้า',
    author: 'หญ้าสายลม',
    coverImage: 'https://picsum.photos/96/128?random=7',
    statuses: ['following'],
    views: 200,
    likes: 150,
    userRating: 4,
    readingProgress: {
      overallProgressPercentage: 0,
      lastReadAt: '2025-05-28T00:00:00.000Z', // Within 30 days from June 4, 2025
    },
    addedAt: '2025-05-15T00:00:00.000Z',
  },
  {
    _id: '8',
    itemType: 'novel',
    novelId: 'novel-8',
    title: 'สายน้ำแห่งความทรงจำ',
    author: 'เงาไม้',
    coverImage: 'https://picsum.photos/96/128?random=8',
    statuses: ['owned'],
    views: 180,
    likes: 100,
    userRating: 3,
    readingProgress: {
      overallProgressPercentage: 0,
      lastReadAt: '2025-05-20T00:00:00.000Z', // Within 30 days
    },
    addedAt: '2025-05-10T00:00:00.000Z',
  },
  {
    _id: '9',
    itemType: 'novel',
    novelId: 'novel-9',
    title: 'ฝันกลางดวงดาว',
    author: 'ฟ้าคราม',
    coverImage: 'https://picsum.photos/96/128?random=9',
    statuses: ['reading'],
    views: 90,
    likes: 60,
    userRating: 5,
    readingProgress: {
      overallProgressPercentage: 0,
      lastReadAt: '2025-06-01T00:00:00.000Z', // Within 30 days
    },
    addedAt: '2025-05-25T00:00:00.000Z',
  },
];

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

// ฟังก์ชันดึงข้อมูลจำลอง (สามารถเปลี่ยนเป็น API call จริงได้)
async function getLibraryItems(tab: string): Promise<LibraryItem[]> {
  // สร้างสำเนาของ mockLibraryItems เพื่อป้องกันการแก้ไขข้อมูลต้นฉบับโดยตรง
  let filteredItems = [...mockLibraryItems];

  // ฟังก์ชันช่วยสำหรับการเรียงลำดับตาม lastReadAt
  const sortByLastRead = (items: LibraryItem[]) => {
    return items.sort((a, b) => {
      const dateA = new Date(a.readingProgress.lastReadAt);
      const dateB = new Date(b.readingProgress.lastReadAt);
      // ตรวจสอบว่าเป็นวันเวลาที่ถูกต้องหรือไม่ ก่อนทำการเปรียบเทียบ
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateB.getTime() - dateA.getTime(); // เรียงจากใหม่ไปเก่า
      }
      // กรณีที่ dateA ไม่ถูกต้อง ให้จัดลำดับไปท้ายๆ
      if (isNaN(dateA.getTime())) return 1;
      // กรณีที่ dateB ไม่ถูกต้อง ให้จัดลำดับไปท้ายๆ (เทียบกับ a)
      if (isNaN(dateB.getTime())) return -1;
      return 0; // ถ้าทั้งคู่ไม่ถูกต้องหรือไม่สามารถเปรียบเทียบได้
    });
  };

  switch (tab) {
    case 'history':
      filteredItems = filteredItems.filter(
        (item) => item.readingProgress?.overallProgressPercentage > 0
      );
      return sortByLastRead(filteredItems);

    case 'favorites':
      // คัดกรองเฉพาะรายการที่มี userRating ตั้งแต่ 4 ดาวขึ้นไป
      filteredItems = filteredItems.filter(
        (item) => item.userRating >= 4
      );
      // สำหรับ 'favorites' อาจจะไม่จำเป็นต้องเรียงตาม lastReadAt หรือ addedAt
      // หรืออาจจะเรียงตามวันที่เพิ่มเป็น favorite หรือวันที่ให้ rating (ถ้ามีข้อมูล)
      // ในที่นี้จะคืนค่าตามลำดับที่กรองได้ หรือจะเรียงตาม addedAt ก็ได้
      return filteredItems.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());


    case 'recent':
      const thirtyDaysAgo = new Date();
      // ตั้งค่าเวลาปัจจุบันเป็น June 4, 2025 เพื่อให้สอดคล้องกับข้อมูล mock และ comment
      // ในโค้ดจริง บรรทัดนี้ไม่จำเป็นต้องมี เพราะ new Date() จะใช้เวลาปัจจุบันของ server/client อยู่แล้ว
      // thirtyDaysAgo.setFullYear(2025, 5, 4); // เดือนใน JS คือ 0-11, ดังนั้น 5 คือ June
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      filteredItems = filteredItems.filter(
        (item) => new Date(item.readingProgress.lastReadAt) >= thirtyDaysAgo
      );
      return sortByLastRead(filteredItems);

    default:
      // กรณี tab ไม่ตรงกับที่กำหนด หรือเป็น 'all' (ถ้ามี)
      // เรียงตามวันที่เพิ่มเข้าระบบล่าสุด
      return filteredItems.sort((a, b) =>
        new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      );
  }
}

// แก้ไข Props type ให้สอดคล้องกับ Next.js App Router
// searchParams สามารถมี key เป็น string และ value เป็น string, string[] หรือ undefined
interface LibraryPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  // ดึงค่า 'tab' จาก searchParams และตรวจสอบประเภท
  // ถ้า searchParams.tab เป็น array ให้ใช้ตัวแรก หรือถ้าไม่มีค่า ให้เป็น 'recent'
  const tabQueryParam = searchParams?.tab;
  const activeTab = Array.isArray(tabQueryParam) ? (tabQueryParam[0] || 'recent') : (tabQueryParam || 'recent');

  let libraryItems: LibraryItem[] = [];

  try {
    libraryItems = await getLibraryItems(activeTab);
  } catch (error) {
    console.error('Error fetching library items:', error);
    // หน้าแสดงข้อผิดพลาด
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">นิยายของฉัน</h1>
          <TabNavigation /> {/* TabNavigation ยังคงแสดงได้ แม้ข้อมูลจะ error */}
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              เกิดข้อผิดพลาด
            </h3>
            <p className="text-gray-500">
              ไม่สามารถโหลดรายการนิยายได้ กรุณาลองใหม่ภายหลัง
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ส่วนแสดงผลหลัก
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">นิยายของฉัน</h1>
        <TabNavigation />
        <div className="space-y-4">
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
              <div className="mx-auto text-gray-400 mb-4">
                {/* SVG Icon for empty state */}
                <svg
                  className="w-12 h-12"
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ไม่พบรายการในห้องสมุด
              </h3>
              <p className="text-gray-500 mb-4">
                {/* ปรับข้อความตาม activeTab */}
                {activeTab === 'recent' && 'ยังไม่มีนิยายที่ดูล่าสุดในช่วง 30 วันนี้'}
                {activeTab === 'history' && 'ยังไม่มีประวัติการอ่านนิยาย'}
                {activeTab === 'favorites' && 'ยังไม่มีนิยายที่คุณชื่นชอบ'}
                {activeTab !== 'recent' && activeTab !== 'history' && activeTab !== 'favorites' && 'ยังไม่มีนิยายในห้องสมุดของคุณ'}
              </p>
              {/* แสดง Link ค้นหาเฉพาะบาง tab หรือตามเงื่อนไขที่ต้องการ */}
              {(activeTab === 'history' || activeTab === 'favorites' || activeTab === 'recent') && (
                <p className="text-gray-600">
                  ลองดูสิ?{' '}
                  <Link href="/search" className="text-blue-500 hover:underline">
                    ค้นหานิยาย
                  </Link>{' '}
                  ที่น่าสนใจ
                </p>
              )}
            </div>
          )}
        </div>
        {/* ปุ่มโหลดเพิ่มเติม (ถ้ามีข้อมูล) */}
        {libraryItems.length > 0 && (
          <div className="text-center mt-8">
            <button className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              โหลดเพิ่มเติม
            </button>
          </div>
        )}
      </div>
    </div>
  );
}