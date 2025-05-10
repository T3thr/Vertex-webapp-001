// src/context/AuthContext.tsx
// คอนเท็กซ์สำหรับจัดการการยืนยันตัวตนของผู้ใช้
// รองรับการลงชื่อเข้าใช้ สมัครสมาชิก และออกจากระบบ

import { createContext, useContext, useCallback, ReactNode, useState, useEffect } from "react";
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { SessionUser } from "@/app/api/auth/[...nextauth]/options"; // ตรวจสอบ path
import { useQueryClient } from "@tanstack/react-query";

// อินเทอร์เฟซสำหรับ AuthContext
interface AuthContextType {
  user: SessionUser | null;
  status: "authenticated" | "loading" | "unauthenticated";
  signInWithCredentials: (
    identifier: string,
    password?: string
  ) => Promise<{ error?: string; success?: boolean; verificationRequired?: boolean; ok?: boolean }>;
  signInWithSocial: (provider: string) => Promise<void>;
  signUp: ( // ฟังก์ชันสมัครสมาชิก
    email: string,
    username: string,
    password: string,
    recaptchaToken: string // reCAPTCHA token ที่ได้จาก client-side และถูก verify *เบื้องต้น* โดย /api/verify-recaptcha แล้ว
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
    if (user || nextAuthStatus !== 'loading') { // ล้าง error เมื่อ user เปลี่ยน หรือ auth status ไม่ใช่ loading
        setAuthError(null);
    }
  }, [user, nextAuthStatus]);

  const signInWithCredentials = useCallback(
    async (
      identifier: string,
      password?: string
    ): Promise<{ error?: string; success?: boolean; verificationRequired?: boolean; ok?: boolean }> => {
      setLoading(true);
      setAuthError(null);
      console.log(`🔵 [AuthContext] กำลังพยายามลงชื่อเข้าใช้ด้วย credentials: ${identifier}`);
      try {
        const result = await nextAuthSignIn("credentials", {
          redirect: false,
          identifier,
          password,
        });

        if (result?.error) {
          let errorMessage = result.error;
          let verificationRequired = false;
          if (errorMessage.includes("ยังไม่ได้ยืนยันอีเมล") || errorMessage.toLowerCase().includes("email not verified")) {
            errorMessage = "บัญชีของคุณยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมายของคุณ";
            verificationRequired = true;
          } else if (errorMessage === "CredentialsSignin") {
            errorMessage = "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
          }
          console.warn(`⚠️ [AuthContext] ลงชื่อเข้าใช้ด้วย credentials ล้มเหลว: ${errorMessage}`);
          setAuthError(errorMessage);
          return { error: errorMessage, success: false, verificationRequired, ok: false };
        }

        if (result?.ok) {
          console.log(`✅ [AuthContext] ลงชื่อเข้าใช้ด้วย credentials สำเร็จ: ${identifier}`);
          await queryClient.invalidateQueries({ queryKey: ["session"] });
          return { success: true, ok: true };
        }

        const defaultError = "การลงชื่อเข้าใช้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
        console.warn(`⚠️ [AuthContext] ลงชื่อเข้าใช้ด้วย credentials ล้มเหลว (ไม่ทราบสาเหตุ): ${JSON.stringify(result)}`);
        setAuthError(defaultError);
        return { error: defaultError, success: false, ok: false };
      } catch (error: any) {
        console.error("❌ [AuthContext] ข้อผิดพลาดระหว่างการ signInWithCredentials:", error);
        const message = error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการลงชื่อเข้าใช้";
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
    console.log(`🔵 [AuthContext] กำลังพยายามลงชื่อเข้าใช้ด้วย social provider: ${provider}`);
    try {
      const result = await nextAuthSignIn(provider, {
        redirect: true,
        callbackUrl: "/",
      });

      if (result?.error) { // ส่วนนี้อาจไม่ถูกเรียกถ้า redirect เกิดขึ้น
        console.warn(`⚠️ [AuthContext] Social sign-in (${provider}) ล้มเหลว: ${result.error}`);
        let errorMessage = result.error;
        if (errorMessage.includes("OAuthAccountNotLinked")) {
             errorMessage = "บัญชีโซเชียลนี้ยังไม่ได้เชื่อมโยง หรืออีเมลอาจถูกใช้กับบัญชีอื่นแล้ว";
        }
        setAuthError(errorMessage);
      } else if (result?.ok) {
        console.log(`✅ [AuthContext] Social sign-in (${provider}) สำเร็จ (หรือกำลัง redirect)`);
        await queryClient.invalidateQueries({ queryKey: ["session"] });
      }
    } catch (error: any) {
      console.error(`❌ [AuthContext] ข้อผิดพลาดระหว่างการ signInWithSocial (${provider}):`, error);
      setAuthError(error.message || `เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย ${provider}`);
    } finally {
      // ไม่ตั้ง setLoading(false) ที่นี่ เพราะหน้าจะ redirect
    }
  }, [queryClient]);

  // ฟังก์ชันสมัครสมาชิก
  const signUp = useCallback(
    async (
      email: string,
      username: string,
      password: string,
      recaptchaToken: string // reCAPTCHA token ที่ถูก verify เบื้องต้นโดย /api/verify-recaptcha แล้ว
    ): Promise<{ error?: string; success?: boolean; message?: string }> => {
      setLoading(true);
      setAuthError(null);
      console.log(`🔵 [AuthContext] กำลังส่งคำขอสมัครสมาชิกไปยัง /api/auth/signup สำหรับ: ${username} (${email})`);
      try {
        // API endpoint /api/auth/signup จะทำการ verify reCAPTCHA token กับ Google *อีกครั้ง*
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password, recaptchaToken }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          const errorMessage = data.error || `การสมัครสมาชิกล้มเหลว (สถานะ: ${response.status})`;
          console.warn(`⚠️ [AuthContext] การสมัครสมาชิกผ่าน /api/auth/signup ล้มเหลว: ${errorMessage}`);
          setAuthError(errorMessage);
          return { error: errorMessage, success: false };
        }

        console.log(`✅ [AuthContext] การสมัครสมาชิกผ่าน /api/auth/signup สำเร็จ: ${username} (${email})`);
        return { success: true, message: data.message || "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี" };
      } catch (error: any) {
        console.error("❌ [AuthContext] ข้อผิดพลาดระหว่างการเรียก signUp API:", error);
        const errorMessage = error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการสมัครสมาชิก";
        setAuthError(errorMessage);
        return { error: errorMessage, success: false };
      } finally {
        setLoading(false);
      }
    },
    [] // Dependencies
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    console.log(`🔵 [AuthContext] กำลังออกจากระบบ...`);
    try {
      await nextAuthSignOut({ redirect: true, callbackUrl: "/" });
      // queryClient.invalidateQueries({ queryKey: ["session"] }); // NextAuth จัดการ session update เองเมื่อ redirect
      // queryClient.removeQueries({ queryKey: ["session"] });
      console.log(`✅ [AuthContext] ออกจากระบบ (กำลัง redirect)`);
    } catch (error: any) {
      console.error("❌ [AuthContext] ข้อผิดพลาดระหว่างการ signOut:", error);
      setAuthError(error.message || "เกิดข้อผิดพลาดในการออกจากระบบ");
      setLoading(false);
    }
  }, [queryClient]);

  const contextValue: AuthContextType = {
    user,
    status: nextAuthStatus,
    signInWithCredentials,
    signInWithSocial,
    signUp,
    signOut,
    loading, // State loading นี้จะถูกควบคุมโดยแต่ละฟังก์ชัน async
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