// src/app/novels/[slug]/overview/components/PreviewPublishTab.tsx
"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play,
  Pause,
  RotateCcw,
  Settings,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Users,
  Crown,
  BarChart3,
  Heart,
  MessageCircle,
  BookOpen,
  Clock,
  Star,
  TrendingUp,
  Edit3,
  Save,
  Upload,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

// Import reader components
import VisualNovelFrameReader from '@/components/read/VisualNovelFrameReader';

interface PreviewPublishTabProps {
  novel: any;
  episodes: any[];
  storyMap: any | null;
  characters: any[];
  scenes: any[];
  userMedia: any[];
  officialMedia: any[];
  onNovelUpdate?: (updates: any) => Promise<void>;
}

interface PublicationState {
  status: 'draft' | 'published' | 'scheduled' | 'unpublished';
  visibility: 'public' | 'unlisted' | 'private' | 'followers_only' | 'premium_only';
  scheduledAt?: Date;
  publishedAt?: Date;
  lastModified?: Date;
}

interface NovelStats {
  views: number;
  likes: number;
  comments: number;
  bookmarks: number;
  followers: number;
  averageRating: number;
  totalRatings: number;
  readingTime: number;
  completionRate: number;
}

const PreviewPublishTab: React.FC<PreviewPublishTabProps> = ({
  novel,
  episodes,
  storyMap,
  characters,
  scenes,
  userMedia,
  officialMedia,
  onNovelUpdate
}) => {
  // Preview state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewEpisodeId, setPreviewEpisodeId] = useState<string | null>(null);
  const [previewSceneId, setPreviewSceneId] = useState<string | null>(null);
  
  // Publication state
  const [publicationState, setPublicationState] = useState<PublicationState>({
    status: novel.status || 'draft',
    visibility: novel.accessLevel || 'public',
    publishedAt: novel.publishedAt ? new Date(novel.publishedAt) : undefined,
    lastModified: novel.updatedAt ? new Date(novel.updatedAt) : undefined
  });
  
  // Form state for novel information
  const [novelForm, setNovelForm] = useState({
    title: novel.title || '',
    synopsis: novel.synopsis || '',
    coverImage: novel.coverImage || '',
    tags: novel.themeAssignment?.customTags || [],
    ageRating: novel.ageRatingCategoryId?.name || '',
    language: novel.language?.name || '',
    isCompleted: novel.isCompleted || false
  });
  
  // Save state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  
  // Mock stats (in real implementation, fetch from database)
  const novelStats: NovelStats = useMemo(() => ({
    views: novel.stats?.viewsCount || 0,
    likes: novel.stats?.likesCount || 0,
    comments: novel.stats?.commentsCount || 0,
    bookmarks: novel.stats?.bookmarksCount || 0,
    followers: novel.stats?.followersCount || 0,
    averageRating: novel.stats?.averageRating || 0,
    totalRatings: novel.stats?.ratingsCount || 0,
    readingTime: novel.stats?.estimatedReadingTimeMinutes || 0,
    completionRate: 85 // Mock data
  }), [novel]);

  // Get first playable episode for preview and prepare data in the format expected by VisualNovelFrameReader
  const previewData = useMemo(() => {
    if (!episodes.length) return null;
    
    const firstEpisode = episodes.find(ep => ep.status === 'published') || episodes[0];
    if (!firstEpisode) return null;
    
    // Find start node from story map to get first scene ID
    let firstSceneId: string | undefined;
    if (storyMap) {
      const startNode = storyMap.nodes?.find((node: any) => node.nodeType === 'start_node');
      if (startNode) {
        const connectedEdge = storyMap.edges?.find((edge: any) => edge.sourceNodeId === startNode.nodeId);
        if (connectedEdge) {
          const sceneNode = storyMap.nodes?.find((node: any) => node.nodeId === connectedEdge.targetNodeId);
          if (sceneNode && sceneNode.nodeType === 'scene_node') {
            firstSceneId = sceneNode.nodeSpecificData?.sceneId;
          }
        }
      }
    }
    
    // Transform novel data to match DisplayNovel type expected by VisualNovelFrameReader
    const serializedNovel = {
      _id: novel._id?.toString() || '',
      title: novel.title || '',
      slug: novel.slug || '',
      coverImageUrl: novel.coverImage || '',
      synopsis: novel.synopsis || '',
      endingType: novel.endingType || 'single',
      isCompleted: novel.isCompleted || false,
      totalEpisodesCount: episodes.length,
      author: {
        _id: novel.author?._id?.toString() || novel.authorId?.toString() || '',
        username: novel.author?.username || '',
        primaryPenName: novel.author?.primaryPenName || novel.author?.username || '',
        avatarUrl: novel.author?.avatarUrl || ''
      }
    };
    
    // Transform episode data to match FullEpisode type expected by VisualNovelFrameReader
    const serializedEpisode = {
      _id: firstEpisode._id?.toString() || '',
      title: firstEpisode.title || `Episode ${firstEpisode.episodeOrder || 1}`,
      slug: firstEpisode.slug || '',
      episodeOrder: firstEpisode.episodeOrder || 1,
      accessType: firstEpisode.accessType || 'free',
      priceCoins: firstEpisode.priceCoins || 0,
      originalPriceCoins: firstEpisode.originalPriceCoins || 0,
      firstSceneId: firstSceneId || firstEpisode.firstSceneId?.toString(),
      teaserText: firstEpisode.teaserText || '',
      stats: {
        viewsCount: firstEpisode.stats?.viewsCount || 0,
        likesCount: firstEpisode.stats?.likesCount || 0,
        commentsCount: firstEpisode.stats?.commentsCount || 0,
        estimatedReadingTimeMinutes: firstEpisode.stats?.estimatedReadingTimeMinutes || 10,
        totalWords: firstEpisode.stats?.totalWords || 0,
        uniqueViewersCount: firstEpisode.stats?.uniqueViewersCount || 0,
        purchasesCount: firstEpisode.stats?.purchasesCount || 0,
      }
    };
    
    return {
      novel: serializedNovel,
      episode: serializedEpisode,
      firstSceneId: firstSceneId
    };
  }, [episodes, scenes, storyMap, novel]);

  // Handle form updates
  const handleFormUpdate = useCallback((field: string, value: any) => {
    setNovelForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle publication status change
  const handlePublicationChange = useCallback((field: keyof PublicationState, value: any) => {
    setPublicationState(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save novel updates
  const saveNovelUpdates = useCallback(async () => {
    if (!onNovelUpdate) return;
    
    try {
      setSaveStatus('saving');
      await onNovelUpdate({
        title: novelForm.title,
        synopsis: novelForm.synopsis,
        coverImage: novelForm.coverImage,
        status: publicationState.status,
        accessLevel: publicationState.visibility,
        isCompleted: novelForm.isCompleted,
        'themeAssignment.customTags': novelForm.tags
      });
      setSaveStatus('saved');
      setLastSaveTime(new Date());
    } catch (error) {
      console.error('Failed to save novel:', error);
      setSaveStatus('error');
    }
  }, [novelForm, publicationState, onNovelUpdate]);

  // Publish novel
  const publishNovel = useCallback(async () => {
    if (!onNovelUpdate) return;
    
    try {
      setSaveStatus('saving');
      await onNovelUpdate({
        status: 'published',
        publishedAt: new Date(),
        accessLevel: publicationState.visibility
      });
      setPublicationState(prev => ({ 
        ...prev, 
        status: 'published',
        publishedAt: new Date()
      }));
      setSaveStatus('saved');
      setLastSaveTime(new Date());
    } catch (error) {
      console.error('Failed to publish novel:', error);
      setSaveStatus('error');
    }
  }, [publicationState.visibility, onNovelUpdate]);

  // Auto-save effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (JSON.stringify(novelForm) !== JSON.stringify({
        title: novel.title || '',
        synopsis: novel.synopsis || '',
        coverImage: novel.coverImage || '',
        tags: novel.themeAssignment?.customTags || [],
        ageRating: novel.ageRatingCategoryId?.name || '',
        language: novel.language?.name || '',
        isCompleted: novel.isCompleted || false
      })) {
        saveNovelUpdates();
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [novelForm, novel, saveNovelUpdates]);

  return (
    <div className="preview-publish-tab h-full bg-background flex">
      {/* ✅ Left Panel - Novel Information & Publication Controls */}
      <div className="w-96 bg-card border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Preview & Publish</h2>
            
            {/* Save Status */}
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <>
                  <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-muted-foreground">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Save className="w-3 h-3 text-green-500" />
                  <span className="text-green-600">Saved</span>
                  {lastSaveTime && (
                    <span className="text-xs text-muted-foreground">
                      {lastSaveTime.toLocaleTimeString('th-TH')}
                    </span>
                  )}
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span className="text-red-600">Error</span>
                </>
              )}
            </div>
          </div>
          
          {/* Publication Status Indicator */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            publicationState.status === 'published' 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : publicationState.status === 'draft'
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
              : 'bg-gray-100 text-gray-700 border border-gray-200'
          }`}>
            {publicationState.status === 'published' && <CheckCircle className="w-4 h-4" />}
            {publicationState.status === 'draft' && <Edit3 className="w-4 h-4" />}
            {publicationState.status === 'unpublished' && <X className="w-4 h-4" />}
            <span className="capitalize">{publicationState.status}</span>
            {publicationState.publishedAt && (
              <span className="text-xs opacity-75">
                {publicationState.publishedAt.toLocaleDateString('th-TH')}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Novel Information Form */}
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Novel Information</h3>
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={novelForm.title}
                    onChange={(e) => handleFormUpdate('title', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter novel title..."
                  />
                </div>

                {/* Synopsis */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Synopsis *
                  </label>
                  <textarea
                    value={novelForm.synopsis}
                    onChange={(e) => handleFormUpdate('synopsis', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    placeholder="Describe your story..."
                  />
                </div>

                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Cover Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={novelForm.coverImage}
                      onChange={(e) => handleFormUpdate('coverImage', e.target.value)}
                      className="flex-1 px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="https://..."
                    />
                    <button className="px-3 py-2 bg-accent hover:bg-accent/80 rounded-md text-sm transition-colors">
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                  {novelForm.coverImage && (
                    <div className="mt-2">
                      <img
                        src={novelForm.coverImage}
                        alt="Cover preview"
                        className="w-24 h-32 object-cover rounded-md border border-border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Custom Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {novelForm.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground rounded-md text-xs"
                      >
                        {tag}
                        <button
                          onClick={() => {
                            const newTags = [...novelForm.tags];
                            newTags.splice(index, 1);
                            handleFormUpdate('tags', newTags);
                          }}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add tags (press Enter)"
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value && !novelForm.tags.includes(value)) {
                          handleFormUpdate('tags', [...novelForm.tags, value]);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>

                {/* Completion Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isCompleted"
                    checked={novelForm.isCompleted}
                    onChange={(e) => handleFormUpdate('isCompleted', e.target.checked)}
                    className="rounded border-input-border"
                  />
                  <label htmlFor="isCompleted" className="text-sm font-medium text-foreground">
                    Mark as completed
                  </label>
                </div>
              </div>
            </div>

            {/* Publication Settings */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Publication Settings</h3>
              
              <div className="space-y-4">
                {/* Visibility */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Visibility
                  </label>
                  <select
                    value={publicationState.visibility}
                    onChange={(e) => handlePublicationChange('visibility', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="public">
                      🌐 Public - Anyone can find and read
                    </option>
                    <option value="unlisted">
                      🔗 Unlisted - Only with direct link
                    </option>
                    <option value="followers_only">
                      👥 Followers Only - Only your followers
                    </option>
                    <option value="premium_only">
                      👑 Premium Only - Premium readers only
                    </option>
                    <option value="private">
                      🔒 Private - Only you can see
                    </option>
                  </select>
                </div>

                {/* Publication Actions */}
                <div className="space-y-2">
                  {publicationState.status === 'draft' && (
                    <button
                      onClick={publishNovel}
                      disabled={!novelForm.title || !novelForm.synopsis || saveStatus === 'saving'}
                      className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        Publish Novel
                      </div>
                    </button>
                  )}
                  
                  {publicationState.status === 'published' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handlePublicationChange('status', 'unpublished')}
                        className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                      >
                        Unpublish
                      </button>
                      <button
                        onClick={saveNovelUpdates}
                        className="w-full px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
                      >
                        Update Published Version
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={saveNovelUpdates}
                    disabled={saveStatus === 'saving'}
                    className="w-full px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 disabled:opacity-50 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Changes
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Quick Stats</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-accent/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Views</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{novelStats.views.toLocaleString()}</p>
                </div>
                
                <div className="bg-accent/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Likes</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{novelStats.likes.toLocaleString()}</p>
                </div>
                
                <div className="bg-accent/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Bookmarks</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{novelStats.bookmarks.toLocaleString()}</p>
                </div>
                
                <div className="bg-accent/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Followers</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{novelStats.followers.toLocaleString()}</p>
                </div>
                
                <div className="bg-accent/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Rating</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {novelStats.averageRating.toFixed(1)} ({novelStats.totalRatings})
                  </p>
                </div>
                
                <div className="bg-accent/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Completion</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{novelStats.completionRate}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Right Panel - Reader-Accurate Preview */}
      <div className="flex-1 bg-background flex flex-col">
        {/* Preview Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-foreground">Reader Preview</h3>
            
            {previewData && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Episode: {previewData.episode.title || `Episode ${previewData.episode.episodeOrder}`}</span>
                {previewData.firstSceneId && (
                  <>
                    <span>•</span>
                    <span>Starting Scene: {previewData.firstSceneId}</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`px-3 py-2 rounded-lg transition-colors ${
                isPreviewMode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-accent-foreground hover:bg-accent/80'
              }`}
            >
              <div className="flex items-center gap-2">
                {isPreviewMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPreviewMode ? 'Stop Preview' : 'Start Preview'}
              </div>
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 relative">
          {previewData && isPreviewMode ? (
            <div className="w-full h-full">
              {/* ✅ Reader-Accurate Preview using actual VisualNovelFrameReader */}
              <VisualNovelFrameReader
                novel={previewData.novel}
                episode={previewData.episode}
                initialSceneId={previewData.firstSceneId}
                userId="preview-mode" // Special identifier for preview mode
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-accent/5">
              <div className="text-center max-w-md mx-auto p-8">
                {!previewData ? (
                  <>
                    <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <AlertCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h4 className="text-lg font-medium text-foreground mb-2">
                      No Content to Preview
                    </h4>
                    <p className="text-muted-foreground mb-4">
                      Create scenes in the Blueprint Room and connect them to preview your visual novel.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <Eye className="w-8 h-8 text-primary" />
                    </div>
                    <h4 className="text-lg font-medium text-foreground mb-2">
                      Ready to Preview
                    </h4>
                    <p className="text-muted-foreground mb-4">
                      Click "Start Preview" to experience your visual novel exactly as readers will see it.
                    </p>
                    <div className="bg-card border border-border rounded-lg p-4 text-left">
                      <h5 className="font-medium text-foreground mb-2">Preview will include:</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Interactive dialogue system</li>
                        <li>• Character animations and expressions</li>
                        <li>• Background music and sound effects</li>
                        <li>• Choice-based branching narrative</li>
                        <li>• Visual effects and transitions</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewPublishTab;