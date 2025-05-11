// src/components/SearchPaginationg.tsx

'use client';

import { useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function Pagination({
  currentPage,
  totalPages,
  searchParams,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  
  // Navigate to a specific page
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    const newParams = new URLSearchParams();
    
    // Copy existing params
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key === 'page') return; // Skip the page param
      
      if (Array.isArray(value)) {
        value.forEach(v => newParams.append(key, v));
      } else if (value !== undefined) {
        newParams.set(key, value as string);
      }
    });
    
    // Add the new page
    newParams.set('page', page.toString());
    
    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`);
      // Scroll to top when changing pages
      window.scrollTo(0, 0);
    });
  };
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      // If few pages, show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  // Don't render pagination if there's only one page
  if (totalPages <= 1) {
    return null;
  }
  
  const pageNumbers = getPageNumbers();
  
  return (
    <div className="flex justify-center items-center mt-8">
      <div className="flex items-center space-x-1">
        {/* Previous page button */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1 || isPending}
          className="p-2 rounded-md hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="หน้าก่อนหน้า"
        >
          <ChevronLeft size={20} />
        </button>
        
        {/* Page numbers */}
        {pageNumbers.map((page, index) => (
          typeof page === 'number' ? (
            <button
              key={index}
              onClick={() => goToPage(page)}
              disabled={page === currentPage || isPending}
              className={`h-10 w-10 rounded-md flex items-center justify-center text-sm transition-colors ${
                page === currentPage
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'hover:bg-secondary'
              }`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ) : (
            <span key={index} className="px-2 text-muted-foreground">
              {page}
            </span>
          )
        ))}
        
        {/* Next page button */}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages || isPending}
          className="p-2 rounded-md hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="หน้าถัดไป"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}