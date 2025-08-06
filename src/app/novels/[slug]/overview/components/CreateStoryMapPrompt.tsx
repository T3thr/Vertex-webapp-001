// app/novels/[slug]/overview/components/CreateStoryMapPrompt.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GitBranch, Plus, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast'; // สมมติว่าใช้ react-hot-toast

interface CreateStoryMapPromptProps {
  novelSlug: string;
}

export default function CreateStoryMapPrompt({ novelSlug }: CreateStoryMapPromptProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateStoryMap = async () => {
    setIsCreating(true);
    toast.loading('กำลังสร้างแผนผังเรื่องราว...', { id: 'create-storymap' });

    try {
      const response = await fetch(`/api/novels/${novelSlug}/storymap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ไม่สามารถสร้างแผนผังเรื่องราวได้');
      }

      toast.success('สร้างแผนผังเรื่องราวสำเร็จ!', { id: 'create-storymap' });

      // รีเฟรชหน้าเพื่อให้ Server Component ดึงข้อมูล storyMap ใหม่
      router.refresh();

    } catch (error: any) {
      console.error('Failed to create story map:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาด', { id: 'create-storymap' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-[400px] sm:h-[600px] flex items-center justify-center p-4">
      <motion.div
        className="text-center text-muted-foreground max-w-lg mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GitBranch className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 opacity-30" />
        <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
          เริ่มต้นสร้างโครงเรื่องของคุณ
        </h3>
        <p className="text-sm sm:text-base mb-4 sm:mb-6 px-4">
          ยังไม่มีแผนผังเรื่องราวสำหรับนิยายเรื่องนี้ สร้างแผนผังเพื่อวางโครงสร้าง กำหนดเส้นทาง และจัดการฉากต่างๆ ได้อย่างเป็นระบบ
        </p>
        <motion.button
          onClick={handleCreateStoryMap}
          disabled={isCreating}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:bg-muted disabled:cursor-not-allowed text-sm sm:text-base"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          <span>{isCreating ? 'กำลังสร้าง...' : 'สร้างแผนผังเรื่องราวแรก'}</span>
        </motion.button>
      </motion.div>
    </div>
  );
}