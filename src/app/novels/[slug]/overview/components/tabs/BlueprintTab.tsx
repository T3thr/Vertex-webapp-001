// app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx
'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo, useImperativeHandle } from 'react';
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
import NextImage from 'next/image';
import { useSearchParams } from 'next/navigation';

// Blueprint Node Components
import { 
  SceneNode, 
  ChoiceNode, 
  BranchNode, 
  CommentNode, 
  EndingNode 
} from './blueprint';

// Episode Management Modal
import EpisodeManagementModal from './EpisodeManagementModal';

import '@xyflow/react/dist/style.css';

// EventManager integration
import { BlueprintCommandAdapter, createBlueprintCommandAdapter } from './BlueprintCommandAdapter';

// Utility function สำหรับ debouncing with cancel method
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T & { cancel: () => void } => {
  let timeout: NodeJS.Timeout;
  const debounced = ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T & { cancel: () => void };
  
  debounced.cancel = () => {
    clearTimeout(timeout);
  };
  
  return debounced;
};

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Utility imports
import { cn } from '@/lib/utils';

// Error handling
import { EpisodeErrorBoundary } from '@/components/ErrorBoundary';

// Icons
import { 
  Plus, 
  PlusCircle,
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
  FileText,
  Calendar,
  Type,
  Hash,
  Loader2
} from 'lucide-react';

// Types from backend models
import { StoryMapNodeType, IStoryMapNode, IStoryMapEdge, IStoryVariableDefinition } from '@/backend/models/StoryMap';
import { IScene } from '@/backend/models/Scene';
import { IChoice } from '@/backend/models/Choice';
import { ICharacter } from '@/backend/models/Character';
import { IMedia } from '@/backend/models/Media';
import { IOfficialMedia } from '@/backend/models/OfficialMedia';
import { IEpisode } from '@/backend/models/Episode';
// 🎯 Additional UI Components for Episode Management (already imported above)
// import { Plus, Trash2 } from 'lucide-react'; // Already imported
// import { Input } from '@/components/ui/input'; // Already imported  
// import { Label } from '@/components/ui/label'; // Already imported
// import { Textarea } from '@/components/ui/textarea'; // Already imported

