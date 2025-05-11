// src/app/api/auth/[...nextauth]/options.ts
// การกำหนดค่า NextAuth สำหรับการยืนยันตัวตน
// รองรับการล็อกอินด้วยอีเมลหรือชื่อผู้ใช้ผ่าน Credentials และ OAuth providers ต่างๆ

import { NextAuthOptions, Profile, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import FacebookProvider from "next-auth/providers/facebook";
import AppleProvider from "next-auth/providers/apple";
import LineProvider from "next-auth/providers/line";
import { JWT } from "next-auth/jwt";
import { Types } from "mongoose";

// กำหนดประเภทสำหรับผู้ใช้ในเซสชัน (สอดคล้องกับ ISocialMediaUser และ IUser)
export type SessionUser = {
  id: string;
  name: string;
  email?: string; // อีเมลเป็นตัวเลือกสำหรับ SocialMediaUser
  username: string;
  role: "Reader" | "Writer" | "Admin";
  profile: {
    displayName?: string;
    avatar?: string;
    bio?: string;
    coverImage?: string;
    gender?: "male" | "female" | "other" | "preferNotToSay";
    preferredGenres?: Types.ObjectId[];
  };
  trackingStats: {
    totalLoginDays: number;
    totalNovelsRead: number;
    totalEpisodesRead: number;
    totalCoinSpent: number;
    totalRealMoneySpent: number;
    lastNovelReadId?: Types.ObjectId;
    lastNovelReadAt?: Date;
    joinDate: Date;
  };
  socialStats: {
    followersCount: number;
    followingCount: number;
    novelsCreatedCount: number;
    commentsMadeCount: number;
    ratingsGivenCount: number;
    likesGivenCount: number;
  };
  preferences: {
    language: string;
    theme: "light" | "dark" | "system" | "sepia";
    notifications: {
      email: boolean;
      push: boolean;
      novelUpdates: boolean;
      comments: boolean;
      donations: boolean;
      newFollowers: boolean;
      systemAnnouncements: boolean;
    };
    contentFilters?: {
      showMatureContent: boolean;
      blockedGenres?: Types.ObjectId[];
      blockedTags?: string[];
    };
    privacy: {
      showActivityStatus: boolean;
      profileVisibility: "public" | "followersOnly" | "private";
      readingHistoryVisibility: "public" | "followersOnly" | "private";
    };
  };
  wallet: {
    coinBalance: number;
    lastCoinTransactionAt?: Date;
  };
  gamification: {
    level: number;
    experiencePoints: number;
    achievements: Types.ObjectId[];
    badges: Types.ObjectId[];
    streaks: {
      currentLoginStreak: number;
      longestLoginStreak: number;
      lastLoginDate?: Date;
    };
    dailyCheckIn?: {
      lastCheckInDate?: Date;
      currentStreak: number;
    };
  };
  writerVerification?: {
    status: "none" | "pending" | "verified" | "rejected";
    submittedAt?: Date;
    verifiedAt?: Date;
    rejectedReason?: string;
    documents?: { type: string; url: string; uploadedAt: Date }[];
  };
  donationSettings?: {
    isDonationEnabled: boolean;
    donationApplicationId?: Types.ObjectId;
    customMessage?: string;
  };
  writerApplication?: Types.ObjectId;
  writerStats?: Types.ObjectId;
  isActive: boolean;
  isEmailVerified: boolean;
  isBanned: boolean;
  bannedUntil?: Date;
};

// ประเภทเสริมสำหรับข้อมูล Profile จากแต่ละ Provider
interface GoogleProfile extends Profile {
  picture?: string;
}

interface TwitterProfile extends Profile {
  data?: {
    name?: string;
    username?: string;
    profile_image_url?: string;
  };
  username?: string;
  profile_image_url?: string;
}

interface FacebookProfile extends Profile {
  picture?: {
    data?: {
      url?: string;
    };
  };
}

interface AppleProfile extends Omit<Profile, "name"> {
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

interface LineProfile extends Profile {
  displayName?: string;
  pictureUrl?: string;
}

// ตรวจสอบตัวแปรสภาพแวดล้อมสำหรับ OAuth providers
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
    console.warn(`⚠️ คำเตือน: ตัวแปรสภาพแวดล้อมต่อไปนี้ไม่ได้ถูกกำหนด: ${missingVars.join(", ")}`);
  }
};

