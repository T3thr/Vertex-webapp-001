// src/components/search/FilterComponents.tsx
'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ประเภทข้อมูลสำหรับ Category
interface Category {
  _id: string;
  name: string;
  slug: string;
  iconUrl?: string;
}

// ประเภทข้อมูลสำหรับตัวเลือกการกรอง
interface FilterOption {
  id: string;
  name: string;
  value: string;
}

// คุณสมบัติของ FilterDropdown
interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedOption: string;
  onChange: (value: string) => void;
}

// ตัวกรองแบบ dropdown
export const FilterDropdown = ({ label, options, selectedOption, onChange }: FilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-dropdown="${label}"]`)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [label]);

  // หาชื่อของตัวเลือกที่เลือกอยู่
  const selectedName = options.find(opt => opt.value === selectedOption)?.name || 'ทั้งหมด';

  return (
    <div className="relative" data-dropdown={label}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 bg-card text-card-foreground rounded-md border border-border hover:border-primary transition-colors duration-200"
      >
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{selectedName}</span>
          <ChevronDown 
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 mt-1 w-full bg-card rounded-md shadow-md border border-border overflow-hidden"
          >
            <div className="py-1 max-h-60 overflow-auto custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-accent/10 transition-colors
                    ${selectedOption === option.value ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  <span>{option.name}</span>
                  {selectedOption === option.value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// คุณสมบัติของ CategorySelector
interface CategorySelectorProps {
  categories: Category[];
  selectedCategory: string;
  onChange: (value: string) => void;
}

// ตัวเลือกหมวดหมู่
export const CategorySelector = ({ categories, selectedCategory, onChange }: CategorySelectorProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onChange('')}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 
          ${!selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
      >
        ทั้งหมด
      </button>
      
      {categories.map((category) => (
        <button
          key={category._id}
          onClick={() => onChange(category.slug)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 flex items-center gap-1.5
            ${selectedCategory === category.slug ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
        >
          {category.iconUrl && (
            <img src={category.iconUrl} alt="" className="w-4 h-4" />
          )}
          {category.name}
        </button>
      ))}
    </div>
  );
};

// คุณสมบัติของ SearchInput
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
}

// ช่องค้นหา
export const SearchInput = ({ value, onChange, onSearch, placeholder = 'ค้นหานิยาย...' }: SearchInputProps) => {
  // กดปุ่ม Enter เพื่อค้นหา
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 pl-10 bg-input text-foreground rounded-md border border-border focus:border-primary focus:ring-0 transition-colors"
      />
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// คุณสมบัติของ ActiveFilters
interface ActiveFiltersProps {
  filters: { id: string; label: string; value: string }[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

// แสดงตัวกรองที่เลือกอยู่
export const ActiveFilters = ({ filters, onRemove, onClearAll }: ActiveFiltersProps) => {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      <span className="text-sm text-muted-foreground">กำลังกรอง:</span>
      
      {filters.map((filter) => (
        <motion.div
          key={filter.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="px-2 py-1 bg-secondary rounded-full flex items-center gap-1 text-sm"
        >
          <span>{filter.label}: {filter.value}</span>
          <button
            onClick={() => onRemove(filter.id)}
            className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      ))}
      
      <button
        onClick={onClearAll}
        className="ml-1 text-sm text-primary hover:underline"
      >
        ล้างทั้งหมด
      </button>
    </div>
  );
};