// src/app/api/users/[username]/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import UserModel, { IUser } from "@/backend/models/User";
import SocialMediaUserModel, { ISocialMediaUser } from "@/backend/models/SocialMediaUser";

// อินเทอร์เฟซสำหรับการตอบกลับของโปรไฟล์ผู้ใช้
interface UserProfileResponse {
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
  createdAt: string; // ISO string
  isSocialMediaUser: boolean; // ระบุว่าเป็น SocialMediaUser หรือไม่
}

// ฟังก์ชัน GET สำหรับดึงโปรไฟล์ผู้ใช้
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username;

    // ดึงโมเดล User และ SocialMediaUser
    const User = UserModel();
    const SocialMediaUser = SocialMediaUserModel();

    // ตัวแปรสำหรับเก็บข้อมูลผู้ใช้ (รองรับทั้ง IUser และ ISocialMediaUser)
    let user: mongoose.FlattenMaps<IUser | ISocialMediaUser> & { _id: mongoose.Types.ObjectId; __v: number } | null = null;
    let isSocialMediaUser = false;

    // ค้นหาผู้ใช้ใน User model
    user = await User.findOne({
      username,
      isActive: true,
      isBanned: false,
    }).lean();

    // ถ้าไม่พบใน User model ให้ลองค้นหาใน SocialMediaUser model
    if (!user) {
      user = await SocialMediaUser.findOne({
        username,
        isActive: true,
        isBanned: false,
        isDeleted: false,
      }).lean();
      isSocialMediaUser = !!user;
    }

    // ถ้าไม่พบผู้ใช้
    if (!user) {
      return NextResponse.json(
        { message: "ไม่พบผู้ใช้" },
        { status: 404 }
      );
    }

    // สร้างอ็อบเจ็กต์ตอบกลับที่เป็นมาตรฐาน
    const userProfile: UserProfileResponse = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      profile: {
        displayName: user.profile?.displayName || user.username,
        bio: user.profile?.bio,
        avatar: isSocialMediaUser
          ? (user as mongoose.FlattenMaps<ISocialMediaUser>).image || user.profile?.avatar || "/placeholder-avatar.png"
          : user.profile?.avatar || "/placeholder-avatar.png",
        coverImage: user.profile?.coverImage || "/placeholder-cover.jpg",
      },
      socialStats: {
        followersCount: user.socialStats?.followersCount || 0,
        followingCount: user.socialStats?.followingCount || 0,
        novelsCreatedCount: user.socialStats?.novelsCreatedCount || 0,
      },
      createdAt: isSocialMediaUser
        ? (user as mongoose.FlattenMaps<ISocialMediaUser>).joinedAt.toISOString()
        : (user as mongoose.FlattenMaps<IUser>).createdAt.toISOString(),
      isSocialMediaUser,
    };

    return NextResponse.json(userProfile, { status: 200 });
  } catch (error) {
    console.error("ข้อผิดพลาดในการดึงโปรไฟล์ผู้ใช้:", error);
    return NextResponse.json(
      { message: "ข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}