// เรียกใช้การตรวจสอบตัวแปรสภาพแวดล้อมเมื่อโหลดโมดูลนี้
validateEnv();

// กำหนดการตั้งค่า NextAuth
export const authOptions: NextAuthOptions = {
  providers: [
    // ผู้ให้บริการ Credentials
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        // แก้ไขตรงนี้: เปลี่ยนเป็น identifier เพื่อให้สอดคล้องกับ UI และ AuthContext
        identifier: { label: "อีเมลหรือชื่อผู้ใช้", type: "text" },
        password: { label: "รหัสผ่าน", type: "password" },
      },
      async authorize(credentials) {
        try {
          // แก้ไขการบันทึกเพื่อให้สอดคล้องกับความเปลี่ยนแปลง
          console.log(`⏳ เริ่มการตรวจสอบข้อมูลรับรองสำหรับ identifier=${credentials?.identifier}`);
          
          if (!credentials?.identifier || !credentials?.password) {
            console.error('❌ ขาดข้อมูลสำคัญ: identifier หรือ password ไม่มีค่า');
            throw new Error("กรุณาระบุอีเมล/ชื่อผู้ใช้ และรหัสผ่าน");
          }

          // แก้ไขการส่งข้อมูลไปยัง API route เพื่อให้สอดคล้องกับพารามิเตอร์ที่ API คาดหวัง
          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              identifier: credentials.identifier,
              password: credentials.password,
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.user) {
            console.error(`❌ การตรวจสอบข้อมูลรับรองล้มเหลว: ${data.error || "ไม่มีข้อมูลผู้ใช้"}`);
            throw new Error(data.error || "ข้อมูลรับรองไม่ถูกต้อง");
          }

          // ตรวจสอบการยืนยันอีเมล
          if (!data.user.isEmailVerified && data.user.email) {
            console.error(`❌ ผู้ใช้ ${data.user.email || data.user.username} ยังไม่ได้ยืนยันอีเมล`);
            throw new Error("ยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมายของคุณ");
          }

          console.log(`✅ การตรวจสอบข้อมูลรับรองสำเร็จสำหรับผู้ใช้ ${data.user.email || data.user.username}`);

          return {
            id: data.user.id,
            name: data.user.profile?.displayName || data.user.username,
            email: data.user.email,
            username: data.user.username,
            role: data.user.role,
            profile: data.user.profile,
            trackingStats: data.user.trackingStats,
            socialStats: data.user.socialStats,
            preferences: data.user.preferences,
            wallet: data.user.wallet,
            gamification: data.user.gamification,
            writerVerification: data.user.writerVerification,
            donationSettings: data.user.donationSettings,
            writerApplication: data.user.writerApplication,
            writerStats: data.user.writerStats,
            isActive: data.user.isActive,
            isEmailVerified: data.user.isEmailVerified,
            isBanned: data.user.isBanned,
            bannedUntil: data.user.bannedUntil,
          } as NextAuthUser;
        } catch (error: any) {
          console.error(`❌ ข้อผิดพลาดในการ authorize ผ่าน CredentialsProvider: ${error.message}`);
          throw new Error(error.message || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์");
        }
      },
    }),

    // ผู้ให้บริการ Google OAuth
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

    // ผู้ให้บริการ Twitter OAuth
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
      version: "2.0",
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "users.read tweet.read offline.access",
        },
      },
    }),

    // ผู้ให้บริการ Facebook OAuth
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "public_profile,email",
        },
      },
    }),

    // ผู้ให้บริการ Apple OAuth
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: process.env.APPLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "name email",
          response_mode: "form_post",
        },
      },
    }),

    // ผู้ให้บริการ Line OAuth
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID as string,
      clientSecret: process.env.LINE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "profile openid email",
        },
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 วัน
  },

  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user && account) {
        console.log(`⏳ เริ่ม JWT callback สำหรับ provider=${account.provider}, user=${user.email || user.username}`);
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.username = user.username;
        token.role = user.role;
        token.profile = user.profile;
        token.trackingStats = user.trackingStats;
        token.socialStats = user.socialStats;
        token.preferences = user.preferences;
        token.wallet = user.wallet;
        token.gamification = user.gamification;
        token.writerVerification = user.writerVerification;
        token.donationSettings = user.donationSettings;
        token.writerApplication = user.writerApplication;
        token.writerStats = user.writerStats;
        token.isActive = user.isActive;
        token.isEmailVerified = user.isEmailVerified;
        token.isBanned = user.isBanned;
        token.bannedUntil = user.bannedUntil;

        if (account.provider !== "credentials") {
          try {
            let displayName = "";
            let username = "";
            let avatar = "";
            let email = profile?.email || undefined;

            switch (account.provider) {
              case "google":
                const googleProfile = profile as GoogleProfile;
                displayName = googleProfile?.name || "";
                username = googleProfile?.email?.split("@")[0] || displayName.replace(/\s+/g, "").toLowerCase();
                avatar = googleProfile?.picture || "";
                email = googleProfile?.email || undefined;
                break;

              case "twitter":
                const twitterProfile = profile as TwitterProfile;
                displayName = twitterProfile?.data?.name || twitterProfile?.name || "";
                username = twitterProfile?.data?.username || twitterProfile?.username || displayName.replace(/\s+/g, "").toLowerCase();
                avatar = twitterProfile?.data?.profile_image_url || twitterProfile?.profile_image_url || "";
                email = twitterProfile?.email || undefined;
                break;

              case "facebook":
                const facebookProfile = profile as FacebookProfile;
                displayName = facebookProfile?.name || "";
                username = facebookProfile?.email?.split("@")[0] || displayName.replace(/\s+/g, "").toLowerCase();
                avatar = facebookProfile?.picture?.data?.url || "";
                email = facebookProfile?.email || undefined;
                break;

              case "apple":
                const appleProfile = profile as AppleProfile;
                displayName =
                  appleProfile?.name?.firstName
                    ? `${appleProfile.name.firstName} ${appleProfile.name.lastName || ""}`.trim()
                    : "";
                username = appleProfile?.email?.split("@")[0] || displayName.replace(/\s+/g, "").toLowerCase();
                avatar = "";
                email = appleProfile?.email || undefined;
                break;

              case "line":
                const lineProfile = profile as LineProfile;
                displayName = lineProfile?.displayName || "";
                username = lineProfile?.email?.split("@")[0] || displayName.replace(/\s+/g, "").toLowerCase();
                avatar = lineProfile?.pictureUrl || "";
                email = lineProfile?.email || undefined;
                break;
            }

            if (!email && account.provider !== "twitter") {
              console.error(`❌ ไม่มีอีเมลจาก ${account.provider} provider สำหรับผู้ใช้ ${displayName}`);
              throw new Error(`ไม่ได้รับอีเมลจาก ${account.provider}`);
            }

            if (account.provider === "twitter" && !email && !username) {
              console.error(`❌ ไม่มีทั้งอีเมลและชื่อผู้ใช้จาก Twitter provider สำหรับผู้ใช้ ${displayName}`);
              throw new Error("ไม่ได้รับข้อมูลที่เพียงพอจาก Twitter");
            }

            console.log(`⏳ ส่งข้อมูลไปยัง /api/auth/social สำหรับ ${account.provider}:`, {
              provider: account.provider,
              providerId: account.providerAccountId,
              email: email || null,
              name: displayName,
              username,
              picture: avatar,
            });

            const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/social`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                provider: account.provider,
                providerId: account.providerAccountId,
                email: email || null,
                name: displayName,
                username,
                picture: avatar,
              }),
            });

            const data = await response.json();

            if (!response.ok || !data.user) {
              console.error(`❌ ข้อผิดพลาดในการบันทึก/ดึงข้อมูลผู้ใช้ ${account.provider}:`, data.error);
              throw new Error(data.error || `ไม่สามารถประมวลผลผู้ใช้ ${account.provider}`);
            }

            console.log(`✅ รับข้อมูลจาก /api/auth/social สำหรับ ${account.provider}:`, data.user);

            token.id = data.user.id;
            token.name = data.user.profile?.displayName || data.user.username;
            token.email = data.user.email;
            token.username = data.user.username;
            token.role = data.user.role;
            token.profile = data.user.profile;
            token.trackingStats = data.user.trackingStats;
            token.socialStats = data.user.socialStats;
            token.preferences = data.user.preferences;
            token.wallet = data.user.wallet;
            token.gamification = data.user.gamification;
            token.writerVerification = data.user.writerVerification;
            token.donationSettings = data.user.donationSettings;
            token.writerApplication = data.user.writerApplication;
            token.writerStats = data.user.writerStats;
            token.isActive = data.user.isActive;
            token.isEmailVerified = data.user.isEmailVerified;
            token.isBanned = data.user.bannedUntil ? new Date(data.user.bannedUntil) > new Date() : false;
            token.bannedUntil = data.user.bannedUntil;
          } catch (error: any) {
            console.error(`❌ ข้อผิดพลาดใน JWT callback ขณะประมวลผล ${account.provider}: ${error.message}`);
            throw error;
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        console.log(`⏳ สร้างเซสชันสำหรับผู้ใช้ ${token.email || token.username}`);
        session.user = {
          id: token.id as string,
          name: token.name || token.profile?.displayName || token.username || "",
          email: token.email,
          username: token.username as string,
          role: token.role as "Reader" | "Writer" | "Admin",
          profile: {
            displayName: token.profile?.displayName,
            avatar: token.profile?.avatar || "",
            bio: token.profile?.bio || "",
            coverImage: token.profile?.coverImage || "",
            gender: token.profile?.gender,
            preferredGenres: token.profile?.preferredGenres,
          },
          trackingStats: token.trackingStats as SessionUser["trackingStats"],
          socialStats: token.socialStats as SessionUser["socialStats"],
          preferences: token.preferences as SessionUser["preferences"],
          wallet: token.wallet as SessionUser["wallet"],
          gamification: token.gamification as SessionUser["gamification"],
          writerVerification: token.writerVerification as SessionUser["writerVerification"],
          donationSettings: token.donationSettings as SessionUser["donationSettings"],
          writerApplication: token.writerApplication as Types.ObjectId | undefined,
          writerStats: token.writerStats as Types.ObjectId | undefined,
          isActive: token.isActive as boolean,
          isEmailVerified: token.isEmailVerified as boolean,
          isBanned: token.isBanned as boolean,
          bannedUntil: token.bannedUntil as Date | undefined,
        };
        console.log(`✅ เซสชันสร้างสำเร็จสำหรับผู้ใช้ ${session.user.email || session.user.username}`);
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

// ขยายประเภทของ NextAuth เพื่อรองรับฟิลด์ที่กำหนดเอง
declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email?: string; // อีเมลเป็นตัวเลือกสำหรับ SocialMediaUser
    username: string;
    role: "Reader" | "Writer" | "Admin";
    profile: {
      displayName?: string;
      avatar?: string;
      bio?: string;
      coverImage?: string;
      gender?: "male" | "female" | "other" | "preferNotToSay";
      preferredGenres?: Types.ObjectId[];
    };
    trackingStats: {
      totalLoginDays: number;
      totalNovelsRead: number;
      totalEpisodesRead: number;
      totalCoinSpent: number;
      totalRealMoneySpent: number;
      lastNovelReadId?: Types.ObjectId;
      lastNovelReadAt?: Date;
      joinDate: Date;
    };
    socialStats: {
      followersCount: number;
      followingCount: number;
      novelsCreatedCount: number;
      commentsMadeCount: number;
      ratingsGivenCount: number;
      likesGivenCount: number;
    };
    preferences: {
      language: string;
      theme: "light" | "dark" | "system" | "sepia";
      notifications: {
        email: boolean;
        push: boolean;
        novelUpdates: boolean;
        comments: boolean;
        donations: boolean;
        newFollowers: boolean;
        systemAnnouncements: boolean;
      };
      contentFilters?: {
        showMatureContent: boolean;
        blockedGenres?: Types.ObjectId[];
        blockedTags?: string[];
      };
      privacy: {
        showActivityStatus: boolean;
        profileVisibility: "public" | "followersOnly" | "private";
        readingHistoryVisibility: "public" | "followersOnly" | "private";
      };
    };
    wallet: {
      coinBalance: number;
      lastCoinTransactionAt?: Date;
    };
    gamification: {
      level: number;
      experiencePoints: number;
      achievements: Types.ObjectId[];
      badges: Types.ObjectId[];
      streaks: {
        currentLoginStreak: number;
        longestLoginStreak: number;
        lastLoginDate?: Date;
      };
      dailyCheckIn?: {
        lastCheckInDate?: Date;
        currentStreak: number;
      };
    };
    writerVerification?: {
      status: "none" | "pending" | "verified" | "rejected";
      submittedAt?: Date;
      verifiedAt?: Date;
      rejectedReason?: string;
      documents?: { type: string; url: string; uploadedAt: Date }[];
    };
    donationSettings?: {
      isDonationEnabled: boolean;
      donationApplicationId?: Types.ObjectId;
      customMessage?: string;
    };
    writerApplication?: Types.ObjectId;
    writerStats?: Types.ObjectId;
    isActive: boolean;
    isEmailVerified: boolean;
    isBanned: boolean;
    bannedUntil?: Date;
  }

  interface Session {
    user: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    name?: string;
    email?: string; // อีเมลเป็นตัวเลือกสำหรับ SocialMediaUser
    username?: string;
    role?: "Reader" | "Writer" | "Admin";
    profile?: {
      displayName?: string;
      avatar?: string;
      bio?: string;
      coverImage?: string;
      gender?: "male" | "female" | "other" | "preferNotToSay";
      preferredGenres?: Types.ObjectId[];
    };
    trackingStats?: {
      totalLoginDays: number;
      totalNovelsRead: number;
      totalEpisodesRead: number;
      totalCoinSpent: number;
      totalRealMoneySpent: number;
      lastNovelReadId?: Types.ObjectId;
      lastNovelReadAt?: Date;
      joinDate: Date;
    };
    socialStats?: {
      followersCount: number;
      followingCount: number;
      novelsCreatedCount: number;
      commentsMadeCount: number;
      ratingsGivenCount: number;
      likesGivenCount: number;
    };
    preferences?: {
      language: string;
      theme: "light" | "dark" | "system" | "sepia";
      notifications: {
        email: boolean;
        push: boolean;
        novelUpdates: boolean;
        comments: boolean;
        donations: boolean;
        newFollowers: boolean;
        systemAnnouncements: boolean;
      };
      contentFilters?: {
        showMatureContent: boolean;
        blockedGenres?: Types.ObjectId[];
        blockedTags?: string[];
      };
      privacy: {
        showActivityStatus: boolean;
        profileVisibility: "public" | "followersOnly" | "private";
        readingHistoryVisibility: "public" | "followersOnly" | "private";
      };
    };
    wallet?: {
      coinBalance: number;
      lastCoinTransactionAt?: Date;
    };
    gamification?: {
      level: number;
      experiencePoints: number;
      achievements: Types.ObjectId[];
      badges: Types.ObjectId[];
      streaks: {
        currentLoginStreak: number;
        longestLoginStreak: number;
        lastLoginDate?: Date;
      };
      dailyCheckIn?: {
        lastCheckInDate?: Date;
        currentStreak: number;
      };
    };
    writerVerification?: {
      status: "none" | "pending" | "verified" | "rejected";
      submittedAt?: Date;
      verifiedAt?: Date;
      rejectedReason?: string;
      documents?: { type: string; url: string; uploadedAt: Date }[];
    };
    donationSettings?: {
      isDonationEnabled: boolean;
      donationApplicationId?: Types.ObjectId;
      customMessage?: string;
    };
    writerApplication?: Types.ObjectId;
    writerStats?: Types.ObjectId;
    isActive?: boolean;
    isEmailVerified?: boolean;
    isBanned?: boolean;
    bannedUntil?: Date;
  }
}