"use client";

import React, { useState } from 'react';
import { Settings, Sliders, Palette, Type, Move, RotateCw, Eye } from 'lucide-react';
import { SceneElement } from '../DirectorsStage';

interface PropertiesPanelProps {
  scene: any;
  selectedElement: SceneElement | null;
  characters: any[];
  onElementUpdate: (elementId: string, updates: any) => void;
  onSceneUpdate: (updates: any) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  scene,
  selectedElement,
  characters,
  onElementUpdate,
  onSceneUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'transform' | 'style'>('properties');

  const renderElementProperties = () => {
    if (!selectedElement) return null;

    switch (selectedElement.type) {
      case 'character':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Character
              </label>
              <select
                value={selectedElement.data.characterId || ''}
                onChange={(e) => onElementUpdate(selectedElement.id, { characterId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select character...</option>
                {characters.map(char => (
                  <option key={char._id} value={char._id}>
                    {char.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Expression
              </label>
              <select
                value={selectedElement.data.expressionId || ''}
                onChange={(e) => onElementUpdate(selectedElement.id, { expressionId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Default expression</option>
                {/* Add character expressions here */}
              </select>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Speaker
              </label>
              <input
                type="text"
                value={selectedElement.data.speakerDisplayName || ''}
                onChange={(e) => onElementUpdate(selectedElement.id, { speakerDisplayName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Speaker name..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Content
              </label>
              <textarea
                value={selectedElement.data.content || ''}
                onChange={(e) => onElementUpdate(selectedElement.id, { content: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                placeholder="Enter dialogue or narration..."
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Properties for {selectedElement.type} elements coming soon...
          </div>
        );
    }
  };

  const renderTransformProperties = () => {
    if (!selectedElement?.transform) return null;

    const transform = selectedElement.transform;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">X Position</label>
            <input
              type="number"
              value={Math.round(transform.positionX)}
              onChange={(e) => onElementUpdate(selectedElement.id, {
                transform: { ...transform, positionX: parseInt(e.target.value) || 0 }
              })}
              className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Y Position</label>
            <input
              type="number"
              value={Math.round(transform.positionY)}
              onChange={(e) => onElementUpdate(selectedElement.id, {
                transform: { ...transform, positionY: parseInt(e.target.value) || 0 }
              })}
              className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Scale X</label>
            <input
              type="number"
              step="0.1"
              value={transform.scaleX}
              onChange={(e) => onElementUpdate(selectedElement.id, {
                transform: { ...transform, scaleX: parseFloat(e.target.value) || 1 }
              })}
              className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Scale Y</label>
            <input
              type="number"
              step="0.1"
              value={transform.scaleY}
              onChange={(e) => onElementUpdate(selectedElement.id, {
                transform: { ...transform, scaleY: parseFloat(e.target.value) || 1 }
              })}
              className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Rotation</label>
            <input
              type="number"
              value={Math.round(transform.rotation)}
              onChange={(e) => onElementUpdate(selectedElement.id, {
                transform: { ...transform, rotation: parseInt(e.target.value) || 0 }
              })}
              className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Opacity</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={transform.opacity}
              onChange={(e) => onElementUpdate(selectedElement.id, {
                transform: { ...transform, opacity: parseFloat(e.target.value) || 1 }
              })}
              className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Z-Index</label>
          <input
            type="number"
            value={transform.zIndex}
            onChange={(e) => onElementUpdate(selectedElement.id, {
              transform: { ...transform, zIndex: parseInt(e.target.value) || 1 }
            })}
            className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
      </div>
    );
  };

  const renderSceneProperties = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Scene Title
        </label>
        <input
          type="text"
          value={scene?.title || ''}
          onChange={(e) => onSceneUpdate({ title: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Scene title..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Background Type
        </label>
        <select
          value={scene?.background?.type || 'color'}
          onChange={(e) => onSceneUpdate({
            background: { ...scene?.background, type: e.target.value }
          })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="color">Solid Color</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
      </div>

      {scene?.background?.type === 'color' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Background Color
          </label>
          <input
            type="color"
            value={scene?.background?.value || '#ffffff'}
            onChange={(e) => onSceneUpdate({
              background: { ...scene?.background, value: e.target.value }
            })}
            className="w-full h-10 border border-slate-300 dark:border-slate-600 rounded-md"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Transition Out
        </label>
        <select
          value={scene?.sceneTransitionOut?.type || 'none'}
          onChange={(e) => onSceneUpdate({
            sceneTransitionOut: { ...scene?.sceneTransitionOut, type: e.target.value }
          })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">None</option>
          <option value="fade">Fade</option>
          <option value="slide_left">Slide Left</option>
          <option value="slide_right">Slide Right</option>
          <option value="dissolve">Dissolve</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="properties-panel h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2 mb-3">
          <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Properties
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm transition-colors ${
              activeTab === 'properties'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Properties</span>
          </button>
          <button
            onClick={() => setActiveTab('transform')}
            className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm transition-colors ${
              activeTab === 'transform'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Move className="w-4 h-4" />
            <span>Transform</span>
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm transition-colors ${
              activeTab === 'style'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Style</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedElement ? (
          <>
            {/* Element Info */}
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                  {selectedElement.type} Element
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onElementUpdate(selectedElement.id, { isVisible: !selectedElement.isVisible })}
                    className={`p-1 rounded ${
                      selectedElement.isVisible
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                ID: {selectedElement.id}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'properties' && renderElementProperties()}
            {activeTab === 'transform' && renderTransformProperties()}
            {activeTab === 'style' && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Style options coming soon...
              </div>
            )}
          </>
        ) : (
          <>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
              Scene Properties
            </h3>
            {renderSceneProperties()}
          </>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;