// src/app/novels/[slug]/overview/components/unified/narrative/nodes/AnalyticsSceneNode.tsx
"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Eye,
  Clock,
  Heart
} from 'lucide-react';

interface AnalyticsSceneNodeData {
  title: string;
  nodeType: string;
  sceneId?: string;
  analyticsData?: {
    selectionRate: number;
    reachRate: number;
    dropOffRate: number;
    emotionalImpact: number;
  };
  authorDefinedEmotionTags?: string[];
  authorDefinedPsychologicalImpact?: number;
  showAnalytics: boolean;
  showEmotionalData: boolean;
  onSelect: () => void;
}

const AnalyticsSceneNode: React.FC<NodeProps<AnalyticsSceneNodeData>> = ({ 
  data, 
  selected 
}) => {
  const {
    title,
    analyticsData,
    authorDefinedEmotionTags = [],
    authorDefinedPsychologicalImpact = 0,
    showAnalytics,
    showEmotionalData,
    onSelect
  } = data;

  // Determine node color based on analytics or emotional data
  const getNodeColor = () => {
    if (showAnalytics && analyticsData) {
      // Color based on drop-off rate
      if (analyticsData.dropOffRate > 0.3) return 'border-red-500 bg-red-50 dark:bg-red-900';
      if (analyticsData.dropOffRate > 0.15) return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900';
      return 'border-green-500 bg-green-50 dark:bg-green-900';
    }
    
    if (showEmotionalData && authorDefinedEmotionTags.length > 0) {
      const primaryEmotion = authorDefinedEmotionTags[0];
      switch (primaryEmotion) {
        case 'joy': return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900';
        case 'sadness': return 'border-blue-500 bg-blue-50 dark:bg-blue-900';
        case 'anger': return 'border-red-500 bg-red-50 dark:bg-red-900';
        case 'fear': return 'border-purple-500 bg-purple-50 dark:bg-purple-900';
        case 'love': return 'border-pink-500 bg-pink-50 dark:bg-pink-900';
        default: return 'border-gray-300 bg-gray-50 dark:bg-gray-800';
      }
    }
    
    return 'border-gray-300 bg-white dark:bg-gray-800';
  };

  // Get emotional intensity indicator
  const getIntensityIndicator = () => {
    const intensity = Math.abs(authorDefinedPsychologicalImpact);
    if (intensity > 7) return { color: 'text-red-500', icon: TrendingUp };
    if (intensity > 4) return { color: 'text-yellow-500', icon: TrendingUp };
    if (intensity < -4) return { color: 'text-blue-500', icon: TrendingDown };
    return null;
  };

  const intensityIndicator = getIntensityIndicator();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onSelect}
      className={`
        relative min-w-48 max-w-64 p-4 rounded-lg border-2 shadow-sm cursor-pointer transition-all duration-200
        ${getNodeColor()}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        hover:shadow-md
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white dark:border-gray-800"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Scene
          </span>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center gap-1">
          {showAnalytics && analyticsData && analyticsData.dropOffRate > 0.3 && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
          {showEmotionalData && intensityIndicator && (
            <intensityIndicator.icon className={`w-4 h-4 ${intensityIndicator.color}`} />
          )}
        </div>
      </div>

      {/* Node Title */}
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">
        {title || 'Untitled Scene'}
      </h3>

      {/* Analytics Data */}
      {showAnalytics && analyticsData && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2 mb-3"
        >
          {/* Reach Rate */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">Reach</span>
            </div>
            <span className="font-medium text-green-600 dark:text-green-400">
              {Math.round(analyticsData.reachRate * 100)}%
            </span>
          </div>

          {/* Drop-off Rate */}
          {analyticsData.dropOffRate > 0 && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">Drop-off</span>
              </div>
              <span className={`font-medium ${
                analyticsData.dropOffRate > 0.3 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {Math.round(analyticsData.dropOffRate * 100)}%
              </span>
            </div>
          )}

          {/* Progress bar for reach rate */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${analyticsData.reachRate * 100}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="bg-green-500 h-1.5 rounded-full"
            />
          </div>
        </motion.div>
      )}

      {/* Emotional Data */}
      {showEmotionalData && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2 mb-3"
        >
          {/* Emotion Tags */}
          {authorDefinedEmotionTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {authorDefinedEmotionTags.slice(0, 3).map((emotion, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {emotion}
                </span>
              ))}
              {authorDefinedEmotionTags.length > 3 && (
                <span className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  +{authorDefinedEmotionTags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Psychological Impact */}
          {authorDefinedPsychologicalImpact !== 0 && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">Impact</span>
              </div>
              <span className={`font-medium ${
                authorDefinedPsychologicalImpact > 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {authorDefinedPsychologicalImpact > 0 ? '+' : ''}{authorDefinedPsychologicalImpact}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Default state when no special data */}
      {!showAnalytics && !showEmotionalData && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Click to edit scene content
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400 border-2 border-white dark:border-gray-800"
      />

      {/* Hover overlay for additional info */}
      {(showAnalytics || showEmotionalData) && (
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 bg-black bg-opacity-5 rounded-lg flex items-center justify-center pointer-events-none"
        >
          <div className="bg-white dark:bg-gray-800 rounded-md px-2 py-1 shadow-lg text-xs font-medium">
            Click for details
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AnalyticsSceneNode;