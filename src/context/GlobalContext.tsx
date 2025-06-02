// src/context/GlobalContext.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/context/AuthContext"; // ตรวจสอบ path
import { ThemeProvider, useTheme } from "@/context/ThemeContext"; // ตรวจสอบ path และ import useTheme
import { ToastContainer } from "react-toastify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState, ReactNode, useMemo } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 นาที
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface GlobalProviderProps {
  children: ReactNode;
}

const AppContent = ({ children }: { children: ReactNode }) => {
  const { mounted: themeContextMounted, resolvedTheme } = useTheme(); // renamed mounted to themeContextMounted
  const [isAppContentReady, setIsAppContentReady] = useState(false);

  useEffect(() => {
    // Wait for the theme context itself to be mounted and ready
    if (themeContextMounted) {
      // Use requestAnimationFrame to delay until the browser is ready for the next paint
      // This can help ensure that theme styles are applied before making content visible
      const timer = requestAnimationFrame(() => {
        setIsAppContentReady(true);
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [themeContextMounted]);

  const toastThemeMode = useMemo(() => {
    if (!themeContextMounted) return "light"; // Default if theme context not ready
    if (resolvedTheme === "sepia") return "light";
    return resolvedTheme || "light"; // 'light' or 'dark', fallback to 'light'
  }, [themeContextMounted, resolvedTheme]);

  // Render children hidden initially to prevent FOUC, or a proper skeleton/loader
  if (!isAppContentReady) {
    // Option 1: Render children but visually hidden (helps with layout stability)
    return (
      <div style={{ visibility: 'hidden' }} aria-hidden="true">
        {children}
      </div>
    );
    // Option 2: Render nothing or a minimal loader (might cause more layout shift)
    // return null;
    // Option 3: If you have a global loading spinner component:
    // return <GlobalSpinner />;
  }

  return (
    <>
      {children}
      <ToastContainer
        position="bottom-right"
        autoClose={3500}
        // ... other props
        theme={toastThemeMode}
        toastClassName={(context) => {
          const baseClass = "font-sans text-sm rounded-lg shadow-md";
          if (context?.type === "error") {
            return `${baseClass} bg-alert-error text-alert-error-foreground border border-alert-error-border`;
          }
          if (context?.type === "success") {
            return `${baseClass} bg-alert-success text-alert-success-foreground border border-alert-success-border`;
          }
          return `${baseClass} bg-card text-card-foreground border border-border`;
        }}
      />
    </>
  );
};

export function GlobalProvider({ children }: GlobalProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
        <ThemeProvider storageKey="divwy-theme" defaultTheme="system"> {/* defaultTheme here is the *preference* */}
          <AuthProvider>
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
