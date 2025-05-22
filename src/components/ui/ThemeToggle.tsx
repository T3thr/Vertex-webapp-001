// src/components/ThemeToggle.tsx
// คอมโพเนนต์สำหรับสลับ Theme โดยใช้ ThemeContext
"use client";

import { useTheme, Theme as AppTheme } from "@/context/ThemeContext";
import { motion } from "framer-motion";
import React, { useEffect, useState, ComponentProps } from "react"; // Import ComponentProps
import { LucideProps } from "lucide-react"; // Import LucideProps สำหรับ type ของ icon

export default function ThemeToggle() {
  const { theme, setTheme, themes, mounted } = useTheme();
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    if (isChanging) {
      const timer = setTimeout(() => {
        setIsChanging(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isChanging]);

  const handleThemeChange = (newTheme: AppTheme) => {
    if (theme === newTheme || isChanging) return;
    setIsChanging(true);
    setTheme(newTheme);
  };

  if (!mounted) {
    return (
      <div
        className="flex items-center space-x-1 p-1 w-auto h-[38px] rounded-full bg-secondary/50 animate-pulse"
        aria-busy="true"
        aria-label="กำลังโหลดตัวเลือกธีม"
      />
    );
  }

  return (
    <div className="flex items-center space-x-1 p-1 bg-secondary rounded-full shadow-sm">
      {themes.map((t) => {
        const isActive = theme === t.name;
        const iconAndLabelColor = isActive ? "text-primary" : "text-muted-foreground";

        // ✅ ดึง props ของ icon ออกมาเพื่อ type casting ที่ชัดเจนขึ้น (เป็นทางเลือก)
        // const IconComponent = t.icon.type as React.FC<LucideProps>;

        return (
          <motion.button
            key={t.name}
            onClick={() => handleThemeChange(t.name)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center justify-center transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
              ${
                isActive
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              }
            `}
            aria-pressed={isActive}
            aria-label={`ตั้งค่าธีมเป็น ${t.label}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            layout
          >
            {/*
              ✅ ใช้ React.cloneElement และส่ง props
              การระบุ type props ของ icon ใน ThemeDefinition (ThemeContext.tsx) ช่วยให้ TypeScript เข้าใจได้ดีขึ้น
              LucideProps สามารถใช้ type icon จาก lucide-react ได้โดยตรง
            */}
            {React.cloneElement(t.icon, {
              // className ถูก type ไว้ใน ThemeDefinition แล้ว
              className: `mr-1.5 transition-colors duration-200 ease-in-out ${iconAndLabelColor}`,
              // size ไม่จำเป็นต้อง override ที่นี่ถ้าตั้งค่ามาจาก ThemeDefinition แล้ว
            } as LucideProps)} {/* Cast เป็น LucideProps หรือ props ที่ icon ของคุณยอมรับ */}

            <span className={`transition-colors duration-200 ease-in-out ${iconAndLabelColor}`}>
              {t.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}