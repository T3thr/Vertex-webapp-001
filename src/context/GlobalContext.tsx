// src/context/GlobalContext.ts

'use client';

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/context/AuthContext";
import { ToastContainer } from "react-toastify";

// ผู้ให้บริการบริบททั่วโลก - จัดการเซสชัน การยืนยันตัวตน และการแจ้งเตือน
export function GlobalProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ToastContainer position="bottom-right" />
      <SessionProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </SessionProvider>
    </>
  );
}