// src/app/novels/[slug]/overview/components/unified/narrative/NarrativeCommandCenter.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3Icon, 
  HeartIcon, 
  MapPinIcon,
  SearchIcon,
  FilterIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RotateCcwIcon,
  AlertTriangleIcon
} from 'lucide-react';

import { NovelData, EpisodeData, StoryMapData } from '../../../page';
import { EditorState } from '../UnifiedStorytellingEnvironment';

interface NarrativeCommandCenterProps {
  novel: NovelData;
  episodes: EpisodeData[];
  storyMap: StoryMapData;
  characters: any[];
  scenes: any[];
  editorState: EditorState;
  updateEditorState: (updates: Partial<EditorState>) => void;
}

// สีสำหรับ Emotion Tags
const EMOTION_COLORS = {
  'happy': '#FCD34D',
  'sad': '#60A5FA', 
  'angry': '#F87171',
  'fear': '#A78BFA',
  'love': '#FB7185',
  'excitement': '#34D399',
  'mystery': '#6B7280',
  'tension': '#F59E0B',
  'relief': '#10B981',
  'surprise': '#8B5CF6',
} as const;

export function NarrativeCommandCenter({
  novel,
  episodes,
  storyMap,
  characters,
  scenes,
  editorState,
  updateEditorState
}: NarrativeCommandCenterProps) {
  
  const [activeView, setActiveView] = useState<'storymap' | 'analytics' | 'emotions'>('storymap');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  // Mock Analytics Data
  const mockAnalyticsData = useMemo(() => ({
    totalReaders: 1247,
    completionRate: 68.5,
    dropOffPoints: [
      { nodeId: 'node-1', sceneId: 'scene-1', dropOffRate: 15.2, totalVisitors: 1247 },
    ],
    choiceDistribution: [
      { choiceId: 'choice-1', nodeId: 'node-2', text: 'ตัวเลือกที่ 1', selectionRate: 65.4 },
    ],
    emotionalImpactScores: [
      { nodeId: 'node-1', sceneId: 'scene-1', averageImpact: 7.8, emotionTags: ['excitement'] },
    ]
  }), []);

  const filteredNodes = useMemo(() => {
    return storyMap.nodes.filter(node => 
      !searchQuery || node.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [storyMap.nodes, searchQuery]);

  const handleNodeSelect = useCallback((nodeId: string) => {
    updateEditorState({ selectedNodeId: nodeId });
  }, [updateEditorState]);

  const handleZoomIn = useCallback(() => {
    updateEditorState({ zoomLevel: Math.min(editorState.zoomLevel * 1.2, 3) });
  }, [editorState.zoomLevel, updateEditorState]);

  const handleZoomOut = useCallback(() => {
    updateEditorState({ zoomLevel: Math.max(editorState.zoomLevel / 1.2, 0.3) });
  }, [editorState.zoomLevel, updateEditorState]);

  const handleZoomReset = useCallback(() => {
    updateEditorState({ zoomLevel: 1, panOffset: { x: 0, y: 0 } });
  }, [updateEditorState]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Narrative Command Center</h2>
          
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveView('storymap')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                activeView === 'storymap'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPinIcon className="w-3 h-3 mr-1 inline" />
              Story Map
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                activeView === 'analytics'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3Icon className="w-3 h-3 mr-1 inline" />
              Analytics
            </button>
            <button
              onClick={() => setActiveView('emotions')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                activeView === 'emotions'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <HeartIcon className="w-3 h-3 mr-1 inline" />
              Emotions
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหา node, ฉาก, หรือหมายเหตุ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button className="p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
            <FilterIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/50 rounded p-2 text-center">
            <div className="font-semibold text-foreground">{storyMap.nodes.length}</div>
            <div className="text-muted-foreground">Nodes</div>
          </div>
          <div className="bg-muted/50 rounded p-2 text-center">
            <div className="font-semibold text-foreground">{scenes.length}</div>
            <div className="text-muted-foreground">Scenes</div>
          </div>
          <div className="bg-muted/50 rounded p-2 text-center">
            <div className="font-semibold text-foreground">{mockAnalyticsData.totalReaders}</div>
            <div className="text-muted-foreground">Readers</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col space-y-1">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-background/90 backdrop-blur-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            <ZoomInIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-background/90 backdrop-blur-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            <ZoomOutIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomReset}
            className="p-2 bg-background/90 backdrop-blur-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            <RotateCcwIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Story Map Canvas */}
        <div 
          className="w-full h-full bg-muted/30 relative overflow-hidden"
          style={{
            transform: `scale(${editorState.zoomLevel}) translate(${editorState.panOffset.x}px, ${editorState.panOffset.y}px)`,
            transformOrigin: 'center center'
          }}
        >
          {filteredNodes.map((node) => {
            const isSelected = editorState.selectedNodeId === node.nodeId;
            const isHovered = hoveredNode === node.nodeId;
            
            return (
              <motion.div
                key={node.nodeId}
                className={`absolute cursor-pointer transition-all duration-200 ${
                  isSelected ? 'z-20' : 'z-10'
                }`}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  width: node.dimensions?.width || 120,
                  height: node.dimensions?.height || 60
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setHoveredNode(node.nodeId)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeSelect(node.nodeId)}
              >
                <div className={`w-full h-full rounded-lg border-2 transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/10' 
                    : isHovered
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border bg-card'
                }`}>
                  
                  {/* Analytics Overlay */}
                  {editorState.analyticsEnabled && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      7.8
                    </div>
                  )}

                  {/* Emotional Overlay */}
                  {editorState.emotionalMapEnabled && node.authorDefinedEmotionTags && (
                    <div className="absolute -top-1 -left-1 flex space-x-1">
                      {node.authorDefinedEmotionTags.slice(0, 2).map((emotion: string) => (
                        <div
                          key={emotion}
                          className="w-3 h-3 rounded-full border border-white"
                          style={{ 
                            backgroundColor: EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS] || '#6B7280' 
                          }}
                          title={emotion}
                        />
                      ))}
                    </div>
                  )}

                  {/* Node Content */}
                  <div className="p-3 h-full flex flex-col justify-center">
                    <div className="text-sm font-medium text-foreground line-clamp-2">
                      {node.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {node.nodeType}
                    </div>
                  </div>

                  {/* Drop-off Warning */}
                  {editorState.analyticsEnabled && node.nodeId === 'node-1' && (
                    <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1">
                      <AlertTriangleIcon className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Render Edges */}
          {storyMap.edges.map((edge) => {
            const sourceNode = storyMap.nodes.find(n => n.nodeId === edge.sourceNodeId);
            const targetNode = storyMap.nodes.find(n => n.nodeId === edge.targetNodeId);
            
            if (!sourceNode || !targetNode) return null;

            const sourceX = sourceNode.position.x + (sourceNode.dimensions?.width || 120) / 2;
            const sourceY = sourceNode.position.y + (sourceNode.dimensions?.height || 60);
            const targetX = targetNode.position.x + (targetNode.dimensions?.width || 120) / 2;
            const targetY = targetNode.position.y;

            return (
              <svg
                key={edge.edgeId}
                className="absolute pointer-events-none"
                style={{
                  left: Math.min(sourceX, targetX) - 50,
                  top: Math.min(sourceY, targetY) - 50,
                  width: Math.abs(targetX - sourceX) + 100,
                  height: Math.abs(targetY - sourceY) + 100
                }}
              >
                <defs>
                  <marker
                    id={`arrowhead-${edge.edgeId}`}
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="#6B7280"
                    />
                  </marker>
                </defs>
                
                <path
                  d={`M ${sourceX - (Math.min(sourceX, targetX) - 50)} ${sourceY - (Math.min(sourceY, targetY) - 50)} 
                     Q ${sourceX - (Math.min(sourceX, targetX) - 50)} ${targetY - (Math.min(sourceY, targetY) - 50)} 
                       ${targetX - (Math.min(sourceX, targetX) - 50)} ${targetY - (Math.min(sourceY, targetY) - 50)}`}
                  stroke="#6B7280"
                  strokeWidth="2"
                  fill="none"
                  markerEnd={`url(#arrowhead-${edge.edgeId})`}
                />
              </svg>
            );
          })}
        </div>
      </div>
    </div>
  );
}