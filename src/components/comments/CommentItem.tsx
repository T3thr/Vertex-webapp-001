// src/components/comments/CommentItem.tsx
"use client";

import { Edit, Flag, Heart, MessageCircle, MoreVertical, Pin, PinOff, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "react-toastify";
import CommentForm from "./CommentForm";

import { Comment } from "@/types/comment";

interface CommentItemProps {
  comment: Comment;
  onUpdate: (commentId: string, updatedComment: Comment) => void;
  onDelete: (commentId: string) => void;
  currentUserId?: string;
  depth?: number;
  replies?: Comment[];
  onReply?: (content: string, parentId: string) => Promise<void>;
}

export default function CommentItem({
  comment,
  onUpdate,
  onDelete,
  currentUserId,
  depth = 0,
  replies: initialReplies = [],
  onReply,
}: CommentItemProps) {
  const { data: session } = useSession();
  const [showMenu, setShowMenu] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(comment.likesCount);
  const [submitting, setSubmitting] = useState(false);
  const [replies, setReplies] = useState<Comment[]>(initialReplies);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesPage, setRepliesPage] = useState(1);
  const [hasMoreReplies, setHasMoreReplies] = useState(false);

  const isOwner = currentUserId === comment.userId._id;
  const isModerator = session?.user?.roles?.some(role => 
    ["Admin", "Moderator", "Editor"].includes(role)
  );
  const canEdit = isOwner;
  const canDelete = isOwner || isModerator;
  const canPin = isModerator;

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "เมื่อสักครู่";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
    
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle like toggle
  const handleLike = async () => {
    if (!session?.user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนกดไลค์");
      return;
    }

    try {
      // Optimistic update
      setLiked(!liked);
      setLikesCount(prev => liked ? prev - 1 : prev + 1);

      // API call would go here
      // const response = await fetch(`/api/comments/${comment._id}/like`, {
      //   method: liked ? "DELETE" : "POST",
      // });

      // For now, just simulate
      setTimeout(() => {
        if (!liked) {
          toast.success("ไลค์แล้ว");
        }
      }, 100);
    } catch (error) {
      // Revert optimistic update
      setLiked(liked);
      setLikesCount(comment.likesCount);
      toast.error("ไม่สามารถไลค์ได้");
    }
  };

  // Handle edit comment
  const handleEdit = async () => {
    if (!editContent.trim()) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/comments/${comment._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: editContent.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update comment");
      }

      onUpdate(comment._id, data.comment);
      setEditing(false);
      toast.success("แก้ไขความคิดเห็นเรียบร้อยแล้ว");
    } catch (error: any) {
      console.error("Error updating comment:", error);
      toast.error(error.message || "ไม่สามารถแก้ไขความคิดเห็นได้");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete comment
  const handleDelete = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบความคิดเห็นนี้?")) return;

    try {
      const response = await fetch(`/api/comments/${comment._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asModerator: isModerator && !isOwner,
          reason: "Deleted by user",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete comment");
      }

      onDelete(comment._id);
      toast.success("ลบความคิดเห็นเรียบร้อยแล้ว");
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      toast.error(error.message || "ไม่สามารถลบความคิดเห็นได้");
    }
  };

  // Handle pin/unpin comment
  const handlePin = async () => {
    try {
      const response = await fetch(`/api/comments/${comment._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: comment.isPinned ? "unpin" : "pin",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to pin/unpin comment");
      }

      onUpdate(comment._id, data.comment);
      toast.success(comment.isPinned ? "ยกเลิกปักหมุดแล้ว" : "ปักหมุดแล้ว");
    } catch (error: any) {
      console.error("Error pinning comment:", error);
      toast.error(error.message || "ไม่สามารถปักหมุดความคิดเห็นได้");
    }
  };

  // Load replies for this comment
  const loadReplies = async (pageNum = 1, append = false) => {
    try {
      setLoadingReplies(true);
      
      const response = await fetch(`/api/comments/${comment._id}/replies?page=${pageNum}&limit=10`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load replies");
      }

      if (append) {
        setReplies(prev => [...prev, ...data.replies]);
      } else {
        setReplies(data.replies);
      }
      
      setRepliesPage(pageNum);
      setHasMoreReplies(data.replies.length === 10 && (pageNum * 10) < data.total);
    } catch (error: any) {
      console.error("Error loading replies:", error);
      toast.error("ไม่สามารถโหลดการตอบกลับได้");
    } finally {
      setLoadingReplies(false);
    }
  };

  // Handle show/hide replies
  const handleToggleReplies = async () => {
    if (!showReplies && replies.length === 0 && comment.repliesCount > 0) {
      await loadReplies();
    }
    setShowReplies(!showReplies);
  };

  // Handle reply
  const handleReply = async (content: string) => {
    if (onReply) {
      try {
        await onReply(content, comment._id);
        setShowReplyForm(false);
        
        // Reload replies to show the new one
        if (showReplies) {
          await loadReplies();
        }
      } catch (error) {
        // Error handling is done in parent
      }
    }
  };

  return (
    <div className={`space-y-3 ${depth > 0 ? "ml-8 border-l-2 border-border pl-4" : ""}`}>
      <div className="bg-card rounded-lg p-4 border border-border">
        {/* Pinned indicator */}
        {comment.isPinned && (
          <div className="flex items-center gap-1 text-xs text-primary mb-2">
            <Pin className="w-3 h-3" />
            <span>ปักหมุด</span>
          </div>
        )}

        {/* Comment Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-primary">
                {comment.userId.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>

            {/* User Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {comment.userId.primaryPenName || comment.userId.username}
                </span>
                {comment.userId.roles.includes("Writer") && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    นักเขียน
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatRelativeTime(comment.createdAt)}</span>
                {comment.isEdited && <span>• แก้ไขแล้ว</span>}
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          {session?.user && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-muted rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg z-10 min-w-[120px]">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <Edit className="w-3 h-3" />
                      แก้ไข
                    </button>
                  )}
                  
                  {canPin && (
                    <button
                      onClick={() => {
                        handlePin();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                    >
                      {comment.isPinned ? (
                        <>
                          <PinOff className="w-3 h-3" />
                          ยกเลิกปักหมุด
                        </>
                      ) : (
                        <>
                          <Pin className="w-3 h-3" />
                          ปักหมุด
                        </>
                      )}
                    </button>
                  )}

                  {!isOwner && (
                    <button
                      onClick={() => {
                        toast.info("ฟีเจอร์รายงานจะเปิดใช้งานเร็วๆ นี้");
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <Flag className="w-3 h-3" />
                      รายงาน
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => {
                        handleDelete();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-destructive flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      ลบ
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comment Content */}
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full resize-none rounded border border-input bg-background px-3 py-2 text-sm"
              rows={3}
              maxLength={5000}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditing(false);
                  setEditContent(comment.content);
                }}
                disabled={submitting}
                className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleEdit}
                disabled={!editContent.trim() || submitting}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-foreground leading-relaxed mb-3">
            {comment.content}
          </div>
        )}

        {/* Comment Actions */}
        {!editing && (
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 hover:text-primary transition-colors ${
                liked ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
              <span>{likesCount}</span>
            </button>

            {onReply && depth < 3 && ( // Limit reply depth
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>ตอบกลับ</span>
              </button>
            )}

            {comment.repliesCount > 0 && (
              <button
                onClick={handleToggleReplies}
                disabled={loadingReplies}
                className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                {loadingReplies ? "กำลังโหลด..." : 
                 showReplies ? "ซ่อน" : "ดู"} {comment.repliesCount} การตอบกลับ
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reply Form */}
      {showReplyForm && onReply && (
        <div className="ml-4">
          <CommentForm
            onSubmit={handleReply}
            submitting={submitting}
            placeholder="ตอบกลับความคิดเห็นนี้..."
            replyTo={comment.userId.primaryPenName || comment.userId.username}
            onCancel={() => setShowReplyForm(false)}
            autoFocus
          />
        </div>
      )}

      {/* Replies */}
      {showReplies && (
        <div className="space-y-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              onUpdate={onUpdate}
              onDelete={onDelete}
              currentUserId={currentUserId}
              depth={depth + 1}
              onReply={onReply}
            />
          ))}
          
          {/* Load More Replies */}
          {hasMoreReplies && (
            <div className="flex justify-center">
              <button
                onClick={() => loadReplies(repliesPage + 1, true)}
                disabled={loadingReplies}
                className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                {loadingReplies ? "กำลังโหลด..." : "โหลดการตอบกลับเพิ่มเติม"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}