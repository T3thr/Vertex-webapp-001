// src/context/AuthContext.tsx
// คอนเท็กซ์สำหรับจัดการการยืนยันตัวตนของผู้ใช้
// อัปเดต: ปรับ Path การเรียก API ของ signInWithCredentials ให้ตรงกับโครงสร้างใหม่
// อัปเดต: ทำให้สอดคล้องกับ SessionUser และ IUser ที่อัปเดตแล้ว และคง Logic เดิมตามที่คุณต้องการ
// แก้ไข: เพิ่มการแปลงข้อมูล apiUser (IUser) เป็น SessionUser อย่างละเอียด และแก้ไข import
"use client";

import { createContext, useContext, useCallback, ReactNode, useState, useEffect, useMemo } from "react";
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import {
  SessionUser,
  SessionUserGamification,
  SessionLeanLevel,
  SessionLevelReward,
  SessionShowcasedItem,
  SessionDisplayBadge
} from "@/app/api/auth/[...nextauth]/options"; // ตรวจสอบ path นี้ให้ถูกต้อง
import { useQueryClient } from "@tanstack/react-query";

// Import original Mongoose model interfaces for type hinting data from API
import {
  IUser, // IUser จาก backend/models/User
} from "@/backend/models/User";
import {
  IUserGamification as OriginalUserGamification,
  IShowcasedGamificationItem as OriginalShowcasedGamificationItem,
  IUserDisplayBadge as OriginalUserDisplayBadge,
} from "@/backend/models/UserGamification";
import {
  ILevel as OriginalILevel, // ILevel จาก backend/models/Level
  ILevelReward as OriginalLevelReward, // ✅ ILevelReward ถูก import จาก Level.ts
} from "@/backend/models/Level";

