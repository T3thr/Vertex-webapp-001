// app/novels/[slug]/overview/components/EpisodeNode.tsx
'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Edit3, 
  Trash2, 
  Copy, 
  Eye, 
  Clock, 
  FileText, 
  Users, 
  Star,
  Zap,
  Target,
  Layers,
  Link,
  MoreHorizontal,
  Check,
  X
} from 'lucide-react';

import { useWorkspace } from './WorkspaceContext';

/**
 * @interface EpisodeNodeData
 * @description ข้อมูลสำหรับ Episode Node
 */
interface EpisodeNodeData {
  title: string;
  nodeType: string;
  episodeId?: string;
  status: 'draft' | 'published' | 'reviewing';
  wordCount: number;
  readingTime: number;
  description?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  completionProgress?: number; // 0-100
}

/**
 * @function EpisodeNode
 * @description Interactive Episode Node with game-like animations and effects
 */
function EpisodeNode({ id, data, selected }: NodeProps<EpisodeNodeData>) {
  const { updateNode, deleteNode, selectNode } = useWorkspace();
  
  // States สำหรับการโต้ตอบ
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pulseEffect, setPulseEffect] = useState(false);
  const [editTitle, setEditTitle] = useState(data.title);
  
  // Refs
  const nodeRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Motion values สำหรับ interactive effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-100, 100], [10, -10]);
  const rotateY = useTransform(mouseX, [-100, 100], [-10, 10]);
  
  // ฟังก์ชันจัดการ Mouse Movement สำหรับ 3D Effect
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!nodeRef.current) return;
    
    const rect = nodeRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set(event.clientX - centerX);
    mouseY.set(event.clientY - centerY);
  };
  
  // รีเซ็ต 3D Effect เมื่อ Mouse Leave
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
    setShowActions(false);
  };
  
  // จัดการการ Long Press สำหรับ Touch Device
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
      setPulseEffect(true);
      // Haptic feedback สำหรับ mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
  };
  
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setPulseEffect(false);
  };
  
  // จัดการการแก้ไขชื่อตอน
  const handleEditSave = () => {
    updateNode(id, { title: editTitle });
    setIsEditing(false);
  };
  
  const handleEditCancel = () => {
    setEditTitle(data.title);
    setIsEditing(false);
  };
  
  // คำนวณสีตามสถานะ
  const getStatusColor = () => {
    switch (data.status) {
      case 'published': return 'from-emerald-500 to-green-600';
      case 'reviewing': return 'from-amber-500 to-orange-600';
      case 'draft': return 'from-slate-500 to-gray-600';
      default: return 'from-blue-500 to-indigo-600';
    }
  };
  
  // คำนวณสีของ Priority
  const getPriorityColor = () => {
    switch (data.priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };
  
  // Animation variants
  const nodeVariants = {
    idle: {
      scale: 1,
      rotateX: 0,
      rotateY: 0,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    },
    hover: {
      scale: 1.05,
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    },
    selected: {
      scale: 1.08,
      boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.5), 0 20px 40px rgba(99, 102, 241, 0.3)',
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    },
    dragging: {
      scale: 1.1,
      rotate: [0, 1, -1, 0],
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
      transition: { rotate: { repeat: Infinity, duration: 0.5 } }
    },
    pulse: {
      scale: [1, 1.1, 1],
      transition: { duration: 0.6, ease: 'easeInOut' }
    }
  };
  
  // Progress bar animation
  const progressVariants = {
    initial: { width: 0 },
    animate: { width: `${data.completionProgress || 0}%` }
  };
  
  return (
    <>
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary border-2 border-background shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-primary border-2 border-background shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
      />
      
      {/* Main Node */}
      <motion.div
        ref={nodeRef}
        className="group relative"
        variants={nodeVariants}
        initial="idle"
        animate={
          isDragging ? 'dragging' :
          pulseEffect ? 'pulse' :
          selected ? 'selected' :
          isHovered ? 'hover' : 'idle'
        }
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        whileTap={{ scale: 0.95 }}
      >
        {/* Glow Effect */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${getStatusColor()} rounded-2xl blur-lg opacity-30`}
          animate={{
            opacity: selected ? 0.6 : isHovered ? 0.4 : 0.2,
            scale: selected ? 1.1 : 1
          }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Main Card */}
        <motion.div
          className={`
            relative w-72 bg-card/95 backdrop-blur-sm border-2 rounded-2xl overflow-hidden
            ${selected ? 'border-primary shadow-2xl' : 'border-border'}
            cursor-pointer select-none
          `}
          onClick={() => selectNode(id)}
        >
          {/* Header Gradient */}
          <div className={`h-2 bg-gradient-to-r ${getStatusColor()}`} />
          
          {/* Priority Indicator */}
          {data.priority && (
            <motion.div
              className={`absolute top-4 left-4 w-3 h-3 rounded-full ${getPriorityColor()}`}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
          
          {/* Status Badge */}
          <motion.div
            className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${getStatusColor()}`}
            whileHover={{ scale: 1.1 }}
          >
            {data.status === 'published' ? 'เผยแพร่' : 
             data.status === 'reviewing' ? 'รอตรวจ' : 'ร่าง'}
          </motion.div>
          
          {/* Content */}
          <div className="p-6 pt-8">
            {/* Title Section */}
            <div className="mb-4">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <label htmlFor="editTitle" className="sr-only">Episode Title</label>
                  <input
                    id="editTitle"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Episode Title"
                    className="flex-1 px-2 py-1 bg-input border border-input-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave();
                      if (e.key === 'Escape') handleEditCancel();
                    }}
                  />
                  <button onClick={handleEditSave} className="p-1 text-green-600 hover:bg-green-100 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={handleEditCancel} className="p-1 text-red-600 hover:bg-red-100 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <motion.h3
                  className="text-lg font-bold text-foreground leading-tight"
                  onDoubleClick={() => setIsEditing(true)}
                  whileHover={{ scale: 1.02 }}
                >
                  {data.title}
                </motion.h3>
              )}
              
              {/* Progress Bar */}
              {data.completionProgress !== undefined && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">ความคืบหน้า</span>
                    <span className="text-xs font-medium text-foreground">{data.completionProgress}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${getStatusColor()}`}
                      variants={progressVariants}
                      initial="initial"
                      animate="animate"
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <motion.div
                className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"
                whileHover={{ scale: 1.05, backgroundColor: 'var(--accent)' }}
              >
                <FileText className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">คำ</div>
                  <div className="text-sm font-semibold text-foreground">
                    {data.wordCount.toLocaleString()}
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"
                whileHover={{ scale: 1.05, backgroundColor: 'var(--accent)' }}
              >
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">นาที</div>
                  <div className="text-sm font-semibold text-foreground">
                    {data.readingTime}
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Tags */}
            {data.tags && data.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {data.tags.slice(0, 3).map((tag, index) => (
                  <motion.span
                    key={index}
                    className="px-2 py-1 bg-accent/20 text-accent-foreground text-xs rounded-full"
                    whileHover={{ scale: 1.1 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {tag}
                  </motion.span>
                ))}
                {data.tags.length > 3 && (
                  <span className="px-2 py-1 bg-muted/20 text-muted-foreground text-xs rounded-full">
                    +{data.tags.length - 3}
                  </span>
                )}
              </div>
            )}
            
            {/* Quick Actions */}
            <AnimatePresence>
              {(isHovered || showActions || selected) && (
                <motion.div
                  className="flex items-center justify-between"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-1">
                    <motion.button
                      className="p-2 rounded-lg bg-primary text-primary-foreground shadow-lg"
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                    >
                      <Edit3 className="w-4 h-4" />
                    </motion.button>
                    
                    <motion.button
                      className="p-2 rounded-lg bg-secondary text-secondary-foreground shadow-lg"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle copy action
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </motion.button>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <motion.button
                      className="p-2 rounded-lg bg-accent text-accent-foreground shadow-lg"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle view action
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </motion.button>
                    
                    <motion.button
                      className="p-2 rounded-lg bg-red-500 text-white shadow-lg"
                      whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('คุณแน่ใจหรือไม่ที่จะลบตอนนี้?')) {
                          deleteNode(id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Connection Indicator */}
          <motion.div
            className="absolute bottom-2 left-1/2 transform -translate-x-1/2"
            animate={{
              opacity: isHovered ? 1 : 0.3,
              scale: isHovered ? 1.2 : 1
            }}
          >
            <Link className="w-4 h-4 text-primary" />
          </motion.div>
        </motion.div>
        
        {/* Floating Elements */}
        <AnimatePresence>
          {isHovered && (
            <>
              {/* Sparkle Effects */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-primary rounded-full"
                  initial={{ 
                    opacity: 0, 
                    scale: 0,
                    x: Math.random() * 200 - 100,
                    y: Math.random() * 200 - 100
                  }}
                  animate={{ 
                    opacity: [0, 1, 0], 
                    scale: [0, 1, 0],
                    y: -50
                  }}
                  transition={{ 
                    duration: 2, 
                    delay: i * 0.2,
                    repeat: Infinity 
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary border-2 border-background shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-primary border-2 border-background shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </>
  );
}

export default memo(EpisodeNode);