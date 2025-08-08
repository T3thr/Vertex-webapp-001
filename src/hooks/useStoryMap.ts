// hooks/useStoryMap.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { StoryMapData } from '@/app/novels/[slug]/overview/page';

interface UseStoryMapProps {
  novelSlug: string;
  initialStoryMap?: StoryMapData | null;
}

interface UseStoryMapReturn {
  storyMap: StoryMapData | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // CRUD Operations
  createStoryMap: (data: Partial<StoryMapData>) => Promise<void>;
  updateStoryMap: (data: Partial<StoryMapData>) => Promise<void>;
  updateNodePositions: (nodes: any[]) => Promise<void>;
  deleteStoryMap: () => Promise<void>;
  refreshStoryMap: () => Promise<void>;
}

/**
 * Custom hook สำหรับจัดการ StoryMap
 * รองรับการ CRUD และ real-time updates
 */
export function useStoryMap({ novelSlug, initialStoryMap }: UseStoryMapProps): UseStoryMapReturn {
  // State
  const [storyMap, setStoryMap] = useState<StoryMapData | null>(initialStoryMap || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * ดึงข้อมูล StoryMap จาก API
   */
  const refreshStoryMap = useCallback(async () => {
    if (!novelSlug) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelSlug)}/storymap`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // ไม่มี StoryMap ยัง (ปกติ)
          setStoryMap(null);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.storyMap) {
        setStoryMap(data.storyMap);
      } else {
        setStoryMap(null);
      }
    } catch (err: any) {
      console.error('[useStoryMap] เกิดข้อผิดพลาดในการดึงข้อมูล:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล StoryMap');
    } finally {
      setIsLoading(false);
    }
  }, [novelSlug]);

  /**
   * สร้าง StoryMap ใหม่
   */
  const createStoryMap = useCallback(async (data: Partial<StoryMapData>) => {
    if (!novelSlug) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelSlug)}/storymap`, {
        method: 'POST',
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
      
      if (result.success && result.storyMap) {
        setStoryMap(result.storyMap);
        console.log('✅ สร้าง StoryMap สำเร็จ');
      } else {
        throw new Error('ข้อมูลตอบกลับไม่ถูกต้อง');
      }
    } catch (err: any) {
      console.error('[useStoryMap] เกิดข้อผิดพลาดในการสร้าง:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้าง StoryMap');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [novelSlug]);

  /**
   * อัปเดต StoryMap
   */
  const updateStoryMap = useCallback(async (data: Partial<StoryMapData>) => {
    if (!novelSlug) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelSlug)}/storymap`, {
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
      
      if (result.success && result.storyMap) {
        setStoryMap(result.storyMap);
        console.log('✅ อัปเดต StoryMap สำเร็จ');
      } else {
        throw new Error('ข้อมูลตอบกลับไม่ถูกต้อง');
      }
    } catch (err: any) {
      console.error('[useStoryMap] เกิดข้อผิดพลาดในการอัปเดต:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการอัปเดต StoryMap');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [novelSlug]);

  /**
   * อัปเดตตำแหน่ง nodes (สำหรับ drag & drop)
   */
  const updateNodePositions = useCallback(async (nodes: any[]) => {
    if (!novelSlug || !storyMap) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelSlug)}/storymap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'update_nodes_positions',
          data: { nodes }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.storyMap) {
        setStoryMap(result.storyMap);
      }
    } catch (err: any) {
      console.error('[useStoryMap] เกิดข้อผิดพลาดในการอัปเดตตำแหน่ง:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการอัปเดตตำแหน่ง nodes');
    } finally {
      setIsSaving(false);
    }
  }, [novelSlug, storyMap]);

  /**
   * ลบ StoryMap
   */
  const deleteStoryMap = useCallback(async () => {
    if (!novelSlug) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(novelSlug)}/storymap`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setStoryMap(null);
        console.log('✅ ลบ StoryMap สำเร็จ');
      } else {
        throw new Error('ข้อมูลตอบกลับไม่ถูกต้อง');
      }
    } catch (err: any) {
      console.error('[useStoryMap] เกิดข้อผิดพลาดในการลบ:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการลบ StoryMap');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [novelSlug]);

  // Auto-refresh เมื่อ novelSlug เปลี่ยน (ถ้าไม่มี initialStoryMap)
  useEffect(() => {
    if (!initialStoryMap && novelSlug) {
      refreshStoryMap();
    }
  }, [novelSlug, initialStoryMap, refreshStoryMap]);

  return {
    storyMap,
    isLoading,
    isSaving,
    error,
    createStoryMap,
    updateStoryMap,
    updateNodePositions,
    deleteStoryMap,
    refreshStoryMap,
  };
}