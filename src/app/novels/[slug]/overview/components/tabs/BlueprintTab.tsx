// app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx
'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ReactFlow,
  type Node,
  type Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
  ReactFlowInstance,
  MarkerType,
  Panel,
  NodeChange,
  EdgeChange,
  useReactFlow,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  Handle,
  Position,
  useStore,
  getSmoothStepPath,
  getStraightPath,
  getBezierPath,
  SelectionMode,
  OnSelectionChangeFunc,
  BackgroundVariant,
  ConnectionMode,
  ConnectionLineType,
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  type Node as ReactFlowNode,
  type Edge as ReactFlowEdge,
  useHandleConnections,
  OnConnectStart,
  OnConnectEnd,
  useUpdateNodeInternals,
  ConnectionLineComponent,
  ConnectionLineComponentProps
} from '@xyflow/react';
import { toast } from 'sonner';

// Blueprint Node Components
import { 
  SceneNode, 
  ChoiceNode, 
  BranchNode, 
  CommentNode, 
  EndingNode 
} from './blueprint';

import '@xyflow/react/dist/style.css';

// Utility function สำหรับ debouncing
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Icons
import { 
  Plus, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Play,
  Square,
  Circle,
  GitBranch,
  MessageCircle,
  Flag,
  Settings,
  Eye,
  EyeOff,
  Grid3X3,
  MousePointer2,
  ShieldAlert,
  LayoutGrid,
  Trash2,
  Archive,
  Copy,
  Edit,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Menu,
  X,
  Check,
  CheckSquare,
  Zap,
  Code,
  Layers,
  Clock,
  Shuffle,
  Split,
  Map,
  Image,
  User,
  ChevronRight,
  Undo2,
  Redo2,
  Move,
  ChevronsLeft,
  ChevronsRight,
  Lock,
  Unlock,
  Save,
  ChevronDown,
  ChevronUp,
  Hexagon,
  Diamond,
  Triangle,
  BookOpen,
  Sparkles,
  Target,
  Palette,
  ArrowRight,
  RotateCcw,
  Film,
  Clapperboard,
  MonitorPlay,
  Scissors,
  FileText
} from 'lucide-react';

// Types from backend models
import { StoryMapNodeType, IStoryMapNode, IStoryMapEdge, IStoryVariableDefinition } from '@/backend/models/StoryMap';
import { IScene } from '@/backend/models/Scene';
import { IChoice } from '@/backend/models/Choice';
import { ICharacter } from '@/backend/models/Character';
import { IMedia } from '@/backend/models/Media';
import { IOfficialMedia } from '@/backend/models/OfficialMedia';
import { IEpisode } from '@/backend/models/Episode';

// Props interface
interface BlueprintTabProps {
  novel: any;
  storyMap: any;
  scenes: IScene[];
  characters: ICharacter[];
  userMedia: IMedia[];
  officialMedia: IOfficialMedia[];
  episodes: any[];
  onStoryMapUpdate: (storyMap: any) => void;
  onManualSave?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onNavigateToDirector?: (sceneId?: string) => void;
  // การตั้งค่าการแสดงผลจาก localStorage
  blueprintSettings?: {
    showSceneThumbnails: boolean;
    showNodeLabels: boolean;
    showGrid: boolean;
    snapToGrid: boolean;
    nodeOrientation: 'horizontal' | 'vertical';
  };
}

// Command Pattern interfaces for proper undo/redo
interface ICommand {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  execute(): void;
  undo(): void;
  redo?(): void;
}

interface NodeCommand extends ICommand {
  type: 'ADD_NODE' | 'DELETE_NODE' | 'UPDATE_NODE' | 'MOVE_NODE';
  nodeId: string;
  nodeData?: Node;
  oldPosition?: { x: number; y: number };
  newPosition?: { x: number; y: number };
  oldData?: any;
  newData?: any;
}

interface EdgeCommand extends ICommand {
  type: 'ADD_EDGE' | 'DELETE_EDGE' | 'UPDATE_EDGE';
  edgeId: string;
  edgeData?: Edge;
  sourceNodeId?: string;
  targetNodeId?: string;
  oldData?: any;
  newData?: any;
}

interface BatchCommand extends ICommand {
  type: 'BATCH';
  commands: ICommand[];
}

type AnyCommand = NodeCommand | EdgeCommand | BatchCommand;

interface CommandHistory {
  undoStack: AnyCommand[];
  redoStack: AnyCommand[];
  maxHistorySize: number;
}

interface SelectionState {
  selectedNodes: string[];
  selectedEdges: string[];
  multiSelectMode: boolean;
  clipboard: {
    nodes: Node[];
    edges: Edge[];
  };
  isSelectionMode: boolean;
  pendingSelection: string[]; // For Canva-style multi-select confirmation
  showSelectionBar: boolean; // Show bottom confirmation bar
}

// Canvas interaction state
interface CanvasState {
  isLocked: boolean;
  zoomLevel: number;
  position: { x: number; y: number };
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
}

// Enhanced save system state with versioning
interface SaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveError: string | null;
  version: number; // Current version from server
  isDirty: boolean;
  lastCommandId?: string;
  isConflicted?: boolean; // For handling version conflicts
  etag?: string; // ETag for optimistic concurrency control
  saveQueue: SaveCommand[]; // คิวงานบันทึก
  isProcessingQueue: boolean; // กำลังประมวลผลคิว
  pendingCommandCount: number; // จำนวน command ที่รอบันทึก
}

// Command สำหรับ Auto-save (PATCH)
interface SaveCommand {
  id: string; // idempotency key
  type: 'auto' | 'manual';
  timestamp: number;
  version: number; // version ที่คาดหวัง
  etag?: string;
  data: any; // command data สำหรับ PATCH
  retryCount: number;
}

// การตั้งค่าการแสดงผล Blueprint Editor
interface BlueprintSettings {
  showSceneThumbnails: boolean;
  showNodeLabels: boolean;
  showConnectionLines: boolean;
  showGrid: boolean;
  autoLayout: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
  nodeDefaultColor?: string;
  edgeDefaultColor?: string;
  connectionLineStyle?: "solid" | "dashed" | "dotted";
  nodeOrientation?: 'horizontal' | 'vertical';
}

// แยก Auto-save settings ออกมาต่างหาก
interface AutoSaveSettings {
  enabled: boolean; // Default: false (ไม่บังคับผู้ใช้)
  intervalSec: 15 | 30; // Default: 30
  conflictResolutionStrategy: 'last_write_wins' | 'merge' | 'manual'; // Default: 'merge'
}

// Custom Connection Line Component สำหรับการลากเส้นเชื่อมต่อแบบ Interactive
const CustomConnectionLine: ConnectionLineComponent = ({ 
  fromX, 
  fromY, 
  toX, 
  toY, 
  connectionLineStyle,
  connectionLineType
}: ConnectionLineComponentProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: Position.Bottom,
    targetX: toX,
    targetY: toY,
    targetPosition: Position.Top,
  });

  return (
    <g>
      <path
        fill="none"
        stroke="#3b82f6"
        strokeWidth={3}
        strokeDasharray="10,5"
        d={edgePath}
        className="animate-pulse"
        style={connectionLineStyle}
      />
      {/* จุดปลายทางของการลาก */}
      <circle
        cx={toX}
        cy={toY}
        fill="#3b82f6"
        r={4}
        stroke="#fff"
        strokeWidth={2}
        className="animate-ping"
      />
      {/* ข้อความแนะนำ */}
      <text
        x={toX}
        y={toY - 20}
        fill="#3b82f6"
        fontSize="12"
        textAnchor="middle"
        className="font-medium"
      >
        ปล่อยเพื่อเชื่อมต่อ
      </text>
    </g>
  );
};

