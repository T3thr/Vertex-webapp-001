// src/app/api/auth/[...nextauth]/options.ts
// การกำหนดค่า NextAuth สำหรับการยืนยันตัวตน
// รองรับการล็อกอินด้วยอีเมลหรือชื่อผู้ใช้ผ่าน Credentials และ OAuth providers ต่างๆ
// อัปเดต: ปรับ Path การเรียก API และการจัดการ User Model ที่รวมแล้ว

import { NextAuthOptions, Profile, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import FacebookProvider from "next-auth/providers/facebook";
import AppleProvider from "next-auth/providers/apple";
import LineProvider from "next-auth/providers/line";
import { JWT } from "next-auth/jwt";
import { Types } from "mongoose";
import { IUser, IUserProfile, IUserTrackingStats, IUserSocialStats, IUserPreferences, IUserWallet, IUserGamification, IUserVerification, IUserDonationSettings } from "@/backend/models/User"; // Import IUser และ Sub-interfaces

// กำหนดประเภทสำหรับผู้ใช้ในเซสชัน (สอดคล้องกับ IUser)
// หมายเหตุ: SessionUser จะเหมือนกับโครงสร้างข้อมูลผู้ใช้ที่เราต้องการใน session
// และควรจะสอดคล้องกับข้อมูลที่ถูกส่งกลับจาก API endpoint ของเรา
export type SessionUser = {
  id: string;
  name: string; // จะมาจาก profile.displayName หรือ username
  email?: string; // อีเมลเป็นตัวเลือก
  username: string; // username ควรมีเสมอหลังจากการ authenticate สำเร็จ
  roles: Array<"Reader" | "Writer" | "Admin" | "Moderator" | "Editor">; // ปรับตาม IUser
  profile: IUserProfile; // ใช้ IUserProfile โดยตรง
  trackingStats: IUserTrackingStats; // ใช้ IUserTrackingStats โดยตรง
  socialStats: IUserSocialStats; // ใช้ IUserSocialStats โดยตรง
  preferences: IUserPreferences; // ใช้ IUserPreferences โดยตรง
  wallet: IUserWallet; // ใช้ IUserWallet โดยตรง
  gamification: IUserGamification; // ใช้ IUserGamification โดยตรง
  writerVerification?: IUserVerification; // ใช้ IUserVerification โดยตรง (ถ้ามี)
  donationSettings?: IUserDonationSettings; // ใช้ IUserDonationSettings โดยตรง (ถ้ามี)
  writerStats?: any; // หากมีการใช้งาน writerStats ใน session ควรระบุ Type ให้ถูกต้อง
  isActive: boolean;
  isEmailVerified: boolean;
  isBanned: boolean;
  bannedUntil?: Date;
  // เพิ่ม field อื่นๆ ที่จำเป็นจาก IUser เข้ามาใน SessionUser ตามความเหมาะสม
  // เช่น writerStats ถ้าต้องการใช้ใน client session
};

// ประเภทเสริมสำหรับข้อมูล Profile จากแต่ละ Provider (คงเดิม)
interface GoogleProfile extends Profile {
  picture?: string;
  // เพิ่มเติม: อาจมี name, given_name, family_name จาก Google
  name?: string;
  given_name?: string;
  family_name?: string;
}

interface TwitterProfile extends Profile {
  data?: {
    name?: string;
    username?: string;
    profile_image_url?: string;
  };
  // NextAuth v4 อาจคืน profile มาในรูปแบบที่ซ้อนกันน้อยกว่า
  name?: string; // เพิ่มเติมเผื่อกรณีที่ data ไม่มี
  username?: string; // เพิ่มเติมเผื่อกรณีที่ data ไม่มี
  profile_image_url?: string; // เพิ่มเติมเผื่อกรณีที่ data ไม่มี
}

interface FacebookProfile extends Profile {
  picture?: {
    data?: {
      url?: string;
    };
  };
   // Facebook อาจส่ง first_name, last_name แยกกัน
  first_name?: string;
  last_name?: string;
}

interface AppleProfile extends Omit<Profile, "name"> {
  name?: { // Apple อาจส่งชื่อมาในรูปแบบ object
    firstName?: string;
    lastName?: string;
  };
  // Apple อาจไม่ได้ส่งรูปภาพมาโดยตรงใน profile object มาตรฐาน
  picture?: string; // เพิ่ม field นี้เผื่อมีการส่งมาในอนาคตหรือผ่านการตั้งค่าพิเศษ
}

interface LineProfile extends Profile {
  displayName?: string;
  pictureUrl?: string;
  // Line อาจมี userId ซึ่งต่างจาก providerAccountId
  userId?: string;
}


// ตรวจสอบตัวแปรสภาพแวดล้อมสำหรับ OAuth providers (คงเดิม)
const validateEnv = () => {
  const requiredEnvVars = [
    { key: "GOOGLE_CLIENT_ID", provider: "Google" },
    { key: "GOOGLE_CLIENT_SECRET", provider: "Google" },
    { key: "TWITTER_CLIENT_ID", provider: "Twitter" },
    { key: "TWITTER_CLIENT_SECRET", provider: "Twitter" },
    { key: "FACEBOOK_CLIENT_ID", provider: "Facebook" },
    { key: "FACEBOOK_CLIENT_SECRET", provider: "Facebook" },
    { key: "APPLE_CLIENT_ID", provider: "Apple" },
    { key: "APPLE_CLIENT_SECRET", provider: "Apple" },
    { key: "LINE_CLIENT_ID", provider: "Line" },
    { key: "LINE_CLIENT_SECRET", provider: "Line" },
    { key: "NEXTAUTH_SECRET", provider: "NextAuth" },
    { key: "NEXTAUTH_URL", provider: "NextAuth" },
    { key: "MONGODB_URI", provider: "Database" },
  ];

  const missingVars = requiredEnvVars
    .filter((envVar) => !process.env[envVar.key])
    .map((envVar) => envVar.key);

  if (missingVars.length > 0) {
    console.warn(
      `⚠️ คำเตือน: ตัวแปรสภาพแวดล้อมต่อไปนี้ไม่ได้ถูกกำหนด: ${missingVars.join(
        ", "
      )}. Providers ที่เกี่ยวข้องอาจไม่ทำงาน`
    );
  }
};

validateEnv();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        identifier: { label: "อีเมลหรือชื่อผู้ใช้", type: "text" },
        password: { label: "รหัสผ่าน", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log(
            `⏳ [AuthOptions] เริ่มการตรวจสอบ CredentialsProvider สำหรับ identifier=${credentials?.identifier}`
          );

          if (!credentials?.identifier || !credentials?.password) {
            console.error("❌ [AuthOptions] ขาดข้อมูล identifier หรือ password");
            throw new Error("กรุณาระบุอีเมล/ชื่อผู้ใช้ และรหัสผ่าน");
          }

          // เรียก API ไปยัง Endpoint ใหม่สำหรับ Credentials
          const response = await fetch(
            `${process.env.NEXTAUTH_URL}/api/auth/signin/credentials`, // <--- ปรับ Path API
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                identifier: credentials.identifier,
                password: credentials.password,
              }),
            }
          );

          const responseData = await response.json();

          if (!response.ok || !responseData.user) {
            console.error(
              `❌ [AuthOptions] การตรวจสอบ Credentials ล้มเหลวจาก API: ${
                responseData.error || "ไม่มีข้อมูลผู้ใช้"
              }`
            );
            throw new Error(
              responseData.error || "ข้อมูลรับรองไม่ถูกต้อง หรือเกิดข้อผิดพลาด"
            );
          }

          const userFromApi: IUser & { _id: Types.ObjectId | string } = responseData.user; // IUser จาก API

          // ตรวจสอบการยืนยันอีเมล (ถ้ามี email)
          // NextAuth จะไม่ auto-throw error เรื่อง email not verified ที่นี่, เราจัดการใน API endpoint แล้ว
          // แต่ถ้าต้องการ block ที่นี่ ก็สามารถทำได้
          if (!userFromApi.isEmailVerified && userFromApi.email) {
             console.warn(`⚠️ [AuthOptions] ผู้ใช้ ${userFromApi.email || userFromApi.username} ยังไม่ได้ยืนยันอีเมล แต่ API อนุญาตให้ผ่าน (อาจต้องยืนยันภายหลัง)`);
             // throw new Error("ยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมายของคุณ"); // หากต้องการ block ที่นี่
          }

          console.log(
            `✅ [AuthOptions] CredentialsProvider สำเร็จสำหรับผู้ใช้ ${
              userFromApi.email || userFromApi.username
            }`
          );

          // สร้าง NextAuthUser object ให้ตรงกับที่ NextAuth คาดหวัง และสอดคล้องกับ SessionUser และ IUser
          // โดย map ข้อมูลจาก userFromApi (IUser)
          return {
            id: userFromApi._id.toString(),
            name: userFromApi.profile?.displayName || userFromApi.username || "N/A", // ต้องมีค่าเสมอ
            email: userFromApi.email || undefined, // email อาจไม่มี
            username: userFromApi.username || "N/A_username", // username ควรมี
            roles: userFromApi.roles,
            profile: userFromApi.profile,
            trackingStats: userFromApi.trackingStats,
            socialStats: userFromApi.socialStats,
            preferences: userFromApi.preferences,
            wallet: userFromApi.wallet,
            gamification: userFromApi.gamification,
            writerVerification: userFromApi.verification, // Map จาก IUser.verification
            donationSettings: userFromApi.donationSettings,
                            writerStats: userFromApi.writerStats, // เพิ่ม writerStats
            isActive: userFromApi.isActive,
            isEmailVerified: userFromApi.isEmailVerified,
            isBanned: userFromApi.isBanned,
            bannedUntil: userFromApi.bannedUntil,
          } as NextAuthUser & SessionUser; // Cast ให้เป็น type ที่ครอบคลุม
        } catch (error: any) {
          console.error(
            `❌ [AuthOptions] ข้อผิดพลาดใน authorize (CredentialsProvider): ${error.message}`
          );
          // ส่งต่อ error message ที่ได้รับ หรือ message ทั่วไป
          throw new Error(
            error.message || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์"
          );
        }
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
      version: "2.0", // OAuth 2.0
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: { scope: "users.read tweet.read offline.access" },
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { scope: "public_profile email" } },
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: process.env.APPLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: { scope: "name email", response_mode: "form_post" },
      },
    }),
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID as string,
      clientSecret: process.env.LINE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { scope: "profile openid email" } },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 วัน
  },

  callbacks: {
    async jwt({ token, user, account, profile }) {
      // `user` จะมีค่าเฉพาะตอน sign in ครั้งแรก หรือเมื่อมีการ refresh token แบบพิเศษ
      // `account` จะมีค่าเฉพาะตอน sign in ครั้งแรก
      // `profile` จะมีค่าเฉพาะตอน sign in ครั้งแรกด้วย OAuth provider

      if (account && user) { // Sign in (Credentials หรือ OAuth)
        console.log(`⏳ [AuthOptions JWT] เริ่ม JWT callback สำหรับ provider=${account.provider}, user_id=${user.id}`);
        
        token.id = user.id;
        token.name = user.name; // จาก authorize หรือ OAuth profile
        token.email = user.email;
        token.username = (user as SessionUser).username; // Cast user เป็น SessionUser เพื่อเข้าถึง username
        token.roles = (user as SessionUser).roles;
        token.profile = (user as SessionUser).profile;
        token.trackingStats = (user as SessionUser).trackingStats;
        token.socialStats = (user as SessionUser).socialStats;
        token.preferences = (user as SessionUser).preferences;
        token.wallet = (user as SessionUser).wallet;
        token.gamification = (user as SessionUser).gamification;
        token.writerVerification = (user as SessionUser).writerVerification;
        token.donationSettings = (user as SessionUser).donationSettings;
        token.writerStats = (user as SessionUser).writerStats;
        token.isActive = (user as SessionUser).isActive;
        token.isEmailVerified = (user as SessionUser).isEmailVerified;
        token.isBanned = (user as SessionUser).isBanned;
        token.bannedUntil = (user as SessionUser).bannedUntil;
        token.provider = account.provider; // เก็บ provider ไว้ใน token

        // สำหรับ OAuth providers, เราจะเรียก API ของเราเพื่อสร้าง/อัปเดตผู้ใช้ใน DB
        // และดึงข้อมูลล่าสุดจาก DB มาใส่ใน token
        if (account.provider !== "credentials") {
          try {
            let apiEmail: string | undefined = profile?.email || undefined;
            let apiDisplayName: string = "";
            let apiUsernameSuggestion: string = ""; // ใช้เป็น suggestion สำหรับ API
            let apiAvatar: string | undefined = undefined;

            switch (account.provider) {
              case "google":
                const googleProfile = profile as GoogleProfile;
                apiEmail = googleProfile.email || undefined;
                apiDisplayName = googleProfile.name || googleProfile.given_name || "";
                if (googleProfile.given_name && googleProfile.family_name) {
                    apiDisplayName = `${googleProfile.given_name} ${googleProfile.family_name}`.trim();
                }
                apiUsernameSuggestion = apiEmail?.split("@")[0] || apiDisplayName.replace(/\s+/g, "").toLowerCase() || `user_${Date.now().toString().slice(-6)}`;
                apiAvatar = googleProfile.picture || undefined;
                break;
              case "twitter":
                const twitterProfile = profile as TwitterProfile;
                // Twitter อาจไม่ให้ email ถ้า user ไม่ได้ตั้งค่าไว้
                apiEmail = twitterProfile.email || undefined;
                apiDisplayName = twitterProfile.data?.name || twitterProfile.name || "";
                apiUsernameSuggestion = twitterProfile.data?.username || twitterProfile.username || apiDisplayName.replace(/\s+/g, "").toLowerCase() || `user_${Date.now().toString().slice(-6)}`;
                apiAvatar = twitterProfile.data?.profile_image_url || twitterProfile.profile_image_url || undefined;
                break;
              case "facebook":
                const facebookProfile = profile as FacebookProfile;
                apiEmail = facebookProfile.email || undefined;
                apiDisplayName = facebookProfile.name || `${facebookProfile.first_name || ""} ${facebookProfile.last_name || ""}`.trim() || "";
                apiUsernameSuggestion = apiEmail?.split("@")[0] || apiDisplayName.replace(/\s+/g, "").toLowerCase() || `user_${Date.now().toString().slice(-6)}`;
                apiAvatar = facebookProfile.picture?.data?.url || undefined;
                break;
              case "apple":
                const appleProfile = profile as AppleProfile;
                apiEmail = appleProfile.email || undefined; // Apple email อาจเป็น private relay
                apiDisplayName = appleProfile.name ? `${appleProfile.name.firstName || ""} ${appleProfile.name.lastName || ""}`.trim() : "";
                apiUsernameSuggestion = apiEmail?.split("@")[0] || apiDisplayName.replace(/\s+/g, "").toLowerCase() || `user_${Date.now().toString().slice(-6)}`;
                // Apple ไม่ได้ส่ง avatar มาใน profile โดยตรง
                apiAvatar = appleProfile.picture || undefined;
                break;
              case "line":
                const lineProfile = profile as LineProfile;
                apiEmail = lineProfile.email || undefined; // Line อาจไม่ส่ง email ถ้า user ไม่ยินยอม
                apiDisplayName = lineProfile.displayName || "";
                // Line ไม่มี username มาตรฐาน, อาจใช้ displayName หรือ email prefix
                apiUsernameSuggestion = apiEmail?.split("@")[0] || apiDisplayName.replace(/\s+/g, "").toLowerCase() || `user_${Date.now().toString().slice(-6)}`;
                apiAvatar = lineProfile.pictureUrl || undefined;
                break;
            }

            // ตรวจสอบข้อมูลสำคัญ (email หรือ username ที่มีคุณภาพ)
            if (!apiEmail && account.provider !== "twitter") { // Twitter อาจไม่มี email
                console.error(`❌ [AuthOptions JWT] ไม่มีอีเมลจาก ${account.provider} provider สำหรับผู้ใช้ ${apiDisplayName}`);
                throw new Error(`ไม่ได้รับอีเมลจาก ${account.provider}. ไม่สามารถดำเนินการต่อได้`);
            }
             if (account.provider === "twitter" && !apiEmail && !apiUsernameSuggestion) {
                console.error(`❌ [AuthOptions JWT] ไม่มีทั้งอีเมลและชื่อผู้ใช้จาก Twitter provider สำหรับผู้ใช้ ${apiDisplayName}`);
                throw new Error("ไม่ได้รับข้อมูลที่เพียงพอจาก Twitter. ไม่สามารถดำเนินการต่อได้");
            }


            console.log(`⏳ [AuthOptions JWT] ส่งข้อมูลไปยัง /api/auth/signin/oauth สำหรับ ${account.provider}:`, {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              email: apiEmail || null, // ส่ง null ถ้าเป็น undefined
              name: apiDisplayName,
              usernameSuggestion: apiUsernameSuggestion,
              picture: apiAvatar || null, // ส่ง null ถ้าเป็น undefined
            });

            // เรียก API ไปยัง Endpoint ใหม่สำหรับ OAuth
            const response = await fetch(
              `${process.env.NEXTAUTH_URL}/api/auth/signin/oauth`, // <--- ปรับ Path API
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  email: apiEmail || null, // ส่ง null ถ้าเป็น undefined
                  name: apiDisplayName, // ชื่อที่แสดงจาก provider
                  usernameSuggestion: apiUsernameSuggestion, // ชื่อผู้ใช้ที่แนะนำจาก email/name
                  picture: apiAvatar || null, // URL รูปภาพจาก provider
                }),
              }
            );

            const responseData = await response.json();

            if (!response.ok || !responseData.user) {
              console.error(
                `❌ [AuthOptions JWT] ข้อผิดพลาดในการบันทึก/ดึงข้อมูลผู้ใช้ OAuth (${account.provider}):`,
                responseData.error
              );
              throw new Error(
                responseData.error || `ไม่สามารถประมวลผลผู้ใช้ ${account.provider}`
              );
            }

            const userFromApi: IUser & { _id: Types.ObjectId | string } = responseData.user; // IUser จาก API

            console.log(
              `✅ [AuthOptions JWT] รับข้อมูลผู้ใช้จาก OAuth API (${account.provider}) สำเร็จ:`,
              userFromApi.username
            );

            // อัปเดต Token ด้วยข้อมูลล่าสุดจาก API
            token.id = userFromApi._id.toString();
            token.name = userFromApi.profile?.displayName || userFromApi.username || "N/A";
            token.email = userFromApi.email || undefined;
            token.username = userFromApi.username || "N/A_username_oauth";
            token.roles = userFromApi.roles;
            token.profile = userFromApi.profile;
            token.trackingStats = userFromApi.trackingStats;
            token.socialStats = userFromApi.socialStats;
            token.preferences = userFromApi.preferences;
            token.wallet = userFromApi.wallet;
            token.gamification = userFromApi.gamification;
            token.writerVerification = userFromApi.verification;
            token.donationSettings = userFromApi.donationSettings;
            token.writerStats = userFromApi.writerStats;
            token.isActive = userFromApi.isActive;
            token.isEmailVerified = userFromApi.isEmailVerified; // OAuth มักจะยืนยันอีเมลแล้ว
            token.isBanned = userFromApi.isBanned;
            token.bannedUntil = userFromApi.bannedUntil;

          } catch (error: any) {
            console.error(
              `❌ [AuthOptions JWT] ข้อผิดพลาดขณะประมวลผล OAuth (${account.provider}): ${error.message}`
            );
            // หากเกิดข้อผิดพลาดระหว่างการเรียก API ของเรา, เราควรส่ง error กลับไป
            // หรือคืน token ที่ไม่มีข้อมูลผู้ใช้ เพื่อให้ redirect ไปหน้า error
            // การ throw error ที่นี่จะทำให้ NextAuth redirect ไปหน้า error page
            throw error;
          }
        }
      }
      // Token จะถูกส่งต่อไปยัง session callback หรือใช้ในการ authorize API routes
      return token;
    },

    async session({ session, token }) {
      // token มาจาก jwt callback
      if (token && token.id) { // ตรวจสอบว่า token.id มีค่า (แสดงว่า jwt callback ทำงานสำเร็จ)
        console.log(
          `⏳ [AuthOptions Session] สร้างเซสชันสำหรับผู้ใช้ ${token.email || token.username}`
        );

        // ตรวจสอบและกำหนดค่า default ให้กับ properties ที่อาจเป็น undefined ใน token
        // เพื่อให้ SessionUser มี type ที่สมบูรณ์
        const safeProfile: IUserProfile = token.profile || { displayName: token.username || "User" };
        const safeTrackingStats: IUserTrackingStats = token.trackingStats || { joinDate: new Date(), totalLoginDays:0, totalNovelsRead:0, totalEpisodesRead:0, totalTimeSpentReadingSeconds:0, totalCoinSpent:0, totalRealMoneySpent:0 };
        const safeSocialStats: IUserSocialStats = token.socialStats || { followersCount: 0, followingCount: 0, novelsCreatedCount:0, commentsMadeCount:0,ratingsGivenCount:0, likesGivenCount:0};
        const safePreferences: IUserPreferences = token.preferences || { language: "th", display: { theme:"system", reading:{fontSize:"medium", readingModeLayout:"scrolling"}, accessibility:{} }, notifications:{masterNotificationsEnabled:true, email:{enabled:true}, push:{enabled:true}, inApp:{enabled:true}}, contentAndPrivacy:{showMatureContent:false, preferredGenres:[], profileVisibility:"public", readingHistoryVisibility:"followers_only", showActivityStatus:true, allowDirectMessagesFrom:"followers", analyticsConsent:{allowPsychologicalAnalysis:false}}};
        const safeWallet: IUserWallet = token.wallet || { coinBalance: 0 };
        const safeGamification: IUserGamification = token.gamification || { level: 1, experiencePoints: 0, nextLevelXPThreshold:100, achievements:[], loginStreaks:{currentStreakDays:0, longestStreakDays:0}, dailyCheckIn:{currentStreakDays:0} };

        session.user = {
          id: token.id as string,
          name: (token.name || safeProfile.displayName || token.username) as string,
          email: token.email || undefined,
          username: token.username as string,
          roles: (token.roles as SessionUser["roles"]) || ["Reader"],
          profile: safeProfile,
          trackingStats: safeTrackingStats,
          socialStats: safeSocialStats,
          preferences: safePreferences,
          wallet: safeWallet,
          gamification: safeGamification,
          writerVerification: token.writerVerification as SessionUser["writerVerification"] | undefined,
          donationSettings: token.donationSettings as SessionUser["donationSettings"] | undefined,
          writerStats: token.writerStats as SessionUser["writerStats"] | undefined,
          isActive: token.isActive as boolean,
          isEmailVerified: token.isEmailVerified as boolean,
          isBanned: token.isBanned as boolean,
          bannedUntil: token.bannedUntil as Date | undefined,
        };
        console.log(
          `✅ [AuthOptions Session] เซสชันสร้างสำเร็จสำหรับผู้ใช้ ${session.user.username}`
        );
      } else {
        // ถ้า token ไม่มี id หรือข้อมูลสำคัญ, ไม่ควรสร้าง session.user
        // หรืออาจจะ set session.user เป็น null/undefined แล้วให้ client จัดการ redirect
        console.warn(`⚠️ [AuthOptions Session] Token ไม่มี id, ไม่สามารถสร้าง user session ได้`);
        // session.user = null; // หรือจัดการตามความเหมาะสม
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin", // หน้าสำหรับ sign in (ถ้าไม่ได้ใช้ custom UI ของ NextAuth)
    signOut: "/auth/signout", // หน้าสำหรับ sign out
    error: "/auth/error", // หน้าแสดงข้อผิดพลาด (เช่น OAuth account not linked)
    // verifyRequest: '/auth/verify-request', // (Optional) หน้าสำหรับ Email provider
    // newUser: '/auth/new-user' // (Optional) หน้าสำหรับผู้ใช้ใหม่ครั้งแรก
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// ขยายประเภทของ NextAuth เพื่อรองรับฟิลด์ที่กำหนดเองใน User, Session, และ JWT
// ให้ตรงกับ SessionUser และข้อมูลที่มาจาก IUser
declare module "next-auth" {
  interface User extends SessionUser {} // User ใน NextAuth ควรมี field เหมือน SessionUser
  interface Session {
    user: SessionUser; // Session.user ควรเป็น SessionUser
  }
}

declare module "next-auth/jwt" {
  interface JWT extends SessionUser { // JWT ควรมี field เหมือน SessionUser เพิ่มเติม
    provider?: string; // เพิ่ม provider เข้าไปใน JWT ด้วย
  }
}