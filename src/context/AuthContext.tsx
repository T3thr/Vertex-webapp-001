// src/context/AuthContext.tsx
// คอนเท็กซ์สำหรับจัดการการยืนยันตัวตนของผู้ใช้
// รองรับการลงชื่อเข้าใช้ สมัครสมาชิก และออกจากระบบ
// อัปเดต: ปรับ signInWithCredentials ให้ทำงานกับ /api/auth/signin, signInWithSocial กับ OAuth providers, และ signUp กับ /api/auth/signup (ซึ่งจะ verify reCAPTCHA อีกครั้ง)
// อัปเดต: แก้ไข dependency array ของ signUp useCallback

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
    password: string
  ) => Promise<{ error?: string; success?: boolean; verificationRequired?: boolean; ok?: boolean }>;
  signInWithSocial: (provider: string) => Promise<void>;
  signUp: ( // Method สำหรับการสมัครสมาชิก
    email: string,
    username: string,
    password: string,
    recaptchaToken: string // รับ recaptchaToken ที่ได้จาก client-side reCAPTCHA
  ) => Promise<{ error?: string; success?: boolean; message?: string }>;
  signOut: () => Promise<void>;
  loading: boolean; // สถานะการโหลดโดยรวมของ AuthContext
  authError: string | null; // ข้อความผิดพลาด
  setAuthError: (error: string | null) => void; // ฟังก์ชันสำหรับตั้งค่าข้อความผิดพลาด
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { data: session, status: nextAuthStatus } = useSession();
  const user = session?.user as SessionUser | null;
  const [loading, setLoading] = useState<boolean>(false); // สถานะการโหลดสำหรับ context นี้
  const [authError, setAuthError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user || nextAuthStatus !== 'loading') {
      setAuthError(null); // ล้าง error เมื่อสถานะผู้ใช้เปลี่ยน หรือโหลดเสร็จ
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
            errorMessage = data.error;
          }

          console.warn(`⚠️ [AuthContext] ลงชื่อเข้าใช้ล้มเหลว: ${errorMessage}`);
          setAuthError(errorMessage);
          return { error: errorMessage, success: false, verificationRequired, ok: false };
        }

        // ถ้า API /api/auth/signin สำเร็จ ให้ทำการ signIn ผ่าน NextAuth
        // identifier ที่ส่งไป NextAuth ควรเป็น email หรือ username ที่ใช้ใน authorize callback
        // โดยทั่วไปจะเป็น email หรือ username ที่ผู้ใช้กรอก แล้วแต่การตั้งค่า
        // ถ้า /api/auth/signin คืน user object มา, สามารถใช้ข้อมูลนั้นได้
        // แต่ในที่นี้ ให้ NextAuth เรียก authorize callback ของตัวเองอีกที (ซึ่งจะปลอดภัยกว่า)
        const finalIdentifierForNextAuth = data.user?.email || data.user?.username || identifier;

        console.log(`🔵 [AuthContext] เรียก nextAuthSignIn ด้วย identifier: ${finalIdentifierForNextAuth}`);
        const signInResult = await nextAuthSignIn("credentials", {
          redirect: false,
          identifier: finalIdentifierForNextAuth, // ใช้ identifier ที่ API ยืนยันแล้ว หรือที่ user กรอก
          password, // ส่ง password ไปด้วยเพื่อให้ authorize function ของ NextAuth ทำงานได้
        });


        if (signInResult?.error) {
          console.warn(`⚠️ [AuthContext] การสร้าง session ล้มเหลว (NextAuth): ${signInResult.error}`);
          let nextAuthErrorMessage = "การสร้างเซสชันล้มเหลว";
          if (signInResult.error.includes("CredentialsSignin")) {
            // Error นี้มักจะหมายความว่า authorize callback ใน NextAuth options คืน null หรือ error
            // ซึ่งอาจจะเกิดจาก /api/auth/signin ที่ถูกเรียกจาก authorize callback ไม่ผ่าน
            nextAuthErrorMessage = "ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง (NextAuth)";
          } else if (signInResult.error.includes("User not found") || signInResult.error.includes("Incorrect password")) {
             nextAuthErrorMessage = "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
          } else if (signInResult.error.includes("Email not verified")) {
            nextAuthErrorMessage = "บัญชีของคุณยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมาย";
          }
          setAuthError(nextAuthErrorMessage);
          return { error: nextAuthErrorMessage, success: false, ok: false };
        }

        console.log(`✅ [AuthContext] ลงชื่อเข้าใช้สำเร็จ (สร้าง session): ${identifier}`);
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
    [queryClient, setLoading, setAuthError] // เพิ่ม setLoading และ setAuthError ใน dependencies
  );

  const signInWithSocial = useCallback(async (provider: string): Promise<void> => {
    setLoading(true);
    setAuthError(null);
    console.log(`🔵 [AuthContext] พยายามลงชื่อเข้าใช้ด้วย social provider: ${provider}`);
    try {
      const result = await nextAuthSignIn(provider, {
        redirect: true,
        callbackUrl: "/",
      });

      if (result?.error) { // ส่วนนี้อาจจะไม่ถูกเรียกถ้า redirect สำเร็จ
        console.warn(`⚠️ [AuthContext] Social sign-in (${provider}) ล้มเหลว: ${result.error}`);
        let errorMessage = result.error;
        if (errorMessage.includes("OAuthAccountNotLinked")) {
          errorMessage = "บัญชีโซเชียลนี้ยังไม่ได้เชื่อมโยง หรืออีเมลอาจถูกใช้กับบัญชีอื่นแล้ว";
        } else if (errorMessage.includes("Callback") || errorMessage.toLowerCase().includes("oauth_callback_error")) {
          errorMessage = `เกิดปัญหาในการเชื่อมต่อกับ ${provider} กรุณาลองอีกครั้ง`;
        }
        setAuthError(errorMessage);
        if (!result.url) setLoading(false); // ถ้าไม่ redirect ให้คืนสถานะ loading
      } else {
        console.log(`✅ [AuthContext] Social sign-in (${provider}) เริ่มต้นสำเร็จ, กำลัง redirect...`);
        // ไม่ setLoading(false) เพราะจะ redirect
      }
    } catch (error: any) {
      console.error(`❌ [AuthContext] ข้อผิดพลาดระหว่าง signInWithSocial (${provider}):`, error);
      setAuthError(error.message || `เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย ${provider}`);
      setLoading(false);
    }
  }, [setLoading, setAuthError]); // เพิ่ม setLoading และ setAuthError


  const signUp = useCallback(
    async (
      email: string,
      username: string,
      password: string,
      recaptchaToken: string
    ): Promise<{ error?: string; success?: boolean; message?: string }> => {
      setLoading(true);
      setAuthError(null);
      console.log(`🔵 [AuthContext] ส่งคำขอสมัครสมาชิก: ${username} (${email}) พร้อม reCAPTCHA token (token: ${recaptchaToken ? recaptchaToken.substring(0,10)+'...' : 'N/A'})`);
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

        console.log(`✅ [AuthContext] สมัครสมาชิกสำเร็จ: ${username} (${email}), Message: ${data.message}`);
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
    [setLoading, setAuthError] // แก้ไข dependency array
  );


  const signOut = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    console.log(`🔵 [AuthContext] กำลังออกจากระบบ...`);
    try {
      await nextAuthSignOut({ redirect: true, callbackUrl: "/" });
      console.log(`✅ [AuthContext] ออกจากระบบสำเร็จ, กำลัง redirect...`);
      // queryClient.removeQueries({ queryKey: ["session"] }); // NextAuth จัดการ session update ผ่าน useSession
    } catch (error: any) {
      console.error("❌ [AuthContext] ข้อผิดพลาดระหว่าง signOut:", error);
      setAuthError(error.message || "เกิดข้อผิดพลาดในการออกจากระบบ");
      setLoading(false);
    }
  }, [setLoading, setAuthError, queryClient]); // queryClient อาจไม่จำเป็นถ้า NextAuth จัดการ session update

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