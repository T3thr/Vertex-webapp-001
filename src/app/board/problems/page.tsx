import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import { registerModels } from "@/backend/models";
import BoardModel from "@/backend/models/Board";
// นำเข้าโมเดล Category และ Comment เพื่อให้แน่ใจว่าถูกลงทะเบียน
import { BoardType } from "@/backend/models/BoardClientSide";
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
  title: "ปัญหา | DIVWY",
  description: "ถาม-ตอบปัญหาการใช้งานแพลตฟอร์ม DIVWY",
};

interface Problem {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  createdAt: Date;
  viewCount: number;
  commentCount: number;
  isSolved: boolean;
}

// ดึงข้อมูลกระทู้ปัญหาจากฐานข้อมูล
async function getProblems(): Promise<Problem[]> {
  await dbConnect();
  // ลงทะเบียนโมเดลทั้งหมด
  registerModels();
  
  try {
    // ดึงกระทู้ประเภทปัญหา (QUESTION, BUG_REPORT)
    const problems = await BoardModel.find({ 
      boardType: { $in: [BoardType.QUESTION, BoardType.BUG_REPORT] },
      status: "published", 
      isDeleted: false 
    })
    .sort({ createdAt: -1 })
    .populate('authorId', 'username profile.avatarUrl')
    .lean();
    
    return problems.map((problem: any) => ({
      id: problem._id.toString(),
      slug: problem.slug,
      title: problem.title,
      content: problem.content, // เพิ่มเนื้อหาเพื่อแสดงเป็นรายละเอียด
      author: {
        id: problem.authorId?._id?.toString() || problem.authorId?.toString(),
        name: problem.authorUsername || problem.authorId?.username || "ไม่ระบุชื่อ",
        avatar: problem.authorAvatarUrl || problem.authorId?.profile?.avatarUrl || "/images/default-avatar.png"
      },
      createdAt: problem.createdAt,
      viewCount: problem.stats?.viewsCount || 0,
      commentCount: problem.stats?.repliesCount || 0,
      isSolved: !!problem.bestAnswer, // ถ้ามี bestAnswer แสดงว่าปัญหาได้รับการแก้ไขแล้ว
    }));
  } catch (error) {
    console.error("Error fetching problems:", error);
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
    return "ไม่ระบุวันที่";
  }
}

export default async function ProblemsPage() {
  const session = await getServerSession(authOptions);
  const problems = await getProblems();

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
          <select className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#8bc34a] focus:border-[#8bc34a] transition-colors">
            <option value="latest">ล่าสุด</option>
            <option value="popular">ยอดนิยม</option>
            <option value="unsolved">ยังไม่มีคำตอบ</option>
            <option value="solved">มีคำตอบแล้ว</option>
          </select>
        </div>
        <Link
          href="/board/problems/new"
          className="inline-flex items-center px-4 py-2 bg-[#8bc34a] text-white rounded-full hover:bg-[#7baf41] transition-colors font-medium"
        >
          <Plus size={18} className="mr-1" />
          <span>ถามคำถามใหม่</span>
        </Link>
      </div>

      {/* Problems Grid */}
      <div className="space-y-4">
        {problems.length > 0 ? (
          problems.map((problem) => {
            const isAuthor = session?.user?.id === problem.author.id;
            
            return (
              <div 
                key={problem.id}
                className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  {/* สถานะการแก้ไข */}
                  {problem.isSolved && (
                    <div className="inline-block bg-[#8bc34a] text-white text-xs px-2 py-1 rounded-full mb-2">
                      มีคำตอบแล้ว
                    </div>
                  )}
                  
                  {/* เนื้อหา */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <Link href={`/board/${problem.slug}`}>
                        <h3 className="font-medium text-lg line-clamp-2 text-foreground hover:text-[#8bc34a] transition-colors">
                          {problem.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 mb-2 line-clamp-2">
                          {problem.content.replace(/<[^>]*>?/gm, '').substring(0, 150)}
                          {problem.content.length > 150 ? '...' : ''}
                        </p>
                      </Link>
                      
                      {/* ปุ่มลบสำหรับผู้เขียนเท่านั้น */}
                      {isAuthor && (
                        <DeletePostButton postId={problem.id} postSlug={problem.slug} />
                      )}
                    </div>
                    
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
                      <span>{formatThaiDate(problem.createdAt)}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Eye size={16} className="text-[#8bc34a]" />
                        <span>{problem.viewCount.toLocaleString()}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <MessageCircle size={16} className="text-[#8bc34a]" />
                        <span>{problem.commentCount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 bg-card border border-border rounded-lg">
            <p className="text-muted-foreground mb-2">ยังไม่มีคำถามหรือปัญหาในขณะนี้</p>
            <Link
              href="/board/problems/new"
              className="inline-flex items-center px-4 py-2 bg-[#8bc34a] text-white rounded-full hover:bg-[#7baf41] transition-colors mt-2 font-medium"
            >
              <Plus size={18} className="mr-1" />
              <span>ถามคำถามแรก</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}