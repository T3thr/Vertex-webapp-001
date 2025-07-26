// src/app/api/auth/[...nextauth]/options.ts
// การกำหนดค่า NextAuth สำหรับการยืนยันตัวตน
// รองรับการล็อกอินด้วยอีเมลหรือชื่อผู้ใช้ผ่าน Credentials และ OAuth providers ต่างๆ
// อัปเดต: ลดขนาด JWT, ดึงข้อมูล session เต็มจาก DB ใน session callback
// แก้ไข: จัดการ Type Mismatch สำหรับ Lean Documents และ Populated Fields ใน Session/JWT

import { NextAuthOptions, Profile } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import FacebookProvider from "next-auth/providers/facebook";
import AppleProvider from "next-auth/providers/apple";
import LineProvider from "next-auth/providers/line";
import { JWT } from "next-auth/jwt";
import mongoose, { Types } from "mongoose";

// Import original interfaces from Mongoose models
import UserModel, { IUser } from "@/backend/models/User";
import { IUserProfile, IUserSocialStats } from "@/backend/models/UserProfile";
import { IUserTrackingStats } from "@/backend/models/UserTracking";
import { IUserSettings as IUserPreferences } from "@/backend/models/UserSettings";
import {
  IWriterStatsDoc as IWriterStats,
  IUserDonationSettings,
} from "@/backend/models/WriterStats";
import {
  IUserGamification as OriginalUserGamification,
  IShowcasedGamificationItem as OriginalShowcasedItem,
  IUserDisplayBadge as OriginalDisplayBadge,
  IUserWallet,
} from "@/backend/models/UserGamification";
import { IUserVerification } from "@/backend/models/UserSecurity";
import {
  ILevelReward,
  ILevel as OriginalILevel,
} from "@/backend/models/Level";
import dbConnect from "@/backend/lib/mongodb";

// Import Models for session population
import UserProfileModel from "@/backend/models/UserProfile";
import UserTrackingModel from "@/backend/models/UserTracking";
import UserGamificationModel from "@/backend/models/UserGamification";
import UserSecurityModel from "@/backend/models/UserSecurity";
import WriterStatsModel from "@/backend/models/WriterStats";
import UserSettingsModel from "@/backend/models/UserSettings";

// SECTION: Session-Specific Plain Object Types (คงเดิมตามที่ผู้ใช้ให้มา)

export type SessionLevelReward = Omit<
  ILevelReward,
  "achievementIdToUnlock" | "badgeIdToAward"
> & {
  achievementIdToUnlock?: string;
  badgeIdToAward?: string;
};

