'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Heart, Zap, Skull } from 'lucide-react';
import { useEffect } from 'react';
import type { ICharacterInScene, IStatusEffect } from '@/backend/models/Scene';
import type { SerializedScene } from './VisualNovelFrameReader';

// This should match the character type populated in VisualNovelContent
type PopulatedCharacter = Omit<ICharacterInScene, 'characterId'> & {
    characterId: any; // In a real app, this would be a populated ICharacter object
    characterData?: {
        name: string;
        avatarUrl?: string;
    }
};

interface StoryStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  scene: SerializedScene | null;
}

const getEffectIcon = (effectType: string) => {
    switch (effectType) {
        case 'buff': return <Shield size={16} className="text-green-400" />;
        case 'debuff': return <Zap size={16} className="text-red-400" />;
        case 'damage_over_time': return <Skull size={16} className="text-purple-400" />;
        case 'heal_over_time': return <Heart size={16} className="text-pink-400" />;
        default: return <Shield size={16} className="text-gray-400" />;
    }
}

export default function StoryStatusPanel({ isOpen, onClose, scene }: StoryStatusPanelProps) {
  const charactersInScene = scene?.characters.filter(c => c.isVisible && c.currentStatusEffects && c.currentStatusEffects.length > 0) || [];

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-card border-l border-border flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <h2 className="text-card-foreground text-lg font-semibold">สถานะเรื่องราว</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-card-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
              {charactersInScene.length > 0 ? (
                charactersInScene.map(char => (
                  <div key={char.instanceId}>
                    <h3 className="text-md font-semibold text-primary mb-2">
                      {char.characterData?.name || `Character ${char.instanceId}`}
                    </h3>
                    <div className="space-y-2">
                      {char.currentStatusEffects?.map((effect: IStatusEffect) => (
                        <div key={effect.effectName} className="bg-secondary/50 p-3 rounded-lg border border-border/50">
                          <div className="flex items-center gap-3">
                            {getEffectIcon(effect.type)}
                            <div className="flex-1">
                              <p className="font-medium text-card-foreground">{effect.effectName}</p>
                              {effect.description && <p className="text-xs text-muted-foreground">{effect.description}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <Shield size={40} className="mb-4" />
                    <h3 className="font-semibold text-card-foreground">ไม่มีสถานะพิเศษ</h3>
                    <p className="text-sm">ตัวละครในฉากนี้ไม่มีสถานะพิเศษใดๆ ในตอนนี้</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 