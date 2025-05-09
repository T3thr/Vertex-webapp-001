// src/components/layouts/SearchBar.tsx
"use client";

import { Search, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

// SearchBar Component Props - คอมโพเนนต์สำหรับแถบค้นหา
interface SearchBarProps {
  onClose: () => void;
  isMobile?: boolean;
}

export default function SearchBar({ onClose, isMobile = false }: SearchBarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setIsSearching(true);
      console.log(`Searching for: ${searchValue}`);
      // Replace with actual search logic / redirection
      // window.location.href = `/search?q=${encodeURIComponent(searchValue)}`;
      setTimeout(() => {
        setIsSearching(false);
        onClose(); 
      }, 1000);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className={`w-full ${isMobile ? "p-2" : ""}`}>
      <div className={`w-full bg-card rounded-lg shadow-lg p-3 border border-accent ${isMobile ? "" : ""}`}>
        <div className="flex items-center gap-3">
          <Search size={18} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="ค้นหานิยาย, ผู้เขียน..."
            className="bg-transparent w-full focus:outline-none text-foreground placeholder-muted-foreground text-sm"
          />
          {isSearching ? (
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full flex-shrink-0"></div>
          ) : searchValue ? (
            <button 
              type="button"
              onClick={() => setSearchValue("")}
              className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary flex-shrink-0"
            >
              <X size={16} />
            </button>
          ) : null}
          <button 
            type="button"
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground ml-1 p-1 rounded-full hover:bg-secondary flex-shrink-0 md:hidden" // Hide X on desktop search bar, only for mobile overlay
          >
            <X size={18} />
          </button>
        </div>
        
        {searchValue.length > 0 && !isSearching && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2">คำแนะนำ</div>
            <div className="flex flex-wrap gap-2">
              {["แฟนตาซี", "โรแมนติก", "เกิดใหม่", "ระบบ"].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSearchValue(tag);
                    inputRef.current?.focus();
                  }}
                  className="px-2.5 py-1 bg-secondary hover:bg-muted rounded-full text-xs text-secondary-foreground hover:text-foreground transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </form>
  );
};