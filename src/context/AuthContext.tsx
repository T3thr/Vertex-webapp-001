// src/context/AuthContext.tsx
// คอนเท็กซ์สำหรับจัดการการยืนยันตัวตนของผู้ใช้
// อัปเดต: ปรับปรุง signUp เพื่อจัดการข้อผิดพลาด reCAPTCHA และสถานะ loading
// อัปเดต: เพิ่มการตรวจสอบสถานะ loading เพื่อป้องกันการเรียก API ซ้ำ
// อัปเดต: ปรับ error messages ให้ชัดเจนและเป็นภาษาไทย
// แก้ไข: ปรับการเรียกใช้ nextAuthSignIn เพื่อให้สอดคล้องกับการใช้ identifier ใน nextauth options

import { createContext, useContext, useCallback, ReactNode, useState, useEffect } from "react";
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { SessionUser } from "@/app/api/auth/[...nextauth]/options"; // ตรวจสอบ path นี้ให้ถูกต้อง
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
    recaptchaToken: string // Token จาก client-side reCAPTCHA
  ) => Promise<{ error?: string; success?: boolean; message?: string }>;
  signOut: () => Promise<void>;
  loading: boolean; // สถานะ loading โดยรวมของ AuthContext operations
  authError: string | null; // ข้อความ error ล่าสุด
  setAuthError: (error: string | null) => void; // สำหรับการเคลียร์ error หรือตั้งค่าจากภายนอก (ถ้าจำเป็น)
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { data: session, status: nextAuthStatus } = useSession();
  const user = session?.user as SessionUser | null;
  const [loading, setLoading] = useState<boolean>(false); // สถานะ loading สำหรับ CUD operations ของ AuthContext
  const [authError, setAuthError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // เคลียร์ authError เมื่อ user เปลี่ยน หรือ session status ไม่ใช่ loading
  useEffect(() => {
    if (user || nextAuthStatus !== 'loading') {
      // อาจจะไม่ต้องการเคลียร์ error ทุกครั้งที่ user เปลี่ยน
      // แต่ถ้าเป็นการ sign-in/sign-up ใหม่ แล้วสำเร็จ ก็ควรเคลียร์
      // setAuthError(null); // พิจารณาว่าต้องการเคลียร์เมื่อไหร่
    }
  }, [user, nextAuthStatus]);

  const signInWithCredentials = useCallback(
    async (
      identifier: string,
      password: string
    ): Promise<{ error?: string; success?: boolean; verificationRequired?: boolean; ok?: boolean }> => {
      if (loading) {
        console.warn("⚠️ [AuthContext] การลงชื่อเข้าใช้ถูกเรียกซ้ำขณะกำลังโหลด");
        return { error: "กำลังดำเนินการ กรุณารอสักครู่", success: false, ok: false };
      }
      setLoading(true);
      setAuthError(null); // เคลียร์ error เก่าก่อนเริ่ม
      console.log(`🔵 [AuthContext] พยายามลงชื่อเข้าใช้ด้วย identifier: ${identifier}`);

      try {
        // 1. เรียก API Backend ของเราเองก่อน (/api/auth/signin)
        // API นี้ควรจะตรวจสอบ credentials, สถานะบัญชี (verified, active, banned)
        // และคืนข้อมูล user ถ้าสำเร็จ หรือ error message ถ้าล้มเหลว
        console.log(`🔄 [AuthContext] ส่งคำขอไปยัง /api/auth/signin (custom backend)`);
        const backendResponse = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        });

        const backendData = await backendResponse.json();
        console.log(`ℹ️ [AuthContext] การตอบกลับจาก /api/auth/signin:`, backendData);

        if (!backendResponse.ok || backendData.error) {
          let errorMessage = backendData.error || "การลงชื่อเข้าใช้ล้มเหลวจากเซิร์ฟเวอร์";
          let verificationRequired = false;

          // ปรับปรุงการจัดการ error message จาก backendData
          if (typeof backendData.error === 'string') {
            if (backendData.error.includes("ยังไม่ได้ยืนยันอีเมล")) {
              errorMessage = "บัญชีของคุณยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมาย";
              verificationRequired = true;
            } else if (backendData.error.includes("ไม่ถูกต้อง") || backendData.error.includes("ไม่พบผู้ใช้")) {
              errorMessage = "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
            } else if (backendData.error.includes("ถูกปิดใช้งาน")) {
              errorMessage = "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแล";
            } else if (backendData.error.includes("ถูกระงับ")) {
              errorMessage = backendData.error; // ใช้ข้อความจาก backend โดยตรง
            }
          }

          console.warn(`⚠️ [AuthContext] ลงชื่อเข้าใช้ล้มเหลว (Backend API): ${errorMessage}`);
          setAuthError(errorMessage);
          return { error: errorMessage, success: false, verificationRequired, ok: false };
        }

        // ถ้า backend API ยืนยันสำเร็จ (backendData.success และ backendData.user มีข้อมูล)
        // ให้เรียก nextAuthSignIn เพื่อสร้าง session
        
        // แก้ไขตรงนี้: เราต้องส่ง identifier ให้กับ nextAuthSignIn แทนที่จะส่ง email
        // เพราะเราได้แก้ไข CredentialsProvider ให้รับ identifier แทน email และ username
        console.log(`🔵 [AuthContext] เรียก nextAuthSignIn ด้วย identifier: ${identifier} (หลัง Backend API ตรวจสอบผ่าน)`);

        const signInResult = await nextAuthSignIn("credentials", {
          redirect: false, // ไม่ redirect อัตโนมัติ, จัดการเอง
          identifier: identifier, // ส่ง identifier ที่ได้รับจาก user input โดยตรง
          password, // NextAuth's authorize อาจจะยังต้องการ password เพื่อ re-validate หรือเพื่อ flow อื่นๆ
        });

        if (signInResult?.error) {
          console.warn(`⚠️ [AuthContext] การสร้าง session ล้มเหลว (NextAuth): ${signInResult.error}`);
          // แปล error ของ NextAuth ให้เป็นมิตรกับผู้ใช้
          let nextAuthErrorMessage = "การสร้างเซสชันล้มเหลว";
          if (signInResult.error.includes("CredentialsSignin")) {
            // Error นี้มักจะ generic, error ที่แท้จริงควรมาจาก authorize function
            // ถ้า authorize ของเราคืน null หรือ error object, มันจะถูกแปลงเป็น CredentialsSignin
            // ดังนั้น error message ที่ละเอียดกว่าควรมาจาก backend API ของเรา
            nextAuthErrorMessage = backendData.error || "ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง (NextAuth)";
          } else if (signInResult.error.includes("User not found") || signInResult.error.includes("Incorrect password")) {
            nextAuthErrorMessage = "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง (NextAuth)";
          } else if (signInResult.error.includes("Email not verified")) {
            // ถ้า authorize ของ NextAuth มีการเช็ค email verified เอง
             nextAuthErrorMessage = "บัญชีของคุณยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมาย (NextAuth)";
          }
          setAuthError(nextAuthErrorMessage);
          return { error: nextAuthErrorMessage, success: false, ok: false };
        }

        if (signInResult?.ok) {
            console.log(`✅ [AuthContext] ลงชื่อเข้าใช้สำเร็จ และ Session สร้างโดย NextAuth: ${identifier}`);
            await queryClient.invalidateQueries({ queryKey: ["session"] }); // Invalidate session query (e.g., for useSession)
            // onClose(); // ถ้ามีการส่ง onClose callback มา ก็เรียกที่นี่
            return { success: true, ok: true };
        } else {
            // กรณีที่ signInResult ไม่ ok และไม่มี error (ไม่ควรเกิดขึ้นบ่อย)
            console.warn(`⚠️ [AuthContext] NextAuth signInResult ไม่ ok แต่ไม่มี error object`);
            setAuthError("เกิดปัญหาในการสร้างเซสชัน (NextAuth)");
            return { error: "เกิดปัญหาในการสร้างเซสชัน (NextAuth)", success: false, ok: false};
        }

      } catch (error: any) {
        console.error("❌ [AuthContext] ข้อผิดพลาดร้ายแรงระหว่าง signInWithCredentials:", error);
        const message = error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการลงชื่อเข้าใช้";
        setAuthError(message);
        return { error: message, success: false, ok: false };
      } finally {
        setLoading(false);
      }
    },
    [queryClient, loading, setLoading, setAuthError] // Removed signIn (NextAuth) from deps if not used directly
  );

  const signInWithSocial = useCallback(async (provider: string): Promise<void> => {
    if (loading) {
      console.warn("⚠️ [AuthContext] การลงชื่อเข้าใช้ด้วย social ถูกเรียกซ้ำขณะกำลังโหลด");
      // อาจจะ return Promise.reject หรือ throw error แทนการไม่ทำอะไรเลย
      throw new Error("กำลังดำเนินการ กรุณารอสักครู่");
    }
    setLoading(true);
    setAuthError(null);
    console.log(`🔵 [AuthContext] พยายามลงชื่อเข้าใช้ด้วย social provider - provider: ${provider}`);
    try {
      // callbackUrl สามารถตั้งค่าได้ที่นี่ หรือใน NextAuth config
      // ถ้าตั้งที่นี่ จะ override ค่า default
      const result = await nextAuthSignIn(provider, {
        redirect: true, // โดยปกติ social sign-in จะ redirect
        callbackUrl: "/", // หน้าที่จะไปหลัง sign-in สำเร็จ
      });

      // ถ้า redirect: true, โค้ดส่วนนี้อาจจะไม่ถูก execute ถ้า redirect เกิดขึ้นทันที
      if (result?.error) {
        console.warn(`⚠️ [AuthContext] Social sign-in (${provider}) ล้มเหลว: ${result.error}`);
        let errorMessage = result.error;
        // แปล error ของ NextAuth Oauth
        if (errorMessage.includes("OAuthAccountNotLinked")) {
          // Error นี้หมายความว่าผู้ใช้ authenticate กับ provider ได้
          // แต่ email ที่ได้จาก provider นั้นมีอยู่ในระบบแล้ว แต่ไม่ได้ link กับ provider นี้
          // หรือ email นั้นถูกใช้โดยบัญชี local (credentials)
          errorMessage = "บัญชีโซเชียลนี้ยังไม่ได้เชื่อมโยง หรืออีเมลนี้อาจถูกใช้กับบัญชีอื่นแล้ว กรุณาลงชื่อเข้าใช้ด้วยวิธีเดิมแล้วเชื่อมโยงบัญชี หรือใช้อีเมลอื่น";
        } else if (errorMessage.includes("Callback") || errorMessage.toLowerCase().includes("oauth_callback_error")) {
          errorMessage = `เกิดปัญหาในการเชื่อมต่อกับ ${provider} กรุณาลองอีกครั้ง หรือตรวจสอบการตั้งค่า`;
        } else if (errorMessage.toLowerCase().includes("access_denied")) {
            errorMessage = `คุณปฏิเสธการเข้าถึงจาก ${provider}`;
        }
        setAuthError(errorMessage);
        // ถ้ามี result.url แสดงว่า NextAuth พยายาม redirect ไปหน้า error page ของมัน
        // ถ้าไม่มี result.url หรือ redirect ไม่สำเร็จ, เราต้อง setLoading(false) เอง
        if (!result.url) setLoading(false);
      } else {
        // ถ้า redirect: true และสำเร็จ, หน้าน่าจะเปลี่ยนไปแล้ว
        console.log(`✅ [AuthContext] Social sign-in (${provider}) เริ่มต้นสำเร็จ, กำลัง redirect...`);
        // ไม่จำเป็นต้อง setLoading(false) ที่นี่ถ้า redirect สำเร็จ
      }
    } catch (error: any) {
      console.error(`❌ [AuthContext] ข้อผิดพลาดระหว่าง signInWithSocial (${provider}):`, error);
      setAuthError(error.message || `เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย ${provider}`);
      setLoading(false); // ต้อง setLoading(false) ใน catch block
    }
    // setLoading(false) อาจจะต้องอยู่ใน finally block ถ้า signInWithSocial ไม่ได้ redirect เสมอไป
    // แต่เนื่องจากเราตั้ง redirect: true, การ setLoading(false) ที่นี่อาจจะไม่ถูกเรียกถ้า redirect
  }, [loading, setLoading, setAuthError]); // nextAuthSignIn เป็นฟังก์ชันเสถียร ไม่ต้องใส่ใน deps

  const signUp = useCallback(
    async (
      email: string,
      username: string,
      password: string,
      recaptchaToken: string // Token ที่ได้รับจาก AuthModal
    ): Promise<{ error?: string; success?: boolean; message?: string }> => {
      if (loading) {
        console.warn("⚠️ [AuthContext] การสมัครสมาชิกถูกเรียกซ้ำขณะกำลังโหลด");
        return { error: "กำลังดำเนินการ กรุณารอสักครู่", success: false };
      }
      setLoading(true);
      setAuthError(null);
      console.log(`🔵 [AuthContext] ส่งคำขอสมัครสมาชิก: ${username} (${email}) พร้อม reCAPTCHA token`);

      try {
        // เรียก API endpoint /api/auth/signup ของเรา
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password, recaptchaToken }),
        });

        const data = await response.json();
        console.log(`ℹ️ [AuthContext] การตอบกลับจาก /api/auth/signup:`, data);

        if (!response.ok || !data.success) {
          // data.error ควรมีข้อความจาก backend (รวมถึง reCAPTCHA error จาก /api/auth/signup)
          let errorMessage = data.error || "การสมัครสมาชิกล้มเหลว";

          // แปล error message ให้เป็นมิตรกับผู้ใช้ (ถ้าจำเป็น)
          // Error จาก reCAPTCHA จะถูกจัดการและส่งมาจาก /api/auth/signup แล้ว
          // เช่น "การยืนยัน reCAPTCHA หมดเวลาหรือซ้ำซ้อน กรุณาลองใหม่"
          if (typeof data.error === 'string') {
            if (data.error.includes("อีเมลนี้ถูกใช้งานแล้ว")) {
              errorMessage = "อีเมลนี้ถูกใช้งานแล้ว";
            } else if (data.error.includes("ชื่อผู้ใช้นี้ถูกใช้งานแล้ว")) {
              errorMessage = "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว";
            } else if (data.error.includes("reCAPTCHA")) {
               // ข้อความ error จาก reCAPTCHA ที่มาจาก backend ควรจะชัดเจนอยู่แล้ว
               // เช่น "การยืนยัน reCAPTCHA ล้มเหลว", "โทเค็น reCAPTCHA ไม่ถูกต้อง"
               errorMessage = data.error;
            }
          }
          console.warn(`⚠️ [AuthContext] การสมัครสมาชิกล้มเหลว: ${errorMessage}`);
          setAuthError(errorMessage);
          return { error: errorMessage, success: false };
        }

        // สมัครสมาชิกสำเร็จ
        console.log(`✅ [AuthContext] สมัครสมาชิกสำเร็จ (จาก Backend API): ${username} (${email}), Message: ${data.message}`);
        // data.message ควรมีข้อความเช่น "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี"
        return { success: true, message: data.message || "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี" };

      } catch (error: any) {
        console.error("❌ [AuthContext] ข้อผิดพลาดร้ายแรงระหว่าง signUp:", error);
        const errorMessage = error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการสมัครสมาชิก";
        setAuthError(errorMessage);
        return { error: errorMessage, success: false };
      } finally {
        setLoading(false);
      }
    },
    [loading, setLoading, setAuthError]
  );

  const signOut = useCallback(async () => {
    if (loading && nextAuthStatus !== 'authenticated') { // อนุญาตให้ออกจากระบบได้แม้ loading ถ้า authenticated
      console.warn("⚠️ [AuthContext] การออกจากระบบถูกเรียกซ้ำขณะกำลังโหลด หรือไม่ได้ authenticated");
      return;
    }
    // setLoading(true); // การ signOut ของ NextAuth มักจะเร็ว และจัดการ loading UI ของมันเอง
    setAuthError(null);
    console.log(`🔵 [AuthContext] กำลังออกจากระบบ... Session status: ${nextAuthStatus}`);
    try {
      // callbackUrl: หน้าที่จะไปหลัง sign out สำเร็จ
      await nextAuthSignOut({ redirect: true, callbackUrl: "/" });
      // ถ้า redirect: true, โค้ดส่วนล่างนี้อาจจะไม่ถูก execute
      console.log(`✅ [AuthContext] ออกจากระบบสำเร็จ, กำลัง redirect...`);
      // queryClient.clear(); // อาจจะเคลียร์ cache ทั้งหมดของ react-query
      // queryClient.removeQueries(); // หรือลบ query ที่เจาะจง
    } catch (error: any) {
      console.error("❌ [AuthContext] ข้อผิดพลาดระหว่าง signOut:", error);
      setAuthError(error.message || "เกิดข้อผิดพลาดในการออกจากระบบ");
      // setLoading(false); // คืนค่า loading ถ้า signOut ล้มเหลวและไม่ redirect
    }
    // ไม่ควร setLoading(false) ที่นี่ถ้า redirect สำเร็จ
  }, [loading, nextAuthStatus, setAuthError /* queryClient, setLoading */]); // nextAuthSignOut เป็นฟังก์ชันเสถียร

  const contextValue: AuthContextType = {
    user,
    status: nextAuthStatus,
    signInWithCredentials,
    signInWithSocial,
    signUp,
    signOut,
    loading, // สถานะ loading จาก AuthContext เอง
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