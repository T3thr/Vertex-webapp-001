// src/app/api/auth/signin/route.ts
// API สำหรับการลงชื่อเข้าใช้ด้วย Credentials
// รองรับการตรวจสอบทั้งอีเมลและชื่อผู้ใช้ผ่าน identifier
// อัปเดต: ปรับให้ทำงานเฉพาะกับ User model โดยไม่มี provider หรือ accounts, ส่งข้อมูลครบถ้วนตาม SessionUser

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUser } from "@/backend/models/User";
import { Types } from "mongoose";

// ประเภทสำหรับ Request Body
interface SignInRequestBody {
  identifier: string; // อีเมลหรือชื่อผู้ใช้
  password: string;
}

// ประเภทสำหรับ Response User (สอดคล้องกับ SessionUser ใน options.ts)
interface SignInResponseUser {
  id: string;
  email?: string;
  username: string;
  name: string;
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

// ฟังก์ชันจัดการ POST request สำหรับการลงชื่อเข้าใช้
export async function POST(request: Request) {
  try {
    // เชื่อมต่อฐานข้อมูล MongoDB
    await dbConnect();
    console.log("🔵 [API:signin] เชื่อมต่อ MongoDB สำเร็จ");

    // อ่าน body ของ request
    const body: SignInRequestBody = await request.json();
    const { identifier, password } = body;

    // ตรวจสอบว่ามีการส่งข้อมูลครบถ้วนและถูกต้อง
    if (!identifier?.trim() || !password?.trim()) {
      console.warn("⚠️ [API:signin] ขาดข้อมูล identifier หรือ password");
      return NextResponse.json(
        { error: "กรุณาระบุอีเมล/ชื่อผู้ใช้ และรหัสผ่าน" },
        { status: 400 }
      );
    }

    // ค้นหาผู้ใช้โดยใช้ identifier (email หรือ username)
    const user: (IUser & { _id: Types.ObjectId }) | null = await UserModel()
      .findOne({
        $or: [
          { email: identifier.trim().toLowerCase() },
          { username: identifier.trim() },
        ],
      })
      .select("+password");

    // ตรวจสอบว่าพบผู้ใช้หรือไม่
    if (!user) {
      console.warn(`⚠️ [API:signin] ไม่พบผู้ใช้ด้วย identifier: ${identifier}`);
      return NextResponse.json(
        { error: "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    // ตรวจสอบรหัสผ่าน
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      console.warn(`⚠️ [API:signin] รหัสผ่านไม่ถูกต้องสำหรับ identifier: ${identifier}`);
      return NextResponse.json(
        { error: "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    // ตรวจสอบสถานะบัญชี
    if (!user.isActive) {
      console.warn(`⚠️ [API:signin] บัญชีไม่ใช้งาน: ${identifier}`);
      return NextResponse.json(
        { error: "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแล" },
        { status: 403 }
      );
    }

    if (user.isBanned) {
      const banMessage = user.bannedUntil
        ? `บัญชีนี้ถูกระงับจนถึง ${new Date(user.bannedUntil).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`
        : "บัญชีนี้ถูกระงับถาวร";
      console.warn(`⚠️ [API:signin] บัญชีถูกแบน: ${identifier}`);
      return NextResponse.json(
        { error: banMessage, banReason: user.banReason || "ไม่ระบุสาเหตุ" },
        { status: 403 }
      );
    }

    // ตรวจสอบการยืนยันอีเมล
    if (!user.isEmailVerified && user.email) {
      console.warn(`⚠️ [API:signin] อีเมลยังไม่ได้รับการยืนยัน: ${identifier}`);
      return NextResponse.json(
        { error: "ยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมาย" },
        { status: 403 }
      );
    }

    // อัปเดตเวลา login ล่าสุด (middleware ใน User model จะจัดการ streaks)
    user.lastLoginAt = new Date();
    await user.save();

    // เตรียมข้อมูลผู้ใช้สำหรับ response (สอดคล้องกับ SessionUser)
    const userResponse: SignInResponseUser = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      name: user.profile?.displayName || user.username,
      role: user.role,
      profile: {
        displayName: user.profile?.displayName,
        avatar: user.profile?.avatar,
        bio: user.profile?.bio,
        coverImage: user.profile?.coverImage,
        gender: user.profile?.gender,
        preferredGenres: user.profile?.preferredGenres,
      },
      trackingStats: {
        totalLoginDays: user.trackingStats.totalLoginDays,
        totalNovelsRead: user.trackingStats.totalNovelsRead,
        totalEpisodesRead: user.trackingStats.totalEpisodesRead,
        totalCoinSpent: user.trackingStats.totalCoinSpent,
        totalRealMoneySpent: user.trackingStats.totalRealMoneySpent,
        lastNovelReadId: user.trackingStats.lastNovelReadId,
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
        contentFilters: user.preferences.contentFilters
          ? {
              showMatureContent: user.preferences.contentFilters.showMatureContent,
              blockedGenres: user.preferences.contentFilters.blockedGenres,
              blockedTags: user.preferences.contentFilters.blockedTags,
            }
          : undefined,
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
        experiencePoints: user.gamification.experiencePoints,
        achievements: user.gamification.achievements,
        badges: user.gamification.badges,
        streaks: {
          currentLoginStreak: user.gamification.streaks.currentLoginStreak,
          longestLoginStreak: user.gamification.streaks.longestLoginStreak,
          lastLoginDate: user.gamification.streaks.lastLoginDate,
        },
        dailyCheckIn: user.gamification.dailyCheckIn
          ? {
              lastCheckInDate: user.gamification.dailyCheckIn.lastCheckInDate,
              currentStreak: user.gamification.dailyCheckIn.currentStreak,
            }
          : undefined,
      },
      writerVerification: user.writerVerification
        ? {
            status: user.writerVerification.status,
            submittedAt: user.writerVerification.submittedAt,
            verifiedAt: user.writerVerification.verifiedAt,
            rejectedReason: user.writerVerification.rejectedReason,
            documents: user.writerVerification.documents,
          }
        : undefined,
      donationSettings: user.donationSettings
        ? {
            isDonationEnabled: user.donationSettings.isDonationEnabled,
            donationApplicationId: user.donationSettings.donationApplicationId,
            customMessage: user.donationSettings.customMessage,
          }
        : undefined,
      writerApplication: user.writerApplication,
      writerStats: user.writerStats,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      isBanned: user.isBanned,
      bannedUntil: user.bannedUntil,
    };

    console.log(`✅ [API:signin] การลงชื่อเข้าใช้สำเร็จ: ${identifier} (role: ${user.role})`);
    return NextResponse.json(
      { success: true, user: userResponse },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [API:signin] ข้อผิดพลาด:", error.message || error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลงชื่อเข้าใช้" },
      { status: 500 }
    );
  }
}