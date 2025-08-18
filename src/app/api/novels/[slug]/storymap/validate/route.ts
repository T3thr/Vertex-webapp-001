// API Route: /api/novels/[slug]/storymap/validate
// POST: Validate StoryMap structure and provide detailed feedback

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import { validateNovelAccess } from '../auth-helper';
import { StoryMapNodeType, IStoryMapNode, IStoryMapEdge, IStoryVariableDefinition } from '@/backend/models/StoryMap';

interface ValidationError {
  type: 'error' | 'warning' | 'info';
  category: 'Structure' | 'Connectivity' | 'Data' | 'Logic' | 'Performance' | 'Best Practice';
  message: string;
  nodeId?: string;
  edgeId?: string;
  variableId?: string;
  fix?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: ValidationError[];
  statistics: {
    totalNodes: number;
    totalEdges: number;
    totalVariables: number;
    complexityScore: number;
    estimatedPlaytimeMinutes: number;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    await dbConnect();

    // Validate access
    const { error, novel } = await validateNovelAccess(slug, session.user.id);
    if (error) return error;

    const body = await request.json();
    const { nodes = [], edges = [], storyVariables = [], startNodeId } = body;

    const validationResult: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      statistics: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        totalVariables: storyVariables.length,
        complexityScore: 0,
        estimatedPlaytimeMinutes: 0
      }
    };

    // Comprehensive validation
    await validateStoryMapStructure(nodes, edges, storyVariables, startNodeId, validationResult);
    await validateConnectivity(nodes, edges, validationResult);
    await validateDataIntegrity(nodes, edges, storyVariables, validationResult);
    await validateLogicFlow(nodes, edges, storyVariables, validationResult);
    await calculateStatistics(nodes, edges, storyVariables, validationResult);

    // Determine overall validity
    validationResult.isValid = validationResult.errors.length === 0;

    return NextResponse.json({
      validation: validationResult,
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[StoryMap Validate] Error:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการตรวจสอบ StoryMap' 
    }, { status: 500 });
  }
}

async function validateStoryMapStructure(
  nodes: IStoryMapNode[],
  edges: IStoryMapEdge[],
  storyVariables: IStoryVariableDefinition[],
  startNodeId: string,
  result: ValidationResult
) {
  // 1. Check for start node
  const startNodes = nodes.filter(n => n.nodeType === StoryMapNodeType.START_NODE);
  if (startNodes.length === 0) {
    result.errors.push({
      type: 'error',
      category: 'Structure',
      message: 'No start node found in the story map',
      severity: 'critical',
      fix: 'Add a start node to define the entry point of your story'
    });
  } else if (startNodes.length > 1) {
    result.errors.push({
      type: 'error',
      category: 'Structure',
      message: 'Multiple start nodes found',
      severity: 'critical',
      fix: 'Remove duplicate start nodes, keep only one'
    });
  }

  // 2. Check for ending nodes
  const endingNodes = nodes.filter(n => n.nodeType === StoryMapNodeType.ENDING_NODE);
  if (endingNodes.length === 0) {
    result.warnings.push({
      type: 'warning',
      category: 'Structure',
      message: 'No ending nodes found',
      severity: 'medium',
      fix: 'Add ending nodes to provide closure to your story'
    });
  }

  // 3. Validate unique IDs
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const variableIds = new Set<string>();

  nodes.forEach(node => {
    if (nodeIds.has(node.nodeId)) {
      result.errors.push({
        type: 'error',
        category: 'Data',
        message: `Duplicate node ID: ${node.nodeId}`,
        nodeId: node.nodeId,
        severity: 'critical',
        fix: 'Ensure all node IDs are unique'
      });
    }
    nodeIds.add(node.nodeId);
  });

  edges.forEach(edge => {
    if (edgeIds.has(edge.edgeId)) {
      result.errors.push({
        type: 'error',
        category: 'Data',
        message: `Duplicate edge ID: ${edge.edgeId}`,
        edgeId: edge.edgeId,
        severity: 'critical',
        fix: 'Ensure all edge IDs are unique'
      });
    }
    edgeIds.add(edge.edgeId);
  });

  storyVariables.forEach(variable => {
    if (variableIds.has(variable.variableId)) {
      result.errors.push({
        type: 'error',
        category: 'Data',
        message: `Duplicate variable ID: ${variable.variableId}`,
        variableId: variable.variableId,
        severity: 'high',
        fix: 'Ensure all variable IDs are unique'
      });
    }
    variableIds.add(variable.variableId);
  });

  // 4. Validate startNodeId exists
  if (startNodeId && !nodeIds.has(startNodeId)) {
    result.errors.push({
      type: 'error',
      category: 'Structure',
      message: `Start node ID "${startNodeId}" does not exist in nodes`,
      severity: 'critical',
      fix: 'Set startNodeId to an existing node ID'
    });
  }
}

