// src/app/novels/[slug]/overview/components/unified/mobile/MobileCanvasEditor.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { 
  ZoomInIcon,
  ZoomOutIcon,
  RotateCcwIcon,
  GridIcon,
  LayersIcon,
  MoveIcon
} from 'lucide-react';

interface EditorState {
  zoomLevel: number;
  panOffset: { x: number; y: number };
  isPlayMode: boolean;
  [key: string]: any;
}

interface MobileCanvasEditorProps {
  scene: any;
  characters: any[];
  userMedia: any[];
  officialMedia: any[];
  editorState: EditorState;
  onElementSelect: (elementId: string) => void;
}

export function MobileCanvasEditor({
  scene,
  characters,
  userMedia,
  officialMedia,
  editorState,
  onElementSelect
}: MobileCanvasEditorProps) {

  const [showGrid, setShowGrid] = useState(true);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Handle element selection
  const handleElementSelect = useCallback((elementId: string) => {
    setSelectedElement(elementId);
    onElementSelect(elementId);
  }, [onElementSelect]);

  // Handle pan gesture
  const handlePan = useCallback((event: any, info: PanInfo) => {
    // Update pan offset based on gesture
    // This would update the editorState in the real implementation
  }, []);

  // Render background
  const renderBackground = () => {
    const bg = scene?.background;
    if (!bg) return null;

    if (bg.type === 'color') {
      return (
        <div 
          className="absolute inset-0 rounded-lg"
          style={{ backgroundColor: bg.value }}
        />
      );
    } else if (bg.type === 'image') {
      return (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat rounded-lg"
          style={{ backgroundImage: `url(${bg.value})` }}
        />
      );
    }
    return <div className="absolute inset-0 bg-muted rounded-lg" />;
  };

  // Render characters
  const renderCharacters = () => {
    if (!scene?.characters) return null;

    return scene.characters.map((character: any) => (
      <motion.div
        key={character.instanceId}
        className={`absolute cursor-pointer transition-all duration-200 ${
          selectedElement === character.instanceId ? 'ring-2 ring-primary' : ''
        }`}
        style={{
          left: character.transform?.positionX || 100,
          top: character.transform?.positionY || 100,
          zIndex: character.transform?.zIndex || 1
        }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleElementSelect(character.instanceId)}
      >
        <div className="w-16 h-24 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-xs text-blue-600 font-medium">CHAR</span>
        </div>
        {selectedElement === character.instanceId && (
          <div className="absolute -top-6 left-0 right-0 text-center">
            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
              Character
            </span>
          </div>
        )}
      </motion.div>
    ));
  };

  // Render text contents
  const renderTextContents = () => {
    if (!scene?.textContents) return null;

    return scene.textContents.map((text: any) => (
      <motion.div
        key={text.instanceId}
        className={`absolute cursor-pointer transition-all duration-200 ${
          selectedElement === text.instanceId ? 'ring-2 ring-primary' : ''
        }`}
        style={{
          left: text.transform?.positionX || 50,
          top: text.transform?.positionY || 200,
          zIndex: text.transform?.zIndex || 2
        }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleElementSelect(text.instanceId)}
      >
        <div className="max-w-xs p-3 bg-black/80 text-white rounded-lg">
          <div className="text-xs text-blue-300 mb-1">
            {text.speakerDisplayName || 'Narrator'}
          </div>
          <div className="text-sm line-clamp-3">
            {text.content}
          </div>
        </div>
        {selectedElement === text.instanceId && (
          <div className="absolute -top-6 left-0 right-0 text-center">
            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
              Text
            </span>
          </div>
        )}
      </motion.div>
    ));
  };

  // Render visual elements
  const renderVisualElements = () => {
    if (!scene?.images) return null;

    return scene.images.map((image: any) => (
      <motion.div
        key={image.instanceId}
        className={`absolute cursor-pointer transition-all duration-200 ${
          selectedElement === image.instanceId ? 'ring-2 ring-primary' : ''
        }`}
        style={{
          left: image.transform?.positionX || 200,
          top: image.transform?.positionY || 150,
          zIndex: image.transform?.zIndex || 1
        }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleElementSelect(image.instanceId)}
      >
        <div className="w-20 h-20 bg-purple-500/20 border-2 border-purple-500 rounded-lg flex items-center justify-center">
          <span className="text-xs text-purple-600 font-medium">IMG</span>
        </div>
        {selectedElement === image.instanceId && (
          <div className="absolute -top-6 left-0 right-0 text-center">
            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
              Image
            </span>
          </div>
        )}
      </motion.div>
    ));
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Canvas Controls */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-foreground">
            {scene?.title || 'Untitled Scene'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-md transition-colors ${
              showGrid
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <GridIcon className="w-4 h-4" />
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 bg-muted rounded-md">
            <button className="p-2 text-muted-foreground">
              <ZoomOutIcon className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground px-2">
              {Math.round(editorState.zoomLevel * 100)}%
            </span>
            <button className="p-2 text-muted-foreground">
              <ZoomInIcon className="w-4 h-4" />
            </button>
          </div>

          <button className="p-2 text-muted-foreground">
            <RotateCcwIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden relative">
        <motion.div
          ref={canvasRef}
          className="w-full h-full relative"
          drag
          dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
          onPan={handlePan}
          style={{
            transform: `scale(${editorState.zoomLevel})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Grid Overlay */}
          {showGrid && (
            <div 
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(var(--border), 0.5) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(var(--border), 0.5) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />
          )}

          {/* Canvas Content Container */}
          <div className="relative w-full h-full min-h-[400px]">
            {/* Background */}
            {renderBackground()}

            {/* Scene Elements */}
            {renderCharacters()}
            {renderTextContents()}
            {renderVisualElements()}

            {/* Empty State */}
            {(!scene?.characters?.length && !scene?.textContents?.length && !scene?.images?.length) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <LayersIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Empty Scene</h3>
                  <p className="text-muted-foreground mb-4">
                    Tap the + button to add elements
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Selection Info */}
      {selectedElement && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="p-3 bg-card border-t border-border"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-foreground">
                Selected: {selectedElement}
              </span>
            </div>
            <button
              onClick={() => setSelectedElement(null)}
              className="text-sm text-primary"
            >
              Deselect
            </button>
          </div>
        </motion.div>
      )}

      {/* Touch Hints */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-sm text-white rounded-lg p-3">
          <div className="text-xs text-center">
            <MoveIcon className="w-4 h-4 inline mr-2" />
            Drag to pan • Pinch to zoom • Tap elements to select
          </div>
        </div>
      </div>
    </div>
  );
}