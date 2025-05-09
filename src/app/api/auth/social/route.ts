// src/app/api/auth/social/route.ts
// API สำหรับการจัดการการเข้าสู่ระบบผ่าน OAuth providers (Google, Twitter, etc.)
// รองรับการสร้างหรืออัปเดตผู้ใช้ใน SocialMediaUser collection

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel, { ISocialMediaUser } from "@/backend/models/SocialMediaUser";
import { Types } from "mongoose";

// ประเภทสำหรับ Request Body
// อินเทอร์เฟซสำหรับข้อมูลที่ส่งมาในคำขอ
interface SocialSignInRequestBody {
  provider: string;
  providerId: string;
  email?: string;
  name?: string;
  username?: string;
  picture?: string;
}

// ประเภทสำหรับ Response User (สอดคล้องกับ SessionUser และ ISocialMediaUser)
// อินเทอร์เฟซสำหรับข้อมูลผู้ใช้ที่ส่งกลับในคำตอบ
interface SocialSignInResponseUser {
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
    theme: "light" | "dark" | "system";
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
      blockedGenres?: string[];
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
    experience: number;
    achievements?: string[];
    badges?: string[];
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
    donationApplicationId?: string;
    customMessage?: string;
  };
  isActive: boolean;
  isEmailVerified: boolean;
  isBanned: boolean;
  bannedUntil?: Date;
}

// ประเภทสำหรับการสร้างผู้ใช้ใหม่ (สอดคล้องกับ ISocialMediaUser)
// อินเทอร์เฟซสำหรับข้อมูลผู้ใช้ใหม่ที่สร้างใน SocialMediaUser
interface SocialMediaUserInput {
  accounts: {
    provider: string;
    providerAccountId: string;
    type: string;
  }[];
  email?: string;
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
    theme: "light" | "dark" | "system";
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
  isEmailVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedUntil?: Date;
  lastLoginAt: Date;
  joinedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  emailVerified?: Date | null;
  image?: string;
}

// สร้าง username ที่ไม่ซ้ำกัน
// ฟังก์ชันสำหรับสร้างชื่อผู้ใช้ที่ไม่ซ้ำในทั้ง User และ SocialMediaUser
async function generateUniqueUsername(baseUsername: string): Promise<string> {
  let newUsername = baseUsername.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "");
  if (newUsername.length < 3) {
    newUsername = `${newUsername}${Math.random().toString(36).substring(2, 5)}`;
  }
  let counter = 1;

  // ใช้ $or เพื่อตรวจสอบทั้ง User และ SocialMediaUser ใน query เดียว
  while (
    await Promise.all([
      UserModel().findOne({ username: newUsername }).lean(),
      SocialMediaUserModel().findOne({ username: newUsername }).lean(),
    ]).then(([user, socialUser]) => user || socialUser)
  ) {
    newUsername = `${baseUsername}${counter}`;
    counter += 1;
  }

  return newUsername;
}