async function validateConnectivity(
  nodes: IStoryMapNode[],
  edges: IStoryMapEdge[],
  result: ValidationResult
) {
  const nodeIds = new Set(nodes.map(n => n.nodeId));
  
  // 1. Validate edge references
  edges.forEach(edge => {
    if (!nodeIds.has(edge.sourceNodeId)) {
      result.errors.push({
        type: 'error',
        category: 'Connectivity',
        message: `Edge "${edge.edgeId}" references non-existent source node: ${edge.sourceNodeId}`,
        edgeId: edge.edgeId,
        severity: 'critical',
        fix: 'Update edge to reference existing nodes'
      });
    }
    
    if (!nodeIds.has(edge.targetNodeId)) {
      result.errors.push({
        type: 'error',
        category: 'Connectivity',
        message: `Edge "${edge.edgeId}" references non-existent target node: ${edge.targetNodeId}`,
        edgeId: edge.edgeId,
        severity: 'critical',
        fix: 'Update edge to reference existing nodes'
      });
    }
  });

  // 2. Check for orphaned nodes
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.sourceNodeId);
    connectedNodeIds.add(edge.targetNodeId);
  });

  nodes.forEach(node => {
    if (!connectedNodeIds.has(node.nodeId) && node.nodeType !== StoryMapNodeType.START_NODE) {
      result.warnings.push({
        type: 'warning',
        category: 'Connectivity',
        message: `Orphaned node: "${node.title}" (${node.nodeId})`,
        nodeId: node.nodeId,
        severity: 'medium',
        fix: 'Connect this node to the story flow or remove it'
      });
    }
  });

  // 3. Check for dead ends
  const outgoingConnections: Record<string, string[]> = {};
  edges.forEach(edge => {
    if (!outgoingConnections[edge.sourceNodeId]) {
      outgoingConnections[edge.sourceNodeId] = [];
    }
    outgoingConnections[edge.sourceNodeId].push(edge.targetNodeId);
  });

  nodes.forEach(node => {
    const hasOutgoing = !!outgoingConnections[node.nodeId];
    const isEndingNode = node.nodeType === StoryMapNodeType.ENDING_NODE;
    
    if (!hasOutgoing && !isEndingNode) {
      result.warnings.push({
        type: 'warning',
        category: 'Connectivity',
        message: `Dead end node: "${node.title}" has no outgoing connections`,
        nodeId: node.nodeId,
        severity: 'medium',
        fix: 'Add connections from this node or convert to ending node'
      });
    }
  });

  // 4. Detect circular references
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  const hasCycle = (nodeId: string): boolean => {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const outgoing = outgoingConnections[nodeId] || [];
    for (const targetId of outgoing) {
      if (hasCycle(targetId)) return true;
    }
    
    recursionStack.delete(nodeId);
    return false;
  };

  for (const node of nodes) {
    if (hasCycle(node.nodeId)) {
      result.warnings.push({
        type: 'warning',
        category: 'Logic',
        message: 'Circular reference detected in story flow',
        severity: 'medium',
        fix: 'Remove circular connections between nodes'
      });
      break;
    }
  }
}

async function validateDataIntegrity(
  nodes: IStoryMapNode[],
  edges: IStoryMapEdge[],
  storyVariables: IStoryVariableDefinition[],
  result: ValidationResult
) {
  const variableIds = new Set(storyVariables.map(v => v.variableId));

  // 1. Validate choice nodes have sufficient outgoing edges
  nodes.filter(n => n.nodeType === StoryMapNodeType.CHOICE_NODE).forEach(node => {
    const outgoing = edges.filter(e => e.sourceNodeId === node.nodeId);
    if (outgoing.length < 2) {
      result.warnings.push({
        type: 'warning',
        category: 'Logic',
        message: `Choice node "${node.title}" should have at least 2 options`,
        nodeId: node.nodeId,
        severity: 'medium',
        fix: 'Add more choice options or change node type'
      });
    }
  });

  // 2. Validate variable modifier nodes reference valid variables
  nodes.filter(n => n.nodeType === StoryMapNodeType.VARIABLE_MODIFIER_NODE).forEach(node => {
    if (node.nodeSpecificData?.operations) {
      node.nodeSpecificData.operations.forEach((operation: any) => {
        if (operation.variableId && !variableIds.has(operation.variableId)) {
          result.errors.push({
            type: 'error',
            category: 'Data',
            message: `Variable modifier references undefined variable: ${operation.variableId}`,
            nodeId: node.nodeId,
            severity: 'high',
            fix: 'Create the referenced variable or update the reference'
          });
        }
      });
    }
  });

  // 3. Validate scene nodes have scene data
  nodes.filter(n => n.nodeType === StoryMapNodeType.SCENE_NODE).forEach(node => {
    if (!node.nodeSpecificData?.sceneId) {
      result.warnings.push({
        type: 'warning',
        category: 'Data',
        message: `Scene node "${node.title}" is not linked to a scene`,
        nodeId: node.nodeId,
        severity: 'medium',
        fix: 'Link to a scene or create new scene content'
      });
    }
  });
}

