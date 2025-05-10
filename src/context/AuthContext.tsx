// src/context/AuthContext.tsx
// คอนเท็กซ์สำหรับจัดการการยืนยันตัวตนของผู้ใช้
// รองรับการลงชื่อเข้าใช้ สมัครสมาชิก และออกจากระบบ
// อัปเดต: ปรับ signInWithCredentials ให้ทำงานกับ /api/auth/signin, signInWithSocial กับ /api/auth/social, และ signUp กับ /api/auth/signup

import { createContext, useContext, useCallback, ReactNode, useState, useEffect } from "react";
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { SessionUser } from "@/app/api/auth/[...nextauth]/options";
import { useQueryClient } from "@tanstack/react-query";

// อินเทอร์เฟซสำหรับ AuthContext
interface AuthContextType {
  user: SessionUser | null;
  status: "authenticated" | "loading" | "unauthenticated";
  signInWithCredentials: (
    identifier: string,
    password: string
  ) => Promise<{ error?: string; success?: boolean; verificationRequired?: boolean; ok?: boolean }>;
  signInWithSocial: (provider: string) => Promise<void>;
  signUp: (
    email: string,
    username: string,
    password: string,
    recaptchaToken: string
  ) => Promise<{ error?: string; success?: boolean; message?: string }>;
  signOut: () => Promise<void>;
  loading: boolean;
  authError: string | null;
  setAuthError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { data: session, status: nextAuthStatus } = useSession();
  const user = session?.user as SessionUser | null;
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user || nextAuthStatus !== 'loading') {
      setAuthError(null);
    }
  }, [user, nextAuthStatus]);

  const signInWithCredentials = useCallback(
    async (
      identifier: string,
      password: string
    ): Promise<{ error?: string; success?: boolean; verificationRequired?: boolean; ok?: boolean }> => {
      setLoading(true);
      setAuthError(null);
      console.log(`🔵 [AuthContext] พยายามลงชื่อเข้าใช้ด้วย identifier: ${identifier}`);

      try {
        // เรียก API /api/auth/signin เพื่อตรวจสอบข้อมูลกับ User model
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          let errorMessage = data.error || "การลงชื่อเข้าใช้ล้มเหลว";
          let verificationRequired = false;
          if (errorMessage.includes("ยังไม่ได้ยืนยันอีเมล")) {
            errorMessage = "บัญชีของคุณยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมาย";
            verificationRequired = true;
          } else if (errorMessage.includes("ไม่ถูกต้อง")) {
            errorMessage = "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
          } else if (errorMessage.includes("ถูกปิดใช้งาน")) {
            errorMessage = "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแล";
          } else if (errorMessage.includes("ถูกระงับ")) {
            errorMessage = data.error; // ใช้ข้อความจาก API เช่น "บัญชีนี้ถูกระงับจนถึง..."
          }
          console.warn(`⚠️ [AuthContext] ลงชื่อเข้าใช้ล้มเหลว: ${errorMessage}`);
          setAuthError(errorMessage);
          return { error: errorMessage, success: false, verificationRequired, ok: false };
        }

        // ถ้าสำเร็จ ใช้ nextAuthSignIn เพื่อสร้าง session
        const signInResult = await nextAuthSignIn("credentials", {
          redirect: false,
          identifier,
          password,
        });

        if (signInResult?.error) {
          console.warn(`⚠️ [AuthContext] การสร้าง session ล้มเหลว: ${signInResult.error}`);
          setAuthError(signInResult.error);
          return { error: signInResult.error, success: false, ok: false };
        }

        console.log(`✅ [AuthContext] ลงชื่อเข้าใช้สำเร็จ: ${identifier}`);
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        return { success: true, ok: true };
      } catch (error: any) {
        console.error("❌ [AuthContext] ข้อผิดพลาดระหว่าง signInWithCredentials:", error);
        const message = error.message || "เกิดข้อผิดพลาดระหว่างการลงชื่อเข้าใช้";
        setAuthError(message);
        return { error: message, success: false, ok: false };
      } finally {
        setLoading(false);
      }
    },
    [queryClient]
  );

  const signInWithSocial = useCallback(async (provider: string): Promise<void> => {
    setLoading(true);
    setAuthError(null);
    console.log(`🔵 [AuthContext] พยายามลงชื่อเข้าใช้ด้วย social provider: ${provider}`);
    try {
      // เรียก NextAuth social provider ผ่าน /api/auth/social (สมมติว่าใช้ [...nextauth])
      const result = await nextAuthSignIn(provider, {
        redirect: true,
        callbackUrl: "/",
      });

      if (result?.error) {
        console.warn(`⚠️ [AuthContext] Social sign-in (${provider}) ล้มเหลว: ${result.error}`);
        let errorMessage = result.error;
        if (errorMessage.includes("OAuthAccountNotLinked")) {
          errorMessage = "บัญชีโซเชียลนี้ยังไม่ได้เชื่อมโยง หรืออีเมลอาจถูกใช้กับบัญชีอื่น";
        }
        setAuthError(errorMessage);
      } else {
        console.log(`✅ [AuthContext] Social sign-in (${provider}) สำเร็จ`);
        await queryClient.invalidateQueries({ queryKey: ["session"] });
      }
    } catch (error: any) {
      console.error(`❌ [AuthContext] ข้อผิดพลาดระหว่าง signInWithSocial (${provider}):`, error);
      setAuthError(error.message || `เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย ${provider}`);
    } finally {
      // ไม่ตั้ง setLoading(false) เพราะจะ redirect
    }
  }, [queryClient]);

  const signUp = useCallback(
    async (
      email: string,
      username: string,
      password: string,
      recaptchaToken: string
    ): Promise<{ error?: string; success?: boolean; message?: string }> => {
      setLoading(true);
      setAuthError(null);
      console.log(`🔵 [AuthContext] ส่งคำขอสมัครสมาชิก: ${username} (${email})`);
      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password, recaptchaToken }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          const errorMessage = data.error || `การสมัครสมาชิกล้มเหลว (สถานะ: ${response.status})`;
          console.warn(`⚠️ [AuthContext] การสมัครสมาชิกล้มเหลว: ${errorMessage}`);
          setAuthError(errorMessage);
          return { error: errorMessage, success: false };
        }

        console.log(`✅ [AuthContext] สมัครสมาชิกสำเร็จ: ${username} (${email})`);
        return { success: true, message: data.message || "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี" };
      } catch (error: any) {
        console.error("❌ [AuthContext] ข้อผิดพลาดระหว่าง signUp:", error);
        const errorMessage = error.message || "เกิดข้อผิดพลาดระหว่างการสมัครสมาชิก";
        setAuthError(errorMessage);
        return { error: errorMessage, success: false };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    console.log(`🔵 [AuthContext] กำลังออกจากระบบ...`);
    try {
      await nextAuthSignOut({ redirect: true, callbackUrl: "/" });
      console.log(`✅ [AuthContext] ออกจากระบบสำเร็จ`);
    } catch (error: any) {
      console.error("❌ [AuthContext] ข้อผิดพลาดระหว่าง signOut:", error);
      setAuthError(error.message || "เกิดข้อผิดพลาดในการออกจากระบบ");
      setLoading(false);
    }
  }, []);

  const contextValue: AuthContextType = {
    user,
    status: nextAuthStatus,
    signInWithCredentials,
    signInWithSocial,
    signUp,
    signOut,
    loading,
    authError,
    setAuthError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth ต้องถูกใช้ภายใน AuthProvider");
  }
  return context;
};