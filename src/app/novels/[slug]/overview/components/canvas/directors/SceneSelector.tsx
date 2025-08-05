"use client";

import React, { useState } from 'react';
import { ChevronDown, Film, Plus } from 'lucide-react';

interface SceneSelectorProps {
  scenes: any[];
  currentSceneId: string | null;
  onSceneSelect: (sceneId: string) => void;
}

const SceneSelector: React.FC<SceneSelectorProps> = ({
  scenes,
  currentSceneId,
  onSceneSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentScene = scenes.find(scene => scene._id === currentSceneId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors min-w-[200px]"
      >
        <Film className="w-4 h-4" />
        <span className="flex-1 text-left text-sm">
          {currentScene ? (
            currentScene.title || `Scene ${currentScene.sceneOrder}`
          ) : (
            'Select Scene'
          )}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
            {scenes.length > 0 ? (
              scenes.map(scene => (
                <button
                  key={scene._id}
                  onClick={() => {
                    onSceneSelect(scene._id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                    scene._id === currentSceneId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded flex items-center justify-center flex-shrink-0">
                    {scene.thumbnailUrl ? (
                      <img
                        src={scene.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <Film className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {scene.title || `Scene ${scene.sceneOrder}`}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Episode {scene.episodeId} • Order {scene.sceneOrder}
                    </div>
                  </div>
                  {scene._id === currentSceneId && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No scenes available</p>
                <p className="text-xs mt-1">Create scenes in the Blueprint Room</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SceneSelector;