async function validateLogicFlow(
  nodes: IStoryMapNode[],
  edges: IStoryMapEdge[],
  storyVariables: IStoryVariableDefinition[],
  result: ValidationResult
) {
  // 1. Validate branch conditions
  nodes.filter(n => n.nodeType === StoryMapNodeType.BRANCH_NODE).forEach(node => {
    if (node.nodeSpecificData?.conditions) {
      node.nodeSpecificData.conditions.forEach((condition: any, index: number) => {
        if (!condition.expression || condition.expression.trim() === '') {
          result.warnings.push({
            type: 'warning',
            category: 'Logic',
            message: `Branch node "${node.title}" has empty condition at index ${index}`,
            nodeId: node.nodeId,
            severity: 'medium',
            fix: 'Add a valid condition expression'
          });
        }
      });
    }
  });

  // 2. Check for unreachable nodes
  const reachableNodes = new Set<string>();
  const startNodes = nodes.filter(n => n.nodeType === StoryMapNodeType.START_NODE);
  
  const markReachable = (nodeId: string) => {
    if (reachableNodes.has(nodeId)) return;
    reachableNodes.add(nodeId);
    
    const outgoingEdges = edges.filter(e => e.sourceNodeId === nodeId);
    outgoingEdges.forEach(edge => markReachable(edge.targetNodeId));
  };

  startNodes.forEach(startNode => markReachable(startNode.nodeId));

  nodes.forEach(node => {
    if (!reachableNodes.has(node.nodeId) && node.nodeType !== StoryMapNodeType.START_NODE) {
      result.warnings.push({
        type: 'warning',
        category: 'Logic',
        message: `Unreachable node: "${node.title}"`,
        nodeId: node.nodeId,
        severity: 'low',
        fix: 'Connect this node to the main story flow'
      });
    }
  });
}

async function calculateStatistics(
  nodes: IStoryMapNode[],
  edges: IStoryMapEdge[],
  storyVariables: IStoryVariableDefinition[],
  result: ValidationResult
) {
  // Calculate complexity score
  let complexityScore = 0;
  
  // Base score from node count
  complexityScore += nodes.length * 2;
  
  // Additional score for complex node types
  nodes.forEach(node => {
    switch (node.nodeType) {
      case StoryMapNodeType.CHOICE_NODE:
        complexityScore += 5;
        break;
      case StoryMapNodeType.BRANCH_NODE:
        complexityScore += 8;
        break;
      case StoryMapNodeType.VARIABLE_MODIFIER_NODE:
        complexityScore += 3;
        break;
      case StoryMapNodeType.CUSTOM_LOGIC_NODE:
        complexityScore += 10;
        break;
    }
  });

  // Score from edges and variables
  complexityScore += edges.length * 1;
  complexityScore += storyVariables.length * 2;

  // Estimate playtime (rough calculation)
  const sceneNodes = nodes.filter(n => n.nodeType === StoryMapNodeType.SCENE_NODE);
  const estimatedPlaytime = Math.max(5, sceneNodes.length * 2 + nodes.length * 0.5);

  result.statistics.complexityScore = complexityScore;
  result.statistics.estimatedPlaytimeMinutes = Math.round(estimatedPlaytime);

  // Add performance suggestions based on complexity
  if (complexityScore > 200) {
    result.suggestions.push({
      type: 'info',
      category: 'Performance',
      message: 'High complexity detected. Consider breaking into smaller story maps',
      severity: 'low',
      fix: 'Use sub-storymap nodes to organize complex narratives'
    });
  }

  if (nodes.length > 50) {
    result.suggestions.push({
      type: 'info',
      category: 'Best Practice',
      message: 'Large number of nodes. Consider using groups for organization',
      severity: 'low',
      fix: 'Group related nodes together for better visualization'
    });
  }
}