export type SessionLeanLevel = {
  _id: string;
  levelNumber: number;
  title: string;
  levelGroupName?: string;
  xpRequiredForThisLevel: number;
  xpToNextLevelFromThis?: number;
  rewardsOnReach?: SessionLevelReward[];
  description?: string;
  iconUrl?: string;
  themeColor?: string;
  isActive: boolean;
  schemaVersion: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SessionShowcasedItem = {
  earnedItemId: string;
  itemType: "Achievement" | "Badge";
};

export type SessionDisplayBadge = {
  earnedBadgeId: string;
  displayContext?: string;
};

export type SessionUserGamification = {
  level: number;
  currentLevelObject?: string | SessionLeanLevel | null;
  experiencePoints: number;
  totalExperiencePointsEverEarned?: number;
  nextLevelXPThreshold: number;
  achievements: string[];
  showcasedItems?: SessionShowcasedItem[];
  primaryDisplayBadge?: SessionDisplayBadge;
  secondaryDisplayBadges?: SessionDisplayBadge[];
  loginStreaks: {
    currentStreakDays: number;
    longestStreakDays: number;
    lastLoginDate?: string;
  };
  dailyCheckIn: {
    lastCheckInDate?: string;
    currentStreakDays: number;
  };
  lastActivityAt?: string;
};

// SessionUser type นี้คือสิ่งที่เราต้องการให้ session object สุดท้ายมี
export type SessionUser = {
  id: string;
  name: string;
  email?: string;
  username: string;
  roles: Array<"Reader" | "Writer" | "Admin" | "Moderator" | "Editor">;
  profile: IUserProfile;
  trackingStats: IUserTrackingStats;
  socialStats: IUserSocialStats;
  preferences: IUserPreferences;
  wallet: IUserWallet;
  gamification: SessionUserGamification;
  writerVerification?: IUserVerification;
  donationSettings?: IUserDonationSettings;
  writerStats?: IWriterStats;
  isActive: boolean;
  isEmailVerified: boolean;
  isBanned: boolean;
  bannedUntil?: string;
  // เพิ่ม field error แบบ optional สำหรับกรณี session ไม่สมบูรณ์
  error?: string;
};

// END SECTION: Session-Specific Plain Object Types

// Helper to convert date to ISO string if it's a Date object or valid date string (คงเดิม)
const toISOStringOrUndefined = (date?: Date | string): string | undefined => {
  if (!date) return undefined;
  try {
    return new Date(date).toISOString();
  } catch (e) {
    return undefined;
  }
};

// Helper function to convert a Mongoose document (or lean object) to SessionUser format (คงเดิมตามที่ผู้ใช้ให้มา)
// ตรวจสอบให้แน่ใจว่า function นี้คืนค่า default ที่เหมาะสมสำหรับทุก fields ของ SessionUser
function toSessionUserFormat(userDoc: any): SessionUser {
  const {
    _id,
    profile,
    username,
    email,
    roles,
    trackingStats,
    socialStats,
    preferences,
    wallet,
    gamification,
    writerVerification, // แก้ไข: เปลี่ยนจาก verification เป็น writerVerification เพื่อความชัดเจน
    donationSettings,
    writerStats,
    isActive,
    isEmailVerified,
    isBanned,
    bannedUntil,
  } = userDoc;

  const formatGamification = (
    g: OriginalUserGamification | undefined
  ): SessionUserGamification => {
    if (!g) {
      // ให้ค่า default ถ้า gamification object ไม่มีใน userDoc หรือเป็น undefined
      return {
        level: 1,
        currentLevelObject: null,
        experiencePoints: 0,
        totalExperiencePointsEverEarned: 0,
        nextLevelXPThreshold: 100, // หรือค่าเริ่มต้นจาก Level model
        achievements: [],
        showcasedItems: [],
        primaryDisplayBadge: undefined,
        secondaryDisplayBadges: [],
        loginStreaks: { currentStreakDays: 0, longestStreakDays: 0 },
        dailyCheckIn: { currentStreakDays: 0 },
        lastActivityAt: undefined,
      };
    }
    let formattedCurrentLevelObject: string | SessionLeanLevel | null = null;

    if (g.currentLevelObject) {
      if (
        typeof g.currentLevelObject === "object" &&
        g.currentLevelObject._id
      ) {
        const lvl = g.currentLevelObject as OriginalILevel;
        formattedCurrentLevelObject = {
          _id: lvl._id.toString(),
          levelNumber: lvl.levelNumber,
          title: lvl.title,
          levelGroupName: lvl.levelGroupName,
          xpRequiredForThisLevel: lvl.xpRequiredForThisLevel,
          xpToNextLevelFromThis: lvl.xpToNextLevelFromThis,
          rewardsOnReach: lvl.rewardsOnReach?.map(
            (r: ILevelReward): SessionLevelReward => ({
              type: r.type,
              coinsAwarded: r.coinsAwarded,
              achievementIdToUnlock: r.achievementIdToUnlock?.toString(),
              badgeIdToAward: r.badgeIdToAward?.toString(),
              featureKeyToUnlock: r.featureKeyToUnlock,
              cosmeticItemKey: r.cosmeticItemKey,
              description: r.description,
            })
          ),
          description: lvl.description,
          iconUrl: lvl.iconUrl,
          themeColor: lvl.themeColor,
          isActive: lvl.isActive,
          schemaVersion: lvl.schemaVersion,
          createdAt: toISOStringOrUndefined(lvl.createdAt),
          updatedAt: toISOStringOrUndefined(lvl.updatedAt),
        };
      } else if (g.currentLevelObject) {
        formattedCurrentLevelObject = g.currentLevelObject.toString();
      }
    }
    
    return {
      level: g.level,
      currentLevelObject: formattedCurrentLevelObject,
      experiencePoints: g.experiencePoints,
      totalExperiencePointsEverEarned: g.totalExperiencePointsEverEarned,
      nextLevelXPThreshold: g.nextLevelXPThreshold,
      achievements: g.achievements?.map((id: any) => id.toString()) || [],
      showcasedItems: [], // Moved to UserProfile
      primaryDisplayBadge: undefined, // Moved to UserProfile
      secondaryDisplayBadges: [], // Moved to UserProfile
      loginStreaks: {
        currentStreakDays: g.loginStreaks?.currentStreakDays || 0,
        longestStreakDays: g.loginStreaks?.longestStreakDays || 0,
        lastLoginDate: toISOStringOrUndefined(g.loginStreaks?.lastLoginDate),
      },
      dailyCheckIn: {
        currentStreakDays: g.dailyCheckIn?.currentStreakDays || 0,
        lastCheckInDate: toISOStringOrUndefined(g.dailyCheckIn?.lastCheckInDate),
      },
      lastActivityAt: toISOStringOrUndefined(g.lastActivityAt),
    };
  };

  return {
    id: _id.toString(),
    name: profile?.displayName || username || "User",
    email: email || undefined,
    username: username || `user${_id.toString().slice(-6)}`,
    roles: roles || ["Reader"],
    profile: profile || { displayName: username || "User" },
    trackingStats: trackingStats || {
      joinDate: new Date(),
      totalLoginDays: 0,
      totalNovelsRead: 0,
      totalEpisodesRead: 0,
      totalTimeSpentReadingSeconds: 0,
      totalCoinSpent: 0,
      totalRealMoneySpent: 0,
    },
    socialStats: socialStats || {
      followersCount: 0,
      followingUsersCount: 0,
      followingNovelsCount: 0,
      novelsCreatedCount: 0,
      boardPostsCreatedCount: 0,
      commentsMadeCount: 0,
      ratingsGivenCount: 0,
      likesGivenCount: 0,
    },
    preferences: preferences || {
        settingsVersion: 1, // Add default for version
        language: "th",
        display: {
            theme: "system",
            reading: {} as any,
            accessibility: {} as any,
            uiVisibility: {} as any,
            visualEffects: {} as any,
            characterDisplay: {} as any,
            characterVoiceDisplay: {} as any,
            backgroundDisplay: {} as any,
            voiceSubtitles: {} as any,
        },
        notifications: {
            masterNotificationsEnabled: true,
            email: {} as any,
            push: {} as any,
            inApp: {} as any,
            saveLoad: {} as any,
            newContent: {} as any,
            outOfGame: {} as any,
            optional: {} as any,
        },
        contentAndPrivacy: {
            showMatureContent: false,
            preferredGenres: [],
            blockedGenres: [],
            blockedTags: [],
            blockedAuthors: [],
            blockedNovels: [],
            profileVisibility: "public",
            readingHistoryVisibility: "followers_only",
            showActivityStatus: true,
            allowDirectMessagesFrom: "followers",
            analyticsConsent: { allowPsychologicalAnalysis: false, allowPersonalizedFeedback: false },
        },
        visualNovelGameplay: {} as any,
    },
    wallet: wallet || { coinBalance: 0 },
    gamification: formatGamification(gamification as OriginalUserGamification | undefined),
    writerVerification: writerVerification,
    donationSettings: donationSettings,
    writerStats: writerStats,
    isActive: isActive !== undefined ? isActive : true,
    isEmailVerified: isEmailVerified !== undefined ? isEmailVerified : false,
    isBanned: isBanned !== undefined ? isBanned : false,
    bannedUntil: toISOStringOrUndefined(bannedUntil),
  };
}


// Provider Profile Interfaces (คงเดิม)
interface GoogleProfile extends Profile {
  picture?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}
interface TwitterProfile extends Profile {
  data?: { name?: string; username?: string; profile_image_url?: string };
  name?: string;
  username?: string;
  profile_image_url?: string;
}
interface FacebookProfile extends Profile {
  picture?: { data?: { url?: string } };
  first_name?: string;
  last_name?: string;
}
interface AppleProfile extends Omit<Profile, "name"> {
  name?: { firstName?: string; lastName?: string };
  picture?: string;
}
interface LineProfile extends Profile {
  displayName?: string;
  pictureUrl?: string;
  userId?: string;
}

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
  // adapter: ไม่มี adapter เนื่องจากผู้ใช้ไม่ต้องการใช้ @next-auth/mongodb-adapter
  // และ strategy เป็น "jwt"
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        identifier: { label: "อีเมลหรือชื่อผู้ใช้", type: "text" },
        password: { label: "รหัสผ่าน", type: "password" },
      },
      async authorize(credentials) {
        // Logic การ authorize ของ CredentialsProvider (คงเดิมจากโค้ดผู้ใช้)
        // ตรวจสอบให้แน่ใจว่า API /api/auth/signin/credentials ทำงานถูกต้อง
        // และคืนค่า user object ที่มีโครงสร้างตาม IUser
        try {
          console.log(
            `⏳ [AuthOptions] เริ่มการตรวจสอบ CredentialsProvider สำหรับ identifier=${credentials?.identifier}`
          );
          if (!credentials?.identifier || !credentials?.password) {
            console.error("❌ [AuthOptions] ขาดข้อมูล identifier หรือ password");
            throw new Error("กรุณาระบุอีเมล/ชื่อผู้ใช้ และรหัสผ่าน");
          }

          const response = await fetch(
            `${process.env.NEXTAUTH_URL}/api/auth/signin/credentials`,
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

          // responseData.user คือ plain object ที่ได้จาก API
          // toSessionUserFormat จะแปลง plain object นี้ให้เป็น SessionUser
          // และ authorize callback จะต้องคืนค่า object ที่มีโครงสร้างตรงกับ SessionUser หรืออย่างน้อยมี id
          console.log(`✅ [AuthOptions] CredentialsProvider สำเร็จสำหรับผู้ใช้ ${(responseData.user as IUser).email || (responseData.user as IUser).username}`);
          // ที่นี่ responseData.user เป็น full object ที่ได้มาจาก API ซึ่งมีข้อมูลครบถ้วนแล้ว
          return toSessionUserFormat(responseData.user as any);

        } catch (error: any) {
          console.error(
            `❌ [AuthOptions] ข้อผิดพลาดใน authorize (CredentialsProvider): ${error.message}`
          );
          throw new Error(
            error.message || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์"
          );
        }
      },
    }),
    // ... (OAuth Providers คงเดิม)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { prompt: "consent", access_type: "offline", response_type: "code", scope: "openid email profile" } },
    }),
    TwitterProvider({
        clientId: process.env.TWITTER_CLIENT_ID as string,
        clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
        version: "2.0",
        allowDangerousEmailAccountLinking: true,
        authorization: { params: { scope: "users.read tweet.read offline.access" } },
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
        authorization: { params: { scope: "name email", response_mode: "form_post" } },
    }),
    LineProvider({
        clientId: process.env.LINE_CLIENT_ID as string,
        clientSecret: process.env.LINE_CLIENT_SECRET as string,
        allowDangerousEmailAccountLinking: true,
        authorization: { params: { scope: "profile openid email" } },
    }),
  ],

  session: {
    strategy: "jwt", // ใช้ JWT strategy
    maxAge: 30 * 24 * 60 * 60, // 30 วัน
  },

  callbacks: {
    async jwt({ token, user, account, profile, trigger }) {
      // `user` ที่ส่งมาให้ JWT callback นี้คือ object ที่ authorize() return (สำหรับ credentials)
      // หรือเป็น object ที่สร้างจาก profile (สำหรับ OAuth)

      // **ปรับปรุง: ลดขนาดข้อมูลใน JWT Token ให้เหลือน้อยที่สุด**
      if (account && user) { // Sign-in or link account
        console.log(`⏳ [AuthOptions JWT] Sign-in/Link. Provider=${account.provider}, UserID from 'user' obj=${user.id}`);
        // `user.id` ควรจะมีอยู่แล้วจาก authorize() หรือการ map profile ของ OAuth
        token.id = user.id;
        token.provider = account.provider;

        // ดึงข้อมูล username และ roles จาก user object
        // สำหรับ Credentials: user object คือ SessionUser ที่ได้จาก toSessionUserFormat(responseData.user)
        // สำหรับ OAuth: user object อาจจะต้องดึงข้อมูลจาก API /api/auth/signin/oauth
        if (account.provider === "credentials") {
            const sessionUserCredentials = user as SessionUser; // Cast 'user' ที่ได้จาก authorize()
            token.username = sessionUserCredentials.username;
            token.roles = sessionUserCredentials.roles;
        } else { // OAuth sign-in
            // Logic การดึงข้อมูลจาก OAuth profile และเรียก API ของคุณ (คงเดิมจากโค้ดผู้ใช้)
            let apiEmailFromProfile: string | undefined = (profile as any)?.email;
            let apiDisplayNameFromProfile: string = "";
            let apiUsernameSuggestionFromProfile: string = "";
            let apiAvatarUrlFromProfile: string | undefined = undefined;

            switch (account.provider) {
                case "google":
                    const googleProfile = profile as GoogleProfile;
                    apiEmailFromProfile = googleProfile.email;
                    apiDisplayNameFromProfile = googleProfile.name || googleProfile.given_name || "";
                    if (googleProfile.given_name && googleProfile.family_name) { apiDisplayNameFromProfile = `${googleProfile.given_name} ${googleProfile.family_name}`.trim(); }
                    apiAvatarUrlFromProfile = googleProfile.picture;
                    break;
                case "twitter":
                    const twitterProfile = profile as TwitterProfile;
                    apiEmailFromProfile = twitterProfile.email;
                    apiDisplayNameFromProfile = twitterProfile.data?.name || twitterProfile.name || "";
                    apiUsernameSuggestionFromProfile = twitterProfile.data?.username || twitterProfile.username || "";
                    apiAvatarUrlFromProfile = twitterProfile.data?.profile_image_url?.replace('_normal', '_400x400'); // Get higher resolution
                    break;
                case "facebook":
                    const facebookProfile = profile as FacebookProfile;
                    apiEmailFromProfile = facebookProfile.email;
                    apiDisplayNameFromProfile = facebookProfile.name || `${facebookProfile.first_name || ""} ${facebookProfile.last_name || ""}`.trim();
                    apiAvatarUrlFromProfile = facebookProfile.picture?.data?.url;
                    break;
                case "apple":
                    const appleProfile = profile as AppleProfile;
                    apiEmailFromProfile = appleProfile.email;
                    apiDisplayNameFromProfile = appleProfile.name ? `${appleProfile.name.firstName || ""} ${appleProfile.name.lastName || ""}`.trim() : "";
                    apiAvatarUrlFromProfile = appleProfile.picture;
                    break;
                case "line":
                    const lineProfile = profile as LineProfile;
                    apiEmailFromProfile = lineProfile.email;
                    apiDisplayNameFromProfile = lineProfile.displayName || "";
                    apiAvatarUrlFromProfile = lineProfile.pictureUrl;
                    break;
            }

            // Generate username suggestion if not available from provider (e.g., Twitter)
            if (!apiUsernameSuggestionFromProfile) {
                apiUsernameSuggestionFromProfile = apiEmailFromProfile?.split("@")[0] || apiDisplayNameFromProfile.replace(/\s+/g, "").toLowerCase() || `user_${Date.now().toString().slice(-6)}`;
            }

            if (!apiEmailFromProfile && account.provider !== "twitter" && account.provider !== "apple") {
                console.error(`❌ [AuthOptions JWT] Email not received from ${account.provider} for user ${apiDisplayNameFromProfile}`);
                throw new Error(`Email not received from ${account.provider}.`);
            }
            if ((account.provider === "twitter" || account.provider === "apple") && !apiEmailFromProfile && !apiUsernameSuggestionFromProfile) {
                console.error(`❌ [AuthOptions JWT] Insufficient data from ${account.provider} for user ${apiDisplayNameFromProfile}`);
                throw new Error(`Insufficient data from ${account.provider}.`);
            }

            try {
                console.log(`⏳ [AuthOptions JWT] OAuth: Calling /api/auth/signin/oauth for provider=${account.provider}, accountId=${account.providerAccountId}`);
                const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/signin/oauth`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        provider: account.provider,
                        providerAccountId: account.providerAccountId,
                        email: apiEmailFromProfile || null,
                        name: apiDisplayNameFromProfile,
                        usernameSuggestion: apiUsernameSuggestionFromProfile,
                        picture: apiAvatarUrlFromProfile || null, // Use the clean variable
                    }),
                });
                const responseData = await response.json();
                if (!response.ok || !responseData.user) {
                    console.error(`❌ [AuthOptions JWT] ข้อผิดพลาดในการบันทึก/ดึงข้อมูลผู้ใช้ OAuth (${account.provider}):`, responseData.error || "API did not return user");
                    throw new Error(responseData.error || `ไม่สามารถประมวลผลผู้ใช้ ${account.provider}`);
                }
                const oauthUserFromApi = responseData.user as IUser & { _id: Types.ObjectId | string };
                // token.id ถูกตั้งค่าไปแล้วจาก user.id ที่ NextAuth ส่งมา
                // เราต้องแน่ใจว่า user.id ที่ NextAuth ส่งมาตรงกับ oauthUserFromApi._id.toString()
                // หรืออัปเดต token.id ที่นี่
                token.id = oauthUserFromApi._id.toString(); // <--- ตรวจสอบและอัปเดตถ้าจำเป็น
                token.username = oauthUserFromApi.username || `user${oauthUserFromApi._id.toString().slice(-6)}`;
                token.roles = oauthUserFromApi.roles || ["Reader"];
            } catch (error: any) {
                console.error(`❌ [AuthOptions JWT] ข้อผิดพลาดขณะประมวลผล OAuth (${account.provider}): ${error.message}`);
                throw error; // Re-throw เพื่อให้ NextAuth จัดการ
            }
        }
        // ลบ name และ email ออกจาก token โดยตรง เพื่อลดขนาด cookie
        delete token.name;
        delete token.email;
        console.log(`✅ [AuthOptions JWT] Token populated minimally for ${token.username} (ID: ${token.id})`);
      }

      // Handle session updates (e.g., user updates profile)
      if (trigger === "update" && token.id) {
        console.log(`⏳ [AuthOptions JWT] 'update' trigger for user ID: ${token.id}. Re-fetching essential data...`);
        try {
          await dbConnect(); // Ensure DB connection
          const userFromDb = await UserModel.findById(token.id).lean();

          if (userFromDb) {
            // อัปเดตเฉพาะ field ที่จำเป็นและเก็บใน token จริงๆ
            token.username = userFromDb.username || `user${userFromDb._id.toString().slice(-6)}`;
            token.roles = userFromDb.roles || ["Reader"];
            // ไม่ต้องอัปเดต preferences หรือข้อมูลอื่นๆ ใน token โดยตรง
            // console.log(`✅ [AuthOptions JWT] Token (essential fields) updated for ${token.username}. New username: ${token.username}`);
          } else {
            console.warn(`⚠️ [AuthOptions JWT] User not found in DB during 'update' for token ID: ${token.id}`);
          }
        } catch (error: any) {
          console.error(`❌ [AuthOptions JWT] Error re-fetching user for 'update': ${error.message}`, error.stack);
        }
      }
      return token;
    },

    async session({ session, token }) {
        // token ที่ได้จาก jwt callback จะมีเฉพาะ id, username, roles, provider
        console.log(`⏳ [AuthOptions Session] Session callback for token.id=${token.id}`);
        if (token && token.id) {
            try {
                await dbConnect();

                // ########## START: โค้ดที่แก้ไข ##########
                
                // Step 1: ดึงข้อมูลทั้งหมดที่เกี่ยวข้องกับผู้ใช้แบบขนาน (Parallel)
                const [
                    coreUser,
                    userProfile,
                    userGamification,
                    userSettings,
                    userTracking,
                    userSecurity,
                    writerStats,
                ] = await Promise.all([
                    UserModel.findById(token.id).lean(),
                    UserProfileModel.findOne({ userId: token.id }).lean(),
                    // Populate ที่ Model ที่ถูกต้อง (UserGamificationModel)
                    UserGamificationModel.findOne({ userId: token.id })
                        .populate({
                            path: 'gamification.currentLevelObject',
                            model: 'Level', // ชื่อ model ของ Level
                        })
                        .lean(),
                    UserSettingsModel.findOne({ userId: token.id }).lean(),
                    UserTrackingModel.findOne({ userId: token.id }).lean(),
                    UserSecurityModel.findOne({ userId: token.id }).lean(),
                    WriterStatsModel.findOne({ userId: token.id }).lean(),
                ]);

                // Step 2: ตรวจสอบว่ามีผู้ใช้หลัก (Core User) อยู่จริง
                if (coreUser) {
                    // Step 3: รวมข้อมูลทั้งหมดเป็น Object เดียวเพื่อส่งให้ toSessionUserFormat
                    const combinedUserDoc = {
                        ...coreUser,
                        profile: userProfile,
                        socialStats: userProfile?.socialStats,
                        trackingStats: userTracking?.trackingStats,
                        preferences: userSettings,
                        wallet: userGamification?.wallet,
                        gamification: userGamification?.gamification,
                        writerVerification: userSecurity?.verification,
                        donationSettings: writerStats?.donationSettings,
                        writerStats: writerStats,
                    };

                    // Step 4: แปลง Mongoose document (หรือ lean object) เป็น SessionUser format
                    session.user = toSessionUserFormat(combinedUserDoc);
                    console.log(`✅ [AuthOptions Session] Session created/updated for user: ${session.user.username}`);
                } else {
                    console.error(`❌ [AuthOptions Session] User with ID ${token.id} not found in DB. Session will be invalid.`);
                    session.user = null; // ทำให้ session.user เป็น null เพื่อให้ client จัดการการออกจากระบบ
                }
                
                // ########## END: โค้ดที่แก้ไข ##########

            } catch (error: any) {
                console.error(`❌ [AuthOptions Session] Error fetching user from DB for session: ${error.message}`, error.stack);
                session.user = null; // ทำให้ session ไม่สมบูรณ์หากเกิด error
            }
        } else {
            console.warn(`⚠️ [AuthOptions Session] Token missing id, cannot create full user session.`);
            session.user = null;
        }
        return session;
    },
  },

  pages: {
    signIn: "/auth/signin", // หน้าสำหรับ Custom Sign-in
    signOut: "/auth/signout",
    error: "/auth/error", // หน้าสำหรับแสดงข้อผิดพลาด (เช่น OAuth sign in error)
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Augment NextAuth types
declare module "next-auth" {
  interface Session {
    user: SessionUser | null; // session.user จะมี type เป็น SessionUser หรือ null ถ้า session ไม่สมบูรณ์
  }
  // ไม่จำเป็นต้อง extend NextAuthUser ที่นี่ ถ้า authorize() และ OAuth profile flow ถูกจัดการให้คืนค่าที่มี id
}

// JWT callback จะใช้ interface นี้
// ข้อมูลที่เก็บใน JWT token (ควรน้อยที่สุด)
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username?: string | null;
    roles?: Array<"Reader" | "Writer" | "Admin" | "Moderator" | "Editor">;
    provider?: string;
    // ไม่ควรเก็บ name, email หรือ object ใหญ่ๆ ใน JWT โดยตรงแล้ว
    // ข้อมูลอื่นๆ จะถูกดึงจาก DB ใน session callback
  }
}