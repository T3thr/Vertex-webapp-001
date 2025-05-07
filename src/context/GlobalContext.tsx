'use client'

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/context/AuthContext";
import { ToastContainer } from "react-toastify";
import { GoogleReCaptchaProvider } from '@google-recaptcha/react';

export function GlobalProvider({ children }: { children: React.ReactNode }) {
    return (
        <>
        <ToastContainer position="bottom-right" />
          <SessionProvider>
            <AuthProvider>
              <GoogleReCaptchaProvider
                type="v3"
                siteKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                language="th"
              >
                {children}
              </GoogleReCaptchaProvider>
            </AuthProvider>
          </SessionProvider>
        </>
      );
}