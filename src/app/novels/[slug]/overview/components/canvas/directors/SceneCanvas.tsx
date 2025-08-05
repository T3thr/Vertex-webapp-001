"use client";

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Unlock, Move, RotateCw, Square } from 'lucide-react';
import { SceneElement } from '../DirectorsStage';
import { CanvasState } from '../../StoryCanvas';

interface SceneCanvasProps {
  scene: any;
  selectedElement: SceneElement | null;
  timelinePosition: number;
  isPlaying: boolean;
  onElementSelect: (element: SceneElement | null) => void;
  canvasState: CanvasState;
}

interface CanvasTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const SceneCanvas: React.FC<SceneCanvasProps> = ({
  scene,
  selectedElement,
  timelinePosition,
  isPlaying,
  onElementSelect,
  canvasState
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<CanvasTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Convert scene data to SceneElements
  const sceneElements: SceneElement[] = React.useMemo(() => {
    const elements: SceneElement[] = [];

    // Add characters
    scene.characters?.forEach((char: any) => {
      elements.push({
        id: char.instanceId,
        type: 'character',
        data: char,
        transform: {
          positionX: char.transform?.positionX || 0,
          positionY: char.transform?.positionY || 0,
          scaleX: char.transform?.scaleX || 1,
          scaleY: char.transform?.scaleY || 1,
          rotation: char.transform?.rotation || 0,
          opacity: char.transform?.opacity || 1,
          zIndex: char.transform?.zIndex || 1
        },
        isVisible: char.isVisible !== false,
        isLocked: false
      });
    });

    // Add text contents
    scene.textContents?.forEach((text: any) => {
      elements.push({
        id: text.instanceId,
        type: 'text',
        data: text,
        transform: {
          positionX: text.transform?.positionX || 0,
          positionY: text.transform?.positionY || 0,
          scaleX: text.transform?.scaleX || 1,
          scaleY: text.transform?.scaleY || 1,
          rotation: text.transform?.rotation || 0,
          opacity: text.transform?.opacity || 1,
          zIndex: text.transform?.zIndex || 10
        },
        isVisible: true,
        isLocked: false
      });
    });

    // Add images
    scene.images?.forEach((image: any) => {
      elements.push({
        id: image.instanceId,
        type: 'image',
        data: image,
        transform: {
          positionX: image.transform?.positionX || 0,
          positionY: image.transform?.positionY || 0,
          scaleX: image.transform?.scaleX || 1,
          scaleY: image.transform?.scaleY || 1,
          rotation: image.transform?.rotation || 0,
          opacity: image.transform?.opacity || 1,
          zIndex: image.transform?.zIndex || 5
        },
        isVisible: image.isVisible !== false,
        isLocked: false
      });
    });

    // Sort by zIndex
    return elements.sort((a, b) => (a.transform?.zIndex || 0) - (b.transform?.zIndex || 0));
  }, [scene]);

  // Handle canvas pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.offsetX, y: e.clientY - transform.offsetY });
      onElementSelect(null);
    }
  }, [transform, onElementSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        offsetX: e.clientX - dragStart.x,
        offsetY: e.clientY - dragStart.y
      }));
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(3, prev.scale * delta))
    }));
  }, []);

  // Element click handler
  const handleElementClick = useCallback((element: SceneElement, e: React.MouseEvent) => {
    e.stopPropagation();
    onElementSelect(element);
  }, [onElementSelect]);

  // Render background
  const renderBackground = () => {
    const bg = scene.background;
    if (!bg) return null;

    if (bg.type === 'color') {
      return (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: bg.value }}
        />
      );
    }

    if (bg.type === 'image') {
      return (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${bg.value})`,
            backgroundSize: bg.fitMode || 'cover'
          }}
        />
      );
    }

    return null;
  };

  // Render element
  const renderElement = (element: SceneElement) => {
    if (!element.isVisible) return null;

    const transform = element.transform;
    const isSelected = selectedElement?.id === element.id;

    const elementStyle = {
      position: 'absolute' as const,
      left: `${(transform?.positionX || 0) + 400}px`, // Center offset
      top: `${(transform?.positionY || 0) + 300}px`,
      transform: `scale(${transform?.scaleX || 1}, ${transform?.scaleY || 1}) rotate(${transform?.rotation || 0}deg)`,
      opacity: transform?.opacity || 1,
      zIndex: transform?.zIndex || 1,
      cursor: element.isLocked ? 'not-allowed' : 'pointer'
    };

    let content;

    switch (element.type) {
      case 'character':
        const char = element.data;
        content = (
          <div className="character-element w-32 h-48 bg-gradient-to-b from-blue-200 to-blue-400 rounded-lg flex items-end justify-center p-2">
            <span className="text-xs text-blue-800 font-medium">
              {char.characterId || 'Character'}
            </span>
          </div>
        );
        break;

      case 'text':
        const text = element.data;
        content = (
          <div className="text-element bg-black/70 text-white p-4 rounded-lg max-w-md">
            <div className="text-sm font-medium mb-1">
              {text.speakerDisplayName || 'Narrator'}
            </div>
            <div className="text-sm">
              {text.content || 'Text content...'}
            </div>
          </div>
        );
        break;

      case 'image':
        const img = element.data;
        content = (
          <div className="image-element w-32 h-32 bg-slate-300 dark:bg-slate-600 rounded-lg flex items-center justify-center">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Image
            </span>
          </div>
        );
        break;

      default:
        content = (
          <div className="element w-16 h-16 bg-gray-300 rounded flex items-center justify-center">
            <span className="text-xs">?</span>
          </div>
        );
    }

    return (
      <motion.div
        key={element.id}
        style={elementStyle}
        onClick={(e) => handleElementClick(element, e)}
        className={`scene-element ${isSelected ? 'selected' : ''}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {content}
        
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute inset-0 border-2 border-blue-500 rounded pointer-events-none">
            {/* Resize handles */}
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="scene-canvas flex-1 relative overflow-hidden bg-slate-200 dark:bg-slate-700">
      {/* Canvas Container */}
      <div
        ref={canvasRef}
        className="w-full h-full relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{
          transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`
        }}
      >
        {/* Scene Viewport */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="scene-viewport relative w-[800px] h-[600px] bg-white dark:bg-slate-800 shadow-2xl rounded-lg overflow-hidden">
            {/* Background */}
            {renderBackground()}

            {/* Grid overlay (when enabled) */}
            {canvasState.showGrid && (
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #94a3b8 1px, transparent 1px),
                    linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}
              />
            )}

            {/* Scene Elements */}
            {sceneElements.map(renderElement)}

            {/* Playhead indicator (when playing) */}
            {isPlaying && (
              <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                ▶ Playing
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-2 flex flex-col space-y-2">
        <button
          onClick={() => setTransform({ scale: 1, offsetX: 0, offsetY: 0 })}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          title="Reset View"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {Math.round(transform.scale * 100)}%
        </div>
      </div>

      {/* Element Count */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg px-3 py-2">
        <div className="text-xs text-slate-600 dark:text-slate-400">
          {sceneElements.length} elements
        </div>
      </div>

      {/* Timeline Position Indicator */}
      {timelinePosition > 0 && (
        <div className="absolute bottom-4 right-4 bg-blue-600 text-white rounded-lg px-3 py-2">
          <div className="text-xs font-medium">
            {Math.round(timelinePosition / 1000)}s
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneCanvas;