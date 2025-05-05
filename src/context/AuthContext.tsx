// src/context/AuthContext.tsx

"use client";

// นำเข้าโมดูลที่จำเป็น
import { createContext, useContext, useCallback, ReactNode, useState, useEffect } from "react";
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { SessionUser } from "@/app/api/auth/[...nextauth]/options"; // ตรวจสอบ path ให้ถูกต้อง

// กำหนดประเภทสำหรับ AuthContext
interface AuthContextType {
  user: SessionUser | null;
  status: "authenticated" | "loading" | "unauthenticated";
  signIn: (providerOrEmail: string, password?: string, username?: string) => Promise<{ error?: string; success?: boolean }>;
  signUp: (email: string, username: string, password: string) => Promise<{ error?: string; success?: boolean }>;
  signOut: () => Promise<void>;
  loading: boolean; // เพิ่ม state สำหรับ loading การดำเนินการ (signIn, signUp)
}

// สร้าง AuthContext พร้อมค่าเริ่มต้นเป็น undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// กำหนด props สำหรับ AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// คอมโพเนนต์ AuthProvider
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { data: session, status, update } = useSession();
  const user = session?.user as SessionUser | null;
  const [loading, setLoading] = useState<boolean>(false); // State สำหรับ loading

  // ฟังก์ชันลงชื่อเข้าใช้ (รองรับทั้ง credentials และ social providers)
  const signIn = useCallback(
    async (providerOrEmail: string, password?: string, username?: string): Promise<{ error?: string; success?: boolean }> => {
      setLoading(true);
      try {
        const isSocialProvider = ["google", "facebook", "twitter", "apple", "line"].includes(
          providerOrEmail.toLowerCase()
        );

        let result;
        if (isSocialProvider) {
          // สำหรับ Social Provider, NextAuth จะจัดการ redirect เอง หรือเราจัดการ callback
          result = await nextAuthSignIn(providerOrEmail, {
            redirect: false, // ตั้งเป็น false เพื่อจัดการผลลัพธ์เอง
            // callbackUrl: "/dashboard", // สามารถกำหนด callbackUrl ที่นี่หรือใน options
          });
        } else {
          // สำหรับ Credentials Provider
          result = await nextAuthSignIn("credentials", {
            redirect: false, // สำคัญ: ตั้งเป็น false เพื่อรับผลลัพธ์และจัดการ error
            email: providerOrEmail, // ใช้ providerOrEmail เป็น email
            password: password,
            username: username || providerOrEmail, // อาจใช้ email หรือ username
          });
        }

        // ตรวจสอบผลลัพธ์จาก nextAuthSignIn
        if (result?.error) {
          console.error("❌ ข้อผิดพลาดจาก NextAuth signIn:", result.error);
          // แปลงข้อความ error บางอย่างให้เข้าใจง่ายขึ้น (ถ้าต้องการ)
          let errorMessage = result.error;
          if (errorMessage === "CredentialsSignin") {
            errorMessage = "อีเมล ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
          }
          return { error: errorMessage, success: false };
        }

        // ถ้าไม่มี error และเป็นการ login แบบ credentials หรือ social ที่ไม่ redirect
        // เราอาจจะต้อง update session ด้วยตนเอง (ถ้าจำเป็น)
        // await update(); // เรียก update เพื่อ refresh session data
        // โดยปกติ NextAuth จะจัดการอัปเดต session หลัง sign in สำเร็จ

        return { success: true }; // คืนค่าสำเร็จ

      } catch (error: any) {
        console.error("❌ ข้อผิดพลาดที่ไม่คาดคิดใน signIn function:", error);
        return { error: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการลงชื่อเข้าใช้", success: false };
      } finally {
        setLoading(false);
      }
    },
    [update] // ใส่ update ใน dependency array ของ useCallback
  );

  // ฟังก์ชันสมัครสมาชิก
  const signUp = useCallback(
    async (email: string, username: string, password: string): Promise<{ error?: string; success?: boolean }> => {
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
          // ถ้า API ตอบกลับมาพร้อม error message
          return { error: data.error || "การสมัครสมาชิกผิดพลาด", success: false };
        }

        // สมัครสมาชิกสำเร็จ, อาจจะทำการ signIn ต่อเลย (ถ้าต้องการ)
        // หรือแจ้งให้ผู้ใช้ไปหน้า signIn
        // ตัวอย่าง: ทำการ signIn ต่อทันที
        // const signInResult = await signIn(email, password, username);
        // if (signInResult.error) {
        //   return { error: `สมัครสำเร็จ แต่เข้าระบบอัตโนมัติไม่ได้: ${signInResult.error}` };
        // }

        return { success: true }; // คืนค่าสำเร็จ

      } catch (error: any) {
        console.error("❌ ข้อผิดพลาดในการสมัครสมาชิก:", error);
        return { error: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการสมัครสมาชิก", success: false };
      } finally {
        setLoading(false);
      }
    },
    [] // ไม่มี dependency ภายนอกในตอนนี้
  );

  // ฟังก์ชันออกจากระบบ
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      // เรียก signOut จาก NextAuth
      // สามารถระบุ callbackUrl เพื่อ redirect หลัง sign out
      await nextAuthSignOut({ redirect: true, callbackUrl: "/" });
      // ไม่จำเป็นต้อง update session ที่นี่ เพราะ NextAuth จะจัดการเอง
    } catch (error) {
      console.error("❌ ข้อผิดพลาดในการออกจากระบบ:", error);
      // อาจแสดงข้อความแจ้งเตือนผู้ใช้
    } finally {
      setLoading(false);
    }
  }, []);

  // ค่าที่จะส่งผ่าน Context
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

