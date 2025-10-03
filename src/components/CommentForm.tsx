'use client';

import { CommentableType } from '@/backend/models/Comment';
import { Send } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface CommentFormProps {
  targetId: string;
  targetType: CommentableType;
  parentCommentId?: string;
  boardId?: string;
  novelId?: string;
  episodeId?: string;
  onCommentAdded?: () => void;
  placeholder?: string;
}

export default function CommentForm({
  targetId,
  targetType,
  parentCommentId,
  boardId,
  novelId,
  episodeId,
  onCommentAdded,
  placeholder = 'เขียนความคิดเห็นของคุณที่นี่...'
}: CommentFormProps) {
  const { data: session, status } = useSession();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetId,
          targetType,
          parentCommentId,
          content: content.trim(),
          boardId,
          novelId,
          episodeId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการส่งความคิดเห็น');
      }
      
      // รีเซ็ตฟอร์ม
      setContent('');
      
      // เรียกฟังก์ชัน callback (ถ้ามี)
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการส่งความคิดเห็น');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // กรณียังไม่ได้ล็อกอิน
  if (status === 'unauthenticated') {
    return (
      <div className="bg-muted/30 p-4 rounded-lg text-center">
        <p className="text-sm text-muted-foreground mb-2">กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>
        <Link 
          href="/signin" 
          className="text-sm font-medium text-primary hover:underline"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }
  
  // กรณีกำลังโหลดข้อมูลผู้ใช้
  if (status === 'loading') {
    return (
      <div className="bg-muted/30 p-4 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-muted-foreground">กำลังโหลด...</span>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="mt-4">
      {error && (
        <div className="bg-destructive/10 text-destructive p-2 rounded-md mb-2 text-sm">
          {error}
        </div>
      )}
      
      <div className="flex gap-3">
        {/* รูปโปรไฟล์ผู้ใช้ */}
        <div className="flex-shrink-0">
          <Image
            src={(session?.user as any)?.image || '/images/default-avatar.png'}
            alt={session?.user?.name || 'ผู้ใช้'}
            width={36}
            height={36}
            className="rounded-full"
          />
        </div>
        
        {/* ฟอร์มความคิดเห็น */}
        <div className="flex-grow">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              disabled={isSubmitting}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
            />
            
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className={`absolute bottom-2 right-2 p-2 rounded-full ${
                content.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground'
              } transition-colors`}
            >
              <Send size={16} />
            </button>
          </div>
          
          <div className="text-xs text-muted-foreground mt-1">
            {isSubmitting ? 'กำลังส่งความคิดเห็น...' : 'กด Enter เพื่อส่งความคิดเห็น'}
          </div>
        </div>
      </div>
    </form>
  );
}
