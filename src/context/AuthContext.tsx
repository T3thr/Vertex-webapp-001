// src/context/AuthContext.tsx
// คอนเท็กซ์สำหรับจัดการการยืนยันตัวตนของผู้ใช้
// อัปเดต: ปรับ Path การเรียก API ของ signInWithCredentials ให้ตรงกับโครงสร้างใหม่
// อัปเดต: ทำให้สอดคล้องกับ SessionUser และ IUser ที่อัปเดตแล้ว และคง Logic เดิมตามที่คุณต้องการ

import { createContext, useContext, useCallback, ReactNode, useState, useEffect } from "react";
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { SessionUser } from "@/app/api/auth/[...nextauth]/options"; // ตรวจสอบ path นี้ให้ถูกต้อง
import { useQueryClient } from "@tanstack/react-query";
import { IUser } from "@/backend/models/User"; // Import IUser เพื่อการ Type Hinting ที่แม่นยำ

// อินเทอร์เฟซสำหรับ AuthContext (คงโครงสร้างเดิมจากที่คุณให้มา)
interface AuthContextType {
  user: SessionUser | null;
  status: "authenticated" | "loading" | "unauthenticated";
  signInWithCredentials: (
    identifier: string,
    password: string
  ) => Promise<{ error?: string; success?: boolean; verificationRequired?: boolean; ok?: boolean; user?: SessionUser }>;
  signInWithSocial: (provider: string) => Promise<void>;
  signUp: (
    email: string,
    username: string,
    password: string,
    recaptchaToken: string
  ) => Promise<{ error?: string; success?: boolean; message?: string; userId?: string }>;
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
  const { data: session, status: nextAuthStatus, update: updateNextAuthSession } = useSession();
  const user = session?.user as SessionUser | null;
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // แก้ไข useEffect dependency array
  useEffect(() => {
    // เคลียร์ error ถ้าผู้ใช้ authenticate สำเร็จ หรือ session status ไม่ใช่ loading อีกต่อไป
    // และมี error ค้างอยู่
    if ((nextAuthStatus === 'authenticated' || (nextAuthStatus !== 'loading' && user)) && authError) {
      console.log("ℹ️ [AuthContext] เคลียร์ authError เนื่องจาก session/status เปลี่ยนแปลง");
      // setAuthError(null); // พิจารณาว่าต้องการเคลียร์ error อัตโนมัติหรือไม่ หรือให้ user action เป็นตัวเคลียร์
                           // การเคลียร์อัตโนมัติอาจทำให้ user ไม่เห็น error message ที่สำคัญ
                           // อาจจะดีกว่าถ้าเคลียร์เฉพาะตอนเริ่ม action ใหม่ (signIn, signUp)
    }
    // Dependency array ควรมีค่า primitive หรือ object ที่ stable identity
  }, [nextAuthStatus, user, authError]); // <--- ใช้ user object โดยตรง (ถ้า user identity stable)
                                        // หรือใช้ user?.id ถ้าต้องการ re-run เฉพาะเมื่อ user ID เปลี่ยน