// อินเทอร์เฟซสำหรับ AuthContext
interface AuthContextType {
  user: SessionUser | null; // ผู้ใช้ที่ล็อกอินอยู่ (ในรูปแบบ SessionUser)
  status: "authenticated" | "loading" | "unauthenticated"; // สถานะการยืนยันตัวตนจาก NextAuth
  // ฟังก์ชันสำหรับล็อกอินด้วย Credentials (อีเมล/ชื่อผู้ใช้ และรหัสผ่าน)
  signInWithCredentials: (
    identifier: string,
    password: string
  ) => Promise<{ error?: string; success?: boolean; verificationRequired?: boolean; ok?: boolean; user?: SessionUser }>;
  signInWithSocial: (provider: string) => Promise<void>; // ฟังก์ชันสำหรับล็อกอินด้วย Social Provider
  // ฟังก์ชันสำหรับสมัครสมาชิก
  signUp: (
    email: string,
    username: string,
    password: string,
    recaptchaToken: string
  ) => Promise<{ error?: string; success?: boolean; message?: string; userId?: string }>;
  signOut: () => Promise<void>; // ฟังก์ชันสำหรับออกจากระบบ
  loading: boolean; // สถานะ loading ของ AuthContext เอง (สำหรับ action เช่น signIn, signUp)
  authError: string | null; // ข้อความ error ที่เกิดจาก AuthContext
  setAuthError: (error: string | null) => void; // ฟังก์ชันสำหรับตั้งค่า authError
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to convert date to ISO string or return undefined
// ฟังก์ชันช่วยแปลงวันที่เป็น ISO string หรือคืนค่า undefined หากแปลงไม่ได้
const toISOStringOrUndefined = (date?: Date | string): string | undefined => {
  if (!date) return undefined;
  try {
    return new Date(date).toISOString(); // พยายามสร้าง Date object แล้วแปลงเป็น ISO string
  } catch (e) {
    // console.warn("Failed to convert date to ISO string:", date, e);
    return undefined; // หากเกิด error ในการแปลง ให้คืนค่า undefined
  }
};

// Client-side helper to transform IUser-like object (from API JSON) to SessionUser
// ฟังก์ชันช่วยแปลง object ที่มีโครงสร้างคล้าย IUser (ที่ได้จาก API backend เป็น JSON)
// ให้อยู่ในรูปแบบ SessionUser ที่ client-side context ต้องการ
const transformApiUserToSessionUser = (apiUser: IUser): SessionUser => {
  // ฟังก์ชันภายในสำหรับแปลงส่วน gamification ของ user
  const transformGamification = (g?: OriginalUserGamification): SessionUserGamification => {
    // หากไม่มีข้อมูล gamification (g is undefined) ให้คืนค่า default structure ของ SessionUserGamification
    if (!g) {
      return {
        level: 1,
        currentLevelObject: null,
        experiencePoints: 0,
        totalExperiencePointsEverEarned: 0,
        nextLevelXPThreshold: 100, // ค่าเริ่มต้น, ควรพิจารณาใช้ค่า config กลาง
        achievements: [],
        showcasedItems: [],
        primaryDisplayBadge: undefined,
        secondaryDisplayBadges: [],
        loginStreaks: { currentStreakDays: 0, longestStreakDays: 0, lastLoginDate: undefined },
        dailyCheckIn: { currentStreakDays: 0, lastCheckInDate: undefined },
        lastActivityAt: undefined,
      };
    }

    let formattedCurrentLevelObject: string | SessionLeanLevel | null = null;
    // ตรวจสอบและแปลง currentLevelObject
    if (g.currentLevelObject) {
      // g.currentLevelObject จาก API (JSON) จะเป็น plain object ถ้าถูก populate, หรือเป็น string ID
      const clo = g.currentLevelObject as any;
      if (typeof clo === 'object' && clo._id) { // กรณีเป็น populated plain object (มี _id)
        const originalLevel = clo as OriginalILevel; // Cast เป็น OriginalILevel (เสมือนเป็น plain object ที่มีโครงสร้างตาม ILevel)
        formattedCurrentLevelObject = {
          _id: originalLevel._id.toString(),
          levelNumber: originalLevel.levelNumber,
          title: originalLevel.title,
          levelGroupName: originalLevel.levelGroupName,
          xpRequiredForThisLevel: originalLevel.xpRequiredForThisLevel,
          xpToNextLevelFromThis: originalLevel.xpToNextLevelFromThis,
          // แปลง rewardsOnReach ภายใน currentLevelObject
          rewardsOnReach: originalLevel.rewardsOnReach?.map((r: OriginalLevelReward): SessionLevelReward => ({
            type: r.type,
            coinsAwarded: r.coinsAwarded,
            // achievementIdToUnlock และ badgeIdToAward อาจเป็น ObjectId หรือ string (code/key)
            // แปลงเป็น string เพื่อความสอดคล้องใน session
            achievementIdToUnlock: r.achievementIdToUnlock?.toString(),
            badgeIdToAward: r.badgeIdToAward?.toString(),
            featureKeyToUnlock: r.featureKeyToUnlock,
            cosmeticItemKey: r.cosmeticItemKey,
            description: r.description,
          })),
          description: originalLevel.description,
          iconUrl: originalLevel.iconUrl,
          themeColor: originalLevel.themeColor,
          isActive: originalLevel.isActive,
          schemaVersion: originalLevel.schemaVersion,
          createdAt: toISOStringOrUndefined(originalLevel.createdAt),
          updatedAt: toISOStringOrUndefined(originalLevel.updatedAt),
        };
      } else if (typeof clo === 'string') { // กรณีเป็น string ID อยู่แล้ว
        formattedCurrentLevelObject = clo;
      } else if (clo && typeof clo.toString === 'function' && !(clo instanceof Date)) {
        // กรณีอาจเป็น ObjectId ที่ API ไม่ได้ stringify (เช่นถ้า API ส่ง BSON ObjectId ตรงๆ)
        formattedCurrentLevelObject = clo.toString();
      }
    }

    // คืนค่า gamification ในรูปแบบ SessionUserGamification
    return {
      level: g.level,
      currentLevelObject: formattedCurrentLevelObject,
      experiencePoints: g.experiencePoints,
      totalExperiencePointsEverEarned: g.totalExperiencePointsEverEarned,
      nextLevelXPThreshold: g.nextLevelXPThreshold,
      achievements: g.achievements?.map((id: any) => id.toString()) || [], // แปลง ID ใน achievements เป็น string
      showcasedItems: [], // Moved to UserProfile
      primaryDisplayBadge: undefined, // Moved to UserProfile
      secondaryDisplayBadges: [], // Moved to UserProfile
      loginStreaks: {
        currentStreakDays: g.loginStreaks?.currentStreakDays || 0,
        longestStreakDays: g.loginStreaks?.longestStreakDays || 0,
        lastLoginDate: toISOStringOrUndefined(g.loginStreaks?.lastLoginDate), // แปลงวันที่เป็น ISO string
      },
      dailyCheckIn: {
        currentStreakDays: g.dailyCheckIn?.currentStreakDays || 0,
        lastCheckInDate: toISOStringOrUndefined(g.dailyCheckIn?.lastCheckInDate), // แปลงวันที่เป็น ISO string
      },
      lastActivityAt: toISOStringOrUndefined(g.lastActivityAt), // แปลงวันที่เป็น ISO string
    };
  };

  // แปลง object apiUser หลัก
  return {
    id: apiUser._id.toString(), // apiUser._id จาก API ควรเป็น string หรือ object ที่มี toString()
    name: apiUser.profile?.displayName || apiUser.username || "User", // กำหนดค่า fallback สำหรับ name
    email: apiUser.email || undefined,
    username: apiUser.username || `user${apiUser._id.toString().slice(-6)}`, // กำหนดค่า fallback สำหรับ username
    roles: apiUser.roles || ["Reader"], // กำหนดค่า default สำหรับ roles
    // กำหนดค่า default สำหรับ object ย่อยต่างๆ หากไม่มีข้อมูลจาก apiUser
    profile: apiUser.profile || { displayName: apiUser.username || "User" },
    trackingStats: apiUser.trackingStats || { joinDate: new Date().toISOString(), totalLoginDays:0, totalNovelsRead:0, totalEpisodesRead:0, totalTimeSpentReadingSeconds:0, totalCoinSpent:0, totalRealMoneySpent:0 },
    socialStats: apiUser.socialStats || { followersCount: 0, followingCount: 0, novelsCreatedCount:0, commentsMadeCount:0,ratingsGivenCount:0, likesGivenCount:0},
    preferences: apiUser.preferences || { language: "th", display: { theme:"system", reading:{fontSize:"medium", readingModeLayout:"scrolling", lineHeight: 1.6, textAlignment: "left"}, accessibility:{dyslexiaFriendlyFont: false, highContrastMode: false}}, notifications:{masterNotificationsEnabled:true, email:{enabled:true}, push:{enabled:true}, inApp:{enabled:true}}, contentAndPrivacy:{showMatureContent:false, preferredGenres:[], profileVisibility:"public", readingHistoryVisibility:"followers_only", showActivityStatus:true, allowDirectMessagesFrom:"followers", analyticsConsent:{allowPsychologicalAnalysis:false}}},
    wallet: apiUser.wallet || { coinBalance: 0 },
    gamification: transformGamification(apiUser.gamification as OriginalUserGamification | undefined), // เรียกใช้ transformGamification
    writerVerification: apiUser.verification, // สันนิษฐานว่าเป็น plain object หรือ undefined
    donationSettings: apiUser.donationSettings, // สันนิษฐานว่าเป็น plain object หรือ undefined
    writerStats: apiUser.writerStats, // สันนิษฐานว่าเป็น plain object หรือ undefined
    isActive: apiUser.isActive !== undefined ? apiUser.isActive : true, // กำหนด default หาก isActive เป็น undefined
    isEmailVerified: apiUser.isEmailVerified !== undefined ? apiUser.isEmailVerified : false, // กำหนด default
    isBanned: apiUser.isBanned !== undefined ? apiUser.isBanned : false, // กำหนด default
    bannedUntil: toISOStringOrUndefined(apiUser.bannedUntil), // แปลงวันที่เป็น ISO string
  };
};

// AuthProvider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { data: session, status: nextAuthStatus } = useSession();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Track hydration to prevent SSR/client mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // แปลงข้อมูล session จาก NextAuth เป็น SessionUser
  // Use session user data consistently across SSR and client
  const user: SessionUser | null = useMemo(() => {
    return session?.user ? (session.user as SessionUser) : null;
  }, [session?.user]);

