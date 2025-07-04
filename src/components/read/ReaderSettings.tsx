'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, Gauge, Image, Play, Volume2, Zap, Eye, Monitor } from 'lucide-react';

interface ReaderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  textSpeed: number;
  onTextSpeedChange: (speed: number) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  bgOpacity: number;
  onBgOpacityChange: (opacity: number) => void;
  autoPlay: boolean;
  onAutoPlayChange: (autoPlay: boolean) => void;
}

export default function ReaderSettings({
  isOpen,
  onClose,
  textSpeed,
  onTextSpeedChange,
  fontSize,
  onFontSizeChange,
  bgOpacity,
  onBgOpacityChange,
  autoPlay,
  onAutoPlayChange
}: ReaderSettingsProps) {
  const textSpeedLabels = ['ช้า', 'ปกติ', 'เร็ว', 'เร็วมาก', 'ทันที'];
  const fontSizeLabels = ['เล็ก', 'ปกติ', 'ใหญ่', 'ใหญ่มาก'];

  // ฟังก์ชันบันทึกการตั้งค่าลง MongoDB
  const saveSettings = async () => {
    try {
      const settings = {
        textSpeed,
        fontSize,
        bgOpacity,
        autoPlay
      };
      
      // เรียก API เพื่อบันทึกการตั้งค่า
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          readerSettings: settings
        })
      });
      
      if (response.ok) {
        // บันทึกใน localStorage เป็น backup
        localStorage.setItem('readerSettings', JSON.stringify(settings));
        onClose();
      } else {
        const errorData = await response.json();
        console.error('Failed to save settings:', errorData);
        
        // หากบันทึกใน database ไม่สำเร็จ ให้บันทึกใน localStorage
        localStorage.setItem('readerSettings', JSON.stringify(settings));
        onClose();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      
      // หากเกิดข้อผิดพลาด ให้บันทึกใน localStorage เป็นอย่างน้อย
      const settings = {
        textSpeed,
        fontSize,
        bgOpacity,
        autoPlay
      };
      localStorage.setItem('readerSettings', JSON.stringify(settings));
      onClose();
    }
  };

  // ฟังก์ชันรีเซ็ตการตั้งค่า
  const resetSettings = () => {
    onTextSpeedChange(2);
    onFontSizeChange(16);
    onBgOpacityChange(0.8);
    onAutoPlayChange(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="bg-card rounded-2xl border border-border w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-card-foreground text-xl font-bold">ตั้งค่าการอ่าน</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-card-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Text Speed */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-card-foreground font-medium flex items-center gap-2">
                      <Zap size={18} className="text-primary" />
                      ความเร็วข้อความ
                    </label>
                    <span className="text-muted-foreground text-sm">
                      {textSpeed === 1 ? 'ช้า' : textSpeed === 5 ? 'เร็ว' : 'ปานกลาง'}
                    </span>
                  </div>
                  <div className="px-3">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={textSpeed}
                      onChange={(e) => onTextSpeedChange(Number(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>ช้า</span>
                      <span>เร็ว</span>
                    </div>
                  </div>
                </div>

                {/* Font Size */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-card-foreground font-medium flex items-center gap-2">
                      <Type size={18} className="text-primary" />
                      ขนาดตัวอักษร
                    </label>
                    <span className="text-muted-foreground text-sm">{fontSize}px</span>
                  </div>
                  <div className="px-3">
                    <input
                      type="range"
                      min="12"
                      max="24"
                      value={fontSize}
                      onChange={(e) => onFontSizeChange(Number(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>เล็ก</span>
                      <span>ใหญ่</span>
                    </div>
                  </div>
                </div>

                {/* Background Opacity */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-card-foreground font-medium flex items-center gap-2">
                      <Eye size={18} className="text-primary" />
                      ความโปร่งใสพื้นหลัง
                    </label>
                    <span className="text-muted-foreground text-sm">{Math.round(bgOpacity * 100)}%</span>
                  </div>
                  <div className="px-3">
                    <input
                      type="range"
                      min="0.3"
                      max="1"
                      step="0.1"
                      value={bgOpacity}
                      onChange={(e) => onBgOpacityChange(Number(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>โปร่งใส</span>
                      <span>ทึบ</span>
                    </div>
                  </div>
                </div>

                {/* Auto Play */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-card-foreground font-medium flex items-center gap-2">
                      <Play size={18} className="text-primary" />
                      เล่นอัตโนมัติ
                    </label>
                    <button
                      onClick={() => onAutoPlayChange(!autoPlay)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoPlay ? 'bg-primary' : 'bg-secondary'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoPlay ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    เมื่อเปิดใช้งาน ข้อความจะเล่นต่อไปโดยอัตโนมัติ
                  </p>
                </div>

                {/* Preview */}
                <div className="space-y-3">
                  <label className="text-card-foreground font-medium flex items-center gap-2">
                    <Monitor size={18} className="text-primary" />
                    ตัวอย่าง
                  </label>
                  <div 
                    className="bg-black/90 rounded-lg p-4 border border-white/20"
                    style={{ opacity: bgOpacity }}
                  >
                    <div className="text-white font-semibold mb-2 flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                      ตัวอย่างตัวละคร
                    </div>
                    <div 
                      className="text-white leading-relaxed"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      นี่คือตัวอย่างข้อความในเกม ที่จะแสดงผลตามการตั้งค่าของคุณ
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border bg-secondary/30">
                <div className="flex gap-3">
                  <button
                    onClick={resetSettings}
                    className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-card-foreground rounded-lg transition-colors font-medium"
                  >
                    รีเซ็ต
                  </button>
                  <button
                    onClick={saveSettings}
                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium"
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* CSS สำหรับ slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: hsl(var(--primary));
          cursor: pointer;
          border: 2px solid hsl(var(--background));
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: hsl(var(--primary));
          cursor: pointer;
          border: 2px solid hsl(var(--background));
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </AnimatePresence>
  );
} 