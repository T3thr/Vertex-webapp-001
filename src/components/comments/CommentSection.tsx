// src/components/comments/CommentSection.tsx
"use client";

import { CommentableType } from "@/types/comment";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";

import { Comment } from "@/types/comment";

interface CommentSectionProps {
  targetId: string;
  targetType: CommentableType;
  novelId?: string;
  episodeId?: string;
  boardId?: string;
  initialComments?: Comment[]; // ข้อมูลความคิดเห็นเริ่มต้นที่ดึงมาจาก API
  initialTotal?: number; // จำนวนความคิดเห็นทั้งหมดที่ดึงมาจาก API
}

export default function CommentSection({
  targetId,
  targetType,
  novelId,
  episodeId,
  boardId,
  initialComments,
  initialTotal,
}: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [loading, setLoading] = useState(!initialComments);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal || 0);
  const [hasMore, setHasMore] = useState(false);

  const limit = 10;

  // Fetch comments
  const fetchComments = async (pageNum = 1, append = false) => {
    try {
      setLoading(!append);
      
      const params = new URLSearchParams({
        targetId,
        targetType,
        page: pageNum.toString(),
        limit: limit.toString(),
        sort: "new",
      });

      const response = await fetch(`/api/comments?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch comments");
      }

      if (append) {
        setComments(prev => [...prev, ...data.comments]);
      } else {
        setComments(data.comments);
      }
      
      setTotal(data.total);
      setPage(pageNum);
      setHasMore(data.comments.length === limit && (pageNum * limit) < data.total);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      toast.error("ไม่สามารถโหลดความคิดเห็นได้");
    } finally {
      setLoading(false);
    }
  };

  // Submit new comment
  const handleSubmitComment = async (content: string) => {
    if (!session?.user?.id) {
      toast.error("กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetId,
          targetType,
          content: content.trim(),
          context: {
            novelId,
            episodeId,
            boardId,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit comment");
      }

      // Add new comment to the top of the list
      setComments(prev => [data.comment, ...prev]);
      setTotal(prev => prev + 1);
      
      toast.success("ส่งความคิดเห็นเรียบร้อยแล้ว");
    } catch (error: any) {
      console.error("Error submitting comment:", error);
      toast.error(error.message || "ไม่สามารถส่งความคิดเห็นได้");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit reply to comment
  const handleSubmitReply = async (content: string, parentId: string) => {
    if (!session?.user?.id) {
      toast.error("กรุณาเข้าสู่ระบบก่อนตอบกลับ");
      return;
    }

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetId: parentId,
          targetType: CommentableType.COMMENT,
          content: content.trim(),
          parentCommentId: parentId,
          context: {
            novelId,
            episodeId,
            boardId,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit reply");
      }

      // Update the parent comment's replies count
      setComments(prev =>
        prev.map(comment =>
          comment._id === parentId
            ? { ...comment, repliesCount: comment.repliesCount + 1 }
            : comment
        )
      );
      
      toast.success("ตอบกลับเรียบร้อยแล้ว");
    } catch (error: any) {
      console.error("Error submitting reply:", error);
      toast.error(error.message || "ไม่สามารถตอบกลับได้");
      throw error; // Re-throw to let CommentItem handle it
    }
  };

  // Load more comments
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchComments(page + 1, true);
    }
  };

  // Handle comment update
  const handleCommentUpdate = (commentId: string, updatedComment: Comment) => {
    setComments(prev =>
      prev.map(comment =>
        comment._id === commentId ? updatedComment : comment
      )
    );
  };

  // Handle comment delete
  const handleCommentDelete = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment._id !== commentId));
    setTotal(prev => prev - 1);
  };

  useEffect(() => {
    // ถ้ามีข้อมูลเริ่มต้น ไม่ต้องดึงข้อมูลใหม่
    if (!initialComments) {
      fetchComments();
    } else {
      // ตรวจสอบว่ามีข้อมูลเพิ่มเติมหรือไม่
      setHasMore(initialComments.length < (initialTotal || 0));
    }
  }, [targetId, targetType, initialComments, initialTotal]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground">
          ความคิดเห็น ({total.toLocaleString()})
        </h3>
      </div>

      {/* Comment Form */}
      {session?.user ? (
        <CommentForm
          onSubmit={handleSubmitComment}
          submitting={submitting}
          placeholder="แสดงความคิดเห็นของคุณ..."
        />
      ) : (
        <div className="p-4 bg-muted rounded-lg text-center">
          <p className="text-muted-foreground">
            <a href="/signin" className="text-primary hover:underline">
              เข้าสู่ระบบ
            </a>{" "}
            เพื่อแสดงความคิดเห็น
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {loading && page === 1 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">ยังไม่มีความคิดเห็น</p>
            <p className="text-sm text-muted-foreground mt-1">
              เป็นคนแรกที่แสดงความคิดเห็นเกี่ยวกับเนื้อหานี้
            </p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                onUpdate={handleCommentUpdate}
                onDelete={handleCommentDelete}
                currentUserId={session?.user?.id}
                onReply={handleSubmitReply}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  {loading ? "กำลังโหลด..." : "โหลดเพิ่มเติม"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}