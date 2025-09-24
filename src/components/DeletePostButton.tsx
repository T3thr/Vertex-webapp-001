"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeletePostButtonProps {
  postId: string;
  postSlug: string;
}

export default function DeletePostButton({ postId, postSlug }: DeletePostButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      
      // ใช้ API endpoint ใหม่ที่ใช้ POST method แทน
      const response = await fetch(`/api/board/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postId }),
      });

      if (response.ok) {
        // ลบสำเร็จ - รีเฟรชหน้า
        router.refresh();
      } else {
        // แสดงข้อผิดพลาด
        const data = await response.json();
        alert(`เกิดข้อผิดพลาด: ${data.error || "ไม่สามารถลบกระทู้ได้"}`);
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("เกิดข้อผิดพลาดในการลบกระทู้");
    } finally {
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="text-red-500 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50/10"
        onClick={() => setIsConfirmOpen(true)}
        aria-label="ลบกระทู้"
      >
        <Trash2 size={18} />
      </button>

      {/* Confirmation Dialog */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-border">
            <h3 className="text-lg font-medium mb-4 text-foreground">ยืนยันการลบกระทู้</h3>
            <p className="mb-6 text-muted-foreground">
              คุณต้องการลบกระทู้นี้ใช่หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 border border-border rounded-md hover:bg-muted text-foreground"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isDeleting}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "กำลังลบ..." : "ลบกระทู้"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}