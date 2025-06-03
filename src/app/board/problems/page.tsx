import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus, Eye, MessageCircle } from "lucide-react";

// Metadata for the page
export const metadata: Metadata = {
  title: "ปัญหา | DIVWY",
  description: "ถาม-ตอบปัญหาการใช้งานแพลตฟอร์ม DIVWY",
};

interface Problem {
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

// Mock data for problems
const problems: Problem[] = [
  {
    id: "1",
    title: "วิธีการอัพโหลดไฟล์นิยายในรูปแบบ PDF ทำยังไงคะ?",
    author: {
      name: "NewWriter",
      avatar: "/images/character/Ana_portrait.png"
    },
    thumbnail: "/images/thriller/thriller1.jpg",
    createdAt: "12 ม.ค. 2567 เวลา 13:30",
    viewCount: 156,
    commentCount: 8
  },
  {
    id: "2",
    title: "เหตุใดระบบถึงไม่อนุญาตให้แก้ไขเนื้อหาหลังโพสต์ไปแล้ว 24 ชั่วโมง",
    author: {
      name: "Confused",
      avatar: "/images/character/Cho_portrait.png"
    },
    thumbnail: "/images/thriller/thriller2.jpg",
    createdAt: "12 ม.ค. 2567 เวลา 13:30",
    viewCount: 234,
    commentCount: 12
  },
  {
    id: "3",
    title: "ขอคำแนะนำวิธีการตั้งค่าการแจ้งเตือนเมื่อมีคนมาคอมเมนต์ในนิยายค่ะ",
    author: {
      name: "TechNewbie",
      avatar: "/images/character/Hoshi_portrait.png"
    },
    thumbnail: "/images/thriller/choose.jpg",
    createdAt: "12 ม.ค. 2567 เวลา 12:45",
    viewCount: 189,
    commentCount: 15
  },
  {
    id: "4",
    title: "ระบบการชำระเงินมีปัญหา ไม่สามารถซื้อ Credit ได้ครับ",
    author: {
      name: "PaymentIssue",
      avatar: "/images/character/Riwsey_portrait.png"
    },
    thumbnail: "/images/fantasy/fantasy1.jpg",
    createdAt: "12 ม.ค. 2567 เวลา 11:20",
    viewCount: 445,
    commentCount: 23
  },
  {
    id: "5",
    title: "วิธีการปิดการแสดงความคิดเห็นในนิยายทำยังไงคะ?",
    author: {
      name: "PrivacyFirst",
      avatar: "/images/character/Toya_portrait.png"
    },
    thumbnail: "/images/fantasy/fantasy2.jpg",
    createdAt: "12 ม.ค. 2567 เวลา 10:15",
    viewCount: 267,
    commentCount: 11
  },
  {
    id: "6",
    title: "ขั้นตอนการยืนยันตัวตนเพื่อรับเงินรายได้จากนิยายทำอย่างไร",
    author: {
      name: "MoneyQuestion",
      avatar: "/images/character/Yue_portrait.png"
    },
    thumbnail: "/images/novel1.png",
    createdAt: "11 ม.ค. 2567 เวลา 22:30",
    viewCount: 523,
    commentCount: 31
  },
  {
    id: "7",
    title: "แท็กในนิยายหายไปหลังจากอัพเดทเนื้อหา ต้องทำไงดีครับ?",
    author: {
      name: "TagProblem",
      avatar: "/images/character/dylan.png"
    },
    thumbnail: "/images/novel2.png",
    createdAt: "11 ม.ค. 2567 เวลา 20:45",
    viewCount: 178,
    commentCount: 9
  },
  {
    id: "8",
    title: "ลืมรหัสผ่านแต่อีเมลที่ใช้สมัครเข้าไม่ได้แล้ว ต้องทำยังไง",
    author: {
      name: "LostAccess",
      avatar: "/images/character/ella.png"
    },
    thumbnail: "/images/novel3.jpg",
    createdAt: "11 ม.ค. 2567 เวลา 18:30",
    viewCount: 634,
    commentCount: 42
  },
  {
    id: "9",
    title: "วิธีการรายงานเนื้อหาที่ละเมิดลิขสิทธิ์ทำยังไงครับ?",
    author: {
      name: "CopyRight",
      avatar: "/images/character/gracie.png"
    },
    thumbnail: "/images/novel4.jpg",
    createdAt: "11 ม.ค. 2567 เวลา 16:20",
    viewCount: 345,
    commentCount: 19
  },
  {
    id: "10",
    title: "ระบบแปลอัตโนมัติใช้งานไม่ได้ มีใครเจอปัญหาเดียวกันไหมคะ",
    author: {
      name: "TranslateBug",
      avatar: "/images/character/matthew.png"
    },
    thumbnail: "/images/novel4.png",
    createdAt: "11 ม.ค. 2567 เวลา 14:15",
    viewCount: 423,
    commentCount: 28
  }
];

export default function ProblemsPage() {
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
                ${tab.id === 'problems'
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

      {/* Problems Grid */}
      <div className="space-y-4">
        {problems.map((problem) => (
          <Link 
            key={problem.id}
            href={`/board/problems/${problem.id}`}
            className="block bg-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="flex items-start p-4 gap-4">
              <div className="relative w-48 h-32 rounded-md overflow-hidden shrink-0">
                <Image
                  src={problem.thumbnail}
                  alt={problem.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-lg mb-2 line-clamp-2">
                  {problem.title}
                </h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-auto">
                  <div className="flex items-center gap-2">
                    <Image
                      src={problem.author.avatar}
                      alt={problem.author.name}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                    <span>{problem.author.name}</span>
                  </div>
                  <span>•</span>
                  <span>{problem.createdAt}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Eye size={16} className="text-[#8bc34a]" />
                    <span>{problem.viewCount}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MessageCircle size={16} className="text-[#8bc34a]" />
                    <span>{problem.commentCount}</span>
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