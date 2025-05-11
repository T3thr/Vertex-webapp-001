'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import SearchFilters from './SearchFilters';

interface MobileFiltersProps {
  categories: any[];
  popularTags: string[];
  selectedCategories: string[];
  selectedTags: string[];
  searchParams: Record<string, string | string[] | undefined>;
}

export default function MobileFilters({
  categories,
  popularTags,
  selectedCategories,
  selectedTags,
  searchParams,
}: MobileFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Count active filters
  const activeFiltersCount = [
    selectedCategories.length > 0,
    selectedTags.length > 0,
    !!searchParams.status,
    !!searchParams.ageRating,
    !!searchParams.isExplicit,
  ].filter(Boolean).length;
  
  return (
    <>
      {/* Filter toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden flex items-center gap-2 bg-card border border-border rounded-lg p-3 shadow-sm"
      >
        <Filter size={18} />
        <span className="font-medium">ตัวกรอง</span>
        {activeFiltersCount > 0 && (
          <span className="ml-1 bg-primary text-primary-foreground rounded-full text-xs px-2 py-0.5">
            {activeFiltersCount}
          </span>
        )}
      </button>
      
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex md:hidden">
          {/* Filters panel */}
          <div className="fixed inset-x-0 bottom-0 h-[80vh] bg-background rounded-t-xl shadow-lg border-t border-border p-4 animate-slideIn overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Filter className="text-primary" size={18} />
                ตัวกรอง
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 hover:bg-secondary transition-colors"
                aria-label="ปิด"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Scrollable content */}
            <div className="overflow-y-auto pr-2 h-[calc(80vh-80px)] auth-modal-scrollbar">
              <SearchFilters
                categories={categories}
                popularTags={popularTags}
                selectedCategories={selectedCategories}
                selectedTags={selectedTags}
                searchParams={searchParams}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}