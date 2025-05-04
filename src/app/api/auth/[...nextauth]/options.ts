// src/app/auth/[...nextauth]/options.ts
// นำเข้าโมดูลที่จำเป็นสำหรับ NextAuth และการจัดการฐานข้อมูล
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import FacebookProvider from "next-auth/providers/facebook";
import AppleProvider from "next-auth/providers/apple";
import LineProvider from "next-auth/providers/line";
import mongoose from "mongoose";
import { compare } from "bcryptjs";
import dbConnect from "@/backend/lib/mongodb";

// นำเข้าโมเดลทั้งหมด
import UserModelFactory, { IUser } from "@/backend/models/User";
import GoogleUserModelFactory, { IGoogleUser } from "@/backend/models/GoogleUser";
import TwitterUserModelFactory, { ITwitterUser } from "@/backend/models/TwitterUser";
import FacebookUserModelFactory, { IFacebookUser } from "@/backend/models/FacebookUser";
import AppleUserModelFactory, { IAppleUser } from "@/backend/models/AppleUser";
import LineUserModelFactory, { ILineUser } from "@/backend/models/LineUser";

// กำหนดประเภทสำหรับผู้ใช้ในเซสชัน
export type SessionUser = {
    id: string;
    email: string;
    username: string;
    role: "Reader" | "Writer" | "Admin";
    profile: {
      avatar?: string;
      bio?: string;
      displayName?: string;
    };
    avatar?: { url: string }; // เพิ่มเพื่อรองรับโครงสร้าง avatar จาก UserAvatar
  };
  

// ฟังก์ชันตรวจสอบว่าเป็นอีเมลแอดมินหรือไม่
const isAdminEmail = (email: string): boolean => {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  return adminEmails.includes(email);
};

