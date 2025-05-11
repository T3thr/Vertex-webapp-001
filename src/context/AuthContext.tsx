// src/context/AuthContext.tsx
// คอนเท็กซ์สำหรับจัดการการยืนยันตัวตนของผู้ใช้
// รองรับการลงชื่อเข้าใช้ สมัครสมาชิก และออกจากระบบ
// อัปเดต: ปรับ signInWithCredentials ให้ทำงานกับ /api/auth/signin, signInWithSocial กับ OAuth providers, และ signUp กับ /api/auth/signup (ซึ่งจะ verify reCAPTCHA อีกครั้ง)

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
        // API นี้จะจัดการ logic การตรวจสอบ credentials ทั้งหมด
        const response = await fetch("/api/auth/signin", { // Endpoint ที่คุณสร้างไว้
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

        // ถ้า API /api/auth/signin สำเร็จ (หมายถึงข้อมูลถูกต้องและบัญชีพร้อมใช้งาน)
        // ให้ทำการ signIn ผ่าน NextAuth เพื่อสร้าง session
        const signInResult = await nextAuthSignIn("credentials", {
          redirect: false,
          // ส่งข้อมูลที่ API /api/auth/signin ยืนยันแล้วไปให้ NextAuth
          // โดยปกติ `authorize` ใน NextAuth options จะถูกเรียก
          // ซึ่ง authorize ของเราจะเรียก /api/auth/signin อีกครั้ง
          // นี่อาจดูซ้ำซ้อน แต่เป็น flow มาตรฐานถ้า authorize ของ NextAuth provider credentials
          // ไม่ได้จัดการ database logic โดยตรง
          // หาก /api/auth/signin ของคุณคืน user object ที่ NextAuth ต้องการ
          // คุณสามารถปรับ authorize ใน NextAuth options ให้ใช้ user object นั้นได้เลย
          // แต่ในกรณีนี้ เราจะให้ NextAuth เรียก authorize ของมันเอง
          identifier: data.user.username, // หรือ email, ขึ้นอยู่กับว่า authorize คาดหวังอะไร
          password, // รหัสผ่านเดิม (NextAuth ไม่ควรเก็บรหัสผ่าน)
          // อาจจะส่ง user object จาก data.user ไปให้ authorize โดยตรงถ้า NextAuth รองรับ
        });


        if (signInResult?.error) {
          console.warn(`⚠️ [AuthContext] การสร้าง session ล้มเหลว (NextAuth): ${signInResult.error}`);
          // แปล error message จาก NextAuth
          let nextAuthErrorMessage = "การสร้างเซสชันล้มเหลว";
          if (signInResult.error.includes("CredentialsSignin")) {
            nextAuthErrorMessage = "ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง (NextAuth)";
          }
          setAuthError(nextAuthErrorMessage);
          return { error: nextAuthErrorMessage, success: false, ok: false };
        }

        console.log(`✅ [AuthContext] ลงชื่อเข้าใช้สำเร็จ (สร้าง session): ${identifier}`);
        await queryClient.invalidateQueries({ queryKey: ["session"] }); // อัปเดต session cache
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
    [queryClient] // เพิ่ม queryClient ใน dependency array
  );

  const signInWithSocial = useCallback(async (provider: string): Promise<void> => {
    setLoading(true);
    setAuthError(null);
    console.log(`🔵 [AuthContext] พยายามลงชื่อเข้าใช้ด้วย social provider: ${provider}`);
    try {
      // เรียก NextAuth social provider โดยตรง
      // NextAuth จะจัดการการ redirect และ callback
      const result = await nextAuthSignIn(provider, {
        redirect: true, // ให้ NextAuth จัดการ redirect
        callbackUrl: "/", // URL ที่จะไปหลัง login สำเร็จ
      });

      // โค้ดส่วนนี้อาจจะไม่ถูกเรียกถ้า redirect สำเร็จ
      if (result?.error) {
        console.warn(`⚠️ [AuthContext] Social sign-in (${provider}) ล้มเหลว: ${result.error}`);
        let errorMessage = result.error;
        // ตัวอย่างการจัดการ error ที่พบบ่อย
        if (errorMessage.includes("OAuthAccountNotLinked")) {
          errorMessage = "บัญชีโซเชียลนี้ยังไม่ได้เชื่อมโยง หรืออีเมลอาจถูกใช้กับบัญชีอื่นแล้ว";
        } else if (errorMessage.includes("Callback")) {
          errorMessage = `เกิดปัญหาในการเชื่อมต่อกับ ${provider} กรุณาลองอีกครั้ง`;
        }
        setAuthError(errorMessage);
        // ไม่ setLoading(false) ที่นี่ เพราะถ้าสำเร็จจะ redirect ไปแล้ว
        // ถ้ามี error และไม่ redirect, ควร setLoading(false)
        if (!result.url) setLoading(false);
      } else {
        console.log(`✅ [AuthContext] Social sign-in (${provider}) เริ่มต้นสำเร็จ, กำลัง redirect...`);
        // ไม่ต้องทำอะไรมาก NextAuth จะจัดการ redirect
        // อาจจะต้อง queryClient.invalidateQueries หลัง redirect กลับมา (ใน useEffect ของหน้าที่ callbackUrl ไป)
      }
    } catch (error: any) {
      console.error(`❌ [AuthContext] ข้อผิดพลาดระหว่าง signInWithSocial (${provider}):`, error);
      setAuthError(error.message || `เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย ${provider}`);
      setLoading(false); // คืนสถานะปุ่มถ้ามี error
    }
    // ไม่ setLoading(false) โดยทั่วไปเพราะจะ redirect
  }, []);


  // signUp method ถูกปรับปรุงให้รับ recaptchaToken
  const signUp = useCallback(
    async (
      email: string,
      username: string,
      password: string,
      recaptchaToken: string // เพิ่ม recaptchaToken ที่นี่
    ): Promise<{ error?: string; success?: boolean; message?: string }> => {
      setLoading(true);
      setAuthError(null);
      console.log(`🔵 [AuthContext] ส่งคำขอสมัครสมาชิก: ${username} (${email}) พร้อม reCAPTCHA token`);
      try {
        // ส่งข้อมูลทั้งหมดไปยัง API /api/auth/signup
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password, recaptchaToken }), // ส่ง recaptchaToken ไปด้วย
        });

        const data = await response.json();

        if (!response.ok || !data.success) { // ตรวจสอบ data.success ด้วย
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
    [] // Dependencies (ถ้ามี)
  );


  const signOut = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    console.log(`🔵 [AuthContext] กำลังออกจากระบบ...`);
    try {
      await nextAuthSignOut({ redirect: true, callbackUrl: "/" }); // ให้ NextAuth จัดการ redirect
      console.log(`✅ [AuthContext] ออกจากระบบสำเร็จ, กำลัง redirect...`);
      // queryClient.removeQueries(["session"]); // ลบ session cache
      // ไม่จำเป็นต้อง setLoading(false) เพราะจะ redirect
    } catch (error: any) {
      console.error("❌ [AuthContext] ข้อผิดพลาดระหว่าง signOut:", error);
      setAuthError(error.message || "เกิดข้อผิดพลาดในการออกจากระบบ");
      setLoading(false); // คืนสถานะถ้า error และไม่ redirect
    }
  }, []);

  const contextValue: AuthContextType = {
    user,
    status: nextAuthStatus,
    signInWithCredentials,
    signInWithSocial,
    signUp, // เพิ่ม signUp ใน context
    signOut,
    loading,
    authError,
    setAuthError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Hook สำหรับใช้งาน AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth ต้องถูกใช้ภายใน AuthProvider");
  }
  return context;
};