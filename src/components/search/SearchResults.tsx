'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { SearchNovelCard, type Novel } from '@/components/search/SearchNovelCard';

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface SearchParams {
  q?: string;
  category?: string;
  status?: string;
  sortBy?: string;
}

interface SearchResultsProps {
  novels: Novel[];
  pagination: Pagination;
  searchParams: SearchParams;
}

export default function SearchResults({ novels, pagination, searchParams }: SearchResultsProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isFirstRender, setIsFirstRender] = useState(true);
  const { currentPage, totalPages } = pagination;

  // ปรับ state เมื่อ render ครั้งแรก
  useEffect(() => {
    setIsFirstRender(false);
  }, []);

  // สร้าง URL สำหรับการเปลี่ยนหน้า
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    params.set('page', page.toString());
    return `/search/novels?${params.toString()}`;
  };

  // แสดงเลขหน้าแบบย่อ
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // แสดงทุกหน้าถ้าน้อยกว่าหรือเท่ากับ maxVisiblePages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // แสดงแบบย่อถ้ามีหน้าเยอะ
      if (currentPage <= 3) {
        // หน้าแรกๆ: แสดง 1, 2, 3, ..., totalPages
        for (let i = 1; i <= 3; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('ellipsis');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // หน้าท้ายๆ: แสดง 1, ..., totalPages-2, totalPages-1, totalPages
        pageNumbers.push(1);
        pageNumbers.push('ellipsis');
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        // หน้ากลางๆ: แสดง 1, ..., currentPage-1, currentPage, currentPage+1, ..., totalPages
        pageNumbers.push(1);
        pageNumbers.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('ellipsis');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  return (
    <div className="space-y-6">
      {/* Grid นิยาย */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`search-results-${currentPage}`}
          initial={isFirstRender ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        >
          {novels.map((novel, index) => (
            <SearchNovelCard key={novel._id} novel={novel} index={index} />
          ))}
        </motion.div>
      </AnimatePresence>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-8">
          <nav className="flex items-center">
            {/* ปุ่มไปหน้าก่อนหน้า */}
            {pagination.hasPrevPage ? (
              <Link 
                href={createPageUrl(currentPage - 1)}
                className="flex items-center justify-center w-10 h-10 rounded-md border border-border hover:bg-secondary"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="sr-only">หน้าก่อนหน้า</span>
              </Link>
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-md border border-border bg-secondary opacity-50 cursor-not-allowed">
                <ChevronLeft className="w-5 h-5" />
                <span className="sr-only">หน้าก่อนหน้า</span>
              </div>
            )}
            
            {/* ตัวเลขหน้า */}
            <div className="flex mx-2">
              {getPageNumbers().map((page, index) => (
                page === 'ellipsis' ? (
                  <div key={`ellipsis-${index}`} className="flex items-center justify-center w-10 h-10">
                    <span className="text-muted-foreground">...</span>
                  </div>
                ) : (
                  <Link
                    key={`page-${page}`}
                    href={createPageUrl(page as number)}
                    className={`flex items-center justify-center w-10 h-10 mx-1 rounded-md border transition-colors
                      ${Number(page) === currentPage
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-secondary'
                      }`}
                  >
                    {page}
                  </Link>
                )
              ))}
            </div>
            
            {/* ปุ่มไปหน้าถัดไป */}
            {pagination.hasNextPage ? (
              <Link
                href={createPageUrl(currentPage + 1)}
                className="flex items-center justify-center w-10 h-10 rounded-md border border-border hover:bg-secondary"
              >
                <ChevronRight className="w-5 h-5" />
                <span className="sr-only">หน้าถัดไป</span>
              </Link>
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-md border border-border bg-secondary opacity-50 cursor-not-allowed">
                <ChevronRight className="w-5 h-5" />
                <span className="sr-only">หน้าถัดไป</span>
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}