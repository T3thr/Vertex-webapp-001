import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import { registerModels } from "@/backend/models";
import BoardModel, { BoardType } from "@/backend/models/Board";
// นำเข้าโมเดล Category และ Comment เพื่อให้แน่ใจว่าถูกลงทะเบียน
import "@/backend/models/Category";
import DeletePostButton from "@/components/DeletePostButton";
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
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
  content: string;
  boardType: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  viewCount: number;
  commentCount: number;
  imageUrl?: string;
}

// ดึงข้อมูลกระทู้จากฐานข้อมูล
async function getPosts(): Promise<any[]> {
  await dbConnect();
  // ลงทะเบียนโมเดลทั้งหมด
  registerModels();
  
  try {
    // ดึงกระทู้ล่าสุด - ลดข้อมูลที่ดึงมาเพื่อประหยัดหน่วยความจำ
    const latestPosts = await BoardModel.find({ 
      status: "published", 
      isDeleted: false 
    })
    .select('_id slug title content boardType authorId authorUsername authorAvatarUrl createdAt stats')
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('authorId', '_id username profile.avatarUrl')
    .lean();
    
    return latestPosts.map((post: any) => ({
      id: post._id.toString(),
      slug: post.slug,
      title: post.title,
      content: post.content,
      boardType: post.boardType,
      author: {
        id: post.authorId._id.toString(),
        name: post.authorUsername || post.authorId.username,
        avatar: post.authorAvatarUrl || post.authorId.profile?.avatarUrl,
      },
      createdAt: post.createdAt,
      viewCount: post.stats?.viewsCount || 0,
      commentCount: post.stats?.repliesCount || 0,
    }));
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}

// ดึงข้อมูลกระทู้ยอดนิยม
async function getPopularPosts(): Promise<any[]> {
  await dbConnect();
  // ลงทะเบียนโมเดลทั้งหมด
  registerModels();
  
  try {
    // ดึงกระทู้ยอดนิยม (เรียงตามจำนวนการเข้าชม) - ลดข้อมูลที่ดึงมา
    const popularPosts = await BoardModel.find({ 
      status: "published", 
      isDeleted: false 
    })
    .select('_id slug title authorUsername createdAt stats')
    .sort({ 'stats.viewsCount': -1 })
    .limit(5)
    .lean();
    
    return popularPosts.map((post: any) => ({
      id: post._id.toString(),
      slug: post.slug,
      title: post.title,
      createdAt: post.createdAt,
      author: post.authorUsername,
      viewCount: post.stats?.viewsCount || 0,
      commentCount: post.stats?.repliesCount || 0,
    }));
  } catch (error) {
    console.error("Error fetching popular posts:", error);
    return [];
  }
}

// ฟังก์ชันแปลงประเภทกระทู้เป็นข้อความภาษาไทย
function getBoardTypeLabel(boardType: string): string {
  switch (boardType) {
    case BoardType.DISCUSSION:
      return "พูดคุยทั่วไป";
    case BoardType.QUESTION:
      return "คำถาม";
    case BoardType.REVIEW:
      return "รีวิว";
    case BoardType.GUIDE:
      return "แนะนำ/สอน";
    case BoardType.FAN_CREATION:
      return "ผลงานแฟน";
    case BoardType.THEORY_CRAFTING:
      return "ทฤษฎี";
    case BoardType.BUG_REPORT:
      return "รายงานปัญหา";
    default:
      return "ไม่ระบุประเภท";
  }
}

// ฟังก์ชันแปลงวันที่เป็นรูปแบบภาษาไทยที่มีประสิทธิภาพ
function formatThaiDate(date: Date): { date: string; time: string } {
  try {
    // แปลง date string เป็น Date object (ถ้าเป็น string)
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // ตรวจสอบว่า date ถูกต้องหรือไม่
    if (isNaN(dateObj.getTime())) {
      return { date: "ไม่ระบุ", time: "ไม่ระบุ" };
    }
    
    // แปลงเป็นรูปแบบ "X วันที่แล้ว" หรือวันที่เต็ม
    const relativeTime = formatDistanceToNow(dateObj, { 
      addSuffix: true, 
      locale: th 
    });
    
    // แยกเวลา
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes} น.`;
    
    return { 
      date: relativeTime, 
      time: time 
    };
  } catch (error) {
    return { date: "ไม่ระบุ", time: "ไม่ระบุ" };
  }
}

export default async function BoardPage() {
  // ดึงข้อมูลแบบขนาน (parallel) เพื่อเพิ่มประสิทธิภาพ
  const [session, posts, popularPosts] = await Promise.all([
    getServerSession(authOptions),
    getPosts(),
    getPopularPosts()
  ]);

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
        <h2 className="text-lg font-semibold mb-4">Top 5 กระทู้ยอดนิยม</h2>
        <div className="space-y-3">
          {popularPosts.length > 0 ? (
            popularPosts.map((post, index) => {
              const { date, time } = formatThaiDate(post.createdAt);
              return (
                <div key={post.id} className="flex items-start gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center font-medium mt-1">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <Link href={`/board/${post.slug}`} className="hover:text-primary transition-colors block mb-1">
                      {post.title}
                    </Link>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{date}</span>
                        <span>•</span>
                        <span>เวลา {time}</span>
                        <span>•</span>
                        <span>โดย {post.author}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[#8bc34a] text-base font-semibold">{post.viewCount.toLocaleString()}</span>
                          <span className="text-muted-foreground text-xs">Views</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[#8bc34a] text-base font-semibold">{post.commentCount > 0 ? post.commentCount.toLocaleString() : '0'}</span>
                          <span className="text-muted-foreground text-xs">ความคิดเห็น</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              ยังไม่มีกระทู้ยอดนิยม
            </div>
          )}
        </div>
      </section>

      {/* Latest Posts Section */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-4">กระทู้ล่าสุด</h2>
      </section>

      {/* Posts Grid */}
      <section>
        <div className="grid gap-6">
          {posts.length > 0 ? (
            posts.map((post) => {
              const { date } = formatThaiDate(post.createdAt);
              const isAuthor = session?.user?.id === post.author.id;
              
              return (
                <article key={post.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <Link href={`/board/${post.slug}`}>
                          <h3 className="font-medium text-lg hover:text-primary transition-colors">
                            {post.title}
                          </h3>
                          <div className="text-xs text-[#8bc34a] mt-1 mb-1">
                            {getBoardTypeLabel(post.boardType)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 mb-2 line-clamp-2">
                            {post.content?.replace(/<[^>]*>?/gm, '').substring(0, 150)}
                            {post.content?.length > 150 ? '...' : ''}
                          </p>
                        </Link>
                        {isAuthor && (
                          <DeletePostButton postId={post.id} postSlug={post.slug} />
                        )}
                      </div>
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
                        <span>{date}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Eye size={16} className="text-[#8bc34a]" />
                          <span>{post.viewCount.toLocaleString()} Views</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <MessageCircle size={16} className="text-[#8bc34a]" />
                          <span><strong className="text-[#8bc34a]">{post.commentCount > 0 ? post.commentCount.toLocaleString() : '0'}</strong> ความคิดเห็น</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              ยังไม่มีกระทู้ในขณะนี้
            </div>
          )}
        </div>
      </section>
    </main>
  );
}