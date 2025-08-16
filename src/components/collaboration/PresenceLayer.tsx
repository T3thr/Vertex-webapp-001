// src/components/collaboration/PresenceLayer.tsx
// ===================================================================
// Presence Awareness Layer for Real-time Collaboration
// Professional-grade Figma-style collaboration indicators
// ===================================================================

import React, { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Node, Edge, useReactFlow, Viewport } from '@xyflow/react';

// ===================================================================
// Types
// ===================================================================

export interface CollaboratorPresence {
  userId: string;
  username: string;
  avatar?: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
  };
  selection?: {
    nodeIds: string[];
    edgeIds: string[];
  };
  viewport?: Viewport;
  lastSeen: number;
  isActive: boolean;
}

export interface PresenceLayerProps {
  collaborators: CollaboratorPresence[];
  currentUserId: string;
  nodes: Node[];
  edges: Edge[];
  onCursorMove?: (position: { x: number; y: number }) => void;
  onSelectionChange?: (nodeIds: string[], edgeIds: string[]) => void;
  className?: string;
}

// ===================================================================
// Collaborator Cursor Component
// ===================================================================

const CollaboratorCursor: React.FC<{
  collaborator: CollaboratorPresence;
  viewport: Viewport;
}> = ({ collaborator, viewport }) => {
  if (!collaborator.cursor || !collaborator.isActive) {
    return null;
  }

  // Transform cursor position to screen coordinates
  const screenX = (collaborator.cursor.x - viewport.x) * viewport.zoom;
  const screenY = (collaborator.cursor.y - viewport.y) * viewport.zoom;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute pointer-events-none z-[9999]"
      style={{
        left: screenX,
        top: screenY,
        transform: 'translate(-2px, -2px)'
      }}
    >
      {/* Cursor SVG */}
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none"
        className="drop-shadow-md"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={collaborator.color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      
      {/* Username label */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute top-6 left-2 px-2 py-1 rounded text-xs text-white shadow-lg whitespace-nowrap"
        style={{
          backgroundColor: collaborator.color
        }}
      >
        {collaborator.username}
      </motion.div>
    </motion.div>
  );
};

// ===================================================================
// Selection Highlight Component
// ===================================================================

const SelectionHighlight: React.FC<{
  collaborator: CollaboratorPresence;
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
}> = ({ collaborator, nodes, edges, viewport }) => {
  if (!collaborator.selection || !collaborator.isActive) {
    return null;
  }

  const selectedNodes = nodes.filter(node => 
    collaborator.selection!.nodeIds.includes(node.id)
  );

  const selectedEdges = edges.filter(edge => 
    collaborator.selection!.edgeIds.includes(edge.id)
  );

  return (
    <>
      {/* Node selection highlights */}
      {selectedNodes.map(node => {
        const screenX = (node.position.x - viewport.x) * viewport.zoom;
        const screenY = (node.position.y - viewport.y) * viewport.zoom;
        const width = (node.measured?.width || 200) * viewport.zoom;
        const height = (node.measured?.height || 100) * viewport.zoom;

        return (
          <motion.div
            key={`selection-${collaborator.userId}-${node.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute pointer-events-none z-10"
            style={{
              left: screenX - 2,
              top: screenY - 2,
              width: width + 4,
              height: height + 4,
              border: `2px solid ${collaborator.color}`,
              borderRadius: '8px',
              backgroundColor: `${collaborator.color}20`, // 20% opacity
            }}
          >
            {/* Selection indicator */}
            <div
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
              style={{
                backgroundColor: collaborator.color
              }}
            />
          </motion.div>
        );
      })}

      {/* Edge selection highlights - simplified */}
      {selectedEdges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (!sourceNode || !targetNode) return null;

        return (
          <motion.div
            key={`edge-selection-${collaborator.userId}-${edge.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute pointer-events-none z-5"
          >
            {/* Edge highlight would be complex to implement here */}
            {/* This could be done better with SVG overlays */}
          </motion.div>
        );
      })}
    </>
  );
};

// ===================================================================
// Viewport Indicator Component
// ===================================================================

const ViewportIndicator: React.FC<{
  collaborator: CollaboratorPresence;
  containerSize: { width: number; height: number };
  currentViewport: Viewport;
}> = ({ collaborator, containerSize, currentViewport }) => {
  if (!collaborator.viewport || !collaborator.isActive) {
    return null;
  }

  // Calculate minimap-style viewport indicator
  const scale = 0.1; // Scale factor for viewport indicator
  const indicatorWidth = containerSize.width * scale;
  const indicatorHeight = containerSize.height * scale;

  const collaboratorViewportWidth = (containerSize.width / collaborator.viewport.zoom) * scale;
  const collaboratorViewportHeight = (containerSize.height / collaborator.viewport.zoom) * scale;

  const x = (collaborator.viewport.x - currentViewport.x) * scale + indicatorWidth / 2;
  const y = (collaborator.viewport.y - currentViewport.y) * scale + indicatorHeight / 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.7 }}
      exit={{ opacity: 0 }}
      className="absolute top-4 right-4 border border-gray-300 bg-white/90 rounded"
      style={{
        width: indicatorWidth,
        height: indicatorHeight
      }}
    >
      {/* Collaborator's viewport */}
      <div
        className="absolute border-2 rounded"
        style={{
          left: Math.max(0, Math.min(x - collaboratorViewportWidth / 2, indicatorWidth - collaboratorViewportWidth)),
          top: Math.max(0, Math.min(y - collaboratorViewportHeight / 2, indicatorHeight - collaboratorViewportHeight)),
          width: Math.min(collaboratorViewportWidth, indicatorWidth),
          height: Math.min(collaboratorViewportHeight, indicatorHeight),
          borderColor: collaborator.color,
          backgroundColor: `${collaborator.color}20`
        }}
      >
        {/* User indicator */}
        <div
          className="absolute -top-1 -left-1 w-2 h-2 rounded-full border border-white"
          style={{
            backgroundColor: collaborator.color
          }}
        />
      </div>
      
      {/* Username label */}
      <div
        className="absolute bottom-0 left-0 right-0 text-xs text-center text-gray-600 bg-white/80 px-1 truncate"
        style={{ fontSize: '10px' }}
      >
        {collaborator.username}
      </div>
    </motion.div>
  );
};

