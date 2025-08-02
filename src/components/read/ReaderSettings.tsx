'use client';

import { motion } from 'framer-motion';
import { X, Type, Zap, Eye, Play, Volume2, Music, Waves, Mic, Monitor } from 'lucide-react';
import { useEffect } from 'react';
import { IVisualNovelGameplayPreferences, IUserDisplayPreferences } from '@/backend/models/UserSettings';

// Combined settings interface for easier prop management
export interface IReaderSettings {
    display: Partial<IUserDisplayPreferences>;
    gameplay: Partial<IVisualNovelGameplayPreferences>;
}

interface ReaderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: IReaderSettings;
  onSettingsChange: (newSettings: IReaderSettings) => void;
  onSave: () => void;
  onReset: () => void;
}

const SettingRow = ({ icon, title, description, control }: { icon: React.ReactNode, title: string, description?: string, control: React.ReactNode }) => (
    <div className="py-4 border-b border-border/50 last:border-b-0">
        <div className="flex items-center justify-between">
            <label className="text-card-foreground font-medium flex items-center gap-3">
                {icon}
                {title}
            </label>
            <div className="flex-shrink-0">
              {control}
            </div>
        </div>
        {description && <p className="text-muted-foreground text-sm mt-2 ml-9">{description}</p>}
    </div>
);


export default function ReaderSettings({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  onSave,
  onReset
}: ReaderSettingsProps) {
  
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
  
  if (!isOpen) return null;

  const handleGameplayChange = (key: keyof IVisualNovelGameplayPreferences, value: any) => {
    onSettingsChange({
      ...settings,
      gameplay: { ...settings.gameplay, [key]: value },
    });
  };

  const handleDisplayChange = (path: string, value: any) => {
      const [key1, key2] = path.split('.');
      onSettingsChange({
          ...settings,
          display: {
              ...settings.display,
              [key1]: {
                  ...(settings.display as any)[key1],
                  [key2]: value,
              }
          }
      });
  };

  const textSpeed = settings.gameplay?.textSpeedValue ?? 50;
  const fontSize = settings.display?.reading?.fontSize ?? 16;
  const textBoxOpacity = settings.display?.uiVisibility?.textBoxOpacity ?? 80;
  const autoPlayEnabled = settings.gameplay?.autoPlayEnabled ?? false;
  
  const masterVolume = settings.gameplay?.masterVolume ?? 100;
  const bgmVolume = settings.gameplay?.bgmVolume ?? 70;
  const sfxVolume = settings.gameplay?.sfxVolume ?? 80;
  const voiceVolume = settings.gameplay?.voiceVolume ?? 100;

  return (
          <motion.div
        className="fixed inset-0 z-50 flex items-center justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative bg-card h-full w-full max-w-md border-l border-border shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
        >
              {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                <h2 className="text-card-foreground text-xl font-bold">ตั้งค่าการอ่าน</h2>
                <button
                  onClick={onClose}
              className="p-2 rounded-full hover:bg-secondary text-card-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
          <div className="p-4 space-y-2 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            <h3 className="text-sm font-semibold text-primary px-2 pt-2">การแสดงผล</h3>
            <SettingRow
              icon={<Type size={18} className="text-primary/80" />}
              title="ขนาดตัวอักษร"
              control={
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm w-8 text-right">{fontSize}px</span>
                    <input
                      type="range" min="12" max="28" step="1" value={fontSize}
                      onChange={(e) => handleDisplayChange('reading.fontSize', Number(e.target.value))}
                      className="w-32 slider"
                    />
                </div>
              }
            />
             <SettingRow
              icon={<Eye size={18} className="text-primary/80" />}
              title="ความทึบกล่องข้อความ"
              control={
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm w-8 text-right">{textBoxOpacity}%</span>
                    <input
                      type="range" min="20" max="100" step="5" value={textBoxOpacity}
                      onChange={(e) => handleDisplayChange('uiVisibility.textBoxOpacity', Number(e.target.value))}
                      className="w-32 slider"
                    />
                </div>
              }
            />
            
            <h3 className="text-sm font-semibold text-primary px-2 pt-6">การเล่น</h3>
            <SettingRow
              icon={<Zap size={18} className="text-primary/80" />}
              title="ความเร็วข้อความ"
              control={
                <div className="flex items-center gap-2">
                    <input
                      type="range" min="0" max="100" step="1" value={textSpeed}
                      onChange={(e) => handleGameplayChange('textSpeedValue', Number(e.target.value))}
                      className="w-32 slider"
                    />
                </div>
              }
            />
            <SettingRow
              icon={<Play size={18} className="text-primary/80" />}
              title="เล่นอัตโนมัติ"
              description="เมื่อเปิดใช้งาน ข้อความจะเล่นต่อไปโดยอัตโนมัติ"
              control={
                    <button
                    onClick={() => handleGameplayChange('autoPlayEnabled', !autoPlayEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoPlayEnabled ? 'bg-primary' : 'bg-secondary'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoPlayEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
              }
            />
            
            <h3 className="text-sm font-semibold text-primary px-2 pt-6">เสียง</h3>
             <SettingRow
              icon={<Volume2 size={18} className="text-primary/80" />}
              title="เสียงโดยรวม"
              control={
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm w-8 text-right">{masterVolume}%</span>
                    <input
                      type="range" min="0" max="100" value={masterVolume}
                      onChange={(e) => handleGameplayChange('masterVolume', Number(e.target.value))}
                      className="w-32 slider"
                    />
                  </div>
              }
            />
            <SettingRow
              icon={<Music size={18} className="text-primary/80" />}
              title="เพลงประกอบ (BGM)"
              control={
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm w-8 text-right">{bgmVolume}%</span>
                    <input
                      type="range" min="0" max="100" value={bgmVolume}
                      onChange={(e) => handleGameplayChange('bgmVolume', Number(e.target.value))}
                      className="w-32 slider"
                    />
                </div>
              }
            />
             <SettingRow
              icon={<Waves size={18} className="text-primary/80" />}
              title="เอฟเฟกต์ (SFX)"
              control={
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm w-8 text-right">{sfxVolume}%</span>
                    <input
                      type="range" min="0" max="100" value={sfxVolume}
                      onChange={(e) => handleGameplayChange('sfxVolume', Number(e.target.value))}
                      className="w-32 slider"
                    />
                    </div>
              }
            />
             <SettingRow
              icon={<Mic size={18} className="text-primary/80" />}
              title="เสียงพากย์"
              control={
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm w-8 text-right">{voiceVolume}%</span>
                    <input
                      type="range" min="0" max="100" value={voiceVolume}
                      onChange={(e) => handleGameplayChange('voiceVolume', Number(e.target.value))}
                      className="w-32 slider"
                    />
                </div>
              }
            />

              </div>

              {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-border flex-shrink-0">
                  <button
              onClick={onReset}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-semibold"
                  >
                    รีเซ็ต
                  </button>
                  <button
              onClick={onSave}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-colors text-sm font-semibold"
                  >
              บันทึกและปิด
                  </button>
                </div>
        </motion.div>
          </motion.div>
  );
} 