// src/app/novels/[slug]/overview/components/unified/narrative/analytics/ReaderInsightsPanel.tsx
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  UsersIcon, 
  ClockIcon,
  MousePointerClickIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  EyeIcon,
  HeartIcon,
  MessageCircleIcon
} from 'lucide-react';

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

interface ReaderInsightsPanelProps {
  analyticsData: AnalyticsData;
  selectedNodeId: string | null;
}

export function ReaderInsightsPanel({
  analyticsData,
  selectedNodeId
}: ReaderInsightsPanelProps) {

  // คำนวณข้อมูล insights
  const insights = useMemo(() => {
    // ข้อมูลเฉพาะของ node ที่เลือก
    const selectedNodeData = selectedNodeId ? {
      dropOff: analyticsData.dropOffPoints.find(point => point.nodeId === selectedNodeId),
      choices: analyticsData.choiceDistribution.filter(choice => choice.nodeId === selectedNodeId),
      emotional: analyticsData.emotionalImpactScores.find(score => score.nodeId === selectedNodeId)
    } : null;

    // ข้อมูลโดยรวม
    const totalChoices = analyticsData.choiceDistribution.length;
    const averageSelectionRate = totalChoices > 0 
      ? analyticsData.choiceDistribution.reduce((sum, choice) => sum + choice.selectionRate, 0) / totalChoices
      : 0;

    const highEngagementChoices = analyticsData.choiceDistribution.filter(choice => choice.selectionRate > 70).length;
    const lowEngagementChoices = analyticsData.choiceDistribution.filter(choice => choice.selectionRate < 30).length;

    const criticalDropOffs = analyticsData.dropOffPoints.filter(point => point.dropOffRate > 20).length;

    const topEndingRate = Math.max(...analyticsData.endingReachRates.map(ending => ending.reachRate));
    const averageEmotionalImpact = analyticsData.emotionalImpactScores.length > 0
      ? analyticsData.emotionalImpactScores.reduce((sum, score) => sum + score.averageImpact, 0) / analyticsData.emotionalImpactScores.length
      : 0;

    return {
      selectedNodeData,
      totalChoices,
      averageSelectionRate,
      highEngagementChoices,
      lowEngagementChoices,
      criticalDropOffs,
      topEndingRate,
      averageEmotionalImpact,
      readerEngagement: analyticsData.completionRate > 60 ? 'high' : analyticsData.completionRate > 30 ? 'medium' : 'low'
    };
  }, [analyticsData, selectedNodeId]);

  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: 'auto' }}
      exit={{ height: 0 }}
      className="bg-card border-t border-border overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-foreground flex items-center">
            <UsersIcon className="w-4 h-4 mr-2 text-blue-500" />
            Reader Insights
            {selectedNodeId && (
              <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                Node: {selectedNodeId}
              </span>
            )}
          </h4>
          
          {/* Engagement Level Indicator */}
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            insights.readerEngagement === 'high' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : insights.readerEngagement === 'medium'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {insights.readerEngagement === 'high' ? 'High Engagement' :
             insights.readerEngagement === 'medium' ? 'Medium Engagement' : 'Low Engagement'}
          </div>
        </div>

        {/* Selected Node Insights */}
        {insights.selectedNodeData && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <h5 className="text-xs font-medium text-foreground mb-2">Selected Node Analysis</h5>
            
            <div className="grid grid-cols-3 gap-3 text-xs">
              {/* Drop-off Rate */}
              {insights.selectedNodeData.dropOff && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <TrendingDownIcon className="w-3 h-3 text-red-500 mr-1" />
                  </div>
                  <div className="font-semibold text-foreground">{insights.selectedNodeData.dropOff.dropOffRate}%</div>
                  <div className="text-muted-foreground">Drop-off</div>
                </div>
              )}

              {/* Choice Performance */}
              {insights.selectedNodeData.choices.length > 0 && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <MousePointerClickIcon className="w-3 h-3 text-blue-500 mr-1" />
                  </div>
                  <div className="font-semibold text-foreground">
                    {(insights.selectedNodeData.choices.reduce((sum, choice) => sum + choice.selectionRate, 0) / insights.selectedNodeData.choices.length).toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground">Avg. Selection</div>
                </div>
              )}

              {/* Emotional Impact */}
              {insights.selectedNodeData.emotional && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <HeartIcon className="w-3 h-3 text-pink-500 mr-1" />
                  </div>
                  <div className="font-semibold text-foreground">{insights.selectedNodeData.emotional.averageImpact}</div>
                  <div className="text-muted-foreground">Impact Score</div>
                </div>
              )}
            </div>

            {/* Choice Details */}
            {insights.selectedNodeData.choices.length > 0 && (
              <div className="mt-3 space-y-1">
                {insights.selectedNodeData.choices.map((choice, index) => (
                  <div key={choice.choiceId} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate flex-1 mr-2">
                      {choice.text}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-12 bg-muted rounded-full h-1">
                        <div 
                          className={`h-full rounded-full ${
                            choice.selectionRate > 50 ? 'bg-green-500' : 
                            choice.selectionRate > 25 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${choice.selectionRate}%` }}
                        />
                      </div>
                      <span className="font-medium text-foreground w-8 text-right">
                        {choice.selectionRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Overall Insights */}
        <div className="grid grid-cols-2 gap-4">
          {/* Quick Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center">
                <EyeIcon className="w-3 h-3 mr-1" />
                Total Readers
              </span>
              <span className="font-semibold text-foreground">
                {analyticsData.totalReaders.toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center">
                <TrendingUpIcon className="w-3 h-3 mr-1" />
                Completion Rate
              </span>
              <span className="font-semibold text-foreground">
                {analyticsData.completionRate}%
              </span>
            </div>

            {analyticsData.averageReadingTime && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center">
                  <ClockIcon className="w-3 h-3 mr-1" />
                  Avg. Reading Time
                </span>
                <span className="font-semibold text-foreground">
                  {analyticsData.averageReadingTime}m
                </span>
              </div>
            )}
          </div>

          {/* Engagement Metrics */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">High Engagement Choices</span>
              <span className="font-semibold text-foreground">
                {insights.highEngagementChoices}/{insights.totalChoices}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Critical Drop-offs</span>
              <span className="font-semibold text-foreground">
                {insights.criticalDropOffs}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Top Ending Rate</span>
              <span className="font-semibold text-foreground">
                {insights.topEndingRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Recommendations */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <h5 className="text-xs font-medium text-foreground mb-2 flex items-center">
            <MessageCircleIcon className="w-3 h-3 mr-1" />
            Quick Recommendations
          </h5>
          
          <ul className="space-y-1 text-xs text-muted-foreground">
            {insights.criticalDropOffs > 0 && (
              <li className="flex items-start">
                <span className="w-1 h-1 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                <span>Review {insights.criticalDropOffs} nodes with high drop-off rates</span>
              </li>
            )}
            
            {insights.lowEngagementChoices > 0 && (
              <li className="flex items-start">
                <span className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                <span>Consider revising {insights.lowEngagementChoices} low-engagement choices</span>
              </li>
            )}
            
            {insights.averageEmotionalImpact < 5 && (
              <li className="flex items-start">
                <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                <span>Enhance emotional impact to increase reader engagement</span>
              </li>
            )}
            
            {analyticsData.completionRate > 70 && (
              <li className="flex items-start">
                <span className="w-1 h-1 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                <span>Excellent completion rate! Consider expanding the story</span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}