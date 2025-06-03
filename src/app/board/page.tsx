import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { Plus, Eye, MessageCircle } from "lucide-react";

// Metadata for the page
export const metadata: Metadata = {
  title: "กระทู้ | DIVWY",
  description: "กระทู้และการสนทนาทั้งหมดบน DIVWY",
};

// Types
interface Post {
  id: string;
  title: string;
  author: {
    name: string;
    avatar?: string;
  };
  createdAt: string;
  viewCount: number;
  commentCount: number;
  imageUrl?: string;
}

// Mock data fetching function (replace with actual API call)
async function getPosts() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock data
  const posts: Post[] = [
    {
      id: "1",
      title: "ม่านบังตาเปิดเผยเรื่องราวความรักของเรา",
      author: {
        name: "นักเขียนนิรนาม",
        avatar: "/images/default.png",
      },
      createdAt: "25 ม.ค. 2567 เวลา 13:55",
      viewCount: 150,
      commentCount: 12,
      imageUrl: "/images/romance/novel1.jpg",
    },
    {
      id: "2",
      title: "เรื่องราวของคุณ & ฉัน จบลงด้วยความสุข 💗",
      author: {
        name: "ผู้แต่งนิยาย",
        avatar: "/images/default2.png",
      },
      createdAt: "25 ม.ค. 2567 เวลา 12:55",
      viewCount: 89,
      commentCount: 5,
      imageUrl: "/images/romance/novel2.jpg",
    },
    {
      id: "3",
      title: "วิธีแก้ปัญหาการอัพโหลดไฟล์ PDF ขนาดใหญ่",
      author: {
        name: "TechHelper",
        avatar: "/images/default-avatar.png",
      },
      createdAt: "25 ม.ค. 2567 เวลา 11:30",
      viewCount: 245,
      commentCount: 18,
      imageUrl: "/images/fantasy/fantasy1.jpg",
    },
    {
      id: "4",
      title: "รีวิว: นิยายแนวสืบสวนที่ต้องอ่าน!",
      author: {
        name: "MysteryReader",
        avatar: "/images/default.png",
      },
      createdAt: "25 ม.ค. 2567 เวลา 10:15",
      viewCount: 320,
      commentCount: 25,
      imageUrl: "/images/thriller/thriller1.jpg",
    },
    {
      id: "5",
      title: "แชร์เทคนิคการเขียนฉากแอคชั่น",
      author: {
        name: "ActionWriter",
        avatar: "/images/default2.png",
      },
      createdAt: "25 ม.ค. 2567 เวลา 09:45",
      viewCount: 178,
      commentCount: 15,
      imageUrl: "/images/fantasy/fantasy2.jpg",
    },
    {
      id: "6",
      title: "ปัญหาการชำระเงิน: วิธีแก้ไขเบื้องต้น",
      author: {
        name: "AdminSupport",
        avatar: "/images/default-avatar.png",
      },
      createdAt: "25 ม.ค. 2567 เวลา 08:30",
      viewCount: 423,
      commentCount: 32,
      imageUrl: "/images/thriller/choose.jpg",
    },
    {
      id: "7",
      title: "แนะนำนิยายแนวตลกเบาสมอง Top 5",
      author: {
        name: "ComedyFan",
        avatar: "/images/default.png",
      },
      createdAt: "24 ม.ค. 2567 เวลา 22:15",
      viewCount: 267,
      commentCount: 19,
      imageUrl: "/images/comedy/comedy2.jpg",
    },
    {
      id: "8",
      title: "วิธีสร้างตัวละครให้มีเสน่ห์",
      author: {
        name: "CharacterDesigner",
        avatar: "/images/default2.png",
      },
      createdAt: "24 ม.ค. 2567 เวลา 21:00",
      viewCount: 345,
      commentCount: 28,
      imageUrl: "/images/romance/novel3.jpeg",
    },
    {
      id: "9",
      title: "รีวิว: นิยายแฟนตาซีเรื่องใหม่ของนักเขียนดัง",
      author: {
        name: "FantasyExpert",
        avatar: "/images/default-avatar.png",
      },
      createdAt: "24 ม.ค. 2567 เวลา 19:45",
      viewCount: 512,
      commentCount: 45,
      imageUrl: "/images/fantasy/fantasy1.jpg",
    },
    {
      id: "10",
      title: "สอนใช้งานระบบแจ้งเตือนบนเว็บไซต์",
      author: {
        name: "SystemGuide",
        avatar: "/images/default.png",
      },
      createdAt: "24 ม.ค. 2567 เวลา 18:30",
      viewCount: 189,
      commentCount: 14,
      imageUrl: "/images/thriller/thriller2.jpg",
    },
    {
      id: "11",
      title: "แนะนำนิยายแนวย้อนยุคมาใหม่",
      author: {
        name: "HistoryNerd",
        avatar: "/images/default2.png",
      },
      createdAt: "24 ม.ค. 2567 เวลา 17:15",
      viewCount: 234,
      commentCount: 21,
      imageUrl: "/images/romance/novel4.jpeg",
    },
    {
      id: "12",
      title: "วิธีเขียนบทสนทนาให้สมจริง",
      author: {
        name: "DialoguePro",
        avatar: "/images/default-avatar.png",
      },
      createdAt: "24 ม.ค. 2567 เวลา 16:00",
      viewCount: 378,
      commentCount: 31,
      imageUrl: "/images/comedy/novel1.jpg",
    },
    {
      id: "13",
      title: "รีวิว: นิยายรักโรแมนติกเรื่องล่าสุด",
      author: {
        name: "RomanceReader",
        avatar: "/images/default.png",
      },
      createdAt: "24 ม.ค. 2567 เวลา 14:45",
      viewCount: 445,
      commentCount: 38,
      imageUrl: "/images/romance/novel5.jpeg",
    },
    {
      id: "14",
      title: "แชร์ประสบการณ์: จากนักอ่านสู่นักเขียน",
      author: {
        name: "NewAuthor",
        avatar: "/images/default2.png",
      },
      createdAt: "24 ม.ค. 2567 เวลา 13:30",
      viewCount: 289,
      commentCount: 24,
      imageUrl: "/images/fantasy/fantasy2.jpg",
    },
    {
      id: "15",
      title: "วิธีสร้างโครงเรื่องให้น่าติดตาม",
      author: {
        name: "PlotMaster",
        avatar: "/images/default-avatar.png",
      },
      createdAt: "24 ม.ค. 2567 เวลา 12:15",
      viewCount: 567,
      commentCount: 42,
      imageUrl: "/images/romance/novel7.jpeg",
    },
    {
      id: "16",
      title: "เทคนิคการเขียนนิยายแนวสยองขวัญ",
      author: {
        name: "HorrorWriter",
        avatar: "/images/default.png",
      },
      createdAt: "24 ม.ค. 2567 เวลา 11:00",
      viewCount: 432,
      commentCount: 36,
      imageUrl: "/images/thriller/thriller1.jpg",
    },
    {
      id: "17",
      title: "วิธีการสร้างแรงบันดาลใจในการเขียน",
      author: {
        name: "InspirationGuru",
        avatar: "/images/default2.png",
      },
      createdAt: "24 ม.ค. 2567 เวลา 09:45",
      viewCount: 623,
      commentCount: 47,
      imageUrl: "/images/fantasy/fantasy2.jpg",
    },
    {
      id: "18",
      title: "แนะนำนิยายแนววิทยาศาสตร์สุดล้ำ",
      author: {
        name: "SciFiLover",
        avatar: "/images/default-avatar.png",
      },
      createdAt: "24 ม.ค. 2567 เวลา 08:30",
      viewCount: 345,
      commentCount: 29,
      imageUrl: "/images/comedy/novel2.jpg",
    },
    {
      id: "19",
      title: "เคล็ดลับการเขียนนิยายให้ขายดี",
      author: {
        name: "BestsellerAuthor",
        avatar: "/images/default.png",
      },
      createdAt: "23 ม.ค. 2567 เวลา 22:15",
      viewCount: 789,
      commentCount: 56,
      imageUrl: "/images/romance/novel1.jpg",
    },
    {
      id: "20",
      title: "รีวิว: นิยายแนวผจญภัยเรื่องใหม่",
      author: {
        name: "AdventureSeeker",
        avatar: "/images/default2.png",
      },
      createdAt: "23 ม.ค. 2567 เวลา 21:00",
      viewCount: 567,
      commentCount: 43,
      imageUrl: "/images/fantasy/fantasy1.jpg",
    },
    {
      id: "21",
      title: "วิธีการสร้างฉากที่น่าจดจำ",
      author: {
        name: "SceneMaster",
        avatar: "/images/default-avatar.png",
      },
      createdAt: "23 ม.ค. 2567 เวลา 19:45",
      viewCount: 432,
      commentCount: 35,
      imageUrl: "/images/romance/novel2.jpg",
    },
    {
      id: "22",
      title: "เทคนิคการเขียนบทบรรยาย",
      author: {
        name: "DescriptionPro",
        avatar: "/images/default.png",
      },
      createdAt: "23 ม.ค. 2567 เวลา 18:30",
      viewCount: 345,
      commentCount: 28,
      imageUrl: "/images/thriller/thriller2.jpg",
    },
    {
      id: "23",
      title: "แชร์ประสบการณ์: การเขียนนิยายเรื่องแรก",
      author: {
        name: "FirstTimer",
        avatar: "/images/default2.png",
      },
      createdAt: "23 ม.ค. 2567 เวลา 17:15",
      viewCount: 678,
      commentCount: 52,
      imageUrl: "/images/comedy/novel1.jpg",
    },
    {
      id: "24",
      title: "รีวิว: นิยายแนวดราม่าสุดซึ้ง",
      author: {
        name: "DramaLover",
        avatar: "/images/default-avatar.png",
      },
      createdAt: "23 ม.ค. 2567 เวลา 16:00",
      viewCount: 456,
      commentCount: 39,
      imageUrl: "/images/romance/novel3.jpeg",
    },
    {
      id: "25",
      title: "วิธีการสร้างความขัดแย้งในเรื่อง",
      author: {
        name: "ConflictCreator",
        avatar: "/images/default.png",
      },
      createdAt: "23 ม.ค. 2567 เวลา 14:45",
      viewCount: 543,
      commentCount: 41,
      imageUrl: "/images/fantasy/fantasy2.jpg",
    }
  ];

  return posts;
}

