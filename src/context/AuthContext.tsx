// src/context/AuthContext.tsx
// คอนเท็กซ์สำหรับจัดการการยืนยันตัวตนของผู้ใช้
// รองรับการลงชื่อเข้าใช้ สมัครสมาชิก และออกจากระบบ

import { createContext, useContext, useCallback, ReactNode, useState } from "react";
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { SessionUser } from "@/app/api/auth/[...nextauth]/options";
import { useQueryClient } from "@tanstack/react-query";

// อินเทอร์เฟซสำหรับ AuthContext
interface AuthContextType {
  user: SessionUser | null;
  status: "authenticated" | "loading" | "unauthenticated";
  signIn: (
    providerOrIdentifier: string,
    password?: string
  ) => Promise<{ error?: string; success?: boolean; verificationRequired?: boolean }>;
  signUp: (
    email: string,
    username: string,
    password: string,
    recaptchaToken: string
  ) => Promise<{ error?: string; success?: boolean; message?: string }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { data: session, status } = useSession();
  const user = session?.user as SessionUser | null;
  const [loading, setLoading] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // ฟังก์ชันลงชื่อเข้าใช้
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
          let errorMessage = result.error;
          let verificationRequired = false;

          if (errorMessage.includes("ยังไม่ได้ยืนยันอีเมล")) {
            errorMessage = "บัญชีของคุณยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมายเข้าและสแปมของคุณ";
            verificationRequired = true;
          } else if (errorMessage.includes("บัญชีนี้ถูกแบน")) {
            errorMessage = result.error;
          } else if (errorMessage.includes("บัญชีนี้ถูกระงับการใช้งาน")) {
            errorMessage = "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อฝ่ายสนับสนุน";
          } else if (errorMessage === "CredentialsSignin") {
            errorMessage = "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
          } else if (errorMessage.includes("ไม่ได้รับข้อมูลที่เพียงพอจาก Twitter")) {
            errorMessage = "ไม่สามารถลงชื่อเข้าใช้ด้วย Twitter เนื่องจากข้อมูลไม่ครบถ้วน";
          } else if (errorMessage.includes("ไม่ได้รับอีเมลจาก")) {
            errorMessage = "ไม่สามารถลงชื่อเข้าใช้เนื่องจากไม่ได้รับข้อมูลอีเมลจากผู้ให้บริการ";
          } else {
            errorMessage = "เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ กรุณาลองใหม่";
          }

          return { error: errorMessage, success: false, verificationRequired };
        }

        // รีเฟรชแคชเซสชัน
        queryClient.invalidateQueries({ queryKey: ["session"] });
        return { success: true };
      } catch (error: any) {
        return { error: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการลงชื่อเข้าใช้", success: false };
      } finally {
        setLoading(false);
      }
    },
    [queryClient]
  );

  // ฟังก์ชันสมัครสมาชิก
  const signUp = useCallback(
    async (
      email: string,
      username: string,
      password: string,
      recaptchaToken: string
    ): Promise<{ error?: string; success?: boolean; message?: string }> => {
      setLoading(true);
      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, username, password, recaptchaToken }),
        });

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          const responseText = await response.text();
          return {
            error: `การตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง (สถานะ: ${response.status})`,
            success: false,
          };
        }

        if (!response.ok) {
          let errorMessage = data.error || "การสมัครสมาชิกผิดพลาด";
          if (data.error?.includes("ถูกใช้งานแล้ว")) {
            errorMessage = data.error;
          }
          return { error: errorMessage, success: false };
        }

        return { success: true, message: data.message || "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมล" };
      } catch (error: any) {
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
      queryClient.invalidateQueries({ queryKey: ["session"] });
    } catch (error) {
      console.error("❌ [AuthContext] ข้อผิดพลาดระหว่างการออกจากระบบ:", error);
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth ต้องถูกใช้ภายใน AuthProvider");
  }
  return context;
};