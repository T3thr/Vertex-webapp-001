"use client";

import { NavBar } from "@/components/layouts/NavBar";
import { Book, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface SearchResult {
  id: string;
  title: string;
  coverImage?: string;
  author?: string;
  description?: string;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
          throw new Error("การค้นหาล้มเหลว");
        }
        
        const data = await response.json();
        setResults(data.results || []);
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการค้นหา โปรดลองอีกครั้งในภายหลัง");
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          ผลการค้นหาสำหรับ: <span className="text-primary">&quot;{query}&quot;</span>
        </h1>
        
        <div className="text-sm text-muted-foreground mb-8">
          พบ {results.length} รายการ
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-500 mb-2">{error}</div>
            <Link href="/" className="text-primary hover:underline">
              กลับไปยังหน้าแรก
            </Link>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            ไม่พบนิยายที่ตรงกับการค้นหาของคุณ
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((result) => (
              <Link
                key={result.id}
                href={`/novels/${result.id}`}
                className="block bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="relative w-full h-48">
                  {result.coverImage ? (
                    <img
                      src={result.coverImage}
                      alt={result.title}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                      <Book className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-medium text-foreground line-clamp-2">
                    {result.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {result.author ? `โดย ${result.author}` : "ผู้เขียนไม่ระบุ"}
                  </p>
                  {result.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {result.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}