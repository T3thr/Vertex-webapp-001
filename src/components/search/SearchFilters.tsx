// src/components/search/SearchFilters.tsx
'use client'; // นี่คือ Client Component

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

// สมมติว่า PopulatedCategory ถูก export จาก page.tsx หรือไฟล์ types กลาง
// หากไม่ ให้ย้าย interface นี้ไปไว้ในไฟล์ types ที่สามารถแชร์ได้
interface PopulatedCategoryForFilter {
  _id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  color?: string;
}

// ค่าคงที่สำหรับตัวเลือกการเรียงลำดับและสถานะ (ควรตรงกับใน page.tsx)
const sortOptions = [
  { id: '1', name: 'อัปเดตล่าสุด', value: 'lastContentUpdatedAt' },
  { id: '2', name: 'ออกใหม่ล่าสุด', value: 'publishedAt' },
  { id: '3', name: 'ยอดนิยม (วิว)', value: 'stats.viewsCount' },
  { id: '4', name: 'คะแนนสูงสุด', value: 'stats.averageRating' },
  { id: '5', name: 'ถูกใจมากที่สุด', value: 'stats.likesCount' },
  { id: '6', name: 'จำนวนตอนมากที่สุด', value: 'publishedEpisodesCount' },
];

const statusOptions = [
  { id: '1', name: 'ทั้งหมด', value: '' },
  { id: '2', name: 'กำลังเผยแพร่', value: 'PUBLISHED' }, // ควรตรงกับค่าใน NovelStatus enum
  { id: '3', name: 'จบแล้ว', value: 'completed' }, // 'completed' เป็นค่าพิเศษที่ API จัดการ
  { id: '4', name: 'หยุดพัก', value: 'UNPUBLISHED' }, // ควรตรงกับค่าใน NovelStatus enum
];

interface SearchFiltersProps {
  query: string;
  categorySlug: string;
  status: string;
  sortBy: string;
  mainCategories: PopulatedCategoryForFilter[];
  selectedCategoryName: string;
  totalItems: number;
}

export default function SearchFilters({
  query,
  categorySlug,
  status,
  sortBy,
  mainCategories,
  selectedCategoryName,
  totalItems,
}: SearchFiltersProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();

  // ฟังก์ชันสำหรับอัปเดต URL เมื่อมีการเปลี่ยนแปลง filter
  const handleFilterChange = (newParams: Record<string, string>) => {
    const updatedParams = new URLSearchParams(currentSearchParams.toString());
    for (const key in newParams) {
      if (newParams[key]) {
        updatedParams.set(key, newParams[key]);
      } else {
        updatedParams.delete(key);
      }
    }
    updatedParams.set('page', '1'); // กลับไปหน้า 1 เสมอเมื่อเปลี่ยน filter
    router.push(`/search/novels?${updatedParams.toString()}`);
  };

  // ฟังก์ชันสำหรับจัดการการ submit ของ search form
  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newQuery = formData.get('q') as string;
    // ส่งค่า q ไปพร้อมกับ filter อื่นๆ ที่อาจมีอยู่
    const updatedParams = new URLSearchParams(currentSearchParams.toString());
    updatedParams.set('q', newQuery);
    updatedParams.set('page', '1'); // กลับไปหน้า 1
    router.push(`/search/novels?${updatedParams.toString()}`);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm">
      <div className="grid gap-6">
        {/* แสดงผลการค้นหา */}
        {(query || categorySlug) && ( // แสดงเมื่อมี query หรือ categorySlug
          <div className="text-sm text-muted-foreground">
            {query && <>ผลการค้นหาสำหรับ <span className="font-medium text-foreground">&quot;{query}&quot;</span> - </>}
            พบทั้งหมด {totalItems} รายการ
          </div>
        )}

        {/* Search Input Form */}
        <div className="mb-2">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <input
              type="text"
              name="q" // ชื่อ input สำหรับ form data
              defaultValue={query}
              placeholder="ค้นหาชื่อนิยาย, เรื่องย่อ, หรือแท็ก..."
              className="w-full px-3 py-2 bg-input text-foreground rounded-md border border-border focus:border-primary focus:ring-0 transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              ค้นหา
            </button>
          </form>
        </div>

        {/* Breadcrumb สำหรับ Category */}
        {selectedCategoryName && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Link
              href={`/search/novels?${new URLSearchParams({ q: query, status, sortBy }).toString()}`}
              className="hover:text-foreground"
            >
              หมวดหมู่ทั้งหมด
            </Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="font-medium text-foreground">{selectedCategoryName}</span>
          </div>
        )}

        {/* Main Categories Filter */}
        {mainCategories.length > 0 && (
          <div className="overflow-x-auto pb-2">
            <p className="text-sm font-medium text-muted-foreground mb-2">เลือกประเภท:</p>
            <div className="flex items-center gap-2 md:gap-3 min-w-max">
              <Link
                href={`/search/novels?${new URLSearchParams({ q: query, status, sortBy }).toString()}`}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  !categorySlug ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                ทั้งหมด
              </Link>
              {mainCategories.map((cat) => (
                <Link
                  key={cat._id}
                  href={`/search/novels?${new URLSearchParams({ category: cat.slug, q: query, status, sortBy }).toString()}`}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    categorySlug === cat.slug ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {cat.iconUrl && (
                    <img
                      src={cat.iconUrl}
                      alt={cat.name}
                      className="w-4 h-4"
                      style={cat.color ? { backgroundColor: cat.color, borderRadius: '4px' } : {}}
                    />
                  )}
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sort and Status Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <label htmlFor="sortBySelect" className="block text-sm font-medium text-muted-foreground mb-1">
              เรียงตาม
            </label>
            <select
              id="sortBySelect"
              name="sortBy"
              value={sortBy} // Controlled component
              className="w-full px-3 py-2 bg-input text-foreground rounded-md border border-border focus:border-primary focus:ring-0 transition-colors"
              onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="statusSelect" className="block text-sm font-medium text-muted-foreground mb-1">
              สถานะ
            </label>
            <select
              id="statusSelect"
              name="status"
              value={status} // Controlled component
              className="w-full px-3 py-2 bg-input text-foreground rounded-md border border-border focus:border-primary focus:ring-0 transition-colors"
              onChange={(e) => handleFilterChange({ status: e.target.value })}
            >
              {statusOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}