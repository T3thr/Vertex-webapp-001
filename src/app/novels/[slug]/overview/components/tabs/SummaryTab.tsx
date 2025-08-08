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
  Menu
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
                { id: 'audience', label: 'Audience', icon: Users },
                { id: 'reviews', label: 'Reviews', icon: Star },
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
                { id: 'audience', label: 'Audience', icon: Users },
                { id: 'reviews', label: 'Reviews', icon: Star },
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