// 🔥 FIX 2: Helper function to map StoryMapNodeType to React Flow node type
// Moved outside component to prevent hoisting issues
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
  // Professional Event Management Integration (Adobe/Canva/Figma style)
  eventManager?: any; // EventManager instance from parent
  // ✅ PROFESSIONAL SOLUTION 4: เพิ่ม autoSaveConfig prop
  autoSaveConfig?: {
    enabled: boolean;
    intervalSec: 15 | 30;
  };
  // การตั้งค่าการแสดงผลจาก localStorage
  blueprintSettings?: {
    showSceneThumbnails: boolean;
    showNodeLabels: boolean;
    showGrid: boolean;
    snapToGrid: boolean;
    nodeOrientation: 'horizontal' | 'vertical';
  };
  // 🎯 Enhanced Episode Integration - SIMPLIFIED (NO URL MANAGEMENT)
  onEpisodeCreate?: (newEpisode: any, updatedEpisodes: any[]) => void;
  onEpisodeUpdate?: (updatedEpisode: any, updatedEpisodes: any[]) => void;
  onEpisodeDelete?: (deletedEpisodeId: string, updatedEpisodes: any[]) => void;
  // 🎯 NEW: Unified Tab State Management
  onSceneUpdate?: (sceneId: string, sceneData: any) => void;
  // ❌ REMOVED: URL State Management - ไม่ใช้ URL-based episode selection อีกต่อไป
  // selectedEpisodeId?: string;
  onEpisodeSelect?: (episodeId: string | null) => void;
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
  isReactFlowInstantMode: boolean; // 🎯 แยก ReactFlow instant mode จาก manual mode
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
  id,
  onNavigateToDirector 
}: { 
  data: any; 
  selected: boolean; 
  id: string;
  onNavigateToDirector?: (sceneId?: string) => void;
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
      // ❌ REMOVED: Episode node support - Episodes ไม่ควรเป็น nodes บน canvas
      // case StoryMapNodeType.EPISODE_NODE: return <BookOpen className="w-5 h-5" />;
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
                    <NextImage 
                      src={data.sceneData.background.value} 
                      alt="ภาพพื้นหลังฉาก"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                      width={64}
                      height={64}
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
              
              {/* 🎯 NEW: Scene Edit Button - Navigate to DirectorTab */}
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateToDirector && data.sceneData?._id) {
                      onNavigateToDirector(data.sceneData._id);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 rounded-lg text-xs font-medium transition-all duration-200 group"
                >
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>แต่งฉาก</span>
                  <svg className="w-3 h-3 ml-auto opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
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
// 🎯 Episode Management Panel Component
const EpisodeManagementPanel = ({
  episodes,
  selectedEpisode,
  isCreating,
  formData,
  onFormChange,
  onEpisodeSelect,
  onCreate,
  onUpdate,
  onDelete,
  onCancel
}: {
  episodes: any[];
  selectedEpisode: any | null;
  isCreating: boolean;
  formData: any;
  onFormChange: (data: any) => void;
  onEpisodeSelect: (episodeId: string | null) => void;
  onCreate: () => void;
  onUpdate: (episodeId: string, data: any) => void;
  onDelete: (episodeId: string) => void;
  onCancel: () => void;
}) => {
  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">จัดการตอน</h3>
        <Button
          size="sm"
          onClick={() => {
            onFormChange({ ...formData, title: '', episodeOrder: episodes.length + 1 });
            // Set creating mode if not in the props, we'll handle this in parent
          }}
          className="flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          เพิ่มตอน
        </Button>
      </div>

      {/* Episode Creation Form */}
      {isCreating && (
        <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
          <div className="space-y-3">
            <div>
              <Label htmlFor="episode-title" className="text-xs">ชื่อตอน</Label>
              <Input
                id="episode-title"
                value={formData.title}
                onChange={(e) => onFormChange({ ...formData, title: e.target.value })}
                placeholder="ระบุชื่อตอน..."
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="episode-order" className="text-xs">ลำดับตอน</Label>
                <Input
                  id="episode-order"
                  type="number"
                  value={formData.episodeOrder}
                  onChange={(e) => onFormChange({ ...formData, episodeOrder: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="episode-volume" className="text-xs">เล่ม (ถ้ามี)</Label>
                <Input
                  id="episode-volume"
                  type="number"
                  value={formData.volumeNumber || ''}
                  onChange={(e) => onFormChange({ ...formData, volumeNumber: parseInt(e.target.value) || undefined })}
                  placeholder="เล่ม"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="episode-teaser" className="text-xs">เรื่องย่อ (ถ้ามี)</Label>
              <Textarea
                id="episode-teaser"
                value={formData.teaserText}
                onChange={(e) => onFormChange({ ...formData, teaserText: e.target.value })}
                placeholder="เรื่องย่อของตอน..."
                className="mt-1 text-xs"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={onCreate} disabled={!formData.title.trim()}>
                สร้างตอน
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel}>
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Episodes List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {episodes.map((episode) => (
          <div
            key={episode._id}
            className={cn(
              "p-2 border border-gray-200 rounded cursor-pointer transition-colors",
              selectedEpisode?._id === episode._id
                ? "bg-blue-50 border-blue-300"
                : "bg-white hover:bg-gray-50"
            )}
            onClick={() => onEpisodeSelect(episode._id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  ตอนที่ {episode.episodeOrder}: {episode.title}
                </div>
                <div className="text-xs text-gray-500">
                  สถานะ: {episode.status === 'draft' ? 'ฉบับร่าง' : 
                          episode.status === 'published' ? 'เผยแพร่แล้ว' : episode.status}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(episode._id);
                  }}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {episodes.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            ยังไม่มีตอน
          </div>
        )}
      </div>
    </div>
  );
};

// 🆕 PHASE 2: Professional Modal Management System
interface ModalState {
  type: 'episode_create' | 'episode_edit' | 'episode_delete' | 'episode_settings' | null;
  isOpen: boolean;
  data?: any;
  context?: {
    canvasPosition?: { x: number; y: number };
    selectedEpisodes?: string[];
    episodeId?: string;
  };
}

// 🎯 Episode Create Modal Component - REMOVED
// ใช้ Professional Episode Creator Dialog แทน (บรรทัด 8313)

// 🎯 Episode Delete Modal Component
const EpisodeDeleteModal = ({ 
  isOpen, 
  episodes, 
  onClose, 
  onConfirm 
}: {
  isOpen: boolean;
  episodes: any[];
  onClose: () => void;
  onConfirm: (episodeIds: string[]) => Promise<void>;
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(episodes.map(ep => ep._id));
      onClose();
    } catch (error) {
      console.error('Error deleting episodes:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || episodes.length === 0) return null;

  const isMultiple = episodes.length > 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isMultiple ? `ลบ ${episodes.length} ตอน` : 'ลบตอน'}
              </h2>
              <p className="text-sm text-gray-600">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-700 mb-3">
              {isMultiple 
                ? `คุณกำลังจะลบตอนทั้งหมด ${episodes.length} ตอน:` 
                : 'คุณกำลังจะลบตอน:'}
            </p>
            <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
              {episodes.map((episode, index) => (
                <div key={episode._id} className="text-sm text-gray-700">
                  {index + 1}. ตอนที่ {episode.episodeOrder}: {episode.title}
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>คำเตือน:</strong> การลบตอนจะส่งผลต่อ:
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Nodes และ Edges ที่เกี่ยวข้องใน StoryMap</li>
                    <li>ฉากทั้งหมดในตอน</li>
                    <li>ความคิดเห็นและการให้คะแนน</li>
                    <li>สถิติการอ่าน</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="min-w-[100px] bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังลบ...
                </div>
              ) : (
                isMultiple ? `ลบ ${episodes.length} ตอน` : 'ลบตอน'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 🎯 Modal Manager Hook
const useModalManager = () => {
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    isOpen: false,
    data: undefined,
    context: undefined
  });

  const openModal = useCallback((
    type: ModalState['type'], 
    data?: any, 
    context?: ModalState['context']
  ) => {
    setModalState({
      type,
      isOpen: true,
      data,
      context
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({
      type: null,
      isOpen: false,
      data: undefined,
      context: undefined
    });
  }, []);

  return {
    modalState,
    openModal,
    closeModal
  };
};
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
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['basic']);

  // 🎯 SIMPLIFIED: เหลือเฉพาะโหนดพื้นฐานที่เว็บรองรับในปัจจุบัน
  const nodeCategories = {
    basic: {
      name: '📖 องค์ประกอบเรื่องราว',
      icon: BookOpen,
      color: 'from-blue-500 to-blue-600',
      nodes: [
        { type: StoryMapNodeType.START_NODE, name: '🎯 จุดเริ่มต้น', desc: 'เริ่มต้นเรื่อง (สีเขียว)', icon: Target },
        { type: StoryMapNodeType.SCENE_NODE, name: '🎬 ฉาก', desc: 'ฉากในเรื่อง', icon: Square },
        { type: StoryMapNodeType.CHOICE_NODE, name: '🎮 ตัวเลือก', desc: 'ให้ผู้เล่นเลือก', icon: GitBranch },
        { type: StoryMapNodeType.ENDING_NODE, name: '🏁 จบเรื่อง', desc: 'จุดจบของเรื่อง', icon: Flag }
      ]
    }
    // 🔒 HIDDEN: ซ่อนโหนดขั้นสูงไว้ก่อน จนกว่าจะพัฒนาเสร็จ
    // interaction, system, tools categories จะถูกเพิ่มกลับมาในอนาคต
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
          onClick={() => {
            console.log(`[BlueprintTab] 🧹 MultipleSelectionPanel X button clicked`, {
              selectedNodesCount: selectedNodes.length,
              selectedEdgesCount: selectedEdges.length,
              hasOnDeselectAll: !!onDeselectAll
            });
            onDeselectAll();
          }}
          className="text-muted-foreground hover:text-foreground"
          title="Clear Selection (ล้างการเลือกทั้งหมด)"
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
    console.log(`[BlueprintTab] 🧹 PropertiesPanel handleDeselectAll called`, {
      hasOnDeselectAll: !!onDeselectAll,
      selectedNodesCount: selectedNodes.length,
      selectedEdgesCount: selectedEdges.length
    });
    
    if (onDeselectAll) {
      onDeselectAll();
    } else {
      console.warn(`[BlueprintTab] ⚠️ onDeselectAll callback not provided`);
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
  eventManager, // Professional Event Management Integration
  autoSaveConfig, // ✅ PROFESSIONAL SOLUTION 5: รับ autoSaveConfig prop
  blueprintSettings,
  // 🎯 Enhanced Episode Integration - SIMPLIFIED
  onEpisodeCreate,
  onEpisodeUpdate,
  onEpisodeDelete
}, ref) => {
  // Core ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // ✨ Professional Event Management Integration (Adobe/Canva/Figma style)
  // Use EventManager from parent (NovelEditor) for command-based state management
  const professionalEventManager = eventManager;
  
  // SaveManager compatibility layer - use EventManager for save operations
  const saveManager = professionalEventManager;
  const professionalSaveManager = professionalEventManager;

  // Create CommandAdapter for bridging legacy commands with EventManager
  const [commandAdapter] = useState(() => {
    if (professionalEventManager) {
      return createBlueprintCommandAdapter(professionalEventManager);
    }
    return null;
  });

  // Command execution function (moved up to be available for handlers)
  // ✨ Enhanced Command execution function สำหรับ Canva/Figma-like experience
  const executeCommand = useCallback(async (command: any) => {
    try {
      // 🎯 ใช้ EventManager เป็นหลักในการจัดการ commands (Professional approach)
      if (professionalEventManager) {
        console.log(`[BlueprintTab] 🎯 Executing command via EventManager: ${command.type} - ${command.description}`);
        
        // Execute ผ่าน EventManager เพื่อให้ undo/redo tracking ทำงานถูกต้อง
        const result = await professionalEventManager.executeCommand(command);
        
        if (result.success) {
          console.log(`[BlueprintTab] ✅ Command executed successfully: ${command.type}`);
          
          // Notify dirty state change (EventManager จะจัดการ markAsDirty เอง)
          if (onDirtyChange) {
            onDirtyChange(professionalEventManager.hasChanges());
          }
        } else {
          console.error(`[BlueprintTab] ❌ Command execution failed: ${result.error?.message}`);
          toast.error(`การดำเนินการล้มเหลว: ${result.error?.message}`);
        }
        
        return result;
      } else if (commandAdapter) {
        // Fallback ใช้ CommandAdapter
        console.log(`[BlueprintTab] 📎 Executing command via CommandAdapter: ${command.type}`);
        await commandAdapter.executeCommand(command);
        
        // Force dirty state update for immediate UI feedback
        if (onDirtyChange) {
          onDirtyChange(true);
        }
      } else {
        // Fallback ขั้นสุดท้าย
        console.log(`[BlueprintTab] 🔧 Executing command directly: ${command.type}`);
        if (command.execute) {
          command.execute();
          // Manually mark as dirty if no adapter
          if (professionalEventManager) {
            professionalEventManager.markAsDirty();
          }
        }
        
        // Force dirty state update for immediate UI feedback
        if (onDirtyChange) {
          onDirtyChange(true);
        }
      }
      
      console.log(`[BlueprintTab] ⚡ Command completed: ${command.type} - ${command.description}`);
      
    } catch (error) {
      console.error('[BlueprintTab] ❌ Command execution failed:', error);
      toast.error('การดำเนินการล้มเหลว กรุณาลองใหม่อีกครั้ง');
    }
  }, [commandAdapter, professionalEventManager, onDirtyChange]);

  // ===============================
  // 🎯 ENHANCED EPISODE MANAGEMENT
  // ===============================
  
  // 🎯 PROFESSIONAL: Realtime Episode Management - No URL dependency
  const [episodeList, setEpisodeList] = useState<any[]>(episodes || []);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [selectedEpisodeFromBlueprint, setSelectedEpisodeFromBlueprint] = useState<any | null>(null);
  
  // 🎯 StoryMap loading state
  const [isLoadingStoryMap, setIsLoadingStoryMap] = useState(false);
  
  // 🎯 Episode Management Modal State
  const [showEpisodeManagementModal, setShowEpisodeManagementModal] = useState(false);
  const [currentEpisodeStoryMap, setCurrentEpisodeStoryMap] = useState<any>(null);
  
  // ReactFlow instance (ย้ายมาจากด้านล่าง)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // 🆕 PHASE 2: Modal Management Integration
  const { modalState, openModal, closeModal } = useModalManager();

  // 🎯 API Functions สำหรับ Episode Management
  const createEpisodeAPI = useCallback(async (episodeData: any, storyMapData?: any) => {
    try {
      // 🔥 ใช้ Blueprint API สำหรับการสร้าง Episode
      const response = await fetch(`/api/novels/${novel.slug}/episodes/blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          episodes: [episodeData]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create episode');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown API error');
      }

      return result.episode;
    } catch (error: any) {
      console.error('[createEpisodeAPI] Error:', error);
      
      // Provide user-friendly error messages
      let userMessage = 'ไม่สามารถสร้างตอนได้';
      if (error.message.includes('Episode order')) {
        userMessage = 'ลำดับตอนซ้ำกัน กรุณาเลือกลำดับใหม่';
      } else if (error.message.includes('title')) {
        userMessage = 'ชื่อตอนไม่ถูกต้อง กรุณาตรวจสอบ';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        userMessage = 'เกิดข้อผิดพลาดเครือข่าย กรุณาลองใหม่';
      }
      
      toast.error(userMessage);
      throw error;
    }
  }, [novel.slug]);

  const updateEpisodeAPI = useCallback(async (episodeId: string, updateData: any) => {
    try {
      const response = await fetch(`/api/novels/${novel.slug}/episodes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: episodeId, ...updateData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update episode');
      }

      const result = await response.json();
      return result.results[0]?.episode;
    } catch (error: any) {
      console.error('[updateEpisodeAPI] Error:', error);
      toast.error(`ไม่สามารถอัปเดตตอนได้: ${error.message}`);
      throw error;
    }
  }, [novel.slug]);

  const deleteEpisodeAPI = useCallback(async (episodeId: string) => {
    try {
      const response = await fetch(`/api/novels/${novel.slug}/episodes?ids=${episodeId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete episode');
      }

      const result = await response.json();
      return result.results[0];
    } catch (error: any) {
      console.error('[deleteEpisodeAPI] Error:', error);
      toast.error(`ไม่สามารถลบตอนได้: ${error.message}`);
      throw error;
    }
  }, [novel.slug]);

  // 🎯 REMOVED OLD EPISODE HANDLERS - Episodes are now managed via modal only
  // Episodes no longer create nodes on canvas - they maintain separate StoryMaps

  const handleUpdateEpisode = useCallback(async (episodeId: string, updateData: any) => {
    try {
      const updatedEpisode = await updateEpisodeAPI(episodeId, updateData);
      
      // อัปเดต local state
      const updatedEpisodes = episodeList.map(ep => 
        ep._id === episodeId ? { ...ep, ...updatedEpisode } : ep
      );
      setEpisodeList(updatedEpisodes);

      // 🔥 FIX 7: Update episodesRef to match internal state to prevent sync loop
      episodesRef.current = updatedEpisodes;

      // อัปเดต selected episode
      if (selectedEpisodeFromBlueprint?._id === episodeId) {
        setSelectedEpisodeFromBlueprint({ ...selectedEpisodeFromBlueprint, ...updatedEpisode });
      }

      // อัปเดต node ใน canvas
      setNodes(prev => prev.map(node => {
        if (node.data?.episodeId === episodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              title: updatedEpisode.title || node.data.title,
              episodeStatus: updatedEpisode.status || node.data.episodeStatus
            }
          };
        }
        return node;
      }));

      // Callback to parent
      if (onEpisodeUpdate) {
        onEpisodeUpdate(updatedEpisode, updatedEpisodes);
      }

      toast.success(`อัปเดตตอน "${updatedEpisode.title}" เรียบร้อยแล้ว`);

    } catch (error) {
      console.error('[handleUpdateEpisode] Error:', error);
    }
  }, [episodeList, selectedEpisodeFromBlueprint, updateEpisodeAPI, onEpisodeUpdate, setNodes]);

  // 🎯 ฟังก์ชันโหลด StoryMap ตาม Episode - SMOOTH TRANSITION WITHOUT LOADING MESSAGE
  // 🔥 FIX 2: แก้ไข dependencies ให้ครบถ้วนเพื่อป้องกัน stale closure
  const loadStoryMapForEpisode = useCallback(async (episodeId: string | null) => {
    if (!episodeId || !novel?.slug) {
      // ถ้าไม่มี episode ให้โหลด main story map
      console.log('🎯 Loading main story map (no episode selected)');
      
      // 🔥 PROFESSIONAL: Load main story map instead of clearing canvas
      if (storyMap && storyMap.nodes && storyMap.edges) {
        const reactFlowNodes = (storyMap.nodes || []).map((node: any) => ({
          id: node.nodeId,
          type: getReactFlowNodeType(node.nodeType),
          position: node.position || { x: 0, y: 0 },
          data: {
            ...node,
            nodeType: node.nodeType,
            title: node.title,
            nodeSpecificData: node.nodeSpecificData,
            editorVisuals: node.editorVisuals
          }
        }));

        const reactFlowEdges = (storyMap.edges || []).map((edge: any) => ({
          id: edge.edgeId,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          type: 'custom',
          data: {
            ...edge,
            label: edge.label,
            condition: edge.condition,
            editorVisuals: edge.editorVisuals
          },
          style: {
            stroke: edge.editorVisuals?.color || '#6B7280',
            strokeWidth: edge.editorVisuals?.strokeWidth || 2
          }
        }));

        setNodes(reactFlowNodes);
        setEdges(reactFlowEdges);
        setCurrentEpisodeStoryMap(null);
        
        console.log(`✅ Loaded main story map: ${reactFlowNodes.length} nodes, ${reactFlowEdges.length} edges`);
      } else {
        // Only clear if no main story map exists
        setNodes([]);
        setEdges([]);
        setCurrentEpisodeStoryMap(null);
        console.log('ℹ️ No main story map found - starting with empty canvas');
      }
      
      // 🎯 อัปเดต EventManager context เป็น novel-level
      if (professionalEventManager && professionalEventManager.updateConfig) {
        professionalEventManager.updateConfig({
          selectedEpisodeId: null
        });
      }
      return;
    }

    // 🎯 PROFESSIONAL: NO LOADING INDICATOR - SMOOTH TRANSITION
    // setIsLoadingStoryMap(true); // REMOVED - ไม่แสดงข้อความ loading
    try {
      // 🎯 อัปเดต EventManager context สำหรับ episode-specific operations
      if (professionalEventManager && professionalEventManager.updateConfig) {
        professionalEventManager.updateConfig({
          selectedEpisodeId: episodeId
        });
      }
      
      // 🎯 โหลด StoryMap สำหรับ Episode นี้จาก episode-specific endpoint
      console.log(`🔍 Fetching StoryMap for Episode ID: ${episodeId}`);
      const response = await fetch(`/api/novels/${novel.slug}/episodes/${episodeId}/storymap`);
      
      if (response.ok) {
        const episodeStoryMap = await response.json();
        setCurrentEpisodeStoryMap(episodeStoryMap);
        
        // แปลง StoryMap nodes/edges เป็น ReactFlow format
        const reactFlowNodes = (episodeStoryMap.nodes || []).map((node: any) => ({
          id: node.nodeId,
          type: getReactFlowNodeType(node.nodeType),
          position: node.position || { x: 0, y: 0 },
          data: {
            ...node,
            nodeType: node.nodeType,
            title: node.title,
            nodeSpecificData: node.nodeSpecificData,
            editorVisuals: node.editorVisuals,
            episodeId: episodeId // 🎯 Tag node with episodeId for proper persistence
          }
        }));

        const reactFlowEdges = (episodeStoryMap.edges || []).map((edge: any) => ({
          id: edge.edgeId,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          type: 'custom',
          data: {
            ...edge,
            label: edge.label,
            condition: edge.condition,
            editorVisuals: edge.editorVisuals,
            episodeId: episodeId // 🎯 Tag edge with episodeId for proper persistence
          },
          style: {
            stroke: edge.editorVisuals?.color || '#6B7280',
            strokeWidth: edge.editorVisuals?.strokeWidth || 2
          }
        }));

        setNodes(reactFlowNodes);
        setEdges(reactFlowEdges);
        
        console.log(`✅ โหลด StoryMap สำหรับ Episode ${episodeId} สำเร็จ:`, {
          nodes: reactFlowNodes.length,
          edges: reactFlowEdges.length,
          episodeTitle: episodeStoryMap.episode?.title
        });
      } else if (response.status === 404) {
        // ถ้าไม่พบ StoryMap ให้สร้างเปล่า (ตอนใหม่ที่ยังไม่มี storymap)
        console.log(`ℹ️ ไม่พบ StoryMap สำหรับ Episode ${episodeId} - แสดง canvas เปล่า`);
        setNodes([]);
        setEdges([]);
        setCurrentEpisodeStoryMap({ nodes: [], edges: [], storyVariables: [], version: 1 });
      } else {
        console.error(`❌ Failed to load StoryMap: ${response.status} ${response.statusText}`);
        setNodes([]);
        setEdges([]);
        setCurrentEpisodeStoryMap(null);
      }
    } catch (error) {
      console.error('[loadStoryMapForEpisode] Error:', error);
      toast.error('ไม่สามารถโหลด StoryMap ได้');
      setNodes([]);
      setEdges([]);
      setCurrentEpisodeStoryMap(null);
    }
    // 🎯 REMOVED setIsLoadingStoryMap(false) - NO LOADING STATE
  }, [novel?.slug, storyMap, professionalEventManager, setNodes, setEdges, setCurrentEpisodeStoryMap]);
  // 🔥 FIX 2: เอา getReactFlowNodeType ออกจาก dependencies เพราะเป็น pure function
  // ที่ไม่ได้ depend on external state และถูก declare หลัง loadStoryMapForEpisode

  // 🎯 PROFESSIONAL: Realtime Episode Selection - No URL dependency
  const handleEpisodeSelect = useCallback(async (episodeId: string | null) => {
    const episode = episodeId ? episodeList.find(ep => ep._id === episodeId) : null;
    
    // 🎯 Update realtime state
    setCurrentEpisodeId(episodeId);
    setSelectedEpisodeFromBlueprint(episode);
    
    // 🎯 Load StoryMap for selected Episode
    await loadStoryMapForEpisode(episodeId);
    
    // 🎯 Update EventManager context for episode-specific operations
    if (professionalEventManager && professionalEventManager.updateConfig) {
      professionalEventManager.updateConfig({
        selectedEpisodeId: episodeId
      });
    }

    // 🎯 Callback to parent (optional - for external state sync)
    if (onEpisodeCreate && episode) {
      // Note: Using onEpisodeCreate as a generic episode change callback
      onEpisodeCreate(episode, episodeList);
    }

    console.log(`🎯 Episode selected (realtime): ${episode?.title || 'Main Story'}`);
  }, [episodeList, loadStoryMapForEpisode, professionalEventManager, onEpisodeCreate]);

  // 🔥 FIX 6: Sync episodes prop ONLY when externally changed (not from internal updates)
  // ❌ REMOVED episodeList from dependencies to prevent infinite loop
  useEffect(() => {
    // Only update if episodes prop changed from EXTERNAL source (not from internal updates)
    if (episodes && episodes !== episodesRef.current && episodes !== episodeList) {
      console.log('[BlueprintTab] 🔄 External episodes prop changed, syncing...', {
        propsLength: episodes.length,
        stateLength: episodeList.length,
        isSameReference: episodes === episodeList
      });
      
      // Update episodes list without triggering cascade
      setEpisodeList(episodes);
      episodesRef.current = episodes;
    }
  }, [episodes]); // ✅ Only depend on episodes prop, NOT episodeList

  // 🎯 PROFESSIONAL: Don't auto-select any episode - require manual selection
  // 🔥 FIX 3: แก้ไข useEffect loop โดยใช้ useRef wrapper และลด dependencies
  useEffect(() => {
    // Clear selection when no episodes exist
    if (episodeList.length === 0 && currentEpisodeId) {
      setCurrentEpisodeId(null);
      setSelectedEpisodeFromBlueprint(null);
      
      // 🔥 FIX 3: ใช้ useRef wrapper แทนการใส่ loadStoryMapForEpisode ใน dependencies
      if (loadStoryMapForEpisodeRef.current) {
        loadStoryMapForEpisodeRef.current(null);
      }
      
      console.log(`🎯 Cleared episode selection - no episodes available`);
    }
    // ❌ REMOVED: Auto-selection of first episode
    // User must manually select episode to edit
    // 🔥 FIX 3: ใช้ episodeList.length แทน episodeList เพื่อลด re-render
    // ไม่ใส่ loadStoryMapForEpisode ใน deps เพราะใช้ ref แทน
  }, [episodeList.length, currentEpisodeId]);

  // ฟังก์ชันตรวจสอบว่าควรสร้าง command หรือไม่
  const shouldCreateCommand = useCallback((change: NodeChange | EdgeChange): boolean => {
    // ข้ามการสร้าง command ในกรณีต่อไปนี้:
    if (isInitializingRef.current) return false;
    if (change.type === 'select') return false;
    if (change.type === 'dimensions') return false;
    
    // สำหรับ position changes: ต้องเป็นการลากที่เสร็จสิ้นแล้ว (dragging: false)
    if (change.type === 'position') {
      return 'dragging' in change && change.dragging === false && 'id' in change && 
             dragStartPositions.current[change.id] !== undefined;
    }
    
    // Commands ที่ควรสร้าง: remove (delete), add (paste)
    if (change.type === 'remove') return true;
    if (change.type === 'add') return true;
    
    // อื่นๆ ไม่สร้าง command
    return false;
  }, []);

  // 🔥 FIGMA/CANVA STYLE: สร้าง command โดยใช้ CommandContext แทน local state
  const createCommandFromChange = useCallback((change: NodeChange | EdgeChange, type: 'nodes' | 'edges') => {
    if (!professionalEventManager) return null;
    
    // ✅ ใช้ CommandContext เป็นหลักแทน local state
    const context = professionalEventManager.getCommandContext();
    
    if (type === 'nodes') {
      const nodeChange = change as NodeChange;
      if (!('id' in nodeChange)) return null;
      const node = nodes.find(n => n.id === nodeChange.id);
      
      switch (nodeChange.type) {
        case 'position':
          if (dragStartPositions.current[nodeChange.id] && 'dragging' in nodeChange && nodeChange.dragging === false) {
            const originalPosition = dragStartPositions.current[nodeChange.id];
            const newPosition = nodeChange.position;
            
            // เฉพาะเมื่อตำแหน่งเปลี่ยนแปลงจริงๆ
            if (originalPosition.x !== newPosition?.x || originalPosition.y !== newPosition?.y) {
              return {
                id: `move-${nodeChange.id}-${Date.now()}`,
                type: 'MOVE_NODE',
                description: `Move node ${node?.data?.title || nodeChange.id}`,
                timestamp: Date.now(),
                execute: () => {
                  // ✅ ใช้ CommandContext แทน local setState
                  const currentNodes = context.getCurrentNodes();
                  const updatedNodes = currentNodes.map((n: any) => 
                    n.id === nodeChange.id 
                      ? { ...n, position: newPosition }
                      : n
                  );
                  context.setNodes(updatedNodes);
                },
                undo: () => {
                  // ✅ ใช้ CommandContext แทน local setState - ไม่มี setTimeout
                  const currentNodes = context.getCurrentNodes();
                  const revertedNodes = currentNodes.map((n: any) => 
                      n.id === nodeChange.id 
                        ? { ...n, position: originalPosition }
                        : n
                    );
                  context.setNodes(revertedNodes);
                }
              };
            }
          }
          break;
        case 'remove':
          if (node) {
            const edgesToDelete = edges.filter(e => e.source === nodeChange.id || e.target === nodeChange.id);
            return {
              id: `delete-${nodeChange.id}-${Date.now()}`,
              type: 'DELETE_NODE',
              description: `Delete node ${node.data?.title || nodeChange.id}`,
              timestamp: Date.now(),
              execute: () => {
                // ✅ ใช้ CommandContext
                const currentNodes = context.getCurrentNodes();
                const currentEdges = context.getCurrentEdges();
                
                context.setNodes(currentNodes.filter((n: any) => n.id !== nodeChange.id));
                context.setEdges(currentEdges.filter((e: any) => e.source !== nodeChange.id && e.target !== nodeChange.id));
              },
              undo: () => {
                // ✅ ใช้ CommandContext - ไม่มี setTimeout
                const currentNodes = context.getCurrentNodes();
                const currentEdges = context.getCurrentEdges();
                
                context.setNodes([...currentNodes, node]);
                context.setEdges([...currentEdges, ...edgesToDelete]);
              }
            };
          }
          break;
      }
    } else {
      const edgeChange = change as EdgeChange;
      if (!('id' in edgeChange)) return null;
      const edge = edges.find(e => e.id === edgeChange.id);
      
      switch (edgeChange.type) {
        case 'remove':
          if (edge) {
            return {
              id: `delete-edge-${edgeChange.id}-${Date.now()}`,
              type: 'DELETE_EDGE',
              description: `Delete connection ${edge.source} → ${edge.target}`,
              timestamp: Date.now(),
              execute: () => {
                // ✅ ใช้ CommandContext
                const currentEdges = context.getCurrentEdges();
                context.setEdges(currentEdges.filter((e: any) => e.id !== edgeChange.id));
              },
                undo: () => {
                // ✅ ใช้ CommandContext - ไม่มี setTimeout
                const currentEdges = context.getCurrentEdges();
                context.setEdges([...currentEdges, edge]);
              }
            };
          }
          break;
      }
    }
    return null;
  }, [nodes, edges, professionalEventManager]);

  // Enhanced ReactFlow handlers แบบใหม่ - Single Command Pipeline
  // 🔥 FIGMA/CANVA STYLE: Enhanced multi-select batch operation support
  const enhancedOnNodesChange = useCallback((changes: NodeChange[]) => {
    // Track drag start positions สำหรับ move commands
    changes.forEach(change => {
      if (change.type === 'position' && 'id' in change && change.dragging === true) {
        const node = nodes.find(n => n.id === change.id);
        if (node && !dragStartPositions.current[change.id]) {
          dragStartPositions.current[change.id] = { x: node.position.x, y: node.position.y };
          isDragging.current = true;
        }
      }
      if (change.type === 'position' && 'id' in change && change.dragging === false) {
        isDragging.current = false;
      }
    });

    // Apply ReactFlow changes first
    onNodesChange(changes);
    
    // ✅ FIGMA/CANVA STYLE: Batch operations for multi-select
    if (professionalEventManager && !isInitializingRef.current) {
      // Group position changes that happen simultaneously (multi-select drag)
      const positionChanges = changes.filter(change => 
        change.type === 'position' && 
        'id' in change && 
        change.dragging === false && 
        shouldCreateCommand(change)
      ) as (NodeChange & { type: 'position' })[];
      
      if (positionChanges.length > 1) {
        // ✅ FIGMA/CANVA STYLE: Create batch move command for multi-select operations
        // Capture original positions for all moved nodes
        const originalPositions = positionChanges.map(change => ({
          nodeId: change.id,
          originalPosition: dragStartPositions.current[change.id] || { x: 0, y: 0 },
          newPosition: change.position || { x: 0, y: 0 }
        }));
        
        const batchMoveCommand: ICommand = {
          id: `batch-move-${Date.now()}`,
          type: 'BATCH_MOVE',
          description: `Move ${positionChanges.length} nodes`,
          timestamp: Date.now(),
          execute: () => {
            // ✅ Use CommandContext for batch move execution
            const context = professionalEventManager.getCommandContext();
            const currentNodes = context.getCurrentNodes();
            
            const movedNodes = currentNodes.map((n: any) => {
              const moveData = originalPositions.find(p => p.nodeId === n.id);
              if (moveData) {
                return { ...n, position: moveData.newPosition };
              }
              return n;
            });
            
            context.setNodes(movedNodes);
            console.log(`[BlueprintTab] 🔄 Batch move executed for ${originalPositions.length} nodes`);
          },
          undo: () => {
            // ✅ Use CommandContext for batch undo
            const context = professionalEventManager.getCommandContext();
            const currentNodes = context.getCurrentNodes();
            
            const revertedNodes = currentNodes.map((n: any) => {
              const moveData = originalPositions.find(p => p.nodeId === n.id);
              if (moveData) {
                return { ...n, position: moveData.originalPosition };
              }
              return n;
            });
            
            context.setNodes(revertedNodes);
            console.log(`[BlueprintTab] ↶ Batch move undone for ${originalPositions.length} nodes`);
          }
        };
        
        professionalEventManager.addCommandToHistory(batchMoveCommand);
        console.log(`[BlueprintTab] 🔄 Created batch move command for ${positionChanges.length} nodes`);
      } else {
        // Single node operations
      changes.forEach(change => {
        if (shouldCreateCommand(change)) {
          const command = createCommandFromChange(change, 'nodes');
          if (command) {
            professionalEventManager.addCommandToHistory(command);
          }
        }
      });
      }
      
      // Sync snapshot ทันทีหลัง changes (ไม่ใช้ setTimeout)
      // 🔥 CRITICAL FIX: Clean story variables before sync to prevent null variableId
      const cleanedVariables = cleanStoryVariables(storyMap?.storyVariables || []);
      professionalEventManager.updateSnapshotFromReactFlow(nodes, edges, cleanedVariables);
    }

    // Clear drag positions หลัง position change เสร็จ
    changes.forEach(change => {
      if (change.type === 'position' && 'id' in change && change.dragging === false) {
        delete dragStartPositions.current[change.id];
      }
    });
  }, [onNodesChange, shouldCreateCommand, createCommandFromChange, professionalEventManager, nodes, edges, storyMap]);

  const enhancedOnEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Apply ReactFlow changes first
    onEdgesChange(changes);
    
    // สร้าง commands เฉพาะการเปลี่ยนแปลงที่ undoable และเพิ่มเข้า history ทันที
    if (professionalEventManager && !isInitializingRef.current) {
      changes.forEach(change => {
        if (shouldCreateCommand(change)) {
          const command = createCommandFromChange(change, 'edges');
          if (command) {
            // เพิ่มเข้า history โดยตรงแทนการ execute ซ้ำ (เพราะ ReactFlow ทำแล้ว)
            professionalEventManager.addCommandToHistory(command);
          }
        }
      });
      
      // Sync snapshot ทันทีหลัง changes (ไม่ใช้ setTimeout)
      // 🔥 CRITICAL FIX: Clean story variables before sync to prevent null variableId
      const cleanedVariables = cleanStoryVariables(storyMap?.storyVariables || []);
      professionalEventManager.updateSnapshotFromReactFlow(nodes, edges, cleanedVariables);
    }
  }, [onEdgesChange, shouldCreateCommand, createCommandFromChange, professionalEventManager, nodes, edges, storyMap]);
  
  // Selection and UI state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  // selectedEpisode จะใช้ selectedEpisodeFromBlueprint แทน
  
  // ✨ Episode creation state
  const [isEpisodeCreatorOpen, setIsEpisodeCreatorOpen] = useState(false);
  const [episodeCreationForm, setEpisodeCreationForm] = useState({
    title: '',
    episodeOrder: episodes.length + 1,
    teaserText: '',
    accessType: 'free',
    priceCoins: 0,
    status: 'draft'
  });
  const [isCreatingEpisode, setIsCreatingEpisode] = useState(false);

  // 🔥 FIX 4: Toast Deduplication - Track created episodes to prevent duplicate toasts
  const createdEpisodeIdsRef = useRef<Set<string>>(new Set());
  
  // 🔥 FIX 1: Stable reference for loadStoryMapForEpisode to prevent stale closures
  const loadStoryMapForEpisodeRef = useRef<((episodeId: string | null) => Promise<void>) | null>(null);

  // 🔥 FIX 1: Update ref whenever loadStoryMapForEpisode changes
  useEffect(() => {
    loadStoryMapForEpisodeRef.current = loadStoryMapForEpisode;
  }, [loadStoryMapForEpisode]);

  // 🔥 FIX 6: Track episodes prop to prevent infinite loop in sync useEffect
  const episodesRef = useRef(episodes);

  // ✨ Episode creation handler
  // 🎯 Professional Episode Creation Handler (Modal-based)
  // 🔥 FIX 5: แก้ไข dependencies และใช้ useRef wrapper + toast deduplication
  const handleCreateEpisodeModal = useCallback(async (episodeData: any) => {
    try {
      // 🔥 ใช้ Blueprint API สำหรับการสร้าง Episode
      const response = await fetch(`/api/novels/${novel.slug}/episodes/blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          episodes: [episodeData]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create episode');
      }

      const result = await response.json();
      const newEpisode = result.data;

      // 🔥 FIX 4: Toast Deduplication - ตรวจสอบว่า episode นี้สร้างไปแล้วหรือยัง
      if (createdEpisodeIdsRef.current.has(newEpisode._id)) {
        console.warn('⚠️ Episode already created, skipping duplicate toast and reload');
        return;
      }
      
      // เพิ่ม episode ID เข้า tracking set
      createdEpisodeIdsRef.current.add(newEpisode._id);

      // 🎯 PROFESSIONAL: Update realtime state (no URL management)
      const updatedEpisodes = [...episodeList, newEpisode].sort((a, b) => a.episodeOrder - b.episodeOrder);
      setEpisodeList(updatedEpisodes);
      
      // 🎯 Auto-select new episode (realtime)
      setCurrentEpisodeId(newEpisode._id);
      setSelectedEpisodeFromBlueprint(newEpisode);

      // 🔥 FIX 7: Update episodesRef to match internal state to prevent sync loop
      episodesRef.current = updatedEpisodes;

      // 🔥 FIX 1: ใช้ useRef wrapper แทนการเรียกตรงๆ เพื่อป้องกัน stale closure
      if (loadStoryMapForEpisodeRef.current) {
        await loadStoryMapForEpisodeRef.current(newEpisode._id);
      }

      // 🎯 Callback to parent for external state sync
      if (onEpisodeCreate) {
        onEpisodeCreate(newEpisode, updatedEpisodes);
      }
      
      // 🎯 Hide tutorial when first episode is created
      setShowTutorial(false);

      toast.success(`สร้างตอน "${newEpisode.title}" เรียบร้อยแล้ว`);

    } catch (error: any) {
      console.error('[handleCreateEpisodeModal] Error:', error);
      toast.error(`การสร้างตอนล้มเหลว: ${error.message}`);
      throw error;
    }
  }, [novel.slug, episodeList, onEpisodeCreate]);

  // 🎯 Legacy handler for backward compatibility
  const handleCreateEpisode = useCallback(async () => {
    // 🔥 เปิด Professional Episode Creator Dialog
    setIsEpisodeCreatorOpen(true);
    
    // ตั้งค่าฟอร์มเริ่มต้น
    const nextOrder = Math.max(...episodeList.map(ep => ep.episodeOrder), 0) + 1;
    setEpisodeCreationForm({
      title: '',
      episodeOrder: nextOrder,
      teaserText: '',
      accessType: 'free',
      priceCoins: 0,
      status: 'draft'
    });
  }, [episodeList, setIsEpisodeCreatorOpen, setEpisodeCreationForm]);

  // 🎯 Canvas-based Episode Creation (right-click context menu)
  const handleCanvasCreateEpisode = useCallback((canvasPosition: { x: number; y: number }) => {
    // 🔥 เปิด Professional Episode Creator Dialog
    setIsEpisodeCreatorOpen(true);
    
    // ตั้งค่าฟอร์มเริ่มต้น
    const nextOrder = Math.max(...episodeList.map(ep => ep.episodeOrder), 0) + 1;
    setEpisodeCreationForm({
      title: '',
      episodeOrder: nextOrder,
      teaserText: '',
      accessType: 'free',
      priceCoins: 0,
      status: 'draft'
    });
  }, [episodeList, setIsEpisodeCreatorOpen, setEpisodeCreationForm]);
  // 🎯 Episode Deletion Handler (Modal-based)
  const handleDeleteEpisodeModal = useCallback(async (episodeIds: string[]) => {
    try {
      // 🔥 ใช้ Blueprint API สำหรับการลบ Episode
      const response = await fetch(`/api/novels/${novel.slug}/episodes/blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          episodeIds
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete episodes');
      }

      const result = await response.json();

      // 🎯 Real-time อัปเดต local state
      const updatedEpisodes = episodeList.filter(ep => !episodeIds.includes(ep._id));
      setEpisodeList(updatedEpisodes);

      // 🔥 FIX 7: Update episodesRef to match internal state to prevent sync loop
      episodesRef.current = updatedEpisodes;

      // 🎯 PROFESSIONAL: Clear selection if deleted episode was selected (realtime)
      if (selectedEpisodeFromBlueprint && episodeIds.includes(selectedEpisodeFromBlueprint._id)) {
        setCurrentEpisodeId(null);
        setSelectedEpisodeFromBlueprint(null);
        setNodes([]);
        setEdges([]);
        setCurrentEpisodeStoryMap(null);
        
        // 🎯 Update EventManager context to novel-level
        if (professionalEventManager && professionalEventManager.updateConfig) {
          professionalEventManager.updateConfig({
            selectedEpisodeId: null
          });
        }
        
        // 🎯 Auto-select first remaining episode if available
        const remainingEpisodes = updatedEpisodes;
        if (remainingEpisodes.length > 0) {
          const firstRemaining = remainingEpisodes[0];
          setCurrentEpisodeId(firstRemaining._id);
          setSelectedEpisodeFromBlueprint(firstRemaining);
          await loadStoryMapForEpisode(firstRemaining._id);
          console.log(`🎯 Auto-selected first remaining episode: ${firstRemaining.title}`);
        }
      }

      // 🎯 Callback to parent
      if (onEpisodeDelete) {
        episodeIds.forEach(epId => {
          onEpisodeDelete(epId, updatedEpisodes);
        });
      }

      const count = episodeIds.length;
      toast.success(`ลบ${count > 1 ? ` ${count} ตอน` : 'ตอน'}เรียบร้อยแล้ว`);

    } catch (error: any) {
      console.error('[handleDeleteEpisodeModal] Error:', error);
      toast.error(`การลบตอนล้มเหลว: ${error.message}`);
      throw error;
    }
  }, [novel.slug, episodeList, selectedEpisodeFromBlueprint, setNodes, onEpisodeDelete]);

  // 🎯 Legacy delete handler
  const handleDeleteEpisode = useCallback((episodeId: string) => {
    const episodeToDelete = episodeList.find(ep => ep._id === episodeId);
    if (episodeToDelete) {
      openModal('episode_delete', null, { selectedEpisodes: [episodeToDelete] });
    }
  }, [episodeList, openModal]);

  // 🎯 Bulk delete handler
  const handleBulkDeleteEpisodes = useCallback((episodes: any[]) => {
    openModal('episode_delete', null, { selectedEpisodes: episodes });
  }, [openModal]);

  // 🎯 Dynamic Episode Selection Handler (ไม่ใช้ URL management) - ใช้ existing function ที่บรรทัด 2455

  // 🎯 Professional Episode Creator Handler
  const legacyHandleCreateEpisode = useCallback(async () => {
    if (!novel?.slug || !episodeCreationForm.title.trim()) {
      toast.error('กรุณาระบุชื่อตอน');
      return;
    }

    setIsCreatingEpisode(true);
    
    try {
      // 🔥 ใช้ Episodes API สำหรับการสร้าง Episode โดยตรงเข้า Database
      const response = await fetch(`/api/novels/${novel.slug}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: episodeCreationForm.title.trim(),
          episodeOrder: episodeCreationForm.episodeOrder,
          teaserText: episodeCreationForm.teaserText?.trim() || '',
          accessType: episodeCreationForm.accessType,
          priceCoins: episodeCreationForm.accessType === 'paid_unlock' ? episodeCreationForm.priceCoins : 0,
          status: episodeCreationForm.status,
          // 🎯 สร้าง StoryMap เปล่าสำหรับ Episode ใหม่
          storyMapData: {
            nodeId: `episode_${Date.now()}`,
            position: { x: 100 + (episodeList.length * 200), y: 100 + (episodeList.length * 150) }
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create episode');
      }

      const result = await response.json();
      const newEpisode = result.episode;

      // 🎯 PROFESSIONAL: Update realtime state (database-only)
      const updatedEpisodes = [...episodeList, newEpisode].sort((a, b) => a.episodeOrder - b.episodeOrder);
      setEpisodeList(updatedEpisodes);
      
      // 🎯 Auto-select new episode (realtime)
      setCurrentEpisodeId(newEpisode._id);
      setSelectedEpisodeFromBlueprint(newEpisode);

      // 🔥 FIX 7: Update episodesRef to match internal state to prevent sync loop
      episodesRef.current = updatedEpisodes;

      // 🎯 Load empty StoryMap for new Episode (database-only)
      await loadStoryMapForEpisode(newEpisode._id);

      // 🎯 Callback to parent for external state sync
      if (onEpisodeCreate) {
        onEpisodeCreate(newEpisode, updatedEpisodes);
      }
      
      // Reset form
      setEpisodeCreationForm({
        title: '',
        episodeOrder: updatedEpisodes.length + 1,
        teaserText: '',
        accessType: 'free',
        priceCoins: 0,
        status: 'draft'
      });
      
      setIsEpisodeCreatorOpen(false);
      toast.success(`เพิ่มตอน "${episodeCreationForm.title}" สำเร็จ`);

    } catch (error) {
      console.error('Error creating episode:', error);
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างตอน');
    } finally {
      setIsCreatingEpisode(false);
    }
  }, [novel?.slug, episodeCreationForm, episodes, onEpisodeCreate]);
  
  // Mobile/Desktop UI state with localStorage persistence
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPropertiesCollapsed, setIsPropertiesCollapsed] = useState(false);
  
  // Node Palette collapse state
  const [isNodePaletteCollapsed, setIsNodePaletteCollapsed] = useState(false);
  
  // Tutorial state management
  const searchParams = useSearchParams();
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  
  // 🎯 PROFESSIONAL: Show tutorial based on episode selection state
  useEffect(() => {
    // Show "Select Episode" tutorial when novel has episodes but none selected
    if (episodes.length > 0 && !currentEpisodeId && !showTutorial) {
      setShowTutorial(true);
      setTutorialStep(1); // Different tutorial step for "select episode"
    } 
    // Show "Create Episode" tutorial when no episodes exist
    else if (episodes.length === 0 && !showTutorial) {
      setShowTutorial(true);
      setTutorialStep(0); // Tutorial step for "create episode"
    } 
    // Hide tutorial when episode is selected
    else if (currentEpisodeId && showTutorial) {
      setShowTutorial(false);
    }
  }, [episodes.length, currentEpisodeId, showTutorial]);

  // 🎯 Listen for episode creator messages from modal
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_EPISODE_CREATOR') {
        setIsEpisodeCreatorOpen(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Auto-save settings จะถูกจัดการโดย NovelEditor ผ่าน props
  const [autoSaveSettings, setAutoSaveSettings] = useState<AutoSaveSettings>({
    enabled: false, // Default: false ไม่บังคับผู้ใช้ (จัดการโดย NovelEditor)
    intervalSec: 30, // จัดการโดย NovelEditor
    conflictResolutionStrategy: 'merge' // จัดการโดย SaveManager
  });

  // ✅ PROFESSIONAL SOLUTION 6: Sync autoSaveSettings จาก parent props
  useEffect(() => {
    if (autoSaveConfig) {
      setAutoSaveSettings(prev => ({
        ...prev,
        enabled: autoSaveConfig.enabled,
        intervalSec: autoSaveConfig.intervalSec
      }));
      
      console.log('[BlueprintTab] 🔄 Auto-save settings updated from parent:', autoSaveConfig);
    }
  }, [autoSaveConfig]);

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

  
  // Canvas state - ใช้ค่าเริ่มต้น
  const [canvasState, setCanvasState] = useState<CanvasState>({
    isLocked: false,
    zoomLevel: 1,
    position: { x: 0, y: 0 },
    showGrid: true,
    gridSize: 20,
    snapToGrid: false
  });


  
  // ✨ Professional Command Management สำหรับ Undo/Redo (ใช้ EventManager เป็นหลัก)
  // ลบการใช้ local command stack และใช้ SingleUserEventManager แทน
  // const [undoStack, setUndoStack] = useState<AnyCommand[]>([]); // ❌ ลบ local stack
  // const [redoStack, setRedoStack] = useState<AnyCommand[]>([]); // ❌ ลบ local stack  
  const [lastSavedCommandPosition, setLastSavedCommandPosition] = useState<number>(0);
  
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
  // 🔥 PROFESSIONAL: Enhanced ID generation with collision prevention
  const generateCommandId = () => `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 🔥 PROFESSIONAL: Enhanced unique node ID generation with collision detection
  const generateUniqueNodeId = (nodeType: string | StoryMapNodeType) => {
    const timestamp = Date.now();
    const sessionId = Math.random().toString(36).substr(2, 12);
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    
    // Create type-specific prefixes for better identification
    let typePrefix: string;
    if (nodeType === StoryMapNodeType.START_NODE || nodeType === 'start_node') {
      typePrefix = 'start';
    } else if (nodeType === StoryMapNodeType.SCENE_NODE || nodeType === 'scene_node') {
      typePrefix = 'scene';
    } else {
      typePrefix = nodeType.toString().toLowerCase().replace('_node', '').replace('_', '-');
    }
    
    const baseId = `${typePrefix}_${timestamp}_${sessionId}`;
    
    // Ensure absolute uniqueness by checking existing nodes
    let counter = 0;
    let finalId = baseId;
    const existingIds = new Set(nodes.map(node => node.id));
    
    while (existingIds.has(finalId)) {
      counter++;
      finalId = `${baseId}_${counter}_${randomSuffix}`;
      
      // Safety break to prevent infinite loop
      if (counter > 1000) {
        finalId = `emergency_${typePrefix}_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
        break;
      }
    }
    
    console.log(`[BlueprintTab] Generated unique node ID: ${finalId} for type: ${nodeType}`);
    return finalId;
  };

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
        // PATCH request พร้อม version control - รองรับ episode-specific saving
        const apiUrl = selectedEpisodeFromBlueprint 
          ? `/api/novels/${novel.slug}/episodes/${selectedEpisodeFromBlueprint._id}/storymap/save`
          : `/api/novels/${novel._id}/storymap`;
        const response = await fetch(apiUrl, {
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
            pendingCommandCount: prev.pendingCommandCount - 1,
            isSaving: false,
            hasUnsavedChanges: prev.saveQueue.length > 1, // Still has pending commands
            isDirty: prev.saveQueue.length > 1,
            isProcessingQueue: prev.saveQueue.length > 1
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
              saveError: `Failed to save: ${error instanceof Error ? error.message : String(error)}`,
              isSaving: false,
              hasUnsavedChanges: prev.saveQueue.length > 1,
              isDirty: prev.saveQueue.length > 1,
              isProcessingQueue: prev.saveQueue.length > 1,
              lastSaved: null
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
      
      // 1. ดึง story map ล่าสุดจาก server - รองรับ episode-specific
      const apiUrl = selectedEpisodeFromBlueprint 
        ? `/api/novels/${novel.slug}/episodes/${selectedEpisodeFromBlueprint._id}/storymap`
        : `/api/novels/${novel._id}/storymap`;
      const response = await fetch(apiUrl);
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
            const apiUrl = selectedEpisodeFromBlueprint 
              ? `/api/novels/${novel.slug}/episodes/${selectedEpisodeFromBlueprint._id}/storymap/save`
              : `/api/novels/${novel._id}/storymap`;
            const response = await fetch(apiUrl, {
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
                storyVariables: cleanStoryVariables(storyMap?.storyVariables || [])
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
      const apiUrl = selectedEpisodeFromBlueprint 
        ? `/api/novels/${novel.slug}/episodes/${selectedEpisodeFromBlueprint._id}/storymap/save`
        : `/api/novels/${novel._id}/storymap`;
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': saveState.etag || `"${saveState.version}"`
        },
        body: JSON.stringify({
          nodes,
          edges,
          storyVariables: cleanStoryVariables(storyMap?.storyVariables || []),
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
  
  // ✅ CRITICAL FIX: Debounced localStorage updates to prevent rapid state changes
  const debouncedUpdateLocalStorage = useMemo(
    () => debounce((key: string, value: any) => {
      if (typeof window !== 'undefined' && !isInitialLoad) {
        localStorage.setItem(key, JSON.stringify(value));
        console.log(`[BlueprintTab] 💾 Saved ${key}:`, value);
      }
    }, 100), // 100ms debounce
    [isInitialLoad]
  );
  
  useEffect(() => {
    debouncedUpdateLocalStorage('blueprint-sidebar-open', isSidebarOpen);
  }, [isSidebarOpen, debouncedUpdateLocalStorage]);

  useEffect(() => {
    debouncedUpdateLocalStorage('blueprint-properties-open', isPropertiesOpen);
  }, [isPropertiesOpen, debouncedUpdateLocalStorage]);

  // Load UI states from localStorage after mount (ทำครั้งเดียวเพื่อป้องกัน infinite loops)
  // ✅ CRITICAL FIX: Load UI states from localStorage ONCE on mount (prevent infinite loops)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialLoad) {
      try {
        // Load all states in one batch to prevent cascade updates
        const sidebarOpen = localStorage.getItem('blueprint-sidebar-open');
        const propertiesOpen = localStorage.getItem('blueprint-properties-open');
        const sidebarCollapsed = localStorage.getItem('blueprint-sidebar-collapsed');
        const propertiesCollapsed = localStorage.getItem('blueprint-properties-collapsed');
        const nodePaletteCollapsed = localStorage.getItem('blueprint-node-palette-collapsed');
        
        // Set all states at once using functional updates to prevent race conditions
        if (sidebarOpen) {
          setIsSidebarOpen(JSON.parse(sidebarOpen));
        }
        if (propertiesOpen) {
          setIsPropertiesOpen(JSON.parse(propertiesOpen));
        }
        if (sidebarCollapsed) {
          setIsSidebarCollapsed(JSON.parse(sidebarCollapsed));
        }
        if (propertiesCollapsed) {
          setIsPropertiesCollapsed(JSON.parse(propertiesCollapsed));
        }
        if (nodePaletteCollapsed) {
          setIsNodePaletteCollapsed(JSON.parse(nodePaletteCollapsed));
        }
        
        console.log('[BlueprintTab] ✅ UI states loaded from localStorage - no infinite loops');
      } catch (error) {
        console.warn('[BlueprintTab] ⚠️ Failed to load UI states from localStorage:', error);
      } finally {
        // Mark as loaded AFTER all localStorage reads are complete (even if failed)
        setIsInitialLoad(false);
      }
    }
  }, []); // ✅ CRITICAL: Empty dependency array - run only once on mount

  // ✅ Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      if ('cancel' in debouncedUpdateLocalStorage) {
        (debouncedUpdateLocalStorage as any).cancel();
      }
    };
  }, [debouncedUpdateLocalStorage]);

  useEffect(() => {
    debouncedUpdateLocalStorage('blueprint-sidebar-collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed, debouncedUpdateLocalStorage]);

  useEffect(() => {
    debouncedUpdateLocalStorage('blueprint-properties-collapsed', isPropertiesCollapsed);
  }, [isPropertiesCollapsed, debouncedUpdateLocalStorage]);

  useEffect(() => {
    debouncedUpdateLocalStorage('blueprint-node-palette-collapsed', isNodePaletteCollapsed);
  }, [isNodePaletteCollapsed, debouncedUpdateLocalStorage]);
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
  
  // ===============================
  // PROFESSIONAL SAVE STATE MANAGEMENT
  // เทียบเท่า Adobe Creative Suite และ Canva
  // สำหรับการทำงานคนเดียว (Single-User Mode)
  // ===============================

  // สร้าง initial state snapshot เมื่อโหลดข้อมูลจาก database เสร็จ
  const [initialSnapshot, setInitialSnapshot] = useState<{
    nodes: any[];
    edges: any[];
    storyVariables: any[];
    timestamp: number;
  } | null>(null);

  // Flag สำหรับตรวจสอบว่าได้สร้าง initial snapshot แล้วหรือยัง
  const [isSnapshotReady, setIsSnapshotReady] = useState(false);

  // 🔥 CRITICAL FIX: Helper function to clean story variables and ensure NO duplicates
  const cleanStoryVariables = useCallback((variables: any[]): any[] => {
    if (!variables || !Array.isArray(variables)) return [];
    
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const timestamp = Date.now();
    const sessionId = Math.random().toString(36).substr(2, 12);
    
    return variables
      .filter(v => {
        // Filter out invalid variables
        if (!v) return false;
        // 🔥 CRITICAL: Filter out variables with invalid/empty/null IDs
        const id = String(v.variableId || '').trim();
        if (!id || id === 'null' || id === 'undefined' || id === 'NaN') return false;
        if (!v.variableName && !v.name) return false;
        return true;
      })
      .map((v, index) => {
        // 🔥 CRITICAL: Ensure unique variableId and variableName
        let variableId = String(v.variableId).trim();
        let variableName = String(v.variableName || v.name || `Variable_${index + 1}`).trim();
        
        // Handle duplicate variableId
        if (seenIds.has(variableId)) {
          const randomSuffix = Math.random().toString(36).substr(2, 9);
          variableId = `var_${timestamp}_${sessionId}_${index}_${randomSuffix}`;
          console.warn(`[cleanStoryVariables] ⚠️ Duplicate variableId detected, regenerated:`, variableId);
        }
        seenIds.add(variableId);
        
        // Handle duplicate variableName
        if (seenNames.has(variableName)) {
          let counter = 2;
          let newName = `${variableName}_${counter}`;
          while (seenNames.has(newName)) {
            counter++;
            newName = `${variableName}_${counter}`;
          }
          variableName = newName;
          console.warn(`[cleanStoryVariables] ⚠️ Duplicate variableName detected, renamed to:`, variableName);
        }
        seenNames.add(variableName);
        
        // Ensure all required fields exist
        return {
          variableId,
          variableName,
          dataType: v.dataType || v.variableType || 'string',
          initialValue: v.initialValue !== undefined ? v.initialValue : '',
          description: v.description || '',
          isGlobal: v.isGlobal !== undefined ? v.isGlobal : true,
          isVisibleToPlayer: v.isVisibleToPlayer || false
        };
      })
      // 🔥 CRITICAL: Final deduplication pass (safety net)
      .filter((v, index, array) => {
        return array.findIndex(item => item.variableId === v.variableId) === index;
      });
  }, []);

  // สร้าง snapshot ของ state ปัจจุบันเพื่อเปรียบเทียบ
  const createStateSnapshot = useCallback(() => {
    return {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: {
          x: Math.round(node.position.x),
          y: Math.round(node.position.y)
        },
        data: node.data ? JSON.parse(JSON.stringify(node.data)) : {}
      })).sort((a, b) => a.id.localeCompare(b.id)),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        data: edge.data ? JSON.parse(JSON.stringify(edge.data)) : {}
      })).sort((a, b) => a.id.localeCompare(b.id)),
      storyVariables: cleanStoryVariables(storyMap?.storyVariables || []).map((v: any) => 
        JSON.parse(JSON.stringify(v))
      ).sort((a: any, b: any) => (a.variableId || a.variableName || '').localeCompare(b.variableId || b.variableName || '')),
      timestamp: Date.now()
    };
  }, [nodes, edges, storyMap?.storyVariables, cleanStoryVariables]);

  // สร้าง initial snapshot เมื่อข้อมูลจาก database โหลดเสร็จ
  useEffect(() => {
    // ตรวจสอบว่าข้อมูลจาก database พร้อมแล้ว และยังไม่ได้สร้าง snapshot
    if (storyMap && nodes.length >= 0 && !initialSnapshot && !isInitializingRef.current) {
      const snapshot = createStateSnapshot();
      setInitialSnapshot(snapshot);
      setIsSnapshotReady(true);
      
      // Initialize save position to 0 (clean state)
      setLastSavedCommandPosition(0);
      
      // 🔥 FIGMA/CANVA STYLE: Setup bidirectional sync between EventManager and ReactFlow
      if (professionalEventManager) {
        professionalEventManager.setReactFlowUpdater((nodes: any[], edges: any[]) => {
          console.log('[BlueprintTab] 🔄 Force updating UI from EventManager:', {
            nodeCount: nodes.length,
            edgeCount: edges.length
          });
          
          // Force new array references for React re-render
          setNodes([...nodes]);
          setEdges([...edges]);
        });
        console.log('[BlueprintTab] ✅ Figma/Canva style bidirectional sync setup completed');
      }
      
      // ✨ Professional Save Integration: Sync initial state with EventManager
      if (professionalEventManager) {
        professionalEventManager.initializeWithData({
          nodes: snapshot.nodes,
          edges: snapshot.edges,
          storyVariables: snapshot.storyVariables
        });
      }
      
      // เริ่มต้นด้วยสถานะ disabled (ไม่มีการเปลี่ยนแปลง)
      if (onDirtyChange) {
        onDirtyChange(false);
      }
      
      // Enterprise-grade initialization logging
      console.log('[BlueprintTab] 🎯 Professional Editor Initialized:', {
        novelSlug: novel?.slug,
        nodeCount: snapshot.nodes.length,
        edgeCount: snapshot.edges.length,
        variableCount: snapshot.storyVariables.length,
        saveButtonEnabled: false,
        lastSavedCommandPosition: 0,
        currentCommandPosition: 0,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
        sessionId: Math.random().toString(36).substr(2, 9)
      });
    }
  }, [storyMap, nodes, edges, initialSnapshot, createStateSnapshot, professionalEventManager, onDirtyChange, novel?.slug]);

  // Professional Command Execution Listener (like Figma/Canva)
  useEffect(() => {
    if (!professionalEventManager) return;

    // SingleUserEventManager doesn't have subscribeToState, so we'll use a different approach
    // We'll rely on the command execution callbacks instead
    console.log('[BlueprintTab] EventManager integration initialized (single-user mode)');
    
    // Return a cleanup function that does nothing for now
    return () => {
      console.log('[BlueprintTab] EventManager integration cleaned up');
    };
  }, [professionalEventManager]);

  // ✨ Command-Based Professional Change Detection (Adobe/Figma/Canva Style)
  useEffect(() => {
    let stabilizeTimer: NodeJS.Timeout;
    
    // ข้าม change detection ถ้ายังไม่พร้อม หรือกำลัง initialize
    if (!isSnapshotReady || isInitializingRef.current || isApplyingServerUpdateRef.current) {
      return;
    }
    
    if (onDirtyChange) {
      const performSmartChangeDetection = () => {
        // ✨ Professional Save Integration: ใช้ SingleUserEventManager เป็น single source of truth
        if (professionalEventManager) {
          // 🔥 ADOBE/FIGMA STYLE: ใช้ command-based detection แทน undo stack length
          const hasRealChanges = professionalEventManager.hasChanges();
          const eventManagerState = professionalEventManager.getState();
          
          onDirtyChange(hasRealChanges);
          
          console.log('[BlueprintTab] 🔍 Professional Command-Based Change Detection:', {
            hasChanges: hasRealChanges,
            saveButtonEnabled: hasRealChanges,
            undoStackLength: eventManagerState.undoStack.length,
            redoStackLength: eventManagerState.redoStack.length,
            isDirty: eventManagerState.isDirty,
            reason: hasRealChanges ? 'Has content changes' : 'No content changes (UI-only)',
            sessionDuration: initialSnapshot ? Math.round((Date.now() - initialSnapshot.timestamp) / 1000) + 's' : '0s',
            platform: typeof window !== 'undefined' ? 
                (window.navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop') : 'server'
          });
          return;
        }
        
        // Fallback: หากไม่มี EventManager (ไม่ควรเกิดขึ้นในโหมด Professional)
        console.warn('[BlueprintTab] ⚠️ No EventManager available for change detection');
        onDirtyChange(false);
      };

      // Stabilization - รอให้ React update state ก่อนตรวจสอบ
      stabilizeTimer = setTimeout(performSmartChangeDetection, 150);
    }

    return () => {
      if (stabilizeTimer) clearTimeout(stabilizeTimer);
    };
  }, [
    professionalEventManager,
    onDirtyChange, 
    isSnapshotReady,
    initialSnapshot
  ]);

  // Deep comparison function สำหรับ snapshots
  const deepCompareSnapshots = useCallback((snapshot1: any, snapshot2: any): boolean => {
    if (!snapshot1 || !snapshot2) return false;
    
    // เปรียบเทียบ nodes
    if (snapshot1.nodes.length !== snapshot2.nodes.length) return false;
    for (let i = 0; i < snapshot1.nodes.length; i++) {
      if (!deepCompareNodes(snapshot1.nodes[i], snapshot2.nodes[i])) return false;
    }
    
    // เปรียบเทียบ edges
    if (snapshot1.edges.length !== snapshot2.edges.length) return false;
    for (let i = 0; i < snapshot1.edges.length; i++) {
      if (!deepCompareEdges(snapshot1.edges[i], snapshot2.edges[i])) return false;
    }
    
    // เปรียบเทียบ story variables
    if (snapshot1.storyVariables.length !== snapshot2.storyVariables.length) return false;
    for (let i = 0; i < snapshot1.storyVariables.length; i++) {
      if (JSON.stringify(snapshot1.storyVariables[i]) !== JSON.stringify(snapshot2.storyVariables[i])) return false;
    }
    
    return true;
  }, []);

  // Professional node comparison
  const deepCompareNodes = useCallback((node1: any, node2: any): boolean => {
    if (node1.id !== node2.id) return false;
    if (node1.type !== node2.type) return false;
    if (Math.abs(node1.position.x - node2.position.x) > 1) return false;
    if (Math.abs(node1.position.y - node2.position.y) > 1) return false;
    
    // เปรียบเทียบ data object
    return JSON.stringify(node1.data || {}) === JSON.stringify(node2.data || {});
  }, []);

  // Professional edge comparison
  const deepCompareEdges = useCallback((edge1: any, edge2: any): boolean => {
    return (
      edge1.id === edge2.id &&
      edge1.source === edge2.source &&
      edge1.target === edge2.target &&
      (edge1.sourceHandle || '') === (edge2.sourceHandle || '') &&
      (edge1.targetHandle || '') === (edge2.targetHandle || '') &&
      JSON.stringify(edge1.data || {}) === JSON.stringify(edge2.data || {})
    );
  }, []);

  // อัปเดต initial snapshot หลังจาก save สำเร็จ
  const updateInitialSnapshotAfterSave = useCallback(() => {
    if (isSnapshotReady) {
      const newSnapshot = createStateSnapshot();
      setInitialSnapshot(newSnapshot);
      
      console.log('[BlueprintTab] 💾 Initial snapshot updated after successful save - Save button DISABLED');
      
      // อัปเดต EventManager ด้วยข้อมูลใหม่
      if (professionalEventManager) {
        professionalEventManager.updateSnapshot({
          nodes: newSnapshot.nodes,
          edges: newSnapshot.edges,
          storyVariables: newSnapshot.storyVariables,
          timestamp: Date.now(),
          version: 1
        });
      }
    }
  }, [isSnapshotReady, createStateSnapshot, professionalEventManager]);

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    // Manual save function
    handleManualSave: async () => {
      if (!isSnapshotReady || !initialSnapshot) {
        console.warn('[BlueprintTab] Cannot save: snapshot not ready');
        return;
      }

      const currentSnapshot = createStateSnapshot();
      const hasChanges = !deepCompareSnapshots(initialSnapshot, currentSnapshot);
      
      if (!hasChanges) {
        console.log('[BlueprintTab] No changes detected, skipping save');
        return;
      }

      try {
        if (professionalEventManager) {
          await professionalEventManager.saveManual();
        } else {
          // Fallback สำหรับ legacy system
          await onManualSave?.();
        }
        
        // อัปเดต snapshot หลังบันทึกสำเร็จ
        updateInitialSnapshotAfterSave();
        
      } catch (error) {
        console.error('[BlueprintTab] Manual save failed:', error);
        throw error;
      }
    },
    // Canvas state information via EventManager
    getCanvasState: () => {
      const eventManagerState = professionalEventManager?.getState();
      return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
        hasUndoHistory: eventManagerState?.undoStack.length > 0 || false,
        hasRedoHistory: eventManagerState?.redoStack.length > 0 || false,
      isInitialized: !isInitializingRef.current,
      isSnapshotReady: isSnapshotReady,
        hasUnsavedChanges: professionalEventManager?.hasChanges() || false
      };
    },
    // Professional snapshot management สำหรับ parent component
    updateInitialSnapshotAfterSave,
    // Smart save detection สำหรับ external checking
    hasUnsavedChanges: () => {
      if (!initialSnapshot || !isSnapshotReady) return false;
      return !deepCompareSnapshots(initialSnapshot, createStateSnapshot());
    }
  }), [
    onManualSave, 
    nodes, 
    edges, 
    isSnapshotReady, 
    initialSnapshot, 
    deepCompareSnapshots, 
    createStateSnapshot, 
    updateInitialSnapshotAfterSave,
    professionalEventManager
  ]);

  // ===============================
  // PROFESSIONAL REFRESH PROTECTION
  // เทียบเท่า Adobe Creative Suite และ Canva
  // ===============================

  // ป้องกันการ refresh เมื่อมีงานยังไม่บันทึก
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // ตรวจสอบว่ามีการเปลี่ยนแปลงที่ยังไม่บันทึกหรือไม่
      if (isSnapshotReady && initialSnapshot) {
        const currentSnapshot = createStateSnapshot();
        const hasUnsavedChanges = !deepCompareSnapshots(initialSnapshot, currentSnapshot);
        
        if (hasUnsavedChanges) {
          // แสดงข้อความเตือนแบบ professional
          const message = '🚨 คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก\n\nหากออกจากหน้านี้ การเปลี่ยนแปลงทั้งหมดจะสูญหาย\nกรุณาบันทึกงานก่อนออกจากหน้า';
          event.returnValue = message;
          return message;
        }
      }
    };

    // Professional-grade keyboard shortcuts (Canva/Figma style)
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S สำหรับ manual save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        
        if (isSnapshotReady && initialSnapshot) {
          const currentSnapshot = createStateSnapshot();
          const hasChanges = !deepCompareSnapshots(initialSnapshot, currentSnapshot);
          
          if (hasChanges) {
            // เรียก manual save ผ่าน parent component
            onManualSave?.();
          } else {
            console.log('[BlueprintTab] Ctrl+S pressed but no changes to save');
          }
        }
      }
      
      // Ctrl+Z สำหรับ Undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (professionalEventManager) {
          const success = professionalEventManager.undo();
          if (success) {
            console.log('[BlueprintTab] Undo executed via keyboard shortcut');
          }
        }
      }
      
      // Ctrl+Y หรือ Ctrl+Shift+Z สำหรับ Redo
      if (((event.ctrlKey || event.metaKey) && event.key === 'y') || 
          ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z')) {
        event.preventDefault();
        if (professionalEventManager) {
          const success = professionalEventManager.redo();
          if (success) {
            console.log('[BlueprintTab] Redo executed via keyboard shortcut');
          }
        }
      }
      
      // Ctrl+C สำหรับ Copy (selected nodes/edges) - ใช้ระบบ CommandContext ใหม่
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        event.preventDefault();
        
        // ✅ CRITICAL FIX: ใช้ selection state แทน node.selected
        const { selectedNodes: selectedNodeIds, selectedEdges: selectedEdgeIds } = selection;
        
        if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
          // ✅ ใช้ copySelected function ที่มี undo/redo tracking
          copySelected();
        } else {
          // Fallback: ตรวจสอบ ReactFlow selection
          const reactFlowSelectedNodes = nodes.filter(node => node.selected);
          const reactFlowSelectedEdges = edges.filter(edge => edge.selected);
          
          if (reactFlowSelectedNodes.length > 0 || reactFlowSelectedEdges.length > 0) {
            // Update selection state แล้ว copy
          setSelection(prev => ({
            ...prev,
              selectedNodes: reactFlowSelectedNodes.map(n => n.id),
              selectedEdges: reactFlowSelectedEdges.map(e => e.id)
            }));
            
            // ใช้ timeout เพื่อให้ state update ก่อน
            setTimeout(() => copySelected(), 10);
          }
        }
      }
      
      // Ctrl+V สำหรับ Paste - ใช้ระบบ CommandContext ใหม่
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        event.preventDefault();
        
        if (selection.clipboard.nodes.length > 0 || selection.clipboard.edges.length > 0) {
          // ✅ ใช้ pasteSelected function ที่มี undo/redo tracking
          pasteSelected();
        }
      }
      
      // Ctrl+X สำหรับ Cut (Copy + Delete) - ใช้ระบบ CommandContext ใหม่
      if ((event.ctrlKey || event.metaKey) && event.key === 'x') {
        event.preventDefault();
        
        // ✅ CRITICAL FIX: ใช้ selection state แทน node.selected
        const { selectedNodes: selectedNodeIds, selectedEdges: selectedEdgeIds } = selection;
        
        if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
          // ✅ ใช้ cutSelected function ที่มี undo/redo tracking
          cutSelected();
        } else {
          // Fallback: ตรวจสอบ ReactFlow selection
          const reactFlowSelectedNodes = nodes.filter(node => node.selected);
          const reactFlowSelectedEdges = edges.filter(edge => edge.selected);
          
          if (reactFlowSelectedNodes.length > 0 || reactFlowSelectedEdges.length > 0) {
            // Update selection state แล้ว cut
            setSelection(prev => ({
              ...prev,
              selectedNodes: reactFlowSelectedNodes.map(n => n.id),
              selectedEdges: reactFlowSelectedEdges.map(e => e.id)
            }));
            
            // ใช้ timeout เพื่อให้ state update ก่อน
            setTimeout(() => cutSelected(), 10);
          }
        }
      }
      
      // Delete key สำหรับการลบ selected items - ใช้ระบบ CommandContext ใหม่
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        
        // ✅ CRITICAL FIX: ใช้ selection state แทน node.selected
        const { selectedNodes: selectedNodeIds, selectedEdges: selectedEdgeIds } = selection;
        
        if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
          // ✅ ใช้ deleteSelected function ที่มี undo/redo tracking
          deleteSelected();
        } else {
          // Fallback: ตรวจสอบ ReactFlow selection
          const reactFlowSelectedNodes = nodes.filter(node => node.selected);
          const reactFlowSelectedEdges = edges.filter(edge => edge.selected);
          
          if (reactFlowSelectedNodes.length > 0 || reactFlowSelectedEdges.length > 0) {
            // Update selection state แล้ว delete
            setSelection(prev => ({
              ...prev,
              selectedNodes: reactFlowSelectedNodes.map(n => n.id),
              selectedEdges: reactFlowSelectedEdges.map(e => e.id)
            }));
            
            // ใช้ timeout เพื่อให้ state update ก่อน
            setTimeout(() => deleteSelected(), 10);
          }
        }
      }
    };

    // เพิ่ม event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSnapshotReady, initialSnapshot, createStateSnapshot, deepCompareSnapshots, onManualSave, commandAdapter, edges, executeCommand, nodes, professionalEventManager]);

  // ✅ FIGMA/ADOBE STYLE: Content change tracking refs สำหรับป้องกัน selection-triggered auto-save
  const prevNodesContent = useRef<string>('');
  const prevEdgesContent = useRef<string>('');
  const isInitialRender = useRef<boolean>(true);

  // ✅ ENHANCED: Trigger auto-save เมื่อมีการเปลี่ยนแปลง content จริงๆ (ไม่รวม selection changes)
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      // ✅ CRITICAL: ตรวจสอบเฉพาะ content changes (ไม่รวม selection state)
      const currentNodesContent = JSON.stringify(nodes.map(node => ({
        id: node.id,
        position: node.position,
        data: node.data,
        type: node.type
        // ✅ NOTE: ไม่รวม 'selected' property เพื่อ ignore selection changes
      })));
      
      const currentEdgesContent = JSON.stringify(edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: edge.data
        // ✅ NOTE: ไม่รวม 'selected' property เพื่อ ignore selection changes
      })));
      
      // ✅ CRITICAL FIX: Initialize refs on first render to prevent false positive
      if (isInitialRender.current) {
        prevNodesContent.current = currentNodesContent;
        prevEdgesContent.current = currentEdgesContent;
        isInitialRender.current = false;
        console.log('[BlueprintTab] 🔄 Initial content refs initialized, skipping auto-save');
        return;
      }
      
      // ✅ FIGMA/ADOBE STYLE: Only trigger auto-save for real content changes
      if (currentNodesContent !== prevNodesContent.current || 
          currentEdgesContent !== prevEdgesContent.current) {
        
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
        
        console.log('[BlueprintTab] 🔄 Real content changes detected, triggering auto-save');
        debouncedAutoSave(commandData);
        
        // ✅ Update refs for next comparison
        prevNodesContent.current = currentNodesContent;
        prevEdgesContent.current = currentEdgesContent;
      } else {
        console.log('[BlueprintTab] 👆 Selection-only changes detected, skipping auto-save trigger');
      }
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
      if (!professionalEventManager || !mounted) return;
      
      try {
        // EventManager handles validation internally
        // await professionalEventManager.validateWithDatabase();
        
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
          storyVariables: cleanStoryVariables(storyMap?.storyVariables || [])
        };
        
        // ตรวจสอบว่าต้อง enable ปุ่ม save หรือไม่
        const hasChanges = professionalEventManager.hasChanges();
        
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
  }, [professionalEventManager, nodes, edges, storyMap?.storyVariables]);
  
  // Selection state
  const [selection, setSelection] = useState<SelectionState>({
    selectedNodes: [],
    selectedEdges: [],
    multiSelectMode: false,
    clipboard: { nodes: [], edges: [] },
    isSelectionMode: false,
    pendingSelection: [],
    showSelectionBar: false,
    isReactFlowInstantMode: false // 🎯 เริ่มต้นเป็น false
  });
  
  // Multi-select UI state
  const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
  const [multiSelectStartPosition, setMultiSelectStartPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Previous selection tracking to prevent infinite loops
  const previousSelectionRef = useRef<{ nodes: string[]; edges: string[] }>({ nodes: [], edges: [] });
  
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
  // reactFlowInstance ถูกย้ายไปด้านบนแล้ว

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
        storyVariables: cleanStoryVariables(storyMap?.storyVariables || []),
        episodeFilter: selectedEpisodeFromBlueprint,
        version: saveState.version // Send current version for conflict detection
      };

      const apiUrl = selectedEpisodeFromBlueprint 
        ? `/api/novels/${novel.slug}/episodes/${selectedEpisodeFromBlueprint._id}/storymap/save`
        : `/api/novels/${encodeURIComponent(novel.slug)}/storymap`;
      const response = await fetch(apiUrl, {
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
  }, [novel?.slug, storyMap?.storyVariables, selectedEpisodeFromBlueprint, onDirtyChange, blueprintSettings, saveState.version, setEdges, setNodes]);

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

      const apiUrl = selectedEpisodeFromBlueprint 
        ? `/api/novels/${novel.slug}/episodes/${selectedEpisodeFromBlueprint._id}/storymap/save`
        : `/api/novels/${novel.slug}/storymap/patch`;
      const response = await fetch(apiUrl, {
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
      
      // ✨ Professional Auto-save Integration (Adobe/Canva/Figma style)
      if (professionalEventManager && autoSaveSettings.enabled) {
        // EventManager handles auto-save through command execution
        // Commands are automatically tracked and saved
        const hasChanges = professionalEventManager.hasChanges();
        
        if (hasChanges) {
          // EventManager will handle the auto-save based on its configuration
          console.log('[BlueprintTab] 🔄 EventManager handling auto-save');
        } else {
          console.log('[BlueprintTab] ✓ No changes detected, skipping auto-save');
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
      
    }, [autoSaveSettings.enabled, professionalEventManager, onDirtyChange, savePatchToDatabase]);

  // Command Pattern functions

  // State สำหรับ force re-render UI เมื่อ EventManager state เปลี่ยน
  const [forceUIUpdate, setForceUIUpdate] = useState(0);

  // เก็บ reference ของ EventManager state เพื่อเปรียบเทียบ
  const previousEventManagerState = useRef<any>(null);
  
  // Real-time UI State Sync กับ EventManager
  useEffect(() => {
    if (!professionalEventManager) return;
    
    const updateUI = () => {
      const state = professionalEventManager.getState();
      console.log(`[BlueprintTab] 🔄 EventManager state changed: Undo: ${state.undoStack.length}, Redo: ${state.redoStack.length}, isDirty: ${state.isDirty}`);
      
      // Force re-render toolbar และ UI elements ด้วย state ใหม่
      setForceUIUpdate(prev => prev + 1);
      
      // อัปเดต dirty state ไปยัง parent ทันที
      if (onDirtyChange) {
        onDirtyChange(state.isDirty);
      }
    };
    
    // Initialize previous state
    if (!previousEventManagerState.current) {
      previousEventManagerState.current = professionalEventManager.getState();
    }
    
    // Polling approach สำหรับ real-time sync (เนื่องจาก EventManager ไม่มี event emitter)
    const stateUpdateInterval = setInterval(() => {
      const currentState = professionalEventManager.getState();
      const previousState = previousEventManagerState.current;
      
      // ตรวจสอบว่า state เปลี่ยนแปลงหรือไม่
      if (!previousState || 
          currentState.undoStack.length !== previousState.undoStack.length ||
          currentState.redoStack.length !== previousState.redoStack.length ||
          currentState.isDirty !== previousState.isDirty) {
        updateUI();
        previousEventManagerState.current = { ...currentState };
      }
    }, 100); // ตรวจสอบทุก 100ms สำหรับ responsiveness
    
    return () => {
      if (stateUpdateInterval) {
        clearInterval(stateUpdateInterval);
      }
    };
  }, [professionalEventManager, onDirtyChange]);

  // 🔥 FIGMA/CANVA STYLE: Professional Undo function using EventManager
  const undo = useCallback(() => {
    if (!professionalEventManager) {
      toast.warning('ระบบ Undo ไม่พร้อมใช้งาน');
      return false;
    }

    const eventManagerState = professionalEventManager.getState();
    if (eventManagerState.undoStack.length === 0) {
      toast.info('ไม่มีการกระทำที่จะ Undo');
      return false;
    }

    // 🔥 FIGMA/CANVA STYLE: Execute undo และ force UI update ทันที
    const success = professionalEventManager.undo();
    
    if (success) {
      // ✅ CRITICAL FIX: ไม่จำเป็นต้อง manual sync เพราะ CommandContext จะ handle
      // CommandContext.setNodes/setEdges จะ trigger reactFlowUpdater อัตโนมัติ
      
      console.log(`[BlueprintTab] 🔄 Figma/Canva style undo executed - CommandContext handles UI sync automatically`);
      
      // Force re-render UI components เพื่อแสดงสถานะ undo/redo ใหม่
      setForceUIUpdate(prev => prev + 1);
      
      toast.success('↶ Undo สำเร็จ');
      return true;
    }
    
    return false;
  }, [professionalEventManager]);

  // 🔥 FIGMA/CANVA STYLE: Professional Redo function using EventManager
  const redo = useCallback(() => {
    if (!professionalEventManager) {
      toast.warning('ระบบ Redo ไม่พร้อมใช้งาน');
      return false;
    }

    const eventManagerState = professionalEventManager.getState();
    if (eventManagerState.redoStack.length === 0) {
      toast.info('ไม่มีการกระทำที่จะ Redo');
      return false;
    }

    // 🔥 FIGMA/CANVA STYLE: Execute redo และ force UI update ทันที
    const success = professionalEventManager.redo();
    
    if (success) {
      // ✅ CRITICAL FIX: CommandContext handles UI sync automatically
      console.log(`[BlueprintTab] 🔄 Figma/Canva style redo executed - CommandContext handles UI sync automatically`);
      
      // Force re-render UI components เพื่อแสดงสถานะ undo/redo ใหม่
      setForceUIUpdate(prev => prev + 1);
      
      toast.success('↷ Redo สำเร็จ');
      return true;
    }
    
    return false;
  }, [professionalEventManager]);

  // Command factory functions
  // 🔥 FIGMA/CANVA STYLE: Command factory functions using CommandContext
  const createNodeCommand = useCallback((
    type: NodeCommand['type'],
    nodeId: string,
    nodeData?: Node,
    oldPosition?: { x: number; y: number },
    newPosition?: { x: number; y: number },
    oldData?: any,
    newData?: any
  ): NodeCommand => {
    if (!professionalEventManager) {
      throw new Error('EventManager is required for command creation');
    }
    
    // ✅ ใช้ CommandContext เป็นหลักแทน local state
    const context = professionalEventManager.getCommandContext();
    
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
              // ✅ ใช้ CommandContext แทน local setState
              const currentNodes = context.getCurrentNodes();
              context.setNodes([...currentNodes, nodeData]);
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
            // ✅ ใช้ CommandContext
            const currentNodes = context.getCurrentNodes();
            context.setNodes(currentNodes.filter((n: any) => n.id !== nodeId));
            break;
          case 'UPDATE_NODE':
            if (newData) {
              // ✅ ใช้ CommandContext
              const currentNodes = context.getCurrentNodes();
              context.setNodes(currentNodes.map((n: any) => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
            }
            break;
          case 'MOVE_NODE':
            if (newPosition) {
              // ✅ ใช้ CommandContext
              const currentNodes = context.getCurrentNodes();
              context.setNodes(currentNodes.map((n: any) => n.id === nodeId ? { ...n, position: newPosition } : n));
            }
            break;
        }
      },
      undo: () => {
        switch (type) {
          case 'ADD_NODE':
            // ✅ ใช้ CommandContext - ไม่มี setTimeout
            const currentNodesForUndo = context.getCurrentNodes();
            context.setNodes(currentNodesForUndo.filter((n: any) => n.id !== nodeId));
            break;
          case 'DELETE_NODE':
            if (nodeData) {
              // ✅ ใช้ CommandContext
              const currentNodes = context.getCurrentNodes();
              context.setNodes([...currentNodes, nodeData]);
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
              // ✅ ใช้ CommandContext
              const currentNodes = context.getCurrentNodes();
              context.setNodes(currentNodes.map((n: any) => n.id === nodeId ? { ...n, data: { ...n.data, ...oldData } } : n));
            }
            break;
          case 'MOVE_NODE':
            if (oldPosition) {
              // ✅ ใช้ CommandContext
              const currentNodes = context.getCurrentNodes();
              context.setNodes(currentNodes.map((n: any) => n.id === nodeId ? { ...n, position: oldPosition } : n));
            }
            break;
        }
      }
    };
    
    return command;
  }, [professionalEventManager, setDeletedItems]);

  // 🔥 FIGMA/CANVA STYLE: Edge Command factory using CommandContext
  const createEdgeCommand = useCallback((
    type: EdgeCommand['type'],
    edgeId: string,
    edgeData?: Edge,
    sourceNodeId?: string,
    targetNodeId?: string,
    oldData?: any,
    newData?: any
  ): EdgeCommand => {
    if (!professionalEventManager) {
      throw new Error('EventManager is required for edge command creation');
    }
    
    // ✅ ใช้ CommandContext เป็นหลักแทน local state
    const context = professionalEventManager.getCommandContext();
    
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
              // ✅ ใช้ CommandContext แทน local setState
              const currentEdges = context.getCurrentEdges();
              context.setEdges([...currentEdges, edgeData]);
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
            // ✅ ใช้ CommandContext
            const currentEdges = context.getCurrentEdges();
            context.setEdges(currentEdges.filter((e: any) => e.id !== edgeId));
            break;
          case 'UPDATE_EDGE':
            if (newData) {
              // ✅ ใช้ CommandContext
              const currentEdges = context.getCurrentEdges();
              context.setEdges(currentEdges.map((e: any) => e.id === edgeId ? { ...e, ...newData } : e));
            }
            break;
        }
      },
      undo: () => {
        switch (type) {
          case 'ADD_EDGE':
            // ✅ ใช้ CommandContext - ไม่มี setTimeout
            const currentEdgesForUndo = context.getCurrentEdges();
            context.setEdges(currentEdgesForUndo.filter((e: any) => e.id !== edgeId));
            break;
          case 'DELETE_EDGE':
            if (edgeData) {
              // ✅ ใช้ CommandContext
              const currentEdges = context.getCurrentEdges();
              context.setEdges([...currentEdges, edgeData]);
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
              // ✅ ใช้ CommandContext
              const currentEdges = context.getCurrentEdges();
              context.setEdges(currentEdges.map((e: any) => e.id === edgeId ? { ...e, ...oldData } : e));
            }
            break;
        }
      }
    };
    
    return command;
  }, [professionalEventManager, setDeletedItems]);

  // Manual save (always works regardless of auto-save setting)
  const handleManualSave = useCallback(async () => {
    // Clear auto-save timer since we're manually saving
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    // 🔥 ADOBE/FIGMA STYLE: ตรวจสอบการเปลี่ยนแปลงก่อนบันทึก
    if (professionalEventManager && !professionalEventManager.hasChanges()) {
      toast.info('🔍 ไม่มีการเปลี่ยนแปลงที่ต้องบันทึก', {
        description: 'เนื้อหาปัจจุบันตรงกับที่บันทึกไว้แล้ว'
      });
      return;
    }

    try {
      if (professionalEventManager) {
        // ใช้ EventManager สำหรับ manual save
        await professionalEventManager.saveManual();
        
        // ✨ NEW: Mark current command position as saved via EventManager
        const eventManagerState = professionalEventManager.getState();
        setLastSavedCommandPosition(eventManagerState.undoStack.length);
        
        // Update initial snapshot to current state for fallback comparison
        const newSnapshot = createStateSnapshot();
        setInitialSnapshot(newSnapshot);
        
        // Update EventManager with new baseline
        professionalEventManager.updateSnapshot({
          nodes: newSnapshot.nodes,
          edges: newSnapshot.edges,
          storyVariables: newSnapshot.storyVariables,
          timestamp: Date.now(),
          version: 1
        });
        
        // Force dirty state to false
        if (onDirtyChange) {
          onDirtyChange(false);
        }
        
        toast.success('✅ บันทึกสำเร็จ');
        
        console.log('[BlueprintTab] 💾 Manual Save Success:', {
          savedAtCommandPosition: eventManagerState.undoStack.length,
          nodeCount: newSnapshot.nodes.length,
          edgeCount: newSnapshot.edges.length,
          timestamp: new Date().toISOString()
        });
        
      } else {
        // Fallback ไปยังระบบเดิม
        await saveStoryMapToDatabase(nodes, edges, true);
        
        // ✨ NEW: Mark current command position as saved (fallback)
        // Note: Fallback mode won't have EventManager undoStack, using 0 as default
        setLastSavedCommandPosition(0);
        
        // Update initial snapshot for fallback
        const newSnapshot = createStateSnapshot();
        setInitialSnapshot(newSnapshot);
        
        // Force dirty state to false
        if (onDirtyChange) {
          onDirtyChange(false);
        }
        
        toast.success('✅ บันทึกสำเร็จ');
      }
    } catch (error) {
      console.error('[BlueprintTab] Manual save failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // 🔥 ADOBE/FIGMA STYLE: Handle duplicate save gracefully
      if (errorMessage === 'SAVE_IN_PROGRESS') {
        toast.info('⏳ กำลังบันทึกอยู่', {
          description: 'กรุณารอการบันทึกปัจจุบันให้เสร็จสิ้น'
        });
        return;
      }
      
      if (errorMessage === 'DUPLICATE_DATA') {
        toast.info('🔄 ไม่มีการเปลี่ยนแปลงใหม่', {
          description: 'ข้อมูลถูกบันทึกไว้แล้ว'
        });
        return;
      }
      
      toast.error('❌ บันทึกล้มเหลว: ' + errorMessage);
    }
  }, [professionalEventManager, saveStoryMapToDatabase, nodes, edges, createStateSnapshot, onDirtyChange]);

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
  }, [storyMap, scenes, setNodes, setEdges, currentBlueprintSettings.showNodeLabels, currentBlueprintSettings.showSceneThumbnails]);



  // Keyboard shortcuts for undo/redo with Command Pattern
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Professional Undo/Redo shortcuts using SingleUserEventManager
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (professionalEventManager?.undo()) {
          toast.success('↶ Undo สำเร็จ (Ctrl+Z)');
        } else {
          toast.info('ไม่มีการเปลี่ยนแปลงที่จะ undo');
        }
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      else if ((event.ctrlKey && event.shiftKey && event.key === 'Z') || 
               (event.ctrlKey && event.key === 'y')) {
        event.preventDefault();
        if (professionalEventManager?.redo()) {
          toast.success('↷ Redo สำเร็จ (Ctrl+Y)');
        } else {
          toast.info('ไม่มีการเปลี่ยนแปลงที่จะ redo');
        }
      }
      // Save: Ctrl+S
      else if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleManualSave, professionalEventManager]);

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

  // 🔥 FIGMA/CANVA STYLE: Multi-select delete using CommandContext
  const deleteSelected = useCallback(async () => {
    const { selectedNodes, selectedEdges } = selection;
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
    
    const nodesToDelete = nodes.filter(n => selectedNodes.includes(n.id));
    const edgesToDelete = edges.filter(e => selectedEdges.includes(e.id));
    
    // ❌ REMOVED: Episode node deletion logic - Episodes ไม่ควรเป็น nodes บน canvas
    // const episodeNodesToDelete = nodesToDelete.filter(node => 
    //   node.data.nodeType === StoryMapNodeType.EPISODE_NODE && node.data.episodeId
    // );
    
    // ✅ CRITICAL FIX: Include edges connected to deleted nodes
    const allEdgesToDelete = [
      ...edgesToDelete,
      ...edges.filter(e => 
        !selectedEdges.includes(e.id) && 
        (selectedNodes.includes(e.source) || selectedNodes.includes(e.target))
      )
    ];
    
    if (nodesToDelete.length > 0) {
      const totalItemsToDelete = nodesToDelete.length + allEdgesToDelete.length;
      const confirmMessage = `ลบ ${nodesToDelete.length} โหนดและ ${allEdgesToDelete.length} เส้นเชื่อม (รวม ${totalItemsToDelete} รายการ) หรือไม่?\n\n✅ สามารถ Undo ได้ด้วย Ctrl+Z`;
      
      // ❌ REMOVED: Special warning for episode nodes - Episodes are database-only entities
      // if (episodeNodesToDelete.length > 0) {
      //   confirmMessage += `\n\n⚠️ จะลบตอนออกจาก Database ด้วย: ${episodeNodesToDelete.map(n => n.data.title).join(', ')}`;
      // }
      
      const ok = window.confirm(confirmMessage);
      if (!ok) return;
    }
    
    // ❌ REMOVED: Episode deletion from database - Episodes are managed separately
    // if (episodeNodesToDelete.length > 0) {
    //   try {
    //     for (const episodeNode of episodeNodesToDelete) {
    //       await handleDeleteEpisode(episodeNode.data.episodeId as string);
    //     }
    //   } catch (error) {
    //     console.error('Failed to delete episodes from database:', error);
    //     toast.error('ไม่สามารถลบตอนจาก Database ได้');
    //     return;
    //   }
    // }
    
    if (!professionalEventManager) {
      toast.error('ระบบ Undo/Redo ไม่พร้อมใช้งาน');
      return;
    }
    
    // ✅ ใช้ CommandContext สำหรับ batch operations
    const context = professionalEventManager.getCommandContext();
    
        // ✅ FIGMA/CANVA STYLE: Create batch command for multiple deletions
    const batchCommand: ICommand = {
        id: `batch-delete-${Date.now()}`,
      type: 'BATCH_DELETE',
      description: `Delete ${nodesToDelete.length} nodes and ${allEdgesToDelete.length} connections`,
        timestamp: Date.now(),
        execute: () => {
        // ✅ ใช้ CommandContext แทน local state
        const currentNodes = context.getCurrentNodes();
        const currentEdges = context.getCurrentEdges();
        
        // Remove selected nodes and all associated edges
        const filteredNodes = currentNodes.filter((n: any) => !selectedNodes.includes(n.id));
        const filteredEdges = currentEdges.filter((e: any) => 
          !allEdgesToDelete.some(edgeToDelete => edgeToDelete.id === e.id)
        );
        
        context.setNodes(filteredNodes);
        context.setEdges(filteredEdges);
        
        // Clear selection state
    setSelection(prev => ({
      ...prev,
      selectedNodes: [],
      selectedEdges: []
    }));
        setSelectedNode(null);
        setSelectedEdge(null);
        
        console.log(`[BlueprintTab] 🗑️ Batch delete executed: ${nodesToDelete.length} nodes, ${allEdgesToDelete.length} edges`);
      },
      undo: () => {
        // ✅ ใช้ CommandContext สำหรับ restore
        const currentNodes = context.getCurrentNodes();
        const currentEdges = context.getCurrentEdges();
        
        // Restore deleted nodes and edges
        const restoredNodes = [...currentNodes, ...nodesToDelete];
        const restoredEdges = [...currentEdges, ...allEdgesToDelete];
        
        context.setNodes(restoredNodes);
        context.setEdges(restoredEdges);
        
        console.log(`[BlueprintTab] ↶ Batch delete undone: ${nodesToDelete.length} nodes, ${allEdgesToDelete.length} edges restored`);
      }
    };
    
    // Execute through EventManager for proper undo/redo tracking
    professionalEventManager.executeCommand(batchCommand);
    
    toast.success(
      `🗑️ Deleted ${nodesToDelete.length} nodes and ${allEdgesToDelete.length} connections. Use Ctrl+Z to undo.`
    );
  }, [selection, nodes, edges, professionalEventManager, handleDeleteEpisode]);

  // 🔥 FIGMA/CANVA STYLE: Multi-select copy using CommandContext
  const copySelected = useCallback(() => {
    const { selectedNodes, selectedEdges } = selection;
    const nodesToCopy = nodes.filter(n => selectedNodes.includes(n.id));
    const edgesToCopy = edges.filter(e => selectedEdges.includes(e.id));
    
    if (nodesToCopy.length === 0 && edgesToCopy.length === 0) {
      toast.warning('ไม่มีรายการที่จะคัดลอก');
      return;
    }
    
    if (!professionalEventManager) {
      toast.error('ระบบ Undo/Redo ไม่พร้อมใช้งาน');
      return;
    }
    
    // Create batch copy command for undo/redo history
    const copyCommand: ICommand = {
      id: `batch-copy-${Date.now()}`,
      type: 'BATCH_COPY',
      description: `Copy ${nodesToCopy.length} nodes and ${edgesToCopy.length} connections`,
      timestamp: Date.now(),
      execute: () => {
        setSelection(prev => ({
          ...prev,
          clipboard: { nodes: nodesToCopy, edges: edgesToCopy }
        }));
        toast.success(`คัดลอก ${nodesToCopy.length} โหนดและ ${edgesToCopy.length} เส้นเชื่อม`);
      },
      undo: () => {
        setSelection(prev => ({
          ...prev,
          clipboard: { nodes: [], edges: [] }
        }));
        toast.info('ยกเลิกการคัดลอก');
      }
    };
    
    // Execute through EventManager for proper undo/redo tracking
    professionalEventManager.executeCommand(copyCommand);
  }, [selection, nodes, edges, professionalEventManager]);

  // 🔥 FIGMA/CANVA STYLE: Multi-select cut (copy + delete) using CommandContext
  const cutSelected = useCallback(() => {
    const { selectedNodes, selectedEdges } = selection;
    const nodesToCut = nodes.filter(n => selectedNodes.includes(n.id));
    const edgesToCut = edges.filter(e => selectedEdges.includes(e.id));
    
    // ✅ CRITICAL FIX: Include edges connected to cut nodes
    const allEdgesToCut = [
      ...edgesToCut,
      ...edges.filter(e => 
        !selectedEdges.includes(e.id) && 
        (selectedNodes.includes(e.source) || selectedNodes.includes(e.target))
      )
    ];
    
    if (nodesToCut.length === 0 && edgesToCut.length === 0) {
      toast.warning('ไม่มีรายการที่จะตัด');
      return;
    }
    
    if (!professionalEventManager) {
      toast.error('ระบบ Undo/Redo ไม่พร้อมใช้งาน');
      return;
    }
    
    // ✅ ใช้ CommandContext สำหรับ batch operations
    const context = professionalEventManager.getCommandContext();
    
    // ✅ FIGMA/CANVA STYLE: Create batch cut command (copy to clipboard then delete)
    const cutCommand: ICommand = {
      id: `batch-cut-${Date.now()}`,
      type: 'BATCH_CUT',
      description: `Cut ${nodesToCut.length} nodes and ${allEdgesToCut.length} connections`,
      timestamp: Date.now(),
      execute: () => {
        // Step 1: Copy to clipboard (only explicitly selected items)
        setSelection(prev => ({
          ...prev,
          clipboard: { nodes: nodesToCut, edges: edgesToCut }
        }));
        
        // Step 2: Delete items using CommandContext (including connected edges)
        const currentNodes = context.getCurrentNodes();
        const currentEdges = context.getCurrentEdges();
        
        // Remove selected nodes and all associated edges
        const filteredNodes = currentNodes.filter((n: any) => !selectedNodes.includes(n.id));
        const filteredEdges = currentEdges.filter((e: any) => 
          !allEdgesToCut.some(edgeToCut => edgeToCut.id === e.id)
        );
        
        context.setNodes(filteredNodes);
        context.setEdges(filteredEdges);
        
        // Clear selection state
        setSelection(prev => ({
          ...prev,
          selectedNodes: [],
          selectedEdges: []
        }));
        setSelectedNode(null);
        setSelectedEdge(null);
        
        console.log(`[BlueprintTab] ✂️ Batch cut executed: ${nodesToCut.length} nodes, ${allEdgesToCut.length} edges`);
      },
      undo: () => {
        // Step 1: Restore deleted nodes and edges
        const currentNodes = context.getCurrentNodes();
        const currentEdges = context.getCurrentEdges();
        
        const restoredNodes = [...currentNodes, ...nodesToCut];
        const restoredEdges = [...currentEdges, ...allEdgesToCut];
        
        context.setNodes(restoredNodes);
        context.setEdges(restoredEdges);
        
        // Step 2: Clear clipboard
        setSelection(prev => ({
          ...prev,
          clipboard: { nodes: [], edges: [] }
        }));
        
        console.log(`[BlueprintTab] ↶ Batch cut undone: ${nodesToCut.length} nodes, ${allEdgesToCut.length} edges restored`);
      }
    };
    
    // Execute through EventManager for proper undo/redo tracking
    professionalEventManager.executeCommand(cutCommand);
    
    toast.success(
      `✂️ Cut ${nodesToCut.length} nodes and ${allEdgesToCut.length} connections to clipboard. Use Ctrl+Z to undo.`
    );
  }, [selection, nodes, edges, professionalEventManager]);

  // 🔥 FIGMA/CANVA STYLE: Multi-select paste using CommandContext
  const pasteSelected = useCallback(() => {
    const { clipboard } = selection;
    if (clipboard.nodes.length === 0 && clipboard.edges.length === 0) {
      toast.error('📋 Clipboard is empty');
      return;
    }
    
    if (!professionalEventManager) {
      toast.error('ระบบ Undo/Redo ไม่พร้อมใช้งาน');
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
    
    // ✅ ใช้ CommandContext สำหรับ batch operations
    const context = professionalEventManager.getCommandContext();
    
    // ✅ FIGMA/CANVA STYLE: Create batch paste command
    const batchPasteCommand: ICommand = {
        id: `batch-paste-${timestamp}`,
      type: 'BATCH_PASTE',
      description: `Paste ${newNodes.length} nodes and ${newEdges.length} connections`,
        timestamp,
        execute: () => {
        // Add nodes and edges using CommandContext
        const currentNodes = context.getCurrentNodes();
        const currentEdges = context.getCurrentEdges();
        
        const updatedNodes = [...currentNodes, ...newNodes];
        const updatedEdges = [...currentEdges, ...newEdges];
        
        context.setNodes(updatedNodes);
        context.setEdges(updatedEdges);
        
        // Update selection to show pasted items
        setSelection(prev => ({
          ...prev,
          selectedNodes: newNodes.map(n => n.id),
          selectedEdges: newEdges.map(e => e.id)
        }));
        
        console.log(`[BlueprintTab] 📋 Batch paste executed: ${newNodes.length} nodes, ${newEdges.length} edges`);
        },
        undo: () => {
        // Remove pasted nodes and edges using CommandContext
        const currentNodes = context.getCurrentNodes();
        const currentEdges = context.getCurrentEdges();
        
        const filteredNodes = currentNodes.filter((n: any) => 
          !newNodes.some(newNode => newNode.id === n.id)
        );
        const filteredEdges = currentEdges.filter((e: any) => 
          !newEdges.some(newEdge => newEdge.id === e.id)
        );
        
        context.setNodes(filteredNodes);
        context.setEdges(filteredEdges);
        
        // Clear selection
        setSelection(prev => ({
          ...prev,
          selectedNodes: [],
          selectedEdges: []
        }));
        
        console.log(`[BlueprintTab] ↶ Batch paste undone: ${newNodes.length} nodes, ${newEdges.length} edges removed`);
      }
    };
    
    // Execute through EventManager for proper undo/redo tracking
    professionalEventManager.executeCommand(batchPasteCommand);
    
    toast.success(`📋 Pasted ${newNodes.length} nodes and ${newEdges.length} connections. Use Ctrl+Z to undo.`);
  }, [selection, professionalEventManager]);

  // (removed older keyboard handler in favor of a single consolidated one below)

  // Keyboard shortcuts
  // 🔥 CANVA STYLE: Toggle multi-select mode
  const toggleMultiSelectMode = useCallback(() => {
    const currentMode = selection.multiSelectMode;
    const newMode = !currentMode;
    
    console.log(`[BlueprintTab] 🎯 Toggling multi-select mode: ${currentMode} → ${newMode}`);
    
    setSelection(prev => ({
      ...prev,
      multiSelectMode: newMode,
      pendingSelection: [], // เริ่มใหม่เมื่อเปิด/ปิด multi-select mode
      showSelectionBar: false, // ไม่แสดง confirmation bar ตอนเริ่มต้น
      selectedNodes: newMode ? [] : prev.selectedNodes, // ล้าง selection เมื่อเข้า mode, คงเก่าเมื่อออก
      selectedEdges: newMode ? [] : prev.selectedEdges,
      isReactFlowInstantMode: false // 🎯 รีเซ็ต ReactFlow instant mode เมื่อเข้า manual mode
    }));
    
    setIsMultiSelectActive(newMode);
    
    // ล้าง ReactFlow selection เมื่อเข้า multi-select mode
    if (newMode) {
      setNodes(prevNodes => 
        prevNodes.map(n => ({ ...n, selected: false }))
      );
      setEdges(prevEdges => 
        prevEdges.map(e => ({ ...e, selected: false }))
      );
      
      // Clear single selection states
      setSelectedNode(null);
      setSelectedEdge(null);
      
      toast.info('🎯 Multi-select mode activated. Click nodes to select multiple items.');
    } else {
      // Cancel any pending selection when deactivating
      setNodes(prevNodes => 
        prevNodes.map(n => ({ ...n, selected: false }))
      );
      
      toast.info('✅ Multi-select mode deactivated.');
    }
  }, [selection.multiSelectMode, setNodes, setEdges]);

  // 🔥 FIGMA/CANVA STYLE: Confirm multi-selection with complete undo/redo support
  const confirmMultiSelection = useCallback(() => {
    const pendingNodeIds = selection.pendingSelection;
    
    if (!professionalEventManager) {
      toast.error('ระบบ Undo/Redo ไม่พร้อมใช้งาน');
      return;
    }
    
    // 🎯 จัดเก็บสถานะเดิมก่อนการเปลี่ยนแปลง (สำหรับ undo ที่สมบูรณ์)
    const previousSelection = {
      nodes: [...selection.selectedNodes],
      edges: [...selection.selectedEdges],
      multiSelectMode: selection.multiSelectMode,
      pendingSelection: [...selection.pendingSelection],
      showSelectionBar: selection.showSelectionBar
    };
    
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
          multiSelectMode: true, // 🔧 FIX: ต้องเป็น true เพื่อให้ info panel แสดงผล
          isReactFlowInstantMode: false // 🎯 ไม่ใช่ ReactFlow instant mode หลัง confirm
        }));
        
        // 🔥 FIGMA STYLE: อัปเดต ReactFlow visual selection ให้ sync สมบูรณ์
        setNodes(prevNodes => 
          prevNodes.map(n => ({
            ...n,
            selected: pendingNodeIds.includes(n.id)
          }))
        );
        setEdges(prevEdges => 
          prevEdges.map(e => ({ ...e, selected: false }))
        );

        // 🔥 CRITICAL FIX: บังคับให้ ReactFlow instance sync selection state อย่างแน่นอน
        if (reactFlowInstance) {
          setTimeout(() => {
            const allNodes = reactFlowInstance.getNodes();
            const allEdges = reactFlowInstance.getEdges();
            
            reactFlowInstance.setNodes(
              allNodes.map(node => ({
                ...node,
                selected: pendingNodeIds.includes(node.id)
              }))
            );
            
            reactFlowInstance.setEdges(
              allEdges.map(edge => ({
                ...edge,
                selected: false
              }))
            );
            
            console.log(`[BlueprintTab] 🔄 ReactFlow instance force synced for execute with ${pendingNodeIds.length} selected nodes`);
          }, 0);
        }
        
        // ล้าง single selection states
        setSelectedNode(null);
        setSelectedEdge(null);
        setIsMultiSelectActive(false);
        
        console.log(`[BlueprintTab] ✅ Multi-selection confirmed: ${pendingNodeIds.length} nodes`);
      },
      undo: () => {
        // 🎯 คืนสถานะเดิมอย่างสมบูรณ์
        setSelection(prev => ({
          ...prev,
          selectedNodes: previousSelection.nodes,
          selectedEdges: previousSelection.edges,
          multiSelectMode: previousSelection.multiSelectMode,
          pendingSelection: previousSelection.pendingSelection,
          showSelectionBar: previousSelection.showSelectionBar
        }));
        
        // 🔥 FIGMA STYLE: ล้าง ReactFlow visual selection สมบูรณ์
        setNodes(prevNodes => 
          prevNodes.map(n => ({ ...n, selected: false }))
        );
        setEdges(prevEdges => 
          prevEdges.map(e => ({ ...e, selected: false }))
        );
        
        // 🔥 FIGMA STYLE: บังคับให้ ReactFlow instance ล้าง selection อย่างแน่นอน
        if (reactFlowInstance) {
          setTimeout(() => {
            // Force clear undo state
            reactFlowInstance.setNodes(
              reactFlowInstance.getNodes().map(node => ({
                ...node,
                selected: false
              }))
            );
            
            reactFlowInstance.setEdges(
              reactFlowInstance.getEdges().map(edge => ({
                ...edge,
                selected: false
              }))
            );
            
            // Double clear เพื่อให้แน่ใจ (Figma-style reliability)
            setTimeout(() => {
              reactFlowInstance.setNodes(
                reactFlowInstance.getNodes().map(node => ({
                  ...node,
                  selected: false
                }))
              );
              console.log(`[BlueprintTab] 🔄 Manual multi-select undo double-cleared all selections`);
            }, 50);
            
            console.log(`[BlueprintTab] 🔄 ReactFlow instance force cleared for manual undo`);
          }, 10);
        }
        
        setSelectedNode(null);
        setSelectedEdge(null);
        setIsMultiSelectActive(false);
        
        console.log(`[BlueprintTab] ↶ Multi-selection undone`);
      },
      redo: () => {
        // 🔥 FIGMA STYLE: explicit redo method สำหรับความชัดเจน
        setSelection(prev => ({
          ...prev,
          selectedNodes: pendingNodeIds,
          selectedEdges: [],
          pendingSelection: [],
          showSelectionBar: false,
          multiSelectMode: true, // 🔧 FIX: ต้องเป็น true เพื่อให้ info panel แสดงผล
          isReactFlowInstantMode: false // 🎯 ไม่ใช่ ReactFlow instant mode ใน redo
        }));
        
        // 🔥 FIGMA STYLE: อัปเดต ReactFlow visual selection ให้ sync สมบูรณ์
        setNodes(prevNodes => 
          prevNodes.map(n => ({
            ...n,
            selected: pendingNodeIds.includes(n.id)
          }))
        );
        setEdges(prevEdges => 
          prevEdges.map(e => ({ ...e, selected: false }))
        );

        // 🔥 FIGMA STYLE: บังคับให้ ReactFlow instance sync selection state แบบ immediate
        if (reactFlowInstance) {
          // ใช้ multiple timeout เพื่อให้แน่ใจว่า sync อย่างสมบูรณ์
          setTimeout(() => {
            const allNodes = reactFlowInstance.getNodes();
            const allEdges = reactFlowInstance.getEdges();
            
            // Force sync ครั้งแรก
            reactFlowInstance.setNodes(
              allNodes.map(node => ({
                ...node,
                selected: pendingNodeIds.includes(node.id)
              }))
            );
            
            reactFlowInstance.setEdges(
              allEdges.map(edge => ({
                ...edge,
                selected: false
              }))
            );
            
            // Double sync เพื่อให้แน่ใจ (Figma-style reliability)
            setTimeout(() => {
              reactFlowInstance.setNodes(
                reactFlowInstance.getNodes().map(node => ({
                  ...node,
                  selected: pendingNodeIds.includes(node.id)
                }))
              );
              console.log(`[BlueprintTab] 🔄 ReactFlow redo double-synced: ${pendingNodeIds.length} selected nodes`);
            }, 50);
            
            console.log(`[BlueprintTab] 🔄 ReactFlow instance force synced for redo with ${pendingNodeIds.length} selected nodes`);
          }, 10);
        }
        
        // ล้าง single selection states
        setSelectedNode(null);
        setSelectedEdge(null);
        setIsMultiSelectActive(false);
        
        console.log(`[BlueprintTab] ↷ Multi-selection redone: ${pendingNodeIds.length} nodes with ReactFlow sync`);
      }
    };
    
    // ✅ ใช้ EventManager สำหรับ undo/redo tracking
    professionalEventManager.executeCommand(command);
    toast.success(`✅ Selected ${pendingNodeIds.length} nodes. Use Ctrl+Z to undo.`);
  }, [selection.pendingSelection, selection.selectedNodes, selection.selectedEdges, selection.multiSelectMode, selection.showSelectionBar, professionalEventManager, reactFlowInstance]);
  // 🔧 FIGMA STYLE: Clear all selections with ULTRA-aggressive UI sync
  const clearAllSelections = useCallback(() => {
    console.log(`[BlueprintTab] 🧹 Starting clear all selections - should NOT trigger refresh protection`);
    
    // 🚨 EMERGENCY: Force immediate ReactFlow clear BEFORE any state updates
    if (reactFlowInstance) {
      try {
        // Immediate synchronous clear - no delays
        const currentNodes = reactFlowInstance.getNodes();
        const currentEdges = reactFlowInstance.getEdges();
        
        // Force clear ALL selections immediately
        reactFlowInstance.setNodes(currentNodes.map(n => ({ ...n, selected: false })));
        reactFlowInstance.setEdges(currentEdges.map(e => ({ ...e, selected: false })));
        
        console.log(`[BlueprintTab] 🚨 EMERGENCY: Immediate ReactFlow clear executed FIRST`);
      } catch (error) {
        console.error(`[BlueprintTab] ❌ Emergency clear failed:`, error);
      }
    }
    console.log(`[BlueprintTab] 🧹 Starting ULTRA-aggressive clear all selections - Figma style`, {
      hasReactFlowInstance: !!reactFlowInstance,
      currentSelection: selection,
      selectedNodesCount: selection.selectedNodes.length,
      selectedEdgesCount: selection.selectedEdges.length
    });
    
    // 🚨 PRIORITY 1: Force immediate ReactFlow visual clear FIRST (highest priority)
    if (reactFlowInstance) {
      try {
        const allNodes = reactFlowInstance.getNodes();
        const allEdges = reactFlowInstance.getEdges();
        
        console.log(`[BlueprintTab] 🎯 Current ReactFlow state:`, {
          nodesCount: allNodes.length,
          edgesCount: allEdges.length,
          selectedNodesCount: allNodes.filter(n => n.selected).length,
          selectedEdgesCount: allEdges.filter(e => e.selected).length
        });
        
        // 🎯 IMMEDIATE ReactFlow visual clear (ไม่รอ state update) - TRIPLE CLEAR
        for (let i = 0; i < 3; i++) {
          reactFlowInstance.setNodes(
            reactFlowInstance.getNodes().map(node => ({
              ...node,
              selected: false
              // ✅ CRITICAL FIX: ไม่แก้ไข node.data เพื่อป้องกัน false positive change detection
            }))
          );
          
          reactFlowInstance.setEdges(
            reactFlowInstance.getEdges().map(edge => ({
              ...edge,
              selected: false
              // ✅ CRITICAL FIX: ไม่แก้ไข edge.data เพื่อป้องกัน false positive change detection
            }))
          );
        }
        
        console.log(`[BlueprintTab] 🔄 TRIPLE ReactFlow visual clear executed FIRST`);
      } catch (error) {
        console.error(`[BlueprintTab] ❌ Immediate visual clear failed:`, error);
      }
    } else {
      console.warn(`[BlueprintTab] ⚠️ ReactFlow instance not available for immediate clear`);
    }
    
    // 🎯 STEP 1: ล้าง React states ทันที
    setSelection(prev => ({ 
      ...prev, 
      selectedNodes: [], 
      selectedEdges: [],
      multiSelectMode: false,
      isReactFlowInstantMode: false,
      pendingSelection: [],
      showSelectionBar: false
    }));
    
    // 🎯 STEP 2: ล้าง single selection states ทันที
    setSelectedNode(null);
    setSelectedEdge(null);
    setIsMultiSelectActive(false);
    
    // 🎯 STEP 3: ล้าง ReactFlow visual selection states
    setNodes(prevNodes => {
      const updatedNodes = prevNodes.map(n => ({ ...n, selected: false }));
      console.log(`[BlueprintTab] 🔄 React nodes cleared:`, {
        totalNodes: updatedNodes.length,
        selectedNodes: updatedNodes.filter(n => n.selected).length
      });
      return updatedNodes;
    });
    setEdges(prevEdges => {
      const updatedEdges = prevEdges.map(e => ({ ...e, selected: false }));
      console.log(`[BlueprintTab] 🔄 React edges cleared:`, {
        totalEdges: updatedEdges.length,
        selectedEdges: updatedEdges.filter(e => e.selected).length
      });
      return updatedEdges;
    });

    // 🔥 FIGMA STYLE: Aggressive ReactFlow instance clearing
    if (reactFlowInstance) {
      // Immediate clear - no delay
      try {
        const allNodes = reactFlowInstance.getNodes();
        const allEdges = reactFlowInstance.getEdges();
        
        // Force clear immediately
        reactFlowInstance.setNodes(
          allNodes.map(node => ({
            ...node,
            selected: false
            // ✅ CRITICAL FIX: ไม่แก้ไข node.data เพื่อป้องกัน false positive change detection
          }))
        );
        
        reactFlowInstance.setEdges(
          allEdges.map(edge => ({
            ...edge,
            selected: false
            // ✅ CRITICAL FIX: ไม่แก้ไข edge.data เพื่อป้องกัน false positive change detection
          }))
        );
        
        console.log(`[BlueprintTab] 🔄 ReactFlow immediate clear executed`);
      } catch (error) {
        console.error(`[BlueprintTab] ❌ Immediate clear failed:`, error);
      }
      
      // Follow-up clears with timing
      setTimeout(() => {
        try {
          reactFlowInstance.setNodes(
            reactFlowInstance.getNodes().map(node => ({
              ...node,
              selected: false
            }))
          );
          reactFlowInstance.setEdges(
            reactFlowInstance.getEdges().map(edge => ({
              ...edge,
              selected: false
            }))
          );
          console.log(`[BlueprintTab] 🔄 ReactFlow first follow-up clear`);
        } catch (error) {
          console.error(`[BlueprintTab] ❌ First follow-up clear failed:`, error);
        }
      }, 10);
      
      // Final clear for absolute certainty
      setTimeout(() => {
        try {
          reactFlowInstance.setNodes(
            reactFlowInstance.getNodes().map(node => ({
              ...node,
              selected: false
            }))
          );
          reactFlowInstance.setEdges(
            reactFlowInstance.getEdges().map(edge => ({
              ...edge,
              selected: false
            }))
          );
          
          // Force a viewport refresh to ensure visual reset
          const viewport = reactFlowInstance.getViewport();
          reactFlowInstance.setViewport({ ...viewport });
          
          console.log(`[BlueprintTab] 🔄 ReactFlow final clear and viewport refresh completed`);
        } catch (error) {
          console.error(`[BlueprintTab] ❌ Final clear failed:`, error);
        }
      }, 100);
      
      // 🔥 FIGMA STYLE: Final verification and emergency fallback
      setTimeout(() => {
        if (reactFlowInstance) {
          const remainingSelected = reactFlowInstance.getNodes().filter(n => n.selected).length +
                                   reactFlowInstance.getEdges().filter(e => e.selected).length;
          
          if (remainingSelected > 0) {
            console.warn(`[BlueprintTab] ⚠️ Found ${remainingSelected} items still selected after clear - applying emergency fallback`);
            
            // Emergency fallback clear
            try {
              reactFlowInstance.setNodes(
                reactFlowInstance.getNodes().map(n => ({ ...n, selected: false }))
              );
              reactFlowInstance.setEdges(
                reactFlowInstance.getEdges().map(e => ({ ...e, selected: false }))
              );
              console.log(`[BlueprintTab] 🆘 Emergency fallback clear applied`);
            } catch (error) {
              console.error(`[BlueprintTab] ❌ Emergency fallback failed:`, error);
            }
          } else {
            console.log(`[BlueprintTab] ✅ Clear verification passed - no items selected`);
          }
        }
      }, 200);
    }
    
    console.log(`[BlueprintTab] 🧹 ULTRA-aggressive clear all selections completed - Figma style with emergency fallback`);
    
    // 🔥 FIGMA STYLE: Immediate verification
    if (reactFlowInstance) {
      const immediateCheck = {
        nodesSelected: reactFlowInstance.getNodes().filter(n => n.selected).length,
        edgesSelected: reactFlowInstance.getEdges().filter(e => e.selected).length
      };
      console.log(`[BlueprintTab] 📊 Immediate clear verification:`, immediateCheck);
      
      if (immediateCheck.nodesSelected > 0 || immediateCheck.edgesSelected > 0) {
        console.warn(`[BlueprintTab] ⚠️ CLEAR FAILED: Still have ${immediateCheck.nodesSelected + immediateCheck.edgesSelected} selected items`);
      } else {
        console.log(`[BlueprintTab] ✅ CLEAR SUCCESS: No items selected`);
      }
    }
    
    // 🔥 FIGMA STYLE: Final state verification
    setTimeout(() => {
      console.log(`[BlueprintTab] 📊 Final clear verification:`, {
        selectionState: selection,
        hasReactFlowInstance: !!reactFlowInstance,
        reactFlowSelectedCount: reactFlowInstance ? 
          reactFlowInstance.getNodes().filter(n => n.selected).length + 
          reactFlowInstance.getEdges().filter(e => e.selected).length : 'N/A'
      });
      
      console.log(`[BlueprintTab] ✅ Clear all selections completed - should NOT cause refresh protection warning`);
    }, 300);
  }, [reactFlowInstance, selection]);

  // Cancel multi-selection
  const cancelMultiSelection = useCallback(() => {
    setSelection(prev => ({
      ...prev,
      pendingSelection: [],
      showSelectionBar: false,
      multiSelectMode: false,
      isReactFlowInstantMode: false // 🎯 รีเซ็ต ReactFlow instant mode เมื่อ cancel
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
          event.stopPropagation(); // 🔥 FIGMA STYLE: ป้องกัน event bubbling
          event.stopImmediatePropagation(); // 🔥 FIGMA STYLE: หยุด event ทันที
          
          // 🔥 FIGMA STYLE: Clear all selections with ESC key - SINGLE PRESS CLEAR ALL
          console.log(`[BlueprintTab] ⌨️ ESC pressed - ULTRA-aggressive clearing ALL selections in single press (Figma-style)`);
          
          // 🚨 PRIORITY: Force clear visual selection IMMEDIATELY
          if (reactFlowInstance) {
            try {
              const allNodes = reactFlowInstance.getNodes();
              const allEdges = reactFlowInstance.getEdges();
              
              reactFlowInstance.setNodes(allNodes.map(n => ({ ...n, selected: false })));
              reactFlowInstance.setEdges(allEdges.map(e => ({ ...e, selected: false })));
              
              console.log(`[BlueprintTab] 🔄 ESC: Immediate ReactFlow visual clear executed`);
            } catch (error) {
              console.error(`[BlueprintTab] ❌ ESC: Immediate visual clear failed:`, error);
            }
          }
          
          // Always clear everything in one go - no conditional logic
          clearAllSelections();
          
          // Force cancel any pending multi-select mode immediately
          if (selection.multiSelectMode || selection.pendingSelection.length > 0) {
            console.log(`[BlueprintTab] 🔄 ESC: Also force-canceling any multi-select mode`);
            setSelection(prev => ({
              ...prev,
              multiSelectMode: false,
              pendingSelection: [],
              showSelectionBar: false,
              isReactFlowInstantMode: false,
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
    toggleMultiSelectMode, cancelMultiSelection, confirmMultiSelection, clearAllSelections,
    selectAllNodes, createEdgeCommand, currentBlueprintSettings.showNodeLabels, currentBlueprintSettings.showSceneThumbnails,
    reactFlowInstance // 🔥 FIGMA STYLE: เพิ่ม reactFlowInstance สำหรับ ESC handler
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
  }, [reactFlowInstance, createNodeCommand, executeCommand, currentBlueprintSettings.showNodeLabels, currentBlueprintSettings.showSceneThumbnails]);
  
  const onCanvasDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);
  
  // Helper functions สำหรับ node creation
  const getDefaultNodeTitle = (nodeType: StoryMapNodeType): string => {
    const titles: Partial<Record<StoryMapNodeType, string>> = {
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
    const colors: Partial<Record<StoryMapNodeType, string>> = {
      [StoryMapNodeType.START_NODE]: '#22c55e', // 🎯 เขียวสดใส - จุดเริ่มต้น (แยกจาก SCENE_NODE)
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
      // ❌ REMOVED: Episode node data - Episodes ไม่ควรเป็น nodes บน canvas
      // case StoryMapNodeType.EPISODE_NODE:
      //   return { episodeId: null, title: '', status: 'draft' };
      default:
        return {};
    }
  };
  
  const getNodeDisplayName = (nodeType: StoryMapNodeType): string => {
    return getDefaultNodeTitle(nodeType);
  };

  // Add new node with Command Pattern
  const onAddNode = useCallback(async (nodeType: StoryMapNodeType) => {
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

    // ❌ REMOVED: Episode node creation check - EPISODE_NODE no longer exists in enum
    // Episodes are database-only entities managed through Episode Management Modal
    
    // 🔥 PROFESSIONAL: Create node with unique ID generation
    const uniqueNodeId = generateUniqueNodeId(nodeType);
    const newNode: Node = {
      id: uniqueNodeId,
      type: getReactFlowNodeType(nodeType),
      position: centerPosition,
      data: {
        nodeId: uniqueNodeId,
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
    
    // 🎬 NEW: Automatically create linked scene for scene nodes
    if (nodeType === StoryMapNodeType.SCENE_NODE && eventManager) {
      try {
        const { scene } = await eventManager.createSynchronizedSceneNode(newNode.data, {
          title: newNode.data.title,
          description: `Scene for ${newNode.data.title}`,
          sceneOrder: scenes.length
        });
        
        toast.success(`เพิ่ม${getNodeDisplayName(nodeType)}และฉากใหม่สำเร็จ`);
        console.log(`[BlueprintTab] 🎬 Created synchronized scene: ${scene._id} for node: ${newNode.id}`);
      } catch (error) {
        console.error('[BlueprintTab] Failed to create synchronized scene:', error);
        toast.error('เพิ่มโหนดสำเร็จ แต่การสร้างฉากล้มเหลว');
      }
    } else {
      toast.success(`เพิ่ม${getNodeDisplayName(nodeType)}ใหม่สำเร็จ`);
    }
    
    setIsSidebarOpen(false); // Close sidebar on mobile
    
    // Auto-select the new node after a brief delay
    setTimeout(() => {
      setSelectedNode(newNode);
      setSelection(prev => ({
        ...prev,
        selectedNodes: [newNode.id],
        selectedEdges: []
      }));
    }, 100);
  }, [nodes, reactFlowInstance, createNodeCommand, executeCommand, currentBlueprintSettings.showNodeLabels, currentBlueprintSettings.showSceneThumbnails, episodeList, createEpisodeAPI, setEpisodeList, setSelectedEpisodeFromBlueprint, onEpisodeCreate]);

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
  // Enhanced connections with database sync and validation (Professional Canva/Figma style)
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
  }, [edges, nodes, createEdgeCommand, executeCommand, currentBlueprintSettings.showNodeLabels, updateSceneDefaultNext]);



  // 🔥 FIGMA/CANVA STYLE: Enhanced Selection handler with multiple selection support
  const onSelectionChange = useCallback<OnSelectionChangeFunc>(({ nodes: selectedNodes, edges: selectedEdges }) => {
    const selectedNodeIds = selectedNodes.map(n => n.id);
    const selectedEdgeIds = selectedEdges.map(e => e.id);
    
    // 🚨 PREVENT INFINITE LOOPS: Check if selection actually changed
    const hasSelectionChanged = 
      JSON.stringify(selectedNodeIds.sort()) !== JSON.stringify(previousSelectionRef.current.nodes.sort()) ||
      JSON.stringify(selectedEdgeIds.sort()) !== JSON.stringify(previousSelectionRef.current.edges.sort());
    
    if (!hasSelectionChanged) {
      console.log(`[BlueprintTab] 🔄 Selection unchanged, skipping onSelectionChange`);
      return;
    }
    
    // Update previous selection ref
    previousSelectionRef.current = { nodes: selectedNodeIds, edges: selectedEdgeIds };
    
    console.log(`[BlueprintTab] 📊 onSelectionChange called:`, {
      selectedNodeIds,
      selectedEdgeIds,
      currentMultiSelectMode: selection.multiSelectMode,
      pendingSelectionLength: selection.pendingSelection.length,
      showSelectionBar: selection.showSelectionBar
    });
    
    // 🚨 CRITICAL: Don't override multi-select mode when in manual multi-select mode with pending selection
    if (selection.multiSelectMode && !selection.isReactFlowInstantMode && selection.pendingSelection.length > 0) {
      console.log(`[BlueprintTab] 🔒 Preventing onSelectionChange override - in manual multi-select mode`);
      return; // Don't process ReactFlow's selection changes during manual multi-select
    }
    
      // 🔥 ADOBE/FIGMA STYLE: Selection เป็น UI state เท่านั้น - ไม่ส่งไป EventManager
  const isMultiSelection = selectedNodeIds.length > 1 || selectedEdgeIds.length > 1 || 
                         (selectedNodeIds.length > 0 && selectedEdgeIds.length > 0);
  
  // 🚫 CRITICAL FIX: Selection commands ไม่ควรส่งไป EventManager เพื่อป้องกัน dirty state
  // ✅ เก็บเฉพาะ UI state - ไม่มีผลต่อ save button หรือ refresh protection
  
  // ✅ Update selection state - pure UI state management (ไม่ trigger dirty change)
  setSelection(prev => ({
    ...prev,
    selectedNodes: selectedNodeIds,
    selectedEdges: selectedEdgeIds,
    multiSelectMode: isMultiSelection,
    pendingSelection: [], // ล้าง pending เพราะเป็นการเลือกแบบ instant
    showSelectionBar: false, // ไม่แสดง confirmation bar สำหรับ ReactFlow selection
    isReactFlowInstantMode: isMultiSelection // 🎯 ระบุโหมด ReactFlow instant เมื่อมี multi-selection
  }));
      
    // Set single selection states only if single selection
    if (selectedNodeIds.length === 1 && selectedEdgeIds.length === 0) {
      console.log(`[BlueprintTab] 👆 Single node selection - should NOT trigger refresh protection`);
      setSelectedNode(selectedNodes[0]);
      setSelectedEdge(null);
    } else if (selectedEdgeIds.length === 1 && selectedNodeIds.length === 0) {
      console.log(`[BlueprintTab] 👆 Single edge selection - should NOT trigger refresh protection`);
      setSelectedNode(null);
      setSelectedEdge(selectedEdges[0]);
    } else if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
      // No selection
      console.log(`[BlueprintTab] 👆 Deselection (clear) - should NOT trigger refresh protection`);
      setSelectedNode(null);
      setSelectedEdge(null);
    } else {
      // Multiple selection - clear single selection states
      console.log(`[BlueprintTab] 👆 Multiple selection - should NOT trigger refresh protection`);
      setSelectedNode(null);
      setSelectedEdge(null);
    }
    
    // 🎯 ไม่สร้าง command เพื่อป้องกัน dirty state
    console.log(`[BlueprintTab] 👆 Selection updated (UI only): ${selectedNodeIds.length} nodes, ${selectedEdgeIds.length} edges`);
    
    // ✅ Log multiple selection for debugging
    if (isMultiSelection) {
      console.log(`[BlueprintTab] 🎯 Multiple selection detected: ${selectedNodeIds.length} nodes, ${selectedEdgeIds.length} edges`);
    }
  }, [selection.multiSelectMode, selection.pendingSelection.length, selection.showSelectionBar, selection.isReactFlowInstantMode]);

  // 🔥 FIGMA STYLE: High-priority ESC key handler เพื่อป้องกัน ReactFlow interference
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        console.log(`[BlueprintTab] 🚨 HIGH-PRIORITY ESC handler - clearing all selections`);
        
        // Force immediate visual clear
        if (reactFlowInstance) {
          try {
            reactFlowInstance.setNodes(
              reactFlowInstance.getNodes().map(n => ({ ...n, selected: false }))
            );
            reactFlowInstance.setEdges(
              reactFlowInstance.getEdges().map(e => ({ ...e, selected: false }))
            );
          } catch (error) {
            console.error(`[BlueprintTab] ❌ High-priority visual clear failed:`, error);
          }
        }
        
        // Execute comprehensive clear
        clearAllSelections();
      }
    };

    // Add with capture=true for highest priority
    document.addEventListener('keydown', handleEscapeKey, { capture: true });
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey, { capture: true });
    };
  }, [reactFlowInstance, clearAllSelections]);

  // Keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
      const currentAutoSaveTimer = autoSaveTimer.current;
      if (currentAutoSaveTimer) {
        clearTimeout(currentAutoSaveTimer);
      }
      const currentSaveDebounceTimer = saveDebounceTimer.current;
      if (currentSaveDebounceTimer) {
        clearTimeout(currentSaveDebounceTimer);
      }
    };
  }, [handleKeyboardShortcuts]);

  // 🔥 FIX 2: getReactFlowNodeType ถูกย้ายไปไว้ด้านบนของไฟล์ (นอก component)
  // เพื่อป้องกัน hoisting issues และให้สามารถใช้ใน useCallback ได้

  // Custom node and edge types - สร้าง wrapper เพื่อส่ง nodeOrientation พร้อม real-time updates
  const nodeTypes: NodeTypes = useMemo(() => ({
    scene_node: (props: any) => <SceneNode {...props} nodeOrientation={currentBlueprintSettings.nodeOrientation} onNavigateToDirector={onNavigateToDirector} />,
    choice_node: (props: any) => <ChoiceNode {...props} nodeOrientation={currentBlueprintSettings.nodeOrientation} />,
    branch_node: (props: any) => <BranchNode {...props} nodeOrientation={currentBlueprintSettings.nodeOrientation} />,
    comment_node: (props: any) => <CommentNode {...props} nodeOrientation={currentBlueprintSettings.nodeOrientation} />,
    ending_node: (props: any) => <EndingNode {...props} nodeOrientation={currentBlueprintSettings.nodeOrientation} />,
    // Keep custom as fallback with navigation support
    custom: (props: any) => <CustomNode {...props} onNavigateToDirector={onNavigateToDirector} />
  }), [currentBlueprintSettings.nodeOrientation, onNavigateToDirector]);
  
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

  // 🔥 FIGMA/CANVA STYLE: Bidirectional sync setup useEffect
  useEffect(() => {
    if (professionalEventManager && setNodes && setEdges) {
      // Register bidirectional sync
      professionalEventManager.setReactFlowUpdater((nodes: any[], edges: any[]) => {
        console.log('[BlueprintTab] 🔄 Force updating UI from EventManager:', {
          nodeCount: nodes.length,
          edgeCount: edges.length
        });
        
        // Force new array references for React re-render
        setNodes([...nodes]);
        setEdges([...edges]);
      });
      
      console.log('[BlueprintTab] ✅ Figma/Canva style bidirectional sync registered');
    }
    
    return () => {
      // Cleanup if needed
      if (professionalEventManager) {
        professionalEventManager.setReactFlowUpdater(() => {});
      }
    };
  }, [professionalEventManager, setNodes, setEdges]);
  
  // Handle canvas click - clear selections when clicking on empty space (Figma-style)
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    // 🔥 FIGMA STYLE: Clear all selections when clicking on empty canvas
    console.log(`[BlueprintTab] 🎯 Canvas clicked - clearing all selections (Figma-style)`);
    clearAllSelections();
  }, [clearAllSelections]);

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
        storyVariables: cleanStoryVariables(storyMap?.storyVariables || [])
      };
    },
    // Enterprise-grade state monitoring via EventManager
    getCanvasState: () => {
      const eventManagerState = professionalEventManager?.getState();
      return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
        hasUndoHistory: eventManagerState?.undoStack.length > 0 || false,
        hasRedoHistory: eventManagerState?.redoStack.length > 0 || false,
      isInitialized: !isInitializingRef.current
      };
    }
  }), [handleManualSave, nodes, edges, storyMap, professionalEventManager]);
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
              {/* 🎯 REMOVED LOADING INDICATOR - Professional smooth transitions */}
              
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onDrop={onCanvasDrop}
                onDragOver={onCanvasDragOver}
                onNodesChange={enhancedOnNodesChange}
                onEdgesChange={enhancedOnEdgesChange}
                onConnect={(connection: Connection) => {
                  // 🔗 FIGMA/CANVA STYLE: Delegate to main onConnect function
                  try {
                    console.log(`[BlueprintTab] 🔗 Creating new connection: ${connection.source} → ${connection.target}`);
                    onConnect(connection);
                  } catch (error) {
                    console.error('[BlueprintTab] ❌ Failed to create edge:', error);
                    toast.error('ไม่สามารถสร้างการเชื่อมต่อได้');
                  }
                }}
                onNodeClick={(event, node) => {
                  console.log(`[BlueprintTab] 🖱️ Node clicked: ${node.id}`, {
                    multiSelectMode: selection.multiSelectMode,
                    pendingSelectionLength: selection.pendingSelection.length,
                    showSelectionBar: selection.showSelectionBar,
                    currentPendingSelection: selection.pendingSelection
                  });
                  
                  // 🔥 CANVA STYLE: Handle manual multi-select mode ONLY (ไม่ใช่ ReactFlow instant mode)
                  if (selection.multiSelectMode && !selection.isReactFlowInstantMode) {
                    // Toggle node in pending selection
                    const isPending = selection.pendingSelection.includes(node.id);
                    const newPending = isPending 
                      ? selection.pendingSelection.filter(id => id !== node.id)
                      : [...selection.pendingSelection, node.id];
                    
                    console.log(`[BlueprintTab] 🎯 Multi-select toggling node ${node.id}:`, {
                      isPending,
                      oldPending: selection.pendingSelection,
                      newPending,
                      totalCount: newPending.length,
                      shouldShowBar: newPending.length > 0
                    });
                    
                    // ✅ CRITICAL FIX: Update selection state in single transaction
                    setSelection(prev => {
                      const updatedState = {
                        ...prev,
                        pendingSelection: newPending,
                        showSelectionBar: newPending.length > 0,
                        // ✅ CRITICAL: Keep multi-select mode explicitly active
                        multiSelectMode: true
                      };
                      
                      console.log(`[BlueprintTab] 🔄 Updating selection state:`, {
                        oldState: { 
                          pendingSelection: prev.pendingSelection,
                          showSelectionBar: prev.showSelectionBar,
                          multiSelectMode: prev.multiSelectMode
                        },
                        newState: {
                          pendingSelection: updatedState.pendingSelection,
                          showSelectionBar: updatedState.showSelectionBar,
                          multiSelectMode: updatedState.multiSelectMode
                        }
                      });
                      
                      return updatedState;
                    });
                    
                    // ✅ CANVA STYLE: Visual feedback for pending selection
                    setNodes(prevNodes => 
                      prevNodes.map(n => ({
                        ...n,
                        selected: newPending.includes(n.id)
                      }))
                    );
                    
                    const actionText = isPending ? 'Removed from' : 'Added to';
                    console.log(`[BlueprintTab] ✅ ${actionText} selection - Total: ${newPending.length} items, Show bar: ${newPending.length > 0}`);
                    toast.info(`${actionText} selection (${newPending.length} items)`);
                    } else {
                    // Normal single selection mode
                    console.log(`[BlueprintTab] 👆 Single selection mode: selecting node ${node.id}`);
                    
                  setSelectedNode(node);
                  setSelectedEdge(null);
                    
                    // Clear multi-selection state
                    setSelection(prev => ({
                      ...prev,
                      selectedNodes: [node.id],
                      selectedEdges: [],
                      pendingSelection: [],
                      showSelectionBar: false,
                      multiSelectMode: false,
                      isReactFlowInstantMode: false // 🎯 รีเซ็ต ReactFlow instant mode เมื่อเลือก single node
                    }));
                  }
                }}
                onEdgeClick={(event, edge) => {
                  setSelectedEdge(edge);
                  setSelectedNode(null);
                }}

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
                onInit={setReactFlowInstance}
                fitView
                attributionPosition="bottom-left"
                className="bg-background"
                selectionMode={selection.multiSelectMode ? SelectionMode.Full : SelectionMode.Partial}
                multiSelectionKeyCode={selection.multiSelectMode ? null : ["Meta", "Control", "Shift"]}
                // ปิดการลบผ่านระบบของ React Flow เพื่อให้ Command Pattern จัดการเอง (พร้อม Trash History)
                deleteKeyCode={[]}
                // 🔥 FIGMA STYLE: ปิด ReactFlow keyboard handlers เพื่อให้ custom handlers จัดการเอง
                disableKeyboardA11y={true}
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
                  className="floating-toolbar bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg"
                  style={{ top: isMobile ? 56 : undefined, left: isMobile ? 0 : undefined }}
                >
                  <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center gap-2'}`}>
                    {/* Enhanced Episode Selector with Add Episode - Desktop & Tablet (non-mobile) */}
                    <div className="hidden md:block">
                      <div className="flex items-center gap-2">
                        <Select value={currentEpisodeId || ''} onValueChange={(value) => handleEpisodeSelect(value || null)}>
                          <SelectTrigger className="w-56 h-8 text-xs bg-background/50">
                            <SelectValue placeholder={episodes.length > 0 ? "เลือกตอน" : "ยังไม่มีตอน"} />
                          </SelectTrigger>
                          <SelectContent>
                            {episodes.map((episode) => (
                              <SelectItem key={episode._id} value={episode._id} className="text-xs">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="w-3 h-3" />
                                  <span className="truncate">{episode.episodeOrder}-{episode.slug || episode.title}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Add Episode Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEpisodeCreatorOpen(true)}
                          className="h-8 w-8 p-0"
                          title="เพิ่มตอนใหม่"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </Button>
                        
                        {/* Episode Management Modal Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowEpisodeManagementModal(true)}
                          className="h-8 px-3"
                          title="จัดการตอนทั้งหมด"
                        >
                          <BookOpen className="w-3 h-3 mr-1.5" />
                          <span className="text-xs">จัดการตอน</span>
                        </Button>
                      </div>
                    </div>

                    {/* Enhanced Mobile Controls - Mobile Only */}
                    <div className={`${isMobile ? 'flex flex-col gap-2' : 'hidden'}`}>
                      {/* Add Episode Button - Mobile */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEpisodeCreatorOpen(true)}
                        className="h-8 w-8 p-0 bg-background/80 hover:bg-background/90 border-2"
                        title="เพิ่มตอนใหม่"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </Button>
                      
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

                    {/* Undo/Redo - ใช้ SingleUserEventManager สำหรับการจัดการ commands แบบ Professional */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={undo}
                      disabled={!professionalEventManager || professionalEventManager.getState().undoStack.length === 0}
                      className="h-8 w-8 p-0"
                      title={`Undo (Ctrl+Z)${professionalEventManager?.getState().undoStack.length > 0 ? ` - มีการเปลี่ยนแปลง ${professionalEventManager.getState().undoStack.length} รายการ` : ' - ไม่มีการเปลี่ยนแปลงที่จะย้อนกลับ'}`}
                      key={`undo-${forceUIUpdate}`} // Force re-render เมื่อ state เปลี่ยน
                    >
                      <Undo2 className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={redo}
                      disabled={!professionalEventManager || professionalEventManager.getState().redoStack.length === 0}
                      className="h-8 w-8 p-0"
                      title={`Redo (Ctrl+Y)${professionalEventManager?.getState().redoStack.length > 0 ? ` - สามารถทำซ้ำได้ ${professionalEventManager.getState().redoStack.length} รายการ` : ' - ไม่มีการเปลี่ยนแปลงที่จะทำซ้ำ'}`}
                      key={`redo-${forceUIUpdate}`} // Force re-render เมื่อ state เปลี่ยน
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

                {/* Enhanced Episode Selector with Add Episode - Mobile Only */}
                <Panel position="top-left" className="md:hidden bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg" style={{ top: 8, left: 0 }}>
                  <div className="flex items-center gap-2">
                    <Select value={currentEpisodeId || ''} onValueChange={(value) => handleEpisodeSelect(value || null)}>
                      <SelectTrigger className="w-40 h-8 text-xs bg-background/50">
                        <SelectValue placeholder={episodes.length > 0 ? "เลือกตอน" : "ยังไม่มีตอน"} />
                      </SelectTrigger>
                      <SelectContent>
                        {episodes.map((episode) => (
                          <SelectItem key={episode._id} value={episode._id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-3 h-3" />
                              <span className="truncate">{episode.episodeOrder}-{episode.slug || episode.title}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Add Episode Button - Mobile */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEpisodeCreatorOpen(true)}
                      className="h-8 w-8 p-0"
                      title="เพิ่มตอนใหม่"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </Button>
                  </div>
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
                          onClick={() => {
                            console.log(`[BlueprintTab] 🧹 Clear button clicked - using clearAllSelections() for Figma-like behavior`);
                            clearAllSelections(); // 🎯 ใช้ clearAllSelections() เหมือน ESC key และ Canvas click
                          }}
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



            </ReactFlow>
          </div>
        </ReactFlowProvider>
          
          {/* Enhanced Selection Confirmation Bar - ปรับปรุงให้สวยงามและใช้งานง่าย */}
          <AnimatePresence>
            {(() => {
              const shouldShow = selection.showSelectionBar && selection.pendingSelection.length > 0;
              console.log(`[BlueprintTab] 📊 Confirmation Bar Debug:`, {
                showSelectionBar: selection.showSelectionBar,
                pendingSelectionLength: selection.pendingSelection.length,
                shouldShow,
                multiSelectMode: selection.multiSelectMode
              });
              return shouldShow;
            })() && (
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
                      onClick={cancelMultiSelection}
                      className="text-xs px-3"
                    >
                      <X className="w-3 h-3 mr-1" />
                      ยกเลิก
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={confirmMultiSelection}
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
                      onDeselectAll={clearAllSelections}
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
                <Tabs defaultValue="episodes" className="flex flex-col h-full">
                <TabsList className="grid w-full grid-cols-3 rounded-lg mb-6 h-12 flex-shrink-0">
                  <TabsTrigger value="episodes" className="text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">ตอน</TabsTrigger>
                  <TabsTrigger value="palette" className="text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Nodes</TabsTrigger>
                  <TabsTrigger value="validation" className="text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Validation</TabsTrigger>
                </TabsList>
                <TabsContent value="episodes" className="overflow-y-auto flex-1 h-full">
                  <div className="pr-2 p-4">
                    {/* 🎯 PROFESSIONAL: Episodes are now managed via modal */}
                    <div className="text-center space-y-4">
                      <BookOpen className="w-12 h-12 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-600">จัดการตอนผ่านปุ่มด้านบน</p>
                      <Button 
                        onClick={() => setShowEpisodeManagementModal(true)}
                        className="w-full"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        จัดการตอน
                      </Button>
                    </div>
                  </div>
                </TabsContent>
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
                <Tabs defaultValue="episodes" className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-3 mx-4 mt-2 rounded-lg">
                    <TabsTrigger value="episodes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">ตอน</TabsTrigger>
                    <TabsTrigger value="palette" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Nodes</TabsTrigger>
                    <TabsTrigger value="validation" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Validation</TabsTrigger>
                  </TabsList>
                  <TabsContent value="episodes" className="flex-1 mt-2 overflow-hidden">
                    <div className="p-4 text-center">
                      <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600 mb-4">จัดการตอนผ่านปุ่มด้านบน</p>
                      <Button 
                        onClick={() => setShowEpisodeManagementModal(true)}
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        จัดการตอน
                      </Button>
                    </div>
                  </TabsContent>
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
                  onDeselectAll={clearAllSelections}
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
                  onDeselectAll={clearAllSelections}
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

      {/* ✨ Professional Episode Creator Dialog */}
      <Dialog open={isEpisodeCreatorOpen} onOpenChange={setIsEpisodeCreatorOpen}>
        <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-primary" />
              เพิ่มตอนใหม่
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Episode Title */}
            <div className="space-y-2">
              <Label htmlFor="episode-title" className="text-sm font-medium flex items-center gap-2">
                <Type className="w-4 h-4" />
                ชื่อตอน
              </Label>
              <Input
                id="episode-title"
                placeholder="เช่น บทที่ 1: การเริ่มต้น"
                value={episodeCreationForm.title}
                onChange={(e) => setEpisodeCreationForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full"
                disabled={isCreatingEpisode}
              />
            </div>

            {/* Episode Order */}
            <div className="space-y-2">
              <Label htmlFor="episode-order" className="text-sm font-medium flex items-center gap-2">
                <Hash className="w-4 h-4" />
                ลำดับตอน
              </Label>
              <Input
                id="episode-order"
                type="number"
                min="1"
                step="0.1"
                value={episodeCreationForm.episodeOrder}
                onChange={(e) => setEpisodeCreationForm(prev => ({ ...prev, episodeOrder: parseFloat(e.target.value) || 1 }))}
                className="w-full"
                disabled={isCreatingEpisode}
              />
              <p className="text-xs text-muted-foreground">
                ใช้ทศนิยมสำหรับตอนพิเศษ เช่น 1.5
              </p>
            </div>

            {/* Teaser Text */}
            <div className="space-y-2">
              <Label htmlFor="teaser-text" className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                เนื้อหาเกริ่นนำ (ไม่บังคับ)
              </Label>
              <Textarea
                id="teaser-text"
                placeholder="คำอธิบายสั้นๆ เกี่ยวกับตอนนี้..."
                value={episodeCreationForm.teaserText}
                onChange={(e) => setEpisodeCreationForm(prev => ({ ...prev, teaserText: e.target.value }))}
                className="w-full min-h-[80px] resize-none"
                disabled={isCreatingEpisode}
              />
            </div>

            {/* Access Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                ประเภทการเข้าถึง
              </Label>
              <Select
                value={episodeCreationForm.accessType}
                onValueChange={(value) => setEpisodeCreationForm(prev => ({ ...prev, accessType: value }))}
                disabled={isCreatingEpisode}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      อ่านฟรี
                    </div>
                  </SelectItem>
                  <SelectItem value="paid_unlock">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      ต้องใช้เหรียญ
                    </div>
                  </SelectItem>
                  <SelectItem value="premium_access">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      สมาชิกพรีเมียม
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Coins (only if paid_unlock) */}
            {episodeCreationForm.accessType === 'paid_unlock' && (
              <div className="space-y-2">
                <Label htmlFor="price-coins" className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  ราคา (เหรียญ)
                </Label>
                <Input
                  id="price-coins"
                  type="number"
                  min="0"
                  step="1"
                  value={episodeCreationForm.priceCoins}
                  onChange={(e) => setEpisodeCreationForm(prev => ({ ...prev, priceCoins: parseInt(e.target.value) || 0 }))}
                  className="w-full"
                  disabled={isCreatingEpisode}
                />
              </div>
            )}

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                สถานะ
              </Label>
              <Select
                value={episodeCreationForm.status}
                onValueChange={(value) => setEpisodeCreationForm(prev => ({ ...prev, status: value }))}
                disabled={isCreatingEpisode}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      ฉบับร่าง
                    </div>
                  </SelectItem>
                  <SelectItem value="published">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      เผยแพร่แล้ว
                    </div>
                  </SelectItem>
                  <SelectItem value="scheduled">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      ตั้งเวลาเผยแพร่
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsEpisodeCreatorOpen(false)}
              disabled={isCreatingEpisode}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={legacyHandleCreateEpisode}
              disabled={isCreatingEpisode || !episodeCreationForm.title.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isCreatingEpisode ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  สร้างตอน
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🆕 PHASE 2: Professional Modal System */}
      <EpisodeDeleteModal
        isOpen={modalState.type === 'episode_delete' && modalState.isOpen}
        episodes={modalState.context?.selectedEpisodes || []}
        onClose={closeModal}
        onConfirm={handleDeleteEpisodeModal}
      />
      
      {/* Episode Management Modal */}
      <EpisodeManagementModal
        isOpen={showEpisodeManagementModal}
        onClose={() => setShowEpisodeManagementModal(false)}
        novelSlug={novel.slug}
        currentEpisodeId={currentEpisodeId || undefined}
        onEpisodeSelect={(episodeId) => {
          handleEpisodeSelect(episodeId);
          setShowEpisodeManagementModal(false);
        }}
        onEpisodesUpdate={(updatedEpisodes) => {
          setEpisodeList(updatedEpisodes);
        }}
      />

              {/* 🎯 CANVAS TUTORIAL OVERLAY - Shows based on episode state */}
              {showTutorial && tutorialStep === 0 && episodes.length === 0 && (
                <div className="absolute inset-0 bg-background/30 flex items-center justify-center z-40 pointer-events-none">
                  <div className="text-center max-w-sm mx-auto p-6 bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl border pointer-events-auto">
                    <div className="mb-4">
                      <BookOpen className="w-12 h-12 mx-auto text-primary mb-3" />
                      <h3 className="text-lg font-bold text-card-foreground mb-2">เริ่มต้นสร้างเรื่องราว</h3>
                      <p className="text-sm text-muted-foreground">สร้างตอนแรกเพื่อเริ่มออกแบบ Visual Novel</p>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        onClick={() => {
                          setIsEpisodeCreatorOpen(true);
                          setShowTutorial(false);
                        }}
                        className="w-full"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        สร้างตอนแรก
                      </Button>
                      
                      <Button 
                        onClick={() => setShowTutorial(false)}
                        variant="ghost"
                        className="w-full"
                        size="sm"
                      >
                        ข้ามไปก่อน
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 🎯 SELECT EPISODE TUTORIAL - Shows when episodes exist but none selected */}
              {showTutorial && tutorialStep === 1 && episodes.length > 0 && !currentEpisodeId && (
                <div className="absolute inset-0 bg-background/30 flex items-center justify-center z-40 pointer-events-none">
                  <div className="text-center max-w-sm mx-auto p-6 bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl border pointer-events-auto">
                    <div className="mb-4">
                      <BookOpen className="w-12 h-12 mx-auto text-primary mb-3" />
                      <h3 className="text-lg font-bold text-card-foreground mb-2">เลือกตอนเพื่อเริ่มแก้ไข</h3>
                      <p className="text-sm text-muted-foreground">
                        เลือกตอนจากด้านบนเพื่อเริ่มออกแบบเนื้อเรื่อง<br/>
                        การเพิ่ม nodes และ edges ต้องเลือกตอนก่อน
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="text-left p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                        <p className="mb-2">💡 คุณสามารถ:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>เลือกตอนจากเมนู dropdown ด้านบน</li>
                          <li>หรือเพิ่มตอนใหม่ได้ทันที</li>
                        </ul>
                      </div>
                      
                      <Button 
                        onClick={() => setShowTutorial(false)}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        เข้าใจแล้ว
                      </Button>
                    </div>
                  </div>
                </div>
              )}

      </div>
  );
});
BlueprintTab.displayName = 'BlueprintTab'; 

// 🎯 REMOVED OLD TUTORIAL OVERLAY - Now using canvas overlay instead
/*
const TutorialOverlay = ({ 
  step, 
  onNext, 
  onSkip, 
  onComplete 
}: {
  step: number;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
}) => {
  const tutorialSteps = [
    {
      title: "ยินดีต้อนรับสู่ Blueprint Editor! 🎉",
      content: "นี่คือที่ที่คุณจะออกแบบเส้นทางเรื่องราวของ Visual Novel ของคุณ เริ่มต้นด้วยการสร้างตอนแรกกันเลย!",
      highlight: null,
      position: "center"
    },
    {
      title: "เริ่มต้นด้วยการเพิ่มตอนแรก 📖",
      content: "คลิกปุ่ม ➕ ในแถบเครื่องมือด้านบนซ้าย เพื่อเพิ่มตอนแรกของนิยายคุณ แต่ละตอนจะมีพื้นที่สร้างเรื่องแยกต่างหาก",
      highlight: ".floating-toolbar",
      position: "bottom"
    },
    {
      title: "จัดการตอนและเนื้อเรื่อง 🎭",
      content: "หลังจากสร้างตอนแล้ว คุณสามารถเพิ่มฉาก สร้างตัวเลือกให้ผู้เล่น และออกแบบเส้นทางเรื่องราวที่หลากหลายได้ในแต่ละตอน",
      highlight: null,
      position: "center"
    },
    {
      title: "พร้อมเริ่มต้นแล้ว! ✨",
      content: "ตอนนี้คุณพร้อมที่จะสร้างสรรค์ Visual Novel ที่น่าตื่นเต้นแล้ว เริ่มจากการเพิ่มตอนแรกกันเลย!",
      highlight: ".floating-toolbar",
      position: "bottom"
    }
  ];

  const currentStep = tutorialSteps[step];
  const isLastStep = step === tutorialSteps.length - 1;

  if (!currentStep) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
        >
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-foreground">
              {currentStep.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {currentStep.content}
            </p>
            
            <div className="flex items-center justify-center gap-2 py-2">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onSkip}
                className="flex-1"
              >
                ข้าม
              </Button>
              <Button
                onClick={isLastStep ? onComplete : onNext}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isLastStep ? 'เริ่มต้นเลย!' : 'ถัดไป'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
*/

export default BlueprintTab;