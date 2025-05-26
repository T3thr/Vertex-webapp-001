// src/components/search/SearchFilters.tsx
'use client'; // ระบุว่าเป็น Client Component

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { PopulatedCategory } from '@/app/search/novels/page'; // Import interface from page

interface SearchFiltersProps {
  initialQuery?: string;
  initialCategorySlug?: string;
  initialStatus?: string;
  initialSortBy?: string;
  mainCategories: PopulatedCategory[];
  selectedCategoryName?: string; // ชื่อหมวดหมู่ที่ถูกเลือก (ถ้ามี)
  totalItems?: number; // จำนวนผลลัพธ์ทั้งหมดที่ตรงกับการค้นหาปัจจุบัน
}

export default function SearchFilters({
  initialQuery = '',
  initialCategorySlug = '',
  initialStatus = '',
  initialSortBy = 'lastContentUpdatedAt',
  mainCategories,
  selectedCategoryName = '',
  totalItems = 0,
}: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategorySlug);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Update state if initial props change (e.g., from URL directly)
  useEffect(() => {
    setQuery(searchParams.get('q') || initialQuery);
    setSelectedCategory(searchParams.get('category') || initialCategorySlug);
    setSelectedStatus(searchParams.get('status') || initialStatus);
    setSortBy(searchParams.get('sortBy') || initialSortBy);
  }, [searchParams, initialQuery, initialCategorySlug, initialStatus, initialSortBy]);

  const handleSearch = (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1'); // Reset to page 1 on new search/filter

    if (query) params.set('q', query);
    else params.delete('q');

    if (selectedCategory) params.set('category', selectedCategory);
    else params.delete('category');

    if (selectedStatus) params.set('status', selectedStatus);
    else params.delete('status');

    if (sortBy) params.set('sortBy', sortBy);
    else params.delete('sortBy');

    router.push(`/search/novels?${params.toString()}`);
    if (isMobileFiltersOpen) setIsMobileFiltersOpen(false);
  };
  
  const handleClearFilters = () => {
    setQuery('');
    setSelectedCategory('');
    setSelectedStatus('');
    // setSortBy('lastContentUpdatedAt'); // Optional: reset sort by or keep current
    const params = new URLSearchParams();
    if (sortBy && sortBy !== 'lastContentUpdatedAt') params.set('sortBy', sortBy); // Keep sortBy if not default
    params.set('page', '1');
    router.push(`/search/novels?${params.toString()}`);
    if (isMobileFiltersOpen) setIsMobileFiltersOpen(false);
  };

  const hasActiveFilters = query || selectedCategory || selectedStatus;

  const filterContent = (
    <form onSubmit={handleSearch} className="space-y-4">
      {/* Search Input */}
      <div>
        <label htmlFor="searchQuery" className="block text-sm font-medium text-muted-foreground mb-1">
          ค้นหานิยาย
        </label>
        <div className="relative">
          <input
            type="text"
            id="searchQuery"
            name="searchQuery"
            className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:ring-primary focus:border-primary shadow-sm bg-input text-foreground placeholder-muted-foreground"
            placeholder="ชื่อนิยาย, ผู้แต่ง, แท็ก..."
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-muted-foreground mb-1">
          หมวดหมู่หลัก
        </label>
        <select
          id="category"
          name="category"
          className="w-full p-2 border border-border rounded-md focus:ring-primary focus:border-primary shadow-sm bg-input text-foreground"
          value={selectedCategory}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {mainCategories.map((cat) => (
            <option key={cat._id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-muted-foreground mb-1">
          สถานะ
        </label>
        <select
          id="status"
          name="status"
          className="w-full p-2 border border-border rounded-md focus:ring-primary focus:border-primary shadow-sm bg-input text-foreground"
          value={selectedStatus}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedStatus(e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          <option value="PUBLISHED">กำลังเผยแพร่</option>
          <option value="ONGOING">กำลังดำเนินเรื่อง (เผยแพร่)</option>
          <option value="COMPLETED">จบแล้ว (เผยแพร่)</option>
          {/* <option value="SCHEDULED">ตั้งเวลาเผยแพร่</option> */}
          {/* <option value="UNPUBLISHED">หยุดพัก/ยกเลิกเผยแพร่</option> */}
        </select>
      </div>

      {/* Sort By Filter */}
      <div>
        <label htmlFor="sortBy" className="block text-sm font-medium text-muted-foreground mb-1">
          เรียงตาม
        </label>
        <select
          id="sortBy"
          name="sortBy"
          className="w-full p-2 border border-border rounded-md focus:ring-primary focus:border-primary shadow-sm bg-input text-foreground"
          value={sortBy}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
        >
          <option value="lastContentUpdatedAt">อัปเดตล่าสุด</option>
          <option value="publishedAt">ตอนใหม่ล่าสุด</option>
          <option value="stats.viewsCount">ยอดนิยม</option>
          <option value="stats.averageRating">คะแนนสูงสุด</option>
          <option value="stats.likesCount">ถูกใจสูงสุด</option>
          {/* <option value="publishedEpisodesCount">จำนวนตอน</option> */}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <button
          type="submit"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSearch(e)}
          className="w-full flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Search className="w-4 h-4 mr-2" />
          ค้นหา
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="w-full flex items-center justify-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
          >
            <X className="w-4 h-4 mr-2" />
            ล้างตัวกรอง
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground text-center pt-2">
        {totalItems > 0 ? `พบ ${totalItems} เรื่อง` : 'ไม่พบผลลัพธ์ที่ตรงกัน'}
      </p>
    </form>
  );

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden md:block bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm">
        {filterContent}
      </div>

      {/* Mobile Filters Button & Drawer */}
      <div className="md:hidden">
        <button
          onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          className="w-full flex items-center justify-center p-3 bg-primary text-primary-foreground rounded-md shadow-sm hover:bg-primary/90 transition-colors mb-4"
        >
          <Filter className="w-5 h-5 mr-2" />
          <span>ตัวกรองและค้นหา</span>
          {isMobileFiltersOpen ? <ChevronUp className="w-5 h-5 ml-auto" /> : <ChevronDown className="w-5 h-5 ml-auto" />}
        </button>
        <AnimatePresence>
          {isMobileFiltersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-card rounded-lg border border-border p-4 shadow-sm overflow-hidden"
            >
              {filterContent}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}