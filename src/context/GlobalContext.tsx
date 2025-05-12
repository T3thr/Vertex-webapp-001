// src/context/GlobalContext.tsx
// จัดการเซสชัน, การยืนยันตัวตน, ธีม, การแจ้งเตือน
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
      refetchOnWindowFocus: false, // สามารถเปิด true ได้ถ้าต้องการ aggressive refetching
      retry: 1, // จำกัดการ retry เพื่อเพิ่มประสิทธิภาพ
    },
  },
});

interface GlobalProviderProps {
  children: ReactNode;
}

// Component ย่อยสำหรับจัดการ ToastContainer และการ render children
// เพื่อให้ useTheme() ถูกเรียกภายใน ThemeProvider
const AppContent = ({ children }: { children: ReactNode }) => {
  const { mounted: themeMounted, resolvedTheme } = useTheme(); // ดึง resolvedTheme และ mounted จาก context
  const [isReady, setIsReady] = useState(false);

  // แสดงผลเมื่อ client-side hydration เสร็จสมบูรณ์
  useEffect(() => {
    if (themeMounted) {
      // ใช้ requestAnimationFrame เพื่อให้ browser render cycle เสร็จสมบูรณ์ก่อน
      const timer = requestAnimationFrame(() => {
        setIsReady(true);
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [themeMounted]);

  // คำนวณ theme สำหรับ ToastContainer
  const toastThemeMode = useMemo(() => {
    if (!themeMounted) return "light"; // ค่าเริ่มต้นก่อน client-side theme พร้อม
    
    // สำหรับธีม sepia ใช้ light mode toast ซึ่งจะมองเห็นได้ดีกว่า
    if (resolvedTheme === "sepia") return "light";
    
    return resolvedTheme; // 'light' หรือ 'dark'
  }, [themeMounted, resolvedTheme]);

  if (!isReady) {
    // แสดง children แบบ visibility: hidden เพื่อป้องกัน layout shift
    // โดยใช้ fade-in animation เมื่อ content พร้อม
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
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
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