// POST: สร้างหรืออัปเดตผู้ใช้ SocialMediaUser ผ่าน OAuth
// รับคำขอและจัดการการเข้าสู่ระบบหรือสร้างผู้ใช้ใหม่
export async function POST(request: Request): Promise<NextResponse> {
  await dbConnect();

  try {
    const body = await request.json() as SocialSignInRequestBody;
    const { provider, providerId, email, name, username, picture } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!provider || !providerId || (!email && !username && !name)) {
      console.error(`❌ ข้อมูลไม่ครบถ้วน: provider=${provider}, providerId=${providerId}, email=${email}, username=${username}, name=${name}`);
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน (ต้องการ provider, providerId, และอย่างน้อย email, username, หรือ name)" },
        { status: 400 }
      );
    }

    // ป้องกันการฉีดโค้ดด้วยการตรวจสอบรูปแบบ
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      console.error(`❌ รูปแบบอีเมลไม่ถูกต้อง: ${email}`);
      return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
    }

    // ค้นหาผู้ใช้ใน SocialMediaUser collection โดยใช้ accounts
    const user = await SocialMediaUserModel()
      .findOne({
        $or: [
          { "accounts.provider": provider, "accounts.providerAccountId": providerId },
          email && email.trim() ? { email: email.toLowerCase() } : {},
          username ? { username: username.toLowerCase() } : {},
        ].filter((condition) => Object.keys(condition).length > 0),
      })
      .lean() as ISocialMediaUser | null;

    if (user) {
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

      // อัปเดตข้อมูลผู้ใช้ที่มีอยู่
      const updates: Partial<ISocialMediaUser> = {
        lastLoginAt: new Date(),
      };

      if (name && !user.profile.displayName) {
        updates.profile = { ...user.profile, displayName: name };
      }
      if (picture && !user.profile.avatar) {
        updates.profile = { ...user.profile, avatar: picture };
      }
      if (email && email.trim() && !user.email) {
        updates.email = email.toLowerCase();
      }
      if (picture && !user.image) {
        updates.image = picture;
      }

      // ตรวจสอบและเพิ่ม trackingStats และ socialStats ถ้าขาดหาย
      if (!user.trackingStats || !user.socialStats) {
        updates.trackingStats = user.trackingStats || {
          totalLoginDays: 0,
          totalNovelsRead: 0,
          totalEpisodesRead: 0,
          totalCoinSpent: 0,
          totalRealMoneySpent: 0,
          joinDate: user.joinedAt || new Date(),
        };
        updates.socialStats = user.socialStats || {
          followersCount: 0,
          followingCount: 0,
          novelsCreatedCount: 0,
          commentsMadeCount: 0,
          ratingsGivenCount: 0,
          likesGivenCount: 0,
        };
        console.warn(`⚠️ ผู้ใช้ ${user.email || user.username} มี trackingStats หรือ socialStats ขาดหาย, อัปเดตด้วยค่าเริ่มต้น`);
      }

      if (Object.keys(updates).length > 1) {
        console.log(`⏳ อัปเดตผู้ใช้ ${user.email || user.username} ด้วยข้อมูล:`, updates);
        await SocialMediaUserModel().updateOne({ _id: user._id }, { $set: updates });
      } else {
        await SocialMediaUserModel().updateOne({ _id: user._id }, { lastLoginAt: new Date() });
      }

      console.log(`✅ ผู้ใช้ ${user.email || user.username} เข้าสู่ระบบด้วย ${provider} (บัญชีเดิม)`);

      // สร้าง response user ด้วยการตรวจสอบค่าเริ่มต้น
      const userResponse: SocialSignInResponseUser = {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role || "Reader",
        profile: {
          displayName: user.profile?.displayName,
          avatar: user.profile?.avatar,
          bio: user.profile?.bio,
          coverImage: user.profile?.coverImage,
          gender: user.profile?.gender,
          preferredGenres: user.profile?.preferredGenres?.map((id) => id.toString()) ?? [],
        },
        trackingStats: {
          totalLoginDays: user.trackingStats?.totalLoginDays ?? 0,
          totalNovelsRead: user.trackingStats?.totalNovelsRead ?? 0,
          totalEpisodesRead: user.trackingStats?.totalEpisodesRead ?? 0,
          totalCoinSpent: user.trackingStats?.totalCoinSpent ?? 0,
          totalRealMoneySpent: user.trackingStats?.totalRealMoneySpent ?? 0,
          lastNovelReadId: user.trackingStats?.lastNovelReadId?.toString(),
          lastNovelReadAt: user.trackingStats?.lastNovelReadAt,
          joinDate: user.joinedAt || new Date(),
        },
        socialStats: {
          followersCount: user.socialStats?.followersCount ?? 0,
          followingCount: user.socialStats?.followingCount ?? 0,
          novelsCreatedCount: user.socialStats?.novelsCreatedCount ?? 0,
          commentsMadeCount: user.socialStats?.commentsMadeCount ?? 0,
          ratingsGivenCount: user.socialStats?.ratingsGivenCount ?? 0,
          likesGivenCount: user.socialStats?.likesGivenCount ?? 0,
        },
        preferences: {
          language: user.preferences?.language ?? "th",
          theme: user.preferences?.theme ?? "system",
          notifications: {
            email: user.preferences?.notifications?.email ?? true,
            push: user.preferences?.notifications?.push ?? true,
            novelUpdates: user.preferences?.notifications?.novelUpdates ?? true,
            comments: user.preferences?.notifications?.comments ?? true,
            donations: user.preferences?.notifications?.donations ?? true,
            newFollowers: user.preferences?.notifications?.newFollowers ?? true,
            systemAnnouncements: user.preferences?.notifications?.systemAnnouncements ?? false,
          },
          contentFilters: {
            showMatureContent: user.preferences?.contentFilters?.showMatureContent ?? false,
            blockedGenres: user.preferences?.contentFilters?.blockedGenres?.map((id) => id.toString()) ?? [],
            blockedTags: user.preferences?.contentFilters?.blockedTags ?? [],
          },
          privacy: {
            showActivityStatus: user.preferences?.privacy?.showActivityStatus ?? true,
            profileVisibility: user.preferences?.privacy?.profileVisibility ?? "public",
            readingHistoryVisibility: user.preferences?.privacy?.readingHistoryVisibility ?? "followersOnly",
          },
        },
        wallet: {
          coinBalance: user.wallet?.coinBalance ?? 0,
          lastCoinTransactionAt: user.wallet?.lastCoinTransactionAt,
        },
        gamification: {
          level: user.gamification?.level ?? 1,
          experience: user.gamification?.experiencePoints ?? 0,
          achievements: user.gamification?.achievements?.map((id) => id.toString()) ?? [],
          badges: user.gamification?.badges?.map((id) => id.toString()) ?? [],
          streaks: {
            currentLoginStreak: user.gamification?.streaks?.currentLoginStreak ?? 0,
            longestLoginStreak: user.gamification?.streaks?.longestLoginStreak ?? 0,
            lastLoginDate: user.gamification?.streaks?.lastLoginDate,
          },
          dailyCheckIn: user.gamification?.dailyCheckIn
            ? {
                lastCheckInDate: user.gamification.dailyCheckIn.lastCheckInDate,
                currentStreak: user.gamification.dailyCheckIn.currentStreak ?? 0,
              }
            : undefined,
        },
        writerVerification: user.writerVerification?.status !== "none" ? user.writerVerification : undefined,
        donationSettings: user.donationSettings?.isDonationEnabled
          ? {
              isDonationEnabled: user.donationSettings.isDonationEnabled,
              donationApplicationId: user.donationSettings.donationApplicationId?.toString(),
              customMessage: user.donationSettings.customMessage,
            }
          : undefined,
        isActive: user.isActive ?? true,
        isEmailVerified: user.isEmailVerified ?? false,
        isBanned: user.bannedUntil ? user.bannedUntil > new Date() : false,
        bannedUntil: user.bannedUntil,
      };

      return NextResponse.json({ user: userResponse }, { status: 200 });
    }

    // สร้างผู้ใช้ใหม่ใน SocialMediaUser collection
    console.log(`⏳ ไม่พบผู้ใช้ ${email || username}, กำลังสร้างบัญชีใหม่จาก ${provider}...`);

    // สร้าง username ที่ไม่ซ้ำกัน
    const baseUsername =
      username ||
      (email && email.trim() ? email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") : undefined) ||
      name?.replace(/\s+/g, "_").toLowerCase() ||
      `user_${Math.random().toString(36).substring(2, 8)}`;

    const newUsername = await generateUniqueUsername(baseUsername);

    // สร้างผู้ใช้ใหม่ด้วยข้อมูลทั้งหมดตาม schema
    const newUserData: SocialMediaUserInput = {
      accounts: [
        {
          provider,
          providerAccountId: providerId,
          type: "oauth",
        },
      ],
      email: email && email.trim() ? email.toLowerCase() : undefined,
      username: newUsername,
      role: "Reader",
      profile: {
        displayName: name || newUsername,
        avatar: picture || "",
        bio: "",
        coverImage: "",
        preferredGenres: [],
      },
      trackingStats: {
        totalLoginDays: 1,
        totalNovelsRead: 0,
        totalEpisodesRead: 0,
        totalCoinSpent: 0,
        totalRealMoneySpent: 0,
        joinDate: new Date(),
      },
      socialStats: {
        followersCount: 0,
        followingCount: 0,
        novelsCreatedCount: 0,
        commentsMadeCount: 0,
        ratingsGivenCount: 0,
        likesGivenCount: 0,
      },
      preferences: {
        language: "th",
        theme: "system",
        notifications: {
          email: true,
          push: true,
          novelUpdates: true,
          comments: true,
          donations: true,
          newFollowers: true,
          systemAnnouncements: false,
        },
        contentFilters: {
          showMatureContent: false,
          blockedGenres: [],
          blockedTags: [],
        },
        privacy: {
          showActivityStatus: true,
          profileVisibility: "public",
          readingHistoryVisibility: "followersOnly",
        },
      },
      wallet: {
        coinBalance: 0,
      },
      gamification: {
        level: 1,
        experiencePoints: 0,
        achievements: [],
        badges: [],
        streaks: {
          currentLoginStreak: 1,
          longestLoginStreak: 1,
          lastLoginDate: new Date(),
        },
        dailyCheckIn: {
          currentStreak: 0,
        },
      },
      writerVerification: {
        status: "none",
      },
      donationSettings: {
        isDonationEnabled: false,
      },
      isEmailVerified: !!email,
      isActive: true,
      isBanned: false,
      lastLoginAt: new Date(),
      joinedAt: new Date(),
      isDeleted: false,
      emailVerified: email ? new Date() : null,
      image: picture,
    };

    const newUser = new (SocialMediaUserModel())(newUserData);

    console.log(`⏳ ข้อมูลผู้ใช้ใหม่ก่อนบันทึก:`, newUserData);

    // บันทึกผู้ใช้
    await newUser.save();

    // ดึงผู้ใช้ที่บันทึกแล้ว
    const savedUser = await SocialMediaUserModel()
      .findById(newUser._id)
      .lean() as ISocialMediaUser | null;

    if (!savedUser) {
      console.error(`❌ ไม่พบผู้ใช้ที่บันทึก: ${newUser._id}`);
      return NextResponse.json(
        { error: "ไม่สามารถสร้างผู้ใช้ใหม่ได้" },
        { status: 500 }
      );
    }

    console.log(`✅ สร้างผู้ใช้ใหม่ ${savedUser.email || savedUser.username} จาก ${provider} สำเร็จ`);

    // สร้าง response user
    const userResponse: SocialSignInResponseUser = {
      id: savedUser._id.toString(),
      email: savedUser.email,
      username: savedUser.username,
      role: savedUser.role,
      profile: {
        displayName: savedUser.profile?.displayName,
        avatar: savedUser.profile?.avatar,
        bio: savedUser.profile?.bio,
        coverImage: savedUser.profile?.coverImage,
        gender: savedUser.profile?.gender,
        preferredGenres: savedUser.profile?.preferredGenres?.map((id) => id.toString()) ?? [],
      },
      trackingStats: {
        totalLoginDays: savedUser.trackingStats?.totalLoginDays ?? 0,
        totalNovelsRead: savedUser.trackingStats?.totalNovelsRead ?? 0,
        totalEpisodesRead: savedUser.trackingStats?.totalEpisodesRead ?? 0,
        totalCoinSpent: savedUser.trackingStats?.totalCoinSpent ?? 0,
        totalRealMoneySpent: savedUser.trackingStats?.totalRealMoneySpent ?? 0,
        lastNovelReadId: savedUser.trackingStats?.lastNovelReadId?.toString(),
        lastNovelReadAt: savedUser.trackingStats?.lastNovelReadAt,
        joinDate: savedUser.joinedAt || new Date(),
      },
      socialStats: {
        followersCount: savedUser.socialStats?.followersCount ?? 0,
        followingCount: savedUser.socialStats?.followingCount ?? 0,
        novelsCreatedCount: savedUser.socialStats?.novelsCreatedCount ?? 0,
        commentsMadeCount: savedUser.socialStats?.commentsMadeCount ?? 0,
        ratingsGivenCount: savedUser.socialStats?.ratingsGivenCount ?? 0,
        likesGivenCount: savedUser.socialStats?.likesGivenCount ?? 0,
      },
      preferences: {
        language: savedUser.preferences?.language ?? "th",
        theme: savedUser.preferences?.theme ?? "system",
        notifications: {
          email: savedUser.preferences?.notifications?.email ?? true,
          push: savedUser.preferences?.notifications?.push ?? true,
          novelUpdates: savedUser.preferences?.notifications?.novelUpdates ?? true,
          comments: savedUser.preferences?.notifications?.comments ?? true,
          donations: savedUser.preferences?.notifications?.donations ?? true,
          newFollowers: savedUser.preferences?.notifications?.newFollowers ?? true,
          systemAnnouncements: savedUser.preferences?.notifications?.systemAnnouncements ?? false,
        },
        contentFilters: {
          showMatureContent: savedUser.preferences?.contentFilters?.showMatureContent ?? false,
          blockedGenres: savedUser.preferences?.contentFilters?.blockedGenres?.map((id) => id.toString()) ?? [],
          blockedTags: savedUser.preferences?.contentFilters?.blockedTags ?? [],
        },
        privacy: {
          showActivityStatus: savedUser.preferences?.privacy?.showActivityStatus ?? true,
          profileVisibility: savedUser.preferences?.privacy?.profileVisibility ?? "public",
          readingHistoryVisibility: savedUser.preferences?.privacy?.readingHistoryVisibility ?? "followersOnly",
        },
      },
      wallet: {
        coinBalance: savedUser.wallet?.coinBalance ?? 0,
        lastCoinTransactionAt: savedUser.wallet?.lastCoinTransactionAt,
      },
      gamification: {
        level: savedUser.gamification?.level ?? 1,
        experience: savedUser.gamification?.experiencePoints ?? 0,
        achievements: savedUser.gamification?.achievements?.map((id) => id.toString()) ?? [],
        badges: savedUser.gamification?.badges?.map((id) => id.toString()) ?? [],
        streaks: {
          currentLoginStreak: savedUser.gamification?.streaks?.currentLoginStreak ?? 0,
          longestLoginStreak: savedUser.gamification?.streaks?.longestLoginStreak ?? 0,
          lastLoginDate: savedUser.gamification?.streaks?.lastLoginDate,
        },
        dailyCheckIn: savedUser.gamification?.dailyCheckIn
          ? {
              lastCheckInDate: savedUser.gamification.dailyCheckIn.lastCheckInDate,
              currentStreak: savedUser.gamification.dailyCheckIn.currentStreak ?? 0,
            }
          : undefined,
      },
      writerVerification: savedUser.writerVerification?.status !== "none" ? savedUser.writerVerification : undefined,
      donationSettings: savedUser.donationSettings?.isDonationEnabled
        ? {
            isDonationEnabled: savedUser.donationSettings.isDonationEnabled,
            donationApplicationId: savedUser.donationSettings.donationApplicationId?.toString(),
            customMessage: savedUser.donationSettings.customMessage,
          }
        : undefined,
      isActive: savedUser.isActive ?? true,
      isEmailVerified: savedUser.isEmailVerified ?? false,
      isBanned: savedUser.bannedUntil ? savedUser.bannedUntil > new Date() : false,
      bannedUntil: savedUser.bannedUntil,
    };

    return NextResponse.json({ user: userResponse }, { status: 201 });
  } catch (error: unknown) {
    console.error(`❌ ข้อผิดพลาดใน /api/auth/social:`, error);

    if (error instanceof Error && error.name === "ValidationError") {
      const errors = Object.values((error as any).errors).map((el: any) => el.message);
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    if (error instanceof Error && (error as any).code === 11000) {
      const field = Object.keys((error as any).keyValue)[0];
      const message = `${field === "email" ? "อีเมล" : "ชื่อผู้ใช้"} นี้ถูกใช้งานแล้ว`;
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดบางอย่างบนเซิร์ฟเวอร์ขณะประมวลผล Social Login" },
      { status: 500 }
    );
  }
}