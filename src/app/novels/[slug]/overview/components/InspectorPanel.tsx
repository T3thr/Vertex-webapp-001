// app/novels/[slug]/overview/components/InspectorPanel.tsx
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Edit3, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Users, 
  Calendar, 
  Clock, 
  FileText,
  ChevronRight
} from 'lucide-react';

import { useWorkspace } from './WorkspaceContext';

/**
 * @function InspectorPanel
 * @description แผงด้านขวาสำหรับแสดงและแก้ไขข้อมูลตอน
 */
export default function InspectorPanel() {
  const router = useRouter();
  const {
    novel,
    selectedNodeId,
    nodes,
    episodes,
    inspectorOpen,
    toggleInspector,
    updateNode,
    deleteNode,
  } = useWorkspace();
  
  // หา Node ที่เลือก
  const selectedNode = selectedNodeId ? nodes.find(node => node.id === selectedNodeId) : null;
  
  // หาข้อมูลตอนจาก Node
  const episode = selectedNode?.data?.episodeId 
    ? episodes.find(ep => ep._id === selectedNode.data.episodeId) 
    : null;
  
  // ฟังก์ชันจัดการการลบตอน
  const handleDeleteEpisode = async () => {
    if (!selectedNodeId || !episode) return;
    
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบตอนนี้?')) {
      try {
        // ลบตอนจาก API
        const response = await fetch(`/api/novels/${novel._id}/episodes/${episode._id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('ไม่สามารถลบตอนได้');
        }
        
        // ลบ Node
        deleteNode(selectedNodeId);
        
        // รีเฟรชหน้า
        router.refresh();
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการลบตอน:', error);
        alert('เกิดข้อผิดพลาดในการลบตอน');
      }
    }
  };
  
  // ฟังก์ชันจัดการการคัดลอกตอน
  const handleDuplicateEpisode = async () => {
    if (!episode) return;
    
    try {
      const response = await fetch(`/api/novels/${novel._id}/episodes/${episode._id}/duplicate`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('ไม่สามารถคัดลอกตอนได้');
      }
      
      // รีเฟรชหน้า
      router.refresh();
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการคัดลอกตอน:', error);
      alert('เกิดข้อผิดพลาดในการคัดลอกตอน');
    }
  };
  
  // ฟังก์ชันแปลงวันที่
  const formatDate = (date: string | undefined): string => {
    if (!date) return 'ยังไม่เผยแพร่';
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // ฟังก์ชันแปลงเวลาอ่าน
  const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} นาที`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} ชม. ${remainingMinutes > 0 ? `${remainingMinutes} นาที` : ''}`;
  };
  
  // ถ้าไม่มี Node ที่เลือกหรือ Inspector ถูกปิด
  if (!selectedNode || !inspectorOpen) {
    return (
      <div className="w-10 h-full border-l border-border flex items-center justify-center">
        <button
          onClick={toggleInspector}
          className="p-2 rounded-full hover:bg-accent"
          title="เปิดแผงรายละเอียด"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 320, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        className="h-full bg-card border-l border-border overflow-hidden"
      >
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-semibold text-foreground">รายละเอียด</h3>
          <button
            onClick={toggleInspector}
            className="p-1 rounded-full hover:bg-accent"
            title="ปิดแผงรายละเอียด"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 57px)' }}>
          {selectedNode.type === 'episode' ? (
            <div className="p-4 space-y-6">
              {/* ข้อมูลตอน */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ชื่อตอน</label>
                  <h4 className="font-medium text-foreground">{selectedNode.data.title}</h4>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">สถานะ</label>
                  <div
                    className={`
                      mt-1 px-2 py-1 text-xs font-medium rounded-full inline-block
                      ${selectedNode.data.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                      }
                    `}
                  >
                    {selectedNode.data.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                  </div>
                </div>
                
                {episode && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">ลำดับตอน</label>
                      <p className="text-foreground">{episode.episodeOrder}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">จำนวนคำ</label>
                        <div className="flex items-center gap-1 mt-1">
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          <p className="text-foreground">{episode.stats.totalWords.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">เวลาอ่าน</label>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <p className="text-foreground">{formatReadingTime(episode.stats.estimatedReadingTimeMinutes)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">ยอดอ่าน</label>
                        <div className="flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <p className="text-foreground">{episode.stats.viewsCount.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">วันที่เผยแพร่</label>
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <p className="text-foreground text-xs">{formatDate(episode.publishedAt)}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* การกระทำ */}
              <div className="space-y-2">
                <button
                  onClick={() => episode && router.push(`/novels/${novel.slug}/episodes/${episode._id}/edit`)}
                  disabled={!episode}
                  className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Edit3 className="w-4 h-4" />
                  แก้ไขตอน
                </button>
                
                <button
                  onClick={handleDuplicateEpisode}
                  disabled={!episode}
                  className="w-full px-3 py-2 bg-secondary text-secondary-foreground rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Copy className="w-4 h-4" />
                  คัดลอกตอน
                </button>
                
                <button
                  onClick={() => episode && router.push(`/novels/${novel.slug}/episodes/${episode._id}`)}
                  disabled={!episode}
                  className="w-full px-3 py-2 bg-accent text-accent-foreground rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  ไปหน้าเขียน
                </button>
                
                <button
                  onClick={handleDeleteEpisode}
                  disabled={!episode}
                  className="w-full px-3 py-2 bg-red-100 text-red-600 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  ลบตอน
                </button>
              </div>
              
              {!episode && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <p>ตอนนี้ยังไม่ได้เชื่อมโยงกับข้อมูลตอน กรุณาสร้างตอนใหม่หรือเชื่อมโยงกับตอนที่มีอยู่</p>
                </div>
              )}
            </div>
          ) : selectedNode.type === 'chapter' ? (
            <div className="p-4 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ชื่อ Chapter</label>
                  <h4 className="font-medium text-foreground">{selectedNode.data.title}</h4>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">คำอธิบาย</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 bg-background border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="เพิ่มคำอธิบายสำหรับ Chapter นี้..."
                    rows={3}
                    onChange={(e) => selectedNodeId && updateNode(selectedNodeId, { description: e.target.value })}
                    value={selectedNode.data.description || ''}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => selectedNodeId && updateNode(selectedNodeId, { 
                    title: prompt('ชื่อ Chapter ใหม่:', selectedNode.data.title) || selectedNode.data.title 
                  })}
                  className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  แก้ไขชื่อ
                </button>
                
                <button
                  onClick={() => selectedNodeId && deleteNode(selectedNodeId)}
                  className="w-full px-3 py-2 bg-red-100 text-red-600 rounded-lg flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  ลบ Chapter
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <p>ไม่พบข้อมูล</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}