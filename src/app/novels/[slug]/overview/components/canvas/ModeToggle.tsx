"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Map, Clapperboard } from 'lucide-react';
import { CanvasMode } from '../StoryCanvas';

interface ModeToggleProps {
  currentMode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
      <button
        onClick={() => onModeChange('blueprint')}
        className={`relative flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          currentMode === 'blueprint'
            ? 'text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        {currentMode === 'blueprint' && (
          <motion.div
            layoutId="activeMode"
            className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-md"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <Map className="w-4 h-4 relative z-10" />
        <span className="relative z-10">Blueprint Room</span>
      </button>

      <button
        onClick={() => onModeChange('director')}
        className={`relative flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          currentMode === 'director'
            ? 'text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        {currentMode === 'director' && (
          <motion.div
            layoutId="activeMode"
            className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-md"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <Clapperboard className="w-4 h-4 relative z-10" />
        <span className="relative z-10">Director&apos;s Stage</span>
      </button>
    </div>
  );
};

export default ModeToggle;