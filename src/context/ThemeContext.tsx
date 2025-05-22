"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import { Sun, Moon, Laptop, BookOpenText } from "lucide-react";

export type Theme = "light" | "dark" | "system" | "sepia";
export type ResolvedTheme = "light" | "dark" | "sepia";

export interface ThemeDefinition {
  name: Theme;
  label: string;
  icon: React.ReactElement;
}

interface ThemeContextProps {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  themes: ThemeDefinition[];
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  storageKey?: string;
  defaultTheme?: Theme;
}

const DEFAULT_STORAGE_KEY = "novelmaze-theme";
const DEFAULT_THEME: Theme = "system";

export function ThemeProvider({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
  defaultTheme = DEFAULT_THEME,
}: ThemeProviderProps) {
  const { data: session, status: sessionStatus, update: updateNextAuthSession } = useSession();

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedTheme = window.localStorage.getItem(storageKey) as Theme | null;
        if (storedTheme && ["light", "dark", "system", "sepia"].includes(storedTheme)) {
          // console.log(`[ThemeProvider useState] กำลังเริ่มต้น theme จาก localStorage: '${storedTheme}'`);
          return storedTheme;
        }
        // console.log(`[ThemeProvider useState] ไม่พบ theme ใน localStorage หรือค่าไม่ถูกต้อง ('${storedTheme}'). จะใช้ defaultTheme prop: '${defaultTheme}'`);
      } catch (e) {
        console.warn(`[ThemeProvider useState] ไม่สามารถอ่าน theme จาก localStorage. จะใช้ defaultTheme prop: '${defaultTheme}'. Error:`, e);
      }
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    let initialResolved: ResolvedTheme = "light";
    const currentInitialTheme = (() => {
      if (typeof window !== "undefined") {
        try {
          const stored = window.localStorage.getItem(storageKey) as Theme | null;
          if (stored && ["light", "dark", "system", "sepia"].includes(stored)) return stored;
        } catch (e) { /* ignore */ }
      }
      return defaultTheme;
    })();

    if (currentInitialTheme === "system") {
      initialResolved = (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    } else if (currentInitialTheme === "sepia" || currentInitialTheme === "dark" || currentInitialTheme === "light") {
      initialResolved = currentInitialTheme;
    }
    // console.log(`[ThemeProvider useState resolvedTheme] กำลังเริ่มต้น resolvedTheme เป็น: '${initialResolved}' จาก initialThemeValue: '${currentInitialTheme}'`);
    return initialResolved;
  });

  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback(
    (themeToApply: Theme) => {
      let newResolvedTheme: ResolvedTheme;
      if (themeToApply === "system") {
        newResolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      } else {
        newResolvedTheme = themeToApply as ResolvedTheme;
      }
      // console.log(`[ThemeProvider applyTheme] กำลัง 적용 theme: '${themeToApply}', แปลงเป็น: '${newResolvedTheme}'`);
      const docEl = document.documentElement;
      docEl.classList.remove("light", "dark", "sepia");
      docEl.classList.add(newResolvedTheme);
      docEl.setAttribute("data-theme", newResolvedTheme);
      setResolvedTheme(newResolvedTheme);
    },
    []
  );

  useEffect(() => {
    if (!mounted) {
        setMounted(true);
    }
    // console.log(`[ThemeProvider Mount/ThemeChange Effect] Theme ปัจจุบันคือ '${theme}'. กำลัง 적용.`);
    applyTheme(theme);

    const handleSystemThemeChange = () => {
      if (theme === "system") {
        // console.log("[ThemeProvider SystemListener] OS theme เปลี่ยนแปลง. กำลัง re-applying 'system' theme.");
        applyTheme("system");
      }
    };

    const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
    // Listener จะถูกเพิ่มเฉพาะเมื่อ theme เป็น 'system' และจะถูกลบเมื่อ component unmount หรือ theme เปลี่ยนเป็นค่าอื่น
    if (theme === "system") {
      mediaQueryList.addEventListener("change", handleSystemThemeChange);
    }

    return () => {
      mediaQueryList.removeEventListener("change", handleSystemThemeChange);
    };
  }, [theme, applyTheme, mounted]);


  // --- ✅ [ปรับปรุง] Effect สำหรับการซิงโครไนซ์กับ NextAuth session ---
  // Ref เพื่อติดตามสถานะ session ก่อนหน้า
  const prevSessionStatusRef = useRef<typeof sessionStatus | undefined>(undefined);
  // Ref เพื่อป้องกันการอัปเดตธีมจาก session ในการ render ครั้งแรกหากผู้ใช้ login อยู่แล้ว
  // (เพื่อป้องกันการเขียนทับค่าจาก ThemeInitializerScript/localStorage ด้วย JWT ที่อาจจะยัง stale)
  const initialAuthLoadGuardRef = useRef(true);

  useEffect(() => {
    if (!mounted) {
      // เมื่อ component unmount หรือ remount, รีเซ็ตสถานะเพื่อให้การ์ดทำงานอีกครั้งสำหรับการโหลดครั้งแรกหาก login อยู่
      initialAuthLoadGuardRef.current = true;
      prevSessionStatusRef.current = sessionStatus; // จัดเก็บสถานะปัจจุบันเพื่อเปรียบเทียบในครั้งถอดไป
      return;
    }

    const currentSessionObjectTheme = session?.user?.preferences?.display?.theme as Theme | undefined | null;
    const isValidSessionTheme = currentSessionObjectTheme && ["light", "dark", "system", "sepia"].includes(currentSessionObjectTheme);

    // console.log(`[ThemeProvider SessionSync] Status: ${sessionStatus}, PrevStatus: ${prevSessionStatusRef.current}, AppTheme: ${theme}, SessionTheme: ${currentSessionObjectTheme}, Guard: ${initialAuthLoadGuardRef.current}`);

    if (sessionStatus === "authenticated") {
      if (isValidSessionTheme) {
        // สถานการณ์ที่ 1: ผู้ใช้เพิ่ง SIGN IN (เปลี่ยนจาก unauthenticated/loading เป็น authenticated)
        if (
          (prevSessionStatusRef.current === "unauthenticated" || prevSessionStatusRef.current === "loading") &&
          currentSessionObjectTheme !== theme
        ) {
          // console.log(`[ThemeProvider SessionSync] SIGN-IN DETECTED: ธีมจาก session '${currentSessionObjectTheme}' (DB) จะถูกใช้แทนที่ธีมปัจจุบันของแอป '${theme}'.`);
          setThemeState(currentSessionObjectTheme); // อัปเดต state ของแอป
          try {
            window.localStorage.setItem(storageKey, currentSessionObjectTheme); // อัปเดต localStorage
          } catch (e) {
            console.warn(`[ThemeProvider SessionSync - Sign-In] ไม่สามารถบันทึกธีม '${currentSessionObjectTheme}' จาก session ลง localStorage:`, e);
          }
          initialAuthLoadGuardRef.current = false; // การซิงค์เกิดขึ้นแล้ว, ปิดการ์ดสำหรับ session instance นี้
        }
        // สถานการณ์ที่ 2: ผู้ใช้ login อยู่แล้ว และนี่ *ไม่ใช่* การทำงานครั้งแรกของ effect หลัง mount
        // หรือธีมใน session object มีการเปลี่ยนแปลงจากครั้งล่าสุดที่เราเห็น
        else if (!initialAuthLoadGuardRef.current && currentSessionObjectTheme !== theme) {
          // console.log(`[ThemeProvider SessionSync] AUTHENTICATED & POST-GUARD/CHANGED: ธีมจาก session '${currentSessionObjectTheme}' แตกต่างจากธีมแอป '${theme}'. กำลังอัปเดต.`);
          setThemeState(currentSessionObjectTheme);
          try {
            window.localStorage.setItem(storageKey, currentSessionObjectTheme);
          } catch (e) {
            console.warn(`[ThemeProvider SessionSync - Session Update] ไม่สามารถบันทึกธีม '${currentSessionObjectTheme}' จาก session ลง localStorage:`, e);
          }
        }
        // สถานการณ์ที่ 3: โหลดหน้าครั้งแรก, ผู้ใช้ LOGIN อยู่แล้ว, และนี่คือการทำงานครั้งแรกของ effect (การ์ดยังทำงานอยู่)
        // เราไม่ต้องการให้ธีมจาก JWT ที่อาจจะ stale มาเขียนทับค่าที่ ThemeInitializerScript + localStorage ตั้งค่าไว้
        // ดังนั้น ถ้าการ์ดทำงานอยู่, เราจะแค่ปิดการ์ด แต่จะไม่เปลี่ยน theme state ในตอนนี้
        else if (initialAuthLoadGuardRef.current) {
          // console.log(`[ThemeProvider SessionSync] INITIAL AUTHENTICATED LOAD (Guard Active): ธีมแอปคือ '${theme}'. ธีมจาก Session คือ '${currentSessionObjectTheme}'. ปิดการ์ด. ไม่มีการเปลี่ยนแปลงธีมแอปจาก session ในขั้นตอนนี้.`);
          initialAuthLoadGuardRef.current = false;
        }
      }
    } else if (sessionStatus === "unauthenticated") {
      // ผู้ใช้ sign out หรือ session ไม่ active
      // console.log(`[ThemeProvider SessionSync] UNAUTHENTICATED: รีเซ็ต initial sync guard.`);
      initialAuthLoadGuardRef.current = true; // รีเซ็ตการ์ดสำหรับการ sign-in ครั้งถัดไป
    }

    // อัปเดต prevSessionStatusRef สำหรับการทำงานของ effect ในครั้งถัดไปเสมอ
    prevSessionStatusRef.current = sessionStatus;

  }, [session, sessionStatus, mounted, storageKey, theme, setThemeState]);


  // --- ฟังก์ชันสำหรับตั้งค่าธีม (ถูกเรียกโดยการกระทำของผู้ใช้) ---
  const setTheme = useCallback(
    async (newTheme: Theme) => {
      // console.log(`[ThemeProvider setTheme] ผู้ใช้ร้องขอเปลี่ยนธีมเป็น: '${newTheme}'`);
      setThemeState(newTheme); // อัปเดต UI ทันที (Optimistic update)

      try {
        window.localStorage.setItem(storageKey, newTheme); // บันทึกลง localStorage
      } catch (e) {
        console.warn(`[ThemeProvider setTheme] ไม่สามารถบันทึกธีมลง localStorage:`, e);
      }

      if (sessionStatus === "authenticated" && session?.user?.id) {
        try {
          // console.log(`[ThemeProvider setTheme] ผู้ใช้ยืนยันตัวตนแล้ว. กำลังอัปเดตธีมใน DB สำหรับ user: ${session.user.id}`);
          const response = await fetch("/api/user/update-preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              preferences: { display: { theme: newTheme } },
            }),
          });

          if (response.ok) {
            // console.log("[ThemeProvider setTheme] อัปเดตธีมใน DB สำเร็จ. กำลังสั่งรีเฟรช session.");
            await updateNextAuthSession(); // รีเฟรช JWT ด้วย preference ธีมใหม่
            // console.log("[ThemeProvider setTheme] การรีเฟรช NextAuth session น่าจะเสร็จสิ้นแล้ว.");
            // เมื่อ session อัปเดต, SessionSync Effect ที่ปรับปรุงแล้วจะทำงานและจัดการ state อย่างถูกต้อง
          } else {
            let errorData = { message: `Request failed with status ${response.status}` };
            try { errorData = await response.json(); } catch { /* ignore */ }
            console.error("[ThemeProvider setTheme] ไม่สามารถอัปเดตธีมใน DB:", response.status, errorData);
          }
        } catch (error) {
          console.error("[ThemeProvider setTheme] เกิดข้อผิดพลาดขณะเรียก API update-preferences:", error);
        }
      }
    },
    [storageKey, sessionStatus, session?.user?.id, updateNextAuthSession] //นำ theme ออกจาก dependencies ของ setTheme เพราะ setTheme ไม่ควรอ้างอิงค่า theme เก่าในการตัดสินใจ
  );

  // --- Effect สำหรับการซิงโครไนซ์ธีมข้ามแท็บผ่าน localStorage event ---
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        // console.log(`[ThemeProvider StorageListener] localStorage เปลี่ยนแปลงจากแท็บอื่น. Key: ${event.key}, Old: ${event.oldValue}, New: ${event.newValue}`);
        const newThemeFromStorage = event.newValue as Theme;

        if (["light", "dark", "system", "sepia"].includes(newThemeFromStorage)) {
          if (newThemeFromStorage !== theme) {
            // console.log(`[ThemeProvider StorageListener] ธีมจาก localStorage ('${newThemeFromStorage}') แตกต่างจากธีมปัจจุบันของ context ('${theme}'). กำลังอัปเดต context.`);
            setThemeState(newThemeFromStorage);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // console.log("[ThemeProvider StorageListener] Attached storage event listener.");

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      // console.log("[ThemeProvider StorageListener] Removed storage event listener.");
    };
  }, [storageKey, theme, mounted, setThemeState]); // เพิ่ม setThemeState เข้า dependencies


  const themesList: ThemeDefinition[] = useMemo(
    () => [
      { name: "light", label: "สว่าง", icon: <Sun size={16} /> },
      { name: "dark", label: "มืด", icon: <Moon size={16} /> },
      { name: "sepia", label: "ซีเปีย", icon: <BookOpenText size={16} /> },
      { name: "system", label: "ระบบ", icon: <Laptop size={16} /> },
    ],
    []
  );

  // `setTheme` ถูก memoized ด้วย useCallback แล้ว จึงปลอดภัยที่จะใส่ใน dependency array ของ useMemo
  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, themes: themesList, mounted }),
    [theme, resolvedTheme, setTheme, themesList, mounted]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};