// src/app/api/users/[username]/following/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";
import UserFollowModel from "@/backend/models/UserFollow";

// อินเทอร์เฟซสำหรับการตอบกลับของ API
interface FollowingResponse {
  following: Array<{
    _id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  }>;
  currentPage: number;
  totalPages: number;
  totalFollowing: number;
}

// ฟังก์ชัน GET สำหรับดึงรายชื่อผู้ที่กำลังติดตาม
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const targetUsername = params.username;

    // ดึงโมเดล User และ SocialMediaUser
    const User = UserModel();
    const SocialMediaUser = SocialMediaUserModel();

    // ค้นหาผู้ใช้เป้าหมาย
    let targetUser = await User.findOne({ 
      username: targetUsername, 
      isActive: true, 
      isBanned: false 
    }).select('_id preferences.privacy');
    let isSocialMediaUser = false;

    if (!targetUser) {
      const socialUser = await SocialMediaUser.findOne({ 
        username: targetUsername, 
        isActive: true, 
        isBanned: false, 
        isDeleted: false 
      }).select('_id preferences.privacy');
      if (socialUser) {
        targetUser = socialUser;
        isSocialMediaUser = true;
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        { message: "ไม่พบผู้ใช้" },
        { status: 404 }
      );
    }

    const targetUserId = targetUser._id;

    // ตรวจสอบการตั้งค่าความเป็นส่วนตัว
    const privacy = targetUser.preferences.privacy;
    if (privacy.profileVisibility === "private") {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์: โปรไฟล์นี้เป็นส่วนตัว" },
        { status: 403 }
      );
    }

    // ดึงพารามิเตอร์การแบ่งหน้า
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // ดึงโมเดล UserFollow
    const UserFollow = UserFollowModel();

    // ดึงความสัมพันธ์การติดตาม (ผู้ที่กำลังติดตาม)
    const followRelations = await UserFollow.find({ 
      followerId: targetUserId, 
      status: "active" 
    })
      .skip(skip)
      .limit(limit)
      .sort({ followedAt: -1 })
      .lean();

    // ดึงข้อมูลผู้ที่กำลังติดตาม
    const followingIds = followRelations.map(rel => rel.followingId);
    const following = [];
    for (const followingId of followingIds) {
      let followedUser = await User.findOne({ 
        _id: followingId, 
        isActive: true, 
        isBanned: false 
      })
        .select('username profile.displayName profile.avatar')
        .lean();
      if (!followedUser) {
        followedUser = await SocialMediaUser.findOne({ 
          _id: followingId, 
          isActive: true, 
          isBanned: false, 
          isDeleted: false 
        })
          .select('username profile.displayName profile.avatar image')
          .lean();
        if (followedUser) {
          followedUser.profile.avatar = followedUser.image || followedUser.profile.avatar;
        }
      }
      if (followedUser) {
        following.push({
          _id: followedUser._id.toString(),
          username: followedUser.username,
          displayName: followedUser.profile.displayName,
          avatar: followedUser.profile.avatar || "/placeholder-avatar.png",
        });
      }
    }

    const totalFollowing = await UserFollow.countDocuments({ 
      followerId: targetUserId, 
      status: "active" 
    });
    const totalPages = Math.ceil(totalFollowing / limit);

    // จัดรูปแบบการตอบกลับ
    const response: FollowingResponse = {
      following,
      currentPage: page,
      totalPages,
      totalFollowing,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error("ข้อผิดพลาดในการดึงรายชื่อผู้ที่กำลังติดตาม:", error);
    return NextResponse.json(
      { message: "ข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะดึงรายชื่อผู้ที่กำลังติดตาม" },
      { status: 500 }
    );
  }
}