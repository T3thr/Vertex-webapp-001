// src/components/ThemeToggle.tsx
// คอมโพเนนต์สำหรับสลับ Theme โดยใช้ ThemeContext
"use client";

import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";

export default function ThemeToggl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // เพิ่ม effect เพื่อทำให้ component แสดงผลเฉพาะหลังจาก hydration เสร็จสมบูรณ์
  useEffect(() => {
    setMounted(true);
  }, []);

  // ถ้ายังไม่ mount ไม่ต้องแสดงอะไร (ป้องกัน hydration mismatch)
  if (!mounted) {
    return <div className="w-[216px] h-[38px]" />; // Placeholder เพื่อป้องกัน layout shift
  }

  // รายการ theme ที่สามารถเลือกได้
  const themes = [
    { name: "light", label: "สว่าง", icon: <Sun size={18} /> },
    { name: "dark", label: "มืด", icon: <Moon size={18} /> },
    { name: "system", label: "ตามระบบ", icon: <Laptop size={18} /> },
  ];

  if (!setTheme) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1 p-1 bg-secondary rounded-full shadow-sm">
      {themes.map((t) => (
        <motion.button
          key={t.name}
          onClick={() => setTheme(t.name as "light" | "dark" | "system")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
            ${theme === t.name 
              ? "bg-background text-primary shadow-sm" 
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }
          `}
          aria-pressed={theme === t.name}
          aria-label={`ตั้งค่าธีมเป็น ${t.label}`}
          whileHover={{ scale: theme === t.name ? 1 : 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {React.cloneElement(t.icon, { 
            className: `mr-1.5 ${theme === t.name ? "text-primary" : "text-muted-foreground"}` 
          })}
          {t.label}
        </motion.button>
      ))}
    </div>
  );
};

