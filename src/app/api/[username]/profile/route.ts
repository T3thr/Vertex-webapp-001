// src/app/api/[username]/profile/route.ts
// API สำหรับดึงข้อมูลโปรไฟล์ผู้ใช้
// รองรับการตรวจสอบความเป็นส่วนตัวและคำนวณสถิติโซเชียลแบบเรียลไทม์

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUser } from "@/backend/models/User";
import SocialMediaUserModel, { ISocialMediaUser } from "@/backend/models/SocialMediaUser";
import UserFollowModel from "@/backend/models/UserFollow";
import NovelModel from "@/backend/models/Novel";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import mongoose from "mongoose";

// อินเทอร์เฟซสำหรับข้อมูลโปรไฟล์ที่ส่งกลับ
interface UserProfile {
  _id: string;
  username: string;
  email?: string;
  role: "Reader" | "Writer" | "Admin";
  profile: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    coverImage?: string;
  };
  socialStats: {
    followersCount: number;
    followingCount: number;
    novelsCreatedCount: number;
  };
  createdAt: string;
  isSocialMediaUser: boolean;
}

// อินเทอร์เฟซสำหรับข้อมูลผู้ใช้ที่รวมกัน
type CombinedUser = (IUser | ISocialMediaUser) & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt?: Date;
  preferences?: {
    privacy?: {
      profileVisibility?: "public" | "private" | "followersOnly";
    };
  };
  profile?: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    coverImage?: string;
  };
  image?: string;
  role: "Reader" | "Writer" | "Admin";
  email?: string;
};

/**
 * GET: ดึงข้อมูลโปรไฟล์ผู้ใช้ตาม username
 * @param req ข้อมูลคำขอจาก Next.js
 * @returns JSON response พร้อมข้อมูลโปรไฟล์ผู้ใช้
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // ดึง username จาก URL
    const { pathname } = req.nextUrl;
    const username = pathname.split("/")[3]; // /api/[username]/profile -> [username]
    if (!username) {
      return NextResponse.json({ error: "ต้องระบุ username" }, { status: 400 });
    }

    // รับ session เพื่อตรวจสอบการยืนยันตัวตน
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    // ค้นหาผู้ใช้
    let user: CombinedUser | null = await UserModel()
      .findOne({ username, isActive: true, isBanned: false })
      .exec()
      .then(doc => doc?.toObject() as CombinedUser | null);

    let isSocialMediaUser = false;

    if (!user) {
      user = await SocialMediaUserModel()
        .findOne({ username, isActive: true, isBanned: false, isDeleted: false })
        .exec()
        .then(doc => doc?.toObject() as CombinedUser | null);
      isSocialMediaUser = true;
    }

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // ตรวจสอบการมองเห็นโปรไฟล์
    const profileVisibility = user.preferences?.privacy?.profileVisibility || "public";
    if (profileVisibility !== "public") {
      if (!currentUserId) {
        return NextResponse.json({ error: "ต้องล็อกอินเพื่อดูโปรไฟล์นี้" }, { status: 401 });
      }
      if (profileVisibility === "private" && currentUserId !== user._id.toString()) {
        return NextResponse.json({ error: "โปรไฟล์นี้เป็นส่วนตัว" }, { status: 403 });
      }
      if (profileVisibility === "followersOnly" && currentUserId !== user._id.toString()) {
        const isFollower = await UserFollowModel().exists({
          followerId: currentUserId,
          followingId: user._id,
        });
        if (!isFollower) {
          return NextResponse.json(
            { error: "ต้องติดตามผู้ใช้เพื่อดูโปรไฟล์นี้" },
            { status: 403 }
          );
        }
      }
    }

    // คำนวณ socialStats
    const followersCount = await UserFollowModel().countDocuments({
      followingId: user._id,
    });
    const followingCount = await UserFollowModel().countDocuments({
      followerId: user._id,
    });
    const novelsCreatedCount = await NovelModel().countDocuments({
      author: user._id,
      isPublished: true,
    });

    // สร้างข้อมูลโปรไฟล์
    const userProfile: UserProfile = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      profile: {
        displayName: user.profile?.displayName,
        bio: user.profile?.bio,
        avatar: user.profile?.avatar || user.image,
        coverImage: user.profile?.coverImage,
      },
      socialStats: {
        followersCount,
        followingCount,
        novelsCreatedCount,
      },
      createdAt: user.createdAt.toISOString(),
      isSocialMediaUser,
    };

    return NextResponse.json(userProfile, { status: 200 });
  } catch (error) {
    console.error("❌ [API] ข้อผิดพลาดใน /api/[username]/profile:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}