  // useEffect สำหรับจัดการ authError เมื่อสถานะ session เปลี่ยนแปลง
  useEffect(() => {
    // อาจพิจารณาเคลียร์ authError อัตโนมัติเมื่อผู้ใช้ authenticated หรือเมื่อ status เปลี่ยน
    if ((nextAuthStatus === 'authenticated' || (nextAuthStatus !== 'loading' && user)) && authError) {
      // setAuthError(null); // ยกเลิกการเคลียร์ error อัตโนมัติ ให้ผู้ใช้เห็น error จนกว่าจะมีการ action ใหม่
    }
  }, [nextAuthStatus, user, authError]);

  // ฟังก์ชันสำหรับล็อกอินด้วย Credentials
  const signInWithCredentials = useCallback(
    async (
      identifier: string,
      password: string
    ): Promise<{ error?: string; success?: boolean; verificationRequired?: boolean; ok?: boolean; user?: SessionUser }> => {
      // ป้องกันการเรียกซ้ำขณะกำลัง loading
      if (loading) {
        console.warn("⚠️ [AuthContext] signInWithCredentials called while already loading");
        return { error: "กำลังดำเนินการ กรุณารอสักครู่", success: false, ok: false };
      }
      setLoading(true); // เริ่ม loading
      setAuthError(null); // เคลียร์ error เก่า
      console.log(`🔵 [AuthContext] Attempting credentials sign-in (identifier: ${identifier})`);

      try {
        // 1. เรียก API ของ backend (ที่ไม่ได้ผ่าน NextAuth โดยตรง) เพื่อตรวจสอบ credentials
        console.log(`🔄 [AuthContext] Requesting /api/auth/signin/credentials`);
        const backendResponse = await fetch("/api/auth/signin/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        });
        const backendData = await backendResponse.json(); // { success: boolean, user?: IUser, error?: string, verificationRequired?: boolean }
        console.log(`ℹ️ [AuthContext] Response from /api/auth/signin/credentials:`, backendData);

        // หาก backend API ตอบกลับว่า error หรือไม่สำเร็จ
        if (!backendResponse.ok || backendData.error) {
          let errorMessage = backendData.error || "การลงชื่อเข้าใช้ล้มเหลวจากเซิร์ฟเวอร์";
          const verificationRequired = backendData.verificationRequired || false;
          // ปรับปรุง error message ให้เข้าใจง่ายขึ้น
          if (typeof backendData.error === 'string') {
            if (backendData.error.includes("ยังไม่ได้ยืนยันอีเมล")) {
              errorMessage = "บัญชีของคุณยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมาย";
            } else if (backendData.error.includes("ไม่ถูกต้อง") || backendData.error.includes("ไม่พบผู้ใช้")) {
              errorMessage = "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
            } else if (backendData.error.includes("ถูกปิดใช้งาน")) {
              errorMessage = "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแล";
            } else if (backendData.error.includes("ถูกระงับ")) {
              errorMessage = backendData.error; // แสดงข้อความ ban โดยตรง
            }
          }
          console.warn(`⚠️ [AuthContext] Sign-in failed (Backend API): ${errorMessage}`);
          setAuthError(errorMessage);
          setLoading(false);
          return { error: errorMessage, success: false, verificationRequired, ok: false };
        }

        // 2. หาก backend API ตรวจสอบ credentials ผ่าน, ให้ NextAuth สร้าง session
        console.log(`🔵 [AuthContext] Backend API credentials verified, calling nextAuthSignIn for session creation...`);
        const signInResult = await nextAuthSignIn("credentials", {
          redirect: false, // ไม่ต้องการ redirect จาก NextAuth โดยตรง, จัดการเอง
          identifier: identifier, // ส่ง identifier และ password ไปให้ authorize callback ใน options.ts
          password,
        });

        // ตรวจสอบผลลัพธ์จาก nextAuthSignIn
        if (signInResult?.error) {
          console.warn(`⚠️ [AuthContext] NextAuth session creation failed: ${signInResult.error}`);
          // ถ้า backendData.error มีค่า (เช่น verification required) ให้ใช้ค่านั้น, มิฉะนั้นใช้ signInResult.error
          const finalErrorMessage = backendData.error || signInResult.error || "ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง (NextAuth)";
          setAuthError(finalErrorMessage);
          return { error: finalErrorMessage, success: false, ok: false };
        }

        if (signInResult?.ok && backendData.user) { // ตรวจสอบ backendData.user ด้วย
          console.log(`✅ [AuthContext] Sign-in successful, NextAuth session should be created for: ${identifier}`);
          // backendData.user คือข้อมูลผู้ใช้ (IUser) จาก API ของคุณ
          const apiUserFromBackend = backendData.user as IUser;
          // แปลงข้อมูลผู้ใช้จาก API (IUser) เป็น SessionUser
          const sessionUserPayload = transformApiUserToSessionUser(apiUserFromBackend);

          setAuthError(null);
          // คืนค่า user ที่แปลงแล้ว เพื่อให้ UI สามารถนำไปใช้ได้ทันทีหากต้องการ
          return { success: true, ok: true, user: sessionUserPayload };
        } else {
          console.warn(`⚠️ [AuthContext] NextAuth signInResult not ok, or backendData.user missing. Result:`, signInResult, `Backend User:`, backendData.user);
          const errorMessage = "เกิดปัญหาในการสร้างเซสชัน (NextAuth) หรือไม่พบข้อมูลผู้ใช้";
          setAuthError(errorMessage);
          return { error: errorMessage, success: false, ok: false };
        }

      } catch (error: any) {
        console.error("❌ [AuthContext] Critical error during signInWithCredentials:", error);
        const message = error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการลงชื่อเข้าใช้";
        setAuthError(message);
        return { error: message, success: false, ok: false };
      } finally {
        setLoading(false); // สิ้นสุด loading
      }
    },
    [queryClient, loading]
  );

  // ฟังก์ชันสำหรับล็อกอินด้วย Social Provider
  const signInWithSocial = useCallback(
    async (provider: string): Promise<void> => {
      if (loading) {
        console.warn("⚠️ [AuthContext] signInWithSocial called while already loading");
        throw new Error("กำลังดำเนินการ กรุณารอสักครู่");
      }
      setLoading(true);
      setAuthError(null);
      console.log(`🔵 [AuthContext] Attempting social sign-in with provider: ${provider}`);
      try {
        // NextAuth จะจัดการ OAuth flow ทั้งหมด รวมถึงการเรียก JWT/session callbacks
        // ซึ่งใน options.ts มีการใช้ toSessionUserFormat เพื่อแปลงข้อมูลแล้ว
        const result = await nextAuthSignIn(provider, {
          callbackUrl: window.location.pathname, // เพิ่มพารามิเตอร์ callbackUrl
          redirect: true, // สำหรับ OAuth มักจะ redirect ไปหน้า provider
        });

        // หากตั้ง redirect: true, โค้ดส่วนนี้อาจจะไม่ถูกเรียกถ้าล็อกอินสำเร็จ (เพราะ browser จะ redirect ไปแล้ว)
        // การจัดการ error ตรงนี้สำหรับ error ที่เกิดจาก nextAuthSignIn โดยตรง
        if (result?.error) {
          console.warn(`⚠️ [AuthContext] Social sign-in (${provider}) failed (NextAuth): ${result.error}`);
          let errorMessage = result.error;
          // ปรับปรุง error message สำหรับ OAuth
          if (errorMessage.includes("OAuthAccountNotLinked")) {
            errorMessage = "บัญชีโซเชียลนี้ยังไม่ได้เชื่อมโยง หรืออีเมลนี้อาจถูกใช้กับบัญชีอื่นแล้ว";
          } else if (errorMessage.includes("Callback") || errorMessage.toLowerCase().includes("oauth_callback_error")) {
            errorMessage = `เกิดปัญหาในการเชื่อมต่อกับ ${provider} กรุณาลองอีกครั้ง`;
          } else if (errorMessage.toLowerCase().includes("access_denied")) {
            errorMessage = `คุณปฏิเสธการเข้าถึงจาก ${provider}`;
          }
          setAuthError(errorMessage);
          if (!result.url) setLoading(false); // หยุด loading ถ้าไม่มีการ redirect
        } else {
          console.log(`✅ [AuthContext] Social sign-in (${provider}) initiated, redirecting...`);
          setAuthError(null);
          // setLoading จะยังคงเป็น true เนื่องจากหน้าจะถูก redirect
        }
      } catch (error: any) {
        console.error(`❌ [AuthContext] Error during signInWithSocial (${provider}):`, error);
        setAuthError(error.message || `เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย ${provider}`);
        setLoading(false); // หยุด loading หากเกิด exception
      }
    },
    [loading]
  );

  // ฟังก์ชันสำหรับสมัครสมาชิก
  const signUp = useCallback(
    async (
      email: string,
      username: string,
      password: string,
      recaptchaToken: string
    ): Promise<{ error?: string; success?: boolean; message?: string; userId?: string }> => {
      if (loading) {
        console.warn("⚠️ [AuthContext] signUp called while already loading");
        return { error: "กำลังดำเนินการ กรุณารอสักครู่", success: false };
      }
      setLoading(true);
      setAuthError(null);
      console.log(`🔵 [AuthContext] Submitting sign-up request: ${username} (${email})`);

      try {
        // เรียก API สำหรับการสมัครสมาชิก (เช่น /api/auth/signup)
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password, recaptchaToken }),
        });
        const data = await response.json(); // { success: boolean, message?: string, error?: string, userId?: string }
        console.log(`ℹ️ [AuthContext] Response from /api/auth/signup:`, data);

