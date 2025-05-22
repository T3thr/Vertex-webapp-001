// src/app/api/auth/[...nextauth]/options.ts
// การกำหนดค่า NextAuth สำหรับการยืนยันตัวตน
// รองรับการล็อกอินด้วยอีเมลหรือชื่อผู้ใช้ผ่าน Credentials และ OAuth providers ต่างๆ
// อัปเดต: ปรับ Path การเรียก API และการจัดการ User Model ที่รวมแล้ว
// แก้ไข: จัดการ Type Mismatch สำหรับ Lean Documents และ Populated Fields ใน Session/JWT
// แก้ไขเพิ่มเติม: ลบ/ปรับ interface User ที่ว่างเปล่าเพื่อแก้ไข @typescript-eslint/no-empty-object-type

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
import {
  IUser,
  IUserProfile,
  IUserTrackingStats,
  IUserSocialStats,
  IUserPreferences,
  IUserWallet,
  IUserVerification,
  IUserDonationSettings,
  IWriterStats,
  IShowcasedGamificationItem as OriginalShowcasedItem,
  IUserDisplayBadge as OriginalDisplayBadge,
  IUserGamification as OriginalUserGamification
} from "@/backend/models/User";
import UserModel from "@/backend/models/User";
import { ILevelReward, ILevel as OriginalILevel } from "@/backend/models/Level";
import dbConnect from "@/backend/lib/mongodb";

// SECTION: Session-Specific Plain Object Types

export type SessionLevelReward = Omit<ILevelReward, 'achievementIdToUnlock' | 'badgeIdToAward'> & {
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
};

// END SECTION: Session-Specific Plain Object Types

// Helper to convert date to ISO string if it's a Date object or valid date string
const toISOStringOrUndefined = (date?: Date | string): string | undefined => {
  if (!date) return undefined;
  try {
    return new Date(date).toISOString();
  } catch (e) {
    return undefined;
  }
};

