// src/components/layouts/SearchBar.tsx
"use client";

import { Search, X, BookOpen, Clock, TrendingUp, Tag } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";

// คอมโพเนนต์ SearchBar Props - คอมโพเนนต์สำหรับแถบค้นหา
interface SearchBarProps {
  onClose: () => void;
  isMobile?: boolean;
}

// ประเภทข้อมูลสำหรับผลการค้นหา (ย่อ)
interface SearchNovelResult {
  _id: string;
  title: string;
  slug: string;
  coverImage: string;
  author: {
    username: string;
    profile: {
      displayName?: string;
    };
  };
  tags: string[];
}

export default function SearchBar({ onClose, isMobile = false }: SearchBarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchNovelResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([
    "แฟนตาซี", "โรแมนติก", "แอ็คชั่น", "ดราม่า", "สยองขวัญ", "ไซไฟ", "เกิดใหม่", "ผจญภัย"
  ]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  
  // โหลดการค้นหาล่าสุดจาก localStorage เมื่อคอมโพเนนต์ถูกโหลด
  useEffect(() => {
    const savedSearches = localStorage.getItem("recentSearches");
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches).slice(0, 3));
      } catch (e) {
        console.error("Error parsing recent searches:", e);
      }
    }
    
    inputRef.current?.focus();
  }, []);
  
  // บันทึกการค้นหาล่าสุด
  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    
    const updatedSearches = [
      term,
      ...recentSearches.filter(s => s !== term)
    ].slice(0, 5);
    
    setRecentSearches(updatedSearches);
    localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
  };
  
  // ส่งคำค้นหาไปยัง API
  const searchNovels = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsSearching(true);
      const response = await fetch(`/api/search/novels?q=${encodeURIComponent(query)}&limit=5`);
      
      if (!response.ok) {
        throw new Error("ไม่สามารถค้นหานิยายได้");
      }
      
      const data = await response.json();
      setSearchResults(data.novels || []);
    } catch (error) {
      console.error("Error searching novels:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // กำหนดเวลาการค้นหาเพื่อลดการเรียก API บ่อยเกินไป
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue.trim().length > 1) {
        searchNovels(searchValue);
      } else {
        setSearchResults([]);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchValue]);
  
  // จัดการเหตุการณ์เมื่อกดปุ่มค้นหา
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      saveRecentSearch(searchValue.trim());
      router.push(`/search/novels?q=${encodeURIComponent(searchValue.trim())}`);
      onClose();
    }
  };
  
  // เลือกแท็กหรือคำที่แนะนำ
  const handleSuggestionClick = (term: string) => {
    setSearchValue(term);
    inputRef.current?.focus();
  };
  
  return (
    <div ref={searchBarRef} className={`w-full ${isMobile ? "p-2" : ""}`}>
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full bg-card rounded-lg shadow-lg border border-accent overflow-hidden"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 p-3">
            <Search size={18} className="text-primary flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="ค้นหานิยาย, ผู้เขียน, แท็ก..."
              className="bg-transparent w-full focus:outline-none text-foreground placeholder-muted-foreground text-sm"
              aria-label="ค้นหา"
            />
            {isSearching ? (
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full flex-shrink-0"></div>
            ) : searchValue ? (
              <button 
                type="button"
                onClick={() => setSearchValue("")}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary flex-shrink-0"
                aria-label="ล้างคำค้นหา"
              >
                <X size={16} />
              </button>
            ) : null}
            <button 
              type="button"
              onClick={onClose} 
              className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary flex-shrink-0"
              aria-label="ปิดค้นหา"
            >
              <X size={18} />
            </button>
          </div>
        </form>
        
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border px-3 py-2"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">ผลการค้นหา</span>
                <Link 
                  href={`/search/novels?q=${encodeURIComponent(searchValue)}`}
                  onClick={() => {
                    saveRecentSearch(searchValue);
                    onClose();
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  ดูทั้งหมด
                </Link>
              </div>
              <div className="space-y-2">
                {searchResults.map((novel) => (
                  <Link 
                    key={novel._id} 
                    href={`/novels/${novel.slug}`}
                    onClick={() => {
                      saveRecentSearch(novel.title);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-2 hover:bg-secondary rounded-md transition-colors"
                  >
                    <div className="w-10 h-14 relative rounded-md overflow-hidden flex-shrink-0">
                      <Image
                        src={novel.coverImage || "/images/placeholder-cover.jpg"}
                        alt={novel.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-foreground truncate">{novel.title}</h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {novel.author?.profile?.displayName || novel.author?.username || "ไม่ระบุผู้เขียน"}
                      </p>
                      {novel.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {novel.tags.slice(0, 2).map((tag) => (
                            <span 
                              key={tag} 
                              className="px-1.5 py-0.5 bg-secondary text-xs rounded-full text-secondary-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                          {novel.tags.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{novel.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
          
          {searchValue.length === 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-3 pb-3"
            >
              {recentSearches.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">ค้นหาล่าสุด</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, index) => (
                      <button
                        key={`recent-${index}`}
                        type="button"
                        onClick={() => handleSuggestionClick(term)}
                        className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-full text-xs text-secondary-foreground transition-colors flex items-center gap-1.5"
                      >
                        <Clock size={12} />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">แนะนำ</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag, index) => (
                    <button
                      key={`tag-${index}`}
                      type="button"
                      onClick={() => handleSuggestionClick(tag)}
                      className="px-3 py-1.5 bg-secondary hover:bg-accent/20 rounded-full text-xs text-secondary-foreground transition-colors flex items-center gap-1.5"
                    >
                      <Tag size={12} />
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mt-3 pt-2 border-t border-border">
                <Link 
                  href="/search/novels"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium rounded-md transition-colors"
                >
                  <BookOpen size={16} />
                  <span>ค้นหาขั้นสูง</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}