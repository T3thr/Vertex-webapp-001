// src/app/novels/[slug]/overview/components/unified/mobile/MobileFloatingActionButton.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  X, 
  Layers, 
  Image as ImageIcon, 
  Clock, 
  Settings,
  Play,
  Edit3,
  BarChart3,
  Eye,
  ChevronUp,
  ChevronDown,
  Zap
} from 'lucide-react';

// Types
import { UnifiedMode, UnifiedState } from '../UnifiedStorytellingEnvironment';

interface MobileFloatingActionButtonProps {
  mode: UnifiedMode;
  activePanel: UnifiedState['mobileActivePanel'];
  onPanelChange: (panel: UnifiedState['mobileActivePanel']) => void;
  onModeSwitch: (mode: UnifiedMode) => void;
  bottomSheetHeight: number;
}

interface FABAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  action: () => void;
}

const MobileFloatingActionButton: React.FC<MobileFloatingActionButtonProps> = ({
  mode,
  activePanel,
  onPanelChange,
  onModeSwitch,
  bottomSheetHeight
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get context-sensitive actions based on current mode
  const getActionsForMode = useCallback((): FABAction[] => {
    const baseActions: FABAction[] = [];

    switch (mode) {
      case 'narrative':
        baseActions.push(
          {
            id: 'analytics',
            label: 'Analytics',
            icon: BarChart3,
            color: 'bg-blue-500',
            action: () => {
              // Toggle analytics view
              setIsExpanded(false);
            }
          },
          {
            id: 'add-scene',
            label: 'Add Scene',
            icon: Plus,
            color: 'bg-green-500',
            action: () => {
              // Add new scene node
              setIsExpanded(false);
            }
          }
        );
        break;

      case 'canvas':
        baseActions.push(
          {
            id: 'layers',
            label: 'Layers',
            icon: Layers,
            color: activePanel === 'layers' ? 'bg-blue-500' : 'bg-gray-500',
            action: () => {
              onPanelChange(activePanel === 'layers' ? null : 'layers');
              setIsExpanded(false);
            }
          },
          {
            id: 'assets',
            label: 'Assets',
            icon: ImageIcon,
            color: activePanel === 'assets' ? 'bg-purple-500' : 'bg-gray-500',
            action: () => {
              onPanelChange(activePanel === 'assets' ? null : 'assets');
              setIsExpanded(false);
            }
          },
          {
            id: 'timeline',
            label: 'Timeline',
            icon: Clock,
            color: activePanel === 'timeline' ? 'bg-orange-500' : 'bg-gray-500',
            action: () => {
              onPanelChange(activePanel === 'timeline' ? null : 'timeline');
              setIsExpanded(false);
            }
          },
          {
            id: 'properties',
            label: 'Properties',
            icon: Settings,
            color: activePanel === 'properties' ? 'bg-indigo-500' : 'bg-gray-500',
            action: () => {
              onPanelChange(activePanel === 'properties' ? null : 'properties');
              setIsExpanded(false);
            }
          }
        );
        break;

      case 'preview':
        baseActions.push(
          {
            id: 'edit-mode',
            label: 'Edit Mode',
            icon: Edit3,
            color: 'bg-green-500',
            action: () => {
              onModeSwitch('canvas');
              setIsExpanded(false);
            }
          },
          {
            id: 'story-map',
            label: 'Story Map',
            icon: BarChart3,
            color: 'bg-blue-500',
            action: () => {
              onModeSwitch('narrative');
              setIsExpanded(false);
            }
          }
        );
        break;
    }

    return baseActions;
  }, [mode, activePanel, onPanelChange, onModeSwitch]);

  const actions = getActionsForMode();

  const handleMainButtonClick = () => {
    if (actions.length === 1) {
      // If only one action, execute it directly
      actions[0].action();
    } else {
      // Otherwise, toggle expanded state
      setIsExpanded(!isExpanded);
    }
  };

  const getMainButtonIcon = () => {
    if (isExpanded) return X;
    
    // Context-sensitive main button icon
    switch (mode) {
      case 'narrative':
        return Plus;
      case 'canvas':
        return activePanel ? ChevronDown : ChevronUp;
      case 'preview':
        return Play;
      default:
        return Plus;
    }
  };

  const MainIcon = getMainButtonIcon();

  return (
    <div
      className="fixed z-50 flex flex-col items-end"
      style={{
        bottom: Math.max(24, bottomSheetHeight + 16),
        right: 24
      }}
    >
      {/* Action Buttons */}
      <AnimatePresence>
        {isExpanded && actions.length > 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-end gap-3 mb-4"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: 20, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 20, y: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3"
              >
                {/* Label */}
                <div className="bg-black bg-opacity-75 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">
                  {action.label}
                </div>
                
                {/* Action Button */}
                <motion.button
                  onClick={action.action}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-12 h-12 ${action.color} text-white rounded-full shadow-lg flex items-center justify-center`}
                >
                  <action.icon className="w-6 h-6" />
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={handleMainButtonClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          isExpanded 
            ? 'bg-red-500 text-white' 
            : mode === 'narrative' 
              ? 'bg-blue-500 text-white'
              : mode === 'canvas'
                ? 'bg-green-500 text-white'
                : 'bg-purple-500 text-white'
        }`}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <MainIcon className="w-8 h-8" />
        </motion.div>
      </motion.button>

      {/* Quick Panel Indicators */}
      {mode === 'canvas' && !isExpanded && (
        <div className="absolute -top-2 -left-2 flex gap-1">
          {['layers', 'assets', 'timeline', 'properties'].map((panelType) => (
            <div
              key={panelType}
              className={`w-3 h-3 rounded-full transition-colors ${
                activePanel === panelType
                  ? 'bg-white shadow-lg'
                  : 'bg-white bg-opacity-30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Mode Switch Gesture Hint */}
      {!isExpanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none"
        >
          Swipe ← → to switch modes
        </motion.div>
      )}
    </div>
  );
};

export default MobileFloatingActionButton;