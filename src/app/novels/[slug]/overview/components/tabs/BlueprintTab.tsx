// app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx
'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactFlow, {
  Node,
  Edge,
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
  SelectionMode,
  OnSelectionChangeFunc,
  BackgroundVariant,
  ConnectionMode
} from 'reactflow';
import { toast } from 'sonner';

import 'reactflow/dist/style.css';

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
  Copy,
  Edit,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Menu,
  X,
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
  Hexagon,
  Diamond,
  Triangle,
  BookOpen,
  Sparkles,
  Target,
  Palette,
  ArrowRight,
  RotateCcw
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
  isAutoSaveEnabled: boolean;
  onManualSave?: () => void;
  autoSaveIntervalSec?: 15 | 30;
  onDirtyChange?: (dirty: boolean) => void;
  onNavigateToDirector?: (sceneId?: string) => void;
}

// Enhanced history and selection interfaces
interface HistoryState {
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
  description?: string;
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

// Save system state
interface SaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveError: string | null;
}

// Enhanced Custom Node with improved connection system
const CustomNode = ({ data, selected, id }: { data: any; selected: boolean; id: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'none' | 'connecting'>('none');
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
    switch (type) {
      case StoryMapNodeType.START_NODE: return {
        gradient: 'from-emerald-400 via-emerald-500 to-emerald-600',
        shadow: 'shadow-emerald-500/30 shadow-lg',
        glow: 'shadow-emerald-400/60 shadow-xl',
        ring: 'ring-emerald-300',
        shape: 'rounded-full',
        handles: { top: false, bottom: true, left: false, right: false },
        sparkle: false,
        isSpecial: true
      };
      case StoryMapNodeType.SCENE_NODE: return {
        gradient: 'from-blue-400 via-blue-500 to-blue-600',
        shadow: 'shadow-blue-500/30 shadow-lg',
        glow: 'shadow-blue-400/60 shadow-2xl',
        ring: 'ring-blue-300',
        shape: 'rounded-xl',
        handles: { top: true, bottom: true, left: false, right: false },
        sparkle: false,
        isSpecial: false
      };
      case StoryMapNodeType.CHOICE_NODE: return {
        gradient: 'from-amber-400 via-amber-500 to-amber-600',
        shadow: 'shadow-amber-500/30 shadow-lg',
        glow: 'shadow-amber-400/60 shadow-2xl',
        ring: 'ring-amber-300',
        shape: 'rounded-xl',
        handles: { top: true, bottom: false, left: false, right: true },
        sparkle: false,
        isSpecial: false
      };
      case StoryMapNodeType.ENDING_NODE: return {
        gradient: 'from-red-400 via-red-500 to-red-600',
        shadow: 'shadow-red-500/30 shadow-lg',
        glow: 'shadow-red-400/60 shadow-xl',
        ring: 'ring-red-300',
        shape: 'rounded-full',
        handles: { top: true, bottom: false, left: false, right: false },
        sparkle: false,
        isSpecial: true
      };
      case StoryMapNodeType.BRANCH_NODE: return {
        gradient: 'from-purple-400 via-purple-500 to-purple-600',
        shadow: 'shadow-purple-500/30 shadow-lg',
        glow: 'shadow-purple-400/60 shadow-2xl',
        ring: 'ring-purple-300',
        shape: 'rounded-lg',
        handles: { top: true, bottom: true, left: true, right: true },
        sparkle: false,
        isSpecial: false
      };
      default: return {
        gradient: 'from-gray-400 via-gray-500 to-gray-600',
        shadow: 'shadow-gray-500/30 shadow-lg',
        glow: 'shadow-gray-400/60 shadow-2xl',
        ring: 'ring-gray-300',
        shape: 'rounded-lg',
        handles: { top: true, bottom: true, left: false, right: false },
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

          {/* Node-specific Info */}
          {data.nodeType === StoryMapNodeType.SCENE_NODE && data.sceneData && (
            <div className="bg-white/10 rounded-lg p-2 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <User className="w-3 h-3" />
                <span>{data.sceneData.characters?.length || 0} characters</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Image className="w-3 h-3" />
                <span>{data.sceneData.images?.length || 0} images</span>
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
              w-4 h-4 border-3 rounded-full z-20
              transition-all duration-300 ease-out
              ${isConnectable 
                ? 'bg-blue-200 border-blue-400 hover:bg-blue-300 hover:border-blue-500 cursor-crosshair hover:scale-150' 
                : 'bg-gray-300 border-gray-400 opacity-50 cursor-not-allowed'
              }
              ${isHovered || selected ? 'opacity-100 scale-125 shadow-lg' : 'opacity-75'}
            `}
            style={{ 
              top: -8,
              boxShadow: (isHovered || selected) ? '0 0 15px rgba(59, 130, 246, 0.6)' : 'none'
            }}
            isConnectable={isConnectable}
          />
        )}

        {theme.handles.bottom && (
          <Handle
            type="source"
            position={Position.Bottom}
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
              bottom: -8,
              boxShadow: (isHovered || selected) ? '0 0 15px rgba(34, 197, 94, 0.6)' : 'none'
            }}
            isConnectable={isConnectable}
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

// Node Palette Component
const NodePalette = ({ onAddNode }: { onAddNode: (nodeType: StoryMapNodeType) => void }) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['core', 'logic']);

  const nodeCategories = {
    core: {
      name: '🎭 Core Story Nodes',
      icon: BookOpen,
      color: 'from-blue-500 to-blue-600',
      nodes: [
        { type: StoryMapNodeType.START_NODE, name: '✨ Start', desc: 'Story beginning', icon: Target },
        { type: StoryMapNodeType.SCENE_NODE, name: '🎬 Scene', desc: 'Story scene', icon: Square },
        { type: StoryMapNodeType.CHOICE_NODE, name: '🔀 Choice', desc: 'Player choice', icon: GitBranch },
        { type: StoryMapNodeType.ENDING_NODE, name: '🏁 Ending', desc: 'Story ending', icon: Flag }
      ]
    },
    logic: {
      name: '⚡ Logic & Flow',
      icon: Zap,
      color: 'from-purple-500 to-purple-600',
      nodes: [
        { type: StoryMapNodeType.BRANCH_NODE, name: '🌿 Branch', desc: 'Conditional branch', icon: GitBranch },
        { type: StoryMapNodeType.MERGE_NODE, name: '🔗 Merge', desc: 'Merge paths', icon: Split },
        { type: StoryMapNodeType.VARIABLE_MODIFIER_NODE, name: '🎛️ Variable', desc: 'Modify variables', icon: Settings }
      ]
    },
    special: {
      name: '🚀 Special Nodes',
      icon: Sparkles,
      color: 'from-amber-500 to-amber-600',
      nodes: [
        { type: StoryMapNodeType.EVENT_TRIGGER_NODE, name: '⚡ Event', desc: 'Trigger event', icon: Zap },
        { type: StoryMapNodeType.DELAY_NODE, name: '⏰ Delay', desc: 'Time delay', icon: Clock },
        { type: StoryMapNodeType.COMMENT_NODE, name: '💭 Comment', desc: 'Notes & comments', icon: MessageCircle }
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

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="text-sm font-medium text-muted-foreground">
          Drag nodes to canvas
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
                        className="w-full justify-start text-xs p-3 h-auto hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 hover:text-white transition-all group"
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

// Properties Panel Component
const PropertiesPanel = ({ 
  selectedNode, 
  selectedEdge, 
  onNodeUpdate, 
  onEdgeUpdate,
  storyVariables,
  scenes,
  characters,
  userMedia,
  officialMedia
}: {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onNodeUpdate: (nodeId: string, data: any) => void;
  onEdgeUpdate: (edgeId: string, data: any) => void;
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
      setTitle(selectedNode.data.title || '');
      setDescription(selectedNode.data.notesForAuthor || '');
      setSceneId(selectedNode.data.nodeSpecificData?.sceneId || '');
      setEmotionTags(selectedNode.data.authorDefinedEmotionTags || []);
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
          ...selectedNode.data.nodeSpecificData,
          ...(selectedNode.data.nodeType === StoryMapNodeType.SCENE_NODE && { sceneId })
        }
      });
      toast.success('Node updated successfully');
    }
  };

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
          message: `Node "${node.data.title || 'Untitled'}" is not connected`,
          nodeId: node.id
        });
      }
    });

    // Check for missing start node
    const hasStartNode = nodes.some(node => node.data.nodeType === StoryMapNodeType.START_NODE);
    if (!hasStartNode) {
      issues.push({
        type: 'error',
        message: 'Story map must have a start node'
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
        message: 'Story map contains cycles which may cause infinite loops'
      });
    }

    return issues;
  }, [nodes, edges]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span className="font-semibold text-sm">Validation Results</span>
        </div>

        {validationResults.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm text-muted-foreground">
              No issues found! Your story map looks good.
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
  isAutoSaveEnabled,
  autoSaveIntervalSec = 15,
  onDirtyChange,
  onNavigateToDirector
}, ref) => {
  // Core ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Selection and UI state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<string>(episodes[0]?._id || '');
  
  // Mobile/Desktop UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPropertiesCollapsed, setIsPropertiesCollapsed] = useState(false);
  
  // Canvas state
  const [canvasState, setCanvasState] = useState<CanvasState>({
    isLocked: false,
    zoomLevel: 1,
    position: { x: 0, y: 0 },
    showGrid: true,
    gridSize: 20,
    snapToGrid: false
  });
  
  // History and selection state
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selection, setSelection] = useState<SelectionState>({
    selectedNodes: [],
    selectedEdges: [],
    multiSelectMode: false,
    clipboard: { nodes: [], edges: [] },
    isSelectionMode: false,
    pendingSelection: [],
    showSelectionBar: false
  });
  
  // Save state
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    saveError: null
  });
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
          nodeType: node.data.nodeType,
          title: node.data.title,
          position: node.position,
          dimensions: node.width && node.height ? { width: node.width, height: node.height } : undefined,
          nodeSpecificData: node.data.nodeSpecificData || {},
          notesForAuthor: node.data.notesForAuthor,
          authorDefinedEmotionTags: node.data.authorDefinedEmotionTags || [],
          editorVisuals: {
            color: node.data.color,
            zIndex: node.data.zIndex || 0
          }
        })),
        edges: currentEdges.map(edge => ({
          edgeId: edge.id,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceHandleId: edge.sourceHandle,
          targetHandleId: edge.targetHandle,
          label: edge.label,
          condition: edge.data?.condition,
          priority: edge.data?.priority || 0,
          editorVisuals: {
            animated: edge.animated || false,
            color: edge.style?.stroke,
            lineStyle: edge.data?.lineStyle || 'solid'
          }
        })),
        storyVariables: storyMap?.storyVariables || [],
        episodeFilter: selectedEpisode
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
        isSaving: false 
      }));
      
      // Do not call onStoryMapUpdate here to avoid re-initialization feedback loops
      
      if (isManual) {
        toast.success('Story map saved successfully');
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

  // Enhanced auto-save system like Premiere Pro - Only auto-save when changes are detected
  const scheduleAutoSave = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (!isAutoSaveEnabled) return;
    
    // Clear existing timers
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
    }
    
    // Mark as having unsaved changes
    setSaveState(prev => ({ ...prev, hasUnsavedChanges: true }));
    if (typeof onDirtyChange === 'function') {
      onDirtyChange(true);
    }
    
    // Schedule auto-save after specified seconds of inactivity (like Premiere Pro)
    const delayMs = (autoSaveIntervalSec ?? 15) * 1000;
    autoSaveTimer.current = setTimeout(() => {
      // Only save if there are actually unsaved changes
      if (saveState.hasUnsavedChanges) {
        saveStoryMapToDatabase(currentNodes, currentEdges, false);
      }
    }, delayMs);
  }, [saveStoryMapToDatabase, isAutoSaveEnabled, autoSaveIntervalSec, onDirtyChange, saveState.hasUnsavedChanges]);

  // Manual save (always works regardless of auto-save setting)
  const handleManualSave = useCallback(async () => {
    // Clear auto-save timer since we're manually saving
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    try {
      await saveStoryMapToDatabase(nodes, edges, true);
    } catch (error) {
      // Error handling is done in saveStoryMapToDatabase
    }
  }, [saveStoryMapToDatabase, nodes, edges]);

  // Enhanced canvas interaction controls
  const toggleCanvasLock = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      isLocked: !prev.isLocked
    }));
    
    if (!canvasState.isLocked) {
      toast.info('Canvas locked - scroll and pan disabled');
    } else {
      toast.info('Canvas unlocked - scroll and pan enabled');
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
          type: 'custom',
          position: node.position,
          data: nodeData,
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
        data: edge,
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

  // Enhanced history management with auto-save and description
  const saveToHistory = useCallback((currentNodes: Node[], currentEdges: Edge[], description?: string) => {
    if (isInitializingRef.current || isApplyingServerUpdateRef.current) {
      return;
    }
    
    // Don't save if nothing has actually changed
    if (history.length > 0) {
      const lastState = history[historyIndex];
      if (lastState && 
          JSON.stringify(lastState.nodes) === JSON.stringify(currentNodes) &&
          JSON.stringify(lastState.edges) === JSON.stringify(currentEdges)) {
        return;
      }
    }
    
    const newState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(currentNodes)),
      edges: JSON.parse(JSON.stringify(currentEdges)),
      timestamp: Date.now(),
      description: description || 'Canvas change'
    };
    
    setHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      // Keep only last 50 states for performance
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => prev + 1);
    
    // Trigger auto-save only if we have meaningful changes
    if (description !== 'Initial state') {
      scheduleAutoSave(currentNodes, currentEdges);
    }
  }, [history, historyIndex, scheduleAutoSave]);

  // Enhanced Undo/Redo functionality with proper state restoration
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isApplyingServerUpdateRef.current = true;
      const prevState = history[historyIndex - 1];
      
      // Deep clone to prevent reference issues
      const prevNodes = JSON.parse(JSON.stringify(prevState.nodes));
      const prevEdges = JSON.parse(JSON.stringify(prevState.edges));
      
      setNodes(prevNodes);
      setEdges(prevEdges);
      setHistoryIndex(prev => prev - 1);
      
      // Clear selection state on undo
      setSelectedNode(null);
      setSelectedEdge(null);
      setSelection(prev => ({
        ...prev,
        selectedNodes: [],
        selectedEdges: []
      }));
      
      toast.success(`Undid: ${prevState.description || 'action'}`);
      
      setTimeout(() => {
        isApplyingServerUpdateRef.current = false;
      }, 100);
    } else {
      toast.info('Nothing to undo');
    }
  }, [history, historyIndex, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isApplyingServerUpdateRef.current = true;
      const nextState = history[historyIndex + 1];
      
      // Deep clone to prevent reference issues
      const nextNodes = JSON.parse(JSON.stringify(nextState.nodes));
      const nextEdges = JSON.parse(JSON.stringify(nextState.edges));
      
      setNodes(nextNodes);
      setEdges(nextEdges);
      setHistoryIndex(prev => prev + 1);
      
      // Clear selection state on redo
      setSelectedNode(null);
      setSelectedEdge(null);
      setSelection(prev => ({
        ...prev,
        selectedNodes: [],
        selectedEdges: []
      }));
      
      toast.success(`Redid: ${nextState.description || 'action'}`);
      
      setTimeout(() => {
        isApplyingServerUpdateRef.current = false;
      }, 100);
    } else {
      toast.info('Nothing to redo');
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Keyboard shortcuts for undo/redo (Photoshop-style)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
        // Trigger manual save through the parent component
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
    
    const nodesWithData = nodes.filter(n => selectedNodes.includes(n.id) && (n.data?.title || n.data?.notesForAuthor));
    const edgesWithData = edges.filter(e => selectedEdges.includes(e.id));
    
    if (nodesWithData.length > 0) {
      const ok = window.confirm(`ลบโหนด ${nodesWithData.length} รายการหรือไม่? (สามารถกู้คืนได้จากถังขยะ)`);
      if (!ok) return;
    }
    
    // Store deleted items in trash history
    const deletedNodeItems = nodesWithData.map(node => ({
      id: node.id,
      type: 'node' as const,
      data: node,
      deletedAt: new Date(),
      description: `Node: ${node.data?.title || 'Untitled'}`
    }));
    
    const deletedEdgeItems = edgesWithData.map(edge => ({
      id: edge.id,
      type: 'edge' as const,
      data: edge,
      deletedAt: new Date(),
      description: `Connection: ${edge.label || 'Unlabeled'}`
    }));
    
    setDeletedItems(prev => [...prev, ...deletedNodeItems, ...deletedEdgeItems]);
    
    const newNodes = nodes.filter(n => !selectedNodes.includes(n.id));
    const newEdges = edges.filter(e => !selectedEdges.includes(e.id));
    
    setNodes(newNodes);
    setEdges(newEdges);
    setSelection(prev => ({
      ...prev,
      selectedNodes: [],
      selectedEdges: []
    }));
    
    saveToHistory(
      newNodes,
      newEdges,
      `Deleted ${selectedNodes.length} nodes and ${selectedEdges.length} connections`
    );
    
    toast.success(
      `Deleted ${selectedNodes.length} nodes and ${selectedEdges.length} connections. Check trash to recover.`
    );
  }, [selection, nodes, edges, setNodes, setEdges, saveToHistory]);

  const copySelected = useCallback(() => {
    const { selectedNodes, selectedEdges } = selection;
    const nodesToCopy = nodes.filter(n => selectedNodes.includes(n.id));
    const edgesToCopy = edges.filter(e => selectedEdges.includes(e.id));
    setSelection(prev => ({
      ...prev,
      clipboard: { nodes: nodesToCopy, edges: edgesToCopy }
    }));
    toast.success(`Copied ${nodesToCopy.length} nodes and ${edgesToCopy.length} connections`);
  }, [selection, nodes, edges]);

  const pasteSelected = useCallback(() => {
    const { clipboard } = selection;
    if (clipboard.nodes.length === 0 && clipboard.edges.length === 0) {
      toast.error('Clipboard is empty');
      return;
    }
    const offset = 50;
    const newNodes = clipboard.nodes.map(node => ({
      ...node,
      id: `${node.id}-copy-${Date.now()}`,
      position: { x: node.position.x + offset, y: node.position.y + offset },
      selected: true
    }));
    const newEdges = clipboard.edges.map(edge => ({
      ...edge,
      id: `${edge.id}-copy-${Date.now()}`,
      source: `${edge.source}-copy-${Date.now()}`,
      target: `${edge.target}-copy-${Date.now()}`
    }));
    setNodes(nds => [...nds, ...newNodes]);
    setEdges(eds => [...eds, ...newEdges]);
    saveToHistory([...nodes, ...newNodes], [...edges, ...newEdges], `Pasted ${newNodes.length} nodes and ${newEdges.length} connections`);
    toast.success(`Pasted ${newNodes.length} nodes and ${newEdges.length} connections`);
  }, [selection, nodes, edges, setNodes, setEdges, saveToHistory]);

  // (removed older keyboard handler in favor of a single consolidated one below)

  // Keyboard shortcuts
  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    if (isCtrlOrCmd) {
      switch (event.key.toLowerCase()) {
        case 's':
          event.preventDefault();
          handleManualSave();
          return;
        case 'z':
          event.preventDefault();
          if (event.shiftKey) { redo(); } else { undo(); }
          return;
        case 'y':
          event.preventDefault();
          redo();
          return;
        case 'c':
          event.preventDefault();
          // copy uses existing handler
          return;
        case 'v':
          event.preventDefault();
          // paste uses existing handler
          return;
        case 'a':
          event.preventDefault();
          // select all uses existing handler
          return;
        case 'l':
          event.preventDefault();
          toggleCanvasLock();
          return;
      }
    } else {
      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedNode || selectedEdge) {
            event.preventDefault();
            // delete uses existing handler
          }
          return;
        case 'Escape':
          if (selectedNode || selectedEdge) {
            setSelectedNode(null);
            setSelectedEdge(null);
          }
          return;
      }
    }
  }, [handleManualSave, toggleCanvasLock, selectedNode, selectedEdge, undo, redo]);

  // Add new node with stable positioning and viewport center calculation
  const onAddNode = useCallback((nodeType: StoryMapNodeType) => {
    const timestamp = Date.now();
    const randomOffset = Math.floor(Math.random() * 50); // Add small random offset to prevent overlap
    
    // Calculate center of current viewport if reactFlowInstance is available
    let centerPosition = { x: 100 + randomOffset, y: 100 + randomOffset };
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (bounds) {
        centerPosition = reactFlowInstance.project({
          x: bounds.width / 2,
          y: bounds.height / 2,
        });
      }
    }
    
    const newNode: Node = {
      id: `node-${timestamp}-${randomOffset}`,
      type: 'custom',
      position: centerPosition,
      data: {
        nodeId: `node-${timestamp}-${randomOffset}`,
        nodeType,
        title: `New ${nodeType.replace(/_/g, ' ')}`,
        notesForAuthor: '',
        authorDefinedEmotionTags: [],
        hasError: false,
        isCompleted: false,
        // Set as first scene if this is a scene node and no other scene nodes exist
        isFirstScene: nodeType === StoryMapNodeType.SCENE_NODE && 
          !nodes.some(n => n.data.nodeType === StoryMapNodeType.SCENE_NODE)
      }
    };

    // Add node using functional update to prevent stale state issues
    setNodes(currentNodes => {
      const newNodes = [...currentNodes, newNode];
      // Schedule history save after state update
      setTimeout(() => saveToHistory(newNodes, edges, `Added ${nodeType.replace(/_/g, ' ').toLowerCase()}`), 50);
      return newNodes;
    });
    
    setIsSidebarOpen(false); // Close sidebar on mobile
    toast.success(`Added new ${nodeType.replace(/_/g, ' ').toLowerCase()}`);
    
    // Auto-select the new node after a brief delay
    setTimeout(() => {
      setSelectedNode(newNode);
      setSelection(prev => ({
        ...prev,
        selectedNodes: [newNode.id],
        selectedEdges: []
      }));
    }, 100);
  }, [nodes, edges, setNodes, saveToHistory, reactFlowInstance]);

  // Update node data
  const onNodeUpdate = useCallback((nodeId: string, newData: any) => {
    setNodes(nds => nds.map(node =>
      node.id === nodeId ? { ...node, data: newData } : node
    ));
    saveToHistory(
      nodes.map(node => node.id === nodeId ? { ...node, data: newData } : node),
      edges
    );
  }, [nodes, edges, setNodes, saveToHistory]);

  // Update edge data
  const onEdgeUpdate = useCallback((edgeId: string, newData: any) => {
    setEdges(eds => eds.map(edge =>
      edge.id === edgeId ? { ...edge, data: newData } : edge
    ));
  }, [setEdges]);

  // Enhanced connections with database sync and validation
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    
    // Prevent self-connections
    if (params.source === params.target) {
      toast.error('Cannot connect a node to itself');
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
      toast.warning('Connection already exists');
      return;
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
        label: '',
        priority: 1,
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
    
    setEdges(eds => addEdge(newEdge, eds));
    saveToHistory(nodes, [...edges, newEdge], 'Connected nodes');
    toast.success('Connected nodes');
    
    // Auto-save the connection to database
    if (isAutoSaveEnabled) {
      scheduleAutoSave(nodes, [...edges, newEdge]);
    }
  }, [nodes, edges, setEdges, saveToHistory, isAutoSaveEnabled, scheduleAutoSave]);

  // Enhanced Selection handler with multi-selection support
  const onSelectionChange = useCallback<OnSelectionChangeFunc>(({ nodes: selectedNodes, edges: selectedEdges }) => {
    // Set single selection states
    setSelectedNode(selectedNodes[0] || null);
    setSelectedEdge(selectedEdges[0] || null);
    
    // Update multi-selection state
    setSelection(prev => ({
      ...prev,
      selectedNodes: selectedNodes.map(n => n.id),
      selectedEdges: selectedEdges.map(e => e.id)
    }));
    
    // If multi-selection mode is active and we have multiple selections, keep the mode active
    if (selection.multiSelectMode && selectedNodes.length > 1) {
      // Keep multi-select mode active
    } else if (selectedNodes.length <= 1) {
      // Auto-disable multi-select mode when single selection
      setSelection(prev => ({
        ...prev,
        multiSelectMode: false
      }));
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

  // Custom node types
  const nodeTypes: NodeTypes = useMemo(() => ({
    custom: CustomNode
  }), []);

  // Expose methods to parent via ref
  React.useImperativeHandle(ref, () => ({
    handleManualSave
  }), [handleManualSave]);

  return (
      <div className="h-full flex flex-col md:flex-row bg-background text-foreground blueprint-canvas relative">
        {/* Enhanced Desktop/Tablet Sidebar - Scrollable */}
        <AnimatePresence mode="wait">
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="hidden md:block border-r bg-card/50 blueprint-sidebar"
            >
              <div className="flex flex-col h-full">
                {/* Fixed Header */}
                <div className="p-4 border-b bg-card/80 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Story Blueprint
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSidebarCollapsed(true)}
                    title="Collapse sidebar"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
                {/* Scrollable Content */}
              <div className="flex-1 overflow-hidden">
                  <Tabs defaultValue="palette" className="flex flex-col h-full">
                    <div className="px-4 pt-4">
                      <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="palette">Nodes</TabsTrigger>
                    <TabsTrigger value="validation">Validation</TabsTrigger>
                  </TabsList>
                    </div>
                    
                    <TabsContent value="palette" className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full px-4 pb-4 custom-scrollbar">
                        <div className="space-y-4 pt-4">
                        <NodePalette onAddNode={onAddNode} />
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
              title="Expand sidebar"
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
                          saveToHistory(nodes, edges);
                        }, 500);
                      } else {
                        // Immediate save for add/remove operations
                        saveToHistory(nodes, edges);
                      }
                    }
                  } catch (error) {
                    console.error('Error handling node changes:', error);
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
                      saveToHistory(nodes, edges);
                    }
                  } catch (error) {
                    console.error('Error handling edge changes:', error);
                  }
                }}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                onNodeClick={(event, node) => {
                  // Enhanced multi-select mode handling (Canva-style)
                  if (selection.multiSelectMode) {
                    const isAlreadySelected = selection.pendingSelection.includes(node.id);
                    
                    setSelection(prev => ({
                      ...prev,
                      pendingSelection: isAlreadySelected
                        ? prev.pendingSelection.filter(id => id !== node.id)
                        : [...prev.pendingSelection, node.id],
                      showSelectionBar: true
                    }));
                  } else {
                    // Regular single selection
                    setSelectedNode(node);
                    setSelectedEdge(null);
                  }
                }}
                onInit={setReactFlowInstance}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                attributionPosition="bottom-left"
                className="bg-background"
                selectionMode={selection.multiSelectMode ? SelectionMode.Full : SelectionMode.Partial}
                multiSelectionKeyCode={selection.multiSelectMode ? null : ["Meta", "Control", "Shift"]}
                deleteKeyCode={["Backspace", "Delete"]}
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
                  variant={canvasState.showGrid ? BackgroundVariant.Dots : BackgroundVariant.Cross} 
                  gap={canvasState.gridSize}
                  size={canvasState.showGrid ? 1 : 2}
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
                      <Trash2 className="w-4 h-4" />
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
                        variant={selection.multiSelectMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelection(prev => ({ 
                            ...prev, 
                          multiSelectMode: !prev.multiSelectMode,
                          selectedNodes: [],
                          selectedEdges: [],
                          pendingSelection: [],
                          showSelectionBar: false
                        }))}
                        className="h-8 w-8 p-0 bg-background/80 hover:bg-background/90 border-2"
                        title="Multi Select Mode"
                      >
                        <MousePointer2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Separator orientation={isMobile ? "horizontal" : "vertical"} className={isMobile ? "w-full" : "h-6"} />

                    {/* Grid Toggle */}
                    <Button
                      variant={canvasState.showGrid ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCanvasState(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                      className="h-8 w-8 p-0"
                      title="Toggle Grid"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>

                    {/* Undo/Redo */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={undo}
                      disabled={historyIndex <= 0}
                      className="h-8 w-8 p-0"
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={redo}
                      disabled={historyIndex >= history.length - 1}
                      className="h-8 w-8 p-0"
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo2 className="w-4 h-4" />
                    </Button>

                    <Separator orientation={isMobile ? "horizontal" : "vertical"} className={isMobile ? "w-full" : "h-6"} />

                    {!isMobile && (
                      <Button
                        variant={selection.multiSelectMode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelection(prev => ({ ...prev, multiSelectMode: !prev.multiSelectMode }))}
                        className="h-8 px-2"
                        title="Multiple select mode (Click to toggle multi-select)"
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



              {/* Selection Info Panel - Mobile: below episode selector, Desktop: below toolbar */}
              {(selectedNode || selectedEdge || (selection.selectedNodes.length > 1 && !selection.multiSelectMode)) && (
                <Panel 
                  position={isMobile ? "top-left" : "top-left"} 
                  className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg max-w-80"
                  style={isMobile ? { top: 60, left: 56 } : { top: 60, left: 0 }}
                >
                  {/* Multiple Selection Info Panel */}
                  {selection.selectedNodes.length > 1 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                          Multiple Selection
                        </Badge>
                        <span className="font-medium text-sm">
                          {selection.selectedNodes.length} nodes selected
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
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
                          Copy
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
                  )}

                  {/* Single Selection Info Panel */}
                  {selection.selectedNodes.length <= 1 && selectedNode && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {selectedNode.data.nodeType.replace(/_/g, ' ')}
                        </Badge>
                        <span className="font-medium text-sm truncate">{selectedNode.data.title}</span>
                      </div>
                      {selectedNode.data.notesForAuthor && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {selectedNode.data.notesForAuthor}
                        </p>
                      )}
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Navigate to Director tab with context
                            if (selectedNode?.data?.nodeSpecificData?.sceneId && typeof onNavigateToDirector === 'function') {
                              onNavigateToDirector(selectedNode.data.nodeSpecificData.sceneId);
                            } else {
                              setIsPropertiesOpen(true);
                            }
                          }}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
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
                  )}

                  {/* Edge Selection Info Panel */}
                  {selection.selectedNodes.length <= 1 && selectedEdge && !selectedNode && (
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
                            // Always navigate to Director Tab for edge editing
                            if (typeof onNavigateToDirector === 'function') {
                              // Try to get scene information from connected nodes
                              const sourceNode = nodes.find(n => n.id === selectedEdge.source);
                              const targetNode = nodes.find(n => n.id === selectedEdge.target);
                              
                              // If source node has scene data, pass its scene ID
                              const sceneId = sourceNode?.data?.sceneData?._id || 
                                            targetNode?.data?.sceneData?._id;
                              
                              onNavigateToDirector(sceneId);
                            }
                          }}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEdges(edges => edges.filter(e => e.id !== selectedEdge.id));
                            setSelectedEdge(null);
                            saveToHistory(nodes, edges.filter(e => e.id !== selectedEdge.id), 'Deleted connection');
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
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
          
          {/* Canva-style Selection Confirmation Bar */}
          <AnimatePresence>
            {selection.showSelectionBar && selection.pendingSelection.length > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50"
              >
                <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-lg flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {selection.pendingSelection.length} item{selection.pendingSelection.length > 1 ? 's' : ''} selected
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelection(prev => ({ 
                        ...prev, 
                        pendingSelection: [], 
                        showSelectionBar: false 
                      }))}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        // Confirm selection and show Multiple Selection Info Panel
                        setSelection(prev => ({
                          ...prev,
                          selectedNodes: prev.pendingSelection,
                          pendingSelection: [],
                          showSelectionBar: false,
                          multiSelectMode: false
                        }));
                        
                        // Clear single selection
                        setSelectedNode(null);
                        setSelectedEdge(null);
                      }}
                    >
                      Confirm Selection
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
              transition={{ duration: 0.3, ease: "easeInOut" }}
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
                      onNodeUpdate={onNodeUpdate}
                      onEdgeUpdate={onEdgeUpdate}
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
                    <NodePalette onAddNode={onAddNode} />
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
                    <NodePalette onAddNode={onAddNode} />
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
                  onNodeUpdate={onNodeUpdate}
                  onEdgeUpdate={onEdgeUpdate}
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
                  onNodeUpdate={onNodeUpdate}
                  onEdgeUpdate={onEdgeUpdate}
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
                          {item.type === 'node' && (item.data as Node).data?.notesForAuthor && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              Notes: {(item.data as Node).data.notesForAuthor}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Restore item
                              if (item.type === 'node') {
                                const nodeData = item.data as Node;
                                setNodes(prev => [...prev, nodeData]);
                                saveToHistory([...nodes, nodeData], edges, `Restored node: ${nodeData.data?.title || 'Untitled'}`);
                              } else {
                                const edgeData = item.data as Edge;
                                setEdges(prev => [...prev, edgeData]);
                                saveToHistory(nodes, [...edges, edgeData], `Restored connection: ${edgeData.label || 'Unlabeled'}`);
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
                // Restore all items
                if (deletedItems.length > 0) {
                  const ok = window.confirm(`Restore all ${deletedItems.length} items from trash?`);
                  if (ok) {
                    const nodesToRestore = deletedItems.filter(item => item.type === 'node').map(item => item.data as Node);
                    const edgesToRestore = deletedItems.filter(item => item.type === 'edge').map(item => item.data as Edge);
                    
                    setNodes(prev => [...prev, ...nodesToRestore]);
                    setEdges(prev => [...prev, ...edgesToRestore]);
                    saveToHistory([...nodes, ...nodesToRestore], [...edges, ...edgesToRestore], 'Restored all items from trash');
                    
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