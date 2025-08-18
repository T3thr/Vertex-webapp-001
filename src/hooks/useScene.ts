// hooks/useScene.ts
'use client';

import { useState, useCallback } from 'react';

// Types for Scene data (based on Scene.ts model)
interface SceneData {
  _id: string;
  novelId: string;
  episodeId: string;
  sceneOrder: number;
  nodeId?: string;
  title?: string;
  background: any;
  version: number;
  layers: any[];
  characters: any[];
  textContents: any[];
  images: any[];
  videos: any[];
  audios: any[];
  choiceGroupsAvailable: any[];
  choiceIds: string[];
  interactiveHotspots: any[];
  statusUIElements: any[];
  activeSceneEffects: any[];
  timelineTracks: any[];
  camera?: any;
  sceneTransitionOut?: any;
  sceneVariables: any[];
  onLoadScriptContent?: string;
  onExitScriptContent?: string;
  editorNotes?: string;
  thumbnailUrl?: string;
  authorDefinedEmotionTags?: string[];
  sceneTags?: string[];
  entryConditions?: any[];
  estimatedComplexity?: 'low' | 'medium' | 'high' | 'very_high';
  criticalAssets?: any[];
  estimatedTimelineDurationMs?: number;
  ending?: any;
  createdAt: string;
  updatedAt: string;
}

interface UseSceneProps {
  novelSlug: string;
  sceneId?: string;
}

interface UseSceneReturn {
  scene: SceneData | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // CRUD Operations
  loadScene: (sceneId: string) => Promise<void>;
  updateScene: (data: Partial<SceneData>) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  
  // Helper functions
  clearError: () => void;
  resetScene: () => void;
}

/**
 * Custom hook สำหรับจัดการ Scene
 * รองรับการ CRUD และ real-time updates สำหรับฉากใน Visual Novel
 */
export function useScene({ novelSlug, sceneId }: UseSceneProps): UseSceneReturn {
  // State
  const [scene, setScene] = useState<SceneData | null>(null);
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
   * รีเซ็ต scene state
   */
  const resetScene = useCallback(() => {
    setScene(null);
    setError(null);
    setIsLoading(false);
    setIsSaving(false);
  }, []);

  /**
   * โหลดข้อมูลฉาก
   */
  const loadScene = useCallback(async (targetSceneId: string) => {
    if (!novelSlug || !targetSceneId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/novels/${encodeURIComponent(novelSlug)}/scenes/${encodeURIComponent(targetSceneId)}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('ไม่พบฉากที่ระบุ');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.scene) {
        setScene(data.scene);
      } else {
        throw new Error('ข้อมูลตอบกลับไม่ถูกต้อง');
      }
    } catch (err: any) {
      console.error('[useScene] เกิดข้อผิดพลาดในการโหลดฉาก:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดฉาก');
      setScene(null);
    } finally {
      setIsLoading(false);
    }
  }, [novelSlug]);

  /**
   * อัปเดตข้อมูลฉาก
   */
  const updateScene = useCallback(async (data: Partial<SceneData>) => {
    if (!novelSlug || !scene?._id) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/novels/${encodeURIComponent(novelSlug)}/scenes/${encodeURIComponent(scene._id)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.scene) {
        setScene(result.scene);
        console.log('✅ อัปเดตฉากสำเร็จ');
      } else {
        throw new Error('ข้อมูลตอบกลับไม่ถูกต้อง');
      }
    } catch (err: any) {
      console.error('[useScene] เกิดข้อผิดพลาดในการอัปเดตฉาก:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการอัปเดตฉาก');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [novelSlug, scene]);

  /**
   * ลบฉาก
   */
  const deleteScene = useCallback(async (targetSceneId: string) => {
    if (!novelSlug || !targetSceneId) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/novels/${encodeURIComponent(novelSlug)}/scenes/${encodeURIComponent(targetSceneId)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // ถ้าฉากที่ลบคือฉากที่กำลังแสดงอยู่ ให้รีเซ็ต state
        if (scene?._id === targetSceneId) {
          setScene(null);
        }
        console.log('✅ ลบฉากสำเร็จ');
      } else {
        throw new Error('ข้อมูลตอบกลับไม่ถูกต้อง');
      }
    } catch (err: any) {
      console.error('[useScene] เกิดข้อผิดพลาดในการลบฉาก:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการลบฉาก');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [novelSlug, scene]);

  return {
    scene,
    isLoading,
    isSaving,
    error,
    loadScene,
    updateScene,
    deleteScene,
    clearError,
    resetScene,
  };
}