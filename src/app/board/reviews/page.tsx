import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import BoardModel from "@/backend/models/Board";
import { BoardType } from "@/backend/models/BoardClientSide";
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { Eye, MessageCircle, Plus } from "lucide-react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";

// Metadata for the page
export const metadata: Metadata = {
  title: "รีวิว | DIVWY",
  description: "รีวิวและบทความทั้งหมดบน DIVWY",
};

interface Review {
  id: string;
  slug: string;
  title: string;
  author: {
    name: string;
    avatar: string;
  };
  thumbnail?: string;
  createdAt: Date;
  viewCount: number;
  commentCount: number;
}

// ดึงข้อมูลรีวิวจากฐานข้อมูล
async function getReviews(): Promise<Review[]> {
  await dbConnect();
  
  try {
    // ดึงกระทู้ประเภทรีวิว
    const reviews = await BoardModel.find({ 
      boardType: BoardType.REVIEW,
      status: "published", 
      isDeleted: false 
    })
    .sort({ createdAt: -1 })
    .populate('authorId', 'username profile.avatarUrl')
    .populate('novelAssociated', 'coverImageUrl')
    .lean();
    
    return reviews.map((review: any) => ({
      id: review._id.toString(),
      slug: review.slug,
      title: review.title,
      author: {
        name: review.authorUsername || review.authorId?.username || "ไม่ระบุชื่อ",
        avatar: review.authorAvatarUrl || review.authorId?.profile?.avatarUrl || "/images/default-avatar.png"
      },
      thumbnail: review.novelAssociated?.coverImageUrl || "/images/default.png",
      createdAt: review.createdAt,
      viewCount: review.stats?.viewsCount || 0,
      commentCount: review.stats?.repliesCount || 0,
    }));
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
}

// ฟังก์ชันแปลงวันที่เป็นรูปแบบภาษาไทย
function formatThaiDate(date: Date): string {
  try {
    // แปลง date string เป็น Date object (ถ้าเป็น string)
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // ตรวจสอบว่า date ถูกต้องหรือไม่
    if (isNaN(dateObj.getTime())) {
      return "ไม่ระบุวันที่";
    }
    
    // แปลงเป็นรูปแบบ "X วันที่แล้ว" หรือวันที่เต็ม
    return formatDistanceToNow(dateObj, { 
      addSuffix: true, 
      locale: th 
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "ไม่ระบุวันที่";
  }
}

export default async function ReviewsPage() {
  const session = await getServerSession(authOptions);
  const reviews = await getReviews();

  const tabs = [
    { id: 'all', label: 'กระทู้รวม', href: '/board' },
    { id: 'reviews', label: 'รีวิว', href: '/board/reviews' },
    { id: 'problems', label: 'ปัญหา', href: '/board/problems' },
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      {/* Board Categories Tabs */}
      <nav className="mb-8 border-b">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative
                ${tab.id === 'reviews'
                  ? 'text-[#8bc34a] border-b-2 border-[#8bc34a]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Header with Sort Dropdown and New Post Button */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <select className="px-3 py-1.5 rounded-lg border bg-background text-sm">
            <option value="latest">ล่าสุด</option>
            <option value="popular">ยอดนิยม</option>
            <option value="comments">ความคิดเห็นมากสุด</option>
          </select>
        </div>
        <Link
          href="/board/new?type=review"
          className="inline-flex items-center px-4 py-2 bg-[#8bc34a] text-white rounded-full hover:bg-[#7baf41] transition-colors"
        >
          <Plus size={18} className="mr-1" />
          <span>เขียนรีวิวใหม่</span>
        </Link>
      </div>

      {/* Reviews Grid */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <Link 
              key={review.id}
              href={`/board/${review.slug}`}
              className="block bg-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="flex items-start p-4 gap-4">
                <div className="relative w-48 h-32 rounded-md overflow-hidden shrink-0">
                  <Image
                    src={review.thumbnail || "/images/default.png"}
                    alt={review.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-lg mb-2 line-clamp-2">
                    {review.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-auto">
                    <div className="flex items-center gap-2">
                      <Image
                        src={review.author.avatar}
                        alt={review.author.name}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <span>{review.author.name}</span>
                    </div>
                    <span>•</span>
                    <span>{formatThaiDate(review.createdAt)}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Eye size={16} className="text-[#8bc34a]" />
                      <span>{review.viewCount.toLocaleString()}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <MessageCircle size={16} className="text-[#8bc34a]" />
                      <span>{review.commentCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 bg-gray-100 rounded-lg">
            <p className="text-muted-foreground mb-2">ยังไม่มีรีวิวในขณะนี้</p>
            <Link
              href="/board/new?type=review"
              className="inline-flex items-center px-4 py-2 bg-[#8bc34a] text-white rounded-full hover:bg-[#7baf41] transition-colors mt-2"
            >
              <Plus size={18} className="mr-1" />
              <span>เขียนรีวิวแรก</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}