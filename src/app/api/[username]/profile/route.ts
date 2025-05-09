// src/app/api/users/[username]/profile/route.ts
// API สำหรับดึงข้อมูลโปรไฟล์ผู้ใช้

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";
import UserFollowModel from "@/backend/models/UserFollow";
import NovelModel from "@/backend/models/Novel";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

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

// ตัวจัดการสำหรับ GET request
export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
): Promise<NextResponse> {
  try {
    // เชื่อมต่อกับ MongoDB
    await dbConnect();

    const { username } = params;

    // รับ session เพื่อตรวจสอบการยืนยันตัวตน
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    // ค้นหาผู้ใช้ใน User หรือ SocialMediaUser
    let user = await UserModel()
      .findOne({ username, isActive: true, isBanned: false })
      .lean();
    let isSocialMediaUser = false;

    if (!user) {
      user = await SocialMediaUserModel()
        .findOne({ username, isActive: true, isBanned: false, isDeleted: false })
        .lean();
      isSocialMediaUser = true;
    }

    if (!user) {
      return NextResponse.json(
        { message: "ไม่พบผู้ใช้" },
        { status: 404 }
      );
    }

    // ตรวจสอบการมองเห็นโปรไฟล์
    const profileVisibility = user.preferences?.privacy?.profileVisibility || "public";
    if (profileVisibility !== "public") {
      if (!currentUserId) {
        return NextResponse.json(
          { message: "ต้องล็อกอินเพื่อดูโปรไฟล์นี้" },
          { status: 401 }
        );
      }
      if (profileVisibility === "private" && currentUserId !== user._id.toString()) {
        return NextResponse.json(
          { message: "โปรไฟล์นี้เป็นส่วนตัว" },
          { status: 403 }
        );
      }
      if (profileVisibility === "followersOnly" && currentUserId !== user._id.toString()) {
        const isFollower = await UserFollowModel().exists({
          followerId: currentUserId,
          followingId: user._id,
        });
        if (!isFollower) {
          return NextResponse.json(
            { message: "ต้องติดตามผู้ใช้เพื่อดูโปรไฟล์นี้" },
            { status: 403 }
          );
        }
      }
    }

    // คำนวณ socialStats แบบเรียลไทม์
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

    // สร้างข้อมูลโปรไฟล์สำหรับการตอบกลับ
    const userProfile: UserProfile = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      profile: {
        displayName: user.profile?.displayName,
        bio: user.profile?.bio,
        avatar: user.profile?.avatar || user.image, // ใช้ image จาก SocialMediaUser ถ้าไม่มี avatar
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
  } catch (error: any) {
    console.error("ข้อผิดพลาดในการดึงข้อมูลโปรไฟล์:", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}