// src/components/ui/SearchDialog.tsx
"use client"
import { motion } from 'framer-motion';
import { BookOpen, Bookmark, History, Search, Star, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SearchDialog = ({ open, onClose }: SearchDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  // Handle Escape key to close dialog
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    
    // Simulate search - in real app, fetch from API
    setTimeout(() => {
      setSearchResults([
        { id: 1, title: 'The Silent Echo', author: 'Alex Rivers', type: 'novel' },
        { id: 2, title: 'Midnight Shadows', author: 'Sarah Chen', type: 'novel' },
        { id: 3, title: 'Fantasy', type: 'category' },
        { id: 4, title: 'Mystery', type: 'category' },
      ]);
      setIsLoading(false);
    }, 500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-start justify-center">
      <div className="w-full max-w-2xl mt-20 mx-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-card rounded-lg shadow-lg overflow-hidden"
        >
          <div className="flex items-center p-4 border-b border-accent">
            <Search className="h-5 w-5 text-muted-foreground mr-3" />
            <form onSubmit={handleSearch} className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search novels, authors, genres..."
                className="w-full bg-transparent border-none focus:outline-none text-card-foreground placeholder:text-muted-foreground"
              />
            </form>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mr-2 p-1 rounded-full hover:bg-accent/50"
                aria-label="search-button"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-accent/50"
              aria-label="vlose-button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : searchQuery && searchResults.length > 0 ? (
              <div className="py-2">
                <div className="px-4 py-2 text-sm font-medium text-muted-foreground">Search Results</div>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={onClose}
                    className="w-full text-left px-4 py-3 hover:bg-accent/50 flex items-start gap-3"
                  >
                    {result.type === 'novel' ? (
                      <BookOpen className="h-4 w-4 mt-1 text-muted-foreground" />
                    ) : (
                      <Bookmark className="h-4 w-4 mt-1 text-muted-foreground" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{result.title}</div>
                      {result.author && (
                        <div className="text-xs text-muted-foreground">{result.author}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No results found for &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <div className="py-2">
                <div className="px-4 py-2 text-sm font-medium text-muted-foreground">Recent Searches</div>
                <button
                  onClick={onClose}
                  className="w-full text-left px-4 py-3 hover:bg-accent/50 flex items-center gap-3"
                >
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Fantasy novels</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full text-left px-4 py-3 hover:bg-accent/50 flex items-center gap-3"
                >
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Best romance 2025</span>
                </button>
                
                <div className="px-4 py-2 text-sm font-medium text-muted-foreground border-t border-accent mt-2">Popular Categories</div>
                <button
                  onClick={onClose}
                  className="w-full text-left px-4 py-3 hover:bg-accent/50 flex items-center gap-3"
                >
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Fantasy</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full text-left px-4 py-3 hover:bg-accent/50 flex items-center gap-3"
                >
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Romance</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};