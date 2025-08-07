// src/app/novels/[slug]/overview/components/unified/narrative/analytics/AnalyticsOverlay.tsx
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUpIcon, 
  TrendingDownIcon,
  UsersIcon,
  ClockIcon,
  AlertTriangleIcon,
  EyeIcon
} from 'lucide-react';

import { StoryMapData } from '../../../../page';

interface AnalyticsData {
  totalReaders: number;
  completionRate: number;
  averageReadingTime?: number;
  dropOffPoints: Array<{
    nodeId: string;
    sceneId: string;
    dropOffRate: number;
    totalVisitors: number;
  }>;
  choiceDistribution: Array<{
    choiceId: string;
    nodeId: string;
    text: string;
    selectionRate: number;
    totalSelections?: number;
  }>;
  endingReachRates: Array<{
    endingNodeId: string;
    endingTitle: string;
    reachRate: number;
    totalReached: number;
  }>;
  emotionalImpactScores: Array<{
    nodeId: string;
    sceneId: string;
    averageImpact: number;
    emotionTags: string[];
  }>;
}

interface AnalyticsOverlayProps {
  analyticsData: AnalyticsData;
  storyMap: StoryMapData;
  scenes: any[];
}

export function AnalyticsOverlay({
  analyticsData,
  storyMap,
  scenes
}: AnalyticsOverlayProps) {

  // คำนวณสถิติเพิ่มเติม
  const analytics = useMemo(() => {
    const totalNodes = storyMap.nodes.length;
    const endingNodes = storyMap.nodes.filter(node => node.nodeType === 'ending_node');
    const choiceNodes = storyMap.nodes.filter(node => node.nodeType === 'choice_node');
    
    const averageDropOffRate = analyticsData.dropOffPoints.reduce((sum, point) => 
      sum + point.dropOffRate, 0) / Math.max(analyticsData.dropOffPoints.length, 1);
    
    const mostPopularChoice = analyticsData.choiceDistribution.reduce((prev, current) => 
      (prev.selectionRate > current.selectionRate) ? prev : current, 
      analyticsData.choiceDistribution[0]
    );

    const leastPopularChoice = analyticsData.choiceDistribution.reduce((prev, current) => 
      (prev.selectionRate < current.selectionRate) ? prev : current, 
      analyticsData.choiceDistribution[0]
    );

    return {
      totalNodes,
      endingNodes: endingNodes.length,
      choiceNodes: choiceNodes.length,
      averageDropOffRate,
      mostPopularChoice,
      leastPopularChoice,
      totalEndingReachRate: analyticsData.endingReachRates.reduce((sum, ending) => 
        sum + ending.reachRate, 0)
    };
  }, [analyticsData, storyMap]);

  return (
    <div className="h-full overflow-y-auto bg-background p-4">
      {/* Overview Stats */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Analytics Overview</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Total Readers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Readers</p>
                <p className="text-2xl font-bold text-foreground">{analyticsData.totalReaders.toLocaleString()}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-500" />
            </div>
          </motion.div>

          {/* Completion Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold text-foreground">{analyticsData.completionRate}%</p>
              </div>
              <TrendingUpIcon className="w-8 h-8 text-green-500" />
            </div>
          </motion.div>

          {/* Average Reading Time */}
          {analyticsData.averageReadingTime && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Reading Time</p>
                  <p className="text-2xl font-bold text-foreground">{analyticsData.averageReadingTime}m</p>
                </div>
                <ClockIcon className="w-8 h-8 text-purple-500" />
              </div>
            </motion.div>
          )}

          {/* Drop-off Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Drop-off Rate</p>
                <p className="text-2xl font-bold text-foreground">{analytics.averageDropOffRate.toFixed(1)}%</p>
              </div>
              <TrendingDownIcon className="w-8 h-8 text-red-500" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Drop-off Points Analysis */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-foreground mb-3 flex items-center">
          <AlertTriangleIcon className="w-5 h-5 mr-2 text-red-500" />
          Critical Drop-off Points
        </h4>
        
        <div className="space-y-3">
          {analyticsData.dropOffPoints.map((point, index) => {
            const node = storyMap.nodes.find(n => n.nodeId === point.nodeId);
            return (
              <motion.div
                key={point.nodeId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border border-border rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {node ? node.title : `Node ${point.nodeId}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {point.totalVisitors} visitors • Scene: {point.sceneId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-500">{point.dropOffRate}%</p>
                    <p className="text-xs text-muted-foreground">drop-off rate</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-2 bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-1000"
                    style={{ width: `${point.dropOffRate}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Choice Distribution Analysis */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-foreground mb-3 flex items-center">
          <EyeIcon className="w-5 h-5 mr-2 text-blue-500" />
          Choice Selection Patterns
        </h4>
        
        <div className="space-y-3">
          {analyticsData.choiceDistribution.map((choice, index) => {
            const node = storyMap.nodes.find(n => n.nodeId === choice.nodeId);
            return (
              <motion.div
                key={choice.choiceId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border border-border rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{choice.text}</p>
                    <p className="text-sm text-muted-foreground">
                      From: {node ? node.title : `Node ${choice.nodeId}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{choice.selectionRate}%</p>
                    {choice.totalSelections && (
                      <p className="text-xs text-muted-foreground">{choice.totalSelections} selections</p>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      choice.selectionRate > 50 ? 'bg-green-500' : 
                      choice.selectionRate > 25 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${choice.selectionRate}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Ending Reach Rates */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-foreground mb-3">Ending Completion Rates</h4>
        
        <div className="space-y-3">
          {analyticsData.endingReachRates.map((ending, index) => (
            <motion.div
              key={ending.endingNodeId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-foreground">{ending.endingTitle}</p>
                  <p className="text-sm text-muted-foreground">{ending.totalReached} readers reached</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{ending.reachRate}%</p>
                  <p className="text-xs text-muted-foreground">reach rate</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000"
                  style={{ width: `${ending.reachRate}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Insights Summary */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <h4 className="text-md font-semibold text-foreground mb-3">Key Insights</h4>
        
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
            <span>
              Most popular choice: "{analytics.mostPopularChoice?.text}" with {analytics.mostPopularChoice?.selectionRate}% selection rate
            </span>
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0" />
            <span>
              Least popular choice: "{analytics.leastPopularChoice?.text}" with {analytics.leastPopularChoice?.selectionRate}% selection rate
            </span>
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
            <span>
              Total ending reach rate: {analytics.totalEndingReachRate.toFixed(1)}% of readers complete at least one ending
            </span>
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0" />
            <span>
              Story structure: {analytics.totalNodes} total nodes with {analytics.choiceNodes} decision points and {analytics.endingNodes} possible endings
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}