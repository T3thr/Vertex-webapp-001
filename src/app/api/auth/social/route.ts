// src/app/api/auth/social/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel, { ISocialMediaUser } from "@/backend/models/SocialMediaUser";
import { Types } from "mongoose";

// ประเภทสำหรับ Request Body
interface SocialSignInRequestBody {
  provider: string;
  providerId: string;
  email?: string;
  name?: string;
  username?: string;
  picture?: string;
}

// ประเภทสำหรับ Response User (สอดคล้องกับ SessionUser ใน options.ts)
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
    transactionHistory?: string[];
    paymentMethods?: {
      type: string;
      details: Record<string, any>;
      isDefault: boolean;
    }[];
  };
  gamification: {
    level: number;
    experience: number;
    achievements?: { id: string; name: string; unlockedAt: Date }[];
    badges?: string[];
    streaks: {
      currentLoginStreak: number;
      longestLoginStreak: number;
      lastLoginDate?: Date;
    };
  };
  writerVerification?: {
    status: "pending" | "verified" | "rejected";
    submittedAt?: Date;
    verifiedAt?: Date;
    rejectedReason?: string;
    documents?: { type: string; url: string; uploadedAt: Date }[];
  };
  isActive: boolean;
  isEmailVerified: boolean;
  bannedUntil?: Date;
}

// ประเภทสำหรับการสร้างผู้ใช้ใหม่ (สอดคล้องกับ ISocialMediaUser โดยไม่มี Mongoose Document properties)
interface SocialMediaUserInput {
  provider: string;
  providerAccountId: string;
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
    transactionHistory?: Types.ObjectId[];
    paymentMethods?: {
      type: string;
      details: Record<string, any>;
      isDefault: boolean;
    }[];
  };
  gamification: {
    level: number;
    experience: number;
    achievements: { id: string; name: string; unlockedAt: Date }[];
    badges: Types.ObjectId[];
    streaks: {
      currentLoginStreak: number;
      longestLoginStreak: number;
      lastLoginDate: Date;
    };
  };
  writerVerification?: {
    status: "pending" | "verified" | "rejected";
    submittedAt: Date;
    verifiedAt?: Date;
    rejectedReason?: string;
    documents: { type: string; url: string; uploadedAt: Date }[];
  };
  isActive: boolean;
  bannedUntil?: Date;
  lastLogin: Date;
}

// สร้าง username ที่ไม่ซ้ำกัน
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
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      console.error(`❌ รูปแบบชื่อผู้ใช้ไม่ถูกต้อง: ${username}`);
      return NextResponse.json(
        { error: "ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร, ตัวเลข หรือเครื่องหมาย _ เท่านั้น" },
        { status: 400 }
      );
    }
    if (name && !/^[a-zA-Z0-9\s_]+$/.test(name)) {
      console.error(`❌ รูปแบบชื่อไม่ถูกต้อง: ${name}`);
      return NextResponse.json(
        { error: "ชื่อต้องประกอบด้วยตัวอักษร, ตัวเลข, ช่องว่าง หรือเครื่องหมาย _ เท่านั้น" },
        { status: 400 }
      );
    }

    // ค้นหาผู้ใช้ใน SocialMediaUser collection
    const user = await SocialMediaUserModel()
      .findOne({
        $or: [
          { provider, providerAccountId: providerId },
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
        lastLogin: new Date(),
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

      if (Object.keys(updates).length > 1) {
        console.log(`⏳ อัปเดตผู้ใช้ ${user.email || user.username} ด้วยข้อมูล:`, updates);
        await SocialMediaUserModel().updateOne({ _id: user._id }, { $set: updates });
      } else {
        await SocialMediaUserModel().updateOne({ _id: user._id }, { lastLogin: new Date() });
      }

      console.log(`✅ ผู้ใช้ ${user.email || user.username} เข้าสู่ระบบด้วย ${provider} (บัญชีเดิม)`);

      // สร้าง response user
      const userResponse: SocialSignInResponseUser = {
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
        stats: user.stats ?? {
          followers: 0,
          following: 0,
          novels: 0,
          purchases: 0,
          donationsReceived: 0,
          donationsMade: 0,
          totalEpisodesSold: 0,
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
        wallet: {
          balance: user.wallet?.balance ?? 0,
          currency: user.wallet?.currency ?? "THB",
          lastTransaction: user.wallet?.lastTransaction,
          transactionHistory: user.wallet?.transactionHistory?.map((id) => id.toString()) ?? [],
          paymentMethods: user.wallet?.paymentMethods ?? [],
        },
        gamification: {
          level: user.gamification?.level ?? 1,
          experience: user.gamification?.experience ?? 0,
          achievements: user.gamification?.achievements ?? [],
          badges: user.gamification?.badges?.map((id) => id.toString()) ?? [],
          streaks: user.gamification?.streaks ?? {
            currentLoginStreak: 0,
            longestLoginStreak: 0,
            lastLoginDate: new Date(),
          },
        },
        writerVerification: user.writerVerification,
        isActive: user.isActive ?? true,
        isEmailVerified: !!user.email,
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
      provider,
      providerAccountId: providerId,
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
      stats: {
        followers: 0,
        following: 0,
        novels: 0,
        purchases: 0,
        donationsReceived: 0,
        donationsMade: 0,
        totalEpisodesSold: 0,
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
        },
      },
      wallet: {
        balance: 0,
        currency: "THB",
        transactionHistory: [],
        paymentMethods: [],
      },
      gamification: {
        level: 1,
        experience: 0,
        achievements: [],
        badges: [],
        streaks: {
          currentLoginStreak: 0,
          longestLoginStreak: 0,
          lastLoginDate: new Date(),
        },
      },
      isActive: true,
      lastLogin: new Date(),
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
      stats: savedUser.stats ?? {
        followers: 0,
        following: 0,
        novels: 0,
        purchases: 0,
        donationsReceived: 0,
        donationsMade: 0,
        totalEpisodesSold: 0,
      },
      preferences: savedUser.preferences ?? {
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
      wallet: {
        balance: savedUser.wallet?.balance ?? 0,
        currency: savedUser.wallet?.currency ?? "THB",
        lastTransaction: savedUser.wallet?.lastTransaction,
        transactionHistory: savedUser.wallet?.transactionHistory?.map((id) => id.toString()) ?? [],
        paymentMethods: savedUser.wallet?.paymentMethods ?? [],
      },
      gamification: {
        level: savedUser.gamification?.level ?? 1,
        experience: savedUser.gamification?.experience ?? 0,
        achievements: savedUser.gamification?.achievements ?? [],
        badges: savedUser.gamification?.badges?.map((id) => id.toString()) ?? [],
        streaks: savedUser.gamification?.streaks ?? {
          currentLoginStreak: 0,
          longestLoginStreak: 0,
          lastLoginDate: new Date(),
        },
      },
      writerVerification: savedUser.writerVerification,
      isActive: savedUser.isActive ?? true,
      isEmailVerified: !!savedUser.email,
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