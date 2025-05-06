// src/context/AuthContext.tsx

import { createContext, useContext, useCallback, ReactNode, useState } from "react";
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { SessionUser } from "@/app/api/auth/[...nextauth]/options";

// กำหนดประเภทสำหรับ AuthContext
interface AuthContextType {
  user: SessionUser | null;
  status: "authenticated" | "loading" | "unauthenticated";
  signIn: (
    providerOrIdentifier: string,
    password?: string
  ) => Promise<{ error?: string; success?: boolean; verificationRequired?: boolean }>;
  signUp: (email: string, username: string, password: string) => Promise<{ error?: string; success?: boolean; message?: string }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

// สร้าง AuthContext พร้อมค่าเริ่มต้นเป็น undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// กำหนด props สำหรับ AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// คอมโพเนนต์ AuthProvider
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { data: session, status } = useSession();
  const user = session?.user as SessionUser | null;
  const [loading, setLoading] = useState<boolean>(false);

  // ฟังก์ชันลงชื่อเข้าใช้ (รองรับทั้ง credentials และ social providers)
  const signIn = useCallback(
    async (
      providerOrIdentifier: string,
      password?: string
    ): Promise<{ error?: string; success?: boolean; verificationRequired?: boolean }> => {
      setLoading(true);
      try {
        const isSocialProvider = ["google", "twitter", "facebook", "apple", "line"].includes(
          providerOrIdentifier.toLowerCase()
        );

        let result;
        if (isSocialProvider) {
          result = await nextAuthSignIn(providerOrIdentifier, {
            redirect: true,
            callbackUrl: "/",
          });
        } else {
          result = await nextAuthSignIn("credentials", {
            redirect: false,
            identifier: providerOrIdentifier,
            password,
          });
        }

        if (result?.error) {
          console.error("❌ [AuthContext] ข้อผิดพลาดจาก NextAuth signIn:", result.error);
          let errorMessage = result.error;
          let verificationRequired = false;

          if (errorMessage.includes("ยังไม่ได้ยืนยันอีเมล")) {
            errorMessage = "บัญชีของคุณยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมายเข้าและสแปมของคุณ";
            verificationRequired = true;
          } else if (errorMessage === "CredentialsSignin") {
            errorMessage = "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
          } else if (errorMessage.includes("ไม่ได้รับข้อมูลที่เพียงพอจาก Twitter")) {
            errorMessage = "ไม่สามารถลงชื่อเข้าใช้ด้วย Twitter เนื่องจากข้อมูลไม่ครบถ้วน";
          } else {
            errorMessage = "เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ กรุณาลองใหม่";
          }

          return { error: errorMessage, success: false, verificationRequired };
        }

        return { success: true };
      } catch (error: any) {
        console.error("❌ [AuthContext] ข้อผิดพลาดที่ไม่คาดคิดใน signIn:", error);
        return { error: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการลงชื่อเข้าใช้", success: false };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ฟังก์ชันสมัครสมาชิก
  const signUp = useCallback(
    async (email: string, username: string, password: string): Promise<{ error?: string; success?: boolean; message?: string }> => {
      setLoading(true);
      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { error: data.error || "การสมัครสมาชิกผิดพลาด", success: false };
        }

        return { success: true, message: data.message || "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมล" };
      } catch (error: any) {
        console.error("❌ [AuthContext] ข้อผิดพลาดระหว่างการสมัครสมาชิก:", error);
        return { error: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการสมัครสมาชิก", success: false };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ฟังก์ชันออกจากระบบ
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await nextAuthSignOut({ redirect: true, callbackUrl: "/" });
    } catch (error) {
      console.error("❌ [AuthContext] ข้อผิดพลาดระหว่างการออกจากระบบ:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ค่า context ที่จะส่งผ่าน
  const contextValue: AuthContextType = {
    user,
    status,
    signIn,
    signUp,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Hook สำหรับใช้ AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth ต้องถูกใช้ภายใน AuthProvider");
  }
  return context;
};