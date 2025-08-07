// src/app/novels/[slug]/overview/components/unified/narrative/analytics/EmotionalJourneyMap.tsx
'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartIcon, 
  TrendingUpIcon,
  TrendingDownIcon,
  BarChart3Icon,
  FilterIcon,
  InfoIcon
} from 'lucide-react';

import { StoryMapData } from '../../../../page';

interface EmotionalData {
  nodeEmotions: Array<{
    nodeId: string;
    primaryEmotion: string;
    intensity: number;
    tags: string[];
  }>;
  pathEmotions: Array<{
    fromNodeId: string;
    toNodeId: string;
    emotionalTransition: string;
    impactScore: number;
  }>;
}

interface EmotionalJourneyMapProps {
  emotionalData: EmotionalData;
  storyMap: StoryMapData;
  scenes: any[];
}

// สีและไอคอนสำหรับอารมณ์ต่างๆ
const EMOTION_CONFIG = {
  'happy': { color: '#FCD34D', bgColor: '#FEF3C7', icon: '😊', label: 'ความสุข' },
  'sad': { color: '#60A5FA', bgColor: '#DBEAFE', icon: '😢', label: 'เศร้า' },
  'angry': { color: '#F87171', bgColor: '#FEE2E2', icon: '😠', label: 'โกรธ' },
  'fear': { color: '#A78BFA', bgColor: '#EDE9FE', icon: '😨', label: 'กลัว' },
  'love': { color: '#FB7185', bgColor: '#FCE7F3', icon: '💕', label: 'รัก' },
  'excitement': { color: '#34D399', bgColor: '#D1FAE5', icon: '🤩', label: 'ตื่นเต้น' },
  'mystery': { color: '#6B7280', bgColor: '#F3F4F6', icon: '🕵️', label: 'ลึกลับ' },
  'tension': { color: '#F59E0B', bgColor: '#FEF3C7', icon: '😰', label: 'ตึงเครียด' },
  'relief': { color: '#10B981', bgColor: '#D1FAE5', icon: '😌', label: 'โล่งใจ' },
  'surprise': { color: '#8B5CF6', bgColor: '#EDE9FE', icon: '😲', label: 'ประหลาดใจ' },
  'neutral': { color: '#9CA3AF', bgColor: '#F9FAFB', icon: '😐', label: 'เป็นกลาง' }
} as const;

// ประเภทของการเปลี่ยนแปลงอารมณ์
const TRANSITION_TYPES = {
  'escalating': { label: 'ขยายความรุนแรง', color: '#EF4444', pattern: 'increasing' },
  'de-escalating': { label: 'ลดความรุนแรง', color: '#10B981', pattern: 'decreasing' },
  'contrasting': { label: 'ตัดกัน', color: '#8B5CF6', pattern: 'contrast' },
  'maintaining': { label: 'คงที่', color: '#6B7280', pattern: 'stable' },
  'neutral': { label: 'เป็นกลาง', color: '#9CA3AF', pattern: 'neutral' }
} as const;

