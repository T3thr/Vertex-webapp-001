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
  const { mounted: themeMounted, resolvedTheme } = useTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (themeMounted) {
      const timer = requestAnimationFrame(() => {
        setIsReady(true);
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [themeMounted]);

  const toastThemeMode = useMemo(() => {
    if (!themeMounted) return "light";
    if (resolvedTheme === "sepia") return "light"; // Sepia ใช้ toast สว่าง
    return resolvedTheme; // 'light' หรือ 'dark'
  }, [themeMounted, resolvedTheme]);

  if (!isReady) {
    // แสดง children แบบ visibility: hidden เพื่อป้องกัน layout shift
    return (
      <div className="opacity-0 transition-opacity duration-300" aria-hidden="true">
        {children}
      </div>
    );
  }

  return (
    <>
      {children}
      <ToastContainer
        position="bottom-right"
        autoClose={3500}
        // ... (props อื่นๆ ของ ToastContainer) ...
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
        <ThemeProvider storageKey="novelmaze-theme" defaultTheme="system"> 
          <AuthProvider> 
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}