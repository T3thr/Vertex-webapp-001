// src/components/collaboration/CollaboratorBar.tsx
// ===================================================================
// Collaborator Bar Component
// Professional real-time collaboration indicator
// ===================================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Wifi, WifiOff } from 'lucide-react';

// ===================================================================
// Types
// ===================================================================

interface Collaborator {
  userId: string;
  username: string;
  isOnline: boolean;
  cursor?: { x: number; y: number };
  avatar?: string;
}

interface CollaboratorBarProps {
  collaborators: Collaborator[];
  isRealtimeConnected: boolean;
  currentUserId?: string;
  className?: string;
  maxVisible?: number;
}

// ===================================================================
// Collaborator Avatar Component
// ===================================================================

const CollaboratorAvatar: React.FC<{
  collaborator: Collaborator;
  index: number;
}> = ({ collaborator, index }) => {
  const colors = [
    'bg-red-500',
    'bg-blue-500', 
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500'
  ];

  const colorClass = colors[index % colors.length];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      <div
        className={`
          relative w-8 h-8 rounded-full ${colorClass} 
          flex items-center justify-center text-white text-sm font-medium
          border-2 border-white shadow-md
          ${!collaborator.isOnline ? 'opacity-50' : ''}
        `}
        title={`${collaborator.username} ${collaborator.isOnline ? '(online)' : '(offline)'}`}
      >
        {collaborator.avatar ? (
          <Image
            src={collaborator.avatar}
            alt={collaborator.username}
            className="w-full h-full rounded-full object-cover"
            width={32}
            height={32}
          />
        ) : (
          <span className="uppercase">
            {collaborator.username.charAt(0)}
          </span>
        )}
        
        {/* Online indicator */}
        <div
          className={`
            absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white
            ${collaborator.isOnline ? 'bg-green-500' : 'bg-gray-400'}
          `}
        />
      </div>
    </motion.div>
  );
};

// ===================================================================
// Connection Status Indicator
// ===================================================================

const ConnectionStatus: React.FC<{ isConnected: boolean }> = ({ isConnected }) => (
  <div className="flex items-center gap-1">
    {isConnected ? (
      <Wifi className="w-4 h-4 text-green-500" />
    ) : (
      <WifiOff className="w-4 h-4 text-red-500" />
    )}
    <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
      {isConnected ? 'Connected' : 'Disconnected'}
    </span>
  </div>
);

// ===================================================================
// Main Collaborator Bar Component
// ===================================================================

export const CollaboratorBar: React.FC<CollaboratorBarProps> = ({
  collaborators,
  isRealtimeConnected,
  currentUserId,
  className = '',
  maxVisible = 5
}) => {
  // Filter out current user and get online collaborators first
  const otherCollaborators = collaborators
    .filter(c => c.userId !== currentUserId)
    .sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return 0;
    });

  const visibleCollaborators = otherCollaborators.slice(0, maxVisible);
  const hiddenCount = Math.max(0, otherCollaborators.length - maxVisible);

  if (otherCollaborators.length === 0) {
    return (
      <div className={`flex items-center gap-3 p-2 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users className="w-4 h-4" />
          <span>Working alone</span>
        </div>
        <ConnectionStatus isConnected={isRealtimeConnected} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-2 ${className}`}>
      {/* Collaborators */}
      <div className="flex items-center gap-1">
        <Users className="w-4 h-4 text-gray-600 mr-1" />
        
        <div className="flex -space-x-1">
          <AnimatePresence>
            {visibleCollaborators.map((collaborator, index) => (
              <CollaboratorAvatar
                key={collaborator.userId}
                collaborator={collaborator}
                index={index}
              />
            ))}
          </AnimatePresence>
          
          {/* Show count of hidden collaborators */}
          {hiddenCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="
                w-8 h-8 rounded-full bg-gray-500 
                flex items-center justify-center text-white text-xs font-medium
                border-2 border-white shadow-md ml-1
              "
              title={`${hiddenCount} more collaborator${hiddenCount > 1 ? 's' : ''}`}
            >
              +{hiddenCount}
            </motion.div>
          )}
        </div>
        
        {/* Count badge */}
        <Badge variant="outline" className="ml-2 text-xs">
          {otherCollaborators.filter(c => c.isOnline).length} online
        </Badge>
      </div>

      {/* Connection status */}
      <ConnectionStatus isConnected={isRealtimeConnected} />
    </div>
  );
};

// ===================================================================
// Real-time Cursor Component
// ===================================================================

interface RealtimeCursorProps {
  collaborator: Collaborator;
  containerRef?: React.RefObject<HTMLElement>;
}

export const RealtimeCursor: React.FC<RealtimeCursorProps> = ({
  collaborator,
  containerRef
}) => {
  if (!collaborator.cursor || !collaborator.isOnline) {
    return null;
  }

  const colors = [
    'bg-red-500',
    'bg-blue-500', 
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500'
  ];

  const colorClass = colors[parseInt(collaborator.userId.slice(-1)) % colors.length];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute pointer-events-none z-50"
      style={{
        left: collaborator.cursor.x,
        top: collaborator.cursor.y,
        transform: 'translate(-2px, -2px)'
      }}
    >
      {/* Cursor pointer */}
      <div className={`w-4 h-4 ${colorClass} transform rotate-45 border border-white`} />
      
      {/* Username label */}
      <div className={`
        absolute top-5 left-2 px-2 py-1 rounded text-xs text-white shadow-lg
        ${colorClass} whitespace-nowrap
      `}>
        {collaborator.username}
      </div>
    </motion.div>
  );
};

export default CollaboratorBar;