// ===================================================================
// Main Presence Layer Component
// ===================================================================

export const PresenceLayer: React.FC<PresenceLayerProps> = ({
  collaborators,
  currentUserId,
  nodes,
  edges,
  onCursorMove,
  onSelectionChange,
  className = ''
}) => {
  const { getViewport } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCursorPosition = useRef<{ x: number; y: number } | null>(null);
  const cursorThrottleTimer = useRef<NodeJS.Timeout | null>(null);

  const viewport = getViewport();
  const otherCollaborators = collaborators.filter(c => c.userId !== currentUserId);

  // Throttled cursor movement handler
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!onCursorMove || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / viewport.zoom + viewport.x;
    const y = (event.clientY - rect.top) / viewport.zoom + viewport.y;

    // Throttle cursor updates to avoid excessive network traffic
    if (cursorThrottleTimer.current) {
      clearTimeout(cursorThrottleTimer.current);
    }

    cursorThrottleTimer.current = setTimeout(() => {
      const lastPos = lastCursorPosition.current;
      if (!lastPos || Math.abs(lastPos.x - x) > 5 || Math.abs(lastPos.y - y) > 5) {
        onCursorMove({ x, y });
        lastCursorPosition.current = { x, y };
      }
    }, 50); // 20fps cursor updates
  }, [onCursorMove, viewport]);

  // Selection change handler
  const handleSelectionChange = useCallback((selectedNodes: string[], selectedEdges: string[]) => {
    onSelectionChange?.(selectedNodes, selectedEdges);
  }, [onSelectionChange]);

  const containerSize = {
    width: containerRef.current?.clientWidth || 800,
    height: containerRef.current?.clientHeight || 600
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      onMouseMove={handleMouseMove}
    >
      <AnimatePresence>
        {otherCollaborators.map(collaborator => (
          <React.Fragment key={collaborator.userId}>
            {/* Cursor */}
            <CollaboratorCursor
              collaborator={collaborator}
              viewport={viewport}
            />
            
            {/* Selection highlights */}
            <SelectionHighlight
              collaborator={collaborator}
              nodes={nodes}
              edges={edges}
              viewport={viewport}
            />
            
            {/* Viewport indicator (minimap) */}
            <ViewportIndicator
              collaborator={collaborator}
              containerSize={containerSize}
              currentViewport={viewport}
            />
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ===================================================================
// Presence Hook for easy integration
// ===================================================================

export const usePresenceAwareness = (
  collaborators: CollaboratorPresence[],
  currentUserId: string,
  onCursorMove?: (position: { x: number; y: number }) => void,
  onSelectionChange?: (nodeIds: string[], edgeIds: string[]) => void
) => {
  const [localSelection, setLocalSelection] = React.useState<{
    nodeIds: string[];
    edgeIds: string[];
  }>({ nodeIds: [], edgeIds: [] });

  const updateSelection = useCallback((nodeIds: string[], edgeIds: string[]) => {
    setLocalSelection({ nodeIds, edgeIds });
    onSelectionChange?.(nodeIds, edgeIds);
  }, [onSelectionChange]);

  const updateCursor = useCallback((position: { x: number; y: number }) => {
    onCursorMove?.(position);
  }, [onCursorMove]);

  return {
    localSelection,
    updateSelection,
    updateCursor,
    otherCollaborators: collaborators.filter(c => c.userId !== currentUserId)
  };
};

// ===================================================================
// Collaborator Colors Utility
// ===================================================================

export const generateCollaboratorColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Light Yellow
    '#BB8FCE', // Light Purple
    '#85C1E9', // Light Blue
    '#F8C471', // Orange
    '#82E0AA'  // Light Green
  ];

  // Generate a consistent color based on userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
  }
  
  return colors[Math.abs(hash) % colors.length];
};

export default PresenceLayer;
