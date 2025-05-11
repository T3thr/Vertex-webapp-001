// src/context/ThemeContext.tsx
// Context สำหรับจัดการ Theme ของแอปพลิเคชัน
"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
  JSX
} from "react";
import { useSession } from "next-auth/react";
import { debounce } from "lodash";
import { Sun, Moon, Laptop, BookOpen } from "lucide-react"; // Import icons

// ประเภทของ Theme ที่รองรับ
export type Theme = "light" | "dark" | "system" | "sepia";
export type ResolvedTheme = "light" | "dark" | "sepia"; // Resolved theme ไม่ควรมี system

// Interface สำหรับ Props ของ ThemeProvider
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

// Interface สำหรับ State ของ ThemeProvider
interface ThemeProviderState {
  theme: Theme; // ธีมที่ผู้ใช้เลือก (อาจเป็น 'system')
  resolvedTheme: ResolvedTheme; // ธีมที่แสดงผลจริง (light, dark, sepia)
  setTheme: (theme: Theme) => void;
  themes: Array<{ name: Theme; label: string; icon: JSX.Element }>;
  mounted: boolean; // เพิ่ม mounted state เพื่อให้ component อื่นๆ รู้ว่า context พร้อมใช้งาน
}

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light", // ค่าเริ่มต้นสำหรับ SSR (จะถูกอัปเดตใน client)
  setTheme: () => null,
  themes: [],
  mounted: false,
};

