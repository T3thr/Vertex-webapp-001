// src/components/layouts/SearchBar.tsx
"use client";

import { Search, X, Loader2, BookOpen, Tag } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// ประเภทข้อมูลสำหรับผลการค้นหา
interface SearchResult {
  _id: string;
  title: string;
  slug: string;
  coverImage?: string;
  author?: {
    username: string;
    profile?: {
      displayName?: string;
    }
  };
  description: string;
  tags: string[];
}

// SearchBar Component Props - คอมโพเนนต์สำหรับแถบค้นหา
interface SearchBarProps {
  onClose: () => void;
  isMobile?: boolean;
}

export default function SearchBar({ onClose, isMobile = false }: SearchBarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  useEffect(() => {
    inputRef.current?.focus();
    
    // ดึงแท็กยอดนิยมเมื่อโหลดครั้งแรก
    const popularTags = ["แฟนตาซี", "โรแมนติก", "เกิดใหม่", "ระบบ", "ผจญภัย", "ดราม่า", "สยองขวัญ", "แอ็คชั่น"];
    setSuggestedTags(popularTags);
  }, []);
  
  // ฟังก์ชันค้นหาเบื้องต้นเมื่อพิมพ์
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchValue.trim().length >= 2) {
        setIsSearching(true);
        try {
          // เรียก API สำหรับค้นหาแบบ live search
          const response = await fetch(`/api/search?q=${encodeURIComponent(searchValue)}&limit=5`);
          
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.novels || []);
          } else {
            console.error("การค้นหาล้มเหลว");
            setSearchResults([]);
          }
        } catch (error) {
          console.error("เกิดข้อผิดพลาดในการค้นหา:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300); // delay การค้นหาเพื่อลดการเรียก API บ่อยเกินไป

    return () => clearTimeout(searchTimeout);
  }, [searchValue]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onClose();
      router.push(`/search/novels?q=${encodeURIComponent(searchValue)}`);
    }
  };
  
  // ตัดความยาวข้อความ
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
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
            placeholder="ค้นหานิยาย, ผู้เขียน, แนวนิยาย..."
            className="bg-transparent w-full focus:outline-none text-foreground placeholder-muted-foreground text-sm"
            aria-label="ช่องค้นหา"
          />
          {isSearching ? (
            <Loader2 size={18} className="text-primary animate-spin flex-shrink-0" />
          ) : searchValue ? (
            <button 
              type="button"
              onClick={() => setSearchValue("")}
              className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary flex-shrink-0"
              aria-label="ล้างการค้นหา"
            >
              <X size={16} />
            </button>
          ) : null}
          <button 
            type="button"
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground ml-1 p-1 rounded-full hover:bg-secondary flex-shrink-0 md:hidden"
            aria-label="ปิดการค้นหา"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* ผลลัพธ์การค้นหา */}
        {searchValue.length > 0 && searchResults.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground mb-2">ผลการค้นหา</div>
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-accent">
              {searchResults.map((novel) => (
                <Link 
                  key={novel._id}
                  href={`/novels/${novel.slug}`}
                  onClick={onClose}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-secondary transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-14 bg-muted rounded-md overflow-hidden">
                    {novel.coverImage ? (
                      <Image 
                        src={novel.coverImage} 
                        alt={novel.title}
                        width={40}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={20} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{novel.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {novel.author?.profile?.displayName || novel.author?.username || "ไม่ระบุผู้เขียน"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {truncateText(novel.description, 60)}
                    </p>
                  </div>
                </Link>
              ))}
              <Link 
                href={`/search/novels?q=${encodeURIComponent(searchValue)}`}
                onClick={onClose}
                className="flex items-center justify-center w-full py-2 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                ดูผลการค้นหาทั้งหมด
              </Link>
            </div>
          </div>
        )}
        
        {/* แท็กแนะนำ */}
        {(searchValue.length === 0 || (searchValue.length > 0 && searchResults.length === 0 && !isSearching)) && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              {searchValue.length > 0 && searchResults.length === 0 && !isSearching
                ? "ไม่พบผลลัพธ์ ลองดูแนวเหล่านี้"
                : "แนวนิยายยอดนิยม"}
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSearchValue(tag);
                    inputRef.current?.focus();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-accent rounded-full text-xs text-secondary-foreground hover:text-foreground transition-colors"
                >
                  <Tag size={12} />
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