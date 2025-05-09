// src/context/GlobalContext.tsx
// จัดการเซสชัน, การยืนยันตัวตน, ธีม, การแจ้งเตือน

"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastContainer } from "react-toastify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState, ReactNode } from "react";

// สร้าง QueryClient สำหรับจัดการแคชฝั่งไคลเอนต์
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // แคชข้อมูล 5 นาที
      refetchOnWindowFocus: false,
    },
  },
});

interface GlobalProviderProps {
  children: ReactNode;
}

export function GlobalProvider({ children }: GlobalProviderProps) {
  const [mounted, setMounted] = useState(false);

  // ตั้งค่า mounted เมื่อเรนเดอร์ฝั่งไคลเอนต์
  useEffect(() => {
    setMounted(true);
  }, []);

  // กำหนดธีมสำหรับ ToastContainer
  const toastTheme = () => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    return isDarkMode ? "dark" : "light";
  };

  return (
    <QueryClientProvider client={queryClient}>
      {mounted && (
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={toastTheme()}
          toastClassName={(context) =>
            context?.type === "error"
              ? "bg-red-100 dark:bg-red-900"
              : context?.type === "success"
              ? "bg-green-100 dark:bg-green-900"
              : "bg-card"
          }
        />
      )}<SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={false}>
        <ThemeProvider defaultTheme="system" storageKey="novelmaze-theme">
          <AuthProvider>
            <div style={{ visibility: mounted ? "visible" : "hidden" }}>
              {children}
            </div>
          </AuthProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}