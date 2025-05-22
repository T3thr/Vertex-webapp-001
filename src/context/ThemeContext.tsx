// src/components/ThemeContext.tsx หรือตำแหน่งไฟล์ของคุณ
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
          // console.log(`[ThemeProvider useState] กำลังเริ่มต้น theme จาก localStorage: '${storedTheme}' (หลัง ThemeInitializerScript ควรจะถูกต้องที่สุด)`);
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
    if (theme === "system") {
      mediaQueryList.addEventListener("change", handleSystemThemeChange);
    }

    return () => {
      mediaQueryList.removeEventListener("change", handleSystemThemeChange);
    };
  }, [theme, applyTheme, mounted]);


  // --- ✅ [ปรับปรุง] Effect สำหรับการซิงโครไนซ์กับ NextAuth session ---
  const prevSessionStatusRef = useRef<typeof sessionStatus | undefined>(undefined);
  const initialAuthLoadGuardRef = useRef(true); // การ์ดป้องกันการเขียนทับธีมจาก session ในการโหลดครั้งแรก

  useEffect(() => {
    if (!mounted) {
      // เมื่อ component unmount หรือ remount, รีเซ็ตสถานะเพื่อให้การ์ดทำงานอีกครั้ง
      // initialAuthLoadGuardRef.current = true; // ถูกรีเซ็ตเมื่อ unauthenticated หรือ unmount แทน
      // prevSessionStatusRef.current = undefined; // ให้มันเริ่มจาก undefined จริงๆ เมื่อ mount ใหม่
      return;
    }

    const currentSessionObjectTheme = session?.user?.preferences?.display?.theme as Theme | undefined | null;
    const isValidSessionTheme = currentSessionObjectTheme && ["light", "dark", "system", "sepia"].includes(currentSessionObjectTheme);
    const isInitialAuthLoadForThisEffectRun = initialAuthLoadGuardRef.current;

    // console.log(`[ThemeProvider SessionSync] Status: ${sessionStatus}, PrevStatus: ${prevSessionStatusRef.current}, AppTheme: ${theme}, SessionTheme: ${currentSessionObjectTheme}, GuardIsActive: ${isInitialAuthLoadForThisEffectRun}`);

    if (sessionStatus === "authenticated") {
      if (isValidSessionTheme) {
        // สถานการณ์ที่ 1: ผู้ใช้เพิ่ง SIGN IN จริงๆ (เปลี่ยนจาก unauthenticated เป็น authenticated)
        if (prevSessionStatusRef.current === "unauthenticated" && currentSessionObjectTheme !== theme) {
          // console.log(`[ThemeProvider SessionSync] ✅ TRUE SIGN-IN: ธีมจาก session '${currentSessionObjectTheme}' จะถูกใช้แทนที่ธีมแอป '${theme}'.`);
          setThemeState(currentSessionObjectTheme);
          try {
            window.localStorage.setItem(storageKey, currentSessionObjectTheme);
          } catch (e) {
            console.warn(`[ThemeProvider SessionSync - Sign-In] ไม่สามารถบันทึกธีม '${currentSessionObjectTheme}' จาก session ลง localStorage:`, e);
          }
          // หากเป็นการ sign-in จริง, การ์ด (ถ้ายังทำงานอยู่) ได้ทำหน้าที่ของมันแล้วสำหรับสถานะก่อนหน้า, ปิดการ์ดได้
          if (isInitialAuthLoadForThisEffectRun) {
            initialAuthLoadGuardRef.current = false;
          }
        }
        // สถานการณ์ที่ 2: โหลดหน้าครั้งแรกโดยผู้ใช้ login อยู่แล้ว หรือ session มีการอัปเดตในภายหลัง
        else {
          // isInitialAuthLoadForThisEffectRun จะเป็น true ถ้าเป็นครั้งแรกที่ effect นี้ทำงานหลังจาก session กลายเป็น 'authenticated' ในการ mount ครั้งนี้
          if (isInitialAuthLoadForThisEffectRun) {
            // นี่คือการโหลดหน้าครั้งแรกที่ session เป็น 'authenticated' (อาจจะเปลี่ยนจาก 'loading')
            // `theme` state ปัจจุบันถูกตั้งมาจาก localStorage (ซึ่ง ThemeInitializerScript ได้ทำให้ถูกต้องจาก DB แล้ว)
            // เรา *ไม่ควร* ให้ธีมจาก JWT (ที่อาจจะยัง stale) มาเขียนทับค่านี้
            // console.log(`[ThemeProvider SessionSync] ✅ INITIAL AUTHENTICATED LOAD (Guard Active): ธีมแอปปัจจุบันคือ '${theme}' (จาก localStorage/initializer). ธีมจาก Session (JWT) คือ '${currentSessionObjectTheme}'. การ์ดป้องกันการเปลี่ยนแปลง. ปิดการ์ด.`);
            initialAuthLoadGuardRef.current = false; // ปิดการ์ดสำหรับการเปลี่ยนแปลง session ที่เกิดขึ้น *หลังจากนี้*
            // *** ไม่มีการเรียก setThemeState ที่นี่ *** เพื่อให้ธีมจาก ThemeInitializerScript คงอยู่
          }
          // สถานการณ์ที่ 2.2: ผู้ใช้ login อยู่แล้ว, การ์ดถูกปิดไปแล้ว (ไม่ใช่การโหลดครั้งแรกแล้ว) และธีมใน session object มีการเปลี่ยนแปลง
          else if (currentSessionObjectTheme !== theme) {
            // console.log(`[ThemeProvider SessionSync] ✅ AUTHENTICATED & POST-GUARD / SESSION CHANGED: ธีมจาก session '${currentSessionObjectTheme}' แตกต่างจากธีมแอป '${theme}'. กำลังอัปเดต.`);
            setThemeState(currentSessionObjectTheme);
            try {
              window.localStorage.setItem(storageKey, currentSessionObjectTheme);
            } catch (e) {
              console.warn(`[ThemeProvider SessionSync - Session Update] ไม่สามารถบันทึกธีม '${currentSessionObjectTheme}' จาก session ลง localStorage:`, e);
            }
          }
        }
      } else if (isInitialAuthLoadForThisEffectRun && session?.user) {
        // ผู้ใช้ login อยู่ แต่ไม่มี theme preference ใน session object (อาจเป็น null หรือ field ไม่มี)
        // ยังคงต้องปิดการ์ด เพื่อให้การทำงานหลังจากนี้เป็นปกติ
        // console.log(`[ThemeProvider SessionSync] ✅ INITIAL AUTHENTICATED LOAD (Guard Active): ผู้ใช้ login อยู่แต่ไม่มี theme ที่ถูกต้องใน session. ปิดการ์ด.`);
        initialAuthLoadGuardRef.current = false;
      }
    } else if (sessionStatus === "unauthenticated") {
      // ผู้ใช้ sign out หรือ session ไม่ active
      if (prevSessionStatusRef.current === "authenticated") {
        // console.log(`[ThemeProvider SessionSync] ✅ SIGN-OUT DETECTED. ธีมแอปคือ '${theme}'. ไม่มีการเปลี่ยนแปลงธีมแอปจากเหตุการณ์ sign-out. รีเซ็ตการ์ด.`);
        // ธีมที่ผู้ใช้ตั้งค่าไว้ (ใน localStorage) ควรจะยังคงอยู่จนกว่าจะมีการเปลี่ยนแปลงโดยผู้ใช้เอง
        // หรือ ThemeInitializerScript จะจัดการในครั้งถัดไปที่โหลดหน้าแบบ unauthenticated
      }
      initialAuthLoadGuardRef.current = true; // รีเซ็ตการ์ดสำหรับการ sign-in ครั้งถัดไป หรือการโหลดหน้าใหม่แบบ unauth แล้ว login
    }
    // else if (sessionStatus === "loading") {
      // console.log(`[ThemeProvider SessionSync] Session กำลังโหลด... สถานะการ์ด: ${isInitialAuthLoadForThisEffectRun}`);
      // ไม่มีการดำเนินการเกี่ยวกับธีมขณะกำลังโหลด, การ์ดจะยังคงสถานะเดิมจนกว่า session จะ resolved
    // }

    prevSessionStatusRef.current = sessionStatus;

  }, [session, sessionStatus, mounted, storageKey, theme, setThemeState]);


  const setTheme = useCallback(
    async (newTheme: Theme) => {
      // console.log(`[ThemeProvider setTheme] ผู้ใช้ร้องขอเปลี่ยนธีมเป็น: '${newTheme}'`);
      setThemeState(newTheme);

      try {
        window.localStorage.setItem(storageKey, newTheme);
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
            await updateNextAuthSession();
            // console.log("[ThemeProvider setTheme] การรีเฟรช NextAuth session น่าจะเสร็จสิ้นแล้ว.");
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
    [storageKey, sessionStatus, session?.user?.id, updateNextAuthSession, setThemeState] // เพิ่ม setThemeState เข้า dependencies ตาม best practice หาก ESLint แจ้ง
  );

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        // console.log(`[ThemeProvider StorageListener] localStorage เปลี่ยนแปลงจากแท็บอื่น. Key: ${event.key}, Old: ${event.oldValue}, New: ${event.newValue}`);
        const newThemeFromStorage = event.newValue as Theme;

        if (["light", "dark", "system", "sepia"].includes(newThemeFromStorage)) {
          if (newThemeFromStorage !== theme) {
            // console.log(`[ThemeProvider StorageListener] ธีมจาก localStorage ('${newThemeFromStorage}') แตกต่างจากธีมปัจจุบันของ context ('${theme}'). กำลังอัปเดต context.`);
            // การเรียก setThemeState ที่นี่จะทำให้ theme state ของ context นี้อัปเดตตาม
            // จากนั้น useEffect ที่ซิงค์กับ session อาจจะทำงานอีกครั้งถ้า theme นี้ไม่ตรงกับ session
            // ซึ่งเป็นพฤติกรรมที่อาจจะต้องการ คือ ให้ session เป็นตัวกำหนดสุดท้ายหาก login อยู่
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
  }, [storageKey, theme, mounted, setThemeState]);


  const themesList: ThemeDefinition[] = useMemo(
    () => [
      { name: "light", label: "สว่าง", icon: <Sun size={16} /> },
      { name: "dark", label: "มืด", icon: <Moon size={16} /> },
      { name: "sepia", label: "ซีเปีย", icon: <BookOpenText size={16} /> },
      { name: "system", label: "ระบบ", icon: <Laptop size={16} /> },
    ],
    []
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, themes: themesList, mounted }),
    [theme, resolvedTheme, setTheme, themesList, mounted]
  );

  // เพิ่ม useEffect เพื่อรีเซ็ต prevSessionStatusRef และ initialAuthLoadGuardRef เมื่อ component unmount
  // เพื่อให้การทำงานถูกต้องเมื่อ component ถูก mount ใหม่ (เช่น เปลี่ยนหน้าแล้วกลับมา)
  useEffect(() => {
    // Effect นี้จะทำงานเมื่อ component mount
    // และ cleanup function จะทำงานเมื่อ component unmount
    return () => {
      // console.log("[ThemeProvider Unmount] รีเซ็ต prevSessionStatusRef และ initialAuthLoadGuardRef");
      prevSessionStatusRef.current = undefined;
      initialAuthLoadGuardRef.current = true; // รีเซ็ตการ์ดเมื่อ unmount
    };
  }, []); // ทำงานครั้งเดียวตอน mount และ cleanup ตอน unmount


  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};