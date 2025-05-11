// src/components/ThemeToggle.tsx
// คอมโพเนนต์สำหรับสลับ Theme โดยใช้ ThemeContext
"use client";

import { useTheme, Theme as AppTheme } from "@/context/ThemeContext"; // import Theme type
import { motion } from "framer-motion";
import React, { JSX } from "react"; // ไม่จำเป็นต้องใช้ useState, useEffect ที่นี่แล้ว

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme, themes, mounted } = useTheme();

  if (!mounted) {
    // Placeholder เพื่อป้องกัน layout shift และ hydration mismatch
    // ความกว้าง (w) และความสูง (h) ควรใกล้เคียงกับขนาดจริงของ component
    // ค่า h-[38px] และ w-[280px] อาจจะต้องปรับตามขนาดจริงของ component หลังจาก render
    return <div className="flex items-center space-x-1 p-1 w-auto h-[38px] rounded-full bg-secondary/50 animate-pulse" />;
  }

  // `themes` จะถูก populate จาก ThemeContext
  // const themesConfig = themes; // สามารถใช้ themes จาก context ได้โดยตรง

  return (
    <div className="flex items-center space-x-1 p-1 bg-secondary rounded-full shadow-sm">
      {themes.map((t) => {
        // การตัดสินใจว่า active หรือไม่:
        // - ถ้า theme ที่เลือกใน state (theme) ตรงกับ t.name => active
        // - resolvedTheme ใช้สำหรับแสดงผลจริง แต่ปุ่มที่กดควรสะท้อน theme ที่ผู้ใช้เลือก (อาจเป็น 'system')
        const isActive = theme === t.name;

        // สีของ icon และ label จะขึ้นกับว่า active หรือไม่
        const iconAndLabelColor = isActive ? "text-primary" : "text-muted-foreground";

        return (
          <motion.button
            key={t.name}
            onClick={() => setTheme(t.name)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center justify-center transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
              ${
                isActive
                  ? "bg-background text-primary shadow-sm" // Active button style
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60" // Inactive button style
              }
            `}
            aria-pressed={isActive}
            aria-label={`ตั้งค่าธีมเป็น ${t.label}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            layout // เพิ่ม layout prop เพื่อ animation ที่ smooth ขึ้นเมื่อ active state เปลี่ยน
          >
            {React.cloneElement(t.icon, {
              className: `mr-1.5 transition-colors duration-200 ease-in-out ${iconAndLabelColor}`,
            })}
            <span className={`transition-colors duration-200 ease-in-out ${iconAndLabelColor}`}>
              {t.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}