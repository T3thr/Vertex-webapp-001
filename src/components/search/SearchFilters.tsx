// src/components/search/SearchFilters.tsx
'use client'; 

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { PopulatedCategory } from '@/app/search/novels/page';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchFiltersProps {
  initialQuery?: string;
  mainCategories: PopulatedCategory[];
  subCategories?: PopulatedCategory[]; 
  gameplayCategories?: PopulatedCategory[];
  romanceLineCategories?: PopulatedCategory[];
  characteristicCategories?: PopulatedCategory[];
  selectedCategoryName?: string;
  totalItems?: number;
}

// Reusable Dropdown Component
const FilterDropdown = ({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder: string;
  options: { slug: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
}) => (
  <Select onValueChange={(v) => onChange(v === 'all' ? '' : v)} value={value || 'all'}>
    <SelectTrigger className="w-full md:w-auto md:min-w-[160px] bg-white rounded-full border-gray-300">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">ทั้งหมด</SelectItem>
      {options.map((option) => (
        <SelectItem key={option.slug} value={option.slug}>
          {option.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default function SearchFilters({
  initialQuery = '',
  mainCategories,
  subCategories = [],
  gameplayCategories = [],
  romanceLineCategories = [],
  characteristicCategories = [],
  selectedCategoryName,
  totalItems = 0,
}: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState({
    mainTheme: searchParams.get('mainTheme') || '',
    subTheme: searchParams.get('subTheme') || '',
    gameplay: searchParams.get('gameplay') || '',
    romanceLine: searchParams.get('romanceLine') || '',
    characteristic: searchParams.get('characteristic') || '',
    status: searchParams.get('status') || '',
    sortBy: searchParams.get('sortBy') || 'popularity',
  });

  const handleFilterChange = useCallback((filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  }, []);

  const handleSortChange = (sortByValue: string) => {
    handleFilterChange('sortBy', sortByValue);
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    
    // Set filters to params
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    // Reset to page 1 when filters change
    params.set('page', '1');

    // Debounce router push
    const handler = setTimeout(() => {
      router.push(`/search/novels?${params.toString()}`);
    }, 300); // 300ms delay for better responsiveness

    return () => {
      clearTimeout(handler);
    };
  }, [query, filters, router]);
  
  const statusOptions = [
    { slug: 'PUBLISHED', name: 'กำลังเผยแพร่' },
    { slug: 'ONGOING', name: 'กำลังดำเนินเรื่อง' },
    { slug: 'COMPLETED', name: 'จบแล้ว' },
  ];
  
  const sortOptions = {
    popularity: 'ผลงานที่ได้รับความนิยม',
    latest: 'อัพเดตล่าสุด',
  };

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
        <h1 className="text-3xl font-bold text-gray-800 whitespace-nowrap">หมวดหมู่</h1>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="ค้นหานิยาย ..."
            className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 border-transparent focus:border-gray-300 focus:bg-white focus:ring-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {selectedCategoryName && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center">
          <span className="text-blue-700">
            กำลังแสดงนิยายในหมวดหมู่: <strong>{selectedCategoryName}</strong>
            {totalItems > 0 && <span className="ml-2">({totalItems} เรื่อง)</span>}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        <FilterDropdown
          placeholder="ธีมหลัก"
          options={mainCategories}
          value={filters.mainTheme}
          onChange={(value) => handleFilterChange('mainTheme', value)}
        />
        <FilterDropdown
          placeholder="ธีมรอง"
          options={subCategories}
          value={filters.subTheme}
          onChange={(value) => handleFilterChange('subTheme', value)}
        />
        <FilterDropdown
          placeholder="การเล่น"
          options={gameplayCategories}
          value={filters.gameplay}
          onChange={(value) => handleFilterChange('gameplay', value)}
        />
        <FilterDropdown
          placeholder="เส้นรัก"
          options={romanceLineCategories}
          value={filters.romanceLine}
          onChange={(value) => handleFilterChange('romanceLine', value)}
        />
        <FilterDropdown
          placeholder="ลักษณะ"
          options={characteristicCategories}
          value={filters.characteristic}
          onChange={(value) => handleFilterChange('characteristic', value)}
        />
        <FilterDropdown
          placeholder="สถานะ"
          options={statusOptions}
          value={filters.status}
          onChange={(value) => handleFilterChange('status', value)}
        />
      </div>

      <div className="flex items-center justify-start">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => handleSortChange('popularity')}
                className={`text-sm font-semibold ${filters.sortBy === 'popularity' ? 'text-red-500' : 'text-gray-600 hover:text-red-500'}`}>
                {sortOptions.popularity}
            </button>
            <button 
                onClick={() => handleSortChange('latest')}
                className={`text-sm font-semibold ${filters.sortBy === 'latest' ? 'text-red-500' : 'text-gray-600 hover:text-red-500'}`}>
                {sortOptions.latest}
            </button>
        </div>
      </div>
    </div>
  );
}