// src/app/novels/[slug]/overview/components/unified/mobile/MobileStoryMapView.tsx
'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPinIcon,
  PlayIcon,
  GitBranchIcon,
  FlagIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon
} from 'lucide-react';

import { NovelData, StoryMapData } from '../../../page';

interface EditorState {
  selectedNodeId: string | null;
  analyticsEnabled: boolean;
  emotionalMapEnabled: boolean;
  [key: string]: any;
}

interface MobileStoryMapViewProps {
  novel: NovelData;
  storyMap: StoryMapData;
  scenes: any[];
  editorState: EditorState;
  updateEditorState: (updates: Partial<EditorState>) => void;
}

export function MobileStoryMapView({
  novel,
  storyMap,
  scenes,
  editorState,
  updateEditorState
}: MobileStoryMapViewProps) {

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  // Filter and sort nodes
  const filteredNodes = useMemo(() => {
    let nodes = storyMap.nodes.filter(node => 
      !searchQuery || node.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by position or creation order
    return nodes.sort((a, b) => a.position.y - b.position.y);
  }, [storyMap.nodes, searchQuery]);

  // Node type icons
  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'start_node':
        return <PlayIcon className="w-5 h-5 text-green-500" />;
      case 'choice_node':
        return <GitBranchIcon className="w-5 h-5 text-blue-500" />;
      case 'ending_node':
        return <FlagIcon className="w-5 h-5 text-red-500" />;
      case 'scene_node':
        return <MessageSquareIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <MapPinIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  // Node type colors
  const getNodeColor = (nodeType: string) => {
    switch (nodeType) {
      case 'start_node':
        return 'bg-green-100 border-green-300 dark:bg-green-900 dark:border-green-700';
      case 'choice_node':
        return 'bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-700';
      case 'ending_node':
        return 'bg-red-100 border-red-300 dark:bg-red-900 dark:border-red-700';
      case 'scene_node':
        return 'bg-purple-100 border-purple-300 dark:bg-purple-900 dark:border-purple-700';
      default:
        return 'bg-gray-100 border-gray-300 dark:bg-gray-900 dark:border-gray-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Story Map</h2>
          
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
          <div className="bg-muted/50 rounded p-2 text-center">
            <div className="font-semibold text-foreground">{storyMap.nodes.length}</div>
            <div className="text-muted-foreground">Nodes</div>
          </div>
          <div className="bg-muted/50 rounded p-2 text-center">
            <div className="font-semibold text-foreground">{storyMap.edges.length}</div>
            <div className="text-muted-foreground">Connections</div>
          </div>
          <div className="bg-muted/50 rounded p-2 text-center">
            <div className="font-semibold text-foreground">{scenes.length}</div>
            <div className="text-muted-foreground">Scenes</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'list' ? (
          <div className="p-4 space-y-3">
            {filteredNodes.map((node, index) => {
              const isSelected = editorState.selectedNodeId === node.nodeId;
              const connectedEdges = storyMap.edges.filter(
                edge => edge.sourceNodeId === node.nodeId || edge.targetNodeId === node.nodeId
              );

              return (
                <motion.div
                  key={node.nodeId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : `${getNodeColor(node.nodeType)} hover:shadow-md`
                  }`}
                  onClick={() => updateEditorState({ selectedNodeId: node.nodeId })}
                >
                  <div className="flex items-start space-x-3">
                    {/* Node Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNodeIcon(node.nodeType)}
                    </div>

                    {/* Node Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-foreground truncate">
                          {node.title}
                        </h3>
                        <span className="text-xs text-muted-foreground capitalize">
                          {node.nodeType.replace('_', ' ')}
                        </span>
                      </div>

                      {node.notesForAuthor && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {node.notesForAuthor}
                        </p>
                      )}

                      {/* Emotion Tags */}
                      {node.authorDefinedEmotionTags && node.authorDefinedEmotionTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {node.authorDefinedEmotionTags.slice(0, 3).map((emotion: string) => (
                            <span
                              key={emotion}
                              className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full"
                            >
                              {emotion}
                            </span>
                          ))}
                          {node.authorDefinedEmotionTags.length > 3 && (
                            <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                              +{node.authorDefinedEmotionTags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Connection Info */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{connectedEdges.length} connections</span>
                        {node.authorDefinedPsychologicalImpact && (
                          <span>Impact: {node.authorDefinedPsychologicalImpact}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {filteredNodes.length === 0 && (
              <div className="text-center py-12">
                <MapPinIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No nodes found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try adjusting your search terms' : 'Create your first story node'}
                </p>
                {!searchQuery && (
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                    <PlusIcon className="w-4 h-4 mr-2 inline" />
                    Add Node
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {/* Timeline View */}
            <div className="space-y-4">
              {filteredNodes.map((node, index) => (
                <div key={node.nodeId} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-xs text-primary-foreground font-medium">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {getNodeIcon(node.nodeType)}
                      <span className="text-sm font-medium text-foreground">
                        {node.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {node.nodeType.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Node FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-24 right-6 w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-30"
        whileTap={{ scale: 0.9 }}
      >
        <PlusIcon className="w-6 h-6" />
      </motion.button>
    </div>
  );
}