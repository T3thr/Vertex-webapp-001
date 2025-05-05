// src/app/api/auth/[...nextauth]/options.ts

// นำเข้าโมดูลที่จำเป็นสำหรับ NextAuth และการจัดการฐานข้อมูล
import { NextAuthOptions, Profile, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import FacebookProvider from "next-auth/providers/facebook";
import AppleProvider from "next-auth/providers/apple";
import LineProvider from "next-auth/providers/line";
import { JWT } from "next-auth/jwt";

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
};

// ตรวจสอบตัวแปรสภาพแวดล้อมสำหรับ OAuth providers
// หมายเหตุ: การตรวจสอบนี้จะทำงานในสภาพแวดล้อมเซิร์ฟเวอร์เมื่อ NextAuth เริ่มต้น
// เราจะเพิ่มการตรวจสอบพื้นฐาน แต่การตรวจสอบที่เข้มงวดควรทำเมื่อเริ่มต้นเซิร์ฟเวอร์
const validateEnv = () => {
  const requiredEnvVars = [
     { key: "GOOGLE_CLIENT_ID", provider: "Google" }, // ยกเลิกการคอมเมนต์หากใช้ Google
     { key: "GOOGLE_CLIENT_SECRET", provider: "Google" },
     { key: "TWITTER_CLIENT_ID", provider: "Twitter" }, // ยกเลิกการคอมเมนต์หากใช้ Twitter
     { key: "TWITTER_CLIENT_SECRET", provider: "Twitter" },
    // { key: "FACEBOOK_CLIENT_ID", provider: "Facebook" }, // ยกเลิกการคอมเมนต์หากใช้ Facebook
    // { key: "FACEBOOK_CLIENT_SECRET", provider: "Facebook" },
    // { key: "APPLE_CLIENT_ID", provider: "Apple" }, // ยกเลิกการคอมเมนต์หากใช้ Apple
    // { key: "APPLE_CLIENT_SECRET", provider: "Apple" },
    // { key: "LINE_CLIENT_ID", provider: "Line" }, // ยกเลิกการคอมเมนต์หากใช้ Line
    // { key: "LINE_CLIENT_SECRET", provider: "Line" },
    { key: "NEXTAUTH_SECRET", provider: "NextAuth" },
    { key: "NEXTAUTH_URL", provider: "NextAuth" },
    { key: "MONGODB_URI", provider: "Database" },
  ];

  let missingVars = [];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar.key]) {
      missingVars.push(envVar.key);
    }
  }

  if (missingVars.length > 0) {
    console.warn(`⚠️ คำเตือน: ตัวแปรสภาพแวดล้อมต่อไปนี้ไม่ได้ถูกกำหนด: ${missingVars.join(", ")}`);
    // ใน production ควร throw error:
    // throw new Error(`❌ ตัวแปรสภาพแวดล้อมที่จำเป็นไม่ได้ถูกกำหนด: ${missingVars.join(", ")}`);
  }

  // ตัวอย่างการตรวจสอบเพิ่มเติม (ยกเลิกการคอมเมนต์หากใช้ Google)
  // if (process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com")) {
  //   console.warn(`⚠️ GOOGLE_CLIENT_ID อาจไม่ถูกต้อง: ควรลงท้ายด้วย .apps.googleusercontent.com`);
  // }
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
        // เราจะจัดการ input fields ในหน้า sign-in ของเราเอง
        // แต่เรายังคงต้องกำหนด credentials ที่นี่เพื่อให้ NextAuth รู้จัก
        email: { label: "อีเมล", type: "email" },
        username: { label: "ชื่อผู้ใช้", type: "text" }, // เพิ่ม username
        password: { label: "รหัสผ่าน", type: "password" },
      },
      async authorize(credentials) {
        // การตรวจสอบ credentials จะทำใน API route ของเรา (/api/auth/signin)
        // ที่นี่เราเพียงแค่เรียก API route นั้น
        try {
          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/signin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials?.email,
              username: credentials?.username,
              password: credentials?.password,
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.user) {
            // ส่งข้อผิดพลาดกลับไปให้ NextAuth
            throw new Error(data.error || "ข้อมูลรับรองไม่ถูกต้อง");
          }

          // ส่งคืนข้อมูลผู้ใช้ที่ได้รับจาก API route
          // ตรวจสอบให้แน่ใจว่าโครงสร้างข้อมูลตรงกับที่ NextAuth คาดหวัง
          // และตรงกับประเภท User ที่เรากำหนดไว้
          return {
            id: data.user.id,
            email: data.user.email,
            username: data.user.username,
            role: data.user.role,
            profile: data.user.profile,
          } as NextAuthUser; // ใช้ as NextAuthUser เพื่อให้ TypeScript รู้จักประเภท

        } catch (error: any) {
          console.error("❌ ข้อผิดพลาดในการ authorize ผ่าน CredentialsProvider:", error.message);
          // ส่งคืน null หรือ throw error เพื่อบ่งชี้ว่าการ authorize ล้มเหลว
          // การ throw error จะแสดงข้อความในหน้า sign-in
          throw new Error(error.message || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์");
        }
      },
    }),

    // ผู้ให้บริการ Google OAuth (ยกเลิกการคอมเมนต์และตั้งค่า .env หากต้องการใช้)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true, // อนุญาตการเชื่อมโยงบัญชีที่มีอีเมลเดียวกัน (ต้องจัดการอย่างระมัดระวัง)
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile", // ขอบเขตมาตรฐาน
        },
      },
    }),

    // ผู้ให้บริการ Twitter OAuth (ยกเลิกการคอมเมนต์และตั้งค่า .env หากต้องการใช้)
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
      version: "2.0", // ใช้ Twitter API v2
      allowDangerousEmailAccountLinking: true,
    }),

    // ผู้ให้บริการ Facebook OAuth (ยกเลิกการคอมเมนต์และตั้งค่า .env หากต้องการใช้)
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),

    // ผู้ให้บริการ Apple OAuth (ยกเลิกการคอมเมนต์และตั้งค่า .env หากต้องการใช้)
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: process.env.APPLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),

    // ผู้ให้บริการ Line OAuth (ยกเลิกการคอมเมนต์และตั้งค่า .env หากต้องการใช้)
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID as string,
      clientSecret: process.env.LINE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  session: {
    strategy: "jwt", // ใช้ JSON Web Tokens สำหรับเซสชัน
    maxAge: 30 * 24 * 60 * 60, // กำหนดอายุเซสชัน (30 วัน)
  },

  callbacks: {
    // Callback นี้จะถูกเรียกเมื่อ JWT ถูกสร้างขึ้น (หลังจากการ sign in) หรืออัปเดต
    async jwt({ token, user, account, profile }: { token: JWT; user?: NextAuthUser | any; account?: any; profile?: Profile | any }) {
      // console.log("JWT Callback - Input:", { token, user, account, profile });

      // กรณี Sign in ครั้งแรก (ทั้ง credentials และ social)
      if (user && account) { // ตรวจสอบ user และ account เพื่อให้แน่ใจว่าเป็นการ sign in
        // เพิ่มข้อมูลผู้ใช้จาก `user` object (ที่ได้จาก authorize หรือ social provider) เข้าไปใน token
        token.id = user.id;
        token.email = user.email;
        token.username = user.username; // ตรวจสอบว่ามี username
        token.role = user.role;
        token.profile = user.profile;

        // กรณี Social Sign in: เรียก API เพื่อสร้าง/อัปเดตผู้ใช้ในฐานข้อมูล
        if (account.provider !== 'credentials') {
          try {
            // จัดการข้อมูลโปรไฟล์ที่แตกต่างกันตามผู้ให้บริการ
            let name = token.name; // จาก token เริ่มต้น
            let picture = token.picture; // จาก token เริ่มต้น
            let email = token.email; // จาก token เริ่มต้น

            // พยายามดึงข้อมูลจาก profile object ที่ provider ส่งมา
            if (profile) {
              if (account.provider === "google") {
                name = profile.name || name;
                picture = profile.picture || picture;
                email = profile.email || email;
              } else if (account.provider === "twitter") {
                // Twitter v2 อาจส่งข้อมูลในรูปแบบที่ต่างออกไป, ต้องตรวจสอบ API response
                name = profile.data?.name || profile.name || name;
                picture = profile.data?.profile_image_url || profile.profile_image_url || picture;
                // Twitter อาจไม่ส่ง email มา ต้องขอ permission เพิ่ม
                email = profile.email || email;
              } else if (account.provider === "facebook") {
                name = profile.name || name;
                picture = profile.picture?.data?.url || picture;
                email = profile.email || email;
              } else if (account.provider === "apple") {
                // Apple อาจส่งข้อมูล name แค่ครั้งแรก
                name = profile.name?.firstName ? `${profile.name.firstName} ${profile.name.lastName}` : name;
                email = profile.email || email;
                // Apple ไม่ส่ง picture URL มาตรฐาน
              } else if (account.provider === "line") {
                name = profile.displayName || name;
                picture = profile.pictureUrl || picture;
                email = profile.email || email; // Line อาจไม่ส่ง email มา ต้องขอ permission เพิ่ม
              }
            }

            // ตรวจสอบว่ามี email หรือไม่ ก่อนเรียก API
            if (!email) {
              console.error(`❌ ไม่มีอีเมลจาก ${account.provider} provider สำหรับผู้ใช้ ${name}`);
              // อาจต้องแจ้งผู้ใช้หรือจัดการกรณีนี้เป็นพิเศษ
              // ในตัวอย่างนี้ เราจะยังคงดำเนินการต่อ แต่ควรมีการจัดการที่ดีกว่านี้
              // throw new Error(`ไม่ได้รับอีเมลจาก ${account.provider}`);
            }

            const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/social`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                provider: account.provider,
                providerId: account.providerAccountId,
                email: email, // ใช้ email ที่ได้มา
                name: name, // ใช้ name ที่ได้มา
                picture: picture, // ใช้ picture ที่ได้มา
              }),
            });

            const responseText = await response.text();
            let data;
            try {
              data = JSON.parse(responseText);
            } catch (jsonError) {
              console.error(`❌ ข้อผิดพลาดในการแยก JSON จาก /api/auth/social (${account.provider}):`, jsonError);
              console.error(`Response Text:`, responseText);
              throw new Error(`Invalid JSON response from /api/auth/social: ${responseText}`);
            }

            if (!response.ok || !data.user) {
              console.error(`❌ ข้อผิดพลาดในการบันทึก/ดึงข้อมูลผู้ใช้ ${account.provider}:`, data.error || 'Unknown error');
              throw new Error(data.error || `Failed to process ${account.provider} user`);
            }

            // อัปเดต token ด้วยข้อมูลล่าสุดจากฐานข้อมูล (สำคัญมาก)
            token.id = data.user.id;
            token.email = data.user.email;
            token.username = data.user.username;
            token.role = data.user.role;
            token.profile = data.user.profile;

          } catch (error: any) {
            console.error(`❌ ข้อผิดพลาดใน JWT callback ขณะประมวลผล ${account.provider}:`, error.message);
            // ไม่ควร throw error ที่นี่ เพราะอาจทำให้การ sign in ล้มเหลวทั้งหมด
            // แต่ควร log ข้อผิดพลาดไว้
            // อาจจะคืนค่า token เดิมไปก่อน หรือคืนค่า token ที่มีข้อมูลบางส่วน
            // return token; // คืน token เดิม (อาจมีข้อมูลไม่ครบถ้วน)
            // หรือจะคืนค่า null เพื่อบังคับ sign out?
            // return null;
          }
        }
      }
      // console.log("JWT Callback - Output:", token);
      // คืนค่า token ที่ (อาจจะ) อัปเดตแล้ว
      return token;
    },

    // Callback นี้จะถูกเรียกเมื่อมีการเข้าถึง session (เช่น ผ่าน useSession, getSession)
    async session({ session, token }: { session: any; token: JWT }) {
      // console.log("Session Callback - Input:", { session, token });
      // ส่งข้อมูลจาก token (ที่ถูกจัดการโดย jwt callback) ไปยัง client-side session
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.username = token.username;
        session.user.role = token.role;
        session.user.profile = token.profile;
        // ลบข้อมูลที่ไม่ต้องการส่งให้ client (ถ้ามี)
        // delete session.user.someSensitiveData;
      }
      // console.log("Session Callback - Output:", session);
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin", // หน้าสำหรับ sign in
    signOut: "/auth/signout", // หน้าสำหรับ sign out (อาจเป็นหน้ายืนยัน)
    error: "/auth/error", // หน้าแสดงข้อผิดพลาดในการยืนยันตัวตน (เช่น OAuth error)
    // verifyRequest: '/auth/verify-request', // หน้าสำหรับ Email provider
    // newUser: '/auth/new-user' // หน้าสำหรับผู้ใช้ใหม่ครั้งแรก (ถ้าตั้งค่า)
  },

  secret: process.env.NEXTAUTH_SECRET, // Secret สำหรับการเข้ารหัส JWT
  debug: process.env.NODE_ENV === "development", // เปิด debug mode ใน development
};

// ขยายประเภทของ NextAuth เพื่อรองรับฟิลด์ที่กำหนดเองใน User, Session, JWT
declare module "next-auth" {
  interface User {
    // เพิ่มฟิลด์ที่ตรงกับ Mongoose model และ SessionUser
    id: string;
    email: string;
    username: string;
    role: "Reader" | "Writer" | "Admin";
    profile: {
      avatar?: string;
      bio?: string;
      displayName?: string;
    };
  }

  interface Session {
    user: SessionUser; // ใช้ SessionUser ที่เรากำหนด
  }

  // ขยาย Profile เพื่อรองรับข้อมูลที่อาจได้จาก providers ต่างๆ
  interface Profile {
    email?: string; // เพิ่ม email ใน Profile
    // Google
    given_name?: string;
    family_name?: string;
    // Twitter v2 (อาจอยู่ใน data object)
    data?: {
      name?: string;
      username?: string;
      profile_image_url?: string;
    };
    username?: string;
    profile_image_url?: string;
    // Facebook
    picture?: {
      data?: {
        url?: string;
      };
    };
    // Apple

    // Line
    displayName?: string;
    pictureUrl?: string;
  }
}

declare module "next-auth/jwt" {
  // ขยาย JWT ให้มีฟิลด์ตรงกับที่เราเพิ่มใน jwt callback
  interface JWT {
    id?: string;
    email?: string;
    username?: string;
    role?: "Reader" | "Writer" | "Admin";
    profile?: {
      avatar?: string;
      bio?: string;
      displayName?: string;
    };
    // อาจเพิ่มฟิลด์อื่นๆ ที่จำเป็น เช่น accessToken, refreshToken จาก OAuth
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
  }
}

