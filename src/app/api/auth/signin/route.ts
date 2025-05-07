// src/app/api/auth/signin/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUser } from "@/backend/models/User";
import { Types } from "mongoose";

// ประเภทสำหรับ Request Body
interface SignInRequestBody {
  email?: string;
  username?: string;
  password: string;
}

// ประเภทสำหรับ Response User (สอดคล้องกับ SessionUser ใน options.ts)
interface SignInResponseUser {
  id: string;
  email?: string;
  username: string;
  role: "Reader" | "Writer" | "Admin";
  profile: {
    displayName?: string;
    avatar?: string;
    bio?: string;
    coverImage?: string;
    gender?: "male" | "female" | "other" | "preferNotToSay";
    preferredGenres?: string[];
  };
  stats: {
    followers: number;
    following: number;
    novels: number;
    purchases: number;
    donationsReceived: number;
    donationsMade: number;
    totalEpisodesSold: number;
  };
  preferences: {
    language: string;
    theme: "light" | "dark" | "system";
    notifications: {
      email: boolean;
      push: boolean;
      novelUpdates: boolean;
      comments: boolean;
      donations: boolean;
    };
  };
  wallet: {
    balance: number;
    currency: string;
    lastTransaction?: Date;
  };
  gamification: {
    level: number;
    experience: number;
    streaks: {
      currentLoginStreak: number;
      longestLoginStreak: number;
      lastLoginDate?: Date;
    };
  };
  writerVerification?: {
    status: "none" | "pending" | "verified" | "rejected";
    submittedAt?: Date;
    verifiedAt?: Date;
    rejectedReason?: string;
    documents?: { type: string; url: string; uploadedAt: Date }[];
  };
  isActive: boolean;
  isEmailVerified: boolean;
  isBanned: boolean;
  bannedUntil?: Date;
}

// ฟังก์ชัน Handler สำหรับ HTTP POST request (การลงชื่อเข้าใช้ด้วย Credentials)
export async function POST(request: Request): Promise<NextResponse> {
  await dbConnect();

  try {
    const body = await request.json() as SignInRequestBody;
    const { email, username, password } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if ((!email && !username) || !password) {
      console.error(`❌ ข้อมูลไม่ครบถ้วน: email=${email}, username=${username}, password=${password ? "provided" : "missing"}`);
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลหรือชื่อผู้ใช้ และรหัสผ่าน" },
        { status: 400 }
      );
    }

    // ป้องกันการฉีดโค้ดด้วยการตรวจสอบรูปแบบ
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      console.error(`❌ รูปแบบอีเมลไม่ถูกต้อง: ${email}`);
      return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
    }
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      console.error(`❌ รูปแบบชื่อผู้ใช้ไม่ถูกต้อง: ${username}`);
      return NextResponse.json(
        { error: "ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร, ตัวเลข หรือเครื่องหมาย _ เท่านั้น" },
        { status: 400 }
      );
    }

    // ค้นหาผู้ใช้ด้วย email หรือ username
    const user = await UserModel()
      .findOne({
        $or: [
          email ? { email: email.toLowerCase() } : {},
          username ? { username } : {},
        ].filter((condition) => Object.keys(condition).length > 0),
      })
      .select("+password")
      .lean() as (IUser & { _id: Types.ObjectId }) | null;

    if (!user) {
      console.error(`❌ ไม่พบผู้ใช้: email=${email}, username=${username}`);
      return NextResponse.json(
        { error: "ไม่พบผู้ใช้ที่ตรงกับอีเมลหรือชื่อผู้ใช้นี้" },
        { status: 404 }
      );
    }

    // ตรวจสอบว่าบัญชีใช้ Credentials หรือไม่
    if (!user.password) {
      console.error(`❌ บัญชีไม่มีรหัสผ่าน: ${user.email || user.username}`);
      return NextResponse.json(
        { error: "บัญชีนี้อาจถูกสร้างผ่าน Social Login กรุณาลองเข้าสู่ระบบด้วยวิธีอื่น" },
        { status: 400 }
      );
    }

    // ตรวจสอบสถานะบัญชี
    if (!user.isActive) {
      console.error(`❌ บัญชีถูกระงับ: ${user.email || user.username}`);
      return NextResponse.json(
        { error: "บัญชีนี้ถูกระงับการใช้งาน" },
        { status: 403 }
      );
    }

    // ตรวจสอบการแบน
    if (user.bannedUntil && user.bannedUntil > new Date()) {
      console.error(`❌ บัญชีถูกแบน: ${user.email || user.username}, จนถึง ${user.bannedUntil}`);
      return NextResponse.json(
        { error: `บัญชีนี้ถูกแบนจนถึง ${user.bannedUntil.toLocaleDateString("th-TH")}` },
        { status: 403 }
      );
    }

    // ตรวจสอบการยืนยันอีเมล
    if (!user.isEmailVerified) {
      console.error(`❌ อีเมลยังไม่ยืนยัน: ${user.email || user.username}`);
      return NextResponse.json(
        { error: "ยังไม่ได้ยืนยันอีเมล" },
        { status: 403 }
      );
    }

    // ตรวจสอบรหัสผ่าน
    const isPasswordMatch = await UserModel()
      .findById(user._id)
      .select("+password")
      .then((doc) => doc?.matchPassword(password) ?? false);

    if (!isPasswordMatch) {
      console.error(`❌ รหัสผ่านไม่ถูกต้อง: ${user.email || user.username}`);
      return NextResponse.json(
        { error: "รหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    // อัปเดตวันที่เข้าสู่ระบบ
    await UserModel().updateOne(
      { _id: user._id },
      { lastLoginAt: new Date() }
    );

    console.log(`✅ การลงชื่อเข้าใช้สำเร็จ: ${user.email || user.username}`);

    // สร้าง response user สอดคล้องกับ SessionUser
    const userResponse: SignInResponseUser = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      profile: {
        displayName: user.profile?.displayName,
        avatar: user.profile?.avatar,
        bio: user.profile?.bio,
        coverImage: user.profile?.coverImage,
        gender: user.profile?.gender,
        preferredGenres: user.profile?.preferredGenres?.map((id) => id.toString()) ?? [],
      },
      stats: {
        followers: user.stats?.followersCount ?? 0,
        following: user.stats?.followingCount ?? 0,
        novels: user.stats?.novelsCount ?? 0,
        purchases: user.stats?.purchasesCount ?? 0,
        donationsReceived: user.stats?.donationsReceivedAmount ?? 0,
        donationsMade: user.stats?.donationsMadeAmount ?? 0,
        totalEpisodesSold: user.stats?.totalEpisodesSoldCount ?? 0,
      },
      preferences: user.preferences ?? {
        language: "th",
        theme: "system",
        notifications: {
          email: true,
          push: true,
          novelUpdates: true,
          comments: true,
          donations: true,
        },
      },
      wallet: user.wallet ?? {
        balance: 0,
        currency: "THB",
      },
      gamification: user.gamification ?? {
        level: 1,
        experience: 0,
        streaks: {
          currentLoginStreak: 0,
          longestLoginStreak: 0,
        },
      },
      writerVerification: user.writerVerification,
      isActive: user.isActive ?? true,
      isEmailVerified: user.isEmailVerified ?? false,
      isBanned: user.bannedUntil ? user.bannedUntil > new Date() : false,
      bannedUntil: user.bannedUntil,
    };

    return NextResponse.json({ user: userResponse }, { status: 200 });
  } catch (error: unknown) {
    console.error("❌ ข้อผิดพลาดในการลงชื่อเข้าใช้:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดบางอย่างบนเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}