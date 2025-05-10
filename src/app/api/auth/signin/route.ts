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
  trackingStats: {
    totalLoginDays: number;
    totalNovelsRead: number;
    totalEpisodesRead: number;
    totalCoinSpent: number;
    totalRealMoneySpent: number;
    lastNovelReadId?: string;
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
    experience: number;
    achievements?: string[];
    badges?: string[];
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
  donationSettings?: {
    isDonationEnabled: boolean;
    donationApplicationId?: string;
    customMessage?: string;
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
      trackingStats: {
        totalLoginDays: user.trackingStats.totalLoginDays,
        totalNovelsRead: user.trackingStats.totalNovelsRead,
        totalEpisodesRead: user.trackingStats.totalEpisodesRead,
        totalCoinSpent: user.trackingStats.totalCoinSpent,
        totalRealMoneySpent: user.trackingStats.totalRealMoneySpent,
        lastNovelReadId: user.trackingStats.lastNovelReadId?.toString(),
        lastNovelReadAt: user.trackingStats.lastNovelReadAt,
        joinDate: user.trackingStats.joinDate,
      },
      socialStats: {
        followersCount: user.socialStats.followersCount,
        followingCount: user.socialStats.followingCount,
        novelsCreatedCount: user.socialStats.novelsCreatedCount,
        commentsMadeCount: user.socialStats.commentsMadeCount,
        ratingsGivenCount: user.socialStats.ratingsGivenCount,
        likesGivenCount: user.socialStats.likesGivenCount,
      },
      preferences: {
        language: user.preferences.language,
        theme: user.preferences.theme,
        notifications: {
          email: user.preferences.notifications.email,
          push: user.preferences.notifications.push,
          novelUpdates: user.preferences.notifications.novelUpdates,
          comments: user.preferences.notifications.comments,
          donations: user.preferences.notifications.donations,
          newFollowers: user.preferences.notifications.newFollowers,
          systemAnnouncements: user.preferences.notifications.systemAnnouncements,
        },
        privacy: {
          showActivityStatus: user.preferences.privacy.showActivityStatus,
          profileVisibility: user.preferences.privacy.profileVisibility,
          readingHistoryVisibility: user.preferences.privacy.readingHistoryVisibility,
        },
      },
      wallet: {
        coinBalance: user.wallet.coinBalance,
        lastCoinTransactionAt: user.wallet.lastCoinTransactionAt,
      },
      gamification: {
        level: user.gamification.level,
        experience: user.gamification.experience,
        achievements: user.gamification.achievements?.map((id) => id.toString()) ?? [],
        badges: user.gamification.badges?.map((id) => id.toString()) ?? [],
        streaks: {
          currentLoginStreak: user.gamification.streaks.currentLoginStreak,
          longestLoginStreak: user.gamification.streaks.longestLoginStreak,
          lastLoginDate: user.gamification.streaks.lastLoginDate,
        },
      },
      writerVerification: user.writerVerification,
      donationSettings: user.donationSettings
        ? {
            isDonationEnabled: user.donationSettings.isDonationEnabled,
            donationApplicationId: user.donationSettings.donationApplicationId?.toString(),
            customMessage: user.donationSettings.customMessage,
          }
        : undefined,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
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