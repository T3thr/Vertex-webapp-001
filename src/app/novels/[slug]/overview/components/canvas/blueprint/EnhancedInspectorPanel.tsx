// src/app/novels/[slug]/overview/components/canvas/blueprint/EnhancedInspectorPanel.tsx
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Copy,
  Link,
  Unlink,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Hash,
  Type,
  Palette,
  Volume2,
  Image as ImageIcon,
  MoreHorizontal
} from 'lucide-react';

interface InspectorPanelProps {
  selectedNode?: any;
  selectedEdge?: any;
  storyMap?: any;
  scenes?: any[];
  characters?: any[];
  onNodeUpdate?: (nodeId: string, updates: any) => void;
  onEdgeUpdate?: (edgeId: string, updates: any) => void;
  onNodeDelete?: (nodeId: string) => void;
  onEdgeDelete?: (edgeId: string) => void;
}

interface NodeValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const EnhancedInspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedNode,
  selectedEdge,
  storyMap,
  scenes,
  characters,
  onNodeUpdate,
  onEdgeUpdate,
  onNodeDelete,
  onEdgeDelete
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'connections' | 'validation'>('properties');
  const [isEditing, setIsEditing] = useState(false);
  
  // Validate selected node
  const nodeValidation: NodeValidation = useMemo(() => {
    if (!selectedNode) return { isValid: true, errors: [], warnings: [] };
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if node has required properties
    if (!selectedNode.title?.trim()) {
      errors.push('Node title is required');
    }
    
    // Check connections
    if (selectedNode.nodeType === 'start_node') {
      const outgoingEdges = storyMap?.edges?.filter((edge: any) => edge.sourceNodeId === selectedNode.nodeId) || [];
      if (outgoingEdges.length === 0) {
        warnings.push('Start node should connect to at least one other node');
      }
    }
    
    if (selectedNode.nodeType === 'scene_node') {
      if (!selectedNode.nodeSpecificData?.sceneId) {
        errors.push('Scene node must reference a scene');
      }
    }
    
    if (selectedNode.nodeType === 'choice_node') {
      const choices = selectedNode.nodeSpecificData?.choiceIds || [];
      if (choices.length === 0) {
        warnings.push('Choice node should have at least one choice');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [selectedNode, storyMap]);

  // Get node connections
  const nodeConnections = useMemo(() => {
    if (!selectedNode || !storyMap) return { incoming: [], outgoing: [] };
    
    const incoming = storyMap.edges?.filter((edge: any) => edge.targetNodeId === selectedNode.nodeId) || [];
    const outgoing = storyMap.edges?.filter((edge: any) => edge.sourceNodeId === selectedNode.nodeId) || [];
    
    return { incoming, outgoing };
  }, [selectedNode, storyMap]);

  const handleNodeUpdate = useCallback((field: string, value: any) => {
    if (!selectedNode || !onNodeUpdate) return;
    
    const updates = { [field]: value };
    onNodeUpdate(selectedNode.nodeId, updates);
  }, [selectedNode, onNodeUpdate]);

  const handleNodeDelete = useCallback(() => {
    if (!selectedNode || !onNodeDelete) return;
    if (window.confirm('Are you sure you want to delete this node?')) {
      onNodeDelete(selectedNode.nodeId);
    }
  }, [selectedNode, onNodeDelete]);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    if (!onEdgeDelete) return;
    if (window.confirm('Are you sure you want to delete this connection?')) {
      onEdgeDelete(edgeId);
    }
  }, [onEdgeDelete]);

  // Render node type specific properties
  const renderNodeProperties = () => {
    if (!selectedNode) return null;
    
    switch (selectedNode.nodeType) {
      case 'scene_node':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Associated Scene
              </label>
              <select
                value={selectedNode.nodeSpecificData?.sceneId || ''}
                onChange={(e) => handleNodeUpdate('nodeSpecificData.sceneId', e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a scene...</option>
                {scenes?.map(scene => (
                  <option key={scene._id} value={scene._id}>
                    {scene.title || `Scene ${scene.sceneOrder}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Background Music
              </label>
              <input
                type="text"
                value={selectedNode.audioSettings?.backgroundMusic || ''}
                onChange={(e) => handleNodeUpdate('audioSettings.backgroundMusic', e.target.value)}
                placeholder="Background music URL or ID"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        );
        
      case 'choice_node':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Prompt Text
              </label>
              <textarea
                value={selectedNode.nodeSpecificData?.promptText || ''}
                onChange={(e) => handleNodeUpdate('nodeSpecificData.promptText', e.target.value)}
                placeholder="What should the player choose?"
                rows={3}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Layout Style
              </label>
              <select
                value={selectedNode.nodeSpecificData?.layout || 'vertical'}
                onChange={(e) => handleNodeUpdate('nodeSpecificData.layout', e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="vertical">Vertical List</option>
                <option value="horizontal">Horizontal Row</option>
                <option value="grid">Grid Layout</option>
              </select>
            </div>
          </div>
        );
        
      case 'variable_modifier_node':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Variable Name
              </label>
              <input
                type="text"
                value={selectedNode.nodeSpecificData?.variableName || ''}
                onChange={(e) => handleNodeUpdate('nodeSpecificData.variableName', e.target.value)}
                placeholder="e.g., affection_points"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Operation
              </label>
              <select
                value={selectedNode.nodeSpecificData?.operation || 'set'}
                onChange={(e) => handleNodeUpdate('nodeSpecificData.operation', e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="set">Set Value</option>
                <option value="add">Add to Value</option>
                <option value="subtract">Subtract from Value</option>
                <option value="multiply">Multiply Value</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Value
              </label>
              <input
                type="text"
                value={selectedNode.nodeSpecificData?.value || ''}
                onChange={(e) => handleNodeUpdate('nodeSpecificData.value', e.target.value)}
                placeholder="Value to use"
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        );
        
      default:
        return (
          <div>
            <p className="text-sm text-muted-foreground">
              No specific properties available for this node type.
            </p>
          </div>
        );
    }
  };

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="enhanced-inspector-panel h-full bg-card border-l border-border">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Settings className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Inspector Panel</h3>
          <p className="text-sm text-muted-foreground">
            Select a node or connection to view and edit its properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-inspector-panel h-full bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Inspector</h3>
          
          {selectedNode && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-1 rounded hover:bg-accent transition-colors"
                title="Toggle Edit Mode"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={handleNodeDelete}
                className="p-1 rounded hover:bg-accent text-red-500 hover:text-red-600 transition-colors"
                title="Delete Node"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        {selectedNode && (
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${
              selectedNode.nodeType === 'start_node' ? 'bg-green-500' :
              selectedNode.nodeType === 'scene_node' ? 'bg-blue-500' :
              selectedNode.nodeType === 'choice_node' ? 'bg-purple-500' :
              selectedNode.nodeType === 'ending_node' ? 'bg-red-500' :
              'bg-gray-500'
            }`} />
            <span className="text-sm font-medium text-foreground capitalize">
              {selectedNode.nodeType?.replace('_', ' ')}
            </span>
            
            {/* Validation Status */}
            <div className="ml-auto">
              {nodeValidation.isValid ? (
                <div title="Node is valid">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              ) : (
                <div title="Node has errors">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex bg-accent/20 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'properties'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`flex-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'connections'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Connections
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`flex-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'validation'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Validation
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {activeTab === 'properties' && (
            <motion.div
              key="properties"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4"
            >
              {selectedNode && (
                <div className="space-y-4">
                  {/* Basic Properties */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={selectedNode.title || ''}
                      onChange={(e) => handleNodeUpdate('title', e.target.value)}
                      placeholder="Node title..."
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description
                    </label>
                    <textarea
                      value={selectedNode.description || ''}
                      onChange={(e) => handleNodeUpdate('description', e.target.value)}
                      placeholder="Optional description..."
                      rows={3}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      disabled={!isEditing}
                    />
                  </div>
                  
                  {/* Node Type Specific Properties */}
                  {renderNodeProperties()}
                  
                  {/* Visual Properties */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Visual Settings</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Background Color
                        </label>
                        <input
                          type="color"
                          value={selectedNode.editorVisuals?.backgroundColor || '#ffffff'}
                          onChange={(e) => handleNodeUpdate('editorVisuals.backgroundColor', e.target.value)}
                          className="w-full h-8 rounded border border-input-border"
                          disabled={!isEditing}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Border Color
                        </label>
                        <input
                          type="color"
                          value={selectedNode.editorVisuals?.borderColor || '#000000'}
                          onChange={(e) => handleNodeUpdate('editorVisuals.borderColor', e.target.value)}
                          className="w-full h-8 rounded border border-input-border"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedEdge && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Label
                    </label>
                    <input
                      type="text"
                      value={selectedEdge.label || ''}
                      onChange={(e) => onEdgeUpdate?.(selectedEdge.edgeId, { label: e.target.value })}
                      placeholder="Connection label..."
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Line Style
                    </label>
                    <select
                      value={selectedEdge.editorVisuals?.lineStyle || 'solid'}
                      onChange={(e) => onEdgeUpdate?.(selectedEdge.edgeId, { 
                        editorVisuals: { ...selectedEdge.editorVisuals, lineStyle: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                    </select>
                  </div>
                </div>
              )}
            </motion.div>
          )}
          
          {activeTab === 'connections' && selectedNode && (
            <motion.div
              key="connections"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4"
            >
              <div className="space-y-4">
                {/* Incoming Connections */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Incoming Connections</h4>
                  {nodeConnections.incoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No incoming connections</p>
                  ) : (
                    <div className="space-y-2">
                      {nodeConnections.incoming.map((edge: any) => {
                        const sourceNode = storyMap?.nodes?.find((n: any) => n.nodeId === edge.sourceNodeId);
                        return (
                          <div key={edge.edgeId} className="flex items-center justify-between p-2 bg-accent/10 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Link className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{sourceNode?.title || 'Unnamed Node'}</span>
                            </div>
                            <button
                              onClick={() => handleEdgeDelete(edge.edgeId)}
                              className="p-1 text-red-500 hover:text-red-600 transition-colors"
                              title="Delete Connection"
                            >
                              <Unlink className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Outgoing Connections */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Outgoing Connections</h4>
                  {nodeConnections.outgoing.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No outgoing connections</p>
                  ) : (
                    <div className="space-y-2">
                      {nodeConnections.outgoing.map((edge: any) => {
                        const targetNode = storyMap?.nodes?.find((n: any) => n.nodeId === edge.targetNodeId);
                        return (
                          <div key={edge.edgeId} className="flex items-center justify-between p-2 bg-accent/10 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Link className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{targetNode?.title || 'Unnamed Node'}</span>
                            </div>
                            <button
                              onClick={() => handleEdgeDelete(edge.edgeId)}
                              className="p-1 text-red-500 hover:text-red-600 transition-colors"
                              title="Delete Connection"
                            >
                              <Unlink className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          
          {activeTab === 'validation' && selectedNode && (
            <motion.div
              key="validation"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4"
            >
              <div className="space-y-4">
                {/* Validation Status */}
                <div className={`p-3 rounded-lg border ${
                  nodeValidation.isValid 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {nodeValidation.isValid ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {nodeValidation.isValid ? 'Valid Node' : 'Invalid Node'}
                    </span>
                  </div>
                  <p className="text-sm">
                    {nodeValidation.isValid 
                      ? 'This node is properly configured and ready to use.'
                      : 'This node has configuration issues that need to be resolved.'
                    }
                  </p>
                </div>
                
                {/* Errors */}
                {nodeValidation.errors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-2">Errors</h4>
                    <ul className="space-y-1">
                      {nodeValidation.errors.map((error, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-red-600">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Warnings */}
                {nodeValidation.warnings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-yellow-600 mb-2">Warnings</h4>
                    <ul className="space-y-1">
                      {nodeValidation.warnings.map((warning, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-yellow-600">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Node Statistics */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Node Statistics</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-accent/10 rounded p-2">
                      <div className="text-muted-foreground">Incoming</div>
                      <div className="font-medium">{nodeConnections.incoming.length}</div>
                    </div>
                    <div className="bg-accent/10 rounded p-2">
                      <div className="text-muted-foreground">Outgoing</div>
                      <div className="font-medium">{nodeConnections.outgoing.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EnhancedInspectorPanel;