// Enhanced Custom Edge with interactive controls
const CustomEdge = ({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  sourcePosition, 
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected
}: EdgeProps) => {
  const { deleteElements } = useReactFlow();
  
  // Calculate path based on edge type
  const getEdgePath = () => {
    const edgeType = (data as any)?.edgeType || 'smoothstep';
    
    switch (edgeType) {
      case 'straight':
        return getStraightPath({
          sourceX,
          sourceY,
          targetX,
          targetY
        });
      case 'bezier':
        return getBezierPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition
        });
      default:
        return getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition
        });
    }
  };
  
  const [edgePath, labelX, labelY] = getEdgePath();
  
  // Edge styling based on data
  const edgeStyle = {
    ...style,
    stroke: (data as any)?.color || (selected ? '#3b82f6' : '#64748b'),
    strokeWidth: selected ? 3 : 2,
    strokeDasharray: (data as any)?.dashed ? '5,5' : undefined,
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      
      {/* Interactive Edge Label */}
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute text-xs pointer-events-auto"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          {/* Edge Label - แสดงเฉพาะเมื่อเปิดการตั้งค่า Choice Labels และมี label ที่ไม่ใช่ค่าว่าง */}
          {(data as any)?.label && (data as any)?.label.trim() !== '' && (data as any)?.showLabels && (
            <div className="bg-background border border-border rounded px-2 py-1 text-xs shadow-sm hover:bg-background/90 transition-colors">
              {(data as any).label}
            </div>
          )}
          
          {/* Interactive Controls - Show on hover/selection */}
          {selected && (
            <div className="flex items-center gap-1 mt-1">
              <button
                className="bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                onClick={(event) => {
                  event.stopPropagation();
                  // ใช้อีเวนต์กลางเพื่อให้การลบ edge ผ่าน Command Pattern และเก็บลง Trash History
                  window.dispatchEvent(new CustomEvent('requestDeleteEdge', { detail: { edgeId: id } }));
                }}
                title="ลบเส้นเชื่อมต่อ"
              >
                ×
              </button>
              
              {/* Priority indicator for choice edges */}
              {(data as any)?.priority && (
                <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {(data as any).priority}
                </div>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

// Enhanced Custom Node with improved connection system and scene thumbnails
const CustomNode = ({ 
  data, 
  selected, 
  id 
}: { 
  data: any; 
  selected: boolean; 
  id: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [localConnectionMode, setLocalConnectionMode] = useState<'none' | 'connecting'>('none');
  
  // รับการตั้งค่าจาก parent component ผ่าน data
  const showThumbnails = data.showThumbnails ?? true;
  const showLabels = data.showLabels ?? true;
  
  // ข้อมูลฉากสำหรับ thumbnail
  const sceneData = data.sceneData;
  const thumbnailUrl = sceneData?.thumbnailUrl || sceneData?.background?.value;
  const getNodeIcon = (type: StoryMapNodeType) => {
    switch (type) {
      case StoryMapNodeType.START_NODE: return <Play className="w-5 h-5" />;
      case StoryMapNodeType.SCENE_NODE: return <Square className="w-5 h-5" />;
      case StoryMapNodeType.CHOICE_NODE: return <GitBranch className="w-5 h-5" />;
      case StoryMapNodeType.BRANCH_NODE: return <GitBranch className="w-5 h-5" />;
      case StoryMapNodeType.MERGE_NODE: return <GitBranch className="w-5 h-5 rotate-180" />;
      case StoryMapNodeType.ENDING_NODE: return <Flag className="w-5 h-5" />;
      case StoryMapNodeType.VARIABLE_MODIFIER_NODE: return <Settings className="w-5 h-5" />;
      case StoryMapNodeType.EVENT_TRIGGER_NODE: return <Zap className="w-5 h-5" />;
      case StoryMapNodeType.COMMENT_NODE: return <MessageCircle className="w-5 h-5" />;
      case StoryMapNodeType.CUSTOM_LOGIC_NODE: return <Code className="w-5 h-5" />;
      case StoryMapNodeType.GROUP_NODE: return <Layers className="w-5 h-5" />;
      case StoryMapNodeType.DELAY_NODE: return <Clock className="w-5 h-5" />;
      case StoryMapNodeType.RANDOM_BRANCH_NODE: return <Shuffle className="w-5 h-5" />;
      case StoryMapNodeType.PARALLEL_EXECUTION_NODE: return <Split className="w-5 h-5" />;
      case StoryMapNodeType.SUB_STORYMAP_NODE: return <Map className="w-5 h-5" />;
      default: return <Square className="w-5 h-5" />;
    }
  };

  const getNodeTheme = (type: StoryMapNodeType) => {
    // รับการตั้งค่าการวางแนว node จาก data หรือใช้ค่าเริ่มต้น
    const nodeOrientation = data.nodeOrientation || 'vertical';
    
    // กำหนด handles ตามการวางแนว
    const getHandlesForOrientation = (baseHandles: any) => {
      if (nodeOrientation === 'horizontal') {
        // แนวนอน: เส้นออกจากซ้าย-ขวา
        return {
          top: false,
          bottom: false,
          left: baseHandles.top || baseHandles.left, // input จากซ้าย
          right: baseHandles.bottom || baseHandles.right // output ไปขวา
        };
      } else {
        // แนวตั้ง: เส้นออกจากบน-ล่าง (ค่าเริ่มต้น)
        return baseHandles;
      }
    };
    
    switch (type) {
      case StoryMapNodeType.START_NODE: return {
        gradient: 'from-emerald-400 via-emerald-500 to-emerald-600',
        shadow: 'shadow-emerald-500/30 shadow-lg',
        glow: 'shadow-emerald-400/60 shadow-xl',
        ring: 'ring-emerald-300',
        shape: 'rounded-full',
        handles: getHandlesForOrientation({ top: false, bottom: true, left: false, right: false }),
        sparkle: false,
        isSpecial: true
      };
      case StoryMapNodeType.SCENE_NODE: return {
        gradient: 'from-blue-400 via-blue-500 to-blue-600',
        shadow: 'shadow-blue-500/30 shadow-lg',
        glow: 'shadow-blue-400/60 shadow-2xl',
        ring: 'ring-blue-300',
        shape: 'rounded-xl',
        handles: getHandlesForOrientation({ top: true, bottom: true, left: false, right: false }),
        sparkle: false,
        isSpecial: false
      };
      case StoryMapNodeType.CHOICE_NODE: return {
        gradient: 'from-amber-400 via-amber-500 to-amber-600',
        shadow: 'shadow-amber-500/30 shadow-lg',
        glow: 'shadow-amber-400/60 shadow-2xl',
        ring: 'ring-amber-300',
        shape: 'rounded-xl',
        handles: getHandlesForOrientation({ top: true, bottom: false, left: false, right: true }),
        sparkle: false,
        isSpecial: false
      };
      case StoryMapNodeType.ENDING_NODE: return {
        gradient: 'from-red-400 via-red-500 to-red-600',
        shadow: 'shadow-red-500/30 shadow-lg',
        glow: 'shadow-red-400/60 shadow-xl',
        ring: 'ring-red-300',
        shape: 'rounded-full',
        handles: getHandlesForOrientation({ top: true, bottom: false, left: false, right: false }),
        sparkle: false,
        isSpecial: true
      };
      case StoryMapNodeType.BRANCH_NODE: return {
        gradient: 'from-purple-400 via-purple-500 to-purple-600',
        shadow: 'shadow-purple-500/30 shadow-lg',
        glow: 'shadow-purple-400/60 shadow-2xl',
        ring: 'ring-purple-300',
        shape: 'rounded-lg',
        handles: getHandlesForOrientation({ top: true, bottom: true, left: true, right: true }),
        sparkle: false,
        isSpecial: false
      };
      default: return {
        gradient: 'from-gray-400 via-gray-500 to-gray-600',
        shadow: 'shadow-gray-500/30 shadow-lg',
        glow: 'shadow-gray-400/60 shadow-2xl',
        ring: 'ring-gray-300',
        shape: 'rounded-lg',
        handles: getHandlesForOrientation({ top: true, bottom: true, left: false, right: false }),
        sparkle: false,
        isSpecial: false
      };
    }
  };

  const theme = getNodeTheme(data.nodeType);
  const isConnectable = !data.isArchived && !data.hasError;

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Node Body */}
      <div 
        className={`
          bg-gradient-to-br ${theme.gradient} text-white
          ${theme.shape} ${theme.shadow}
          ${selected ? `ring-4 ${theme.ring} ${theme.glow}` : 'shadow-lg'}
          border-2 border-white/20 backdrop-blur-sm
          p-4 min-w-[140px] max-w-[220px]
          transition-all duration-300 ease-out
          hover:scale-105 hover:${theme.glow} hover:shadow-2xl
          cursor-pointer relative overflow-hidden
          gpu-accelerated
        `}
      >
        {/* Sparkle Effect for Special Nodes */}
        {theme.sparkle && (
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-ping" />
            <div className="absolute top-4 left-3 w-1 h-1 bg-white rounded-full animate-pulse [animation-delay:0.5s]" />
            <div className="absolute bottom-3 right-4 w-1.5 h-1.5 bg-white rounded-full animate-ping [animation-delay:1s]" />
            <Sparkles className="absolute top-1 left-1 w-3 h-3 animate-spin [animation-duration:3s]" />
          </div>
        )}

        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-pulse" />
        </div>

        {/* Special Node Crown for Start/End - No animation */}
        {theme.isSpecial && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
            {data.nodeType === StoryMapNodeType.START_NODE ? (
              <Target className="w-3 h-3 text-yellow-800" />
            ) : (
              <Flag className="w-3 h-3 text-yellow-800" />
            )}
          </div>
        )}

        {/* First Scene Indicator for Scene Nodes */}
        {data.nodeType === StoryMapNodeType.SCENE_NODE && data.isFirstScene && (
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white text-xs font-bold">1</span>
          </div>
        )}

        {/* Header with Icon and Title */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              {getNodeIcon(data.nodeType)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">
                {data.title || 'Untitled'}
              </h3>
              <p className="text-xs text-white/70 truncate">
                {data.nodeType.replace(/_/g, ' ').toLowerCase()}
              </p>
            </div>
          </div>

          {/* Node-specific Info with Enhanced Scene Preview */}
          {data.nodeType === StoryMapNodeType.SCENE_NODE && data.sceneData && (
            <div className="bg-white/10 rounded-lg p-2 space-y-2">
              {/* Enhanced Scene Background Preview with Thumbnail Support */}
              {showThumbnails && data.sceneData.background ? (
                <div className="relative w-full h-16 rounded overflow-hidden group">
                  {data.sceneData.background.type === 'image' ? (
                    <img 
                      src={data.sceneData.background.value} 
                      alt="ภาพพื้นหลังฉาก"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : data.sceneData.background.type === 'color' ? (
                    <div 
                      className="w-full h-full transition-all duration-200"
                      style={{ backgroundColor: data.sceneData.background.value }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-400 to-slate-600" />
                  )}
                  
                  {/* Overlay สำหรับข้อมูลเพิ่มเติม */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                  
                  {/* ป้ายชื่อฉาก */}
                  <div className="absolute top-1 left-1 px-2 py-1 bg-black/50 rounded text-xs text-white font-medium backdrop-blur-sm">
                    ฉาก #{data.sceneData.sceneOrder || '?'}
                  </div>
                  
                  {/* จำนวนตัวละครและไอเทม */}
                  <div className="absolute bottom-1 right-1 flex gap-1">
                    {data.sceneData.characters?.length > 0 && (
                      <div className="flex items-center gap-1 px-1 py-0.5 bg-blue-500/80 rounded text-xs text-white">
                        <User className="w-3 h-3" />
                        <span>{data.sceneData.characters.length}</span>
                      </div>
                    )}
                    {data.sceneData.images?.length > 0 && (
                      <div className="flex items-center gap-1 px-1 py-0.5 bg-green-500/80 rounded text-xs text-white">
                        <Image className="w-3 h-3" />
                        <span>{data.sceneData.images.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* แสดงข้อมูลฉากแบบย่อเมื่อปิด thumbnail */
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Square className="w-4 h-4" />
                    <span className="font-medium">ฉาก #{data.sceneData.sceneOrder || '?'}</span>
                  </div>
                  {data.sceneData.description && (
                    <div className="text-xs text-white/80 line-clamp-2">
                      {data.sceneData.description}
                    </div>
                  )}
                </div>
              )}
              
              {/* Scene Stats - แสดงเสมอไม่ว่าจะเปิดหรือปิด thumbnail */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                  <span>{data.sceneData.characters?.length || 0}</span>
              </div>
                <div className="flex items-center gap-1">
                <Image className="w-3 h-3" />
                  <span>{data.sceneData.images?.length || 0}</span>
              </div>
              </div>
            </div>
          )}

          {data.nodeType === StoryMapNodeType.CHOICE_NODE && (
            <div className="bg-white/10 rounded-lg p-2">
              <div className="flex items-center gap-2 text-xs">
                <GitBranch className="w-3 h-3" />
                <span>{data.choiceCount || 0} choices available</span>
              </div>
            </div>
          )}

          {/* Status Indicators */}
          <div className="flex items-center gap-1">
            {data.hasError && (
              <div className="flex items-center gap-1 text-xs bg-red-500/20 text-red-200 px-2 py-1 rounded">
                <XCircle className="w-3 h-3" />
                Error
              </div>
            )}
            {data.isCompleted && (
              <div className="flex items-center gap-1 text-xs bg-green-500/20 text-green-200 px-2 py-1 rounded">
                <CheckCircle className="w-3 h-3" />
                Complete
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Connection Points with Better Visual Feedback */}
        {theme.handles.top && (
          <Handle
            type="target"
            position={Position.Top}
            className={`
              w-5 h-5 border-2 rounded-full z-20
              transition-all duration-200 ease-out
              ${isConnectable 
                ? 'bg-blue-100 border-blue-400 hover:bg-blue-200 hover:border-blue-500 cursor-crosshair' 
                : 'bg-gray-300 border-gray-400 opacity-50 cursor-not-allowed'
              }
              ${isHovered || selected ? 'opacity-100 scale-150 shadow-xl' : 'opacity-80 scale-100'}
            `}
            style={{ 
              top: -10,
              boxShadow: (isHovered || selected) ? '0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4)' : 'none'
            }}
            isConnectable={isConnectable}
            onMouseDown={() => {
              // เพิ่ม visual feedback เมื่อเริ่มการเชื่อมต่อ
                setLocalConnectionMode('connecting');
              // สร้าง custom event เพื่อแจ้งให้ parent component รู้
                window.dispatchEvent(new CustomEvent('nodeConnectionStart', { 
                  detail: { nodeId: id, handleType: 'target', position: Position.Top } 
                }));
            }}
          />
        )}

        {theme.handles.bottom && (
          <Handle
            type="source"
            position={Position.Bottom}
            className={`
              w-5 h-5 border-2 rounded-full z-20
              transition-all duration-200 ease-out
              ${isConnectable 
                ? 'bg-green-100 border-green-400 hover:bg-green-200 hover:border-green-500 cursor-crosshair' 
                : 'bg-gray-300 border-gray-400 opacity-50 cursor-not-allowed'
              }
              ${isHovered || selected ? 'opacity-100 scale-150 shadow-xl' : 'opacity-80 scale-100'}
            `}
            style={{ 
              bottom: -10,
              boxShadow: (isHovered || selected) ? '0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.4)' : 'none'
            }}
            isConnectable={isConnectable}
            onMouseDown={() => {
              // เพิ่ม visual feedback เมื่อเริ่มการเชื่อมต่อ
                setLocalConnectionMode('connecting');
              // สร้าง custom event เพื่อแจ้งให้ parent component รู้
                window.dispatchEvent(new CustomEvent('nodeConnectionStart', { 
                  detail: { nodeId: id, handleType: 'source', position: Position.Bottom } 
                }));
            }}
          />
        )}

        {theme.handles.left && (
          <Handle
            type="target"
            position={Position.Left}
            className={`
              w-4 h-4 border-3 rounded-full z-20
              transition-all duration-300 ease-out
              ${isConnectable 
                ? 'bg-blue-200 border-blue-400 hover:bg-blue-300 hover:border-blue-500 cursor-crosshair hover:scale-150' 
                : 'bg-gray-300 border-gray-400 opacity-50 cursor-not-allowed'
              }
              ${isHovered || selected ? 'opacity-100 scale-125 shadow-lg' : 'opacity-75'}
            `}
            style={{ 
              left: -8,
              boxShadow: (isHovered || selected) ? '0 0 15px rgba(59, 130, 246, 0.6)' : 'none'
            }}
            isConnectable={isConnectable}
          />
        )}

        {theme.handles.right && (
          <Handle
            type="source"
            position={Position.Right}
            className={`
              w-4 h-4 border-3 rounded-full z-20
              transition-all duration-300 ease-out
              ${isConnectable 
                ? 'bg-green-200 border-green-400 hover:bg-green-300 hover:border-green-500 cursor-crosshair hover:scale-150' 
                : 'bg-gray-300 border-gray-400 opacity-50 cursor-not-allowed'
              }
              ${isHovered || selected ? 'opacity-100 scale-125 shadow-lg' : 'opacity-75'}
            `}
            style={{ 
              right: -8,
              boxShadow: (isHovered || selected) ? '0 0 15px rgba(34, 197, 94, 0.6)' : 'none'
            }}
            isConnectable={isConnectable}
            onMouseDown={(e) => {
              if (isConnectable) {
                e.stopPropagation();
                // เริ่มโหมดการเชื่อมต่อแบบ manual
                const event = new CustomEvent('startConnection', {
                  detail: { 
                    nodeId: id, 
                    handleType: 'source',
                    position: Position.Right 
                  }
                });
                document.dispatchEvent(event);
              }
            }}
          />
        )}

        {/* Enhanced Multiple choice handles for choice nodes */}
        {data.nodeType === StoryMapNodeType.CHOICE_NODE && data.choiceCount > 1 && (
          <>
            {Array.from({ length: Math.min(data.choiceCount, 4) }, (_, i) => (
              <Handle
                key={`choice-${i}`}
                type="source"
                position={Position.Right}
                id={`choice-${i}`}
                className={`
                  w-3 h-3 border-2 rounded-full z-20
                  transition-all duration-300 ease-out
                  ${isConnectable 
                    ? 'bg-amber-200 border-amber-400 hover:bg-amber-300 hover:border-amber-500 cursor-crosshair hover:scale-150' 
                    : 'bg-gray-300 border-gray-400 opacity-50 cursor-not-allowed'
                  }
                  ${isHovered || selected ? 'opacity-100 scale-125 shadow-md' : 'opacity-80'}
                `}
                style={{ 
                  right: -6, 
                  top: `${20 + (i * 15)}%`,
                  transform: 'translateY(-50%)',
                  boxShadow: (isHovered || selected) ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none'
                }}
                isConnectable={isConnectable}
              />
            ))}
          </>
        )}
      </div>

      {/* Hover Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
          {data.notesForAuthor || `${data.title || 'Untitled'} - ${data.nodeType.replace(/_/g, ' ')}`}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  );
};

// Node Palette Component with collapse support
const NodePalette = ({ 
  onAddNode, 
  onDragStart,
  isCollapsed = false,
  onToggleCollapse
}: { 
  onAddNode: (nodeType: StoryMapNodeType) => void;
  onDragStart?: (nodeType: StoryMapNodeType, event: React.DragEvent) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['story', 'interaction']);

  const nodeCategories = {
    story: {
      name: '📚 เนื้อเรื่อง',
      icon: BookOpen,
      color: 'from-blue-500 to-blue-600',
      nodes: [
        { type: StoryMapNodeType.START_NODE, name: 'จุดเริ่มต้น', desc: 'เริ่มต้นเรื่อง', icon: Target },
        { type: StoryMapNodeType.SCENE_NODE, name: 'ฉาก', desc: 'ฉากในเรื่อง', icon: Square },
        { type: StoryMapNodeType.ENDING_NODE, name: 'จบเรื่อง', desc: 'จุดจบของเรื่อง', icon: Flag }
      ]
    },
    interaction: {
      name: '🎮 ปฏิสัมพันธ์',
      icon: GitBranch,
      color: 'from-green-500 to-green-600',
      nodes: [
        { type: StoryMapNodeType.CHOICE_NODE, name: 'ตัวเลือก', desc: 'ให้ผู้เล่นเลือก', icon: GitBranch },
        { type: StoryMapNodeType.BRANCH_NODE, name: 'แยกเส้นทาง', desc: 'แยกตามเงื่อนไข', icon: Split },
        { type: StoryMapNodeType.MERGE_NODE, name: 'รวมเส้นทาง', desc: 'รวมเส้นทางเข้าด้วยกัน', icon: ArrowRight }
      ]
    },
    system: {
      name: '⚙️ ระบบ',
      icon: Settings,
      color: 'from-purple-500 to-purple-600',
      nodes: [
        { type: StoryMapNodeType.VARIABLE_MODIFIER_NODE, name: 'ตัวแปร', desc: 'เปลี่ยนค่าตัวแปร', icon: Settings },
        { type: StoryMapNodeType.EVENT_TRIGGER_NODE, name: 'เหตุการณ์', desc: 'เรียกเหตุการณ์', icon: Zap },
        { type: StoryMapNodeType.DELAY_NODE, name: 'หน่วงเวลา', desc: 'รอเวลา', icon: Clock }
      ]
    },
    tools: {
      name: '🛠️ เครื่องมือ',
      icon: Layers,
      color: 'from-amber-500 to-amber-600',
      nodes: [
        { type: StoryMapNodeType.COMMENT_NODE, name: 'โน้ต', desc: 'บันทึกความคิด', icon: MessageCircle },
        { type: StoryMapNodeType.GROUP_NODE, name: 'กลุ่ม', desc: 'จัดกลุ่มโหนด', icon: Layers },
        { type: StoryMapNodeType.RANDOM_BRANCH_NODE, name: 'สุ่ม', desc: 'เลือกแบบสุ่ม', icon: Shuffle }
      ]
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  if (isCollapsed) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">
            เครื่องมือ
          </div>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              title="ขยาย Node Palette"
              className="h-6 w-6 p-1"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">
            ลากโหนดไปยังหน้าจอ
          </div>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              title="ย่อ Node Palette"
              className="h-6 w-6 p-1"
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        {Object.entries(nodeCategories).map(([key, category]) => (
          <div key={key} className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleCategory(key)}
              className={`w-full justify-between text-xs bg-gradient-to-r ${category.color} text-white hover:opacity-90 transition-all`}
            >
              <div className="flex items-center gap-2">
                <category.icon className="w-4 h-4" />
                {category.name}
              </div>
              <ChevronRight className={`w-3 h-3 transition-transform ${
                expandedCategories.includes(key) ? 'rotate-90' : ''
              }`} />
            </Button>
            
            <AnimatePresence>
              {expandedCategories.includes(key) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="grid grid-cols-1 gap-2 pl-2"
                >
                  {category.nodes.map(node => (
                    <motion.div
                      key={node.type}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddNode(node.type)}
                        className="w-full justify-start text-xs p-3 h-auto hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 hover:text-white transition-all group cursor-grab active:cursor-grabbing"
                        draggable={true}
                        onDragStart={(e) => {
                          // เก็บข้อมูล node type ใน dataTransfer
                          e.dataTransfer.setData('application/node-type', node.type);
                          e.dataTransfer.effectAllowed = 'copy';
                          onDragStart?.(node.type, e);
                          // ป้องกันไม่ให้ onClick trigger
                          e.stopPropagation();
                        }}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <node.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <div className="text-left flex-1">
                            <div className="font-medium">
                              {node.name}
                            </div>
                            <div className="text-muted-foreground text-xs">{node.desc}</div>
                          </div>
                          <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

// Multiple Selection Panel Component
const MultipleSelectionPanel = ({
  selectedNodes,
  selectedEdges,
  onBatchNodeUpdate,
  onBatchEdgeUpdate,
  onDeleteSelected,
  onCopySelected,
  onDeselectAll
}: {
  selectedNodes: Node[];
  selectedEdges: Edge[];
  onBatchNodeUpdate: (updates: { nodeId: string; data: any }[]) => void;
  onBatchEdgeUpdate: (updates: { edgeId: string; data: any }[]) => void;
  onDeleteSelected: () => void;
  onCopySelected: () => void;
  onDeselectAll: () => void;
}) => {
  const totalSelected = selectedNodes.length + selectedEdges.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Multiple Selection</h3>
          <p className="text-sm text-muted-foreground">
            {selectedNodes.length} nodes, {selectedEdges.length} edges selected
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCopySelected}
          className="flex items-center gap-2"
          disabled={totalSelected === 0}
        >
          <Copy className="w-4 h-4" />
          Copy ({totalSelected})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDeleteSelected}
          className="flex items-center gap-2 text-red-600 hover:text-red-700"
          disabled={totalSelected === 0}
        >
          <Trash2 className="w-4 h-4" />
          Delete ({totalSelected})
        </Button>
      </div>

      {/* Selected Nodes List */}
      {selectedNodes.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Selected Nodes</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {selectedNodes.map((node) => (
              <div
                key={node.id}
                className="flex items-center justify-between p-2 bg-muted rounded text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span className="font-medium">{String(node.data.title || node.data.nodeType)}</span>
                  <span className="text-muted-foreground">({String(node.data.nodeType)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Edges List */}
      {selectedEdges.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Selected Connections</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {selectedEdges.map((edge) => (
              <div
                key={edge.id}
                className="flex items-center justify-between p-2 bg-muted rounded text-sm"
              >
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span>{String(edge.data?.label || `${edge.source} → ${edge.target}`)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch Operations */}
      {selectedNodes.length > 1 && (
        <div className="space-y-2 pt-2 border-t">
          <h4 className="font-medium text-sm">Batch Operations</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="batch-color" className="text-xs">Color:</Label>
              <input
                id="batch-color"
                type="color"
                className="w-8 h-6 border rounded cursor-pointer"
                onChange={(e) => {
                  const updates = selectedNodes.map(node => ({
                    nodeId: node.id,
                    data: { ...node.data, color: e.target.value }
                  }));
                  onBatchNodeUpdate(updates);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Properties Panel Component
const PropertiesPanel = ({ 
  selectedNode, 
  selectedEdge, 
  selectedNodes = [],
  selectedEdges = [],
  onNodeUpdate, 
  onEdgeUpdate,
  onBatchNodeUpdate,
  onBatchEdgeUpdate,
  onDeleteSelected,
  onCopySelected,
  onDeselectAll,
  storyVariables,
  scenes,
  characters,
  userMedia,
  officialMedia
}: {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  selectedNodes?: Node[];
  selectedEdges?: Edge[];
  onNodeUpdate: (nodeId: string, data: any) => void;
  onEdgeUpdate: (edgeId: string, data: any) => void;
  onBatchNodeUpdate?: (updates: { nodeId: string; data: any }[]) => void;
  onBatchEdgeUpdate?: (updates: { edgeId: string; data: any }[]) => void;
  onDeleteSelected?: () => void;
  onCopySelected?: () => void;
  onDeselectAll?: () => void;
  storyVariables: IStoryVariableDefinition[];
  scenes: any[];
  characters: any[];
  userMedia: any[];
  officialMedia: any[];
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sceneId, setSceneId] = useState('');
  const [emotionTags, setEmotionTags] = useState<string[]>([]);
  const [newEmotionTag, setNewEmotionTag] = useState('');

  useEffect(() => {
    if (selectedNode) {
      const nodeData = selectedNode.data as any;
      setTitle(nodeData.title || '');
      setDescription(nodeData.notesForAuthor || '');
      setSceneId(nodeData.nodeSpecificData?.sceneId || '');
      setEmotionTags(nodeData.authorDefinedEmotionTags || []);
    }
  }, [selectedNode]);

  const addEmotionTag = (tag: string) => {
    if (tag && !emotionTags.includes(tag)) {
      const newTags = [...emotionTags, tag];
      setEmotionTags(newTags);
      setNewEmotionTag('');
    }
  };

  const removeEmotionTag = (tagToRemove: string) => {
    setEmotionTags(emotionTags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = () => {
    if (selectedNode) {
      onNodeUpdate(selectedNode.id, {
        ...selectedNode.data,
        title,
        notesForAuthor: description,
        authorDefinedEmotionTags: emotionTags,
        nodeSpecificData: {
          ...(selectedNode.data as any).nodeSpecificData,
          ...((selectedNode.data as any).nodeType === StoryMapNodeType.SCENE_NODE && { sceneId })
        }
      });
      toast.success('อัปเดตโหนดสำเร็จ');
    }
  };

  // Batch operation handlers
  const handleBatchNodeUpdate = (updates: { nodeId: string; data: any }[]) => {
    if (onBatchNodeUpdate) {
      onBatchNodeUpdate(updates);
    } else {
      // Fallback: apply updates individually
      updates.forEach(update => {
        onNodeUpdate(update.nodeId, update.data);
      });
    }
  };

  const handleBatchEdgeUpdate = (updates: { edgeId: string; data: any }[]) => {
    if (onBatchEdgeUpdate) {
      onBatchEdgeUpdate(updates);
    } else {
      // Fallback: apply updates individually
      updates.forEach(update => {
        onEdgeUpdate(update.edgeId, update.data);
      });
    }
  };

  const handleDeselectAll = () => {
    if (onDeselectAll) {
      onDeselectAll();
    }
  };

  // Check for multiple selection first
  const hasMultipleSelection = selectedNodes.length > 1 || selectedEdges.length > 1 || 
                                (selectedNodes.length > 0 && selectedEdges.length > 0);
  
  if (hasMultipleSelection) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4">
          <MultipleSelectionPanel
            selectedNodes={selectedNodes}
            selectedEdges={selectedEdges}
            onBatchNodeUpdate={handleBatchNodeUpdate}
            onBatchEdgeUpdate={handleBatchEdgeUpdate}
            onDeleteSelected={onDeleteSelected || (() => {})}
            onCopySelected={onCopySelected || (() => {})}
            onDeselectAll={handleDeselectAll}
          />
        </div>
      </ScrollArea>
    );
  }

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Square className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Select a node or connection to edit properties</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {selectedNode && (
          <>
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="node-title" className="text-xs">Title</Label>
                <Input
                  id="node-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter node title..."
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="node-description" className="text-xs">Description</Label>
                <Textarea
                  id="node-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes for this node..."
                  className="text-sm min-h-20"
                />
              </div>
            </div>

            {/* Scene-specific properties */}
            {selectedNode.data.nodeType === StoryMapNodeType.SCENE_NODE && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Scene Settings</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="scene-select" className="text-xs">Connected Scene</Label>
                  <Select value={sceneId} onValueChange={setSceneId}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select a scene..." />
                    </SelectTrigger>
                    <SelectContent>
                      {scenes.map(scene => (
                        <SelectItem key={scene._id} value={scene._id}>
                          {scene.title || `Scene ${scene.sceneOrder}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {sceneId && (
                  <div className="text-xs bg-muted p-3 rounded">
                    <p className="font-medium mb-2">Scene Preview</p>
                    {(() => {
                      const scene = scenes.find(s => s._id === sceneId);
                      return scene ? (
                        <div className="space-y-1">
                          <p><span className="font-medium">Title:</span> {scene.title}</p>
                          <p><span className="font-medium">Characters:</span> {scene.characters?.length || 0}</p>
                          <p><span className="font-medium">Images:</span> {scene.images?.length || 0}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Emotion Tags */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Emotion Tags</h3>
              
              <div className="flex flex-wrap gap-1 mb-2">
                {emotionTags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeEmotionTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                                  <Input
                    value={newEmotionTag}
                    onChange={(e) => setNewEmotionTag(e.target.value)}
                    placeholder="Add emotion tag..."
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addEmotionTag(newEmotionTag);
                      }
                    }}
                  />
                <Button
                  size="sm"
                  onClick={() => addEmotionTag(newEmotionTag)}
                  disabled={!newEmotionTag}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} className="w-full">
              <CheckCircle className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </>
        )}

        {selectedEdge && (
          <>
            <h3 className="font-semibold text-sm">Connection Properties</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Connection Label</Label>
                <Input
                  value={String(selectedEdge.label || '')}
                  onChange={(e) => {
                    onEdgeUpdate(selectedEdge.id, {
                      ...selectedEdge.data,
                      label: e.target.value
                    });
                  }}
                  placeholder="Enter connection label..."
                  className="text-sm"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

// Validation Panel Component
const ValidationPanel = ({ 
  nodes, 
  edges, 
  storyVariables 
}: { 
  nodes: Node[]; 
  edges: Edge[]; 
  storyVariables: IStoryVariableDefinition[] 
}) => {
  const validationResults = useMemo(() => {
    const issues: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
      nodeId?: string;
    }> = [];

    // Check for orphaned nodes
    const connectedNodes = new Set();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && node.data.nodeType !== StoryMapNodeType.START_NODE) {
        issues.push({
          type: 'warning',
          message: `โหนด "${node.data.title || 'ไม่มีชื่อ'}" ไม่ได้เชื่อมต่อ`,
          nodeId: node.id
        });
      }
    });

    // Check for missing start node
    const hasStartNode = nodes.some(node => node.data.nodeType === StoryMapNodeType.START_NODE);
    if (!hasStartNode) {
      issues.push({
        type: 'error',
        message: 'แผนผังเรื่องต้องมีโหนดเริ่มต้น'
      });
    }

    // Check for cycles
    const detectCycles = () => {
      const visited = new Set();
      const recursionStack = new Set();

      const hasCycle = (nodeId: string): boolean => {
        if (recursionStack.has(nodeId)) return true;
        if (visited.has(nodeId)) return false;

        visited.add(nodeId);
        recursionStack.add(nodeId);

        const outgoingEdges = edges.filter(edge => edge.source === nodeId);
        for (const edge of outgoingEdges) {
          if (hasCycle(edge.target)) return true;
        }

        recursionStack.delete(nodeId);
        return false;
      };

      for (const node of nodes) {
        if (!visited.has(node.id) && hasCycle(node.id)) {
          return true;
        }
      }
      return false;
    };

    if (detectCycles()) {
      issues.push({
        type: 'error',
        message: 'แผนผังเรื่องมีการวนซ้ำซึ่งอาจทำให้เกิดลูปไม่สิ้นสุด'
      });
    }

    return issues;
  }, [nodes, edges]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span className="font-semibold text-sm">ผลการตรวจสอบ</span>
        </div>

        {validationResults.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm text-muted-foreground">
              ไม่พบปัญหาใดๆ! แผนผังเรื่องของคุณดูดี
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {validationResults.map((issue, index) => (
              <Alert key={index} className={`text-xs ${
                issue.type === 'error' ? 'border-destructive' :
                issue.type === 'warning' ? 'border-yellow-500' : 
                'border-blue-500'
              }`}>
                <div className="flex items-start gap-2">
                  {issue.type === 'error' && <XCircle className="w-4 h-4 text-destructive mt-0.5" />}
                  {issue.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />}
                  {issue.type === 'info' && <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5" />}
                  <AlertDescription className="text-xs">
                    {issue.message}
                  </AlertDescription>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

// Main Blueprint Tab Component
const BlueprintTab = React.forwardRef<any, BlueprintTabProps>(({ 
  novel, 
  storyMap, 
  scenes = [], 
  characters = [], 
  userMedia = [], 
  officialMedia = [], 
  episodes = [],
  onStoryMapUpdate,
  onManualSave,
  onDirtyChange,
  onNavigateToDirector,
  blueprintSettings
}, ref) => {
  // Core ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  // Selection and UI state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<string>(episodes[0]?._id || '');
  
  // Mobile/Desktop UI state with localStorage persistence
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPropertiesCollapsed, setIsPropertiesCollapsed] = useState(false);
  
  // Node Palette collapse state
  const [isNodePaletteCollapsed, setIsNodePaletteCollapsed] = useState(false);
  
  // Auto-save settings จะถูกจัดการโดย NovelEditor ผ่าน localStorage โดยตรง
  const [autoSaveSettings, setAutoSaveSettings] = useState<AutoSaveSettings>({
    enabled: false, // Default: false ไม่บังคับผู้ใช้ (จัดการโดย NovelEditor)
    intervalSec: 30, // จัดการโดย NovelEditor
    conflictResolutionStrategy: 'merge' // จัดการโดย SaveManager
  });

  // Enhanced save state with versioning - ใช้ SaveManager แทน
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    saveError: null,
    version: storyMap?.version || 1,
    isDirty: false,
    etag: storyMap?.etag || undefined,
    saveQueue: [],
    isProcessingQueue: false,
    pendingCommandCount: 0
  });

  // รับ SaveManager จาก props หรือสร้างใหม่ (สำหรับ backward compatibility)
  const [saveManager] = useState(() => {
    // ถ้าไม่มี SaveManager ส่งมาจาก parent ให้สร้างใหม่
    if (typeof window !== 'undefined') {
      const { createSaveManager } = require('./SaveManager');
      return createSaveManager({
        novelSlug: novel.slug,
        autoSaveEnabled: false, // จัดการโดย NovelEditor
        autoSaveIntervalMs: 30 * 1000, // จัดการโดย NovelEditor
        onStateChange: (newState: any) => {
          // Sync กับ local saveState สำหรับ backward compatibility
          setSaveState(prev => ({
            ...prev,
            isSaving: newState.isSaving,
            lastSaved: newState.lastSaved,
            hasUnsavedChanges: newState.hasUnsavedChanges,
            isDirty: newState.isDirty
          }));
        },
        onDirtyChange: (isDirty: boolean) => {
          // แจ้ง parent component ให้อัปเดตสถานะปุ่ม save
          onDirtyChange?.(isDirty);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[BlueprintTab] Save button state changed:', {
              isDirty,
              timestamp: new Date().toISOString()
            });
          }
        }
      });
    }
    return null;
  });
  
  // Canvas state - ใช้ค่าเริ่มต้น
  const [canvasState, setCanvasState] = useState<CanvasState>({
    isLocked: false,
    zoomLevel: 1,
    position: { x: 0, y: 0 },
    showGrid: true,
    gridSize: 20,
    snapToGrid: false
  });


  
  // Command Stack for undo/redo (replacing old HistoryState)
  const [undoStack, setUndoStack] = useState<AnyCommand[]>([]);
  const [redoStack, setRedoStack] = useState<AnyCommand[]>([]);
  const maxHistorySize = 50;
  
  // Drag tracking for Command Pattern
  const dragStartPositions = useRef<Record<string, { x: number; y: number }>>({});
  const isDragging = useRef(false);
  const multiSelectDragStart = useRef<Record<string, { x: number; y: number }>>({});
  
  // Connection mode for manual edge creation (deprecated - using React Flow handles instead)
  const [connectionMode, setConnectionMode] = useState<{
    isConnecting: boolean;
    sourceNode: string | null;
    sourceHandle: string | null;
  }>({
    isConnecting: false,
    sourceNode: null,
    sourceHandle: null
  });

  // การตั้งค่า Blueprint Editor - ผสานค่าจาก UserSettings, props และค่าเริ่มต้น
  const currentBlueprintSettings = React.useMemo(() => {
    // รับการตั้งค่าจาก UserSettings ผ่าน novel object
    const userBlueprintSettings = (novel as any)?.userSettings?.visualNovelGameplay?.blueprintEditor;
    
    return {
      showSceneThumbnails: userBlueprintSettings?.showSceneThumbnails ?? blueprintSettings?.showSceneThumbnails ?? true,
      showNodeLabels: userBlueprintSettings?.showNodeLabels ?? blueprintSettings?.showNodeLabels ?? true,
      showConnectionLines: userBlueprintSettings?.showConnectionLines ?? true,
      showGrid: userBlueprintSettings?.showGrid ?? blueprintSettings?.showGrid ?? true,
      autoLayout: userBlueprintSettings?.autoLayout ?? false,
      snapToGrid: userBlueprintSettings?.snapToGrid ?? blueprintSettings?.snapToGrid ?? false,
      gridSize: userBlueprintSettings?.gridSize ?? 20,
      nodeDefaultColor: userBlueprintSettings?.nodeDefaultColor ?? '#3b82f6',
      edgeDefaultColor: userBlueprintSettings?.edgeDefaultColor ?? '#64748b',
      connectionLineStyle: userBlueprintSettings?.connectionLineStyle ?? 'solid',
      nodeOrientation: userBlueprintSettings?.nodeOrientation ?? blueprintSettings?.nodeOrientation ?? 'vertical' // การตั้งค่าการวางแนว node
    };
  }, [blueprintSettings, novel]);

  // อัปเดต Canvas state เมื่อ Blueprint settings เปลี่ยน
  useEffect(() => {
    setCanvasState(prev => ({
      ...prev,
      showGrid: currentBlueprintSettings.showGrid,
      gridSize: currentBlueprintSettings.gridSize || 20,
      snapToGrid: currentBlueprintSettings.snapToGrid || false
    }));
  }, [currentBlueprintSettings.showGrid, currentBlueprintSettings.gridSize, currentBlueprintSettings.snapToGrid]);

  // ฟังก์ชันสำหรับอัปเดตการตั้งค่าการวางแนว node และส่งไปยัง UserSettings
  const updateNodeOrientation = useCallback(async (newOrientation: 'horizontal' | 'vertical') => {
    try {
      // อัปเดตการตั้งค่าใน UserSettings ผ่าน API
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          'visualNovelGameplay.blueprintEditor.nodeOrientation': newOrientation
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update node orientation setting');
      }

      // อัปเดต layout ของ nodes และ edges ทันที (realtime UI update)
      setNodes(prevNodes => 
        prevNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            nodeOrientation: newOrientation
          }
        }))
      );

      setEdges(prevEdges => 
        prevEdges.map(edge => ({
          ...edge,
          data: {
            ...edge.data,
            nodeOrientation: newOrientation
          }
        }))
      );

      console.log(`การตั้งค่าการวางแนว node เปลี่ยนเป็น: ${newOrientation}`);
      
    } catch (error) {
      console.error('Error updating node orientation:', error);
      // แสดง error แต่ไม่ block การทำงาน
    }
  }, [setNodes, setEdges]);

  // ===============================
  // ENTERPRISE-GRADE SAVE SYSTEM
  // ===============================

  // Generate idempotency key for commands
  const generateCommandId = () => `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Auto-save debounced function (300-800ms สำหรับการลาก/ย้าย)
  const debouncedAutoSave = useMemo(
    () => debounce(async (commandData: any) => {
      if (!autoSaveSettings.enabled) return;

      const commandId = generateCommandId();
      const saveCommand: SaveCommand = {
        id: commandId,
        type: 'auto',
        timestamp: Date.now(),
        version: saveState.version,
        etag: saveState.etag,
        data: commandData,
        retryCount: 0
      };

      // เพิ่มเข้าคิว
      setSaveState(prev => ({
        ...prev,
        saveQueue: [...prev.saveQueue, saveCommand],
        pendingCommandCount: prev.pendingCommandCount + 1,
        isDirty: true,
        hasUnsavedChanges: true
      }));

      // เริ่มประมวลผลคิวถ้ายังไม่ได้ทำ
      processSaveQueue();
    }, 500), // 500ms debounce สำหรับ auto-save
    [autoSaveSettings.enabled, saveState.version, saveState.etag]
  );

  // ประมวลผลคิวบันทึก (Sequential processing)
  const processSaveQueue = useCallback(async () => {
    setSaveState(prev => {
      if (prev.isProcessingQueue || prev.saveQueue.length === 0) {
        return prev;
      }
      return { ...prev, isProcessingQueue: true, isSaving: true };
    });

    let currentSaveState = saveState;
    while (currentSaveState.saveQueue.length > 0) {
      const command = currentSaveState.saveQueue[0];
      
      try {
        // PATCH request พร้อม version control
        const response = await fetch(`/api/novels/${novel._id}/storymap`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'If-Match': command.etag || `"${command.version}"`,
            'X-Idempotency-Key': command.id
          },
          body: JSON.stringify({
            command: command.data,
            version: command.version
          })
        });

        if (response.status === 409) {
          // Conflict - ทำ reconciliation
          await handleSaveConflict(command);
          continue;
        }

        if (!response.ok) {
          throw new Error(`Save failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        // อัปเดตสถานะหลังบันทึกสำเร็จ
        setSaveState(prev => {
          const updated = {
            ...prev,
            version: result.version,
            etag: result.etag,
            lastSaved: new Date(),
            saveError: null,
            saveQueue: prev.saveQueue.slice(1), // ลบ command ที่สำเร็จแล้ว
            pendingCommandCount: prev.pendingCommandCount - 1
          };
          currentSaveState = updated;
          return updated;
        });

        // อัปเดต storyMap ใน parent
        if (onStoryMapUpdate) {
          onStoryMapUpdate(result.storyMap);
        }

      } catch (error) {
        console.error('Save command failed:', error);
        
        // Retry logic
        if (command.retryCount < 3) {
          setSaveState(prev => ({
            ...prev,
            saveQueue: [
              { ...command, retryCount: command.retryCount + 1 },
              ...prev.saveQueue.slice(1)
            ]
          }));
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, command.retryCount) * 1000));
        } else {
          // ล้มเหลวถาวร - ลบออกจากคิวและแจ้งเตือน
          setSaveState(prev => {
            const updated = {
              ...prev,
              saveQueue: prev.saveQueue.slice(1),
              pendingCommandCount: prev.pendingCommandCount - 1,
              saveError: `Failed to save: ${error instanceof Error ? error.message : String(error)}`
            };
            currentSaveState = updated;
            return updated;
          });
        }
      }
    }

    // เสร็จสิ้นการประมวลผลคิว
    setSaveState(prev => ({
      ...prev,
      isProcessingQueue: false,
      isSaving: false,
      isDirty: prev.saveQueue.length > 0,
      hasUnsavedChanges: prev.saveQueue.length > 0
    }));
  }, [novel._id, onStoryMapUpdate]);

  // Handle save conflicts (409 response) - Enhanced with retry logic
  const handleSaveConflict = useCallback(async (failedCommand: SaveCommand) => {
    try {
      console.log('Handling save conflict, attempt:', failedCommand.retryCount + 1);
      
      // 1. ดึง story map ล่าสุดจาก server
      const response = await fetch(`/api/novels/${novel._id}/storymap`);
      if (!response.ok) {
        throw new Error('Failed to fetch latest story map');
      }
      const latestStoryMap = await response.json();

      // 2. ตรวจสอบ retry count
      if (failedCommand.retryCount >= 3) {
        // แสดง conflict resolution UI หลังจาก retry 3 ครั้ง
        const userChoice = window.confirm(
          'มีการแก้ไขจากผู้ใช้อื่นพร้อมกัน\n\nกด OK เพื่อรวมการเปลี่ยนแปลง\nกด Cancel เพื่อใช้การเปลี่ยนแปลงของคุณ'
        );
        
        if (userChoice) {
          // Merge: ใช้ข้อมูลจาก server
          setSaveState(prev => ({
            ...prev,
            version: latestStoryMap.version,
            etag: latestStoryMap.etag,
            isConflicted: false,
            saveQueue: prev.saveQueue.slice(1), // ลบ command ที่ conflict
            saveError: null
          }));
          
          // อัปเดต UI จาก server
          if (latestStoryMap.nodes) {
            setNodes(latestStoryMap.nodes);
          }
          if (latestStoryMap.edges) {
            setEdges(latestStoryMap.edges);
          }
          
          // อัปเดต parent
          if (onStoryMapUpdate) {
            onStoryMapUpdate(latestStoryMap);
          }
          
          toast.success('รวมการเปลี่ยนแปลงเรียบร้อย');
          return;
        } else {
          // Force overwrite - ใช้ PUT แทน PATCH
          setSaveState(prev => ({
            ...prev,
            saveError: 'กำลังบันทึกแบบเขียนทับ...',
            isConflicted: false
          }));
          
          // Force overwrite โดยใช้ PUT request โดยตรง
          try {
            const response = await fetch(`/api/novels/${novel._id}/storymap`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'X-Force-Overwrite': 'true'
              },
              body: JSON.stringify({
                nodes: nodes.map(node => ({
                  nodeId: node.id,
                  nodeType: node.data.nodeType,
                  title: node.data.title,
                  position: node.position,
                  data: node.data
                })),
                edges: edges.map(edge => ({
                  edgeId: edge.id,
                  sourceNodeId: edge.source,
                  targetNodeId: edge.target,
                  data: edge.data
                })),
                storyVariables: storyMap?.storyVariables || []
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              setSaveState(prev => ({
                ...prev,
                version: result.version,
                etag: result.etag,
                lastSaved: new Date(),
                saveError: null,
                saveQueue: prev.saveQueue.slice(1)
              }));
              toast.success('บังคับบันทึกสำเร็จ');
            }
          } catch (error) {
            console.error('Force save failed:', error);
            toast.error('บังคับบันทึกล้มเหลว');
          }
          return;
        }
      }

      // 3. ทำ reconciliation ตาม strategy (สำหรับ auto retry)
      let resolvedData;
      switch (autoSaveSettings.conflictResolutionStrategy) {
        case 'last_write_wins':
          resolvedData = failedCommand.data;
          break;
        case 'merge':
          resolvedData = mergeStoryMapChanges(latestStoryMap, failedCommand.data);
          break;
        case 'manual':
          // แจ้งให้ผู้ใช้เลือกทันที
          setSaveState(prev => ({ ...prev, isConflicted: true }));
          return;
      }

      // 4. อัปเดต version และลองบันทึกอีกครั้ง
      const newCommand: SaveCommand = {
        ...failedCommand,
        version: latestStoryMap.version,
        etag: latestStoryMap.etag,
        data: resolvedData,
        retryCount: failedCommand.retryCount + 1
      };

      setSaveState(prev => ({
        ...prev,
        version: latestStoryMap.version,
        etag: latestStoryMap.etag,
        saveQueue: [newCommand, ...prev.saveQueue.slice(1)],
        saveError: null
      }));

      console.log('Conflict resolved, retrying with version:', latestStoryMap.version);

    } catch (error: unknown) {
      console.error('Conflict resolution failed:', error);
      setSaveState(prev => ({
        ...prev,
        saveError: `ไม่สามารถแก้ไขความขัดแย้งได้: ${error instanceof Error ? error.message : String(error)}`,
        saveQueue: prev.saveQueue.slice(1) // ลบ command ที่ล้มเหลว
      }));
    }
  }, [novel._id, autoSaveSettings.conflictResolutionStrategy, setNodes, setEdges, onStoryMapUpdate, nodes, edges, storyMap?.storyVariables]);

  // Manual save (PUT full document)
  const handleManualSaveClick = useCallback(async () => {
    if (saveState.isSaving) return;

    setSaveState(prev => ({ ...prev, isSaving: true, saveError: null }));

    try {
      const response = await fetch(`/api/novels/${novel._id}/storymap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': saveState.etag || `"${saveState.version}"`
        },
        body: JSON.stringify({
          nodes,
          edges,
          storyVariables: storyMap?.storyVariables || [],
          version: saveState.version
        })
      });

      if (response.status === 409) {
        await handleSaveConflict({
          id: generateCommandId(),
          type: 'manual',
          timestamp: Date.now(),
          version: saveState.version,
          etag: saveState.etag,
          data: { nodes, edges },
          retryCount: 0
        });
        return;
      }

      if (!response.ok) {
        throw new Error(`Manual save failed: ${response.statusText}`);
      }

      const result = await response.json();

      setSaveState(prev => ({
        ...prev,
        version: result.version,
        etag: result.etag,
        lastSaved: new Date(),
        isDirty: false,
        hasUnsavedChanges: false,
        saveQueue: [], // ล้างคิวหลัง manual save สำเร็จ
        pendingCommandCount: 0,
        saveError: null
      }));

      // เรียก callback ถ้ามี
      if (onManualSave) {
        onManualSave();
      }

      // อัปเดต storyMap ใน parent
      if (onStoryMapUpdate) {
        onStoryMapUpdate(result.storyMap);
      }

    } catch (error: unknown) {
      console.error('Manual save failed:', error);
      setSaveState(prev => ({
        ...prev,
        saveError: `Manual save failed: ${error instanceof Error ? error.message : String(error)}`
      }));
    } finally {
      setSaveState(prev => ({ ...prev, isSaving: false }));
    }
  }, [saveState, nodes, edges, storyMap?.storyVariables, novel._id, onManualSave, onStoryMapUpdate]);

  // Simple merge function (can be enhanced)
  const mergeStoryMapChanges = (latestStoryMap: any, localChanges: any) => {
    // TODO: Implement sophisticated merge logic
    // For now, just apply local changes on top of latest
    return {
      ...latestStoryMap,
      ...localChanges
    };
  };

  // Local storage preference management สำหรับ instant UX
  // การตั้งค่าทั้งหมดถูกจัดการโดย NovelEditor และส่งผ่าน props

  // บันทึก UI state ลง localStorage เมื่อเปลี่ยน (Desktop experience)
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialLoad) {
      localStorage.setItem('blueprint-sidebar-open', JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen, isInitialLoad]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialLoad) {
      localStorage.setItem('blueprint-properties-open', JSON.stringify(isPropertiesOpen));
    }
  }, [isPropertiesOpen, isInitialLoad]);

  // Load UI states from localStorage after mount (ทำครั้งเดียวเพื่อป้องกัน infinite loops)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let hasChanges = false;
      
      // Load sidebar open state
      const sidebarOpen = localStorage.getItem('blueprint-sidebar-open');
      if (sidebarOpen && JSON.parse(sidebarOpen) !== isSidebarOpen) {
        setIsSidebarOpen(JSON.parse(sidebarOpen));
        hasChanges = true;
      }
      
      // Load properties open state
      const propertiesOpen = localStorage.getItem('blueprint-properties-open');
      if (propertiesOpen && JSON.parse(propertiesOpen) !== isPropertiesOpen) {
        setIsPropertiesOpen(JSON.parse(propertiesOpen));
        hasChanges = true;
      }
      
      // Load sidebar collapsed state
      const sidebarCollapsed = localStorage.getItem('blueprint-sidebar-collapsed');
      if (sidebarCollapsed && JSON.parse(sidebarCollapsed) !== isSidebarCollapsed) {
        setIsSidebarCollapsed(JSON.parse(sidebarCollapsed));
        hasChanges = true;
      }
      
      // Load properties collapsed state
      const propertiesCollapsed = localStorage.getItem('blueprint-properties-collapsed');
      if (propertiesCollapsed && JSON.parse(propertiesCollapsed) !== isPropertiesCollapsed) {
        setIsPropertiesCollapsed(JSON.parse(propertiesCollapsed));
        hasChanges = true;
      }
      
      // Load node palette collapsed state
      const nodePaletteCollapsed = localStorage.getItem('blueprint-node-palette-collapsed');
      if (nodePaletteCollapsed && JSON.parse(nodePaletteCollapsed) !== isNodePaletteCollapsed) {
        setIsNodePaletteCollapsed(JSON.parse(nodePaletteCollapsed));
        hasChanges = true;
      }
      
      // Log เฉพาะเมื่อมีการเปลี่ยนแปลง
      if (hasChanges) {
        console.log('[BlueprintTab] Loaded UI states from localStorage');
      }
      
      // ตั้งค่าให้พร้อมบันทึก localStorage ในครั้งต่อไป
      setIsInitialLoad(false);
    }
  }, []); // ทำครั้งเดียวเท่านั้น

  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialLoad) {
      localStorage.setItem('blueprint-sidebar-collapsed', JSON.stringify(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed, isInitialLoad]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialLoad) {
      localStorage.setItem('blueprint-properties-collapsed', JSON.stringify(isPropertiesCollapsed));
    }
  }, [isPropertiesCollapsed, isInitialLoad]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialLoad) {
      localStorage.setItem('blueprint-node-palette-collapsed', JSON.stringify(isNodePaletteCollapsed));
    }
  }, [isNodePaletteCollapsed, isInitialLoad]);

  // การตั้งค่าถูกจัดการโดย NovelEditor ผ่าน localStorage โดยตรง
  
  // อัปเดต node data เมื่อ display settings เปลี่ยน
  useEffect(() => {
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          showThumbnails: currentBlueprintSettings.showSceneThumbnails,
          showLabels: currentBlueprintSettings.showNodeLabels
        }
      }))
    );
  }, [currentBlueprintSettings.showSceneThumbnails, currentBlueprintSettings.showNodeLabels, setNodes]);
  
  // อัปเดต dirty state เมื่อ nodes/edges เปลี่ยน - Professional-grade detection
  // ===============================
  // PROFESSIONAL CHANGE DETECTION 
  // สำหรับการทำงานคนเดียว (Single-User Mode)
  // ===============================
  
  useEffect(() => {
    let stabilizationTimer: NodeJS.Timeout;
    
    // ข้าม change detection ระหว่างการ initialize 
    if (isInitializingRef.current || isApplyingServerUpdateRef.current) {
      return;
    }
    
    if (onDirtyChange) {
      // Professional-grade change detection ที่ป้องกัน flickering
      const performStableChangeCheck = () => {
        if (saveManager) {
          // สร้าง normalized data สำหรับการเปรียบเทียบที่แม่นยำ
          const currentData = {
            nodes: nodes.map(node => ({
              id: node.id,
              position: { 
                x: Math.round(node.position.x), 
                y: Math.round(node.position.y) 
              },
              data: node.data,
              type: node.type
            })),
            edges: edges.map(edge => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              data: edge.data
            })),
            storyVariables: storyMap?.storyVariables || []
          };
          
          // Real-time professional change detection เทียบกับ database
          const hasActualChanges = saveManager.checkIfDataChanged(currentData);
          
          // SaveManager จะจัดการ onDirtyChange โดยอัตโนมัติแล้ว
          // ไม่ต้องเรียก onDirtyChange ที่นี่เพื่อป้องกัน double call
          
          // Development logging เท่านั้น
          if (process.env.NODE_ENV === 'development') {
            console.log('[BlueprintTab] Real-time professional change detection:', {
              hasActualChanges,
              nodeCount: nodes.length,
              edgeCount: edges.length,
              hasUndoHistory: undoStack.length > 0,
              timestamp: new Date().toISOString(),
              saveButtonStatus: hasActualChanges ? 'enabled' : 'disabled'
            });
          }
          
        } else {
          // Fallback: ใช้ basic state checks แต่ยังคงความมั่นคง
          const hasBasicChanges = saveState.isDirty || saveState.hasUnsavedChanges || undoStack.length > 0;
          onDirtyChange(hasBasicChanges);
        }
      };

      // Stabilization technique: รอให้ state stabilize ก่อนตรวจสอบ
      // เป็นเทคนิคที่ Adobe และ Canva ใช้เพื่อป้องกัน UI flickering
      stabilizationTimer = setTimeout(() => {
        performStableChangeCheck();
      }, 200); // Optimal delay สำหรับ professional UX
    }

    return () => {
      if (stabilizationTimer) {
        clearTimeout(stabilizationTimer);
      }
    };
  }, [
    // Dependencies ที่คำนวณอย่างระมัดระวังเพื่อป้องกัน false positive
    nodes.length, 
    edges.length, 
    // ใช้ JSON.stringify กับ normalized data เพื่อ accurate change detection
    JSON.stringify(nodes.map(n => ({ 
      id: n.id, 
      x: Math.round(n.position.x), 
      y: Math.round(n.position.y),
      type: n.type 
    }))),
    JSON.stringify(edges.map(e => ({ 
      id: e.id, 
      source: e.source, 
      target: e.target 
    }))),
    undoStack.length,
    saveManager,
    onDirtyChange,
    // เพิ่ม storyVariables เป็น dependency
    JSON.stringify(storyMap?.storyVariables || [])
  ]);

  // Trigger auto-save เมื่อมีการเปลี่ยนแปลง nodes/edges
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      const commandData = {
        type: 'UPDATE_CANVAS',
        nodes: nodes.map(node => ({
          id: node.id,
          position: node.position,
          data: node.data
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          data: edge.data
        }))
      };
      
      debouncedAutoSave(commandData);
    }
  }, [nodes, edges, debouncedAutoSave]);
  
  // ฟังก์ชั่นสำหรับอัปเดต Scene's defaultNextSceneId
  const updateSceneDefaultNext = useCallback(async (sourceSceneId: string, targetSceneId: string) => {
    try {
      const response = await fetch(`/api/novels/${novel.slug}/scenes/${sourceSceneId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          defaultNextSceneId: targetSceneId
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to update scene default next connection');
        return;
      }
      
      console.log('Scene default next connection updated successfully');
    } catch (error) {
      console.error('Error updating scene default next connection:', error);
    }
  }, [novel.slug]);

  // ฟังก์ชั่นสำหรับลบการเชื่อมต่อ Scene  
  const removeSceneConnection = useCallback(async (sourceSceneId: string) => {
    try {
      const response = await fetch(`/api/novels/${novel.slug}/scenes/${sourceSceneId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          defaultNextSceneId: null
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to remove scene default next connection');
        return;
      }
      
      console.log('Scene default next connection removed successfully');
    } catch (error) {
      console.error('Error removing scene default next connection:', error);
    }
  }, [novel.slug]);

  // อัปเดต nodes เมื่อ blueprintSettings เปลี่ยน
  useEffect(() => {
    setNodes(prevNodes => 
      prevNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          blueprintSettings
        }
      }))
    );
  }, [blueprintSettings, setNodes]);

  // ===============================
  // REAL-TIME DATABASE VALIDATION
  // ตรวจสอบสถานะเริ่มต้นกับ database
  // ===============================
  
  useEffect(() => {
    let mounted = true;
    
    const performInitialValidation = async () => {
      if (!saveManager || !mounted) return;
      
      try {
        // ตรวจสอบ database validation
        await saveManager.validateWithDatabase();
        
        if (!mounted) return;
        
        // ตรวจสอบสถานะเริ่มต้น
        const initialData = {
          nodes: nodes.map(node => ({
            id: node.id,
            position: { 
              x: Math.round(node.position.x), 
              y: Math.round(node.position.y) 
            },
            data: node.data,
            type: node.type
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            data: edge.data
          })),
          storyVariables: storyMap?.storyVariables || []
        };
        
        // ตรวจสอบว่าต้อง enable ปุ่ม save หรือไม่
        const hasChanges = saveManager.checkIfDataChanged(initialData);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[BlueprintTab] Initial validation completed:', {
            hasChanges,
            nodeCount: nodes.length,
            edgeCount: edges.length,
            timestamp: new Date().toISOString()
          });
        }
        
      } catch (error) {
        console.error('[BlueprintTab] Initial validation failed:', error);
      }
    };
    
    // รอให้ component และ data โหลดเสร็จก่อนตรวจสอบ
    const timer = setTimeout(performInitialValidation, 1000);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [saveManager, nodes.length, edges.length, storyMap?.storyVariables]);
  
  // Selection state
  const [selection, setSelection] = useState<SelectionState>({
    selectedNodes: [],
    selectedEdges: [],
    multiSelectMode: false,
    clipboard: { nodes: [], edges: [] },
    isSelectionMode: false,
    pendingSelection: [],
    showSelectionBar: false
  });
  
  // Multi-select UI state
  const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
  const [multiSelectStartPosition, setMultiSelectStartPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Save state (ใช้ Enhanced Save State ที่ประกาศไว้แล้วด้านบน)
  const isInitializingRef = useRef<boolean>(true);
  const isApplyingServerUpdateRef = useRef<boolean>(false);
  
  // Trash/Delete history state  
  const [deletedItems, setDeletedItems] = useState<Array<{
    id: string;
    type: 'node' | 'edge';
    data: Node | Edge;
    deletedAt: Date;
    description: string;
  }>>([]);
  const [isTrashHistoryOpen, setIsTrashHistoryOpen] = useState(false);
  
  // React Flow instance and refs
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Responsive detection for mobile-only adjustments
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  // Auto-save timer and debounce
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const saveDebounceTimer = useRef<NodeJS.Timeout | null>(null);







  // Enhanced API functions for database sync with better error handling
  const saveStoryMapToDatabase = useCallback(async (currentNodes: Node[], currentEdges: Edge[], isManual = false) => {
    if (!novel?.slug) return;
    
    try {
      setSaveState(prev => ({ ...prev, isSaving: true, saveError: null }));
      
      const storyMapData = {
        nodes: currentNodes.map(node => ({
          nodeId: node.id,
          nodeType: (node.data as any).nodeType,
          title: (node.data as any).title,
          position: node.position,
          dimensions: node.width && node.height ? { width: node.width, height: node.height } : undefined,
          nodeSpecificData: (node.data as any).nodeSpecificData || {},
          notesForAuthor: (node.data as any).notesForAuthor,
          authorDefinedEmotionTags: (node.data as any).authorDefinedEmotionTags || [],
          editorVisuals: {
            color: (node.data as any).color,
            zIndex: (node.data as any).zIndex || 0
          }
        })),
        edges: currentEdges.map(edge => ({
          edgeId: edge.id,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceHandleId: edge.sourceHandle,
          targetHandleId: edge.targetHandle,
          label: edge.label,
          condition: (edge.data as any)?.condition,
          priority: (edge.data as any)?.priority || 0,
          editorVisuals: {
            animated: edge.animated || false,
            color: (edge.style as any)?.stroke,
            lineStyle: (edge.data as any)?.lineStyle || 'solid'
          }
        })),
        storyVariables: storyMap?.storyVariables || [],
        episodeFilter: selectedEpisode,
        version: saveState.version // Send current version for conflict detection
      };

      const response = await fetch(`/api/novels/${encodeURIComponent(novel.slug)}/storymap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyMapData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const now = new Date();
      
      setSaveState(prev => ({ 
        ...prev, 
        lastSaved: now, 
        hasUnsavedChanges: false,
        isSaving: false,
        isConflicted: false,
        version: result.newVersion || prev.version + 1 // Update to new version
      }));
      
      // จัดการ merge response - อัปเดต UI ถ้ามีการ merge
      if (result.merged && result.storyMap) {
        console.log('[MERGE] Updating UI with merged data');
        
        // อัปเดต nodes และ edges ด้วยข้อมูลที่ merge แล้ว
        if (result.storyMap.nodes) {
          setNodes(result.storyMap.nodes.map((node: any) => ({
            id: node.nodeId,
            type: getReactFlowNodeType(node.nodeType),
            position: node.position || { x: 0, y: 0 },
            data: {
              nodeType: node.nodeType,
              title: node.title,
              ...node.nodeSpecificData,
              blueprintSettings
            }
          })));
        }
        
        if (result.storyMap.edges) {
          setEdges(result.storyMap.edges.map((edge: any) => ({
            id: edge.edgeId,
            source: edge.sourceNodeId,
            target: edge.targetNodeId,
            type: 'custom',
            data: edge.data || {}
          })));
        }
        
        // แสดงข้อความแจ้งเตือนเกี่ยวกับการ merge
        if (isManual) {
          toast.success(result.mergeMessage || 'บันทึกและรวมการเปลี่ยนแปลงสำเร็จ');
        } else {
          toast.info('การเปลี่ยนแปลงถูกรวมกับเวอร์ชันล่าสุดอัตโนมัติ');
        }
      } else {
        // การบันทึกปกติ
        if (isManual) {
          toast.success('บันทึกแผนผังเรื่องสำเร็จ');
        }
      }
      
      // Inform parent that data is now clean
      if (typeof onDirtyChange === 'function') {
        onDirtyChange(false);
      }

      return result;
    } catch (error) {
      console.error('Error saving story map:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save story map';
      
      setSaveState(prev => ({ 
        ...prev, 
        isSaving: false, 
        saveError: errorMessage 
      }));
      
      if (isManual) {
        toast.error(errorMessage);
      }
      throw error;
    }
  }, [novel?.slug, storyMap?.storyVariables, selectedEpisode, onDirtyChange]);

  // Patch-based saves สำหรับประสิทธิภาพสูง (เหมือน Premiere Pro)
  const savePatchToDatabase = useCallback(async (command: AnyCommand | null, currentNodes: Node[], currentEdges: Edge[]) => {
    if (!novel?.slug || !storyMap?._id) return;

    setSaveState(prev => ({ ...prev, isSaving: true, saveError: null }));

    try {
      // สร้าง patch command แทนการส่งข้อมูลทั้งหมด
      const patchData = {
        command: command ? {
          id: command.id,
          type: command.type,
          description: command.description,
          timestamp: Date.now(),
          // เก็บเฉพาะข้อมูลที่เปลี่ยนแปลง
          changes: command.type.includes('NODE') ? 
            { nodes: currentNodes.filter(n => n.id === (command as NodeCommand).nodeId) } :
            { edges: currentEdges.filter(e => e.id === (command as EdgeCommand).edgeId) }
        } : null,
        etag: storyMap.version?.toString() || '1', // Optimistic concurrency control
        lastSyncedAt: new Date().toISOString()
      };

      const response = await fetch(`/api/novels/${novel.slug}/storymap/patch`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Command-Id': command?.id || crypto.randomUUID(), // Idempotency
        },
        body: JSON.stringify(patchData),
      });

      if (!response.ok) {
        if (response.status === 409) {
          // Conflict - reload and merge
          toast.warning('การเปลี่ยนแปลงขัดแย้งกัน กำลังโหลดเวอร์ชันล่าสุด...');
          // TODO: Implement conflict resolution UI
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      setSaveState(prev => ({ 
        ...prev, 
        isSaving: false, 
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        version: result.version || prev.version + 1
      }));

      if (typeof onDirtyChange === 'function') {
        onDirtyChange(false);
      }

      // อัปเดต storyMap version สำหรับ optimistic concurrency control
      if (onStoryMapUpdate && result.storyMap) {
        onStoryMapUpdate(result.storyMap);
      }

    } catch (error: any) {
      console.error('Patch save failed:', error);
      setSaveState(prev => ({ 
        ...prev, 
        isSaving: false, 
        saveError: error.message || 'Failed to save changes'
      }));
      
      // Fallback ไปใช้ full save
      try {
        await saveStoryMapToDatabase(currentNodes, currentEdges, false);
      } catch (fallbackError) {
        toast.error('บันทึกไม่สำเร็จ: ' + (error.message || 'Unknown error'));
      }
    }
  }, [novel?.slug, storyMap, saveStoryMapToDatabase, onStoryMapUpdate, onDirtyChange]);

     // Enhanced auto-save system สำหรับประสิทธิภาพระดับโลก - Professional-grade
    const scheduleAutoSave = useCallback((currentNodes: Node[], currentEdges: Edge[], command?: AnyCommand) => {
      if (!autoSaveSettings.enabled) return;
      
      // Clear existing timers เพื่อป้องกัน multiple auto-saves
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      if (saveDebounceTimer.current) {
        clearTimeout(saveDebounceTimer.current);
      }
      
      // ใช้ SaveManager เป็นหลักหากมี, fallback เป็น legacy system
      if (saveManager) {
        // Professional-grade auto-save ผ่าน SaveManager
        const currentData = {
          nodes: currentNodes,
          edges: currentEdges,
          storyVariables: storyMap?.storyVariables || []
        };
        
        // ตรวจสอบว่ามีการเปลี่ยนแปลงจริงๆ หรือไม่
        const hasChanges = saveManager.checkIfDataChanged(currentData);
        
        if (hasChanges) {
          // Mark as dirty และ schedule auto-save
          saveManager.updateDirtyStateOnly(true);
          
          // Schedule debounced auto-save
          saveManager.saveOperation({
            type: 'BATCH_UPDATE',
            data: currentData,
            strategy: 'debounced'
          }).catch((error: any) => {
            console.error('[BlueprintTab] Auto-save failed via SaveManager:', error);
          });
          
          console.log('[BlueprintTab] Auto-save scheduled via SaveManager');
        } else {
          console.log('[BlueprintTab] No changes detected, skipping auto-save');
        }
      } else {
        // Legacy auto-save system (fallback)
        setSaveState(prev => ({ 
          ...prev, 
          hasUnsavedChanges: true,
          lastCommandId: command?.id 
        }));
        if (typeof onDirtyChange === 'function') {
          onDirtyChange(true);
        }
        
        // Professional-grade debounced save with patch-based saves
        saveDebounceTimer.current = setTimeout(async () => {
          try {
            await savePatchToDatabase(command || null, currentNodes, currentEdges);
          } catch (error) {
            console.error('[BlueprintTab] Legacy auto-save failed:', error);
          }
        }, 500); // 500ms debounce เหมือน Premiere Pro
      }
      
    }, [autoSaveSettings.enabled, saveManager, storyMap, onDirtyChange, savePatchToDatabase]);

  // Command Pattern functions
  const executeCommand = useCallback((command: AnyCommand) => {
    try {
      command.execute();
      
      // Add to undo stack
      setUndoStack(prev => {
        const newUndoStack = [...prev, command];
        if (newUndoStack.length > maxHistorySize) {
          newUndoStack.shift(); // Remove oldest command
        }
        return newUndoStack;
      });
      
      // Clear redo stack when new command is executed
      setRedoStack([]);
      
      // ใช้ SaveManager เพื่อจัดการ save operation แบบ Professional-grade
      if (saveManager) {
        // รอให้ React update state ก่อนส่งข้อมูลไปยัง SaveManager
        setTimeout(() => {
          const currentData = {
            nodes: nodes.map(node => ({
              nodeId: node.id,
              nodeType: node.data.nodeType,
              title: node.data.title,
              position: node.position,
              nodeSpecificData: { ...node.data }
            })),
            edges: edges.map(edge => ({
              edgeId: edge.id,
              sourceNodeId: edge.source,
              targetNodeId: edge.target,
              data: edge.data || {}
            })),
            storyVariables: storyMap?.storyVariables || []
          };

          // ตรวจสอบว่ามีการเปลี่ยนแปลงจริงๆ หรือไม่
          const hasChanges = saveManager.checkIfDataChanged(currentData);
          
          if (hasChanges) {
            // Mark as dirty และ schedule save operation
            saveManager.updateDirtyStateOnly(true);
            
            saveManager.saveOperation({
              type: command.type as any,
              data: {
                commandId: command.id,
                commandType: command.type,
                commandData: command,
                ...currentData
              },
              strategy: command.type === 'DELETE_NODE' || command.type === 'DELETE_EDGE' || 
                       command.type === 'ADD_NODE' || command.type === 'ADD_EDGE' ? 'immediate' : 'debounced'
            }).catch((error: any) => {
              console.error('[BlueprintTab] SaveManager operation failed:', error);
            });
            
            console.log(`[BlueprintTab] Command executed: ${command.type}, changes detected, save scheduled`);
          } else {
            console.log(`[BlueprintTab] Command executed: ${command.type}, no changes detected`);
          }
        }, 10); // รอ 10ms ให้ React update state
      } else {
        // Fallback สำหรับ backward compatibility
        setSaveState(prev => ({
          ...prev,
          isDirty: true,
          hasUnsavedChanges: true,
          lastCommandId: command.id
        }));
        
        // Notify parent of dirty state
        if (typeof onDirtyChange === 'function') {
          onDirtyChange(true);
        }
        
        // Trigger auto-save if enabled - ใช้ patch-based saves
        if (autoSaveSettings.enabled) {
          scheduleAutoSave(nodes, edges, command);
        }
      }
    } catch (error) {
      console.error('Error executing command:', error);
      toast.error('Failed to execute command');
    }
  }, [saveManager, onDirtyChange, autoSaveSettings.enabled, scheduleAutoSave, nodes, edges, storyMap]);

  // Undo function with Professional-grade state detection
  const undo = useCallback(() => {
    const commandToUndo = undoStack[undoStack.length - 1];
    if (commandToUndo) {
      try {
        commandToUndo.undo();
        setUndoStack(prev => prev.slice(0, prev.length - 1));
        setRedoStack(prev => [commandToUndo, ...prev]);
        toast.info(`ยกเลิก: ${commandToUndo.description}`);
        
        // Professional-grade undo state detection
        // ใช้ setTimeout เพื่อให้ React update state ก่อน แล้วค่อยตรวจสอบ
        setTimeout(() => {
          if (saveManager) {
            // รอให้ React update nodes และ edges ก่อนตรวจสอบ
            const currentData = {
              nodes: nodes,
              edges: edges,
              storyVariables: storyMap?.storyVariables || []
            };
            
            // ตรวจสอบว่าสถานะปัจจุบันตรงกับ database หรือไม่
            const hasChanges = saveManager.checkIfDataChanged(currentData);
            saveManager.updateDirtyStateOnly(hasChanges);
            
            console.log(`[BlueprintTab] After undo: hasChanges=${hasChanges}, undoStackLength=${undoStack.length - 1}`);
            
            // Schedule auto-save เฉพาะเมื่อมีการเปลี่ยนแปลงจริงและ auto-save เปิดอยู่
            if (hasChanges && autoSaveSettings.enabled) {
              saveManager.saveOperation({
                type: 'BATCH_UPDATE',
                data: currentData,
                strategy: 'debounced'
              }).catch(console.error);
            }
          } else {
            // Fallback สำหรับกรณีที่ไม่มี saveManager
            const hasMoreCommands = undoStack.length > 1;
            setSaveState(prev => ({
              ...prev,
              isDirty: hasMoreCommands,
              hasUnsavedChanges: hasMoreCommands
            }));
            onDirtyChange?.(hasMoreCommands);
            
            // Schedule auto-save if enabled
            if (autoSaveSettings.enabled) {
              scheduleAutoSave(nodes, edges);
            }
          }
        }, 50); // รอ 50ms ให้ React update state
      } catch (error) {
        console.error('Error undoing command:', error);
        toast.error(`Failed to undo: ${commandToUndo.description}`);
      }
    }
  }, [undoStack, autoSaveSettings.enabled, scheduleAutoSave, nodes, edges, onDirtyChange, saveManager, storyMap]);

  // Redo function with Professional-grade state detection
  const redo = useCallback(() => {
    const commandToRedo = redoStack[0];
    if (commandToRedo) {
      try {
        if (commandToRedo.redo) {
          commandToRedo.redo();
        } else {
          commandToRedo.execute();
        }
        setRedoStack(prev => prev.slice(1));
        setUndoStack(prev => [...prev, commandToRedo]);
        toast.success(`ทำซ้ำ: ${commandToRedo.description}`);
        
        // Professional-grade redo state detection 
        // ใช้ setTimeout เพื่อให้ React update state ก่อน แล้วค่อยตรวจสอบ
        setTimeout(() => {
          if (saveManager) {
            // รอให้ React update nodes และ edges ก่อนตรวจสอบ
            const currentData = {
              nodes: nodes,
              edges: edges,
              storyVariables: storyMap?.storyVariables || []
            };
            
            // ตรวจสอบว่าสถานะปัจจุบันตรงกับ database หรือไม่
            const hasChanges = saveManager.checkIfDataChanged(currentData);
            saveManager.updateDirtyStateOnly(hasChanges);
            
            console.log(`[BlueprintTab] After redo: hasChanges=${hasChanges}, redoStackLength=${redoStack.length - 1}`);
            
            // Schedule auto-save เฉพาะเมื่อมีการเปลี่ยนแปลงจริงและ auto-save เปิดอยู่
            if (hasChanges && autoSaveSettings.enabled) {
              saveManager.saveOperation({
                type: 'BATCH_UPDATE',
                data: currentData,
                strategy: 'debounced'
              }).catch(console.error);
            }
          } else {
            // Fallback สำหรับกรณีที่ไม่มี saveManager
            setSaveState(prev => ({
              ...prev,
              isDirty: true,
              hasUnsavedChanges: true
            }));
            onDirtyChange?.(true);
            
            // Schedule auto-save if enabled
            if (autoSaveSettings.enabled) {
              scheduleAutoSave(nodes, edges);
            }
          }
        }, 50); // รอ 50ms ให้ React update state
      } catch (error) {
        console.error('Error redoing command:', error);
        toast.error(`Failed to redo: ${commandToRedo.description}`);
      }
    }
  }, [redoStack, autoSaveSettings.enabled, scheduleAutoSave, nodes, edges, onDirtyChange, saveManager, storyMap]);

  // Command factory functions
  const createNodeCommand = useCallback((
    type: NodeCommand['type'],
    nodeId: string,
    nodeData?: Node,
    oldPosition?: { x: number; y: number },
    newPosition?: { x: number; y: number },
    oldData?: any,
    newData?: any
  ): NodeCommand => {
    const command: NodeCommand = {
      id: `${type}_${nodeId}_${Date.now()}`,
      type,
      nodeId,
      nodeData,
      oldPosition,
      newPosition,
      oldData,
      newData,
      description: `${type.replace(/_/g, ' ').toLowerCase()} node ${(nodeData as any)?.title || nodeId}`,
      timestamp: Date.now(),
      execute: () => {
        switch (type) {
          case 'ADD_NODE':
            if (nodeData) {
              setNodes(prev => [...prev, nodeData]);
            }
            break;
          case 'DELETE_NODE':
            // เก็บลง Trash History ก่อนลบ เพื่อความเป็นมิตรต่อผู้ใช้ และรองรับ undo/redo
            if (nodeData) {
              setDeletedItems(prev => [
                ...prev,
                {
                  id: nodeId,
                  type: 'node' as const,
                  data: nodeData,
                  deletedAt: new Date(),
                  description: `Node: ${nodeData?.data?.title || nodeId}`
                }
              ]);
            }
            setNodes(prev => prev.filter(n => n.id !== nodeId));
            break;
          case 'UPDATE_NODE':
            if (newData) {
              setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
            }
            break;
          case 'MOVE_NODE':
            if (newPosition) {
              setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, position: newPosition } : n));
            }
            break;
        }
      },
      undo: () => {
        switch (type) {
          case 'ADD_NODE':
            setNodes(prev => prev.filter(n => n.id !== nodeId));
            break;
          case 'DELETE_NODE':
            if (nodeData) {
              setNodes(prev => [...prev, nodeData]);
              // เมื่อ undo การลบ ให้เอาออกจาก Trash History อัตโนมัติ (รายการล่าสุดที่ตรง id/type)
              setDeletedItems(prev => {
                const idx = prev.findIndex(it => it.id === nodeId && it.type === 'node');
                if (idx >= 0) {
                  const next = prev.slice();
                  next.splice(idx, 1);
                  return next;
                }
                return prev;
              });
            }
            break;
          case 'UPDATE_NODE':
            if (oldData) {
              setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...oldData } } : n));
            }
            break;
          case 'MOVE_NODE':
            if (oldPosition) {
              setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, position: oldPosition } : n));
            }
            break;
        }
      }
    };
    
    return command;
  }, []);

  const createEdgeCommand = useCallback((
    type: EdgeCommand['type'],
    edgeId: string,
    edgeData?: Edge,
    sourceNodeId?: string,
    targetNodeId?: string,
    oldData?: any,
    newData?: any
  ): EdgeCommand => {
    const command: EdgeCommand = {
      id: `${type}_${edgeId}_${Date.now()}`,
      type,
      edgeId,
      edgeData,
      sourceNodeId,
      targetNodeId,
      oldData,
      newData,
      description: `${type.replace(/_/g, ' ').toLowerCase()} edge ${edgeId}`,
      timestamp: Date.now(),
      execute: () => {
        switch (type) {
          case 'ADD_EDGE':
            if (edgeData) {
              setEdges(prev => [...prev, edgeData]);
            }
            break;
          case 'DELETE_EDGE':
            // เก็บลง Trash History ก่อนลบ
            if (edgeData) {
              setDeletedItems(prev => [
                ...prev,
                {
                  id: edgeId,
                  type: 'edge' as const,
                  data: edgeData,
                  deletedAt: new Date(),
                  description: `Edge: ${edgeId}`
                }
              ]);
            }
            setEdges(prev => prev.filter(e => e.id !== edgeId));
            break;
          case 'UPDATE_EDGE':
            if (newData) {
              setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, ...newData } : e));
            }
            break;
        }
      },
      undo: () => {
        switch (type) {
          case 'ADD_EDGE':
            setEdges(prev => prev.filter(e => e.id !== edgeId));
            break;
          case 'DELETE_EDGE':
            if (edgeData) {
              setEdges(prev => [...prev, edgeData]);
              // เอาออกจาก Trash เมื่อกู้คืนผ่าน undo
              setDeletedItems(prev => {
                const idx = prev.findIndex(it => it.id === edgeId && it.type === 'edge');
                if (idx >= 0) {
                  const next = prev.slice();
                  next.splice(idx, 1);
                  return next;
                }
                return prev;
              });
            }
            break;
          case 'UPDATE_EDGE':
            if (oldData) {
              setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, ...oldData } : e));
            }
            break;
        }
      }
    };
    
    return command;
  }, []);

  // Manual save (always works regardless of auto-save setting)
  const handleManualSave = useCallback(async () => {
    // Clear auto-save timer since we're manually saving
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    try {
      if (saveManager) {
        // ใช้ SaveManager สำหรับ manual save
        const storyMapData = {
          nodes: nodes.map(node => ({
            nodeId: node.id,
            nodeType: node.data.nodeType,
            title: node.data.title,
            position: node.position,
            nodeSpecificData: { ...node.data }
          })),
          edges: edges.map(edge => ({
            edgeId: edge.id,
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            data: edge.data || {}
          })),
          storyVariables: storyMap?.storyVariables || []
        };
        
        await saveManager.saveManual(storyMapData);
      } else {
        // Fallback ไปยังระบบเดิม
        await saveStoryMapToDatabase(nodes, edges, true);
      }
    } catch (error) {
      console.error('Manual save failed:', error);
      toast.error('บันทึกไม่สำเร็จ');
    }
  }, [saveManager, saveStoryMapToDatabase, nodes, edges, storyMap]);

  // Enhanced canvas interaction controls
  const toggleCanvasLock = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      isLocked: !prev.isLocked
    }));
    
    if (!canvasState.isLocked) {
      toast.info('ล็อกหน้าจอ - ไม่สามารถเลื่อนและซูมได้');
    } else {
      toast.info('ปลดล็อกหน้าจอ - สามารถเลื่อนและซูมได้');
    }
  }, [canvasState.isLocked]);

  // (keyboard shortcuts listener will be attached below after function declarations)

  // Enhanced initialization with stable reference tracking
  const storyMapRef = useRef(storyMap);
  const lastProcessedVersionRef = useRef<number>(0);
  
  useEffect(() => {
    // Initialize nodes and edges from storyMap prop or create defaults
    isInitializingRef.current = true;
    
    if (storyMap && storyMap.nodes && storyMap.edges) {
      // Use existing storyMap data
      const currentVersion = storyMap.version || 0;
      if (currentVersion === lastProcessedVersionRef.current && storyMapRef.current) {
        isInitializingRef.current = false;
        return; // Skip if it's the same version
      }
      
      storyMapRef.current = storyMap;
      lastProcessedVersionRef.current = currentVersion;
      
      const flowNodes: Node[] = storyMap.nodes.map((node: IStoryMapNode) => {
        const nodeData = { ...node, hasError: false };
        
        // Enrich scene nodes with actual scene data
        if (node.nodeType === StoryMapNodeType.SCENE_NODE && node.nodeSpecificData?.sceneId) {
          const scene = scenes.find(s => s._id === node.nodeSpecificData.sceneId);
          if (scene) {
            (nodeData as any).sceneData = scene;
            (nodeData as any).episodeInfo = {
              title: scene.title || 'Untitled Scene',
              order: scene.sceneOrder || 0
            };
          }
        }
        
        // Enrich choice nodes with choice data
        if (node.nodeType === StoryMapNodeType.CHOICE_NODE && node.nodeSpecificData?.choiceIds) {
          (nodeData as any).choiceCount = node.nodeSpecificData.choiceIds.length;
        }
        
        return {
          id: node.nodeId,
          type: getReactFlowNodeType(node.nodeType),
          position: node.position,
          data: {
            ...nodeData,
            showThumbnails: currentBlueprintSettings.showSceneThumbnails, // ใช้การตั้งค่าจาก blueprintSettings
            showLabels: currentBlueprintSettings.showNodeLabels // ใช้การตั้งค่าจาก blueprintSettings
          },
          selected: false // Don't preserve selection on re-init
        };
      });

      const flowEdges: Edge[] = storyMap.edges.map((edge: IStoryMapEdge) => ({
        id: edge.edgeId,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        sourceHandle: edge.sourceHandleId,
        targetHandle: edge.targetHandleId,
        label: edge.label,
        data: {
          ...edge,
          showLabels: currentBlueprintSettings.showNodeLabels // ใช้การตั้งค่าจาก blueprintSettings สำหรับการแสดงผล choice labels
        },
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: edge.condition ? '#8b5cf6' : '#64748b'
        },
        style: {
          strokeWidth: 2,
          stroke: edge.condition ? '#8b5cf6' : '#64748b',
          strokeDasharray: edge.condition ? '5,5' : 'none'
        },
        animated: edge.editorVisuals?.animated || false,
        selected: false // Don't preserve selection on re-init
      }));

      // Use stable update to prevent jitter
      setNodes(() => flowNodes);
      setEdges(() => flowEdges);
      
      // Clear selection state on re-init
      setSelection(prev => ({
        ...prev,
        selectedNodes: [],
        selectedEdges: []
      }));
      
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 100); // Small delay to ensure React has processed the updates
      
    } else {
      // Create default empty canvas when no storyMap exists
      console.log('[BlueprintTab] No storyMap found, creating empty canvas...');
      
      const defaultNodes: Node[] = [];
      const defaultEdges: Edge[] = [];
      
      setNodes(defaultNodes);
      setEdges(defaultEdges);
      
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 100);
    }
  }, [storyMap, scenes, setNodes, setEdges]);



  // Keyboard shortcuts for undo/redo with Command Pattern
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Undo: Ctrl+Z
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      else if ((event.ctrlKey && event.shiftKey && event.key === 'Z') || 
               (event.ctrlKey && event.key === 'y')) {
        event.preventDefault();
        redo();
      }
      // Save: Ctrl+S
      else if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleManualSave]);

  // Selection helpers
  const selectAll = useCallback(() => {
    const allNodeIds = nodes.map(n => n.id);
    const allEdgeIds = edges.map(e => e.id);
    setSelection(prev => ({
      ...prev,
      selectedNodes: allNodeIds,
      selectedEdges: allEdgeIds
    }));
    toast.info(`Selected ${allNodeIds.length} nodes and ${allEdgeIds.length} edges`);
  }, [nodes, edges]);

  const deleteSelected = useCallback(() => {
    const { selectedNodes, selectedEdges } = selection;
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
    
    const nodesToDelete = nodes.filter(n => selectedNodes.includes(n.id));
    const edgesToDelete = edges.filter(e => selectedEdges.includes(e.id));
    
    if (nodesToDelete.length > 0) {
      const ok = window.confirm(`ลบโหนด ${nodesToDelete.length} รายการหรือไม่? (สามารถ Undo ได้)`);
      if (!ok) return;
    }
    
    // Create batch command for multiple deletions
    const commands: ICommand[] = [];
    
    // Add node deletion commands
    nodesToDelete.forEach(node => {
      commands.push(createNodeCommand('DELETE_NODE', node.id, node));
    });
    
    // Add edge deletion commands
    edgesToDelete.forEach(edge => {
      commands.push(createEdgeCommand('DELETE_EDGE', edge.id, edge, edge.source, edge.target));
    });
    
    // Create batch command if multiple items
    if (commands.length > 1) {
      const batchCommand: BatchCommand = {
        id: `batch-delete-${Date.now()}`,
        type: 'BATCH',
        description: `Deleted ${nodesToDelete.length} nodes and ${edgesToDelete.length} connections`,
        timestamp: Date.now(),
        commands,
        execute: () => {
          commands.forEach(cmd => cmd.execute());
        },
        undo: () => {
          // Undo in reverse order
          commands.slice().reverse().forEach(cmd => cmd.undo());
        }
      };
      executeCommand(batchCommand);
    } else if (commands.length === 1) {
      executeCommand(commands[0] as AnyCommand);
    }
    
    // Clear selection
    setSelection(prev => ({
      ...prev,
      selectedNodes: [],
      selectedEdges: []
    }));
    
    toast.success(
      `Deleted ${selectedNodes.length} nodes and ${selectedEdges.length} connections. Use Ctrl+Z to undo.`
    );
  }, [selection, nodes, edges, createNodeCommand, createEdgeCommand, executeCommand]);

  const copySelected = useCallback(() => {
    const { selectedNodes, selectedEdges } = selection;
    const nodesToCopy = nodes.filter(n => selectedNodes.includes(n.id));
    const edgesToCopy = edges.filter(e => selectedEdges.includes(e.id));
    
    // Create batch copy command for undo/redo history
    const copyCommand: ICommand = {
      id: `batch-copy-${Date.now()}`,
      type: 'BATCH_COPY',
      description: `Copied ${nodesToCopy.length} nodes and ${edgesToCopy.length} connections`,
      timestamp: Date.now(),
      execute: () => {
        setSelection(prev => ({
          ...prev,
          clipboard: { nodes: nodesToCopy, edges: edgesToCopy }
        }));
      },
      undo: () => {
        setSelection(prev => ({
          ...prev,
          clipboard: { nodes: [], edges: [] }
        }));
      }
    };
    
    executeCommand(copyCommand as AnyCommand);
    toast.success(`Copied ${nodesToCopy.length} nodes and ${edgesToCopy.length} connections`);
  }, [selection, nodes, edges, executeCommand]);

  const pasteSelected = useCallback(() => {
    const { clipboard } = selection;
    if (clipboard.nodes.length === 0 && clipboard.edges.length === 0) {
      toast.error('Clipboard is empty');
      return;
    }
    
    const offset = 50;
    const timestamp = Date.now();
    
    const newNodes = clipboard.nodes.map(node => ({
      ...node,
      id: `${node.id}-copy-${timestamp}`,
      position: { x: node.position.x + offset, y: node.position.y + offset },
      selected: true
    }));
    
    const newEdges = clipboard.edges.map(edge => ({
      ...edge,
      id: `${edge.id}-copy-${timestamp}`,
      source: `${edge.source}-copy-${timestamp}`,
      target: `${edge.target}-copy-${timestamp}`
    }));
    
    // Create batch paste command for undo/redo
    const commands: ICommand[] = [];
    
    // Add node creation commands
    newNodes.forEach(node => {
      commands.push(createNodeCommand('ADD_NODE', node.id, node));
    });
    
    // Add edge creation commands
    newEdges.forEach(edge => {
      commands.push(createEdgeCommand('ADD_EDGE', edge.id, edge, edge.source, edge.target));
    });
    
    // Create batch command if multiple items
    if (commands.length > 1) {
      const batchCommand: BatchCommand = {
        id: `batch-paste-${timestamp}`,
        type: 'BATCH',
        description: `Pasted ${newNodes.length} nodes and ${newEdges.length} connections`,
        timestamp,
        commands,
        execute: () => {
          commands.forEach(cmd => cmd.execute());
        },
        undo: () => {
          // Undo in reverse order
          commands.slice().reverse().forEach(cmd => cmd.undo());
        }
      };
      executeCommand(batchCommand);
    } else if (commands.length === 1) {
      executeCommand(commands[0] as AnyCommand);
    }
    
    toast.success(`Pasted ${newNodes.length} nodes and ${newEdges.length} connections`);
  }, [selection, createNodeCommand, createEdgeCommand, executeCommand]);

  // (removed older keyboard handler in favor of a single consolidated one below)

  // Keyboard shortcuts
  // Toggle multi-select mode
  const toggleMultiSelectMode = useCallback(() => {
    const newMode = !selection.multiSelectMode;
    setSelection(prev => ({
      ...prev,
      multiSelectMode: newMode,
      pendingSelection: newMode ? prev.selectedNodes : [],
      showSelectionBar: newMode && prev.selectedNodes.length > 0
    }));
    setIsMultiSelectActive(newMode);
    
    if (newMode) {
      toast.info('Multi-select mode activated. Click nodes to select multiple items.');
    } else {
      toast.info('Multi-select mode deactivated.');
    }
  }, [selection.multiSelectMode]);

  // Confirm multi-selection (Canva-style)
  const confirmMultiSelection = useCallback(() => {
    const pendingNodeIds = selection.pendingSelection;
    
    const command: ICommand = {
      id: `multi-select-${Date.now()}`,
      type: 'MULTI_SELECT',
      description: `เลือก ${pendingNodeIds.length} nodes`,
      timestamp: Date.now(),
      execute: () => {
        // อัปเดต selection state
        setSelection(prev => ({
          ...prev,
          selectedNodes: pendingNodeIds,
          selectedEdges: [],
          pendingSelection: [],
          showSelectionBar: false,
          multiSelectMode: false
        }));
        
        // อัปเดต node selection ใน React Flow
        setNodes(prevNodes => 
          prevNodes.map(n => ({
            ...n,
            selected: pendingNodeIds.includes(n.id)
          }))
        );
        
        // ล้าง single selection states
        setSelectedNode(null);
        setSelectedEdge(null);
        setIsMultiSelectActive(false);
      },
      undo: () => {
        setSelection(prev => ({
          ...prev,
          selectedNodes: [],
          selectedEdges: [],
          multiSelectMode: false,
          pendingSelection: [],
          showSelectionBar: false
        }));
        
        // ล้าง visual selection
        setNodes(prevNodes => 
          prevNodes.map(n => ({ ...n, selected: false }))
        );
        
        setSelectedNode(null);
        setSelectedEdge(null);
        setIsMultiSelectActive(false);
      }
    };
    
    executeCommand(command as AnyCommand);
    toast.success(`Selected ${pendingNodeIds.length} nodes`);
  }, [selection.pendingSelection, executeCommand, setNodes]);

  // Cancel multi-selection
  const cancelMultiSelection = useCallback(() => {
    setSelection(prev => ({
      ...prev,
      pendingSelection: [],
      showSelectionBar: false,
      multiSelectMode: false
    }));
    
    // ล้าง visual selection
    setNodes(prevNodes => 
      prevNodes.map(n => ({ ...n, selected: false }))
    );
    
    setIsMultiSelectActive(false);
    toast.info('Multi-selection cancelled');
  }, [setNodes]);

  // Select all nodes
  const selectAllNodes = useCallback(() => {
    if (nodes.length === 0) return;
    
    const command: ICommand = {
      id: `select-all-${Date.now()}`,
      type: 'SELECT_ALL',
      description: `เลือกทุก nodes (${nodes.length} รายการ)`,
      timestamp: Date.now(),
      execute: () => {
        setSelection(prev => ({
          ...prev,
          selectedNodes: nodes.map(n => n.id),
          selectedEdges: [],
          multiSelectMode: false,
          pendingSelection: [],
          showSelectionBar: false
        }));
        setSelectedNode(null);
        setSelectedEdge(null);
      },
      undo: () => {
        setSelection(prev => ({
          ...prev,
          selectedNodes: [],
          selectedEdges: [],
          multiSelectMode: false,
          pendingSelection: [],
          showSelectionBar: false
        }));
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    };
    
    executeCommand(command as AnyCommand);
    toast.success(`Selected all ${nodes.length} nodes`);
  }, [nodes, executeCommand]);

  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    // ป้องกันการทำงานเมื่อพิมพ์ใน input field
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || 
                        target.contentEditable === 'true' || target.getAttribute('role') === 'textbox';
    
    if (isInputField) return;

    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    if (isCtrlOrCmd) {
      switch (event.key.toLowerCase()) {
        case 's':
          event.preventDefault();
          handleManualSave();
          toast.success('Saved manually');
          return;
          
        case 'z':
          event.preventDefault();
          if (event.shiftKey) { 
            redo(); 
          } else { 
            undo(); 
          }
          return;
          
        case 'y':
          event.preventDefault();
          redo();
          return;
          
        case 'c':
          event.preventDefault();
          if (selection.selectedNodes.length > 0 || selection.selectedEdges.length > 0) {
            // Copy selected items
            const selectedNodeItems = nodes.filter(n => selection.selectedNodes.includes(n.id));
            const selectedEdgeItems = edges.filter(e => selection.selectedEdges.includes(e.id));
            
            setSelection(prev => ({
              ...prev,
              clipboard: {
                nodes: selectedNodeItems,
                edges: selectedEdgeItems
              }
            }));
            
            toast.success(`Copied ${selectedNodeItems.length} nodes and ${selectedEdgeItems.length} edges`);
          }
          return;
          
        case 'v':
          event.preventDefault();
          if (selection.clipboard.nodes.length > 0 || selection.clipboard.edges.length > 0) {
            // Paste items with offset
            const pasteOffset = { x: 50, y: 50 };
            const commands: ICommand[] = [];
            
            // Paste nodes
            selection.clipboard.nodes.forEach(node => {
              const newNode: Node = {
                ...node,
                id: `node_${Date.now()}_${Math.random()}`,
                position: {
                  x: node.position.x + pasteOffset.x,
                  y: node.position.y + pasteOffset.y
                },
                data: {
                  ...node.data,
                  showThumbnails: currentBlueprintSettings.showSceneThumbnails, // ใช้การตั้งค่าจาก blueprintSettings
                  showLabels: currentBlueprintSettings.showNodeLabels // ใช้การตั้งค่าจาก blueprintSettings
                }
              };
              commands.push(createNodeCommand('ADD_NODE', newNode.id, newNode));
            });
            
            // Paste edges
            selection.clipboard.edges.forEach(edge => {
              const newEdge: Edge = {
                ...edge,
                id: `edge_${Date.now()}_${Math.random()}`,
                data: {
                  ...edge.data,
                  showLabels: currentBlueprintSettings.showNodeLabels // ใช้การตั้งค่าจาก blueprintSettings สำหรับการแสดงผล choice labels
                }
              };
              commands.push(createEdgeCommand('ADD_EDGE', newEdge.id, newEdge, newEdge.source, newEdge.target));
            });
            
            // Execute as batch command
            if (commands.length > 0) {
              const batchCommand: BatchCommand = {
                id: `paste-${Date.now()}`,
                type: 'BATCH',
                description: `Paste ${commands.length} items`,
                timestamp: Date.now(),
                commands,
                execute: () => commands.forEach(cmd => cmd.execute()),
                undo: () => commands.slice().reverse().forEach(cmd => cmd.undo())
              };
              executeCommand(batchCommand);
              toast.success(`Pasted ${commands.length} items`);
            }
          }
          return;
          
        case 'a':
          event.preventDefault();
          selectAllNodes();
          return;
          
        case 'd':
          event.preventDefault();
          if (selection.selectedNodes.length > 0) {
            // Duplicate selected nodes
            const duplicateCommands: ICommand[] = [];
            const duplicateOffset = { x: 30, y: 30 };
            
            selection.selectedNodes.forEach(nodeId => {
              const originalNode = nodes.find(n => n.id === nodeId);
              if (originalNode) {
                const duplicatedNode: Node = {
                  ...originalNode,
                  id: `node_${Date.now()}_${Math.random()}`,
                  position: {
                    x: originalNode.position.x + duplicateOffset.x,
                    y: originalNode.position.y + duplicateOffset.y
                  },
                  data: {
                    ...originalNode.data,
                    showThumbnails: currentBlueprintSettings.showSceneThumbnails, // ใช้การตั้งค่าจาก blueprintSettings
                    showLabels: currentBlueprintSettings.showNodeLabels // ใช้การตั้งค่าจาก blueprintSettings
                  }
                };
                duplicateCommands.push(createNodeCommand('ADD_NODE', duplicatedNode.id, duplicatedNode));
              }
            });
            
            if (duplicateCommands.length > 0) {
              const batchCommand: BatchCommand = {
                id: `duplicate-${Date.now()}`,
                type: 'BATCH',
                description: `Duplicate ${duplicateCommands.length} nodes`,
                timestamp: Date.now(),
                commands: duplicateCommands,
                execute: () => duplicateCommands.forEach(cmd => cmd.execute()),
                undo: () => duplicateCommands.slice().reverse().forEach(cmd => cmd.undo())
              };
              executeCommand(batchCommand);
              toast.success(`Duplicated ${duplicateCommands.length} nodes`);
            }
          }
          return;
          
        case 'l':
          event.preventDefault();
          toggleCanvasLock();
          return;
          
        case 'm':
          event.preventDefault();
          toggleMultiSelectMode();
          return;
      }
    } else {
      switch (event.key) {
        case 'Delete':
        case 'Backspace':
            event.preventDefault();
          if (selection.selectedNodes.length > 0 || selection.selectedEdges.length > 0) {
            deleteSelected();
          }
          return;
          
        case 'Escape':
          event.preventDefault();
          // Legacy connection mode disabled - React Flow handles this automatically
          if (selection.multiSelectMode) {
            // Cancel multi-select mode
            cancelMultiSelection();
          } else {
            // Clear selection
            setSelectedNode(null);
            setSelectedEdge(null);
            setSelection(prev => ({
              ...prev,
              selectedNodes: [],
              selectedEdges: []
            }));
          }
          return;
          
        case 'Enter':
          if (selection.multiSelectMode && selection.pendingSelection.length > 0) {
            event.preventDefault();
            confirmMultiSelection();
          }
          return;
      }
    }
  }, [
    handleManualSave, toggleCanvasLock, selectedNode, selectedEdge, undo, redo, 
    selection, nodes, edges, createNodeCommand, executeCommand, deleteSelected,
    toggleMultiSelectMode, cancelMultiSelection, confirmMultiSelection,
    selectAllNodes
  ]);

  // Handle drag from sidebar to canvas
  const onCanvasDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    const nodeType = event.dataTransfer.getData('application/node-type') as StoryMapNodeType;
    if (!nodeType || !reactFlowInstance) return;
    
    // แปลงตำแหน่ง mouse เป็นตำแหน่งใน canvas
    const reactFlowBounds = (event.target as HTMLElement).getBoundingClientRect();
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });
    
    // สร้าง node ใหม่ที่ตำแหน่งที่ drop
    const timestamp = Date.now();
    const newNode: Node = {
      id: `node_${timestamp}`,
      type: getReactFlowNodeType(nodeType),
      position,
      data: {
        nodeType,
        title: getDefaultNodeTitle(nodeType),
        description: '',
        notesForAuthor: '',
        authorDefinedEmotionTags: [],
        nodeSpecificData: getDefaultNodeData(nodeType),
        color: getDefaultNodeColor(nodeType),
        zIndex: 1000,
        showThumbnails: currentBlueprintSettings.showSceneThumbnails, // ใช้การตั้งค่าจาก blueprintSettings
                          showLabels: currentBlueprintSettings.showNodeLabels // ใช้การตั้งค่าจาก blueprintSettings
      }
    };
    
    // สร้าง command และ execute
    const command = createNodeCommand('ADD_NODE', newNode.id, newNode);
    executeCommand(command);
    
    toast.success(`เพิ่ม ${getNodeDisplayName(nodeType)} ที่ตำแหน่งที่คลิก`);
  }, [reactFlowInstance, createNodeCommand, executeCommand]);
  
  const onCanvasDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);
  
  // Helper functions สำหรับ node creation
  const getDefaultNodeTitle = (nodeType: StoryMapNodeType): string => {
    const titles: Record<StoryMapNodeType, string> = {
      [StoryMapNodeType.START_NODE]: 'จุดเริ่มต้น',
      [StoryMapNodeType.SCENE_NODE]: 'ฉากใหม่',
      [StoryMapNodeType.CHOICE_NODE]: 'ตัวเลือก',
      [StoryMapNodeType.ENDING_NODE]: 'จุดจบ',
      [StoryMapNodeType.BRANCH_NODE]: 'แยกเงื่อนไข',
      [StoryMapNodeType.MERGE_NODE]: 'รวมเส้นทาง',
      [StoryMapNodeType.VARIABLE_MODIFIER_NODE]: 'ตัวแปร',
      [StoryMapNodeType.EVENT_TRIGGER_NODE]: 'เหตุการณ์',
      [StoryMapNodeType.DELAY_NODE]: 'หน่วงเวลา',
      [StoryMapNodeType.COMMENT_NODE]: 'โน้ต',
      [StoryMapNodeType.GROUP_NODE]: 'กลุ่ม',
      [StoryMapNodeType.RANDOM_BRANCH_NODE]: 'สุ่ม',
      [StoryMapNodeType.CUSTOM_LOGIC_NODE]: 'ตรรกะพิเศษ',
      [StoryMapNodeType.PARALLEL_EXECUTION_NODE]: 'ทำงานขนาน',
      [StoryMapNodeType.SUB_STORYMAP_NODE]: 'แผนผังย่อย'
    };
    return titles[nodeType] || 'โหนดใหม่';
  };
  
  const getDefaultNodeColor = (nodeType: StoryMapNodeType): string => {
    const colors: Record<StoryMapNodeType, string> = {
      [StoryMapNodeType.START_NODE]: '#10b981',
      [StoryMapNodeType.SCENE_NODE]: '#3b82f6',
      [StoryMapNodeType.CHOICE_NODE]: '#f59e0b',
      [StoryMapNodeType.ENDING_NODE]: '#ef4444',
      [StoryMapNodeType.BRANCH_NODE]: '#8b5cf6',
      [StoryMapNodeType.MERGE_NODE]: '#06b6d4',
      [StoryMapNodeType.VARIABLE_MODIFIER_NODE]: '#06b6d4',
      [StoryMapNodeType.EVENT_TRIGGER_NODE]: '#ec4899',
      [StoryMapNodeType.DELAY_NODE]: '#6b7280',
      [StoryMapNodeType.COMMENT_NODE]: '#fbbf24',
      [StoryMapNodeType.GROUP_NODE]: '#64748b',
      [StoryMapNodeType.RANDOM_BRANCH_NODE]: '#84cc16',
      [StoryMapNodeType.CUSTOM_LOGIC_NODE]: '#a855f7',
      [StoryMapNodeType.PARALLEL_EXECUTION_NODE]: '#0ea5e9',
      [StoryMapNodeType.SUB_STORYMAP_NODE]: '#64748b'
    };
    return colors[nodeType] || '#6b7280';
  };
  
  const getDefaultNodeData = (nodeType: StoryMapNodeType): any => {
    switch (nodeType) {
      case StoryMapNodeType.SCENE_NODE:
        return { sceneId: null };
      case StoryMapNodeType.CHOICE_NODE:
        return { choices: [] };
      case StoryMapNodeType.VARIABLE_MODIFIER_NODE:
        return { variableName: '', operation: 'set', value: '' };
      case StoryMapNodeType.BRANCH_NODE:
        return { condition: '', branches: [] };
      case StoryMapNodeType.EVENT_TRIGGER_NODE:
        return { eventType: '', parameters: {} };
      case StoryMapNodeType.COMMENT_NODE:
        return { note: '', color: '#fbbf24' };
      default:
        return {};
    }
  };
  
  const getNodeDisplayName = (nodeType: StoryMapNodeType): string => {
    return getDefaultNodeTitle(nodeType);
  };

  // Add new node with Command Pattern
  const onAddNode = useCallback((nodeType: StoryMapNodeType) => {
    const timestamp = Date.now();
    const randomOffset = Math.floor(Math.random() * 50);
    
    // Calculate center of current viewport if reactFlowInstance is available
    let centerPosition = { x: 100 + randomOffset, y: 100 + randomOffset };
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (bounds) {
        centerPosition = reactFlowInstance.screenToFlowPosition({
          x: bounds.width / 2,
          y: bounds.height / 2,
        });
      }
    }
    
    const newNode: Node = {
      id: `node-${timestamp}-${randomOffset}`,
      type: getReactFlowNodeType(nodeType),
      position: centerPosition,
      data: {
        nodeId: `node-${timestamp}-${randomOffset}`,
        nodeType,
        title: getDefaultNodeTitle(nodeType),
        notesForAuthor: '',
        authorDefinedEmotionTags: [],
        hasError: false,
        isCompleted: false,
        isFirstScene: nodeType === StoryMapNodeType.SCENE_NODE && 
          !nodes.some(n => n.data.nodeType === StoryMapNodeType.SCENE_NODE),
        showThumbnails: currentBlueprintSettings.showSceneThumbnails, // ใช้การตั้งค่าจาก blueprintSettings
                          showLabels: currentBlueprintSettings.showNodeLabels // ใช้การตั้งค่าจาก blueprintSettings
      }
    };

    // Create and execute command
    const command = createNodeCommand('ADD_NODE', newNode.id, newNode);
    executeCommand(command);
    
    setIsSidebarOpen(false); // Close sidebar on mobile
    toast.success(`เพิ่ม${getNodeDisplayName(nodeType)}ใหม่สำเร็จ`);
    
    // Auto-select the new node after a brief delay
    setTimeout(() => {
      setSelectedNode(newNode);
      setSelection(prev => ({
        ...prev,
        selectedNodes: [newNode.id],
        selectedEdges: []
      }));
    }, 100);
  }, [nodes, reactFlowInstance, createNodeCommand, executeCommand]);

  // Update node data
  const onNodeUpdate = useCallback((nodeId: string, newData: any) => {
    const oldNode = nodes.find(n => n.id === nodeId);
    if (!oldNode) return;
    
    const command = createNodeCommand('UPDATE_NODE', nodeId, undefined, undefined, undefined, oldNode.data, newData);
    executeCommand(command);
  }, [nodes, createNodeCommand, executeCommand]);

  // Update edge data
  const onEdgeUpdate = useCallback((edgeId: string, newData: any) => {
    setEdges(eds => eds.map(edge =>
      edge.id === edgeId ? { ...edge, data: newData } : edge
    ));
  }, [setEdges]);

  // Enhanced connections with database sync and validation
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) {
      toast.error('ไม่สามารถสร้างการเชื่อมต่อได้: ข้อมูลไม่ครบถ้วน');
      return;
    }
    
    // Prevent self-connections
    if (params.source === params.target) {
      toast.error('ไม่สามารถเชื่อมต่อโหนดกับตัวมันเองได้');
      return;
    }
    
    // Check for duplicate connections
    const existingConnection = edges.find(edge => 
      edge.source === params.source && 
      edge.target === params.target &&
      edge.sourceHandle === params.sourceHandle &&
      edge.targetHandle === params.targetHandle
    );
    
    if (existingConnection) {
      toast.warning('การเชื่อมต่อนี้มีอยู่แล้ว');
      return;
    }

    // ค้นหาข้อมูล source และ target nodes
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    
    if (!sourceNode || !targetNode) {
      toast.error('ไม่พบโหนดต้นทางหรือปลายทาง');
      return;
    }

    // Validate connection logic
    const sourceType = sourceNode.data.nodeType;
    const targetType = targetNode.data.nodeType;
    
    // EndingNode should not have outputs
    if (sourceType === StoryMapNodeType.ENDING_NODE) {
      toast.error('โหนดจุดจบไม่สามารถเชื่อมต่อไปยังโหนดอื่นได้');
      return;
    }
    
    // สร้าง label อัตโนมัติตามประเภทของ nodes
    let autoLabel = '';
    if (sourceNode && targetNode) {
      if (sourceNode.data.nodeType === StoryMapNodeType.SCENE_NODE && 
          targetNode.data.nodeType === StoryMapNodeType.SCENE_NODE) {
        autoLabel = 'ไปยังฉากถัดไป';
      } else if (sourceNode.data.nodeType === StoryMapNodeType.CHOICE_NODE) {
        autoLabel = 'ตัวเลือก';
      } else if (sourceNode.data.nodeType === StoryMapNodeType.BRANCH_NODE) {
        autoLabel = 'เงื่อนไข';
      }
    }
    
    const edgeId = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEdge = {
      ...params,
      id: edgeId,
      type: 'smoothstep',
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      data: {
        edgeId: edgeId,
        sourceNodeId: params.source,
        targetNodeId: params.target,
        sourceHandleId: params.sourceHandle,
        targetHandleId: params.targetHandle,
        label: autoLabel,
        priority: 1,
            showLabels: currentBlueprintSettings.showNodeLabels, // ใช้การตั้งค่าจาก blueprintSettings สำหรับการแสดงผล choice labels
        // เพิ่มข้อมูลสำหรับการอัปเดต Scene
        sceneConnection: sourceNode?.data.nodeType === StoryMapNodeType.SCENE_NODE && 
                        targetNode?.data.nodeType === StoryMapNodeType.SCENE_NODE,
        sourceSceneId: (sourceNode?.data.sceneData as any)?._id || null,
        targetSceneId: (targetNode?.data.sceneData as any)?._id || null,
        editorVisuals: {
          color: '#64748b',
          lineStyle: 'solid',
          animated: false
        }
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#64748b'
      },
      style: {
        strokeWidth: 2,
        stroke: '#64748b'
      },
      animated: false
    };
    
    // Create and execute command
    const command = createEdgeCommand('ADD_EDGE', edgeId, newEdge, params.source, params.target);
    executeCommand(command);
    
    // อัปเดตข้อมูลการเชื่อมต่อใน Scene model หากเป็นการเชื่อมต่อระหว่างฉาก
    if (newEdge.data.sceneConnection && newEdge.data.sourceSceneId && newEdge.data.targetSceneId) {
      try {
        // อัปเดต defaultNextSceneId ใน source scene
        // ซึ่งจะทำให้การอ่านนิยายสามารถไปยังฉากถัดไปได้อัตโนมัติ
        updateSceneDefaultNext(newEdge.data.sourceSceneId, newEdge.data.targetSceneId);
      } catch (error) {
        console.error('Error updating scene connection:', error);
      }
    }
    
    // แสดงข้อความแจ้งเตือนที่เหมาะสม
    if (newEdge.data.sceneConnection) {
      toast.success('เชื่อมต่อฉากสำเร็จ - สามารถไปยังฉากถัดไปได้');
    } else {
      const sourceHandleText = params.sourceHandle ? ` (${params.sourceHandle})` : '';
      const targetHandleText = params.targetHandle ? ` (${params.targetHandle})` : '';
      toast.success(`เชื่อมต่อ "${sourceNode.data.title}"${sourceHandleText} → "${targetNode.data.title}"${targetHandleText} สำเร็จ`);
    }
    
    // Log for debugging
    console.log('✅ Edge created successfully:', {
      id: edgeId,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      sourceNode: sourceNode.data.title,
      targetNode: targetNode.data.title
    });
  }, [edges, nodes, createEdgeCommand, executeCommand]);



  // Enhanced Selection handler with multi-selection support
  const onSelectionChange = useCallback<OnSelectionChangeFunc>(({ nodes: selectedNodes, edges: selectedEdges }) => {
    // Don't interfere with multi-select mode
    if (selection.multiSelectMode) return;
    
    const selectedNodeIds = selectedNodes.map(n => n.id);
    const selectedEdgeIds = selectedEdges.map(e => e.id);
    
    // Update selection state
    setSelection(prev => ({
      ...prev,
      selectedNodes: selectedNodeIds,
      selectedEdges: selectedEdgeIds
    }));
    
    // Set single selection states only if single selection
    if (selectedNodes.length === 1 && selectedEdges.length === 0) {
      setSelectedNode(selectedNodes[0]);
      setSelectedEdge(null);
    } else if (selectedNodes.length === 0 && selectedEdges.length === 1) {
      setSelectedNode(null);
      setSelectedEdge(selectedEdges[0]);
    } else if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      // No selection
      setSelectedNode(null);
      setSelectedEdge(null);
    } else {
      // Multiple selection - clear single selection states
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }, [selection.multiSelectMode]);

  // Keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      if (saveDebounceTimer.current) {
        clearTimeout(saveDebounceTimer.current);
      }
    };
  }, [handleKeyboardShortcuts]);

  // Helper function to map StoryMapNodeType to React Flow node type
  const getReactFlowNodeType = (storyMapNodeType: string): string => {
    switch (storyMapNodeType) {
      case 'scene_node':
        return 'scene_node';
      case 'choice_node':
        return 'choice_node';
      case 'branch_node':
        return 'branch_node';
      case 'comment_node':
        return 'comment_node';
      case 'ending_node':
        return 'ending_node';
      case 'start_node':
        return 'scene_node'; // Start nodes are essentially scene nodes
      case 'merge_node':
        return 'branch_node'; // Merge nodes can use branch node UI
      case 'variable_modifier_node':
      case 'event_trigger_node':
      case 'custom_logic_node':
      case 'delay_node':
      case 'random_branch_node':
      case 'parallel_execution_node':
      case 'sub_storymap_node':
      case 'group_node':
      default:
        return 'custom'; // Use custom component for unsupported types
    }
  };

  // Custom node and edge types - สร้าง wrapper เพื่อส่ง nodeOrientation พร้อม real-time updates
  const nodeTypes: NodeTypes = useMemo(() => ({
    scene_node: (props: any) => <SceneNode {...props} nodeOrientation={currentBlueprintSettings.nodeOrientation} />,
    choice_node: (props: any) => <ChoiceNode {...props} nodeOrientation={currentBlueprintSettings.nodeOrientation} />,
    branch_node: (props: any) => <BranchNode {...props} nodeOrientation={currentBlueprintSettings.nodeOrientation} />,
    comment_node: (props: any) => <CommentNode {...props} nodeOrientation={currentBlueprintSettings.nodeOrientation} />,
    ending_node: (props: any) => <EndingNode {...props} nodeOrientation={currentBlueprintSettings.nodeOrientation} />,
    // Keep custom as fallback
    custom: CustomNode
  }), [currentBlueprintSettings.nodeOrientation]);
  
  // Track previous orientation to show toast only on actual changes
  const [previousOrientation, setPreviousOrientation] = useState<'horizontal' | 'vertical'>(currentBlueprintSettings.nodeOrientation);
  
  // Force re-render all nodes when orientation changes to update handle positions immediately
  useEffect(() => {
    setNodes(prevNodes => 
      prevNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          nodeOrientation: currentBlueprintSettings.nodeOrientation, // Force re-render
          _orientationTimestamp: Date.now() // Unique key to trigger re-render
        }
      }))
    );
    
    // Show a brief visual feedback for orientation change (only on actual changes)
    if (typeof window !== 'undefined' && previousOrientation !== currentBlueprintSettings.nodeOrientation) {
      const orientationLabel = currentBlueprintSettings.nodeOrientation === 'vertical' ? 'แนวตั้ง' : 'แนวนอน';
      toast.success(`เปลี่ยนการวางแนว node เป็น${orientationLabel}`, {
        duration: 1500,
        icon: currentBlueprintSettings.nodeOrientation === 'vertical' ? '⬆️⬇️' : '⬅️➡️'
      });
      setPreviousOrientation(currentBlueprintSettings.nodeOrientation);
    }
  }, [currentBlueprintSettings.nodeOrientation, setNodes, previousOrientation]);
  
  const edgeTypes: EdgeTypes = useMemo(() => ({
    custom: CustomEdge,
    smoothstep: CustomEdge,
    straight: CustomEdge,
    bezier: CustomEdge
  }), []);

  // Handle manual connection mode (deprecated - using React Flow handles)
  useEffect(() => {
    // Legacy connection handlers - disabled in favor of React Flow handles
    const handleStartConnection = (event: CustomEvent) => {
      // Disabled - using React Flow handles for better UX
      console.log('Legacy connection handler called - should use React Flow handles instead');
    };
    
    const handleNodeClick = (nodeId: string) => {
      // Disabled - React Flow handles this automatically
    };
    
    // รองรับการลบ edge ผ่านปุ่มบน EdgeLabelRenderer ให้สอดคล้อง Command Pattern + Trash
    const handleRequestDeleteEdge = (e: Event) => {
      const custom = e as CustomEvent<{ edgeId: string }>;
      const edgeId = custom.detail?.edgeId;
      if (!edgeId) return;
      const edge = edges.find(ed => ed.id === edgeId);
      if (!edge) return;
      
      // ถ้าเป็นการเชื่อมต่อระหว่าง Scene nodes ให้ลบ defaultNextSceneId
      if (edge.data?.sceneConnection && edge.data?.sourceSceneId) {
        removeSceneConnection(edge.data.sourceSceneId as string);
      }
      
      const cmd = createEdgeCommand('DELETE_EDGE', edgeId, edge, edge.source, edge.target);
      executeCommand(cmd);
    };

    window.addEventListener('requestDeleteEdge', handleRequestDeleteEdge as EventListener);
    // Add event listeners
    document.addEventListener('startConnection', handleStartConnection as EventListener);
    
    return () => {
      document.removeEventListener('startConnection', handleStartConnection as EventListener);
      window.removeEventListener('requestDeleteEdge', handleRequestDeleteEdge as EventListener);
    };
  }, [onConnect, edges, createEdgeCommand, executeCommand, removeSceneConnection]);
  
  // Handle canvas click (legacy connection mode disabled)
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    // Legacy connection mode disabled - React Flow handles connections automatically
    // No special handling needed for connections
  }, []);

  // ===============================
  // PROFESSIONAL API EXPOSURE
  // ===============================
  
  // Expose methods to parent via ref พร้อม Professional-grade data access
  React.useImperativeHandle(ref, () => ({
    handleManualSave,
    // Professional data access method สำหรับการตรวจสอบการเปลี่ยนแปลง
    getCurrentData: () => {
      return {
        nodes: nodes.map(node => ({
          id: node.id,
          position: { 
            x: Math.round(node.position.x), 
            y: Math.round(node.position.y) 
          },
          data: node.data,
          type: node.type
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          data: edge.data
        })),
        storyVariables: storyMap?.storyVariables || []
      };
    },
    // Enterprise-grade state monitoring
    getCanvasState: () => ({
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasUndoHistory: undoStack.length > 0,
      hasRedoHistory: redoStack.length > 0,
      isInitialized: !isInitializingRef.current
    })
  }), [handleManualSave, nodes, edges, storyMap, undoStack, redoStack]);

  return (
      <div className="h-full flex flex-col md:flex-row bg-background text-foreground blueprint-canvas relative">
        {/* Enhanced Desktop/Tablet Sidebar - Scrollable */}
        <AnimatePresence mode="wait">
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="hidden md:block border-r bg-card/50 blueprint-sidebar"
            >
              <div className="flex flex-col h-full">
                {/* Fixed Header */}
                <div className="p-4 border-b bg-card/80 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    แผนผังเรื่อง
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSidebarCollapsed(true)}
                      title="ย่อแถบด้านข้าง"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
                {/* Scrollable Content */}
              <div className="flex-1 overflow-hidden">
                  <Tabs defaultValue="palette" className="flex flex-col h-full">
                    <div className="px-4 pt-4">
                      <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="palette">โหนด</TabsTrigger>
                    <TabsTrigger value="validation">ตรวจสอบ</TabsTrigger>
                  </TabsList>
                    </div>
                    
                    <TabsContent value="palette" className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full px-4 pb-4 custom-scrollbar">
                        <div className="space-y-4 pt-4">
                        <NodePalette 
                          onAddNode={onAddNode}
                          onDragStart={(nodeType, event) => {
                            // Optional: เพิ่ม visual feedback หรือ logging
                            console.log(`กำลังลาก ${nodeType} ไปยัง canvas`);
                          }}
                          isCollapsed={isNodePaletteCollapsed}
                          onToggleCollapse={() => setIsNodePaletteCollapsed(!isNodePaletteCollapsed)}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                    
                    <TabsContent value="validation" className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full px-4 pb-4 custom-scrollbar">
                        <div className="space-y-4 pt-4">
                        <ValidationPanel 
                          nodes={nodes} 
                          edges={edges} 
                          storyVariables={storyMap?.storyVariables || []} 
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Sidebar Trigger */}
        {isSidebarCollapsed && (
          <div className="hidden md:flex flex-col items-center justify-start pt-4 w-12 border-r bg-card/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarCollapsed(false)}
              className="mb-2"
              title="ขยายแถบด้านข้าง"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <div className="h-full w-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onDrop={onCanvasDrop}
                onDragOver={onCanvasDragOver}
                onNodesChange={(changes: NodeChange[]) => {
                  // Prevent runtime error by safely handling changes
                  try {
                    onNodesChange(changes);
                    // Only save to history for meaningful changes (position, selection, etc.)
                    const meaningfulChanges = changes.filter(change => 
                      change.type === 'position' || 
                      change.type === 'add' || 
                      change.type === 'remove'
                    );
                    if (!isInitializingRef.current && meaningfulChanges.length > 0) {
                      // Use a debounced version for position changes to avoid excessive history entries
                      if (meaningfulChanges.every(change => change.type === 'position')) {
                        // Debounce position changes
                        if (saveDebounceTimer.current) {
                          clearTimeout(saveDebounceTimer.current);
                        }
                        saveDebounceTimer.current = setTimeout(() => {
                          // Auto-save scheduled changes
                          scheduleAutoSave(nodes, edges);
                        }, 500);
                      } else {
                        // Immediate auto-save for add/remove operations
                        scheduleAutoSave(nodes, edges);
                      }
                    }
                  } catch (error) {
                    console.error('Error handling node changes:', error);
                  }
                }}
                onNodeDragStart={(event, node) => {
                  isDragging.current = true;
                  
                  // ถ้าเป็น multiple selection และ node ที่กำลังลากอยู่ในกลุ่มที่เลือก
                  if (selection.selectedNodes.includes(node.id) && selection.selectedNodes.length > 1) {
                    // เก็บตำแหน่งเริ่มต้นของทุก node ที่เลือก
                    selection.selectedNodes.forEach(nodeId => {
                      const selectedNode = nodes.find(n => n.id === nodeId);
                      if (selectedNode) {
                        multiSelectDragStart.current[nodeId] = { ...selectedNode.position };
                      }
                    });
                  } else {
                    // Single node drag - เก็บตำแหน่งเริ่มต้นของ node เดียว
                    dragStartPositions.current[node.id] = { ...node.position };
                  }
                }}
                onNodeDragStop={(event, node) => {
                  isDragging.current = false;
                  
                  if (!isInitializingRef.current) {
                    // ตรวจสอบว่าเป็น multiple selection หรือไม่
                    if (selection.selectedNodes.includes(node.id) && selection.selectedNodes.length > 1) {
                      // สร้าง batch command สำหรับ multiple nodes
                      const commands: ICommand[] = [];
                      let hasAnyMovement = false;
                      
                      selection.selectedNodes.forEach(nodeId => {
                        const startPosition = multiSelectDragStart.current[nodeId];
                        const currentNode = nodes.find(n => n.id === nodeId);
                        
                        if (startPosition && currentNode) {
                          const hasPositionChanged = 
                            Math.abs(startPosition.x - currentNode.position.x) > 1 || 
                            Math.abs(startPosition.y - currentNode.position.y) > 1;
                          
                          if (hasPositionChanged) {
                            hasAnyMovement = true;
                            commands.push(createNodeCommand(
                              'MOVE_NODE',
                              nodeId,
                              undefined,
                              startPosition,
                              currentNode.position
                            ));
                          }
                        }
                      });
                      
                      // สร้าง batch command ถ้ามีการเคลื่อนที่จริง
                      if (hasAnyMovement && commands.length > 0) {
                        const batchCommand: BatchCommand = {
                          id: `batch-move-${Date.now()}`,
                          type: 'BATCH',
                          description: `ย้าย ${commands.length} nodes`,
                          timestamp: Date.now(),
                          commands,
                          execute: () => {
                            commands.forEach(cmd => cmd.execute());
                          },
                          undo: () => {
                            commands.slice().reverse().forEach(cmd => cmd.undo());
                          }
                        };
                        executeCommand(batchCommand);
                      }
                      
                      // เคลียร์ข้อมูล
                      multiSelectDragStart.current = {};
                    } else {
                      // Single node drag
                      const startPosition = dragStartPositions.current[node.id];
                      if (startPosition) {
                        const hasPositionChanged = 
                          Math.abs(startPosition.x - node.position.x) > 1 || 
                          Math.abs(startPosition.y - node.position.y) > 1;
                        
                        if (hasPositionChanged) {
                          const moveCommand = createNodeCommand(
                            'MOVE_NODE',
                            node.id,
                            undefined,
                            startPosition,
                            node.position
                          );
                          executeCommand(moveCommand);
                        }
                      }
                      // เคลียร์ข้อมูล
                      delete dragStartPositions.current[node.id];
                    }
                  }
                }}
                onEdgesChange={(changes: EdgeChange[]) => {
                  // Prevent runtime error by safely handling changes
                  try {
                    onEdgesChange(changes);
                    const meaningfulChanges = changes.filter(change => 
                      change.type === 'add' || 
                      change.type === 'remove'
                    );
                    if (!isInitializingRef.current && meaningfulChanges.length > 0) {
                      scheduleAutoSave(nodes, edges);
                    }
                  } catch (error) {
                    console.error('Error handling edge changes:', error);
                  }
                }}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                onPaneClick={handleCanvasClick}
                connectionMode={ConnectionMode.Loose}
                connectionLineComponent={CustomConnectionLine}
                connectionLineType={ConnectionLineType.SmoothStep}
                connectionLineStyle={{
                  stroke: '#3b82f6',
                  strokeWidth: 3,
                  strokeDasharray: '5,5',
                }}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20,
                    color: '#64748b'
                  },
                  style: {
                    strokeWidth: 2,
                    stroke: '#64748b'
                  },
                  animated: false
                }}
                onNodeClick={(event, node) => {
                  // Legacy connection mode disabled - using React Flow handles instead
                  // Connection handling is now done via React Flow handles automatically
                  
                  // Handle multi-select mode (Canva-style)
                  if (selection.multiSelectMode) {
                    const isAlreadySelected = selection.pendingSelection.includes(node.id);
                    
                    const newPendingSelection = isAlreadySelected
                      ? selection.pendingSelection.filter(id => id !== node.id)
                      : [...selection.pendingSelection, node.id];
                    
                    setSelection(prev => ({
                      ...prev,
                      pendingSelection: newPendingSelection,
                      showSelectionBar: newPendingSelection.length > 0
                    }));
                    
                    // อัปเดต visual selection สำหรับ nodes ที่อยู่ใน pending selection
                    setNodes(prevNodes => 
                      prevNodes.map(n => ({
                        ...n,
                        selected: newPendingSelection.includes(n.id)
                      }))
                    );
                    
                    // Visual feedback
                    if (isAlreadySelected) {
                      toast.info(`Removed ${node.data?.title || node.id} from selection`);
                  } else {
                      toast.info(`Added ${node.data?.title || node.id} to selection (${newPendingSelection.length})`);
                    }
                    
                    return;
                  }
                  
                  // Handle Ctrl+Click for quick multi-select (without entering multi-select mode)
                  if (event.ctrlKey || event.metaKey) {
                    const isAlreadySelected = selection.selectedNodes.includes(node.id);
                    
                    if (isAlreadySelected) {
                      // Remove from selection
                      const newSelection = selection.selectedNodes.filter(id => id !== node.id);
                      setSelection(prev => ({
                        ...prev,
                        selectedNodes: newSelection,
                        selectedEdges: []
                      }));
                      
                      if (newSelection.length === 0) {
                        setSelectedNode(null);
                      } else {
                        const firstSelected = nodes.find(n => n.id === newSelection[0]);
                        setSelectedNode(firstSelected || null);
                      }
                      setSelectedEdge(null);
                    } else {
                      // Add to selection
                      setSelection(prev => ({
                        ...prev,
                        selectedNodes: [...prev.selectedNodes, node.id],
                        selectedEdges: []
                      }));
                    setSelectedNode(node);
                    setSelectedEdge(null);
                  }
                    
                    return;
                  }
                  
                  // Regular single selection
                  setSelectedNode(node);
                  setSelectedEdge(null);
                  setSelection(prev => ({
                    ...prev,
                    selectedNodes: [node.id],
                    selectedEdges: []
                  }));
                }}
                onInit={setReactFlowInstance}
                fitView
                attributionPosition="bottom-left"
                className="bg-background"
                selectionMode={selection.multiSelectMode ? SelectionMode.Full : SelectionMode.Partial}
                multiSelectionKeyCode={selection.multiSelectMode ? null : ["Meta", "Control", "Shift"]}
                // ปิดการลบผ่านระบบของ React Flow เพื่อให้ Command Pattern จัดการเอง (พร้อม Trash History)
                deleteKeyCode={[]}
                panOnDrag={!canvasState.isLocked && !selection.isSelectionMode}
                zoomOnScroll={!canvasState.isLocked}
                zoomOnPinch={!canvasState.isLocked}
                preventScrolling={canvasState.isLocked}
                snapToGrid={canvasState.snapToGrid}
                snapGrid={[canvasState.gridSize, canvasState.gridSize]}
                onSelectionStart={() => {
                  setSelection(prev => ({ ...prev, isSelectionMode: true }));
                }}
                onSelectionEnd={() => {
                  setSelection(prev => ({ ...prev, isSelectionMode: false }));
                }}
              >
                <Background 
                  variant={currentBlueprintSettings.showGrid ? BackgroundVariant.Dots : BackgroundVariant.Cross} 
                  gap={canvasState.gridSize}
                  size={currentBlueprintSettings.showGrid ? 1 : 2}
                  className="opacity-30"
                />
                
                {/* Enhanced Zoom Controls */}
                <Panel position="bottom-right" className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
                  <div className="flex flex-col gap-2">
                    {/* Trash History Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsTrashHistoryOpen(true)}
                      className="w-10 h-10 p-0 relative"
                      title={`Trash History (${deletedItems.length} items)`}
                    >
                      <Archive className="w-4 h-4" />
                      {deletedItems.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          {deletedItems.length > 9 ? '9+' : deletedItems.length}
                        </span>
                      )}
                    </Button>

                    <Separator />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reactFlowInstance?.zoomIn()}
                      className="w-10 h-10 p-0"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reactFlowInstance?.zoomOut()}
                      className="w-10 h-10 p-0"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reactFlowInstance?.fitView()}
                      className="w-10 h-10 p-0"
                      title="Fit View"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>

                    <Separator />

                    <Button
                      variant={canvasState.isLocked ? "default" : "outline"}
                      size="sm"
                      onClick={toggleCanvasLock}
                      className="w-10 h-10 p-0"
                      title={canvasState.isLocked ? 'Unlock Canvas (Ctrl+L)' : 'Lock Canvas (Ctrl+L)'}
                    >
                      {canvasState.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </Button>
                  </div>
                </Panel>

                <MiniMap
                  position="bottom-left"
                  className="bg-background border border-border rounded-lg"
                  nodeColor={(node) => {
                    const nodeType = node.data?.nodeType;
                    switch (nodeType) {
                      case StoryMapNodeType.START_NODE: return '#10b981';
                      case StoryMapNodeType.SCENE_NODE: return '#3b82f6';
                      case StoryMapNodeType.CHOICE_NODE: return '#f59e0b';
                      case StoryMapNodeType.ENDING_NODE: return '#ef4444';
                      case StoryMapNodeType.BRANCH_NODE: return '#8b5cf6';
                      case StoryMapNodeType.VARIABLE_MODIFIER_NODE: return '#06b6d4';
                      case StoryMapNodeType.EVENT_TRIGGER_NODE: return '#eab308';
                      default: return '#6b7280';
                    }
                  }}
                />
              
                {/* Enhanced Floating Toolbar */}
                <Panel
                  position="top-left"
                  className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg"
                  style={{ top: isMobile ? 56 : undefined, left: isMobile ? 0 : undefined }}
                >
                  <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center gap-2'}`}>
                    {/* Episode Selector - Desktop & Tablet (non-mobile) */}
                    <div className="hidden md:block">
                      <Select value={selectedEpisode} onValueChange={setSelectedEpisode}>
                        <SelectTrigger className="w-48 h-8 text-xs bg-background/50">
                          <SelectValue placeholder="Select Episode" />
                        </SelectTrigger>
                        <SelectContent>
                          {episodes.map((episode) => (
                            <SelectItem key={episode._id} value={episode._id} className="text-xs">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-3 h-3" />
                                <span>Ep {episode.episodeOrder}: {episode.title}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Enhanced Mobile Controls - Mobile Only */}
                    <div className={`${isMobile ? 'flex flex-col gap-2' : 'hidden'}`}>
                      {/* Story Blueprint Toggle */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSidebarOpen(true)}
                        className="h-8 w-8 p-0 bg-background/80 hover:bg-background/90 border-2"
                        title="Story Blueprint"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      
                      {/* Multi Select Toggle */}
                      <Button
                        variant={isMultiSelectActive ? "default" : "outline"}
                        size="sm"
                        onClick={toggleMultiSelectMode}
                        className="h-8 w-8 p-0 bg-background/80 hover:bg-background/90 border-2"
                        title="Multi Select Mode"
                      >
                        <MousePointer2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Separator orientation={isMobile ? "horizontal" : "vertical"} className={isMobile ? "w-full" : "h-6"} />

                    {/* Undo/Redo */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={undo}
                      disabled={undoStack.length === 0}
                      className="h-8 w-8 p-0"
                      title={`Undo (Ctrl+Z)${undoStack.length > 0 ? ` - ${undoStack[undoStack.length - 1].description}` : ''}`}
                    >
                      <Undo2 className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={redo}
                      disabled={redoStack.length === 0}
                      className="h-8 w-8 p-0"
                      title={`Redo (Ctrl+Shift+Z)${redoStack.length > 0 ? ` - ${redoStack[redoStack.length - 1].description}` : ''}`}
                    >
                      <Redo2 className="w-4 h-4" />
                    </Button>

                    <Separator orientation={isMobile ? "horizontal" : "vertical"} className={isMobile ? "w-full" : "h-6"} />

                    {!isMobile && (
                      <Button
                        variant={isMultiSelectActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={toggleMultiSelectMode}
                        className="h-8 px-2"
                        title="Multiple select mode (Ctrl+M or click to toggle)"
                      >
                        <div className="flex items-center gap-1">
                          <MousePointer2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Multi</span>
                        </div>
                      </Button>
                    )}
                  </div>
                </Panel>

                {/* Episode Selector - Mobile Only */}
                <Panel position="top-left" className="md:hidden bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg" style={{ top: 8, left: 0 }}>
                  <Select value={selectedEpisode} onValueChange={setSelectedEpisode}>
                    <SelectTrigger className="w-32 h-8 text-xs bg-background/50">
                      <SelectValue placeholder="Select Episode" />
                    </SelectTrigger>
                    <SelectContent>
                      {episodes.map((episode) => (
                        <SelectItem key={episode._id} value={episode._id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3 h-3" />
                            <span>Ep {episode.episodeOrder}: {episode.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Panel>



              {/* ลบ Selection Confirmation Bar แถบที่ซ้ำออก - ใช้แถบด้านล่างแทน */}

              {/* Selection Info Panel - Mobile: below episode selector, Desktop: below toolbar */}
              {(selectedNode || selectedEdge || selection.selectedNodes.length > 1) && (
                <Panel 
                  position={isMobile ? "top-left" : "top-left"} 
                  className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg max-w-80"
                  style={isMobile ? { top: 60, left: 56 } : { top: 60, left: 0 }}
                >
                  {/* Multiple Selection Info Panel - แสดงก่อน single selection */}
                  {selection.selectedNodes.length > 1 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          Multiple Selection
                        </Badge>
                        <span className="font-medium text-sm">
                          {selection.selectedNodes.length} nodes selected
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground max-h-16 overflow-y-auto">
                        Selected: {selection.selectedNodes.map(id => {
                          const node = nodes.find(n => n.id === id);
                          return node?.data?.title || 'Untitled';
                        }).join(', ')}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copySelected()}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy All
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteSelected()}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete All
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelection(prev => ({ ...prev, selectedNodes: [], selectedEdges: [] }))}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                    </div>
                  ) : selectedNode ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {(selectedNode.data as any).nodeType.replace(/_/g, ' ')}
                        </Badge>
                        <span className="font-medium text-sm truncate">{(selectedNode.data as any).title}</span>
                      </div>
                      {(selectedNode.data as any).notesForAuthor && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {(selectedNode.data as any).notesForAuthor}
                        </p>
                      )}
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Navigate to Director tab with context - เป็นการไปหน้าแต่งละเอียด
                            if ((selectedNode?.data as any)?.nodeSpecificData?.sceneId && typeof onNavigateToDirector === 'function') {
                              onNavigateToDirector((selectedNode.data as any).nodeSpecificData.sceneId);
                              toast.success(`กำลังไปยังหน้าผู้กำกับสำหรับฉาก "${selectedNode.data.title}"`);
                            } else if (typeof onNavigateToDirector === 'function') {
                              // Navigate to Director tab ทั่วไป สำหรับการแต่ง Scene
                              onNavigateToDirector();
                              toast.info('กำลังไปยังหน้าผู้กำกับ');
                            } else {
                              setIsPropertiesOpen(true);
                            }
                          }}
                          title="ไปยังหน้าผู้กำกับเพื่อแต่งฉากแบบละเอียด"
                        >
                          <Film className="w-3 h-3 mr-1" />
                          แต่งฉาก
                        </Button>
                        {isMobile && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setIsPropertiesOpen(true)}
                          >
                            <Settings className="w-3 h-3 mr-1" />
                            Properties
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteSelected()}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : selectedEdge ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        <span className="font-medium text-sm">
                          Connection: {selectedEdge.label || 'Unlabeled'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Always navigate to Director Tab for edge/transition editing
                            if (typeof onNavigateToDirector === 'function') {
                              // Try to get scene information from connected nodes
                              const sourceNode = nodes.find(n => n.id === selectedEdge.source);
                              const targetNode = nodes.find(n => n.id === selectedEdge.target);
                              
                              // If source node has scene data, pass its scene ID
                              const sceneId = (sourceNode?.data as any)?.sceneData?._id || 
                                            (targetNode?.data as any)?.sceneData?._id;
                              
                              onNavigateToDirector(sceneId);
                              toast.success('กำลังไปยังหน้าผู้กำกับเพื่อแต่งการเชื่อมต่อ');
                            }
                          }}
                          title="ไปยังหน้าผู้กำกับเพื่อแต่งการเชื่อมต่อและทรานสิชั่น"
                        >
                          <Scissors className="w-3 h-3 mr-1" />
                          แต่งการเชื่อมต่อ
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // ลบ edge ผ่าน Command Pattern เพื่อให้เก็บ Trash และรองรับ undo/redo
                            const edge = edges.find(e => e.id === selectedEdge.id);
                            if (edge) {
                              const cmd = createEdgeCommand('DELETE_EDGE', edge.id, edge, edge.source, edge.target);
                              executeCommand(cmd);
                              setSelectedEdge(null);
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </Panel>
              )}

              {/* Multiple Selection Bottom Notification (Mobile-friendly) - positioned below toolbar */}
              {selection.multiSelectMode && selection.selectedNodes.length > 0 && (
                <Panel position="bottom-center" className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 shadow-lg mb-20 lg:mb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {selection.selectedNodes.length} node{selection.selectedNodes.length > 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelection(prev => ({ ...prev, selectedNodes: [], selectedEdges: [], multiSelectMode: false }))}
                        className="h-8"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          // Confirm selection and close multi-select mode
                          setSelection(prev => ({ ...prev, multiSelectMode: false }));
                          toast.success(`Confirmed selection of ${selection.selectedNodes.length} nodes`);
                        }}
                        className="h-8"
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                </Panel>
              )}
            </ReactFlow>
          </div>
        </ReactFlowProvider>
          
          {/* Enhanced Selection Confirmation Bar - ปรับปรุงให้สวยงามและใช้งานง่าย */}
          <AnimatePresence>
            {selection.showSelectionBar && selection.pendingSelection.length > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[60]"
              >
                <div className="bg-card/95 backdrop-blur-md border-2 border-primary/20 rounded-xl px-6 py-4 shadow-2xl shadow-primary/5 flex items-center gap-4 min-w-[300px]">
                  {/* Selection Count with Icon */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {selection.pendingSelection.length} รายการที่เลือก
                      </span>
                      <p className="text-xs text-muted-foreground">
                        กดยืนยันเพื่อดำเนินการต่อ
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Cancel selection และปิด multi-select mode
                        setSelection(prev => ({ 
                          ...prev, 
                          pendingSelection: [], 
                          showSelectionBar: false,
                          multiSelectMode: false
                        }));
                        setIsMultiSelectActive(false);
                        
                        // ล้าง visual selection
                        setNodes(prevNodes => 
                          prevNodes.map(n => ({ ...n, selected: false }))
                        );
                        
                        toast.info('ยกเลิกการเลือกหลายรายการ');
                      }}
                      className="text-xs px-3"
                    >
                      <X className="w-3 h-3 mr-1" />
                      ยกเลิก
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        // Confirm selection และปิด multi-select mode
                        setSelection(prev => ({
                          ...prev,
                          selectedNodes: prev.pendingSelection,
                          pendingSelection: [],
                          showSelectionBar: false,
                          multiSelectMode: false // ปิด multi-select mode
                        }));
                        setIsMultiSelectActive(false); // ปิด UI state
                        
                        // Clear single selection
                        setSelectedNode(null);
                        setSelectedEdge(null);
                        
                        toast.success(`ยืนยันการเลือก ${selection.pendingSelection.length} รายการ`);
                      }}
                      className="text-xs px-4 bg-primary hover:bg-primary/90"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      ยืนยัน
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>

        {/* Collapsed Properties Trigger */}
        {isPropertiesCollapsed && (
          <div className="hidden md:flex flex-col items-center justify-start pt-4 w-12 border-l bg-card/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPropertiesCollapsed(false)}
              className="mb-2"
              title="Expand properties"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Enhanced Desktop/Tablet Properties Panel - Scrollable */}
        <AnimatePresence mode="wait">
          {!isPropertiesCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="hidden md:block border-l bg-card/50 blueprint-properties"
            >
              <div className="flex flex-col h-full">
                {/* Fixed Header */}
                <div className="p-4 border-b bg-card/80 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Properties
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPropertiesCollapsed(true)}
                    title="Collapse properties"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
                {/* Scrollable Content */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full custom-scrollbar">
                    <div className="p-4 space-y-4">
                    <PropertiesPanel
                      selectedNode={selectedNode}
                      selectedEdge={selectedEdge}
                      selectedNodes={nodes.filter(n => selection.selectedNodes.includes(n.id))}
                      selectedEdges={edges.filter(e => selection.selectedEdges.includes(e.id))}
                      onNodeUpdate={onNodeUpdate}
                      onEdgeUpdate={onEdgeUpdate}
                      onDeleteSelected={deleteSelected}
                      onCopySelected={copySelected}
                      onDeselectAll={() => setSelection(prev => ({ ...prev, selectedNodes: [], selectedEdges: [] }))}
                      storyVariables={storyMap?.storyVariables || []}
                      scenes={scenes}
                      characters={characters}
                      userMedia={userMedia}
                      officialMedia={officialMedia}
                    />
                  </div>
                </ScrollArea>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Mobile Story Blueprint Modal - Popup for Mobile, Sidebar for Desktop */}
      {isMobile ? (
        <Dialog open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <DialogContent className="w-[98vw] max-w-lg h-[85vh] overflow-hidden p-0 flex flex-col">
            <DialogHeader className="p-6 pb-4 border-b border-border flex-shrink-0">
              <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
                <Palette className="w-6 h-6" />
                Story Blueprint
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden p-6 pt-4">
              <Tabs defaultValue="palette" className="flex flex-col h-full">
                <TabsList className="grid w-full grid-cols-2 rounded-lg mb-6 h-12 flex-shrink-0">
                  <TabsTrigger value="palette" className="text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Nodes</TabsTrigger>
                  <TabsTrigger value="validation" className="text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Validation</TabsTrigger>
                </TabsList>
                <TabsContent value="palette" className="overflow-y-auto flex-1 h-full">
                  <div className="pr-2">
                    <NodePalette 
                      onAddNode={onAddNode}
                      isCollapsed={isNodePaletteCollapsed}
                      onToggleCollapse={() => setIsNodePaletteCollapsed(!isNodePaletteCollapsed)}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="validation" className="overflow-y-auto flex-1 h-full">
                  <div className="pr-2">
                    <ValidationPanel 
                      nodes={nodes} 
                      edges={edges} 
                      storyVariables={storyMap?.storyVariables || []} 
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="w-full sm:w-80 p-0">
            <div className="flex flex-col h-full bg-background">
              <SheetHeader className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <SheetTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Story Blueprint
                  </SheetTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsSidebarOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="palette" className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-2 mx-4 mt-2 rounded-lg">
                    <TabsTrigger value="palette" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Nodes</TabsTrigger>
                    <TabsTrigger value="validation" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Validation</TabsTrigger>
                  </TabsList>
                  <TabsContent value="palette" className="flex-1 mt-2 overflow-hidden">
                    <NodePalette 
                      onAddNode={onAddNode}
                      isCollapsed={isNodePaletteCollapsed}
                      onToggleCollapse={() => setIsNodePaletteCollapsed(!isNodePaletteCollapsed)}
                    />
                  </TabsContent>
                  <TabsContent value="validation" className="flex-1 mt-2 overflow-hidden">
                    <ValidationPanel 
                      nodes={nodes} 
                      edges={edges} 
                      storyVariables={storyMap?.storyVariables || []} 
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Mobile Properties Modal - Popup for Mobile, Sidebar for Desktop */}
      {isMobile ? (
        <Dialog open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
          <DialogContent className="w-[98vw] max-w-lg h-[85vh] overflow-hidden p-0 flex flex-col">
            <DialogHeader className="p-6 pb-4 border-b border-border flex-shrink-0">
              <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
                <Settings className="w-6 h-6" />
                Properties
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <div className="pr-2">
                <PropertiesPanel
                  selectedNode={selectedNode}
                  selectedEdge={selectedEdge}
                  selectedNodes={nodes.filter(n => selection.selectedNodes.includes(n.id))}
                  selectedEdges={edges.filter(e => selection.selectedEdges.includes(e.id))}
                  onNodeUpdate={onNodeUpdate}
                  onEdgeUpdate={onEdgeUpdate}
                  onDeleteSelected={deleteSelected}
                  onCopySelected={copySelected}
                  onDeselectAll={() => setSelection(prev => ({ ...prev, selectedNodes: [], selectedEdges: [] }))}
                  storyVariables={storyMap?.storyVariables || []}
                  scenes={scenes}
                  characters={characters}
                  userMedia={userMedia}
                  officialMedia={officialMedia}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
          <SheetContent side="right" className="w-full sm:w-80 p-0">
            <div className="flex flex-col h-full bg-background">
              <SheetHeader className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <SheetTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Properties
                  </SheetTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsPropertiesOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-hidden">
                <PropertiesPanel
                  selectedNode={selectedNode}
                  selectedEdge={selectedEdge}
                  selectedNodes={nodes.filter(n => selection.selectedNodes.includes(n.id))}
                  selectedEdges={edges.filter(e => selection.selectedEdges.includes(e.id))}
                  onNodeUpdate={onNodeUpdate}
                  onEdgeUpdate={onEdgeUpdate}
                  onDeleteSelected={deleteSelected}
                  onCopySelected={copySelected}
                  onDeselectAll={() => setSelection(prev => ({ ...prev, selectedNodes: [], selectedEdges: [] }))}
                  storyVariables={storyMap?.storyVariables || []}
                  scenes={scenes}
                  characters={characters}
                  userMedia={userMedia}
                  officialMedia={officialMedia}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Trash History Modal */}
      <Dialog open={isTrashHistoryOpen} onOpenChange={setIsTrashHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Trash History ({deletedItems.length} items)
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {deletedItems.length === 0 ? (
              <div className="text-center py-8">
                <Trash2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No deleted items</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-4">
                  {deletedItems.map((item, index) => (
                    <Card key={`${item.id}-${index}`} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {item.type === 'node' ? (
                              <Square className="w-4 h-4 text-blue-500" />
                            ) : (
                              <GitBranch className="w-4 h-4 text-purple-500" />
                            )}
                            <span className="font-medium text-sm">{item.description}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Deleted at {item.deletedAt.toLocaleString()}
                          </p>
                          {item.type === 'node' && ((item.data as Node).data as any)?.notesForAuthor && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              Notes: {((item.data as Node).data as any).notesForAuthor}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // กู้คืนผ่าน Command Pattern เพื่อผูกกับ undo/redo
                              if (item.type === 'node') {
                                const nodeData = item.data as Node;
                                // อัปเดตการตั้งค่าก่อนกู้คืน
                                const updatedNodeData = {
                                  ...nodeData,
                                  data: {
                                    ...nodeData.data,
                                    showThumbnails: currentBlueprintSettings.showSceneThumbnails, // ใช้การตั้งค่าจาก blueprintSettings
                                    showLabels: currentBlueprintSettings.showNodeLabels // ใช้การตั้งค่าจาก blueprintSettings
                                  }
                                };
                                const cmd = createNodeCommand('ADD_NODE', updatedNodeData.id, updatedNodeData);
                                executeCommand(cmd);
                              } else {
                                const edgeData = item.data as Edge;
                                // อัปเดตการตั้งค่าก่อนกู้คืน
                                const updatedEdgeData = {
                                  ...edgeData,
                                  data: {
                                    ...edgeData.data,
                                    showLabels: currentBlueprintSettings.showNodeLabels // ใช้การตั้งค่าจาก blueprintSettings สำหรับการแสดงผล choice labels
                                  }
                                };
                                const cmd = createEdgeCommand('ADD_EDGE', updatedEdgeData.id, updatedEdgeData, updatedEdgeData.source, updatedEdgeData.target);
                                executeCommand(cmd);
                              }
                              // Remove from deleted items
                              setDeletedItems(prev => prev.filter((_, i) => i !== index));
                              toast.success(`Restored ${item.description}`);
                            }}
                            title="Restore"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Permanently delete
                              setDeletedItems(prev => prev.filter((_, i) => i !== index));
                              toast.success(`Permanently deleted ${item.description}`);
                            }}
                            title="Delete permanently"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                // Clear all deleted items
                if (deletedItems.length > 0) {
                  const ok = window.confirm(`Permanently delete all ${deletedItems.length} items from trash?`);
                  if (ok) {
                    setDeletedItems([]);
                    toast.success('Trash cleared');
                  }
                }
              }}
              disabled={deletedItems.length === 0}
            >
              Clear All
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Restore all items ผ่าน Command Pattern (Batch)
                if (deletedItems.length > 0) {
                  const ok = window.confirm(`Restore all ${deletedItems.length} items from trash?`);
                  if (ok) {
                    const cmds: ICommand[] = [];
                    deletedItems.forEach(item => {
                      if (item.type === 'node') {
                        const nodeData = item.data as Node;
                        // อัปเดตการตั้งค่าก่อนกู้คืน
                        const updatedNodeData = {
                          ...nodeData,
                          data: {
                            ...nodeData.data,
                            showThumbnails: currentBlueprintSettings.showSceneThumbnails, // ใช้การตั้งค่าจาก blueprintSettings
                            showLabels: currentBlueprintSettings.showNodeLabels // ใช้การตั้งค่าจาก blueprintSettings
                          }
                        };
                        cmds.push(createNodeCommand('ADD_NODE', updatedNodeData.id, updatedNodeData));
                      } else {
                        const edgeData = item.data as Edge;
                        // อัปเดตการตั้งค่าก่อนกู้คืน
                        const updatedEdgeData = {
                          ...edgeData,
                          data: {
                            ...edgeData.data,
                            showLabels: currentBlueprintSettings.showNodeLabels // ใช้การตั้งค่าจาก blueprintSettings สำหรับการแสดงผล choice labels
                          }
                        };
                        cmds.push(createEdgeCommand('ADD_EDGE', updatedEdgeData.id, updatedEdgeData, updatedEdgeData.source, updatedEdgeData.target));
                      }
                    });
                    if (cmds.length > 0) {
                      const batch: BatchCommand = {
                        id: `restore-all-${Date.now()}`,
                        type: 'BATCH',
                        description: `Restore ${cmds.length} items from trash`,
                        timestamp: Date.now(),
                        commands: cmds,
                        execute: () => cmds.forEach(c => c.execute()),
                        undo: () => cmds.slice().reverse().forEach(c => c.undo())
                      };
                      executeCommand(batch);
                    }
                    setDeletedItems([]);
                    toast.success('All items restored');
                  }
                }
              }}
              disabled={deletedItems.length === 0}
            >
              Restore All
            </Button>
            <Button variant="default" onClick={() => setIsTrashHistoryOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
  );
});

BlueprintTab.displayName = 'BlueprintTab'; 

export default BlueprintTab;