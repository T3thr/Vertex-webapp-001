// src/components/search/SearchFilters.tsx

'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  ChevronDown, 
  ChevronUp, 
  X, 
  Sparkles, 
  Clock, 
  Star, 
  Eye,
  Tag,
  BookOpen, 
  Check
} from 'lucide-react';
import Image from 'next/image';

// Types
interface Category {
  _id: string;
  name: string;
  slug: string;
  level: number;
  iconUrl?: string;
  themeColor?: string;
  isFeatured?: boolean;
  children?: Category[];
}

interface SearchFiltersProps {
  categories: Category[];
  popularTags: string[];
  selectedCategories: string[];
  selectedTags: string[];
  searchParams: Record<string, string | string[] | undefined>;
}

export default function SearchFilters({
  categories,
  popularTags,
  selectedCategories,
  selectedTags,
  searchParams,
}: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  
  // Track expanded sections in the filter UI
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    status: true,
    rating: false,
    tags: true,
    sort: true,
  });
  
  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };
  
  // Update search params and navigate
  const updateSearch = (
    key: string, 
    value: string | string[], 
    action: 'add' | 'remove' | 'set' | 'toggle'
  ) => {
    const newParams = new URLSearchParams();
    
    // Copy existing params
    Object.entries(searchParams).forEach(([paramKey, paramValue]) => {
      if (paramKey === key) return; // Skip the param we're updating
      
      if (Array.isArray(paramValue)) {
        paramValue.forEach(v => newParams.append(paramKey, v));
      } else if (paramValue !== undefined) {
        newParams.set(paramKey, paramValue as string);
      }
    });
    
    // Update the specified param based on action
    if (action === 'set') {
      if (value === '') {
        // Don't add empty value
      } else if (Array.isArray(value)) {
        value.forEach(v => newParams.append(key, v));
      } else {
        newParams.set(key, value);
      }
    } else if (action === 'add') {
      const valuesToAdd = Array.isArray(value) ? value : [value];
      valuesToAdd.forEach(v => newParams.append(key, v));
    } else if (action === 'remove') {
      // Don't add this key-value back
    } else if (action === 'toggle') {
      // For single-value fields that toggle on/off
      const currentValue = searchParams[key] as string;
      if (currentValue === value) {
        // Already set to this value, so remove it
      } else {
        newParams.set(key, value as string);
      }
    }
    
    // Reset to page 1 when filters change
    newParams.delete('page');
    
    // Update URL
    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`);
    });
  };
  
  // Toggle a category selection
  const toggleCategory = (categoryId: string) => {
    const isSelected = selectedCategories.includes(categoryId);
    
    const newParams = new URLSearchParams();
    
    // Copy existing params except categories
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key === 'categories') return;
      if (Array.isArray(value)) {
        value.forEach(v => newParams.append(key, v));
      } else if (value !== undefined) {
        newParams.set(key, value as string);
      }
    });
    
    // Add all categories except the toggled one if it was selected
    const newCategories = isSelected 
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    newCategories.forEach(catId => {
      newParams.append('categories', catId);
    });
    
    // Reset page
    newParams.delete('page');
    
    // Navigate
    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`);
    });
  };
  
  // Toggle a tag selection
  const toggleTag = (tag: string) => {
    const isSelected = selectedTags.includes(tag);
    
    const newParams = new URLSearchParams();
    
    // Copy existing params except tags
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key === 'tags') return;
      if (Array.isArray(value)) {
        value.forEach(v => newParams.append(key, v));
      } else if (value !== undefined) {
        newParams.set(key, value as string);
      }
    });
    
    // Add all tags except the toggled one if it was selected
    const newTags = isSelected 
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    newTags.forEach(t => {
      newParams.append('tags', t);
    });
    
    // Reset page
    newParams.delete('page');
    
    // Navigate
    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`);
    });
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    const newParams = new URLSearchParams();
    
    // Preserve only the search query
    if (searchParams.query) {
      newParams.set('query', searchParams.query as string);
    }
    
    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`);
    });
  };
  
  // Check if any filters are applied
  const hasFilters = 
    selectedCategories.length > 0 || 
    selectedTags.length > 0 || 
    searchParams.status || 
    searchParams.ageRating ||
    searchParams.isExplicit;
  
  // Available sort options
  const sortOptions = [
    { value: 'trending', label: 'ยอดนิยม', icon: <Sparkles size={16} /> },
    { value: 'newest', label: 'อัพเดตล่าสุด', icon: <Clock size={16} /> },
    { value: 'rating', label: 'คะแนนสูงสุด', icon: <Star size={16} /> },
    { value: 'popular', label: 'ยอดเข้าชมสูงสุด', icon: <Eye size={16} /> },
  ];
  
  // Get current sort selection
  const currentSort = searchParams.sort as string || 'trending';
  
  // Status options
  const statusOptions = [
    { value: 'published', label: 'กำลังเผยแพร่' },
    { value: 'completed', label: 'จบแล้ว' },
    { value: 'discount', label: 'ส่วนลดพิเศษ' },
  ];
  
  // Age rating options
  const ratingOptions = [
    { value: 'everyone', label: 'ทั่วไป (G)' },
    { value: 'teen', label: 'วัยรุ่น (13+)' },
    { value: 'mature17+', label: 'ผู้ใหญ่ (17+)' },
    { value: 'adult18+', label: 'ผู้ใหญ่ (18+)' },
  ];
  
  // Featured categories first
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return 0;
  });
  
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sort options - always visible */}
      <div className="space-y-2">
        <p className="text-sm font-medium">เรียงลำดับตาม</p>
        <div className="flex flex-wrap gap-2">
          {sortOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateSearch('sort', option.value, 'set')}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                currentSort === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent/50'
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Clear filters button */}
      {hasFilters && (
        <button
          onClick={clearAllFilters}
          className="w-full py-2 px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          disabled={isPending}
        >
          <X size={14} />
          ล้างตัวกรองทั้งหมด
        </button>
      )}
      
      {/* Categories section */}
      <div className="border-t border-border pt-4">
        <button
          onClick={() => toggleSection('categories')}
          className="flex items-center justify-between w-full text-left font-medium mb-3"
          aria-expanded={expandedSections.categories}
        >
          <span className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            หมวดหมู่
          </span>
          {expandedSections.categories ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {expandedSections.categories && (
          <div className="space-y-3 ml-1 mt-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
            {sortedCategories.map(category => (
              <div key={category._id} className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category._id)}
                    onChange={() => toggleCategory(category._id)}
                    className="w-4 h-4 rounded border-accent bg-transparent"
                  />
                  <span className="text-sm flex items-center gap-1.5 group-hover:text-primary transition-colors">
                    {category.iconUrl ? (
                      <span className="w-4 h-4 inline-flex items-center justify-center">
                        <Image 
                          src={category.iconUrl} 
                          alt={category.name} 
                          width={16} 
                          height={16} 
                          className="object-contain"
                        />
                      </span>
                    ) : null}
                    {category.name}
                    {category.isFeatured && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded-sm">พิเศษ</span>
                    )}
                  </span>
                </label>
                
                {/* Render subcategories if any */}
                {category.children && category.children.length > 0 && (
                  <div className="pl-6 space-y-1.5 mt-1">
                    {category.children.map(subCategory => (
                      <label key={subCategory._id} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(subCategory._id)}
                          onChange={() => toggleCategory(subCategory._id)}
                          className="w-4 h-4 rounded border-accent bg-transparent"
                        />
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          {subCategory.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Status section */}
      <div className="border-t border-border pt-4">
        <button
          onClick={() => toggleSection('status')}
          className="flex items-center justify-between w-full text-left font-medium mb-3"
          aria-expanded={expandedSections.status}
        >
          <span className="flex items-center gap-2">
            <Check size={16} className="text-primary" />
            สถานะ
          </span>
          {expandedSections.status ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {expandedSections.status && (
          <div className="space-y-2 ml-1">
            {statusOptions.map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={searchParams.status === option.value}
                  onChange={() => updateSearch('status', option.value, searchParams.status === option.value ? 'remove' : 'set')}
                  className="w-4 h-4 rounded-full border-accent bg-transparent"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      
      {/* Age Rating section */}
      <div className="border-t border-border pt-4">
        <button
          onClick={() => toggleSection('rating')}
          className="flex items-center justify-between w-full text-left font-medium mb-3"
          aria-expanded={expandedSections.rating}
        >
          <span className="flex items-center gap-2">
            <Star size={16} className="text-primary" />
            เรตติ้งอายุ
          </span>
          {expandedSections.rating ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {expandedSections.rating && (
          <div className="space-y-2 ml-1">
            {ratingOptions.map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ageRating"
                  checked={searchParams.ageRating === option.value}
                  onChange={() => updateSearch('ageRating', option.value, searchParams.ageRating === option.value ? 'remove' : 'set')}
                  className="w-4 h-4 rounded-full border-accent bg-transparent"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
            
            {/* Explicit content toggle */}
            <div className="mt-4 pt-2 border-t border-border/50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchParams.isExplicit === 'true'}
                  onChange={() => updateSearch('isExplicit', 'true', searchParams.isExplicit === 'true' ? 'remove' : 'set')}
                  className="w-4 h-4 rounded border-accent bg-transparent"
                />
                <span className="text-sm">แสดงเนื้อหาสำหรับผู้ใหญ่</span>
              </label>
            </div>
          </div>
        )}
      </div>
      
      {/* Tags section */}
      <div className="border-t border-border pt-4">
        <button
          onClick={() => toggleSection('tags')}
          className="flex items-center justify-between w-full text-left font-medium mb-3"
          aria-expanded={expandedSections.tags}
        >
          <span className="flex items-center gap-2">
            <Tag size={16} className="text-primary" />
            แท็ก
          </span>
          {expandedSections.tags ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {expandedSections.tags && (
          <div className="mt-2 ml-1">
            <div className="flex flex-wrap gap-2">
              {popularTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  disabled={isPending}
                  className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent/50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}