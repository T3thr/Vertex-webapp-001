// src/app/api/users/[username]/followers/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";
import UserFollowModel from "@/backend/models/UserFollow";

// อินเทอร์เฟซสำหรับการตอบกลับของ API
interface FollowersResponse {
  followers: Array<{
    _id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  }>;
  currentPage: number;
  totalPages: number;
  totalFollowers: number;
}

// ฟังก์ชัน GET สำหรับดึงรายชื่อผู้ติดตาม
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

    // ดึงความสัมพันธ์การติดตาม (ผู้ติดตาม)
    const followRelations = await UserFollow.find({ 
      followingId: targetUserId, 
      status: "active" 
    })
      .skip(skip)
      .limit(limit)
      .sort({ followedAt: -1 })
      .lean();

    // ดึงข้อมูลผู้ติดตาม
    const followerIds = followRelations.map(rel => rel.followerId);
    const followers = [];
    for (const followerId of followerIds) {
      let follower = await User.findOne({ 
        _id: followerId, 
        isActive: true, 
        isBanned: false 
      })
        .select('username profile.displayName profile.avatar')
        .lean();
      if (!follower) {
        follower = await SocialMediaUser.findOne({ 
          _id: followerId, 
          isActive: true, 
          isBanned: false, 
          isDeleted: false 
        })
          .select('username profile.displayName profile.avatar image')
          .lean();
        if (follower) {
          follower.profile.avatar = follower.image || follower.profile.avatar;
        }
      }
      if (follower) {
        followers.push({
          _id: follower._id.toString(),
          username: follower.username,
          displayName: follower.profile.displayName,
          avatar: follower.profile.avatar || "/placeholder-avatar.png",
        });
      }
    }

    const totalFollowers = await UserFollow.countDocuments({ 
      followingId: targetUserId, 
      status: "active" 
    });
    const totalPages = Math.ceil(totalFollowers / limit);

    // จัดรูปแบบการตอบกลับ
    const response: FollowersResponse = {
      followers,
      currentPage: page,
      totalPages,
      totalFollowers,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error("ข้อผิดพลาดในการดึงรายชื่อผู้ติดตาม:", error);
    return NextResponse.json(
      { message: "ข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะดึงรายชื่อผู้ติดตาม" },
      { status: 500 }
    );
  }
}