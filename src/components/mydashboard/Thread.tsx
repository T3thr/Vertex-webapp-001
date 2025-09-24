'use client';

import { Calendar, Eye, FileText, HelpCircle, MessageCircle, Plus, Star } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface BoardPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  boardType: string;
  sourceType?: string;  // เพิ่ม sourceType เพื่อระบุว่ากระทู้นี้สร้างมาจากหน้าไหน (review, problem, etc.)
  createdAt: string;
  viewCount: number;
  commentCount: number;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  category?: {
    id: string;
    name: string;
  } | null;
  novel?: {
    id: string;
    title: string;
    coverImageUrl: string;
    slug: string;
  } | null;
}

export const Thread = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const username = params.username as string;
  
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [reviewPosts, setReviewPosts] = useState<BoardPost[]>([]);
  const [problemPosts, setProblemPosts] = useState<BoardPost[]>([]);
  
  // เพิ่มตัวแปรสำหรับเก็บจำนวนโพสต์แยกตามประเภท
  const [reviewFromReviewBtn, setReviewFromReviewBtn] = useState<BoardPost[]>([]);
  const [problemFromProblemBtn, setProblemFromProblemBtn] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'reviews' | 'problems'>('all');
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  // ตรวจสอบว่าเป็นโปรไฟล์ของผู้ใช้ปัจจุบันหรือไม่
  useEffect(() => {
    if (session?.user?.username === username) {
      setIsCurrentUser(true);
    } else {
      setIsCurrentUser(false);
    }
  }, [session, username]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // ดึงข้อมูลกระทู้ทั้งหมด
        const allPostsResponse = await fetch(`/api/board/user/${username}`);
        
        if (!allPostsResponse.ok) {
          throw new Error('ไม่สามารถโหลดข้อมูลกระทู้ได้');
        }
        
        // ดึงข้อมูลกระทู้รีวิว
        const reviewsResponse = await fetch(`/api/board/user/${username}?type=reviews`);
        
        if (!reviewsResponse.ok) {
          throw new Error('ไม่สามารถโหลดข้อมูลกระทู้รีวิวได้');
        }
        
        // ดึงข้อมูลกระทู้ปัญหา
        const problemsResponse = await fetch(`/api/board/user/${username}?type=problems`);
        
        if (!problemsResponse.ok) {
          throw new Error('ไม่สามารถโหลดข้อมูลกระทู้ปัญหาได้');
        }
        
        const [allPostsData, reviewsData, problemsData] = await Promise.all([
          allPostsResponse.json(),
          reviewsResponse.json(),
          problemsResponse.json()
        ]);
        
        if (allPostsData.success && reviewsData.success && problemsData.success) {
          const allPosts = allPostsData.posts || [];
          const reviews = reviewsData.posts || [];
          const problems = problemsData.posts || [];
          
          // แยกโพสต์ที่สร้างจากปุ่มรีวิวและปุ่มปัญหา
          const reviewsFromBtn = reviews.filter(post => post.sourceType === 'review');
          const problemsFromBtn = problems.filter(post => post.sourceType === 'problem');
          
          setPosts(allPosts);
          setReviewPosts(reviews);
          setProblemPosts(problems);
          setReviewFromReviewBtn(reviewsFromBtn);
          setProblemFromProblemBtn(problemsFromBtn);
        } else {
          throw new Error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    
    if (username) {
      fetchUserPosts();
    }
  }, [username]);
  
  // ฟังก์ชันแปลงวันที่เป็นรูปแบบภาษาไทย
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'ไม่ระบุวันที่';
    }
  };
  
  // แสดงกระทู้ตามแท็บที่เลือก
  const displayPosts = () => {
    if (activeTab === 'reviews') {
      // แสดงกระทู้รีวิว (ทั้งที่มี boardType เป็น REVIEW และที่มี sourceType เป็น review)
      // เรียงลำดับให้กระทู้ที่มาจากปุ่มรีวิวแสดงก่อน
      return [...reviewPosts].sort((a, b) => {
        // กระทู้ที่มี sourceType เป็น review จะแสดงก่อน
        if (a.sourceType === 'review' && b.sourceType !== 'review') return -1;
        if (a.sourceType !== 'review' && b.sourceType === 'review') return 1;
        // ถ้าทั้งคู่เป็นประเภทเดียวกัน ให้เรียงตามวันที่ล่าสุด
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    if (activeTab === 'problems') {
      // แสดงกระทู้ปัญหา (ทั้งที่มี boardType เป็น QUESTION/BUG_REPORT และที่มี sourceType เป็น problem)
      // เรียงลำดับให้กระทู้ที่มาจากปุ่มปัญหาแสดงก่อน
      return [...problemPosts].sort((a, b) => {
        // กระทู้ที่มี sourceType เป็น problem จะแสดงก่อน
        if (a.sourceType === 'problem' && b.sourceType !== 'problem') return -1;
        if (a.sourceType !== 'problem' && b.sourceType === 'problem') return 1;
        // ถ้าทั้งคู่เป็นประเภทเดียวกัน ให้เรียงตามวันที่ล่าสุด
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    // เรียงกระทู้ทั้งหมดตามประเภท: รีวิว -> ปัญหา -> ทั่วไป และตามวันที่ล่าสุด
    return [...posts].sort((a, b) => {
      // จัดกลุ่มตามประเภท
      const getTypeOrder = (post: BoardPost) => {
        if (post.boardType === 'REVIEW' || post.sourceType === 'review') return 0;
        if (post.boardType === 'QUESTION' || post.boardType === 'BUG_REPORT' || post.sourceType === 'problem') return 1;
        return 2;
      };
      
      const orderA = getTypeOrder(a);
      const orderB = getTypeOrder(b);
      
      // ถ้าประเภทต่างกัน เรียงตามประเภท
      if (orderA !== orderB) return orderA - orderB;
      
      // ถ้าประเภทเดียวกัน เรียงตามวันที่ล่าสุด
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };
  
  // ฟังก์ชันสำหรับสร้างกระทู้ใหม่ตามประเภท
  const createNewPost = (type: string) => {
    // กำหนดเส้นทางและประเภทกระทู้ตามที่เลือก
    let path = '/board/new';
    let boardType = '';
    
    if (type === 'review') {
      path = '/board/reviews/new';
      boardType = 'REVIEW';
    } else if (type === 'problem') {
      path = '/board/problems/new';
      boardType = 'QUESTION';
    } else {
      path = '/board/new';
      boardType = 'DISCUSSION';
    }
    
    // นำทางไปยังหน้าสร้างกระทู้พร้อมพารามิเตอร์
    router.push(`${path}?type=${boardType}`);
  };

  // แสดงข้อความเมื่อไม่มีกระทู้
  const renderEmptyState = () => {
    let message = 'ยังไม่มีกระทู้';
    let createBtnText = 'สร้างกระทู้ใหม่';
    let createType = '';
    
    if (activeTab === 'reviews') {
      message = 'ยังไม่มีกระทู้รีวิว';
      createBtnText = 'สร้างกระทู้รีวิวใหม่';
      createType = 'review';
    } else if (activeTab === 'problems') {
      message = 'ยังไม่มีกระทู้ปัญหา';
      createBtnText = 'สร้างกระทู้ปัญหาใหม่';
      createType = 'problem';
    }
    
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">{message}</p>
        {isCurrentUser && (
          <button 
            onClick={() => createNewPost(createType)}
            className="mt-2 inline-flex items-center gap-1 text-[#8bc34a] hover:text-[#7baf41] hover:underline"
          >
            <Plus size={16} />
            {createBtnText}
          </button>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#8bc34a]"></div>
        <span className="ml-2 text-gray-500">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }
  
  // ฟังก์ชันแสดงไอคอนตามประเภทกระทู้
  const getBoardTypeIcon = (boardType: string) => {
    if (boardType === 'REVIEW') {
      return <Star size={14} className="text-[#ffc107]" />;
    } else if (boardType === 'QUESTION' || boardType === 'BUG_REPORT') {
      return <HelpCircle size={14} className="text-[#f44336]" />;
    } else {
      return <FileText size={14} className="text-[#5495ff]" />;
    }
  };
  
  // ฟังก์ชันแสดงชื่อประเภทกระทู้
  const getBoardTypeName = (boardType: string) => {
    switch (boardType) {
      case 'REVIEW': return 'รีวิว';
      case 'QUESTION': return 'คำถาม';
      case 'BUG_REPORT': return 'แจ้งปัญหา';
      case 'DISCUSSION': return 'พูดคุยทั่วไป';
      case 'NEWS': return 'ข่าวสาร';
      case 'ANNOUNCEMENT': return 'ประกาศ';
      default: return 'ทั่วไป';
    }
  };

  return (
    <div className="py-6">
      {/* ส่วนหัวและปุ่มสร้างกระทู้ */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">กระทู้ของ {username}</h2>
        {isCurrentUser && (
          <div className="relative group">
            <button className="bg-[#8bc34a] hover:bg-[#7baf41] text-white px-3 py-1.5 rounded-md flex items-center gap-1 text-sm">
              <Plus size={16} />
              สร้างกระทู้ใหม่
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-20 hidden group-hover:block">
              <div className="py-1">
                <button 
                  onClick={() => createNewPost('')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                >
                  <FileText size={14} className="text-[#5495ff]" />
                  กระทู้ทั่วไป
                </button>
                <button 
                  onClick={() => createNewPost('review')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                >
                  <Star size={14} className="text-[#ffc107]" />
                  กระทู้รีวิว
                </button>
                <button 
                  onClick={() => createNewPost('problem')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                >
                  <HelpCircle size={14} className="text-[#f44336]" />
                  กระทู้ปัญหา
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* แท็บสำหรับแสดงประเภทกระทู้ */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-md flex items-center ${
            activeTab === 'all'
              ? 'bg-[#8bc34a] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="flex items-center">
            <FileText size={14} className="mr-1" />
            ทั้งหมด 
          </span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white bg-opacity-20 text-sm">
            {posts.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-md flex items-center ${
            activeTab === 'reviews'
              ? 'bg-[#ffc107] text-white'
              : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
          }`}
        >
          <span className="flex items-center">
            <Star size={14} className="mr-1" />
            รีวิว 
          </span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white bg-opacity-20 text-sm">
            {reviewPosts.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('problems')}
          className={`px-4 py-2 rounded-md flex items-center ${
            activeTab === 'problems'
              ? 'bg-[#f44336] text-white'
              : 'bg-red-50 text-red-800 hover:bg-red-100'
          }`}
        >
          <span className="flex items-center">
            <HelpCircle size={14} className="mr-1" />
            ปัญหา 
          </span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white bg-opacity-20 text-sm">
            {problemPosts.length}
          </span>
        </button>
      </div>
      
      {/* รายการกระทู้ */}
      <div className="space-y-4">
        {displayPosts().length > 0 ? (
          displayPosts().map((post) => (
                <div key={post.id} className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
                  post.boardType === 'REVIEW' || post.sourceType === 'review'
                    ? 'border-l-4 border-l-yellow-400'
                    : post.boardType === 'QUESTION' || post.boardType === 'BUG_REPORT' || post.sourceType === 'problem'
                      ? 'border-l-4 border-l-red-400'
                      : 'border-l-4 border-l-blue-400'
                }`}>
              <Link href={`/board/${post.slug}`} className="block">
                <div className="flex items-center gap-2 mb-2">
                  {getBoardTypeIcon(post.boardType)}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    post.boardType === 'REVIEW' 
                      ? 'bg-yellow-50 text-yellow-800' 
                      : post.boardType === 'QUESTION' || post.boardType === 'BUG_REPORT'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-blue-50 text-blue-700'
                  }`}>
                    {getBoardTypeName(post.boardType)}
                  </span>
                  {post.category && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      {post.category.name}
                    </span>
                  )}
                </div>
                
                {/* แสดงข้อมูลนิยายที่เกี่ยวข้อง (เฉพาะกระทู้รีวิว) */}
                {(post.boardType === 'REVIEW' || post.sourceType === 'review') && post.novel && (
                  <div className="flex items-center gap-3 mb-3 bg-yellow-50 p-2 rounded-md">
                    {post.novel.coverImageUrl && (
                      <div className="w-12 h-16 relative overflow-hidden rounded-sm">
                        <img 
                          src={post.novel.coverImageUrl} 
                          alt={post.novel.title}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500">รีวิวนิยายเรื่อง</p>
                      <Link href={`/novels/${post.novel.slug}`} className="text-sm font-medium text-[#5495ff] hover:underline">
                        {post.novel.title}
                      </Link>
                    </div>
                  </div>
                )}
                
                <h3 className="font-medium text-lg hover:text-[#8bc34a] transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1 mb-2 line-clamp-2">
                  {post.content?.replace(/<[^>]*>?/gm, '').substring(0, 150)}
                  {post.content?.length > 150 ? '...' : ''}
                </p>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye size={14} className="text-[#8bc34a]" />
                    <span>{post.viewCount.toLocaleString()} Views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle size={14} className="text-[#8bc34a]" />
                    <span>{post.commentCount.toLocaleString()} ความคิดเห็น</span>
                  </div>
                </div>
              </Link>
            </div>
          ))
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
};