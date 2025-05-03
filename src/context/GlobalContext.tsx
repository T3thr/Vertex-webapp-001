'use client'

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/context/AuthContext";
import { ToastContainer } from "react-toastify";


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