// hooks/useNovelMetadata.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { NovelData } from '@/app/novels/[slug]/overview/page';

interface UseNovelMetadataProps {
  novelSlug: string;
  initialNovelData?: NovelData;
}

interface UseNovelMetadataReturn {
  novel: NovelData | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // CRUD Operations
  updateMetadata: (data: Partial<NovelData>) => Promise<void>;
  patchMetadata: (operation: string, data: any) => Promise<void>;
  refreshMetadata: () => Promise<void>;
  
  // Helper functions
  clearError: () => void;
  
  // Publishing operations
  publishNovel: () => Promise<void>;
  unpublishNovel: () => Promise<void>;
  schedulePublication: (scheduledDate: Date) => Promise<void>;
}

/**
 * Custom hook สำหรับจัดการ Novel Metadata
 * รองรับการอัปเดตข้อมูลพื้นฐาน, การเผยแพร่, และสถิติ
 */
export function useNovelMetadata({ 
  novelSlug, 
  initialNovelData 
}: UseNovelMetadataProps): UseNovelMetadataReturn {
  // State
  const [novel, setNovel] = useState<NovelData | null>(initialNovelData || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * ล้างข้อผิดพลาด
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * ดึงข้อมูล metadata จาก API
   */
  const refreshMetadata = useCallback(async () => {
    if (!novelSlug) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelSlug)}/metadata`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('ไม่พบนิยายที่ระบุ');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.novel) {
        setNovel(data.novel);
      } else {
        throw new Error('ข้อมูลตอบกลับไม่ถูกต้อง');
      }
    } catch (err: any) {
      console.error('[useNovelMetadata] เกิดข้อผิดพลาดในการดึงข้อมูล:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย');
    } finally {
      setIsLoading(false);
    }
  }, [novelSlug]);

  /**
   * อัปเดต metadata
   */
  const updateMetadata = useCallback(async (data: Partial<NovelData>) => {
    if (!novelSlug) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelSlug)}/metadata`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.novel) {
        setNovel(result.novel);
        console.log('✅ อัปเดต metadata สำเร็จ');
      } else {
        throw new Error('ข้อมูลตอบกลับไม่ถูกต้อง');
      }
    } catch (err: any) {
      console.error('[useNovelMetadata] เกิดข้อผิดพลาดในการอัปเดต:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการอัปเดต metadata');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [novelSlug]);

  /**
   * PATCH metadata (สำหรับการอัปเดตเฉพาะเจาะจง)
   */
  const patchMetadata = useCallback(async (operation: string, data: any) => {
    if (!novelSlug) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelSlug)}/metadata`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          ...data
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.novel) {
        setNovel(result.novel);
        console.log(`✅ ${operation} สำเร็จ`);
      } else {
        throw new Error('ข้อมูลตอบกลับไม่ถูกต้อง');
      }
    } catch (err: any) {
      console.error(`[useNovelMetadata] เกิดข้อผิดพลาดใน ${operation}:`, err);
      setError(err.message || `เกิดข้อผิดพลาดใน ${operation}`);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [novelSlug]);

  /**
   * เผยแพร่นิยาย
   */
  const publishNovel = useCallback(async () => {
    await updateMetadata({
      status: 'published',
      publishedAt: new Date().toISOString()
    });
  }, [updateMetadata]);

  /**
   * ยกเลิกการเผยแพร่
   */
  const unpublishNovel = useCallback(async () => {
    await updateMetadata({
      status: 'unpublished'
    });
  }, [updateMetadata]);

  /**
   * กำหนดเวลาเผยแพร่
   */
  const schedulePublication = useCallback(async (scheduledDate: Date) => {
    await patchMetadata('update_publishing', {
      publishingData: {
        status: 'scheduled',
        scheduledPublicationDate: scheduledDate.toISOString()
      }
    });
  }, [patchMetadata]);

  // Auto-refresh เมื่อ novelSlug เปลี่ยน (ถ้าไม่มี initialNovelData)
  useEffect(() => {
    if (!initialNovelData && novelSlug) {
      refreshMetadata();
    }
  }, [novelSlug, initialNovelData, refreshMetadata]);

  return {
    novel,
    isLoading,
    isSaving,
    error,
    updateMetadata,
    patchMetadata,
    refreshMetadata,
    clearError,
    publishNovel,
    unpublishNovel,
    schedulePublication,
  };
}