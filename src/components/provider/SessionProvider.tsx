// src/components/provier/SessionProvider.tsx

"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";

/**
 * SessionProvider - คอมโพเนนต์สำหรับให้บริการข้อมูล session ทั่วทั้งแอปพลิเคชัน
 * ช่วยในการ optimize การเรียกใช้ session และรักษาสถานะระหว่างการ navigation
 */
export default function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider 
      // สร้าง refresh interval เพื่อเช็คความถูกต้องของ session ทุกๆ 5 นาที 
      // แต่ไม่ refresh หากแท็บไม่ได้ active
      refetchInterval={5 * 60} // 5 นาที
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      {children}
    </NextAuthSessionProvider>
  );
}