export function EmotionalJourneyMap({
  emotionalData,
  storyMap,
  scenes
}: EmotionalJourneyMapProps) {

  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [showIntensityMap, setShowIntensityMap] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // วิเคราะห์ข้อมูลอารมณ์
  const emotionalAnalysis = useMemo(() => {
    const emotionCounts = emotionalData.nodeEmotions.reduce((acc, node) => {
      node.tags.forEach(emotion => {
        acc[emotion] = (acc[emotion] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const averageIntensity = emotionalData.nodeEmotions.reduce((sum, node) => 
      sum + node.intensity, 0) / emotionalData.nodeEmotions.length;

    const intensityDistribution = {
      low: emotionalData.nodeEmotions.filter(n => n.intensity <= 3).length,
      medium: emotionalData.nodeEmotions.filter(n => n.intensity > 3 && n.intensity <= 7).length,
      high: emotionalData.nodeEmotions.filter(n => n.intensity > 7).length
    };

    const mostCommonEmotion = Object.entries(emotionCounts).reduce((prev, [emotion, count]) => 
      count > prev.count ? { emotion, count } : prev, { emotion: '', count: 0 });

    const emotionalFlow = emotionalData.pathEmotions.map(path => {
      const fromNode = emotionalData.nodeEmotions.find(n => n.nodeId === path.fromNodeId);
      const toNode = emotionalData.nodeEmotions.find(n => n.nodeId === path.toNodeId);
      
      if (!fromNode || !toNode) return null;
      
      const intensityChange = toNode.intensity - fromNode.intensity;
      const transitionType = intensityChange > 2 ? 'escalating' :
                           intensityChange < -2 ? 'de-escalating' :
                           fromNode.primaryEmotion !== toNode.primaryEmotion ? 'contrasting' :
                           'maintaining';
      
      return {
        ...path,
        fromEmotion: fromNode.primaryEmotion,
        toEmotion: toNode.primaryEmotion,
        intensityChange,
        transitionType
      };
    }).filter(Boolean);

    return {
      emotionCounts,
      averageIntensity,
      intensityDistribution,
      mostCommonEmotion,
      emotionalFlow,
      totalNodes: emotionalData.nodeEmotions.length
    };
  }, [emotionalData]);

  // กรองข้อมูลตามอารมณ์ที่เลือก
  const filteredNodes = useMemo(() => {
    if (!selectedEmotion) return emotionalData.nodeEmotions;
    return emotionalData.nodeEmotions.filter(node => 
      node.tags.includes(selectedEmotion) || node.primaryEmotion === selectedEmotion
    );
  }, [emotionalData.nodeEmotions, selectedEmotion]);

  return (
    <div className="h-full overflow-y-auto bg-background p-4">
      {/* Header Controls */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center">
            <HeartIcon className="w-5 h-5 mr-2 text-pink-500" />
            Emotional Journey Map
          </h3>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowIntensityMap(!showIntensityMap)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                showIntensityMap
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3Icon className="w-3 h-3 mr-1 inline" />
              Intensity Map
            </button>
            <button className="p-1 text-muted-foreground hover:text-foreground">
              <FilterIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Emotion Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedEmotion(null)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              !selectedEmotion
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All Emotions
          </button>
          {Object.entries(EMOTION_CONFIG).map(([emotion, config]) => {
            const count = emotionalAnalysis.emotionCounts[emotion] || 0;
            if (count === 0) return null;
            
            return (
              <button
                key={emotion}
                onClick={() => setSelectedEmotion(emotion === selectedEmotion ? null : emotion)}
                className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center ${
                  selectedEmotion === emotion
                    ? 'text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
                style={{
                  backgroundColor: selectedEmotion === emotion ? config.color : undefined
                }}
              >
                <span className="mr-1">{config.icon}</span>
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Intensity</p>
              <p className="text-2xl font-bold text-foreground">
                {emotionalAnalysis.averageIntensity.toFixed(1)}/10
              </p>
            </div>
            <div className="text-3xl">
              {EMOTION_CONFIG[emotionalAnalysis.mostCommonEmotion.emotion as keyof typeof EMOTION_CONFIG]?.icon || '📊'}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Most Common</p>
              <p className="text-lg font-bold text-foreground">
                {EMOTION_CONFIG[emotionalAnalysis.mostCommonEmotion.emotion as keyof typeof EMOTION_CONFIG]?.label || 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground">
                {emotionalAnalysis.mostCommonEmotion.count} nodes
              </p>
            </div>
            <HeartIcon className="w-8 h-8 text-pink-500" />
          </div>
        </motion.div>
      </div>

      {/* Intensity Distribution */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-foreground mb-3">Emotional Intensity Distribution</h4>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Low Intensity (1-3)</span>
              <span className="text-sm font-medium text-foreground">{emotionalAnalysis.intensityDistribution.low} nodes</span>
            </div>
            <div className="bg-muted rounded-full h-2">
              <div 
                className="h-full bg-green-500 rounded-full transition-all duration-1000"
                style={{ width: `${(emotionalAnalysis.intensityDistribution.low / emotionalAnalysis.totalNodes) * 100}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Medium Intensity (4-7)</span>
              <span className="text-sm font-medium text-foreground">{emotionalAnalysis.intensityDistribution.medium} nodes</span>
            </div>
            <div className="bg-muted rounded-full h-2">
              <div 
                className="h-full bg-yellow-500 rounded-full transition-all duration-1000"
                style={{ width: `${(emotionalAnalysis.intensityDistribution.medium / emotionalAnalysis.totalNodes) * 100}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">High Intensity (8-10)</span>
              <span className="text-sm font-medium text-foreground">{emotionalAnalysis.intensityDistribution.high} nodes</span>
            </div>
            <div className="bg-muted rounded-full h-2">
              <div 
                className="h-full bg-red-500 rounded-full transition-all duration-1000"
                style={{ width: `${(emotionalAnalysis.intensityDistribution.high / emotionalAnalysis.totalNodes) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Emotional Flow Analysis */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-foreground mb-3">Emotional Transitions</h4>
        
        <div className="space-y-3">
          {emotionalAnalysis.emotionalFlow.slice(0, 5).map((flow, index) => {
            if (!flow) return null;
            
            const transitionConfig = TRANSITION_TYPES[flow.transitionType as keyof typeof TRANSITION_TYPES];
            const fromConfig = EMOTION_CONFIG[flow.fromEmotion as keyof typeof EMOTION_CONFIG];
            const toConfig = EMOTION_CONFIG[flow.toEmotion as keyof typeof EMOTION_CONFIG];
            
            return (
              <motion.div
                key={`${flow.fromNodeId}-${flow.toNodeId}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border border-border rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <span>{fromConfig?.icon || '😐'}</span>
                      <span className="text-xs text-muted-foreground">{fromConfig?.label}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-4 h-0.5" style={{ backgroundColor: transitionConfig.color }} />
                      <span>→</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>{toConfig?.icon || '😐'}</span>
                      <span className="text-xs text-muted-foreground">{toConfig?.label}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {flow.intensityChange > 0 ? '+' : ''}{flow.intensityChange}
                    </p>
                    <p className="text-xs text-muted-foreground">{transitionConfig.label}</p>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Impact Score: {flow.impactScore || 0}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Node Details */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedNode(null)}
          >
            <div 
              className="bg-card border border-border rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-semibold text-foreground mb-4">Node Emotional Details</h4>
              {/* Node details content */}
              <div className="text-sm text-muted-foreground">
                Detailed emotional analysis will be shown here
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insights Panel */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <h4 className="text-md font-semibold text-foreground mb-3 flex items-center">
          <InfoIcon className="w-4 h-4 mr-2" />
          Emotional Journey Insights
        </h4>
        
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start">
            <span className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0" />
            <span>
              Story maintains an average emotional intensity of {emotionalAnalysis.averageIntensity.toFixed(1)}/10
            </span>
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
            <span>
              {EMOTION_CONFIG[emotionalAnalysis.mostCommonEmotion.emotion as keyof typeof EMOTION_CONFIG]?.label} is the dominant emotion 
              ({emotionalAnalysis.mostCommonEmotion.count} occurrences)
            </span>
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
            <span>
              {((emotionalAnalysis.intensityDistribution.high / emotionalAnalysis.totalNodes) * 100).toFixed(1)}% 
              of nodes have high emotional intensity (8-10)
            </span>
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0" />
            <span>
              Emotional flow analysis shows {emotionalAnalysis.emotionalFlow.length} transition patterns
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}