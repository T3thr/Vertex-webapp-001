// src/app/api/users/[username]/follow/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import mongoose from "mongoose";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";
import UserFollowModel from "@/backend/models/UserFollow";

// ฟังก์ชัน POST สำหรับการติดตามผู้ใช้
export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const loggedInUser = session?.user as { id: string; username: string; role: string } | undefined;

    // ตรวจสอบการยืนยันตัวตน
    if (!loggedInUser) {
      return NextResponse.json(
        { message: "ไม่ได้รับอนุญาต: กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    const userToFollowUsername = params.username;
    const followerId = new mongoose.Types.ObjectId(loggedInUser.id);

    // ดึงโมเดล User และ SocialMediaUser
    const User = UserModel();
    const SocialMediaUser = SocialMediaUserModel();

    // ค้นหาผู้ใช้ที่ต้องการติดตาม
    let userToFollow = await User.findOne({ 
      username: userToFollowUsername, 
      isActive: true, 
      isBanned: false 
    }).select('_id preferences.privacy');
    let isSocialMediaUser = false;

    if (!userToFollow) {
      const socialUser = await SocialMediaUser.findOne({ 
        username: userToFollowUsername, 
        isActive: true, 
        isBanned: false, 
        isDeleted: false 
      }).select('_id preferences.privacy');
      if (socialUser) {
        userToFollow = socialUser;
        isSocialMediaUser = true;
      }
    }

    if (!userToFollow) {
      return NextResponse.json(
        { message: `ไม่พบผู้ใช้ ${userToFollowUsername}` },
        { status: 404 }
      );
    }

    const followingId = userToFollow._id;

    // ตรวจสอบว่าไม่ใช่การติดตามตัวเอง
    if (followerId.equals(followingId)) {
      return NextResponse.json(
        { message: "ไม่สามารถติดตามตัวเองได้" },
        { status: 400 }
      );
    }

    // ตรวจสอบการตั้งค่าความเป็นส่วนตัว
    const privacy = userToFollow.preferences.privacy;
    if (privacy.profileVisibility === "private" && loggedInUser.role !== "Admin") {
      return NextResponse.json(
        { message: "ไม่มีสิทธิ์: โปรไฟล์นี้เป็นส่วนตัว" },
        { status: 403 }
      );
    }

    // ดึงโมเดล UserFollow
    const UserFollow = UserFollowModel();

    // ตรวจสอบความสัมพันธ์การติดตามที่มีอยู่
    const existingFollow = await UserFollow.findOne({ followerId, followingId });
    if (existingFollow && existingFollow.status === "active") {
      return NextResponse.json(
        { message: `คุณกำลังติดตาม ${userToFollowUsername} อยู่แล้ว` },
        { status: 400 }
      );
    }

    // สร้างหรืออัปเดตความสัมพันธ์การติดตาม
    if (existingFollow) {
      existingFollow.status = "active";
      existingFollow.followedAt = new Date();
      await existingFollow.save();
    } else {
      const newFollow = new UserFollow({
        followerId,
        followingId,
        status: "active",
        followedAt: new Date(),
      });
      await newFollow.save();
    }

    return NextResponse.json(
      { message: `ติดตาม ${userToFollowUsername} สำเร็จ` },
      { status: 201 }
    );
  } catch (error) {
    console.error("ข้อผิดพลาดในการติดตามผู้ใช้:", error);
    return NextResponse.json(
      { message: "ข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะติดตามผู้ใช้" },
      { status: 500 }
    );
  }
}

// ฟังก์ชัน DELETE สำหรับการเลิกติดตามผู้ใช้
export async function DELETE(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const loggedInUser = session?.user as { id: string; username: string; role: string } | undefined;

    // ตรวจสอบการยืนยันตัวตน
    if (!loggedInUser) {
      return NextResponse.json(
        { message: "ไม่ได้รับอนุญาต: กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    const userToUnfollowUsername = params.username;
    const followerId = new mongoose.Types.ObjectId(loggedInUser.id);

    // ดึงโมเดล User และ SocialMediaUser
    const User = UserModel();
    const SocialMediaUser = SocialMediaUserModel();

    // ค้นหาผู้ใช้ที่ต้องการเลิกติดตาม
    let userToUnfollow = await User.findOne({ 
      username: userToUnfollowUsername, 
      isActive: true, 
      isBanned: false 
    }).select('_id');
    let isSocialMediaUser = false;

    if (!userToUnfollow) {
      const socialUser = await SocialMediaUser.findOne({ 
        username: userToUnfollowUsername, 
        isActive: true, 
        isBanned: false, 
        isDeleted: false 
      }).select('_id');
      if (socialUser) {
        userToUnfollow = socialUser;
        isSocialMediaUser = true;
      }
    }

    if (!userToUnfollow) {
      return NextResponse.json(
        { message: `ไม่พบผู้ใช้ ${userToUnfollowUsername}` },
        { status: 404 }
      );
    }

    const followingId = userToUnfollow._id;

    // ดึงโมเดล UserFollow
    const UserFollow = UserFollowModel();

    // ค้นหาและลบความสัมพันธ์การติดตาม
    const result = await UserFollow.deleteOne({ followerId, followingId, status: "active" });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: `คุณไม่ได้ติดตาม ${userToUnfollowUsername}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: `เลิกติดตาม ${userToUnfollowUsername} สำเร็จ` },
      { status: 200 }
    );
  } catch (error) {
    console.error("ข้อผิดพลาดในการเลิกติดตามผู้ใช้:", error);
    return NextResponse.json(
      { message: "ข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะเลิกติดตามผู้ใช้" },
      { status: 500 }
    );
  }
}