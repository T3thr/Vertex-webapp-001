"use client";

import React from 'react';
import { 
  Flag, 
  Film, 
  GitBranch, 
  Diamond, 
  Trophy, 
  MessageSquare, 
  Calculator,
  Zap,
  Clock,
  Shuffle,
  Layers,
  FileText
} from 'lucide-react';

interface NodePaletteItem {
  id: string;
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  category: 'flow' | 'logic' | 'content' | 'utility';
}

const nodeTypes: NodePaletteItem[] = [
  // Flow Control Nodes
  {
    id: 'start',
    type: 'startNode',
    label: 'Start',
    icon: Flag,
    description: 'Beginning of the story',
    color: 'bg-green-500',
    category: 'flow'
  },
  {
    id: 'scene',
    type: 'sceneNode',
    label: 'Scene',
    icon: Film,
    description: 'A story scene with content',
    color: 'bg-blue-500',
    category: 'content'
  },
  {
    id: 'ending',
    type: 'endingNode',
    label: 'Ending',
    icon: Trophy,
    description: 'Story conclusion',
    color: 'bg-yellow-500',
    category: 'flow'
  },

  // Logic Nodes
  {
    id: 'choice',
    type: 'choiceNode',
    label: 'Choice',
    icon: GitBranch,
    description: 'Player decision point',
    color: 'bg-purple-500',
    category: 'logic'
  },
  {
    id: 'branch',
    type: 'branchNode',
    label: 'Branch',
    icon: Diamond,
    description: 'Conditional logic',
    color: 'bg-amber-500',
    category: 'logic'
  },
  {
    id: 'variable',
    type: 'variableModifierNode',
    label: 'Variable',
    icon: Calculator,
    description: 'Modify story variables',
    color: 'bg-indigo-500',
    category: 'logic'
  },

  // Utility Nodes
  {
    id: 'comment',
    type: 'commentNode',
    label: 'Comment',
    icon: MessageSquare,
    description: 'Author notes and comments',
    color: 'bg-yellow-400',
    category: 'utility'
  },
  {
    id: 'event',
    type: 'eventTriggerNode',
    label: 'Event',
    icon: Zap,
    description: 'Trigger game events',
    color: 'bg-red-500',
    category: 'logic'
  },
  {
    id: 'delay',
    type: 'delayNode',
    label: 'Delay',
    icon: Clock,
    description: 'Time-based delay',
    color: 'bg-gray-500',
    category: 'utility'
  },
  {
    id: 'random',
    type: 'randomBranchNode',
    label: 'Random',
    icon: Shuffle,
    description: 'Random path selection',
    color: 'bg-pink-500',
    category: 'logic'
  },
  {
    id: 'group',
    type: 'groupNode',
    label: 'Group',
    icon: Layers,
    description: 'Group multiple nodes',
    color: 'bg-slate-500',
    category: 'utility'
  }
];

const categories = [
  { id: 'flow', label: 'Flow Control', color: 'text-green-600' },
  { id: 'content', label: 'Content', color: 'text-blue-600' },
  { id: 'logic', label: 'Logic', color: 'text-purple-600' },
  { id: 'utility', label: 'Utility', color: 'text-gray-600' }
];

const NodePalette: React.FC = () => {
  const [activeCategory, setActiveCategory] = React.useState<string>('all');

  const filteredNodes = activeCategory === 'all' 
    ? nodeTypes 
    : nodeTypes.filter(node => node.category === activeCategory);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-palette flex flex-col h-full">
      {/* Category Tabs */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              activeCategory === 'all'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                activeCategory === category.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredNodes.map(node => {
          const IconComponent = node.icon;
          return (
            <div
              key={node.id}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className="node-palette-item p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 ${node.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {node.label}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    {node.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p>💡 <strong>Drag & Drop:</strong> Drag nodes to canvas</p>
          <p>🔗 <strong>Connect:</strong> Drag from handles to link nodes</p>
          <p>⚡ <strong>Edit:</strong> Click nodes to edit properties</p>
        </div>
      </div>
    </div>
  );
};

export default NodePalette;