  const signInWithCredentials = useCallback(
    async (
      identifier: string,
      password: string
    ): Promise<{ error?: string; success?: boolean; verificationRequired?: boolean; ok?: boolean; user?: SessionUser }> => {
      if (loading) {
        console.warn("⚠️ [AuthContext] signInWithCredentials ถูกเรียกซ้ำขณะกำลังโหลด");
        return { error: "กำลังดำเนินการ กรุณารอสักครู่", success: false, ok: false };
      }
      setLoading(true);
      setAuthError(null); // เคลียร์ error เก่าก่อนเริ่ม action ใหม่
      console.log(`🔵 [AuthContext] พยายามลงชื่อเข้าใช้ด้วย credentials (identifier: ${identifier})`);

      try {
        console.log(`🔄 [AuthContext] ส่งคำขอไปยัง /api/auth/signin/credentials`);
        const backendResponse = await fetch("/api/auth/signin/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        });

        const backendData = await backendResponse.json();
        console.log(`ℹ️ [AuthContext] การตอบกลับจาก /api/auth/signin/credentials:`, backendData);

        if (!backendResponse.ok || backendData.error) {
          let errorMessage = backendData.error || "การลงชื่อเข้าใช้ล้มเหลวจากเซิร์ฟเวอร์";
          let verificationRequired = false;

          if (typeof backendData.error === 'string') {
            if (backendData.error.includes("ยังไม่ได้ยืนยันอีเมล")) {
              errorMessage = "บัญชีของคุณยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมาย";
              verificationRequired = true;
            } else if (backendData.error.includes("ไม่ถูกต้อง") || backendData.error.includes("ไม่พบผู้ใช้")) {
              errorMessage = "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
            } else if (backendData.error.includes("ถูกปิดใช้งาน")) {
              errorMessage = "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแล";
            } else if (backendData.error.includes("ถูกระงับ")) {
              errorMessage = backendData.error;
            }
          }
          console.warn(`⚠️ [AuthContext] ลงชื่อเข้าใช้ล้มเหลว (Backend API): ${errorMessage}`);
          setAuthError(errorMessage);
          return { error: errorMessage, success: false, verificationRequired, ok: false };
        }

        console.log(`🔵 [AuthContext] Backend API ตรวจสอบ credentials ผ่าน, กำลังเรียก nextAuthSignIn...`);
        const signInResult = await nextAuthSignIn("credentials", {
          redirect: false,
          identifier: identifier,
          password,
        });

        if (signInResult?.error) {
          console.warn(`⚠️ [AuthContext] การสร้าง NextAuth session ล้มเหลว: ${signInResult.error}`);
          const finalErrorMessage = backendData.error || signInResult.error || "ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง (NextAuth)";
          setAuthError(finalErrorMessage);
          return { error: finalErrorMessage, success: false, ok: false };
        }

        if (signInResult?.ok) {
          console.log(`✅ [AuthContext] ลงชื่อเข้าใช้สำเร็จ และ Session สร้างโดย NextAuth: ${identifier}`);
          const apiUser = backendData.user as IUser;
          // **สำคัญ:** ตรวจสอบว่าทุก field ใน apiUser (IUser) ถูก map ไปยัง SessionUser อย่างถูกต้อง
          // โดยเฉพาะ nested objects เช่น profile, preferences, gamification etc.
          // ต้องแน่ใจว่าโครงสร้างตรงกัน หรือมีการ map ที่เหมาะสม
          const sessionUserPayload: SessionUser = {
            id: apiUser._id.toString(),
            name: apiUser.profile?.displayName || apiUser.username || "N/A",
            email: apiUser.email || undefined,
            username: apiUser.username || "N/A_username",
            roles: apiUser.roles,
            // --- ตรวจสอบการ Map Nested Objects ---
            profile: apiUser.profile || { displayName: apiUser.username || "N/A" }, // Default ถ้า profile ไม่มี
            trackingStats: apiUser.trackingStats, // ควรมี default ใน model หรือ ที่นี่
            socialStats: apiUser.socialStats, // ควรมี default ใน model หรือ ที่นี่
            preferences: apiUser.preferences, // ควรมี default ใน model หรือ ที่นี่
            wallet: apiUser.wallet, // ควรมี default ใน model หรือ ที่นี่
            gamification: apiUser.gamification, // ควรมี default ใน model หรือ ที่นี่
            writerVerification: apiUser.verification, // map จาก verification
            donationSettings: apiUser.donationSettings,
            writerStats: apiUser.writerStats,
            // --- End Nested Objects ---
            isActive: apiUser.isActive,
            isEmailVerified: apiUser.isEmailVerified,
            isBanned: apiUser.isBanned,
            bannedUntil: apiUser.bannedUntil,
          };
          await updateNextAuthSession(); // บังคับ NextAuth session update
          await queryClient.invalidateQueries({ queryKey: ["session"] });
          setAuthError(null); // เคลียร์ error เมื่อสำเร็จ
          return { success: true, ok: true, user: sessionUserPayload };
        } else {
          console.warn(`⚠️ [AuthContext] NextAuth signInResult ไม่ ok แต่ไม่มี error object`);
          setAuthError("เกิดปัญหาในการสร้างเซสชัน (NextAuth)");
          return { error: "เกิดปัญหาในการสร้างเซสชัน (NextAuth)", success: false, ok: false };
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
    [queryClient, loading, setLoading, setAuthError, updateNextAuthSession] // เพิ่ม updateNextAuthSession
  );

  // ... signInWithSocial, signUp, signOut (คงเดิมตามโค้ดก่อนหน้าของคุณ ถ้า Path API ถูกต้องแล้ว) ...
  // **ตรวจสอบให้แน่ใจว่า Path ที่ fetch ใน signUp คือ "/api/auth/signup"**
  // **และ signInWithSocial ไม่ต้อง fetch API เอง แต่จะถูกจัดการโดย NextAuth options**

  const signInWithSocial = useCallback(
    async (provider: string): Promise<void> => {
      if (loading) {
        console.warn("⚠️ [AuthContext] signInWithSocial ถูกเรียกซ้ำขณะกำลังโหลด");
        throw new Error("กำลังดำเนินการ กรุณารอสักครู่");
      }
      setLoading(true);
      setAuthError(null);
      console.log(`🔵 [AuthContext] พยายามลงชื่อเข้าใช้ด้วย social provider: ${provider}`);
      try {
        const result = await nextAuthSignIn(provider, {
          redirect: true,
          callbackUrl: "/",
        });

        if (result?.error) {
          console.warn(`⚠️ [AuthContext] Social sign-in (${provider}) ล้มเหลว (NextAuth): ${result.error}`);
          let errorMessage = result.error;
          if (errorMessage.includes("OAuthAccountNotLinked")) {
            errorMessage = "บัญชีโซเชียลนี้ยังไม่ได้เชื่อมโยง หรืออีเมลนี้อาจถูกใช้กับบัญชีอื่นแล้ว";
          } else if (errorMessage.includes("Callback") || errorMessage.toLowerCase().includes("oauth_callback_error")) {
            errorMessage = `เกิดปัญหาในการเชื่อมต่อกับ ${provider} กรุณาลองอีกครั้ง`;
          } else if (errorMessage.toLowerCase().includes("access_denied")) {
            errorMessage = `คุณปฏิเสธการเข้าถึงจาก ${provider}`;
          }
          setAuthError(errorMessage);
          if (!result.url) setLoading(false);
        } else {
          console.log(`✅ [AuthContext] Social sign-in (${provider}) เริ่มต้นสำเร็จ, กำลัง redirect...`);
          setAuthError(null); // เคลียร์ error เมื่อเริ่ม redirect สำเร็จ
        }
      } catch (error: any) {
        console.error(`❌ [AuthContext] ข้อผิดพลาดระหว่าง signInWithSocial (${provider}):`, error);
        setAuthError(error.message || `เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย ${provider}`);
        setLoading(false);
      }
    },
    [loading, setLoading, setAuthError]
  );

  const signUp = useCallback(
    async (
      email: string,
      username: string,
      password: string,
      recaptchaToken: string
    ): Promise<{ error?: string; success?: boolean; message?: string; userId?: string }> => {
      if (loading) {
        console.warn("⚠️ [AuthContext] signUp ถูกเรียกซ้ำขณะกำลังโหลด");
        return { error: "กำลังดำเนินการ กรุณารอสักครู่", success: false };
      }
      setLoading(true);
      setAuthError(null); // เคลียร์ error เก่า
      console.log(`🔵 [AuthContext] ส่งคำขอสมัครสมาชิก: ${username} (${email})`);

      try {
        const response = await fetch("/api/auth/signup", { // PATH API สำหรับ signup
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password, recaptchaToken }),
        });

        const data = await response.json();
        console.log(`ℹ️ [AuthContext] การตอบกลับจาก /api/auth/signup:`, data);

        if (!response.ok || !data.success) {
          let errorMessage = data.error || "การสมัครสมาชิกล้มเหลว";
          if (typeof data.error === 'string') {
            if (data.error.includes("อีเมลนี้ถูกใช้งานแล้ว")) {
              errorMessage = "อีเมลนี้ถูกใช้งานแล้ว";
            } else if (data.error.includes("ชื่อผู้ใช้นี้ถูกใช้งานแล้ว")) {
              errorMessage = "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว";
            } else if (data.error.includes("reCAPTCHA")) {
              errorMessage = data.error;
            }
          }
          console.warn(`⚠️ [AuthContext] การสมัครสมาชิกล้มเหลว: ${errorMessage}`);
          setAuthError(errorMessage);
          return { error: errorMessage, success: false };
        }

        console.log(`✅ [AuthContext] สมัครสมาชิกสำเร็จ (จาก Backend API): ${username} (${email}), Message: ${data.message}`);
        setAuthError(null); // เคลียร์ error เมื่อสำเร็จ
        return { success: true, message: data.message || "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี", userId: data.userId };
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
    if (loading && nextAuthStatus !== 'authenticated') {
      console.warn("⚠️ [AuthContext] signOut ถูกเรียกซ้ำขณะกำลังโหลด หรือไม่ได้ authenticated");
      return;
    }
    setAuthError(null); // เคลียร์ error ก่อน sign out
    console.log(`🔵 [AuthContext] กำลังออกจากระบบ... Session status: ${nextAuthStatus}`);
    try {
      await nextAuthSignOut({ redirect: true, callbackUrl: "/" });
      console.log(`✅ [AuthContext] ออกจากระบบสำเร็จ, กำลัง redirect...`);
      await queryClient.invalidateQueries({ queryKey: ["session"] }); // Invalidate session
      // queryClient.clear(); // อาจจะแรงไป ลอง invalidateQueries เฉพาะ session ก่อน
    } catch (error: any) {
      console.error("❌ [AuthContext] ข้อผิดพลาดระหว่าง signOut:", error);
      setAuthError(error.message || "เกิดข้อผิดพลาดในการออกจากระบบ");
    }
  }, [loading, nextAuthStatus, setAuthError, queryClient]);


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