// app/novels/[slug]/overview/components/tabs/SummaryTab.tsx
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// Icons
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  Heart,
  MessageCircle,
  Star,
  Users,
  BookOpen,
  Calendar,
  Clock,
  Target,
  Award,
  Share2,
  Bookmark,
  Download,
  Upload,
  Settings,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Coins,
  CreditCard,
  Gift,
  AlertCircle,
  CheckCircle,
  XCircle,
  Menu,
  Brain,
  Shield,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Filter,
  Search,
  ExternalLink,
  Copy,
  MoreHorizontal,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Zap,
  Info,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  SortAsc,
  SortDesc,
  Save
} from 'lucide-react';

// Props interface
interface SummaryTabProps {
  novel: any;
  episodes: any[];
  onNovelUpdate: (novelData: any) => void;
  onEpisodeUpdate: (episodeId: string, episodeData: any) => void;
}

// Stats Card Component
const StatsCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend 
}: {
  title: string;
  value: string | number;
  change?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
}) => (
  <Card className="bg-background">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 text-sm ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-muted-foreground'
            }`}>
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className="p-2 bg-primary/10 rounded-full">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Revenue Chart Component
const RevenueChart = ({ data }: { data: any[] }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Revenue Trend (Last 30 Days)</h4>
        <Badge variant="secondary">THB</Badge>
      </div>
      <div className="h-48 flex items-end justify-between gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-primary/20 rounded-t"
              style={{ height: `${(item.value / maxValue) * 100}%` }}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Episode Management Component
const EpisodeManagement = ({ 
  episodes, 
  onEpisodeUpdate 
}: {
  episodes: any[];
  onEpisodeUpdate: (episodeId: string, updates: any) => void;
}) => {
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleStatusChange = async (episodeId: string, newStatus: string) => {
    setIsPublishing(true);
    try {
      await onEpisodeUpdate(episodeId, { status: newStatus });
      toast.success('Episode status updated');
    } catch (error) {
      toast.error('Failed to update episode status');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Episode Management</h4>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          New Episode
        </Button>
      </div>
      
      <div className="space-y-2">
        {episodes.map((episode) => (
          <Card key={episode._id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-medium">{episode.title}</h5>
                  <Badge variant={
                    episode.status === 'published' ? 'default' :
                    episode.status === 'draft' ? 'secondary' :
                    episode.status === 'scheduled' ? 'outline' :
                    'destructive'
                  }>
                    {episode.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Order: {episode.episodeOrder}</span>
                  <span>Views: {episode.stats?.viewsCount || 0}</span>
                  <span>Words: {episode.stats?.totalWords || 0}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Select 
                  value={episode.status} 
                  onValueChange={(value) => handleStatusChange(episode._id, value)}
                  disabled={isPublishing}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="unpublished">Unpublished</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Audience Insights Component
const AudienceInsights = ({ novel }: { novel: any }) => {
  const demographics = [
    { label: 'Age 18-24', value: 35, color: 'bg-blue-500' },
    { label: 'Age 25-34', value: 45, color: 'bg-green-500' },
    { label: 'Age 35-44', value: 15, color: 'bg-yellow-500' },
    { label: 'Age 45+', value: 5, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold mb-4">Reader Demographics</h4>
        <div className="space-y-3">
          {demographics.map((demo) => (
            <div key={demo.label} className="flex items-center gap-3">
              <div className="w-20 text-sm text-muted-foreground">{demo.label}</div>
              <div className="flex-1">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${demo.color}`}
                    style={{ width: `${demo.value}%` }}
                  />
                </div>
              </div>
              <div className="w-10 text-sm font-medium">{demo.value}%</div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-4">Reading Behavior</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">78%</div>
            <div className="text-sm text-muted-foreground">Completion Rate</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">12min</div>
            <div className="text-sm text-muted-foreground">Avg. Session</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reviews & Ratings Component
