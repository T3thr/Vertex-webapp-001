// src/context/Providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, ReactNode } from "react";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 นาที
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// This component handles the theme-based rendering logic to prevent FOUC
const AppContent = ({ children }: { children: ReactNode }) => {
  const { mounted, resolvedTheme } = useTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (mounted) {
      const timer = requestAnimationFrame(() => setIsReady(true));
      return () => cancelAnimationFrame(timer);
    }
  }, [mounted]);

  if (!isReady) {
    // Render children hidden to prevent Flash of Unstyled Content (FOUC)
    return <div style={{ visibility: 'hidden' }} aria-hidden="true">{children}</div>;
  }

  return (
    <>
      {children}
      <Toaster
        richColors
        position="top-center"
        theme={
          resolvedTheme === "sepia"
            ? "light"
            : (resolvedTheme as "light" | "dark" | "system" | undefined)
        }
      />
    </>
  );
};

// This is the main provider component that will be used in layout.tsx
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
        <ThemeProvider storageKey="divwy-theme" defaultTheme="system">
          <AuthProvider>
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
