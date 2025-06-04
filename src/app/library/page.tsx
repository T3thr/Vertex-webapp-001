import FavoriteItem from '@/components/FavouriteItem';
import LibraryItemCard from '@/components/LibraryItemCard';
import TabNavigation from '@/components/TapNavigation';
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

async function getLibraryItems(tab: string): Promise<LibraryItem[]> {
  let filteredItems = [...mockLibraryItems];

  const sortByLastRead = (items: LibraryItem[]) => {
    return items.sort((a, b) => {
      const dateA = new Date(a.readingProgress.lastReadAt);
      const dateB = new Date(b.readingProgress.lastReadAt);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateB.getTime() - dateA.getTime();
      }
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return 0;
    });
  };

  switch (tab) {
    case 'history':
      filteredItems = filteredItems.filter(
        (item) => item.readingProgress?.overallProgressPercentage > 0
      );
      return sortByLastRead(filteredItems);

    case 'favorites':
      filteredItems = filteredItems.filter(
        (item) => item.userRating >= 4
      );
      return filteredItems;

    case 'recent':
      // Filter items read within the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // June 4, 2025 - 30 days = May 5, 2025
      filteredItems = filteredItems.filter(
        (item) => new Date(item.readingProgress.lastReadAt) >= thirtyDaysAgo
      );
      return sortByLastRead(filteredItems);

    default:
      return filteredItems.sort((a, b) =>
        new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      );
  }
}

export default async function LibraryPage({ searchParams }: { searchParams: { tab?: string } }) {
  const activeTab = searchParams.tab || 'recent';
  let libraryItems: LibraryItem[] = [];

  try {
    libraryItems = await getLibraryItems(activeTab);
  } catch (error) {
    console.error('Error fetching library items:', error);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">นิยายของฉัน</h1>
          <TabNavigation />
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
            <div className="text-center py-12">
              <div className="mx-auto text-gray-400 mb-4">
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
                ยังไม่มีนิยายในห้องสมุดของคุณ
              </p>
              {activeTab === 'history' && (
                <p className="text-gray-600">
                  ถ้าหาไม่เจอ สามารถ{' '}
                  <Link href="/search" className="text-blue-500 hover:underline">
                    ค้นหานิยาย
                  </Link>{' '}
                  ได้
                </p>
              )}
            </div>
          )}
        </div>
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