const ReviewsRatings = ({ novel }: { novel: any }) => {
  const ratings = [
    { stars: 5, count: 120, percentage: 60 },
    { stars: 4, count: 50, percentage: 25 },
    { stars: 3, count: 20, percentage: 10 },
    { stars: 2, count: 8, percentage: 4 },
    { stars: 1, count: 2, percentage: 1 },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-3xl font-bold">{novel.stats?.averageRating || 0}</div>
        <div className="flex items-center justify-center gap-1 my-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star 
              key={i} 
              className={`w-5 h-5 ${
                i < Math.floor(novel.stats?.averageRating || 0) 
                  ? 'text-yellow-400 fill-current' 
                  : 'text-muted-foreground'
              }`} 
            />
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          Based on {novel.stats?.ratingsCount || 0} reviews
        </div>
      </div>

      <div className="space-y-2">
        {ratings.map((rating) => (
          <div key={rating.stars} className="flex items-center gap-3">
            <div className="flex items-center gap-1 w-12">
              <span className="text-sm">{rating.stars}</span>
              <Star className="w-3 h-3 text-yellow-400" />
            </div>
            <div className="flex-1">
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="h-2 bg-yellow-400 rounded-full"
                  style={{ width: `${rating.percentage}%` }}
                />
              </div>
            </div>
            <div className="w-10 text-sm text-muted-foreground">{rating.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Mental Wellbeing Insights Component
const MentalWellbeingInsights = ({ novel }: { novel: any }) => {
  const [isOptedIn, setIsOptedIn] = useState(true);
  const [insights, setInsights] = useState({
    overallSentiment: 'positive',
    sensitiveTopicCount: 2,
    readerFeedbackSentiment: 'mostly_positive',
    recommendedBreaks: 3,
    contentWarnings: ['mild_violence', 'emotional_themes'],
    lastAnalysisDate: new Date().toISOString()
  });

  if (!isOptedIn) {
    return (
      <Card className="bg-background">
        <CardContent className="p-6 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h4 className="font-semibold mb-2">Mental Wellbeing Insights</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Get AI-powered insights about your story's emotional impact and reader wellbeing.
          </p>
          <Button onClick={() => setIsOptedIn(true)} variant="outline">
            <Brain className="w-4 h-4 mr-2" />
            Enable Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Mental Wellbeing Analysis</h4>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Update Analysis
        </Button>
      </div>

      {/* Overall Sentiment */}
      <Card className="bg-background">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-full ${
              insights.overallSentiment === 'positive' ? 'bg-green-100 text-green-600' :
              insights.overallSentiment === 'negative' ? 'bg-red-100 text-red-600' :
              'bg-yellow-100 text-yellow-600'
            }`}>
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-medium">Overall Story Sentiment</h5>
              <p className="text-sm text-muted-foreground capitalize">
                {insights.overallSentiment.replace('_', ' ')}
              </p>
            </div>
          </div>
          <Progress 
            value={insights.overallSentiment === 'positive' ? 85 : 
                   insights.overallSentiment === 'negative' ? 25 : 60} 
            className="h-2" 
          />
        </CardContent>
      </Card>

      {/* Content Warnings */}
      <Card className="bg-background">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-orange-500" />
            <h5 className="font-medium">Content Considerations</h5>
          </div>
          <div className="space-y-2">
            {insights.contentWarnings.map((warning, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm capitalize">{warning.replace('_', ' ')}</span>
                <Badge variant="outline" className="text-xs">
                  Active
                </Badge>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3">
            <Settings className="w-4 h-4 mr-2" />
            Manage Warnings
          </Button>
        </CardContent>
      </Card>

      {/* Reader Recommendations */}
      <Card className="bg-background">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-blue-500" />
            <h5 className="font-medium">Reader Wellbeing</h5>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Suggested reading breaks</span>
              <span className="text-sm font-medium">{insights.recommendedBreaks} per episode</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Reader feedback sentiment</span>
              <Badge variant={insights.readerFeedbackSentiment === 'mostly_positive' ? 'default' : 'secondary'}>
                {insights.readerFeedbackSentiment.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Settings */}
      <Card className="bg-background">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium">Analysis Settings</h5>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-analysis">Auto-analysis</Label>
              <Switch id="auto-analysis" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sensitive-content">Sensitive content detection</Label>
              <Switch id="sensitive-content" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="reader-feedback">Reader feedback analysis</Label>
              <Switch id="reader-feedback" defaultChecked />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
            Last updated: {new Date(insights.lastAnalysisDate).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Advanced Analytics Component
const AdvancedAnalytics = ({ novel }: { novel: any }) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState({
    deviceBreakdown: [
      { device: 'Mobile', percentage: 65, count: 2340 },
      { device: 'Desktop', percentage: 25, count: 900 },
      { device: 'Tablet', percentage: 10, count: 360 }
    ],
    geographicData: [
      { country: 'Thailand', percentage: 45, count: 1620 },
      { country: 'Singapore', percentage: 20, count: 720 },
      { country: 'Malaysia', percentage: 15, count: 540 },
      { country: 'Others', percentage: 20, count: 720 }
    ],
    readingPatterns: {
      averageSessionTime: '12.5 min',
      bounceRate: '15%',
      returnReaderRate: '68%',
      peakReadingHours: ['19:00-21:00', '21:00-23:00']
    },
    choiceAnalytics: [
      { choiceText: 'Help the mysterious stranger', percentage: 72, count: 864 },
      { choiceText: 'Walk away quietly', percentage: 28, count: 336 }
    ]
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Advanced Analytics</h4>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Device Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.deviceBreakdown.map((device, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {device.device === 'Mobile' && <Smartphone className="w-4 h-4" />}
                      {device.device === 'Desktop' && <Monitor className="w-4 h-4" />}
                      {device.device === 'Tablet' && <Tablet className="w-4 h-4" />}
                      <span className="text-sm">{device.device}</span>
                    </div>
                    <span className="text-sm font-medium">{device.percentage}%</span>
                  </div>
                  <Progress value={device.percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {device.count.toLocaleString()} readers
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Geographic Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.geographicData.map((location, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{location.country}</span>
                    <span className="text-sm font-medium">{location.percentage}%</span>
                  </div>
                  <Progress value={location.percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {location.count.toLocaleString()} readers
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reading Patterns */}
        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Reading Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-primary">
                  {analyticsData.readingPatterns.averageSessionTime}
                </div>
                <div className="text-xs text-muted-foreground">Avg. Session</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-primary">
                  {analyticsData.readingPatterns.bounceRate}
                </div>
                <div className="text-xs text-muted-foreground">Bounce Rate</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-primary">
                  {analyticsData.readingPatterns.returnReaderRate}
                </div>
                <div className="text-xs text-muted-foreground">Return Rate</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-primary">
                  {analyticsData.readingPatterns.peakReadingHours.length}
                </div>
                <div className="text-xs text-muted-foreground">Peak Hours</div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t">
              <h6 className="text-sm font-medium mb-2">Peak Reading Times</h6>
              <div className="flex flex-wrap gap-2">
                {analyticsData.readingPatterns.peakReadingHours.map((hour, index) => (
                  <Badge key={index} variant="outline">{hour}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Choice Analytics */}
        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Choice Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Most recent choice from Episode 5: "The Crossroads"
              </p>
              {analyticsData.choiceAnalytics.map((choice, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{choice.choiceText}</span>
                    <span className="text-sm">{choice.percentage}%</span>
                  </div>
                  <Progress value={choice.percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {choice.count} readers chose this option
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              <BarChart3 className="w-4 h-4 mr-2" />
              View All Choice Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// SEO & Discoverability Component
const SEODiscoverability = ({ novel, onNovelUpdate }: { novel: any; onNovelUpdate: (data: any) => void }) => {
  const [seoData, setSeoData] = useState({
    title: novel.title || '',
    description: novel.synopsis || '',
    tags: novel.themeAssignment?.customTags || [],
    searchKeywords: ['visual novel', 'interactive fiction', 'romance'],
    seoScore: 85
  });

  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    if (newTag.trim() && !seoData.tags.includes(newTag.trim())) {
      setSeoData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSeoData(prev => ({
      ...prev,
      tags: prev.tags.filter((tag: string) => tag !== tagToRemove)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">SEO & Discoverability</h4>
        <Badge variant={seoData.seoScore >= 80 ? 'default' : seoData.seoScore >= 60 ? 'secondary' : 'destructive'}>
          SEO Score: {seoData.seoScore}/100
        </Badge>
      </div>

      {/* SEO Optimization */}
      <Card className="bg-background">
        <CardHeader>
          <CardTitle>Search Optimization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="seo-title">SEO Title</Label>
            <Input
              id="seo-title"
              value={seoData.title}
              onChange={(e) => setSeoData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Optimized title for search engines"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {seoData.title.length}/60 characters
            </div>
          </div>

          <div>
            <Label htmlFor="seo-description">Meta Description</Label>
            <Textarea
              id="seo-description"
              value={seoData.description}
              onChange={(e) => setSeoData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description for search results"
              rows={3}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {seoData.description.length}/160 characters
            </div>
          </div>

          <div>
            <Label>Tags & Keywords</Label>
            <div className="flex gap-2 mt-2 mb-3">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <Button onClick={addTag} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {seoData.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="outline" className="gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)}>
                    <XCircle className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <Button className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Update SEO Settings
          </Button>
        </CardContent>
      </Card>

      {/* Discoverability Metrics */}
      <Card className="bg-background">
        <CardHeader>
          <CardTitle>Discoverability Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-primary">1,234</div>
              <div className="text-xs text-muted-foreground">Search Impressions</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-primary">8.5%</div>
              <div className="text-xs text-muted-foreground">Click-through Rate</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-primary">23</div>
              <div className="text-xs text-muted-foreground">Trending Position</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-primary">567</div>
              <div className="text-xs text-muted-foreground">Social Shares</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Summary Tab Component
const SummaryTab: React.FC<SummaryTabProps> = ({ 
  novel, 
  episodes, 
  onNovelUpdate, 
  onEpisodeUpdate 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock revenue data - in real app, fetch from API
  const revenueData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 1000) + 100
    }));
  }, []);

  const stats = useMemo(() => ({
    totalRevenue: novel.stats?.totalRevenueCoins || 0,
    totalViews: novel.stats?.viewsCount || 0,
    totalFollowers: novel.stats?.followersCount || 0,
    averageRating: novel.stats?.averageRating || 0,
    totalEpisodes: episodes.length,
    publishedEpisodes: episodes.filter(e => e.status === 'published').length
  }), [novel, episodes]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Summary</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 border-r bg-background">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Summary</h3>
            <nav className="space-y-1">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'revenue', label: 'Revenue', icon: DollarSign },
                { id: 'analytics', label: 'Analytics', icon: Activity },
                { id: 'audience', label: 'Audience', icon: Users },
                { id: 'reviews', label: 'Reviews', icon: Star },
                { id: 'wellbeing', label: 'Wellbeing', icon: Brain },
                { id: 'seo', label: 'SEO', icon: Search },
                { id: 'episodes', label: 'Episodes', icon: BookOpen },
                { id: 'publish', label: 'Publish', icon: Upload },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${activeTab === item.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-6">Novel Overview</h3>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                      <StatsCard
                        title="Total Revenue"
                        value={`${stats.totalRevenue.toLocaleString()} coins`}
                        change="+12% from last month"
                        icon={Coins}
                        trend="up"
                      />
                      <StatsCard
                        title="Total Views"
                        value={stats.totalViews.toLocaleString()}
                        change="+8% from last month"
                        icon={Eye}
                        trend="up"
                      />
                      <StatsCard
                        title="Followers"
                        value={stats.totalFollowers.toLocaleString()}
                        change="+5% from last month"
                        icon={Heart}
                        trend="up"
                      />
                      <StatsCard
                        title="Average Rating"
                        value={stats.averageRating.toFixed(1)}
                        change="4.2/5.0 stars"
                        icon={Star}
                        trend="neutral"
                      />
                      <StatsCard
                        title="Episodes"
                        value={`${stats.publishedEpisodes}/${stats.totalEpisodes}`}
                        change="2 pending"
                        icon={BookOpen}
                        trend="neutral"
                      />
                      <StatsCard
                        title="Completion Rate"
                        value="78%"
                        change="+3% from last month"
                        icon={Target}
                        trend="up"
                      />
                    </div>

                    {/* Quick Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <Button variant="outline" className="h-20 flex-col">
                            <Plus className="w-6 h-6 mb-2" />
                            New Episode
                          </Button>
                          <Button variant="outline" className="h-20 flex-col">
                            <Upload className="w-6 h-6 mb-2" />
                            Publish
                          </Button>
                          <Button variant="outline" className="h-20 flex-col">
                            <Settings className="w-6 h-6 mb-2" />
                            Settings
                          </Button>
                          <Button variant="outline" className="h-20 flex-col">
                            <Share2 className="w-6 h-6 mb-2" />
                            Share
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'revenue' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">Revenue Analytics</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <RevenueChart data={revenueData} />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Payment Methods</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Coins className="w-4 h-4 text-yellow-500" />
                              <span>In-app Coins</span>
                            </div>
                            <span className="font-medium">85%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-blue-500" />
                              <span>Credit Card</span>
                            </div>
                            <span className="font-medium">15%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">Advanced Analytics</h3>
                  <AdvancedAnalytics novel={novel} />
                </div>
              )}

              {activeTab === 'audience' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">Audience Insights</h3>
                  <AudienceInsights novel={novel} />
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">Reviews & Ratings</h3>
                  <ReviewsRatings novel={novel} />
                </div>
              )}

              {activeTab === 'wellbeing' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">Mental Wellbeing Insights</h3>
                  <MentalWellbeingInsights novel={novel} />
                </div>
              )}

              {activeTab === 'seo' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">SEO & Discoverability</h3>
                  <SEODiscoverability novel={novel} onNovelUpdate={onNovelUpdate} />
                </div>
              )}

              {activeTab === 'episodes' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">Episode Management</h3>
                  <EpisodeManagement 
                    episodes={episodes} 
                    onEpisodeUpdate={onEpisodeUpdate} 
                  />
                </div>
              )}

              {activeTab === 'publish' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">Publish Settings</h3>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Novel Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="novel-status">Current Status</Label>
                        <Select value={novel.status}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="access-level">Access Level</Label>
                        <Select value={novel.accessLevel}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="unlisted">Unlisted</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Update Novel Settings
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>Summary Navigation</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <nav className="space-y-1">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'revenue', label: 'Revenue', icon: DollarSign },
                { id: 'analytics', label: 'Analytics', icon: Activity },
                { id: 'audience', label: 'Audience', icon: Users },
                { id: 'reviews', label: 'Reviews', icon: Star },
                { id: 'wellbeing', label: 'Wellbeing', icon: Brain },
                { id: 'seo', label: 'SEO', icon: Search },
                { id: 'episodes', label: 'Episodes', icon: BookOpen },
                { id: 'publish', label: 'Publish', icon: Upload },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${activeTab === item.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SummaryTab;