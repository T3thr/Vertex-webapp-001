'use client';

import { CommentableType } from '@/backend/models/Comment';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { AlertTriangle, Heart, MoreHorizontal, Reply } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import CommentForm from './CommentForm';

interface User {
  id: string;
  name: string;
  image: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  likesCount: number;
  repliesCount: number;
  isEdited: boolean;
  isPinned: boolean;
  isBestAnswer: boolean;
  depth: number;
  parentCommentId?: string;
}

interface CommentListProps {
  targetId: string;
  targetType: CommentableType;
  boardId?: string;
  novelId?: string;
  episodeId?: string;
}

export default function CommentList({
  targetId,
  targetType,
  boardId,
  novelId,
  episodeId
}: CommentListProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  
  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        targetId,
        targetType,
        ...(boardId && { boardId }),
        ...(novelId && { novelId }),
        ...(episodeId && { episodeId }),
      });
      
      const response = await fetch(`/api/comments?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'เกิดข้อผิดพลาดในการโหลดความคิดเห็น');
      }
      
      const data = await response.json();
      setComments(data.comments);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดความคิดเห็น');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchComments();
  }, [targetId, targetType]);
  
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: th
      });
    } catch (error) {
      return 'ไม่ระบุเวลา';
    }
  };
  
  const handleReplyClick = (commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
  };
  
  const handleCommentAdded = () => {
    fetchComments();
    setReplyingTo(null);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">กำลังโหลดความคิดเห็น...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-destructive/10 p-4 rounded-lg flex items-start gap-3">
        <AlertTriangle className="text-destructive mt-1" size={20} />
        <div>
          <h3 className="font-medium text-destructive">เกิดข้อผิดพลาด</h3>
          <p className="text-sm">{error}</p>
          <button 
            onClick={fetchComments}
            className="text-sm text-primary hover:underline mt-2"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }
  
  if (comments.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น</p>
      </div>
    );
  }
  
  // กรองเฉพาะ top-level comments (depth = 0)
  const topLevelComments = comments.filter(comment => comment.depth === 0);
  
  // ฟังก์ชันสำหรับหา replies ของ comment
  const findReplies = (commentId: string) => {
    return comments.filter(comment => comment.parentCommentId === commentId);
  };
  
  // คอมโพเนนต์สำหรับแสดงความคิดเห็นแต่ละรายการ
  const CommentItem = ({ comment, isReply = false }: { comment: Comment, isReply?: boolean }) => {
    const replies = findReplies(comment.id);
    
    return (
      <div className={`${isReply ? 'ml-10 mt-3' : 'mb-6 border-b border-border pb-4'}`}>
        <div className="flex gap-3">
          {/* รูปโปรไฟล์ */}
          <div className="flex-shrink-0">
            <Image
              src={comment.user.image || '/images/default-avatar.png'}
              alt={comment.user.name}
              width={isReply ? 28 : 36}
              height={isReply ? 28 : 36}
              className="rounded-full"
            />
          </div>
          
          {/* เนื้อหาความคิดเห็น */}
          <div className="flex-grow">
            <div className="flex items-center gap-2">
              <Link href={`/profile/${comment.user.id}`} className="font-medium hover:text-primary transition-colors">
                {comment.user.name}
              </Link>
              <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
              
              {comment.isEdited && (
                <span className="text-xs text-muted-foreground">(แก้ไขแล้ว)</span>
              )}
              
              {comment.isPinned && (
                <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">ปักหมุด</span>
              )}
              
              {comment.isBestAnswer && (
                <span className="bg-green-500/10 text-green-500 text-xs px-1.5 py-0.5 rounded-full">คำตอบที่ดีที่สุด</span>
              )}
            </div>
            
            <div className="mt-1 text-sm whitespace-pre-wrap">{comment.content}</div>
            
            {/* ปุ่มการทำงาน */}
            <div className="flex items-center gap-4 mt-2">
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Heart size={14} />
                <span>{comment.likesCount > 0 ? comment.likesCount : 'ถูกใจ'}</span>
              </button>
              
              <button 
                onClick={() => handleReplyClick(comment.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Reply size={14} />
                <span>ตอบกลับ</span>
              </button>
              
              {session?.user?.id === comment.user.id && (
                <div className="relative">
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <MoreHorizontal size={14} />
                    <span>เพิ่มเติม</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* ฟอร์มตอบกลับ */}
            {replyingTo === comment.id && (
              <div className="mt-3">
                <CommentForm
                  targetId={targetId}
                  targetType={CommentableType.COMMENT}
                  parentCommentId={comment.id}
                  boardId={boardId}
                  novelId={novelId}
                  episodeId={episodeId}
                  onCommentAdded={handleCommentAdded}
                  placeholder={`ตอบกลับ ${comment.user.name}...`}
                />
              </div>
            )}
            
            {/* แสดง replies */}
            {replies.length > 0 && (
              <div className="mt-3">
                {replies.map(reply => (
                  <CommentItem key={reply.id} comment={reply} isReply={true} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="mt-6">
      {topLevelComments.map(comment => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
