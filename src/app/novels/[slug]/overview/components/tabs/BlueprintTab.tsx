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
  useReactFlow
} from 'reactflow';

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
import { toast } from 'sonner';

// Icons
import { 
  Plus, 
  Save, 
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
  X
} from 'lucide-react';

// Types from backend models
import { StoryMapNodeType, IStoryMapNode, IStoryMapEdge, IStoryVariableDefinition } from '@/backend/models/StoryMap';

// Props interface
interface BlueprintTabProps {
  novel: any;
  storyMap: any;
  onStoryMapUpdate: (storyMap: any) => void;
}

// Custom Node Components
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const getNodeIcon = (type: StoryMapNodeType) => {
    switch (type) {
      case StoryMapNodeType.START_NODE: return <Play className="w-4 h-4" />;
      case StoryMapNodeType.SCENE_NODE: return <Square className="w-4 h-4" />;
      case StoryMapNodeType.CHOICE_NODE: return <Circle className="w-4 h-4" />;
      case StoryMapNodeType.BRANCH_NODE: return <GitBranch className="w-4 h-4" />;
      case StoryMapNodeType.ENDING_NODE: return <Flag className="w-4 h-4" />;
      case StoryMapNodeType.COMMENT_NODE: return <MessageCircle className="w-4 h-4" />;
      default: return <Square className="w-4 h-4" />;
    }
  };

  const getNodeColor = (type: StoryMapNodeType) => {
    switch (type) {
      case StoryMapNodeType.START_NODE: return 'bg-green-500';
      case StoryMapNodeType.SCENE_NODE: return 'bg-blue-500';
      case StoryMapNodeType.CHOICE_NODE: return 'bg-yellow-500';
      case StoryMapNodeType.BRANCH_NODE: return 'bg-purple-500';
      case StoryMapNodeType.ENDING_NODE: return 'bg-red-500';
      case StoryMapNodeType.COMMENT_NODE: return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className={`
      px-4 py-2 rounded-lg border-2 bg-background text-foreground min-w-32
      ${selected ? 'border-primary shadow-lg' : 'border-muted'}
      ${data.hasError ? 'border-destructive' : ''}
      hover:shadow-md transition-all duration-200
    `}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1 rounded text-white ${getNodeColor(data.nodeType)}`}>
          {getNodeIcon(data.nodeType)}
        </div>
        <span className="font-medium text-sm truncate">{data.title}</span>
      </div>
      {data.hasError && (
        <div className="flex items-center gap-1 text-destructive text-xs">
          <AlertTriangle className="w-3 h-3" />
          <span>Error</span>
        </div>
      )}
      {data.nodeType === StoryMapNodeType.VARIABLE_MODIFIER_NODE && (
        <Badge variant="secondary" className="text-xs">
          Variables: {data.nodeSpecificData?.operations?.length || 0}
        </Badge>
      )}
    </div>
  );
};

// Node Palette Component
const NodePalette = ({ onAddNode }: { onAddNode: (nodeType: StoryMapNodeType) => void }) => {
  const nodeTypes = [
    { type: StoryMapNodeType.SCENE_NODE, label: 'Scene', icon: Square, color: 'bg-blue-500' },
    { type: StoryMapNodeType.CHOICE_NODE, label: 'Choice', icon: Circle, color: 'bg-yellow-500' },
    { type: StoryMapNodeType.BRANCH_NODE, label: 'Branch', icon: GitBranch, color: 'bg-purple-500' },
    { type: StoryMapNodeType.ENDING_NODE, label: 'Ending', icon: Flag, color: 'bg-red-500' },
    { type: StoryMapNodeType.VARIABLE_MODIFIER_NODE, label: 'Variable', icon: Settings, color: 'bg-orange-500' },
    { type: StoryMapNodeType.COMMENT_NODE, label: 'Comment', icon: MessageCircle, color: 'bg-gray-500' },
  ];

  return (
    <div className="p-4 bg-background border-r">
      <h3 className="font-semibold mb-3">Node Palette</h3>
      <div className="space-y-2">
        {nodeTypes.map(({ type, label, icon: Icon, color }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => onAddNode(type)}
          >
            <div className={`p-1 rounded text-white mr-2 ${color}`}>
              <Icon className="w-3 h-3" />
            </div>
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
};

// Properties Panel Component
const PropertiesPanel = ({ 
  selectedNode, 
  selectedEdge, 
  onNodeUpdate, 
  onEdgeUpdate,
  storyVariables 
}: {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onNodeUpdate: (nodeId: string, data: any) => void;
  onEdgeUpdate: (edgeId: string, data: any) => void;
  storyVariables: IStoryVariableDefinition[];
}) => {
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeNotes, setNodeNotes] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('');
  const [edgeCondition, setEdgeCondition] = useState('');

  useEffect(() => {
    if (selectedNode) {
      setNodeTitle(selectedNode.data.title || '');
      setNodeNotes(selectedNode.data.notesForAuthor || '');
    }
  }, [selectedNode]);

  useEffect(() => {
    if (selectedEdge) {
      setEdgeLabel(String(selectedEdge.label || ''));
      setEdgeCondition(selectedEdge.data?.condition?.expression || '');
    }
  }, [selectedEdge]);

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a node or edge to edit properties
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {selectedNode && (
          <>
            <div>
              <Label htmlFor="node-title">Node Title</Label>
              <Input
                id="node-title"
                value={nodeTitle}
                onChange={(e) => setNodeTitle(e.target.value)}
                onBlur={() => onNodeUpdate(selectedNode.id, { title: nodeTitle })}
                placeholder="Enter node title"
              />
            </div>
            
            <div>
              <Label htmlFor="node-notes">Author Notes</Label>
              <Textarea
                id="node-notes"
                value={nodeNotes}
                onChange={(e) => setNodeNotes(e.target.value)}
                onBlur={() => onNodeUpdate(selectedNode.id, { notesForAuthor: nodeNotes })}
                placeholder="Enter notes for this node"
                rows={3}
              />
            </div>

            <div>
              <Label>Node Type</Label>
              <Badge variant="secondary">{selectedNode.data.nodeType}</Badge>
            </div>

            {selectedNode.data.nodeType === StoryMapNodeType.VARIABLE_MODIFIER_NODE && (
              <div>
                <Label>Variable Operations</Label>
                <div className="space-y-2 mt-2">
                  {selectedNode.data.nodeSpecificData?.operations?.map((op: any, index: number) => (
                    <div key={index} className="p-2 border rounded text-sm">
                      <div><strong>Variable:</strong> {op.variableId}</div>
                      <div><strong>Operation:</strong> {op.operation}</div>
                      <div><strong>Value:</strong> {op.value}</div>
                    </div>
                  )) || <div className="text-muted-foreground text-sm">No operations defined</div>}
                </div>
              </div>
            )}
          </>
        )}

        {selectedEdge && (
          <>
            <div>
              <Label htmlFor="edge-label">Edge Label</Label>
              <Input
                id="edge-label"
                value={edgeLabel}
                onChange={(e) => setEdgeLabel(e.target.value)}
                onBlur={() => onEdgeUpdate(selectedEdge.id, { label: edgeLabel })}
                placeholder="Enter edge label"
              />
            </div>
            
            <div>
              <Label htmlFor="edge-condition">Condition Expression</Label>
              <Textarea
                id="edge-condition"
                value={edgeCondition}
                onChange={(e) => setEdgeCondition(e.target.value)}
                onBlur={() => onEdgeUpdate(selectedEdge.id, { 
                  condition: { expression: edgeCondition } 
                })}
                placeholder="Enter condition expression (e.g., $karma > 50)"
                rows={2}
              />
            </div>

            <div>
              <Label>Available Variables</Label>
              <div className="space-y-1 mt-2 max-h-32 overflow-y-auto">
                {storyVariables.map((variable) => (
                  <div key={variable.variableId} className="text-xs p-1 bg-muted rounded">
                    <strong>${variable.variableName}</strong> ({variable.dataType})
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

// Validation Component
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
    const errors: Array<{ type: 'error' | 'warning'; message: string; nodeId?: string; edgeId?: string }> = [];
    
    // Check for start node
    const startNodes = nodes.filter(n => n.data.nodeType === StoryMapNodeType.START_NODE);
    if (startNodes.length === 0) {
      errors.push({ type: 'error', message: 'No start node found' });
    } else if (startNodes.length > 1) {
      errors.push({ type: 'error', message: 'Multiple start nodes found' });
    }

    // Check for orphaned nodes
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    nodes.forEach(node => {
      if (node.data.nodeType !== StoryMapNodeType.START_NODE && !connectedNodeIds.has(node.id)) {
        errors.push({ 
          type: 'warning', 
          message: `Node "${node.data.title}" is not connected`, 
          nodeId: node.id 
        });
      }
    });

    // Check for duplicate node IDs
    const nodeIds = new Set();
    nodes.forEach(node => {
      if (nodeIds.has(node.id)) {
        errors.push({ 
          type: 'error', 
          message: `Duplicate node ID: ${node.id}`, 
          nodeId: node.id 
        });
      }
      nodeIds.add(node.id);
    });

    return errors;
  }, [nodes, edges, storyVariables]);

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Validation Results
      </h3>
      
      {validationResults.length === 0 ? (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">No issues found</span>
        </div>
      ) : (
        <div className="space-y-2">
          {validationResults.map((result, index) => (
            <Alert key={index} variant={result.type === 'error' ? 'destructive' : 'default'}>
              <div className="flex items-center gap-2">
                {result.type === 'error' ? 
                  <XCircle className="w-4 h-4" /> : 
                  <AlertTriangle className="w-4 h-4" />
                }
                <AlertDescription className="text-sm">
                  {result.message}
                </AlertDescription>
              </div>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Blueprint Tab Component
const BlueprintTab: React.FC<BlueprintTabProps> = ({ novel, storyMap, onStoryMapUpdate }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Initialize nodes and edges from storyMap
  useEffect(() => {
    if (storyMap) {
      const flowNodes: Node[] = storyMap.nodes.map((node: IStoryMapNode) => ({
        id: node.nodeId,
        type: 'custom',
        position: node.position,
        data: {
          ...node,
          hasError: false // Will be set by validation
        }
      }));

      const flowEdges: Edge[] = storyMap.edges.map((edge: IStoryMapEdge) => ({
        id: edge.edgeId,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        label: edge.label,
        data: edge,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: {
          strokeWidth: 2,
          stroke: edge.condition ? '#8b5cf6' : '#64748b'
        }
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [storyMap, setNodes, setEdges]);

  // Add new node
  const onAddNode = useCallback((nodeType: StoryMapNodeType) => {
    const newNodeId = `node-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: 'custom',
      position: { x: Math.random() * 500, y: Math.random() * 300 },
      data: {
        nodeId: newNodeId,
        nodeType,
        title: `New ${nodeType.replace('_', ' ')}`,
        position: { x: Math.random() * 500, y: Math.random() * 300 },
        notesForAuthor: '',
        nodeSpecificData: {}
      }
    };

    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  // Handle node updates
  const onNodeUpdate = useCallback((nodeId: string, updates: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  }, [setNodes]);

  // Handle edge updates
  const onEdgeUpdate = useCallback((edgeId: string, updates: any) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? { ...edge, ...updates, data: { ...edge.data, ...updates } }
          : edge
      )
    );
  }, [setEdges]);

  // Handle connection
  const onConnect = useCallback((params: Connection) => {
    const newEdge = {
      ...params,
      id: `edge-${Date.now()}`,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
      },
      style: {
        strokeWidth: 2,
        stroke: '#64748b'
      }
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Handle edge selection
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Save storymap
  const handleSave = useCallback(async () => {
    if (!novel?.slug) return;

    setIsSaving(true);
    try {
      const storyMapData = {
        title: storyMap?.title || 'Story Map',
        description: storyMap?.description || '',
        nodes: nodes.map(node => ({
          nodeId: node.id,
          nodeType: node.data.nodeType,
          title: node.data.title,
          position: node.position,
          notesForAuthor: node.data.notesForAuthor,
          nodeSpecificData: node.data.nodeSpecificData || {}
        })),
        edges: edges.map(edge => ({
          edgeId: edge.id,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          label: edge.label,
          condition: edge.data?.condition
        })),
        storyVariables: storyMap?.storyVariables || [],
        startNodeId: storyMap?.startNodeId || nodes.find(n => n.data.nodeType === StoryMapNodeType.START_NODE)?.id || '',
        editorMetadata: {
          zoomLevel: reactFlowInstance?.getZoom() || 1,
          viewOffsetX: reactFlowInstance?.getViewport().x || 0,
          viewOffsetY: reactFlowInstance?.getViewport().y || 0,
          gridSize: 20,
          showGrid
        }
      };

      const response = await fetch(`/api/novels/${novel.slug}/storymap`, {
        method: storyMap ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyMapData),
      });

      if (!response.ok) {
        throw new Error('Failed to save story map');
      }

      const result = await response.json();
      onStoryMapUpdate(result.storyMap);
      toast.success('Story map saved successfully');
    } catch (error) {
      console.error('Error saving story map:', error);
      toast.error('Failed to save story map');
    } finally {
      setIsSaving(false);
    }
  }, [novel, storyMap, nodes, edges, reactFlowInstance, showGrid, onStoryMapUpdate]);

  // Auto layout
  const handleAutoLayout = useCallback(() => {
    // Simple auto layout - distribute nodes in a grid
    const gridSize = Math.ceil(Math.sqrt(nodes.length));
    const spacing = 200;
    
    const layoutedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % gridSize) * spacing,
        y: Math.floor(index / gridSize) * spacing
      }
    }));

    setNodes(layoutedNodes);
  }, [nodes, setNodes]);

  const nodeTypes = {
    custom: CustomNode,
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Blueprint</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPropertiesOpen(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 border-r bg-background">
          <Tabs defaultValue="palette" className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="palette">Palette</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
            </TabsList>
            <TabsContent value="palette" className="h-full">
              <NodePalette onAddNode={onAddNode} />
            </TabsContent>
            <TabsContent value="validation" className="h-full">
              <ValidationPanel 
                nodes={nodes} 
                edges={edges} 
                storyVariables={storyMap?.storyVariables || []} 
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative">
          <ReactFlowProvider>
            <div ref={reactFlowWrapper} className="h-full w-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onInit={setReactFlowInstance}
                nodeTypes={nodeTypes}
                fitView
                className="bg-background"
              >
                <Controls className="bg-background border border-border" />
                <Background 
                  gap={20} 
                  size={1} 
                  style={{ display: showGrid ? 'block' : 'none' }}
                />
                
                {/* Floating Toolbar */}
                <Panel position="top-right" className="bg-background border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGrid(!showGrid)}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAutoLayout}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                  </div>
                </Panel>
              </ReactFlow>
            </div>
          </ReactFlowProvider>
        </div>

        {/* Desktop Properties Panel */}
        <div className="hidden lg:block w-80 border-l bg-background">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Properties</h3>
          </div>
          <PropertiesPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onNodeUpdate={onNodeUpdate}
            onEdgeUpdate={onEdgeUpdate}
            storyVariables={storyMap?.storyVariables || []}
          />
        </div>
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>Node Palette</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <Tabs defaultValue="palette">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="palette">Palette</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
              </TabsList>
              <TabsContent value="palette">
                <NodePalette onAddNode={onAddNode} />
              </TabsContent>
              <TabsContent value="validation">
                <ValidationPanel 
                  nodes={nodes} 
                  edges={edges} 
                  storyVariables={storyMap?.storyVariables || []} 
                />
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Properties Sheet */}
      <Sheet open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle>Properties</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <PropertiesPanel
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              onNodeUpdate={onNodeUpdate}
              onEdgeUpdate={onEdgeUpdate}
              storyVariables={storyMap?.storyVariables || []}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default BlueprintTab;