'use server';

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import { registerModels } from "@/backend/models";
import BoardModel, { BoardType } from "@/backend/models/Board";
// นำเข้าโมเดล Category และ Comment เพื่อให้แน่ใจว่าถูกลงทะเบียน
import "@/backend/models/Category";
import { CommentableType } from "@/backend/models/Comment";
import CommentForm from "@/components/CommentForm";
import CommentList from "@/components/CommentList";
import DeletePostButton from "@/components/DeletePostButton";
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowLeft, Calendar, Eye, MessageCircle } from "lucide-react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  await dbConnect();
  
  try {
    const post = await BoardModel.findOne({ 
      slug, 
      isDeleted: false 
    }).lean();
    
    if (!post) {
      return {
        title: "ไม่พบกระทู้ | DIVWY",
        description: "ไม่พบกระทู้ที่คุณกำลังค้นหา"
      };
    }
    
    return {
      title: `${post.title} | DIVWY`,
      description: post.content?.substring(0, 150).replace(/<[^>]*>?/gm, '') || "กระทู้บน DIVWY"
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "กระทู้ | DIVWY",
      description: "กระทู้และการสนทนาบน DIVWY"
    };
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

// ฟังก์ชันแปลงวันที่เป็นรูปแบบภาษาไทย
function formatThaiDate(date: Date): { date: string; time: string; fullDate: string } {
  try {
    // แปลง date string เป็น Date object (ถ้าเป็น string)
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // ตรวจสอบว่า date ถูกต้องหรือไม่
    if (isNaN(dateObj.getTime())) {
      return { date: "ไม่ระบุ", time: "ไม่ระบุ", fullDate: "ไม่ระบุ" };
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

    // วันที่เต็ม
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear() + 543; // แปลงเป็น พ.ศ.
    const fullDate = `${day}/${month}/${year} ${time}`;
    
    return { 
      date: relativeTime, 
      time: time,
      fullDate: fullDate
    };
  } catch (error) {
    return { date: "ไม่ระบุ", time: "ไม่ระบุ", fullDate: "ไม่ระบุ" };
  }
}

export default async function BoardPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  
  await dbConnect();
  // เรียกใช้ registerModels เพื่อให้แน่ใจว่าโมเดลทั้งหมดถูกลงทะเบียน
  registerModels();
  
  // ดึงข้อมูลกระทู้
  const post = await BoardModel.findOne({ 
    slug, 
    isDeleted: false 
  })
  .populate('authorId', '_id username profile.avatarUrl')
  .populate('categoryAssociated', 'name')
  .populate('novelAssociated', 'title coverImageUrl slug')
  .lean();
  
  if (!post) {
    notFound();
  }

  // เพิ่มจำนวนการดู (ไม่ต้องรอให้เสร็จ)
  BoardModel.updateOne(
    { _id: post._id },
    { $inc: { 'stats.viewsCount': 1 } }
  ).exec();
  
  // จัดรูปแบบข้อมูล
  const category = post.categoryAssociated as any;
  const author = post.authorId as any;
  const novel = post.novelAssociated as any;
  
  const formattedPost = {
    id: post._id.toString(),
    title: post.title,
    content: post.content,
    boardType: post.boardType,
    boardTypeLabel: getBoardTypeLabel(post.boardType),
    category: category?.name || "ไม่ระบุหมวดหมู่",
    author: {
      id: author?._id?.toString() || "",
      name: post.authorUsername || author?.username || "ไม่ระบุชื่อ",
      avatar: post.authorAvatarUrl || author?.profile?.avatarUrl || "/images/default-avatar.png"
    },
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    viewCount: post.stats?.viewsCount || 0,
    commentCount: post.stats?.repliesCount || 0,
    novel: novel ? {
      id: novel._id.toString(),
      title: novel.title,
      coverImageUrl: novel.coverImageUrl,
      slug: novel.slug
    } : null
  };
  
  const { date, time, fullDate } = formatThaiDate(formattedPost.createdAt);
  const isAuthor = session?.user?.id === formattedPost.author.id;
  
  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      {/* ปุ่มย้อนกลับ */}
      <div className="mb-6">
        <Link
          href="/board"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>กลับไปยังหน้ากระทู้</span>
        </Link>
      </div>
      
      {/* หัวข้อกระทู้ */}
      <article className="bg-card border border-border rounded-lg overflow-hidden">
        <header className="p-6 border-b border-border">
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs rounded-full mb-3">
                {formattedPost.boardTypeLabel}
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                {formattedPost.title}
              </h1>
            </div>
            {isAuthor && (
              <DeletePostButton postId={formattedPost.id} postSlug={slug} />
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
            <div className="flex items-center gap-2">
              <Image
                src={formattedPost.author.avatar}
                alt={formattedPost.author.name}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span>{formattedPost.author.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span title={fullDate}>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye size={14} />
              <span>{formattedPost.viewCount.toLocaleString()} Views</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle size={14} className="text-[#8bc34a]" />
              <span><strong className="text-[#8bc34a]">{formattedPost.commentCount > 0 ? formattedPost.commentCount.toLocaleString() : '0'}</strong> ความคิดเห็น</span>
            </div>
          </div>
          
          {formattedPost.novel && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-background rounded-md">
              <Image
                src={formattedPost.novel.coverImageUrl || "/images/default-cover.jpg"}
                alt={formattedPost.novel.title}
                width={50}
                height={70}
                className="rounded-md object-cover"
              />
              <div>
                <div className="text-xs text-muted-foreground mb-1">นิยายที่เกี่ยวข้อง</div>
                <Link 
                  href={`/novels/${formattedPost.novel.slug}`}
                  className="font-medium hover:text-primary transition-colors"
                >
                  {formattedPost.novel.title}
                </Link>
              </div>
            </div>
          )}
        </header>
        
        {/* เนื้อหากระทู้ */}
        <div className="p-6">
          <div 
            className="prose prose-sm md:prose max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: formattedPost.content }}
          />
        </div>
        
        {/* ส่วนความคิดเห็น */}
        <div className="p-6 border-t border-border">
          <h2 className="text-lg font-semibold mb-4">ความคิดเห็น (<span className="text-[#8bc34a]">{formattedPost.commentCount > 0 ? formattedPost.commentCount.toLocaleString() : '0'}</span>)</h2>
          
          {/* ฟอร์มแสดงความคิดเห็น */}
          <CommentForm 
            targetId={formattedPost.id}
            targetType={CommentableType.BOARD}
            boardId={formattedPost.id}
            placeholder="แสดงความคิดเห็นของคุณ..."
          />
          
          {/* รายการความคิดเห็น */}
          <CommentList 
            targetId={formattedPost.id}
            targetType={CommentableType.BOARD}
            boardId={formattedPost.id}
          />
        </div>
      </article>
    </main>
  );
}