        // หาก API ตอบกลับว่า error หรือไม่สำเร็จ
        if (!response.ok || !data.success) {
          let errorMessage = data.error || "การสมัครสมาชิกล้มเหลว";
           // ปรับปรุง error message สำหรับกรณีทั่วไป
           if (typeof data.error === 'string') {
             if (data.error.includes("อีเมลนี้ถูกใช้งานแล้ว")) errorMessage = "อีเมลนี้ถูกใช้งานแล้ว";
             else if (data.error.includes("ชื่อผู้ใช้นี้ถูกใช้งานแล้ว")) errorMessage = "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว";
             else if (data.error.includes("reCAPTCHA")) errorMessage = data.error; // แสดง error จาก reCAPTCHA โดยตรง
           }
          console.warn(`⚠️ [AuthContext] Sign-up failed: ${errorMessage}`);
          setAuthError(errorMessage);
          return { error: errorMessage, success: false };
        }

        // หากสมัครสมาชิกสำเร็จจาก API
        console.log(`✅ [AuthContext] Sign-up successful (from Backend API): ${username} (${email}), Message: ${data.message}`);
        setAuthError(null);
        return { success: true, message: data.message || "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี", userId: data.userId };
      } catch (error: any) {
        console.error("❌ [AuthContext] Critical error during signUp:", error);
        const errorMessage = error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการสมัครสมาชิก";
        setAuthError(errorMessage);
        return { error: errorMessage, success: false };
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  // ฟังก์ชันสำหรับออกจากระบบ
  const signOut = useCallback(async () => {
    if (loading && nextAuthStatus !== 'authenticated') {
        console.warn("⚠️ [AuthContext] signOut called while already processing or not authenticated.");
        return;
    }
    setAuthError(null);
    console.log(`🔵 [AuthContext] Signing out... Session status: ${nextAuthStatus}`);
    try {
      // เรียก nextAuthSignOut เพื่อเคลียร์ session ของ NextAuth
      await nextAuthSignOut({ redirect: true, callbackUrl: "/" }); // redirect ไปหน้าหลักหลัง sign out
      // บรรทัดนี้อาจจะไม่ถูกเรียกหาก redirect เกิดขึ้นทันที
      console.log(`✅ [AuthContext] Sign-out successful, redirecting...`);
      queryClient.invalidateQueries({ queryKey: ["session"] }); // ทำให้ query "session" (ถ้ามี) ของ React Query ไม่ valid
    } catch (error: any) {
      console.error("❌ [AuthContext] Error during signOut:", error);
      setAuthError(error.message || "เกิดข้อผิดพลาดในการออกจากระบบ");
    }
    // setLoading ไม่จำเป็นต้อง set เป็น false ที่นี่ เพราะหน้าจะ redirect
  }, [loading, nextAuthStatus, queryClient]);

  // ค่าที่จะส่งผ่าน Context
  const contextValue: AuthContextType = {
    user, // ข้อมูลผู้ใช้ (SessionUser | null)
    status: nextAuthStatus, // สถานะจาก NextAuth ("authenticated", "loading", "unauthenticated")
    signInWithCredentials,
    signInWithSocial,
    signUp,
    signOut,
    loading, // สถานะ loading ของ AuthContext เอง
    authError,
    setAuthError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook สำหรับใช้งาน AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider"); // Error หากเรียกใช้นอก Provider
  }
  return context;
};

function updateNextAuthSession() {
  throw new Error("Function not implemented.");
}