// แมปผู้ให้บริการกับโมเดลที่เกี่ยวข้อง
const providerModelMap: Record<string, { factory: () => any; name: string }> = {
  credentials: { factory: UserModelFactory, name: "User" },
  google: { factory: GoogleUserModelFactory, name: "GoogleUser" },
  twitter: { factory: TwitterUserModelFactory, name: "TwitterUser" },
  facebook: { factory: FacebookUserModelFactory, name: "FacebookUser" },
  apple: { factory: AppleUserModelFactory, name: "AppleUser" },
  line: { factory: LineUserModelFactory, name: "LineUser" },
};

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
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar.key]) {
      throw new Error(`❌ ${envVar.key} ไม่ได้ถูกกำหนดใน .env สำหรับ ${envVar.provider}`);
    }
  }

  // ตรวจสอบว่า GOOGLE_CLIENT_ID ลงท้ายด้วย .apps.googleusercontent.com
  if (!process.env.GOOGLE_CLIENT_ID?.endsWith(".apps.googleusercontent.com")) {
    throw new Error(`❌ GOOGLE_CLIENT_ID ไม่ถูกต้อง: ต้องลงท้ายด้วย .apps.googleusercontent.com`);
  }
};
{/** 
// เรียกใช้การตรวจสอบตัวแปรสภาพแวดล้อมเมื่อเริ่มต้น
try {
  validateEnv();
  console.log("✅ ตัวแปรสภาพแวดล้อมสำหรับ OAuth ถูกต้อง");
} catch (error) {
  console.error("❌ ข้อผิดพลาดในการตรวจสอบตัวแปรสภาพแวดล้อม:", error);
  throw error;
}
*/}
// กำหนดการตั้งค่า NextAuth
export const authOptions: NextAuthOptions = {
  providers: [
    // ผู้ให้บริการ Credentials สำหรับการลงชื่อเข้าใช้ด้วยอีเมล/ชื่อผู้ใช้และรหัสผ่าน
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email && !credentials?.username) {
            throw new Error("กรุณาระบุอีเมลหรือชื่อผู้ใช้");
          }

          if (!credentials?.password) {
            throw new Error("กรุณาระบุรหัสผ่าน");
          }

          await dbConnect();

          // โหลดโมเดล User สำหรับ credentials
          const UserModel = providerModelMap.credentials.factory();

          // ค้นหาผู้ใช้ด้วยอีเมลหรือชื่อผู้ใช้
          const user = await UserModel.findOne({
            $or: [{ email: credentials.email || "" }, { username: credentials.username || "" }],
          });

          if (!user || !user.password) {
            throw new Error("ข้อมูลรับรองไม่ถูกต้อง");
          }

          const isPasswordValid = await compare(credentials.password, user.password);
          if (!isPasswordValid) {
            throw new Error("ข้อมูลรับรองไม่ถูกต้อง");
          }

          if (!user.isEmailVerified) {
            throw new Error("กรุณายืนยันอีเมลก่อนลงชื่อเข้าใช้");
          }

          const role = isAdminEmail(user.email) ? "Admin" : user.role;

          // อัปเดตเวลาเข้าระบบล่าสุด
          user.lastLogin = new Date();
          await user.save();

          return {
            id: user._id.toString(),
            email: user.email,
            username: user.username,
            role,
            profile: user.profile || {},
          };
        } catch (error) {
          console.error("❌ ข้อผิดพลาดในการตรวจสอบข้อมูลรับรอง:", error);
          throw error;
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
          scope: "openid email profile",
        },
      },
      httpOptions: {
        timeout: 10000,
      },
    }),

    // ผู้ให้บริการ Twitter OAuth
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
      version: "2.0",
      allowDangerousEmailAccountLinking: true,
    }),

    // ผู้ให้บริการ Facebook OAuth
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),

    // ผู้ให้บริการ Apple OAuth
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: process.env.APPLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),

    // ผู้ให้บริการ Line OAuth
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID as string,
      clientSecret: process.env.LINE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 วัน
  },

  callbacks: {
    // จัดการเซสชันของผู้ใช้
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.username = token.username as string;
        session.user.role = token.role as "Reader" | "Writer" | "Admin";
        session.user.profile = token.profile as {
          avatar?: string;
          bio?: string;
          displayName?: string;
        };
      }
      return session;
    },

    // จัดการ JWT token
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.username = user.username;
        token.role = user.role;
        token.profile = user.profile;
      }

      if (account && account.provider && token.email) {
        try {
          console.log(`📝 กำลังประมวลผลผู้ใช้ ${account.provider} ด้วยอีเมล: ${token.email}`);
          await dbConnect();

          // เลือกโมเดลตามผู้ให้บริการ
          const providerInfo = providerModelMap[account.provider];
          if (!providerInfo) {
            throw new Error(`❌ ไม่พบโมเดลสำหรับผู้ให้บริการ ${account.provider}`);
          }

          const UserModel = providerInfo.factory();

          // ค้นหาผู้ใช้ที่มีอยู่
          const existingUser = await UserModel.findOne({
            email: token.email,
            ...(account.provider !== "credentials" ? { providerId: account.providerAccountId } : {}),
          });

          if (existingUser) {
            token.username = existingUser.username;
            token.role = isAdminEmail(existingUser.email) ? "Admin" : existingUser.role;
            token.profile = existingUser.profile;

            existingUser.lastLogin = new Date();
            await existingUser.save();
          } else {
            // สร้างผู้ใช้ใหม่
            const username = `user_${Math.random().toString(36).substring(2, 10)}`;

            const newUserData = {
              email: token.email,
              username,
              role: isAdminEmail(token.email as string) ? "Admin" : "Reader",
              profile: {
                displayName: token.name || undefined,
                avatar: token.picture || undefined,
              },
              providerId: account.providerAccountId,
              lastLogin: new Date(),
            };

            // เพิ่ม provider และ isEmailVerified สำหรับโมเดล User
            if (account.provider === "credentials") {
              (newUserData as any).provider = "credentials";
              (newUserData as any).isEmailVerified = false;
            } else {
              // OAuth users ถือว่ายืนยันอีเมลแล้ว
              (newUserData as any).providerId = account.providerAccountId;
            }

            const newUser = new UserModel(newUserData);
            await newUser.save();

            token.username = username;
            token.role = isAdminEmail(token.email as string) ? "Admin" : "Reader";
            token.profile = {
              displayName: token.name ?? undefined,
              avatar: token.picture ?? undefined,
            };
          }
        } catch (error) {
          console.error(`❌ ข้อผิดพลาดใน JWT callback สำหรับ ${account.provider}:`, error);
          throw new Error(`ไม่สามารถประมวลผลข้อมูลผู้ใช้สำหรับ ${account.provider}`);
        }
      }

      return token;
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
    username: string;
    role: "Reader" | "Writer" | "Admin";
    profile: {
      avatar?: string;
      bio?: string;
      displayName?: string;
    };
  }

  interface Session {
    user: SessionUser & {
      email: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username: string;
    role: "Reader" | "Writer" | "Admin";
    profile: {
      avatar?: string;
      bio?: string;
      displayName?: string;
    };
  }
}