// Helper function to convert a Mongoose document (or lean object) to SessionUser format
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
    verification,
    donationSettings,
    writerStats,
    isActive,
    isEmailVerified,
    isBanned,
    bannedUntil,
  } = userDoc;

  const formatGamification = (g: any): SessionUserGamification | undefined => {
    if (!g) return undefined;
    let formattedCurrentLevelObject: string | SessionLeanLevel | null = null;

    if (g.currentLevelObject) {
      if (typeof g.currentLevelObject === 'object' && g.currentLevelObject._id) {
        const lvl = g.currentLevelObject;
        formattedCurrentLevelObject = {
          _id: lvl._id.toString(),
          levelNumber: lvl.levelNumber,
          title: lvl.title,
          levelGroupName: lvl.levelGroupName,
          xpRequiredForThisLevel: lvl.xpRequiredForThisLevel,
          xpToNextLevelFromThis: lvl.xpToNextLevelFromThis,
          rewardsOnReach: lvl.rewardsOnReach?.map((r: ILevelReward) => ({
            type: r.type,
            coinsAwarded: r.coinsAwarded,
            achievementIdToUnlock: r.achievementIdToUnlock?.toString(),
            badgeIdToAward: r.badgeIdToAward?.toString(),
            featureKeyToUnlock: r.featureKeyToUnlock,
            cosmeticItemKey: r.cosmeticItemKey,
            description: r.description,
          })),
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
      showcasedItems: g.showcasedItems?.map((item: OriginalShowcasedItem) => ({ ...item, earnedItemId: item.earnedItemId.toString() })) || [],
      primaryDisplayBadge: g.primaryDisplayBadge ? { ...g.primaryDisplayBadge, earnedBadgeId: g.primaryDisplayBadge.earnedBadgeId.toString() } : undefined,
      secondaryDisplayBadges: g.secondaryDisplayBadges?.map((badge: OriginalDisplayBadge) => ({ ...badge, earnedBadgeId: badge.earnedBadgeId.toString() })) || [],
      loginStreaks: {
        ...(g.loginStreaks || {}),
        lastLoginDate: toISOStringOrUndefined(g.loginStreaks?.lastLoginDate),
      },
      dailyCheckIn: {
        ...(g.dailyCheckIn || {}),
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
    profile: profile || {},
    trackingStats: trackingStats || { joinDate: new Date(), totalLoginDays:0, totalNovelsRead:0, totalEpisodesRead:0, totalTimeSpentReadingSeconds:0, totalCoinSpent:0, totalRealMoneySpent:0 },
    socialStats: socialStats || { followersCount: 0, followingCount: 0, novelsCreatedCount:0, commentsMadeCount:0,ratingsGivenCount:0, likesGivenCount:0},
    preferences: preferences || { language: "th", display: { theme:"system", reading:{fontSize:"medium", readingModeLayout:"scrolling", lineHeight: 1.6, textAlignment: "left"}, accessibility:{dyslexiaFriendlyFont: false, highContrastMode: false}}, notifications:{masterNotificationsEnabled:true, email:{enabled:true}, push:{enabled:true}, inApp:{enabled:true}}, contentAndPrivacy:{showMatureContent:false, preferredGenres:[], profileVisibility:"public", readingHistoryVisibility:"followers_only", showActivityStatus:true, allowDirectMessagesFrom:"followers", analyticsConsent:{allowPsychologicalAnalysis:false}}},
    wallet: wallet || { coinBalance: 0 },
    gamification: formatGamification(gamification) as SessionUserGamification,
    writerVerification: verification,
    donationSettings: donationSettings,
    writerStats: writerStats,
    isActive: isActive !== undefined ? isActive : true,
    isEmailVerified: isEmailVerified !== undefined ? isEmailVerified : false,
    isBanned: isBanned !== undefined ? isBanned : false,
    bannedUntil: toISOStringOrUndefined(bannedUntil),
  };
}

// Provider Profile Interfaces
interface GoogleProfile extends Profile { picture?: string; name?: string; given_name?: string; family_name?: string; }
interface TwitterProfile extends Profile { data?: { name?: string; username?: string; profile_image_url?: string; }; name?: string; username?: string; profile_image_url?: string; }
interface FacebookProfile extends Profile { picture?: { data?: { url?: string; }; }; first_name?: string; last_name?: string;}
interface AppleProfile extends Omit<Profile, "name"> { name?: { firstName?: string; lastName?: string; }; picture?: string; }
interface LineProfile extends Profile { displayName?: string; pictureUrl?: string; userId?: string; }

const validateEnv = () => {
  const requiredEnvVars = [
    { key: "GOOGLE_CLIENT_ID", provider: "Google" }, { key: "GOOGLE_CLIENT_SECRET", provider: "Google" },
    { key: "TWITTER_CLIENT_ID", provider: "Twitter" }, { key: "TWITTER_CLIENT_SECRET", provider: "Twitter" },
    { key: "FACEBOOK_CLIENT_ID", provider: "Facebook" }, { key: "FACEBOOK_CLIENT_SECRET", provider: "Facebook" },
    { key: "APPLE_CLIENT_ID", provider: "Apple" }, { key: "APPLE_CLIENT_SECRET", provider: "Apple" },
    { key: "LINE_CLIENT_ID", provider: "Line" }, { key: "LINE_CLIENT_SECRET", provider: "Line" },
    { key: "NEXTAUTH_SECRET", provider: "NextAuth" }, { key: "NEXTAUTH_URL", provider: "NextAuth" },
    { key: "MONGODB_URI", provider: "Database" },
  ];
  const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar.key]).map((envVar) => envVar.key);
  if (missingVars.length > 0) {
    console.warn(`⚠️ คำเตือน: ตัวแปรสภาพแวดล้อมต่อไปนี้ไม่ได้ถูกกำหนด: ${missingVars.join(", ")}. Providers ที่เกี่ยวข้องอาจไม่ทำงาน`);
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
          console.log(`⏳ [AuthOptions] เริ่มการตรวจสอบ CredentialsProvider สำหรับ identifier=${credentials?.identifier}`);
          if (!credentials?.identifier || !credentials?.password) {
            console.error("❌ [AuthOptions] ขาดข้อมูล identifier หรือ password");
            throw new Error("กรุณาระบุอีเมล/ชื่อผู้ใช้ และรหัสผ่าน");
          }

          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/signin/credentials`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: credentials.identifier, password: credentials.password }),
          });

          const responseData = await response.json();

          if (!response.ok || !responseData.user) {
            console.error(`❌ [AuthOptions] การตรวจสอบ Credentials ล้มเหลวจาก API: ${responseData.error || "ไม่มีข้อมูลผู้ใช้"}`);
            throw new Error(responseData.error || "ข้อมูลรับรองไม่ถูกต้อง หรือเกิดข้อผิดพลาด");
          }

          const userFromApi = responseData.user as IUser & { _id: Types.ObjectId | string };

          if (!userFromApi.isEmailVerified && userFromApi.email) {
             console.warn(`⚠️ [AuthOptions] ผู้ใช้ ${userFromApi.email || userFromApi.username} ยังไม่ได้ยืนยันอีเมล แต่ API อนุญาตให้ผ่าน`);
          }
          console.log(`✅ [AuthOptions] CredentialsProvider สำเร็จสำหรับผู้ใช้ ${userFromApi.email || userFromApi.username}`);
          
          return toSessionUserFormat(userFromApi);
        } catch (error: any) {
          console.error(`❌ [AuthOptions] ข้อผิดพลาดใน authorize (CredentialsProvider): ${error.message}`);
          throw new Error(error.message || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์");
        }
      },
    }),
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
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user, account, profile, trigger }) {
      if (account && user) {
        console.log(`⏳ [AuthOptions JWT] Sign-in JWT callback for provider=${account.provider}, user_id=${user.id}`);
        
        let sessionData: SessionUser;

        if (account.provider === "credentials") {
            sessionData = user as SessionUser;
        } else {
            let apiEmail: string | undefined = (profile as any)?.email || undefined;
            let apiDisplayName: string = "";
            let apiUsernameSuggestion: string = "";
            let apiAvatar: string | undefined = undefined;

            switch (account.provider) {
                case "google":
                    const googleProfile = profile as GoogleProfile;
                    apiEmail = googleProfile.email || undefined;
                    apiDisplayName = googleProfile.name || googleProfile.given_name || "";
                    if (googleProfile.given_name && googleProfile.family_name) { apiDisplayName = `${googleProfile.given_name} ${googleProfile.family_name}`.trim(); }
                    apiUsernameSuggestion = apiEmail?.split("@")[0] || apiDisplayName.replace(/\s+/g, "").toLowerCase() || `user_${Date.now().toString().slice(-6)}`;
                    apiAvatar = googleProfile.picture || undefined;
                    break;
                case "twitter":
                    const twitterProfile = profile as TwitterProfile;
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
                    apiEmail = appleProfile.email || undefined;
                    apiDisplayName = appleProfile.name ? `${appleProfile.name.firstName || ""} ${appleProfile.name.lastName || ""}`.trim() : "";
                    apiUsernameSuggestion = apiEmail?.split("@")[0] || apiDisplayName.replace(/\s+/g, "").toLowerCase() || `user_${Date.now().toString().slice(-6)}`;
                    apiAvatar = appleProfile.picture || undefined;
                    break;
                case "line":
                    const lineProfile = profile as LineProfile;
                    apiEmail = lineProfile.email || undefined;
                    apiDisplayName = lineProfile.displayName || "";
                    apiUsernameSuggestion = apiEmail?.split("@")[0] || apiDisplayName.replace(/\s+/g, "").toLowerCase() || `user_${Date.now().toString().slice(-6)}`;
                    apiAvatar = lineProfile.pictureUrl || undefined;
                    break;
            }

            if (!apiEmail && account.provider !== "twitter") {
                console.error(`❌ [AuthOptions JWT] ไม่มีอีเมลจาก ${account.provider} provider สำหรับผู้ใช้ ${apiDisplayName}`);
                throw new Error(`ไม่ได้รับอีเมลจาก ${account.provider}.`);
            }
            if (account.provider === "twitter" && !apiEmail && !apiUsernameSuggestion) {
                console.error(`❌ [AuthOptions JWT] ไม่มีทั้งอีเมลและชื่อผู้ใช้จาก Twitter provider สำหรับผู้ใช้ ${apiDisplayName}`);
                throw new Error("ไม่ได้รับข้อมูลที่เพียงพอจาก Twitter.");
            }

            try {
                const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/signin/oauth`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        provider: account.provider,
                        providerAccountId: account.providerAccountId,
                        email: apiEmail || null,
                        name: apiDisplayName,
                        usernameSuggestion: apiUsernameSuggestion,
                        picture: apiAvatar || null,
                    }),
                });
                const responseData = await response.json();
                if (!response.ok || !responseData.user) {
                    console.error(`❌ [AuthOptions JWT] ข้อผิดพลาดในการบันทึก/ดึงข้อมูลผู้ใช้ OAuth (${account.provider}):`, responseData.error);
                    throw new Error(responseData.error || `ไม่สามารถประมวลผลผู้ใช้ ${account.provider}`);
                }
                sessionData = toSessionUserFormat(responseData.user as IUser & { _id: Types.ObjectId | string });
            } catch (error: any) {
                console.error(`❌ [AuthOptions JWT] ข้อผิดพลาดขณะประมวลผล OAuth (${account.provider}): ${error.message}`);
                throw error;
            }
        }

        token.id = sessionData.id;
        token.name = sessionData.name;
        token.email = sessionData.email;
        token.username = sessionData.username;
        token.roles = sessionData.roles;
        token.profile = sessionData.profile;
        token.trackingStats = sessionData.trackingStats;
        token.socialStats = sessionData.socialStats;
        token.preferences = sessionData.preferences;
        token.wallet = sessionData.wallet;
        token.gamification = sessionData.gamification;
        token.writerVerification = sessionData.writerVerification;
        token.donationSettings = sessionData.donationSettings;
        token.writerStats = sessionData.writerStats;
        token.isActive = sessionData.isActive;
        token.isEmailVerified = sessionData.isEmailVerified;
        token.isBanned = sessionData.isBanned;
        token.bannedUntil = sessionData.bannedUntil;
        token.provider = account.provider;
        console.log(`✅ [AuthOptions JWT] Token populated for ${token.username}`);
      }

      if (trigger === "update" && token.id) {
        console.log(`⏳ [AuthOptions JWT] 'update' trigger for user ID: ${token.id}. Re-fetching...`);
        try {
          if (mongoose.connection.readyState === 0) { await dbConnect(); }
          const userFromDbLean = await UserModel.findById(token.id).lean();

          if (userFromDbLean) {
            const updatedSessionData = toSessionUserFormat(userFromDbLean);
            
            token.id = updatedSessionData.id;
            token.name = updatedSessionData.name;
            token.email = updatedSessionData.email;
            token.username = updatedSessionData.username;
            token.roles = updatedSessionData.roles;
            token.profile = updatedSessionData.profile;
            token.trackingStats = updatedSessionData.trackingStats;
            token.socialStats = updatedSessionData.socialStats;
            token.preferences = updatedSessionData.preferences;
            token.wallet = updatedSessionData.wallet;
            token.gamification = updatedSessionData.gamification;
            token.writerVerification = updatedSessionData.writerVerification;
            token.donationSettings = updatedSessionData.donationSettings;
            token.writerStats = updatedSessionData.writerStats;
            token.isActive = updatedSessionData.isActive;
            token.isEmailVerified = updatedSessionData.isEmailVerified;
            token.isBanned = updatedSessionData.isBanned;
            token.bannedUntil = updatedSessionData.bannedUntil;
            console.log(`✅ [AuthOptions JWT] Token updated for ${token.username}. New theme: ${updatedSessionData.preferences?.display?.theme}`);
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
      if (token && token.id) {
        session.user = {
          id: token.id as string,
          name: token.name as string,
          email: token.email as string | undefined,
          username: token.username as string,
          roles: token.roles as SessionUser["roles"],
          profile: token.profile as IUserProfile,
          trackingStats: token.trackingStats as IUserTrackingStats,
          socialStats: token.socialStats as IUserSocialStats,
          preferences: token.preferences as IUserPreferences,
          wallet: token.wallet as IUserWallet,
          gamification: token.gamification as SessionUserGamification,
          writerVerification: token.writerVerification as SessionUser["writerVerification"],
          donationSettings: token.donationSettings as SessionUser["donationSettings"],
          writerStats: token.writerStats as SessionUser["writerStats"],
          isActive: token.isActive as boolean,
          isEmailVerified: token.isEmailVerified as boolean,
          isBanned: token.isBanned as boolean,
          bannedUntil: token.bannedUntil as string | undefined,
        };
      } else {
        console.warn(`⚠️ [AuthOptions Session] Token missing id, cannot create user session.`);
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Augment NextAuth types
declare module "next-auth" {
  // interface User extends SessionUser {} // Removed to fix @typescript-eslint/no-empty-object-type
  interface Session {
    user: SessionUser; // Directly use SessionUser
  }
}

declare module "next-auth/jwt" {
  interface JWT extends SessionUser {
    provider?: string;
  }
}