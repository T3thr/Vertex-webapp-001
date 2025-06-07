"use client";

import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface FilterTab {
  id: string;
  label: string;
}

const filterTabs: FilterTab[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'novel', label: 'บรรยาย ' },
  { id: 'comic', label: 'แชท' },
  { id: 'fiction', label: 'บทความ' },
  { id: 'non-fiction', label: 'การ์ตูน' },
  { id: 'poetry', label: 'กระทู้' },
];

interface FilterTabsProps {
  activeTab?: string;
  className?: string;
}

const FilterTabs = ({ className }: FilterTabsProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams?.get('filter') || 'all';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (filterId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (filterId === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filterId);
    }
    router.push(`?${params.toString()}`);
    setIsOpen(false);
  };

  const getCurrentLabel = () => {
    return filterTabs.find(tab => tab.id === currentFilter)?.label || 'ทั้งหมด';
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg",
          "bg-background border border-border",
          "text-sm text-foreground hover:bg-muted transition-colors"
        )}
      >
        <span>กรอง: {getCurrentLabel()}</span>
        <ChevronDown
          size={16}
          className={cn(
            "transition-transform duration-200",
            isOpen && "transform rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-48 mt-2 py-2 bg-background border border-border rounded-lg shadow-lg">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={cn(
                "w-full px-4 py-2 text-sm text-left transition-colors",
                "hover:bg-muted",
                currentFilter === tab.id
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterTabs; 