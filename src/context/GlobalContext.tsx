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

  // คำนวณ theme สำหรับ ToastContainer
  const toastThemeMode = useMemo(() => {
    if (!themeMounted) return "light"; // ค่าเริ่มต้นก่อน client-side theme พร้อม
    return resolvedTheme; // resolvedTheme จะเป็น 'light', 'dark', หรือ 'sepia'
  }, [themeMounted, resolvedTheme]);

  if (!themeMounted) {
    // แสดง children แบบ hidden หรือ placeholder ขณะรอ ThemeContext mount
    // ThemeScript ใน layout.tsx ควรจัดการ FOUC เบื้องต้นแล้ว
    // การ return null หรือ placeholder อาจทำให้เกิด layout shift ตอน client render
    // การใช้ visibility: hidden จะ render children แต่ไม่แสดงผล
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <>
      {children}
      <ToastContainer
        position="bottom-right"
        autoClose={3500} // เพิ่มเวลานิดหน่อย
        hideProgressBar={false}
        newestOnTop={true} // แสดง toast ใหม่ล่าสุดด้านบน
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={toastThemeMode} // ใช้ resolvedTheme จาก context
        toastClassName={(context) => { // ตัวอย่างการ custom classname
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