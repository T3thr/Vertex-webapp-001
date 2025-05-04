"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

interface SearchResult {
  id: number;
  title: string;
  author: string;
}

interface SearchBarProps {
  onClose: () => void;
}

export const SearchBar = ({ onClose }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsSearching(true);
    
    // Simulate search
    setTimeout(() => {
      // Mock results - In a real app, you would call an API
      const mockResults: SearchResult[] = [
        { id: 1, title: "นิยายเรื่องที่ 1", author: "นักเขียน A" },
        { id: 2, title: "นิยายเรื่องที่ 2", author: "นักเขียน B" },
        { id: 3, title: "นิยายเรื่องที่ 3", author: "นักเขียน C" },
      ].filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) || 
        item.author.toLowerCase().includes(query.toLowerCase())
      );
      
      setResults(mockResults);
      setIsSearching(false);
    }, 500);
  };

  return (
    <div className="w-full bg-card rounded-md shadow-lg p-2 border border-accent">
      <form onSubmit={handleSearch}>
        <div className="flex items-center space-x-2">
          <Search size={16} className="text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหางานเขียน..."
            className="bg-transparent w-full focus:outline-none text-sm"
          />
          {query && (
            <button 
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
          <button 
            type="button"
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
      </form>

      {isSearching && (
        <div className="pt-2 text-sm text-center text-muted-foreground">
          กำลังค้นหา...
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="mt-2 max-h-60 overflow-y-auto">
          <div className="text-xs font-medium text-muted-foreground mb-1 px-1">
            ผลการค้นหา
          </div>
          {results.map((result) => (
            <div 
              key={result.id} 
              className="p-2 hover:bg-secondary rounded-md cursor-pointer"
            >
              <div className="text-sm font-medium">{result.title}</div>
              <div className="text-xs text-muted-foreground">{result.author}</div>
            </div>
          ))}
        </div>
      )}

      {!isSearching && query && results.length === 0 && (
        <div className="pt-2 text-sm text-center text-muted-foreground">
          ไม่พบผลลัพธ์
        </div>
      )}
    </div>
  );
};