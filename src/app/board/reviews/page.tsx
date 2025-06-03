import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus, Eye, MessageCircle } from "lucide-react";

// Metadata for the page
export const metadata: Metadata = {
  title: "รีวิว | DIVWY",
  description: "รีวิวและบทความทั้งหมดบน DIVWY",
};

interface Review {
  id: string;
  title: string;
  author: {
    name: string;
    avatar: string;
  };
  thumbnail: string;
  createdAt: string;
  viewCount: number;
  commentCount: number;
}

// Mock data for reviews
const reviews: Review[] = [
  {
    id: "1",
    title: "นิยายรักใส ๆ ที่ไม่ได้โลเวอร์ ๆ แค่ในชื่อเรื่อง!",
    author: {
      name: "อ่อน",
      avatar: "/images/default.png"
    },
    thumbnail: "/images/romance/novel1.jpg",
    createdAt: "12 ม.ค. 2567 เวลา 13:30",
    viewCount: 250,
    commentCount: 15
  },
  {
    id: "2",
    title: "นิยายแฟนตาซีสายดาร์ก x วายเกมส์ ๆ จำเพาะเด็กเกมเมอร์",
    author: {
      name: "อ่อน",
      avatar: "/images/default2.png"
    },
    thumbnail: "/images/romance/novel2.jpg",
    createdAt: "12 ม.ค. 2567 เวลา 13:30",
    viewCount: 250,
    commentCount: 15
  },
  {
    id: "3",
    title: "รีวิว: เมื่อฉันกลายเป็นนางเอกในนิยายโรแมนซ์ย้อนยุค",
    author: {
      name: "BookWorm",
      avatar: "/images/default-avatar.png"
    },
    thumbnail: "/images/romance/novel3.jpeg",
    createdAt: "12 ม.ค. 2567 เวลา 12:45",
    viewCount: 378,
    commentCount: 42
  },
  {
    id: "4",
    title: "แนะนำนิยายแนวสืบสวนสอบสวน Top 5 ประจำเดือนมกราคม",
    author: {
      name: "DetectiveReader",
      avatar: "/images/default.png"
    },
    thumbnail: "/images/romance/novel4.jpeg",
    createdAt: "12 ม.ค. 2567 เวลา 11:20",
    viewCount: 425,
    commentCount: 28
  },
  {
    id: "5",
    title: "รีวิว: ตำนานดาบศักดิ์สิทธิ์ เล่ม 1-3 ฉบับปรับปรุงใหม่",
    author: {
      name: "FantasyLover",
      avatar: "/images/default2.png"
    },
    thumbnail: "/images/romance/novel5.jpeg",
    createdAt: "12 ม.ค. 2567 เวลา 10:15",
    viewCount: 312,
    commentCount: 19
  },
  {
    id: "6",
    title: "วิเคราะห์: เทคนิคการเขียนของนักเขียนรางวัลซีไรต์ปี 2566",
    author: {
      name: "LitCritic",
      avatar: "/images/default-avatar.png"
    },
    thumbnail: "/images/thriller/choose.jpg",
    createdAt: "11 ม.ค. 2567 เวลา 22:30",
    viewCount: 567,
    commentCount: 45
  },
  {
    id: "7",
    title: "รีวิว: นิยายแนวออฟฟิศโรแมนซ์ที่ทำยอดขายทะลุล้านเล่ม",
    author: {
      name: "RomanceQueen",
      avatar: "/images/default.png"
    },
    thumbnail: "/images/romance/novel7.jpeg",
    createdAt: "11 ม.ค. 2567 เวลา 20:45",
    viewCount: 489,
    commentCount: 37
  },
  {
    id: "8",
    title: "แนะนำนิยายแฟนตาซีแนวเอาชีวิตรอดในโลกเกม Must Read!",
    author: {
      name: "GameMaster",
      avatar: "/images/default2.png"
    },
    thumbnail: "/images/fantasy/fantasy1.jpg",
    createdAt: "11 ม.ค. 2567 เวลา 18:30",
    viewCount: 634,
    commentCount: 52
  },
  {
    id: "9",
    title: "รีวิว: ซีรีส์นิยายแนววิทยาศาสตร์ที่ควรอ่านก่อนถูกดัดแปลงเป็นซีรีส์",
    author: {
      name: "SciFiExpert",
      avatar: "/images/default-avatar.png"
    },
    thumbnail: "/images/fantasy/fantasy2.jpg",
    createdAt: "11 ม.ค. 2567 เวลา 16:20",
    viewCount: 445,
    commentCount: 31
  },
  {
    id: "10",
    title: "บทวิเคราะห์: ทำไมนิยายแนวย้อนเวลากลับมาฮิตอีกครั้ง",
    author: {
      name: "TrendAnalyst",
      avatar: "/images/default.png"
    },
    thumbnail: "/images/thriller/thriller1.jpg",
    createdAt: "11 ม.ค. 2567 เวลา 14:15",
    viewCount: 523,
    commentCount: 48
  }
];

export default function ReviewsPage() {
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
          href="/board/new"
          className="inline-flex items-center px-4 py-2 bg-[#8bc34a] text-white rounded-full hover:bg-[#7baf41] transition-colors"
        >
          <Plus size={18} className="mr-1" />
          <span>เพิ่มกระทู้ใหม่</span>
        </Link>
      </div>

      {/* Reviews Grid */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Link 
            key={review.id}
            href={`/board/reviews/${review.id}`}
            className="block bg-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="flex items-start p-4 gap-4">
              <div className="relative w-48 h-32 rounded-md overflow-hidden shrink-0">
                <Image
                  src={review.thumbnail}
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
                  <span>{review.createdAt}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Eye size={16} className="text-[#8bc34a]" />
                    <span>{review.viewCount}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MessageCircle size={16} className="text-[#8bc34a]" />
                    <span>{review.commentCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
} 