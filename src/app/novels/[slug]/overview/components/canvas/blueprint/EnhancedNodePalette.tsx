// src/app/novels/[slug]/overview/components/canvas/blueprint/EnhancedNodePalette.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play,
  GitBranch,
  MessageSquare,
  FileText,
  Settings,
  Zap,
  Hash,
  Plus,
  Search,
  Filter,
  HelpCircle
} from 'lucide-react';

interface NodeType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'core' | 'logic' | 'content' | 'utility';
  color: string;
  isAvailable: boolean;
  tooltip: string;
}

interface EnhancedNodePaletteProps {
  onNodeCreate?: (nodeType: string) => void;
  isGuidedMode?: boolean;
  selectedNodeId?: string;
  disabled?: boolean;
}

const nodeTypes: NodeType[] = [
  // Core Nodes
  {
    id: 'startNode',
    name: 'Start',
    description: 'Beginning of your story',
    icon: Play,
    category: 'core',
    color: 'bg-green-500',
    isAvailable: true,
    tooltip: 'Every story needs a starting point. This is where your visual novel begins.'
  },
  {
    id: 'sceneNode',
    name: 'Scene',
    description: 'Story scene with dialogue',
    icon: MessageSquare,
    category: 'core',
    color: 'bg-blue-500',
    isAvailable: true,
    tooltip: 'The main building blocks of your story. Contains dialogue, characters, and backgrounds.'
  },
  {
    id: 'choiceNode',
    name: 'Choice',
    description: 'Player decision point',
    icon: GitBranch,
    category: 'core',
    color: 'bg-purple-500',
    isAvailable: true,
    tooltip: 'Let players make decisions that affect the story. Create branching narratives.'
  },
  {
    id: 'endingNode',
    name: 'Ending',
    description: 'Story conclusion',
    icon: FileText,
    category: 'core',
    color: 'bg-red-500',
    isAvailable: true,
    tooltip: 'Mark the end of a story path. You can have multiple endings for different choices.'
  },
  
  // Logic Nodes
  {
    id: 'branchNode',
    name: 'Branch',
    description: 'Conditional logic',
    icon: GitBranch,
    category: 'logic',
    color: 'bg-orange-500',
    isAvailable: true,
    tooltip: 'Create conditional branches based on variables, previous choices, or game state.'
  },
  {
    id: 'variableModifierNode',
    name: 'Variable',
    description: 'Modify story variables',
    icon: Hash,
    category: 'logic',
    color: 'bg-yellow-500',
    isAvailable: true,
    tooltip: 'Change story variables like relationship points, inventory items, or flags.'
  },
  {
    id: 'eventTriggerNode',
    name: 'Event',
    description: 'Trigger special events',
    icon: Zap,
    category: 'utility',
    color: 'bg-pink-500',
    isAvailable: true,
    tooltip: 'Trigger achievements, save points, or other special game events.'
  },
  
  // Utility Nodes
  {
    id: 'commentNode',
    name: 'Comment',
    description: 'Notes for yourself',
    icon: FileText,
    category: 'utility',
    color: 'bg-gray-500',
    isAvailable: true,
    tooltip: 'Add notes and reminders that only you can see. Helps organize complex stories.'
  }
];

const categoryNames = {
  core: 'Core Nodes',
  logic: 'Logic Nodes',
  content: 'Content Nodes',
  utility: 'Utility Nodes'
};

const EnhancedNodePalette: React.FC<EnhancedNodePaletteProps> = ({
  onNodeCreate,
  isGuidedMode = false,
  selectedNodeId,
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Filter nodes based on search and category
  const filteredNodes = nodeTypes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
    return matchesSearch && matchesCategory && node.isAvailable;
  });

  // Group nodes by category
  const nodesByCategory = filteredNodes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, NodeType[]>);

  const handleNodeCreate = useCallback((nodeType: string) => {
    if (disabled || !onNodeCreate) return;
    onNodeCreate(nodeType);
  }, [disabled, onNodeCreate]);

  return (
    <div className="enhanced-node-palette h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground mb-3">Node Palette</h3>
        
        {/* Guided Mode Indicator */}
        {isGuidedMode && (
          <motion.div 
            className="mb-3 p-2 bg-primary/10 border border-primary/20 rounded-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium text-primary">Guided Mode</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Click a node type, then click the connection points to add it
            </p>
          </motion.div>
        )}

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent text-accent-foreground hover:bg-accent/80'
            }`}
          >
            All
          </button>
          {Object.keys(categoryNames).map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-2 py-1 text-xs rounded transition-colors capitalize ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-accent-foreground hover:bg-accent/80'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {Object.keys(nodesByCategory).length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-muted-foreground text-sm">No nodes found</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {Object.entries(nodesByCategory).map(([category, nodes]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  {categoryNames[category as keyof typeof categoryNames]}
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {nodes.map(node => {
                    const IconComponent = node.icon;
                    const isDisabled = disabled || (isGuidedMode && !selectedNodeId);
                    
                    return (
                      <motion.button
                        key={node.id}
                        onClick={() => handleNodeCreate(node.id)}
                        disabled={isDisabled}
                        className={`relative flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed border-border bg-card'
                            : 'border-border bg-card hover:bg-accent hover:border-accent-foreground/20 hover:shadow-sm'
                        }`}
                        whileHover={!isDisabled ? { scale: 1.02 } : {}}
                        whileTap={!isDisabled ? { scale: 0.98 } : {}}
                        onMouseEnter={() => setShowTooltip(node.id)}
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        <div className={`w-8 h-8 rounded-md ${node.color} flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-foreground text-sm">{node.name}</h5>
                          <p className="text-xs text-muted-foreground truncate">{node.description}</p>
                        </div>
                        
                        {/* Tooltip */}
                        <AnimatePresence>
                          {showTooltip === node.id && (
                            <motion.div
                              className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 w-64 p-3 bg-popover border border-border rounded-lg shadow-lg"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-6 h-6 rounded ${node.color} flex items-center justify-center`}>
                                  <IconComponent className="w-3 h-3 text-white" />
                                </div>
                                <h6 className="font-medium text-popover-foreground">{node.name}</h6>
                              </div>
                              <p className="text-sm text-muted-foreground">{node.tooltip}</p>
                              
                              {/* Arrow */}
                              <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-popover" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HelpCircle className="w-4 h-4" />
          <span>
            {isGuidedMode 
              ? 'Select a node in the canvas first, then choose a node type to add'
              : 'Drag and drop nodes onto the canvas to build your story'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedNodePalette;