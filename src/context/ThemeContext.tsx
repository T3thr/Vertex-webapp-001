// src/context/ThemeContext.tsx
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
export type ResolvedTheme = "light" | "dark" | "sepia"; // system is resolved to light/dark

export interface ThemeDefinition {
  name: Theme;
  label: string;
  icon: React.ReactElement;
}

interface ThemeContextProps {
  theme: Theme; // The user's selected theme preference (light, dark, system, sepia)
  resolvedTheme: ResolvedTheme; // The actual theme being applied (light, dark, sepia)
  setTheme: (theme: Theme) => void;
  themes: ThemeDefinition[];
  mounted: boolean; // Indicates if the component has mounted on the client
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  storageKey?: string;
  defaultTheme?: Theme; // This is the fallback if nothing in localStorage
}

const DEFAULT_STORAGE_KEY = "novelmaze-theme";
const DEFAULT_THEME_PREFERENCE: Theme = "system"; // Default *preference*

export function ThemeProvider({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
  defaultTheme: defaultThemeProp = DEFAULT_THEME_PREFERENCE, // Renamed for clarity
}: ThemeProviderProps) {
  const { data: session, status: sessionStatus, update: updateNextAuthSession } = useSession();
  const [mounted, setMounted] = useState(false);

  // theme: User's *selected* theme option (light, dark, system, sepia)
  const [theme, setThemeState] = useState<Theme>(() => {
    // This initializer runs on both server and client for the initial render pass.
    // On the client, after ThemeInitializerScript, localStorage should be set.
    // On the server, window is undefined.
    if (typeof window === "undefined") {
      // console.log("[ThemeProvider useState(theme)] Server render, returning defaultThemeProp:", defaultThemeProp);
      return defaultThemeProp;
    }
    try {
      const storedTheme = window.localStorage.getItem(storageKey) as Theme | null;
      if (storedTheme && ["light", "dark", "system", "sepia"].includes(storedTheme)) {
        // console.log(`[ThemeProvider useState(theme)] Client, from localStorage: '${storedTheme}'`);
        return storedTheme;
      }
      // console.log(`[ThemeProvider useState(theme)] Client, localStorage invalid or empty, using defaultThemeProp: '${defaultThemeProp}'`);
    } catch (e) {
      console.warn(`[ThemeProvider useState(theme)] Client, error reading localStorage, using defaultThemeProp: '${defaultThemeProp}'. Error:`, e);
    }
    return defaultThemeProp;
  });

  // resolvedTheme: The *actual* CSS theme class (light, dark, sepia)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
      // This also runs on server and client.
      // ThemeInitializerScript has already set the class on <html>, so this should ideally match it on initial client load.
      // For server render, we can only guess based on default or prop.
      // For client, we check data-theme set by ThemeInitializerScript initially.
      if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-theme-ready')) {
        const initialDocTheme = document.documentElement.getAttribute('data-theme') as ResolvedTheme;
        if (initialDocTheme && ['light', 'dark', 'sepia'].includes(initialDocTheme)) {
          // console.log(`[ThemeProvider useState(resolvedTheme)] Client (from data-theme): ${initialDocTheme}`);
          return initialDocTheme;
        }
      }
      // Fallback if data-theme isn't set or valid (e.g., server render, or error in script)
      if (defaultThemeProp === "dark" || defaultThemeProp === "light" || defaultThemeProp === "sepia") {
        // console.log(`[ThemeProvider useState(resolvedTheme)] Fallback (prop non-system): ${defaultThemeProp}`);
        return defaultThemeProp;
      }
      // console.log(`[ThemeProvider useState(resolvedTheme)] Fallback (prop system/other): light`);
      return "light"; // Default to 'light' if 'system' and on server, or if data-theme is missing
  });

  const applyThemeToDocument = useCallback((newThemeChoice: Theme) => {
    // This function should only be called client-side
    if (typeof window === "undefined" || typeof document === "undefined") return;

    let newResolvedCssTheme: ResolvedTheme;
    if (newThemeChoice === "system") {
      newResolvedCssTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else {
      newResolvedCssTheme = newThemeChoice as ResolvedTheme; // light, dark, sepia
    }

    const docEl = document.documentElement;
    docEl.classList.remove("light", "dark", "sepia");
    docEl.classList.add(newResolvedCssTheme);
    docEl.setAttribute("data-theme", newResolvedCssTheme);
    setResolvedTheme(newResolvedCssTheme); // Update React state
    // console.log(`[ThemeProvider applyThemeToDocument] Applied choice: '${newThemeChoice}', Resolved CSS: '${newResolvedCssTheme}'`);
  }, []);


  // Effect to mark as mounted and apply initial theme based on state
  // This runs after initial render on the client
  useEffect(() => {
    setMounted(true);
    // console.log(`[ThemeProvider MountEffect] Component mounted. Initial theme state: '${theme}'. Applying to document.`);
    applyThemeToDocument(theme); // Apply current theme choice to document
  }, []); // Empty dependency array: runs once on mount

  // Effect to handle system theme changes if 'system' is selected
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return; // Ensure this runs only on client and after mount

    if (theme === "system") {
      const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemThemeChange = () => {
        // console.log("[ThemeProvider SystemListener] OS theme changed. Re-applying 'system'.");
        applyThemeToDocument("system");
      };
      mediaQueryList.addEventListener("change", handleSystemThemeChange);
      // console.log("[ThemeProvider SystemListener] Added listener for system theme changes.");
      return () => {
        mediaQueryList.removeEventListener("change", handleSystemThemeChange);
        // console.log("[ThemeProvider SystemListener] Removed listener for system theme changes.");
      };
    }
  }, [theme, mounted, applyThemeToDocument]); // Runs when theme, mounted, or applyThemeToDocument changes


  // --- Session Sync Effect (largely unchanged, but ensure it uses `mounted`) ---
  const prevSessionStatusRef = useRef<typeof sessionStatus | undefined>(undefined);
  const initialAuthLoadGuardRef = useRef(true);

  useEffect(() => {
    if (!mounted) { // Crucial: Wait for client mount
      // console.log("[ThemeProvider SessionSync] Not mounted yet. Skipping.");
      return;
    }
    // ... (rest of your session sync logic)
    // Ensure any localStorage access or window access here is safe or also guarded by `mounted`
    // For example, when setting localStorage:
    // if (typeof window !== 'undefined') {
    //   window.localStorage.setItem(storageKey, currentSessionObjectTheme);
    // }

    const currentSessionObjectTheme = session?.user?.preferences?.display?.theme as Theme | undefined | null;
    const isValidSessionTheme = currentSessionObjectTheme && ["light", "dark", "system", "sepia"].includes(currentSessionObjectTheme);
    const isInitialAuthLoadForThisEffectRun = initialAuthLoadGuardRef.current;

    // console.log(`[ThemeProvider SessionSync] Status: ${sessionStatus}, PrevStatus: ${prevSessionStatusRef.current}, AppTheme: ${theme}, SessionTheme: ${currentSessionObjectTheme}, GuardIsActive: ${isInitialAuthLoadForThisEffectRun}`);

    if (sessionStatus === "authenticated") {
      if (isValidSessionTheme) {
        if (prevSessionStatusRef.current === "unauthenticated" && currentSessionObjectTheme !== theme) {
          // console.log(`[ThemeProvider SessionSync] ✅ TRUE SIGN-IN: Session theme '${currentSessionObjectTheme}' overrides app theme '${theme}'.`);
          setThemeState(currentSessionObjectTheme); // Update React state
          applyThemeToDocument(currentSessionObjectTheme); // Apply to DOM
          try { window.localStorage.setItem(storageKey, currentSessionObjectTheme); } catch (e) { /* ... */ }
          if (isInitialAuthLoadForThisEffectRun) initialAuthLoadGuardRef.current = false;
        } else {
          if (isInitialAuthLoadForThisEffectRun) {
            // console.log(`[ThemeProvider SessionSync] ✅ INITIAL AUTH LOAD (Guard Active): App theme '${theme}' (from localStorage/initializer). Session (JWT) theme '${currentSessionObjectTheme}'. Guard prevents override. Closing guard.`);
            initialAuthLoadGuardRef.current = false;
            // If `theme` (from localStorage) and `currentSessionObjectTheme` (from JWT) differ
            // AND `theme` is what ThemeInitializerScript set from DB, we are good.
            // If JWT is actually fresher, a session update might trigger the `else if` below later.
          } else if (currentSessionObjectTheme !== theme) {
            // console.log(`[ThemeProvider SessionSync] ✅ AUTH & POST-GUARD / SESSION CHANGED: Session theme '${currentSessionObjectTheme}' differs from app theme '${theme}'. Updating.`);
            setThemeState(currentSessionObjectTheme);
            applyThemeToDocument(currentSessionObjectTheme);
            try { window.localStorage.setItem(storageKey, currentSessionObjectTheme); } catch (e) { /* ... */ }
          }
        }
      } else if (isInitialAuthLoadForThisEffectRun && session?.user) {
        // console.log(`[ThemeProvider SessionSync] ✅ INITIAL AUTH LOAD (Guard Active): User logged in, but no valid theme in session. Closing guard.`);
        initialAuthLoadGuardRef.current = false;
      }
    } else if (sessionStatus === "unauthenticated") {
      if (prevSessionStatusRef.current === "authenticated") {
        // console.log(`[ThemeProvider SessionSync] ✅ SIGN-OUT DETECTED. App theme is '${theme}'. No change to app theme. Resetting guard.`);
      }
      initialAuthLoadGuardRef.current = true;
    }
    prevSessionStatusRef.current = sessionStatus;
  }, [session, sessionStatus, mounted, storageKey, theme, setThemeState, applyThemeToDocument]); // Added applyThemeToDocument


  const setTheme = useCallback(
    async (newThemeChoice: Theme) => {
      if (!mounted) {
        // console.warn("[ThemeProvider setTheme] Called before mounted. Deferring or ignoring.");
        // Optionally, you could queue this change or just update state and let useEffect handle it.
        // For simplicity, we'll update state and let the effect apply it.
        setThemeState(newThemeChoice); // Update the choice
        return;
      }
      // console.log(`[ThemeProvider setTheme] User requested theme: '${newThemeChoice}'`);
      setThemeState(newThemeChoice); // Update React state for user's choice
      applyThemeToDocument(newThemeChoice); // Apply the chosen theme to the document

      try {
        window.localStorage.setItem(storageKey, newThemeChoice);
      } catch (e) {
        console.warn(`[ThemeProvider setTheme] Failed to save theme to localStorage:`, e);
      }

      if (sessionStatus === "authenticated" && session?.user?.id) {
        // ... (rest of your API update logic, which is likely fine)
        try {
          // console.log(`[ThemeProvider setTheme] Authenticated. Updating theme in DB for user: ${session.user.id}`);
          const response = await fetch("/api/user/update-preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              preferences: { display: { theme: newThemeChoice } },
            }),
          });

          if (response.ok) {
            // console.log("[ThemeProvider setTheme] DB update successful. Triggering session refresh.");
            await updateNextAuthSession();
            // console.log("[ThemeProvider setTheme] NextAuth session refresh should be complete.");
          } else {
            let errorData = { message: `Request failed with status ${response.status}` };
            try { errorData = await response.json(); } catch { /* ignore */ }
            console.error("[ThemeProvider setTheme] Failed to update theme in DB:", response.status, errorData);
          }
        } catch (error) {
          console.error("[ThemeProvider setTheme] Error calling update-preferences API:", error);
        }
      }
    },
    [mounted, storageKey, sessionStatus, session?.user?.id, updateNextAuthSession, setThemeState, applyThemeToDocument] // Added applyThemeToDocument
  );

  // Effect for storage event (syncing across tabs)
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        // console.log(`[ThemeProvider StorageListener] localStorage changed. Key: ${event.key}, New: ${event.newValue}`);
        const newThemeFromStorage = event.newValue as Theme;
        if (["light", "dark", "system", "sepia"].includes(newThemeFromStorage)) {
          if (newThemeFromStorage !== theme) { // Compare with current *choice*
            // console.log(`[ThemeProvider StorageListener] Theme from storage ('${newThemeFromStorage}') differs from current choice ('${theme}'). Updating.`);
            setThemeState(newThemeFromStorage); // Update the choice
            applyThemeToDocument(newThemeFromStorage); // Apply the new choice
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
  }, [storageKey, theme, mounted, setThemeState, applyThemeToDocument]); // Added applyThemeToDocument


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

  useEffect(() => {
    return () => {
      // console.log("[ThemeProvider Unmount] Resetting refs.");
      prevSessionStatusRef.current = undefined;
      initialAuthLoadGuardRef.current = true;
    };
  }, []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};