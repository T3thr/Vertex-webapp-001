// src/app/novels/[slug]/overview/components/unified/mobile/MobileBottomSheet.tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  XIcon,
  LayersIcon,
  ImageIcon,
  SettingsIcon,
  ClockIcon,
  GripHorizontalIcon
} from 'lucide-react';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  content: 'canvas' | 'layers' | 'assets' | 'properties' | 'timeline' | null;
  scene: any;
  userMedia: any[];
  officialMedia: any[];
  height: number;
  onHeightChange: (height: number) => void;
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  content,
  scene,
  userMedia,
  officialMedia,
  height,
  onHeightChange
}: MobileBottomSheetProps) {

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragConstraints = { top: 0, bottom: 0 };

  // Handle pan gesture for resizing
  const handlePan = (event: any, info: PanInfo) => {
    const newHeight = Math.max(200, Math.min(600, height - info.delta.y));
    onHeightChange(newHeight);
  };

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Content renderer
  const renderContent = () => {
    switch (content) {
      case 'layers':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <LayersIcon className="w-5 h-5 mr-2" />
              Layers
            </h3>
            
            <div className="space-y-3">
              {/* Background Layer */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded mr-3" />
                    <span className="text-sm font-medium text-foreground">Background</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 text-muted-foreground">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    </button>
                    <span className="text-xs text-muted-foreground">100%</span>
                  </div>
                </div>
              </div>

              {/* Characters Layer */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-3" />
                    <span className="text-sm font-medium text-foreground">Characters</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 text-muted-foreground">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    </button>
                    <span className="text-xs text-muted-foreground">100%</span>
                  </div>
                </div>
                <div className="mt-2 ml-7 text-xs text-muted-foreground">
                  {scene?.characters?.length || 0} characters
                </div>
              </div>

              {/* UI Layer */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-500 rounded mr-3" />
                    <span className="text-sm font-medium text-foreground">UI Elements</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 text-muted-foreground">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    </button>
                    <span className="text-xs text-muted-foreground">100%</span>
                  </div>
                </div>
                <div className="mt-2 ml-7 text-xs text-muted-foreground">
                  {(scene?.textContents?.length || 0) + (scene?.images?.length || 0)} elements
                </div>
              </div>
            </div>
          </div>
        );

      case 'assets':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <ImageIcon className="w-5 h-5 mr-2" />
              Asset Library
            </h3>
            
            <div className="space-y-4">
              {/* User Media */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Your Media</h4>
                <div className="grid grid-cols-3 gap-2">
                  {userMedia.slice(0, 6).map((media, index) => (
                    <div key={index} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                {userMedia.length > 6 && (
                  <button className="text-sm text-primary mt-2">
                    View all {userMedia.length} items
                  </button>
                )}
              </div>

              {/* Official Media */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Official Assets</h4>
                <div className="grid grid-cols-3 gap-2">
                  {officialMedia.slice(0, 6).map((media, index) => (
                    <div key={index} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                {officialMedia.length > 6 && (
                  <button className="text-sm text-primary mt-2">
                    View all {officialMedia.length} items
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case 'properties':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <SettingsIcon className="w-5 h-5 mr-2" />
              Properties
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Position X</label>
                <input
                  type="number"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground">Position Y</label>
                <input
                  type="number"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground">Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="100"
                  className="w-full mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground">Z-Index</label>
                <input
                  type="number"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  placeholder="1"
                />
              </div>
            </div>
          </div>
        );

      case 'timeline':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <ClockIcon className="w-5 h-5 mr-2" />
              Timeline
            </h3>
            
            <div className="space-y-3">
              {/* Timeline Track */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-sm font-medium text-foreground mb-2">Main Track</div>
                <div className="h-8 bg-muted rounded overflow-hidden relative">
                  {/* Timeline Events */}
                  <div className="absolute left-2 top-1 bottom-1 w-4 bg-blue-500 rounded-sm" />
                  <div className="absolute left-8 top-1 bottom-1 w-6 bg-green-500 rounded-sm" />
                  <div className="absolute left-16 top-1 bottom-1 w-3 bg-red-500 rounded-sm" />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button className="p-2 bg-primary text-primary-foreground rounded">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                  <span className="text-sm text-muted-foreground">0:00 / 0:30</span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  1x Speed
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 text-center">
            <p className="text-muted-foreground">Select a tool to get started</p>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: height }}
            animate={{ y: 0 }}
            exit={{ y: height }}
            drag="y"
            dragConstraints={dragConstraints}
            onPan={handlePan}
            className="fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-xl z-50 safe-bottom"
            style={{ height: `${height}px` }}
          >
            {/* Drag Handle */}
            <div className="flex items-center justify-center py-3 border-b border-border">
              <motion.div
                className="w-12 h-1 bg-muted-foreground/50 rounded-full cursor-grab active:cursor-grabbing"
                whileTap={{ scale: 1.1 }}
              >
                <GripHorizontalIcon className="w-4 h-4 mx-auto opacity-0" />
              </motion.div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {content === 'layers' && 'Layers'}
                {content === 'assets' && 'Assets'}
                {content === 'properties' && 'Properties'}
                {content === 'timeline' && 'Timeline'}
              </h2>
              
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}