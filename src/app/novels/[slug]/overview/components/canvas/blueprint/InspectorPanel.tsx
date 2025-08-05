"use client";

import React, { useState, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { 
  Settings, 
  FileText, 
  Link, 
  Code, 
  Eye,
  EyeOff,
  Trash2,
  Copy,
  RotateCcw
} from 'lucide-react';

interface InspectorPanelProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  storyMap: any;
  scenes: any[];
  characters: any[];
  onNodeUpdate: (nodeId: string, updates: any) => void;
  onEdgeUpdate: (edgeId: string, updates: any) => void;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedNode,
  selectedEdge,
  storyMap,
  scenes,
  characters,
  onNodeUpdate,
  onEdgeUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'data' | 'style'>('properties');

  // Reset to properties tab when selection changes
  useEffect(() => {
    setActiveTab('properties');
  }, [selectedNode, selectedEdge]);

  const renderNodeInspector = () => {
    if (!selectedNode) return null;

    return (
      <div className="space-y-4">
        {/* Basic Properties */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={String(selectedNode.data.title || '')}
              onChange={(e) => onNodeUpdate(selectedNode.id, { title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter node title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Node ID
            </label>
            <input
              type="text"
              value={String(selectedNode.data.nodeId || selectedNode.id)}
              onChange={(e) => onNodeUpdate(selectedNode.id, { nodeId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="unique-node-id"
            />
          </div>
        </div>

        {/* Node-Specific Properties */}
        {renderNodeSpecificProperties()}

        {/* Position & Size */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Position & Size</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">X</label>
              <input
                type="number"
                value={Math.round(selectedNode.position.x)}
                onChange={(e) => onNodeUpdate(selectedNode.id, { 
                  position: { ...selectedNode.position, x: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Y</label>
              <input
                type="number"
                value={Math.round(selectedNode.position.y)}
                onChange={(e) => onNodeUpdate(selectedNode.id, { 
                  position: { ...selectedNode.position, y: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Author Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Author Notes
          </label>
          <textarea
            value={String((selectedNode.data as any).notesForAuthor || '')}
            onChange={(e) => onNodeUpdate(selectedNode.id, { notesForAuthor: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Add notes for this node..."
          />
        </div>
      </div>
    );
  };

  const renderNodeSpecificProperties = () => {
    if (!selectedNode) return null;

    const nodeType = selectedNode.type;

    switch (nodeType) {
      case 'sceneNode':
        return (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Scene Properties</h4>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Linked Scene
              </label>
              <select
                value={(selectedNode.data as any).nodeSpecificData?.sceneId || ''}
                onChange={(e) => onNodeUpdate(selectedNode.id, {
                  nodeSpecificData: {
                    ...((selectedNode.data as any).nodeSpecificData || {}),
                    sceneId: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a scene...</option>
                {scenes.map(scene => (
                  <option key={scene._id} value={scene._id}>
                    {scene.title || `Scene ${scene.sceneOrder}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'choiceNode':
        return (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Choice Properties</h4>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Prompt Text
              </label>
              <textarea
                value={(selectedNode.data as any).nodeSpecificData?.promptText || ''}
                onChange={(e) => onNodeUpdate(selectedNode.id, {
                  nodeSpecificData: {
                    ...((selectedNode.data as any).nodeSpecificData || {}),
                    promptText: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="What question will you ask the player?"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Layout
              </label>
              <select
                value={(selectedNode.data as any).nodeSpecificData?.layout || 'vertical'}
                onChange={(e) => onNodeUpdate(selectedNode.id, {
                  nodeSpecificData: {
                    ...((selectedNode.data as any).nodeSpecificData || {}),
                    layout: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
                <option value="grid">Grid</option>
              </select>
            </div>
          </div>
        );

      case 'branchNode':
        return (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Branch Conditions</h4>
            <div className="space-y-2">
              {(selectedNode.data as any).nodeSpecificData?.conditions?.map((condition: any, index: number) => (
                <div key={condition.conditionId} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Condition {index + 1}
                    </span>
                    <button className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={condition.expression}
                    onChange={(e) => {
                      const newConditions = [...((selectedNode.data as any).nodeSpecificData?.conditions || [])];
                      newConditions[index] = { ...condition, expression: e.target.value };
                      onNodeUpdate(selectedNode.id, {
                        nodeSpecificData: {
                          ...((selectedNode.data as any).nodeSpecificData || {}),
                          conditions: newConditions
                        }
                      });
                    }}
                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    rows={2}
                    placeholder="Enter condition expression..."
                  />
                </div>
              )) || (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No conditions defined
                </p>
              )}
            </div>
          </div>
        );

      case 'endingNode':
        return (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Ending Properties</h4>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Ending Title
              </label>
              <input
                type="text"
                value={(selectedNode.data as any).nodeSpecificData?.endingTitle || ''}
                onChange={(e) => onNodeUpdate(selectedNode.id, {
                  nodeSpecificData: {
                    ...((selectedNode.data as any).nodeSpecificData || {}),
                    endingTitle: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., True Ending, Good Ending..."
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Outcome Description
              </label>
              <textarea
                value={(selectedNode.data as any).nodeSpecificData?.outcomeDescription || ''}
                onChange={(e) => onNodeUpdate(selectedNode.id, {
                  nodeSpecificData: {
                    ...((selectedNode.data as any).nodeSpecificData || {}),
                    outcomeDescription: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                placeholder="Describe what happens in this ending..."
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderEdgeInspector = () => {
    if (!selectedEdge) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Label
          </label>
          <input
            type="text"
            value={String(selectedEdge.label || '')}
            onChange={(e) => onEdgeUpdate(selectedEdge.id, { label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Edge label..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Condition
          </label>
          <textarea
            value={(selectedEdge.data as any)?.condition?.expression || ''}
            onChange={(e) => onEdgeUpdate(selectedEdge.id, {
              data: {
                ...selectedEdge.data,
                condition: { expression: e.target.value }
              }
            })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            rows={3}
            placeholder="Enter condition expression (optional)..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Priority
          </label>
          <input
            type="number"
            value={(selectedEdge.data as any)?.priority || 0}
            onChange={(e) => onEdgeUpdate(selectedEdge.id, {
              data: {
                ...selectedEdge.data,
                priority: parseInt(e.target.value) || 0
              }
            })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>
      </div>
    );
  };

  const renderStoryMapOverview = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Story Map Title
          </label>
          <input
            type="text"
            value={storyMap?.title || ''}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Story map title..."
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Version
          </label>
          <input
            type="number"
            value={storyMap?.version || 1}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            readOnly
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {storyMap?.nodes?.length || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Nodes</div>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {storyMap?.edges?.length || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Connections</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Story Variables ({storyMap?.storyVariables?.length || 0})
          </label>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {storyMap?.storyVariables?.map((variable: any, index: number) => (
              <div key={index} className="text-xs p-2 bg-slate-50 dark:bg-slate-700 rounded">
                <span className="font-mono text-slate-900 dark:text-white">
                  {variable.variableName}
                </span>
                <span className="text-slate-600 dark:text-slate-400 ml-2">
                  ({variable.dataType})
                </span>
              </div>
            )) || (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No variables defined
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="inspector-panel flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2 mb-3">
          <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Inspector
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'properties'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'data'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Data
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'style'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Style
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedNode && activeTab === 'properties' && renderNodeInspector()}
        {selectedEdge && activeTab === 'properties' && renderEdgeInspector()}
        {!selectedNode && !selectedEdge && renderStoryMapOverview()}
        
        {activeTab === 'data' && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Raw data view coming soon...
          </div>
        )}
        
        {activeTab === 'style' && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Visual styling options coming soon...
          </div>
        )}
      </div>
    </div>
  );
};

export default InspectorPanel;