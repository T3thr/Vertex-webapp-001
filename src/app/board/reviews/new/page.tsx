'use client';

import { BoardType } from '@/backend/models/BoardClientSide';
import { ArrowLeft, Search, Star } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// สำหรับแสดงรายการนิยายที่ค้นหาได้
interface NovelSearchResult {
  id: string;
  title: string;
  coverUrl: string;
  author: string;
}

export default function NewReviewPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NovelSearchResult[]>([]);
  const [selectedNovel, setSelectedNovel] = useState<NovelSearchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ค้นหานิยาย
  const searchNovels = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/novels/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.novels || []);
      } else {
        setError('ไม่สามารถค้นหานิยายได้');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการค้นหานิยาย');
    } finally {
      setIsSearching(false);
    }
  };

  // เลือกนิยาย
  const selectNovel = (novel: NovelSearchResult) => {
    setSelectedNovel(novel);
    setSearchResults([]);
    setSearchQuery('');
  };

  // สร้างรีวิวใหม่
  const createReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) {
      setError('กรุณาเข้าสู่ระบบก่อนเขียนรีวิว');
      return;
    }
    
    if (!title.trim() || title.trim().length < 5) {
      setError('กรุณาระบุหัวข้อรีวิวอย่างน้อย 5 ตัวอักษร');
      return;
    }
    
    if (!content.trim() || content.trim().length < 10) {
      setError('กรุณาเขียนเนื้อหารีวิวอย่างน้อย 10 ตัวอักษร');
      return;
    }
    
    if (rating === 0) {
      setError('กรุณาให้คะแนนนิยาย');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/board/create?sourceType=review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          boardType: BoardType.REVIEW, // ใช้ค่าจาก enum
          sourceType: 'review', // เพิ่มการระบุ sourceType เพื่อให้รู้ว่ากระทู้นี้สร้างจากปุ่มรีวิว
          novelAssociatedId: selectedNovel?.id,
          novelTitle: selectedNovel?.title || searchQuery,
          reviewDetails: {
            ratingValue: rating,
            readingProgress: 'completed'
          }
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // รีวิวถูกสร้างสำเร็จ นำทางไปยังหน้ารีวิว
        router.push('/board/reviews');
      } else {
        setError(data.error || 'ไม่สามารถสร้างรีวิวได้');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการสร้างรีวิว');
    } finally {
      setIsSubmitting(false);
    }
  };

  // สร้าง UI สำหรับการให้คะแนน
  const renderRatingStars = () => {
    return (
      <div className="flex items-center gap-1 mb-4">
        <span className="text-sm mr-2">คะแนน:</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="focus:outline-none"
          >
            <Star
              size={24}
              className={`${
                star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
              } hover:text-yellow-400 transition-colors`}
            />
          </button>
        ))}
        {rating > 0 && <span className="ml-2 text-sm">{rating}/5</span>}
      </div>
    );
  };

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">กรุณาเข้าสู่ระบบ</h1>
        <p className="mb-4">คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถเขียนรีวิวได้</p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center px-4 py-2 bg-[#8bc34a] text-white rounded-full hover:bg-[#7baf41] transition-colors"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
          <Link
            href="/board/reviews"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-[#8bc34a] transition-colors"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>กลับไปหน้ารีวิว</span>
          </Link>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <h1 className="text-2xl font-bold mb-6">เขียนรีวิวใหม่</h1>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <form onSubmit={createReview}>
          {/* ส่วนค้นหานิยาย */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">นิยายที่ต้องการรีวิว</label>
            
            {selectedNovel ? (
              <div className="flex items-center gap-4 p-3 border border-border rounded-md mb-2 bg-background">
                <Image
                  src={selectedNovel.coverUrl || "/images/default-cover.png"}
                  alt={selectedNovel.title}
                  width={60}
                  height={80}
                  className="object-cover rounded-md"
                />
                <div>
                  <h3 className="font-medium">{selectedNovel.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedNovel.author}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNovel(null)}
                  className="ml-auto text-sm text-destructive hover:text-destructive/80"
                >
                  เปลี่ยน
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหานิยายที่ต้องการรีวิว"
                    className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#8bc34a] focus:border-[#8bc34a] bg-background text-foreground"
                  />
                  <button
                    type="button"
                    onClick={searchNovels}
                    className="px-4 py-2 bg-[#8bc34a] text-white rounded-md hover:bg-[#7baf41] transition-colors"
                    disabled={isSearching}
                  >
                    {isSearching ? 'กำลังค้นหา...' : <Search size={18} />}
                  </button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-border rounded-md max-h-60 overflow-y-auto bg-background">
                    {searchResults.map((novel) => (
                      <div
                        key={novel.id}
                        onClick={() => selectNovel(novel)}
                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                      >
                        <Image
                          src={novel.coverUrl || "/images/default-cover.png"}
                          alt={novel.title}
                          width={40}
                          height={60}
                          className="object-cover rounded-sm"
                        />
                        <div>
                          <h4 className="font-medium">{novel.title}</h4>
                          <p className="text-sm text-muted-foreground">{novel.author}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-2">
                  หากไม่พบนิยายที่ต้องการ คุณสามารถพิมพ์ชื่อนิยายได้โดยตรง
                </p>
              </div>
            )}
          </div>
          
          {/* ส่วนให้คะแนน */}
          {renderRatingStars()}
          
          {/* หัวข้อรีวิว */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              หัวข้อรีวิว
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เขียนหัวข้อรีวิวของคุณ"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#8bc34a] focus:border-[#8bc34a] bg-background text-foreground"
              required
            />
          </div>
          
          {/* เนื้อหารีวิว */}
          <div className="mb-6">
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              เนื้อหารีวิว
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="เขียนรีวิวของคุณที่นี่..."
              rows={8}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#8bc34a] focus:border-[#8bc34a] bg-background text-foreground"
              required
            />
          </div>
          
          {/* ปุ่มส่ง */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#8bc34a] text-white rounded-md hover:bg-[#7baf41] transition-colors disabled:opacity-50 font-medium"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'โพสต์รีวิว'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}