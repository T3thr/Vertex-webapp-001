'use client';

import { Search, X, ArrowRight } from 'lucide-react';
import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SearchPageSearchbarProps {
  initialQuery?: string;
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function SearchPageSearchbar({ 
  initialQuery = '', 
  searchParams = {} 
}: SearchPageSearchbarProps) {
  const [searchValue, setSearchValue] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  
  // Update the searchValue when initialQuery changes (e.g., on back navigation)
  useEffect(() => {
    setSearchValue(initialQuery);
  }, [initialQuery]);
  
  // Handle search submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't search if the value is empty or unchanged
    if (!searchValue.trim() || searchValue.trim() === initialQuery) {
      return;
    }
    
    // Build the search parameters
    const newParams = new URLSearchParams();
    
    // Add the search query
    newParams.set('query', searchValue.trim());
    
    // Copy other existing params except 'query' and 'page'
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key === 'query' || key === 'page') return;
      
      if (Array.isArray(value)) {
        value.forEach(v => newParams.append(key, v));
      } else if (value !== undefined) {
        newParams.set(key, value as string);
      }
    });
    
    // Navigate to search results
    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`);
    });
  };
  
  // Clear search input
  const clearSearch = () => {
    setSearchValue('');
    inputRef.current?.focus();
    
    // If there was a query in the URL, remove it and navigate
    if (searchParams.query) {
      const newParams = new URLSearchParams();
      
      // Copy all params except 'query' and 'page'
      Object.entries(searchParams).forEach(([key, value]) => {
        if (key === 'query' || key === 'page') return;
        
        if (Array.isArray(value)) {
          value.forEach(v => newParams.append(key, v));
        } else if (value !== undefined) {
          newParams.set(key, value as string);
        }
      });
      
      startTransition(() => {
        router.push(`${pathname}?${newParams.toString()}`);
      });
    }
  };
  
  return (
    <form 
      onSubmit={handleSubmit}
      className={`relative w-full transition-all duration-300 max-w-3xl mx-auto ${
        isFocused ? 'ring-2 ring-primary' : ''
      }`}
    >
      <div className="bg-card border border-border rounded-xl shadow-sm flex items-center p-3">
        <Search 
          size={20} 
          className={`mr-3 transition-colors ${isFocused ? 'text-primary' : 'text-muted-foreground'}`} 
        />
        
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="ค้นหานิยาย, หมวดหมู่, แท็ก..."
          className="bg-transparent flex-1 focus:outline-none text-foreground"
          autoComplete="off"
        />
        
        {searchValue && (
          <button
            type="button"
            onClick={clearSearch}
            className="ml-2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors"
            aria-label="ล้างการค้นหา"
          >
            <X size={18} />
          </button>
        )}
        
        <button
          type="submit"
          disabled={!searchValue.trim() || isPending || searchValue.trim() === initialQuery}
          className="ml-2 bg-primary text-primary-foreground p-2 rounded-lg transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="ค้นหา"
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
}