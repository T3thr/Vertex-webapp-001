// src/context/ThemeContext.tsx
// Context สำหรับจัดการ Theme ของแอปพลิเคชัน
"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { useSession } from "next-auth/react";

// ประเภทของ Theme ที่รองรับ
type Theme = "light" | "dark" | "system";

// Interface สำหรับ Props ของ ThemeProvider
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

// Interface สำหรับ State ของ ThemeProvider
interface ThemeProviderState {
  theme: Theme;
  resolvedTheme: "light" | "dark"; // Theme ที่แสดงผลจริง หลังจากพิจารณา system preference
  setTheme: (theme: Theme) => void;
}

// Initial state เริ่มต้น (จะถูก override ใน Provider)
const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light", // Default to light before hydration
  setTheme: () => null,
};

// สร้าง ThemeContext
const ThemeContext = createContext<ThemeProviderState>(initialState);

// Hook สำหรับใช้งาน ThemeContext
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// ThemeProvider Component
export const ThemeProvider = ({
  children,
  defaultTheme = "system",
  storageKey = "novelmaze-theme", // Key สำหรับ localStorage
}: ThemeProviderProps) => {
  // ใช้ useState พร้อม lazy initialization ที่ปลอดภัยกับ SSR
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const { data: session, status } = useSession();
  const [themeInitialized, setThemeInitialized] = useState(false);

  // ดึงค่า theme จาก localStorage เมื่อ component mount (client-side only)
  useEffect(() => {
    // อ่านค่า theme จาก localStorage หลังจาก hydration เสร็จแล้ว
    const storedTheme = getStoredTheme();

    // ถ้าเป็นผู้ใช้ที่ล็อกอินและมี theme ใน preferences จะใช้ค่านั้น
    // มิฉะนั้นจะใช้ค่าจาก localStorage หรือ defaultTheme
    if (status === "authenticated" && session?.user?.preferences?.theme && !themeInitialized) {
      const userTheme = session.user.preferences.theme as Theme;
      setThemeState(userTheme);
      updateResolvedTheme(userTheme);
      setThemeInitialized(true);
    } else if (!themeInitialized && storedTheme) {
      setThemeState(storedTheme);
      updateResolvedTheme(storedTheme);
      setThemeInitialized(true);
    } else if (!themeInitialized) {
      updateResolvedTheme(defaultTheme);
      setThemeInitialized(true);
    }
    
    // ป้องกัน flickering ด้วยการเพิ่ม script ที่ตรวจสอบ theme ก่อน render
    setMounted(true);
  }, [defaultTheme, status, session, themeInitialized]);

  // Function สำหรับดึงค่า theme จาก localStorage อย่างปลอดภัย
  const getStoredTheme = (): Theme | null => {
    if (typeof window === "undefined") return null;
    try {
      const value = localStorage.getItem(storageKey);
      return (value as Theme) || null;
    } catch (e) {
      console.warn("localStorage is not available, using default theme.", e);
      return null;
    }
  };

  // Function สำหรับอัพเดต resolvedTheme จาก theme ปัจจุบัน
  const updateResolvedTheme = (currentTheme: Theme) => {
    if (typeof window === "undefined") return;

    let newResolvedTheme: "light" | "dark";
    if (currentTheme === "system") {
      newResolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      newResolvedTheme = currentTheme as "light" | "dark";
    }
    
    setResolvedTheme(newResolvedTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newResolvedTheme);
  };

  // ติดตามการเปลี่ยนแปลง theme
  useEffect(() => {
    if (!mounted) return;
    
    updateResolvedTheme(theme);
    
    // ติดตามการเปลี่ยนแปลง system theme
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        updateResolvedTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted]);

  // อัปเดตการตั้งค่า theme ลงฐานข้อมูล (เฉพาะผู้ใช้ที่ล็อกอิน)
  const updateUserThemePreference = async (newTheme: Theme) => {
    if (status === "authenticated" && session?.user) {
      try {
        const response = await fetch('/api/user/update-preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            theme: newTheme
          }),
        });
        
        if (!response.ok) {
          console.error('ไม่สามารถอัปเดตธีมในฐานข้อมูลได้:', await response.text());
        }
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการอัปเดตธีม:', error);
      }
    }
  };

  // Function สำหรับเปลี่ยน theme
  const setTheme = (newTheme: Theme) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch (e) {
        console.warn("localStorage is not available, theme will not be persisted.", e);
      }
    }
    setThemeState(newTheme);
    
    // อัปเดตลงฐานข้อมูลถ้าผู้ใช้ล็อกอินแล้ว
    updateUserThemePreference(newTheme);
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        resolvedTheme, 
        setTheme 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};