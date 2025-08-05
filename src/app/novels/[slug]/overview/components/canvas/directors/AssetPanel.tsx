"use client";

import React, { useState } from 'react';
import { 
  Users, 
  Image, 
  Music, 
  Type, 
  Square, 
  Play,
  Upload,
  Search,
  Filter,
  Layers,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';

interface AssetPanelProps {
  characters: any[];
  userMedia: any[];
  officialMedia: any[];
  currentScene: any;
  onElementAdd: (element: any) => void;
}

type AssetTab = 'layers' | 'characters' | 'media' | 'ui';
type MediaFilter = 'all' | 'images' | 'audio' | 'video';

const AssetPanel: React.FC<AssetPanelProps> = ({
  characters,
  userMedia,
  officialMedia,
  currentScene,
  onElementAdd
}) => {
  const [activeTab, setActiveTab] = useState<AssetTab>('layers');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter media based on type and search
  const filteredMedia = [...userMedia, ...officialMedia].filter(media => {
    const matchesType = mediaFilter === 'all' || 
      (mediaFilter === 'images' && media.mediaType === 'image') ||
      (mediaFilter === 'audio' && media.mediaType === 'audio') ||
      (mediaFilter === 'video' && media.mediaType === 'video');
    
    const matchesSearch = searchTerm === '' || 
      media.originalFileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      media.metadata?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  const tabs = [
    { id: 'layers' as AssetTab, label: 'Layers', icon: Layers },
    { id: 'characters' as AssetTab, label: 'Characters', icon: Users },
    { id: 'media' as AssetTab, label: 'Media', icon: Image },
    { id: 'ui' as AssetTab, label: 'UI', icon: Square }
  ];

  const renderLayersTab = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Scene Layers</h3>
        <button className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-2">
        {currentScene?.layers?.map((layer: any, index: number) => (
          <div key={layer.layerId} className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-700 rounded">
            <div className="flex items-center space-x-2 flex-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {layer.layerName || `Layer ${index + 1}`}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button className="p-1 text-slate-500 hover:text-slate-700">
                {layer.isVisible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
              <button className="p-1 text-slate-500 hover:text-slate-700">
                {layer.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )) || (
          <p className="text-sm text-slate-500 dark:text-slate-400">No layers defined</p>
        )}
      </div>
    </div>
  );

  const renderCharactersTab = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Characters</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">{characters.length}</span>
      </div>
      
      <div className="space-y-2">
        {characters.map((character) => (
          <div
            key={character._id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'character',
                data: character
              }));
            }}
            className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg cursor-move hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              {character.profileImageUrl ? (
                <img
                  src={character.profileImageUrl}
                  alt={character.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Users className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-slate-900 dark:text-white truncate">
                {character.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {character.roleInStory || 'Character'}
              </div>
            </div>
          </div>
        ))}
        
        {characters.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            No characters available
          </p>
        )}
      </div>
    </div>
  );

  const renderMediaTab = () => (
    <div className="space-y-3">
      {/* Search and Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search media..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex space-x-1">
          {[
            { id: 'all' as MediaFilter, label: 'All' },
            { id: 'images' as MediaFilter, label: 'Images' },
            { id: 'audio' as MediaFilter, label: 'Audio' },
            { id: 'video' as MediaFilter, label: 'Video' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setMediaFilter(filter.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                mediaFilter === filter.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredMedia.map((media) => (
          <div
            key={media._id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'media',
                data: media
              }));
            }}
            className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg cursor-move hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors overflow-hidden group"
          >
            {media.mediaType === 'image' ? (
              <img
                src={media.accessUrl}
                alt={media.originalFileName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-2">
                {media.mediaType === 'audio' ? (
                  <Music className="w-8 h-8 text-slate-500 dark:text-slate-400 mb-1" />
                ) : (
                  <Play className="w-8 h-8 text-slate-500 dark:text-slate-400 mb-1" />
                )}
                <span className="text-xs text-slate-600 dark:text-slate-400 text-center truncate w-full">
                  {media.originalFileName}
                </span>
              </div>
            )}
            
            {/* Overlay with info */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
              <div className="p-2 w-full">
                <div className="text-white text-xs font-medium truncate">
                  {media.metadata?.title || media.originalFileName}
                </div>
                <div className="text-white/70 text-xs">
                  {media.mediaType}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredMedia.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No media found</p>
          <p className="text-xs mt-1">Upload media files to get started</p>
        </div>
      )}
    </div>
  );

  const renderUITab = () => (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">UI Elements</h3>
      
      <div className="space-y-2">
        {[
          { type: 'text', label: 'Text Block', icon: Type, description: 'Add dialogue or narration' },
          { type: 'choice', label: 'Choice Group', icon: Square, description: 'Player decision options' },
          { type: 'ui', label: 'Status UI', icon: Square, description: 'Health bars, counters, etc.' }
        ].map((element) => {
          const IconComponent = element.icon;
          return (
            <div
              key={element.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  type: element.type,
                  data: { elementType: element.type }
                }));
              }}
              className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg cursor-move hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded flex items-center justify-center">
                <IconComponent className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-slate-900 dark:text-white">
                  {element.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {element.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="asset-panel h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          Assets & Elements
        </h2>
        
        {/* Tabs */}
        <div className="flex space-x-1">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'layers' && renderLayersTab()}
        {activeTab === 'characters' && renderCharactersTab()}
        {activeTab === 'media' && renderMediaTab()}
        {activeTab === 'ui' && renderUITab()}
      </div>

      {/* Instructions */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          💡 <strong>Drag & Drop:</strong> Drag items to the canvas to add them to your scene
        </div>
      </div>
    </div>
  );
};

export default AssetPanel;