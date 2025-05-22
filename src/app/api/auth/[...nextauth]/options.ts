// src/app/api/auth/[...nextauth]/options.ts
// การกำหนดค่า NextAuth สำหรับการยืนยันตัวตน
// รองรับการล็อกอินด้วยอีเมลหรือชื่อผู้ใช้ผ่าน Credentials และ OAuth providers ต่างๆ
// อัปเดต: ปรับ Path การเรียก API และการจัดการ User Model ที่รวมแล้ว
// แก้ไข: จัดการ Type Mismatch สำหรับ Lean Documents และ Populated Fields ใน Session/JWT

import { NextAuthOptions, Profile, User as NextAuthUserAccount } from "next-auth"; // Renamed User to NextAuthUserAccount to avoid conflict
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
  IShowcasedGamificationItem as OriginalShowcasedItem, // Renamed for clarity
  IUserDisplayBadge as OriginalDisplayBadge, // Renamed for clarity
  IUserGamification as OriginalUserGamification
} from "@/backend/models/User";
import UserModel from "@/backend/models/User";
import { ILevelReward, ILevel as OriginalILevel } from "@/backend/models/Level";
import dbConnect from "@/backend/lib/mongodb";

// SECTION: Session-Specific Plain Object Types

// Plain object version of ILevelReward for session
export type SessionLevelReward = Omit<ILevelReward, 'achievementIdToUnlock' | 'badgeIdToAward'> & {
  achievementIdToUnlock?: string; // Assuming string representation of ID or code
  badgeIdToAward?: string;      // Assuming string representation of ID or key
};

// Plain object version of ILevel for session/JWT after .lean()
export type SessionLeanLevel = {
  _id: string;
  levelNumber: number;
  title: string;
  levelGroupName?: string;
  xpRequiredForThisLevel: number;
  xpToNextLevelFromThis?: number;
  rewardsOnReach?: SessionLevelReward[]; // Use SessionLevelReward
  description?: string;
  iconUrl?: string;
  themeColor?: string;
  isActive: boolean;
  schemaVersion: number;
  createdAt?: string; // ISO Date string
  updatedAt?: string; // ISO Date string
};

// Plain object version of IShowcasedGamificationItem
export type SessionShowcasedItem = {
  earnedItemId: string; // ObjectId as string
  itemType: "Achievement" | "Badge";
};

// Plain object version of IUserDisplayBadge
export type SessionDisplayBadge = {
  earnedBadgeId: string; // ObjectId as string
  displayContext?: string;
};

// Plain object version of IUserGamification for session/JWT
export type SessionUserGamification = {
  level: number;
  currentLevelObject?: string | SessionLeanLevel | null; // ObjectId (as string), lean level object, or null
  experiencePoints: number;
  totalExperiencePointsEverEarned?: number;
  nextLevelXPThreshold: number;
  achievements: string[]; // Array of string ObjectIds
  showcasedItems?: SessionShowcasedItem[];
  primaryDisplayBadge?: SessionDisplayBadge;
  secondaryDisplayBadges?: SessionDisplayBadge[];
  loginStreaks: {
    currentStreakDays: number;
    longestStreakDays: number;
    lastLoginDate?: string; // ISO Date string
  };
  dailyCheckIn: {
    lastCheckInDate?: string; // ISO Date string
    currentStreakDays: number;
  };
  lastActivityAt?: string; // ISO Date string
};