export default async function BoardPage() {
  const session = await getServerSession(authOptions);
  const posts = await getPosts();

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
                ${tab.id === 'all' 
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

      {/* New Post Button Section */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-lg font-semibold">กระทู้ทั้งหมด</h2>
        <Link
          href="/board/new"
          className="inline-flex items-center px-4 py-2 bg-[#8bc34a] text-white rounded-full hover:bg-[#7baf41] transition-colors"
        >
          <Plus size={18} className="mr-1" />
          <span>เพิ่มกระทู้ใหม่</span>
        </Link>
      </div>

      {/* Top 5 Popular Topics */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Top 5 กระทู้ยอดนิยมประจำเดือน</h2>
        <div className="space-y-3">
          {[
            {
              title: "วิธีการเขียนนิยายให้น่าสนใจ สำหรับมือใหม่",
              date: "28 มกราคม 2567",
              time: "09:30 น.",
              author: "WritingMaster",
              views: 892
            },
            {
              title: "รีวิว: เส้นทางรักนักเขียนออนไลน์ เล่ม 1-3",
              date: "27 มกราคม 2567",
              time: "15:45 น.",
              author: "BookLover99",
              views: 654
            },
            {
              title: "แชร์ประสบการณ์: จากนักอ่านสู่นักเขียนมือใหม่",
              date: "26 มกราคม 2567",
              time: "18:20 น.",
              author: "NewWriter2024",
              views: 543
            },
            {
              title: "ทริคการวางโครงเรื่องให้น่าติดตาม",
              date: "25 มกราคม 2567",
              time: "11:15 น.",
              author: "StoryGuide",
              views: 421
            },
            {
              title: "ชวนคุยเรื่องการสร้างตัวละครให้มีมิติ",
              date: "24 มกราคม 2567",
              time: "14:05 น.",
              author: "CharacterPro",
              views: 387
            }
          ].map((post, index) => (
            <div key={index} className="flex items-start gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center font-medium mt-1">
                {index + 1}
              </span>
              <div className="flex-1">
                <Link href="#" className="hover:text-primary transition-colors block mb-1">
                  {post.title}
                </Link>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>เวลา {post.time}</span>
                    <span>•</span>
                    <span>โดย {post.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[#8bc34a] text-base font-semibold">{post.views}</span>
                    <span className="text-muted-foreground text-xs">Views</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Latest Posts Section */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-4">กระทู้ล่าสุด</h2>
      </section>

      {/* Posts Grid */}
      <section>
        <div className="grid gap-6">
          {posts.map((post) => (
            <article key={post.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {post.imageUrl && (
                  <div className="relative w-24 h-24 rounded-md overflow-hidden shrink-0">
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/board/${post.id}`}>
                    <h3 className="font-medium text-lg mb-2 hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {post.author.avatar && (
                        <Image
                          src={post.author.avatar}
                          alt={post.author.name}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      )}
                      <span>{post.author.name}</span>
                    </div>
                    <span>•</span>
                    <span>{post.createdAt}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Eye size={16} className="text-[#8bc34a]" />
                      <span>{post.viewCount} Views</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <MessageCircle size={16} className="text-[#8bc34a]" />
                      <span>{post.commentCount} ความคิดเห็น</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
