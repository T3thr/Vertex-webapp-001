'use client';

import { Search, Tag, TagsIcon, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

// Types
interface Category {
  _id: string;
  name: string;
  children?: Category[];
}

interface ActiveFiltersProps {
  query?: string;
  selectedCategories: string[];
  selectedTags: string[];
  categories: Category[];
}

export default function ActiveFilters({
  query,
  selectedCategories = [],
  selectedTags = [],
  categories,
}: ActiveFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  
  // Don't render if there are no active filters
  if (!query && selectedCategories.length === 0 && selectedTags.length === 0) {
    return null;
  }
  
  // Clear a specific filter
  const clearFilter = (type: 'query' | 'category' | 'tag', value?: string) => {
    // Get current URL and search params
    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);
    
    if (type === 'query') {
      // Remove query parameter
      searchParams.delete('query');
    } else if (type === 'category' && value) {
      // Remove specific category
      const currentCategories = searchParams.getAll('categories');
      
      // Remove the current page
      searchParams.delete('page');
      
      // Remove all categories
      searchParams.delete('categories');
      
      // Add back all categories except the one to remove
      currentCategories
        .filter(cat => cat !== value)
        .forEach(cat => {
          searchParams.append('categories', cat);
        });
    } else if (type === 'tag' && value) {
      // Remove specific tag
      const currentTags = searchParams.getAll('tags');
      
      // Remove the current page
      searchParams.delete('page');
      
      // Remove all tags
      searchParams.delete('tags');
      
      // Add back all tags except the one to remove
      currentTags
        .filter(tag => tag !== value)
        .forEach(tag => {
          searchParams.append('tags', tag);
        });
    }
    
    // Navigate to new URL
    startTransition(() => {
      router.push(`${pathname}?${searchParams.toString()}`);
    });
  };
  
  // Find category names from IDs
  const getCategoryName = (id: string) => {
    // Check in top-level categories
    const topCategory = categories.find(cat => cat._id === id);
    if (topCategory) return topCategory.name;
    
    // Check in child categories
    for (const parent of categories) {
      if (parent.children) {
        const child = parent.children.find((child: any) => child._id === id);
        if (child) return child.name;
      }
    }
    
    return id;
  };
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {query && (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-full text-xs">
          <Search size={12} />
          {query}
          <button 
            onClick={() => clearFilter('query')}
            className="ml-1 hover:text-primary"
            aria-label="ล้างคำค้นหา"
            disabled={isPending}
          >
            <X size={14} />
          </button>
        </span>
      )}
      
      {selectedCategories.map(catId => (
        <span key={catId} className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-full text-xs">
          <TagsIcon size={12} />
          {getCategoryName(catId)}
          <button 
            onClick={() => clearFilter('category', catId)}
            className="ml-1 hover:text-primary"
            aria-label={`ลบหมวดหมู่ ${getCategoryName(catId)}`}
            disabled={isPending}
          >
            <X size={14} />
          </button>
        </span>
      ))}
      
      {selectedTags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-full text-xs">
          <Tag size={12} />
          {tag}
          <button 
            onClick={() => clearFilter('tag', tag)}
            className="ml-1 hover:text-primary"
            aria-label={`ลบแท็ก ${tag}`}
            disabled={isPending}
          >
            <X size={14} />
          </button>
        </span>
      ))}
    </div>
  );
}