// Master SessionUser type for NextAuth session and JWT
export type SessionUser = {
  id: string; // from _id
  name: string;
  email?: string;
  username: string;
  roles: Array<"Reader" | "Writer" | "Admin" | "Moderator" | "Editor">;
  profile: IUserProfile; // Assumed to be plain
  trackingStats: IUserTrackingStats; // Assumed to be plain
  socialStats: IUserSocialStats; // Assumed to be plain
  preferences: IUserPreferences; // Assumed to be plain (contains nested plain interfaces)
  wallet: IUserWallet; // Assumed to be plain
  gamification: SessionUserGamification; // Uses the session-specific gamification type
  writerVerification?: IUserVerification; // Assumed to be plain
  donationSettings?: IUserDonationSettings; // Assumed to be plain
  writerStats?: IWriterStats; // Assumed to be plain; ensure any ObjectIds within are handled if populated
  isActive: boolean;
  isEmailVerified: boolean;
  isBanned: boolean;
  bannedUntil?: string; // ISO Date string
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
function toSessionUserFormat(userDoc: any): SessionUser { // userDoc can be IUser or lean IUser
  const {
    _id,
    profile,
    username, // Ensure username exists, provide fallback if necessary
    email,
    roles,
    trackingStats,
    socialStats,
    preferences,
    wallet,
    gamification,
    verification, // from IUser.verification
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
      if (typeof g.currentLevelObject === 'object' && g.currentLevelObject._id) { // Populated lean ILevel object
        const lvl = g.currentLevelObject;
        formattedCurrentLevelObject = {
          _id: lvl._id.toString(),
          levelNumber: lvl.levelNumber,
          title: lvl.title,
          levelGroupName: lvl.levelGroupName,
          xpRequiredForThisLevel: lvl.xpRequiredForThisLevel,
          xpToNextLevelFromThis: lvl.xpToNextLevelFromThis,
          rewardsOnReach: lvl.rewardsOnReach?.map((r: ILevelReward) => ({ // Ensure rewards are plain
            type: r.type,
            coinsAwarded: r.coinsAwarded,
            achievementIdToUnlock: r.achievementIdToUnlock?.toString(), // if it can be ObjectId/string
            badgeIdToAward: r.badgeIdToAward?.toString(), // if it can be ObjectId/string
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
      } else if (g.currentLevelObject) { // ObjectId that might not have been stringified yet
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
    name: profile?.displayName || username || "User", // Fallback for name
    email: email || undefined,
    username: username || `user${_id.toString().slice(-6)}`, // Ensure username has a value
    roles: roles || ["Reader"], // Default roles
    profile: profile || {}, // Default profile
    trackingStats: trackingStats || { joinDate: new Date(), totalLoginDays:0, totalNovelsRead:0, totalEpisodesRead:0, totalTimeSpentReadingSeconds:0, totalCoinSpent:0, totalRealMoneySpent:0 }, // Default trackingStats
    socialStats: socialStats || { followersCount: 0, followingCount: 0, novelsCreatedCount:0, commentsMadeCount:0,ratingsGivenCount:0, likesGivenCount:0}, // Default socialStats
    preferences: preferences || { language: "th", display: { theme:"system", reading:{fontSize:"medium", readingModeLayout:"scrolling", lineHeight: 1.6, textAlignment: "left"}, accessibility:{dyslexiaFriendlyFont: false, highContrastMode: false}}, notifications:{masterNotificationsEnabled:true, email:{enabled:true}, push:{enabled:true}, inApp:{enabled:true}}, contentAndPrivacy:{showMatureContent:false, preferredGenres:[], profileVisibility:"public", readingHistoryVisibility:"followers_only", showActivityStatus:true, allowDirectMessagesFrom:"followers", analyticsConsent:{allowPsychologicalAnalysis:false}}}, // Default preferences
    wallet: wallet || { coinBalance: 0 }, // Default wallet
    gamification: formatGamification(gamification) as SessionUserGamification, // Apply defaults if gamification itself is missing
    writerVerification: verification, // Default verification
    donationSettings: donationSettings, // Default donationSettings
    writerStats: writerStats, // Default writerStats
    isActive: isActive !== undefined ? isActive : true,
    isEmailVerified: isEmailVerified !== undefined ? isEmailVerified : false,
    isBanned: isBanned !== undefined ? isBanned : false,
    bannedUntil: toISOStringOrUndefined(bannedUntil),
  };
}


// Provider Profile Interfaces (Google, Twitter, etc. - these seem okay from your original code)
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

          // responseData.user is a plain JSON object from your API
          // It should ideally have _id, not id, if it's coming from Mongoose .toJSON() default
          const userFromApi = responseData.user as IUser & { _id: Types.ObjectId | string };


          if (!userFromApi.isEmailVerified && userFromApi.email) {
             console.warn(`⚠️ [AuthOptions] ผู้ใช้ ${userFromApi.email || userFromApi.username} ยังไม่ได้ยืนยันอีเมล แต่ API อนุญาตให้ผ่าน`);
          }
          console.log(`✅ [AuthOptions] CredentialsProvider สำเร็จสำหรับผู้ใช้ ${userFromApi.email || userFromApi.username}`);
          
          // Convert the plain user object from API to SessionUser format
          return toSessionUserFormat(userFromApi) as unknown as NextAuthUserAccount; // Cast to NextAuthUserAccount
        } catch (error: any) {
          console.error(`❌ [AuthOptions] ข้อผิดพลาดใน authorize (CredentialsProvider): ${error.message}`);
          throw new Error(error.message || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์");
        }
      },
    }),
    // OAuth Providers (Google, Twitter, Facebook, Apple, Line)
    // Ensure environment variables are set for these.
    // Example for Google:
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
    maxAge: 30 * 24 * 60 * 60, // 30 วัน
  },

  callbacks: {
    async jwt({ token, user, account, profile, trigger }) {
      // `user` is the object returned from `authorize` or from OAuth processing.
      // It should be in SessionUser format if `authorize` uses `toSessionUserFormat`.
      if (account && user) { // Sign in
        console.log(`⏳ [AuthOptions JWT] Sign-in JWT callback for provider=${account.provider}, user_id=${user.id}`);
        
        // The 'user' object from authorize (already SessionUser format) or OAuth (needs transformation here)
        let sessionData: SessionUser;

        if (account.provider === "credentials") {
            sessionData = user as SessionUser; // Already transformed by authorize
        } else {
            // For OAuth, 'user' is NextAuthUserAccount, 'profile' has provider details.
            // We need to call our API to get/create the full user document.
            let apiEmail: string | undefined = (profile as any)?.email || undefined;
            let apiDisplayName: string = "";
            let apiUsernameSuggestion: string = "";
            let apiAvatar: string | undefined = undefined;

            // Extract info from OAuth profile (same logic as your original code)
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
                // responseData.user from API is expected to be a plain object, needs _id
                sessionData = toSessionUserFormat(responseData.user as IUser & { _id: Types.ObjectId | string });
            } catch (error: any) {
                console.error(`❌ [AuthOptions JWT] ข้อผิดพลาดขณะประมวลผล OAuth (${account.provider}): ${error.message}`);
                throw error; // Propagate error
            }
        }

        // Populate token with SessionUser data
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
        token.bannedUntil = sessionData.bannedUntil; // Already string | undefined from SessionUser
        token.provider = account.provider;
        console.log(`✅ [AuthOptions JWT] Token populated for ${token.username}`);
      }

      if (trigger === "update" && token.id) {
        console.log(`⏳ [AuthOptions JWT] 'update' trigger for user ID: ${token.id}. Re-fetching...`);
        try {
          if (mongoose.connection.readyState === 0) { await dbConnect(); }
          const userFromDbLean = await UserModel.findById(token.id).lean(); // Use .lean()

          if (userFromDbLean) {
            const updatedSessionData = toSessionUserFormat(userFromDbLean); // Convert lean doc
            
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
        // Map all fields from the JWT (which is now SessionUser compatible) to session.user
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
          bannedUntil: token.bannedUntil as string | undefined, // Matches SessionUser.bannedUntil
        };
        // console.log(`✅ [AuthOptions Session] Session created/updated for ${session.user.username}`);
      } else {
        console.warn(`⚠️ [AuthOptions Session] Token missing id, cannot create user session.`);
        // session.user = null; // Or handle as appropriate
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
  interface User extends SessionUser {} // User in NextAuth callbacks should align with SessionUser
  interface Session {
    user: SessionUser; // Session.user is SessionUser
  }
}

declare module "next-auth/jwt" {
  interface JWT extends SessionUser { // JWT object itself also aligns with SessionUser
    provider?: string;
  }
}