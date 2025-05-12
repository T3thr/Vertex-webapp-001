// src/components/ThemeToggle.tsx
// คอมโพเนนต์สำหรับสลับ Theme โดยใช้ ThemeContext
"use client";

import { useTheme, Theme as AppTheme } from "@/context/ThemeContext"; 
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme, themes, mounted } = useTheme();
  const [isChanging, setIsChanging] = useState(false);

  // ป้องกันการเกิด FOUC (Flash of Unstyled Content) และ Hydration Mismatch
  useEffect(() => {
    // หากมีการเปลี่ยนธีม ให้แสดง animation และตั้งเวลาให้หาย
    if (isChanging) {
      const timer = setTimeout(() => {
        setIsChanging(false);
      }, 600); // 600ms คือเวลาในการจางหายของ animation
      return () => clearTimeout(timer);
    }
  }, [isChanging]);

  // การจัดการเปลี่ยนธีม
  const handleThemeChange = (newTheme: AppTheme) => {
    setIsChanging(true);
    setTheme(newTheme);
  };

  if (!mounted) {
    // Placeholder เพื่อป้องกัน layout shift และ hydration mismatch
    return <div className="flex items-center space-x-1 p-1 w-auto h-[38px] rounded-full bg-secondary/50 animate-pulse" />;
  }

  return (
    <div className="flex items-center space-x-1 p-1 bg-secondary rounded-full shadow-sm">
      {themes.map((t) => {
        const isActive = theme === t.name;
        const iconAndLabelColor = isActive ? "text-primary" : "text-muted-foreground";

        return (
          <motion.button
            key={t.name}
            onClick={() => handleThemeChange(t.name)}
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
            layout
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