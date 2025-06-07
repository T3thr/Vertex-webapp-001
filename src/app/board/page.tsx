import { authOptions } from "@/app/api/auth/[...nextauth]/options";

import { Eye, MessageCircle, Plus } from "lucide-react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";

// Metadata for the page
export const metadata: Metadata = {
  title: "กระทู้ | DIVWY",
  description: "กระทู้และการสนทนาทั้งหมดบน DIVWY",
};

// types/board.ts
export interface Post {
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


// TODO: Replace with actual data fetching logic
async function getPosts(): Promise<Post[]> {
  // Call your API or database here
  return [];
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
