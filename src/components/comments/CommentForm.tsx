// src/components/comments/CommentForm.tsx
"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  submitting: boolean;
  placeholder?: string;
  replyTo?: string; // For replies
  onCancel?: () => void; // For reply form
  autoFocus?: boolean;
}

export default function CommentForm({
  onSubmit,
  submitting,
  placeholder = "แสดงความคิดเห็นของคุณ...",
  replyTo,
  onCancel,
  autoFocus = false,
}: CommentFormProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    try {
      await onSubmit(content);
      setContent("");
      setFocused(false);
      if (onCancel) onCancel(); // Close reply form after successful submission
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleCancel = () => {
    setContent("");
    setFocused(false);
    if (onCancel) onCancel();
  };

  if (!session?.user) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {replyTo && (
        <div className="text-sm text-muted-foreground">
          ตอบกลับ <span className="text-primary">@{replyTo}</span>
        </div>
      )}
      
      <div className="flex gap-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            {session.user.username ? (
              <span className="text-sm font-medium text-primary">
                {session.user.username.charAt(0).toUpperCase()}
              </span>
            ) : (
              <span className="text-sm font-medium text-primary">U</span>
            )}
          </div>
        </div>

        {/* Comment Input */}
        <div className="flex-1 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={submitting}
            rows={focused || content ? 3 : 2}
            className={`
              w-full resize-none rounded-lg border border-input bg-background px-3 py-2
              text-sm placeholder:text-muted-foreground
              focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring
              disabled:cursor-not-allowed disabled:opacity-50
              transition-all duration-200
            `}
            maxLength={5000}
          />
          
          {/* Character Count */}
          {(focused || content) && (
            <div className="text-xs text-muted-foreground text-right">
              {content.length}/5000
            </div>
          )}

          {/* Action Buttons */}
          {(focused || content || replyTo) && (
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                การใช้ภาษาที่เหมาะสมและสุภาพ
              </div>
              
              <div className="flex gap-2">
                {(onCancel || content || focused) && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={submitting}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ยกเลิก
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={!content.trim() || submitting}
                  className={`
                    px-4 py-1.5 text-sm font-medium rounded-md transition-colors
                    ${
                      content.trim() && !submitting
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }
                  `}
                >
                  {submitting ? "กำลังส่ง..." : replyTo ? "ตอบกลับ" : "ส่งความคิดเห็น"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