const ThemeContext = createContext<ThemeProviderState>(initialState);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({
  children,
  defaultTheme = "system",
  storageKey = "novelmaze-theme", // ชื่อ key ใน localStorage
}: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>(initialState.theme);
  const [resolvedTheme, setResolvedThemeState] = useState<ResolvedTheme>(
    initialState.resolvedTheme
  );
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();

  // --- Helper Functions ---
  const applyThemeToDOM = useCallback((newResolvedTheme: ResolvedTheme) => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      root.classList.remove("light", "dark", "sepia");
      root.classList.add(newResolvedTheme);
      // สำหรับ Tailwind 4.0 การเปลี่ยน class ที่ <html> จะ trigger การใช้ CSS variables ที่ถูกต้อง
    }
  }, []);

  const calculateResolvedTheme = useCallback(
    (currentThemeValue: Theme): ResolvedTheme => {
      if (currentThemeValue === "system") {
        if (typeof window !== "undefined") {
          return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
        }
        return "light"; // Fallback for server-side or no window.matchMedia
      }
      return currentThemeValue as ResolvedTheme; // light, dark, or sepia
    },
    []
  );

  // Debounced function สำหรับอัปเดต theme preference ใน DB
  const updateUserThemePreferenceInDB = useCallback(
    debounce(async (newThemeToSave: Theme) => {
      if (status !== "authenticated" || !session?.user?.id) {
        // console.log("[ThemeContext] User not authenticated or session not ready, skipping DB update for theme.");
        return;
      }
      console.log(
        `[ThemeContext] Attempting to update theme to "${newThemeToSave}" in DB for user ${session.user.id}`
      );
      try {
        const response = await fetch("/api/user/update-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: newThemeToSave }),
        });
        const result = await response.json();
        if (response.ok && result.success) {
          console.log(
            `[ThemeContext] Successfully updated theme to "${newThemeToSave}" in DB.`
          );
        } else {
          console.error(
            "[ThemeContext] Failed to update theme preference in DB:",
            result.error || `Server error: ${response.status}`
          );
        }
      } catch (error: any) {
        console.error(
          "[ThemeContext] Error updating theme preference in DB:",
          error.message
        );
      }
    }, 800), // 800ms debounce
    [status, session?.user?.id] // Dependencies
  );

  // --- Main setTheme Function ---
  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme); // อัปเดต React state

      // 1. คำนวณ resolved theme ใหม่
      const newResolved = calculateResolvedTheme(newTheme);
      setResolvedThemeState(newResolved); // อัปเดต resolved theme state

      // 2. 적용 theme ไปที่ DOM
      applyThemeToDOM(newResolved);

      // 3. บันทึก theme ลง localStorage (สำหรับผู้ใช้ที่ไม่ได้ login หรือเป็นค่าเริ่มต้น)
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(storageKey, newTheme);
          // console.log(`[ThemeContext] Theme "${newTheme}" saved to localStorage.`);
        } catch (e) {
          console.warn(
            `[ThemeContext] Could not save theme to localStorage (${storageKey}):`, e
          );
        }
      }

      // 4. อัปเดต theme ใน DB ถ้าผู้ใช้ sign-in
      if (status === "authenticated" && session?.user?.id) {
        updateUserThemePreferenceInDB(newTheme);
      }
    },
    [
      storageKey,
      status,
      session?.user?.id,
      calculateResolvedTheme,
      applyThemeToDOM,
      updateUserThemePreferenceInDB,
    ]
  );

  // --- Effects ---

  // Effect 1: Initial theme loading (Client-side only)
  useEffect(() => {
    setMounted(true);
    let initialUserTheme: Theme = defaultTheme; // เริ่มต้นด้วย defaultTheme

    // ก. ดึงค่าจาก localStorage ก่อน (สำคัญสำหรับ persist theme ของ guest)
    try {
      const storedTheme = localStorage.getItem(storageKey) as Theme | null;
      if (storedTheme) {
        initialUserTheme = storedTheme;
      }
    } catch (e) {
      console.warn("[ThemeContext] Failed to read from localStorage:", e);
    }

    // ข. ถ้าผู้ใช้ authenticated ให้ดึงค่าจาก session (ซึ่งควรจะมีค่าจาก DB)
    //    ค่าจาก session จะ override ค่าจาก localStorage หากมี
    if (status === "authenticated" && session?.user?.preferences?.theme) {
        const dbTheme = session.user.preferences.theme as Theme;
        if (["light", "dark", "system", "sepia"].includes(dbTheme)) {
            initialUserTheme = dbTheme;
            // console.log(`[ThemeContext] Initial theme from DB session: "${dbTheme}"`);
        }
    }

    setThemeState(initialUserTheme);
    const initialResolved = calculateResolvedTheme(initialUserTheme);
    setResolvedThemeState(initialResolved);
    applyThemeToDOM(initialResolved);

    // console.log(`[ThemeContext] Initial theme set to: "${initialUserTheme}", Resolved: "${initialResolved}"`);
  }, [ status, session?.user?.preferences?.theme, storageKey, defaultTheme, applyThemeToDOM, calculateResolvedTheme]);
  // ไม่ใส่ `theme` ใน dependency array นี้เพื่อป้องกัน loop ในการโหลดครั้งแรก


  // Effect 2: Listen to system theme changes (if theme is 'system')
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // console.log("[ThemeContext] System color scheme changed.");
      const newResolved = calculateResolvedTheme("system"); // Recalculate based on "system"
      setResolvedThemeState(newResolved);
      applyThemeToDOM(newResolved);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyThemeToDOM, calculateResolvedTheme]); // `theme` เป็น dependency ที่สำคัญที่นี่

  const availableThemes = useMemo(
    () => [
      { name: "light" as Theme, label: "สว่าง", icon: <Sun size={16} /> },
      { name: "dark" as Theme, label: "มืด", icon: <Moon size={16} /> },
      { name: "sepia" as Theme, label: "ซีเปีย", icon: <BookOpen size={16} /> },
      { name: "system" as Theme, label: "ตามระบบ", icon: <Laptop size={16} /> },
    ],
    []
  );

  const providerValue = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
    themes: availableThemes,
    mounted,
  }), [theme, resolvedTheme, setTheme, availableThemes, mounted]);

  return (
    <ThemeContext.Provider value={providerValue}>
      {children}
    </ThemeContext.Provider>
  );
};