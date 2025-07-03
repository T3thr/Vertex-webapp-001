'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, Gauge, Image, Play, Volume2 } from 'lucide-react';

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
          {/* พื้นหลังโปร่งแสง */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* หน้าต่างตั้งค่า */}
          <motion.div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-2xl shadow-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* หัวข้อ */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-card-foreground text-xl font-semibold flex items-center gap-2">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Volume2 size={20} className="text-primary" />
                </div>
                ตั้งค่าการอ่าน
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-card-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* เนื้อหา */}
            <div className="p-6 space-y-6">
              {/* ความเร็วข้อความ */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Gauge size={18} className="text-primary" />
                  </div>
                  <div>
                    <label htmlFor="text-speed-slider" className="text-card-foreground font-medium">ความเร็วข้อความ</label>
                    <p className="text-muted-foreground text-sm">{textSpeedLabels[textSpeed - 1]}</p>
                  </div>
                </div>
                <div className="px-4">
                  <input
                    id="text-speed-slider"
                    type="range"
                    min="1"
                    max="5"
                    value={textSpeed}
                    onChange={(e) => onTextSpeedChange(Number(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer slider"
                    aria-label="ความเร็วข้อความ"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    {textSpeedLabels.map((label, index) => (
                      <span key={index}>{label}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ขนาดตัวอักษร */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Type size={18} className="text-primary" />
                  </div>
                  <div>
                    <label htmlFor="font-size-slider" className="text-card-foreground font-medium">ขนาดตัวอักษร</label>
                    <p className="text-muted-foreground text-sm">{fontSize}px - {fontSizeLabels[Math.floor((fontSize - 14) / 2)]}</p>
                  </div>
                </div>
                <div className="px-4">
                  <input
                    id="font-size-slider"
                    type="range"
                    min="14"
                    max="20"
                    step="2"
                    value={fontSize}
                    onChange={(e) => onFontSizeChange(Number(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer slider"
                    aria-label="ขนาดตัวอักษร"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    {fontSizeLabels.map((label, index) => (
                      <span key={index}>{label}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ความโปร่งใสพื้นหลัง */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Image size={18} className="text-primary" />
                  </div>
                  <div>
                    <label htmlFor="bg-opacity-slider" className="text-card-foreground font-medium">ความโปร่งใสพื้นหลัง</label>
                    <p className="text-muted-foreground text-sm">{Math.round(bgOpacity * 100)}%</p>
                  </div>
                </div>
                <div className="px-4">
                  <input
                    id="bg-opacity-slider"
                    type="range"
                    min="0.3"
                    max="1"
                    step="0.1"
                    value={bgOpacity}
                    onChange={(e) => onBgOpacityChange(Number(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer slider"
                    aria-label="ความโปร่งใสพื้นหลัง"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>30%</span>
                    <span>50%</span>
                    <span>70%</span>
                    <span>90%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* เล่นอัตโนมัติ */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Play size={18} className="text-primary" />
                    </div>
                    <div>
                      <label className="text-card-foreground font-medium">เล่นอัตโนมัติ</label>
                      <p className="text-muted-foreground text-sm">ข้ามไปฉากถัดไปโดยอัตโนมัติ</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => onAutoPlayChange(!autoPlay)}
                    className={`
                      relative w-12 h-6 rounded-full transition-colors
                      ${autoPlay ? 'bg-primary' : 'bg-muted'}
                    `}
                    whileTap={{ scale: 0.95 }}
                    aria-label="เปิด/ปิดการเล่นอัตโนมัติ"
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 bg-background rounded-full"
                      animate={{ x: autoPlay ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>
              </div>

              {/* ตัวอย่างข้อความ */}
              <div className="border border-border rounded-lg p-4 bg-secondary/20">
                <h4 className="text-primary text-sm font-medium mb-2">ตัวอย่าง</h4>
                <div 
                  className="text-card-foreground leading-relaxed"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  &quot;วันนี้เป็นวันแรกที่ฉันมาถึงย่านเก่าของกรุงเทพฯ เพื่อทำวิจัยเรื่องประวัติศาสตร์ท้องถิ่น&quot;
                </div>
                <div className="text-muted-foreground text-sm mt-2 italic">
                  อริษามองดูสถานที่รอบๆ ด้วยความตื่นเต้น
                </div>
              </div>
            </div>

            {/* ส่วนท้าย */}
            <div className="flex justify-between gap-3 p-6 border-t border-border">
              <button
                onClick={resetSettings}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium text-sm"
              >
                รีเซ็ต
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={saveSettings}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  บันทึก
                </button>
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