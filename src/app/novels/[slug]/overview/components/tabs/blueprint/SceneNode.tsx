// app/novels/[slug]/overview/components/tabs/blueprint/SceneNode.tsx
'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Play, Clock, FileText, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SceneNodeData {
  title: string;
  nodeType: string;
  nodeSpecificData?: {
    sceneId?: string;
    episodeId?: string;
    estimatedDuration?: number;
    complexity?: 'low' | 'medium' | 'high' | 'very_high';
  };
  notesForAuthor?: string;
  editorVisuals?: {
    color?: string;
    icon?: string;
  };
}

/**
 * คอมโพเนนต์โหนดฉาก สำหรับ ReactFlow
 * แสดงข้อมูลฉากในนิยายแบบภาพ (Visual Novel)
 * รองรับการลากเส้นเชื่อมต่อแบบ no-code
 */
const SceneNode: React.FC<NodeProps & { showThumbnail?: boolean; showLabels?: boolean }> = ({ 
  data, 
  selected, 
  dragging,
  showThumbnail = false,
  showLabels = true
}) => {
  const nodeData = data as unknown as SceneNodeData;
  const nodeColor = nodeData.editorVisuals?.color || '#3b82f6';
  const complexity = nodeData.nodeSpecificData?.complexity || 'medium';
  const hasNotes = nodeData.notesForAuthor && nodeData.notesForAuthor.length > 0;
  const estimatedDuration = nodeData.nodeSpecificData?.estimatedDuration || 0;
  
  // ดึงข้อมูล scene สำหรับ thumbnail
  const sceneData = (nodeData as any).sceneData;
  const thumbnailUrl = sceneData?.thumbnailUrl || sceneData?.background?.value;

  // สีตามระดับความซับซ้อน
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'very_high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // แปลงระดับความซับซ้อนเป็นภาษาไทย
  const getComplexityLabel = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'ง่าย';
      case 'medium': return 'ปานกลาง';
      case 'high': return 'ซับซ้อน';
      case 'very_high': return 'ซับซ้อนมาก';
      default: return 'ไม่ระบุ';
    }
  };

  // Thumbnail mode rendering
  if (showThumbnail && thumbnailUrl) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative w-32 h-20 bg-card border-2 rounded-lg shadow-lg transition-all duration-200 overflow-hidden
          ${selected ? 'border-primary shadow-primary/20' : 'border-border'}
          ${dragging ? 'shadow-xl rotate-1' : ''}
        `}
        style={{ 
          borderColor: selected ? nodeColor : undefined,
          boxShadow: selected ? `0 0 20px ${nodeColor}20` : undefined 
        }}
      >
        {/* จุดเชื่อมต่อสำหรับรับข้อมูล (Input Handle) */}
        <Handle
          type="target"
          position={Position.Top}
          id="input"
          className="!bg-blue-100 !border-blue-500 dark:!bg-blue-900 dark:!border-blue-400"
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            border: '2px solid',
            borderColor: '#3b82f6',
            background: '#dbeafe',
            cursor: 'crosshair',
            top: '-6px'
          }}
          title="ลากเส้นเชื่อมต่อมาที่นี่"
        />

        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-30" />
        
        {/* Title (if showLabels is true) */}
        {showLabels && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
            <h3 className="font-medium text-xs text-white truncate">
              {nodeData.title}
            </h3>
          </div>
        )}
        
        {/* Complexity indicator */}
        <div className="absolute top-1 right-1">
          <Badge 
            variant="secondary" 
            className={`text-xs ${getComplexityColor(complexity)} scale-75`}
          >
            {getComplexityLabel(complexity)}
          </Badge>
        </div>

        {/* Notes indicator */}
        {hasNotes && (
          <div className="absolute top-1 left-1">
            <FileText className="h-3 w-3 text-white opacity-80" />
          </div>
        )}

        {/* จุดเชื่อมต่อสำหรับส่งข้อมูล (Output Handle) */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="output"
          className="!bg-green-100 !border-green-500 dark:!bg-green-900 dark:!border-green-400"
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            border: '2px solid',
            borderColor: '#10b981',
            background: '#d1fae5',
            cursor: 'crosshair',
            bottom: '-6px'
          }}
          title="ลากจากจุดนี้เพื่อเชื่อมต่อไปยังโหนดอื่น"
        />

        {/* ตัวบ่งชี้การเลือก */}
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-background shadow-lg"
            style={{ backgroundColor: nodeColor }}
          />
        )}
      </motion.div>
    );
  }

  // Standard node rendering
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative min-w-[200px] max-w-[280px] 
        bg-card border-2 rounded-lg shadow-lg 
        transition-all duration-200
        ${selected ? 'border-primary shadow-primary/20' : 'border-border'}
        ${dragging ? 'shadow-xl rotate-1' : ''}
      `}
      style={{ 
        borderColor: selected ? nodeColor : undefined,
        boxShadow: selected ? `0 0 20px ${nodeColor}20` : undefined 
      }}
    >
      {/* จุดเชื่อมต่อสำหรับรับข้อมูล (Input Handle) */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!bg-blue-100 !border-blue-500 dark:!bg-blue-900 dark:!border-blue-400"
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '2px solid',
          borderColor: '#3b82f6',
          background: '#dbeafe',
          cursor: 'crosshair',
          top: '-8px'
        }}
        title="ลากเส้นเชื่อมต่อมาที่นี่"
      />

      {/* Header */}
      <div 
        className="p-3 rounded-t-lg text-white"
        style={{ backgroundColor: nodeColor }}
      >
        <div className="flex items-center space-x-2">
          <Play className="h-4 w-4 flex-shrink-0" />
          <h3 className="font-medium text-sm truncate flex-1">
            {nodeData.title}
          </h3>
          {hasNotes && (
            <FileText className="h-3 w-3 flex-shrink-0 opacity-80" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* ป้ายแสดงระดับความซับซ้อน */}
        <div className="flex items-center justify-between">
          <Badge 
            variant="secondary" 
            className={`text-xs ${getComplexityColor(complexity)}`}
          >
            {getComplexityLabel(complexity)}
          </Badge>
          
          {/* ระยะเวลาโดยประมาณ */}
          {estimatedDuration > 0 && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{Math.ceil(estimatedDuration / 60000)} นาที</span>
            </div>
          )}
        </div>

        {/* ข้อมูลฉาก */}
        <div className="text-xs text-muted-foreground space-y-1">
          {nodeData.nodeSpecificData?.sceneId && (
            <div className="flex items-center space-x-1">
              <span className="font-medium">รหัสฉาก:</span>
              <span className="font-mono bg-muted px-1 rounded">
                {nodeData.nodeSpecificData.sceneId.slice(-8)}
              </span>
            </div>
          )}
          
          {nodeData.nodeSpecificData?.episodeId && (
            <div className="flex items-center space-x-1">
              <span className="font-medium">ตอน:</span>
              <span className="font-mono bg-muted px-1 rounded">
                {nodeData.nodeSpecificData.episodeId.slice(-8)}
              </span>
            </div>
          )}
        </div>

        {/* ตัวอย่างหมายเหตุผู้แต่ง */}
        {hasNotes && (
          <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1 mb-1">
              <AlertCircle className="h-3 w-3" />
              <span className="font-medium">หมายเหตุ:</span>
            </div>
            <p className="line-clamp-2">
              {nodeData.notesForAuthor}
            </p>
          </div>
        )}
      </div>

      {/* จุดเชื่อมต่อสำหรับส่งข้อมูล (Output Handle) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!bg-green-100 !border-green-500 dark:!bg-green-900 dark:!border-green-400"
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '2px solid',
          borderColor: '#10b981',
          background: '#d1fae5',
          cursor: 'crosshair',
          bottom: '-8px'
        }}
        title="ลากจากจุดนี้เพื่อเชื่อมต่อไปยังโหนดอื่น"
      />

      {/* ตัวบ่งชี้การเลือก */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-background shadow-lg"
          style={{ backgroundColor: nodeColor }}
        />
      )}
    </motion.div>
  );
};

export default memo(SceneNode);
