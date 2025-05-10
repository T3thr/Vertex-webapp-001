// src/app/api/[username]/followers/route.ts
// API สำหรับดึงรายการผู้ติดตามของผู้ใช้
// รองรับการแบ่งหน้าและการกรองผู้ใช้ที่ใช้งานอยู่

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";
import UserFollowModel, { IUserFollow } from "@/backend/models/UserFollow";
import mongoose from "mongoose";

// อินเทอร์เฟซสำหรับข้อมูลผู้ใช้ที่ส่งกลับ
interface FollowUser {
  _id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

// อินเทอร์เฟซสำหรับข้อมูลผู้ติดตามที่ populate แล้ว
interface PopulatedUserFollow extends mongoose.FlattenMaps<IUserFollow> {
  follower?: {
    _id: mongoose.Types.ObjectId;
    username: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
  };
}

// อินเทอร์เฟซสำหรับการตอบกลับ API
interface FollowListResponse {
  followers: FollowUser[];
  currentPage: number;
  totalPages: number;
  totalFollowers: number;
}

/**
 * GET: ดึงรายการผู้ติดตามของผู้ใช้ตาม username
 * @param req ข้อมูลคำขอจาก Next.js
 * @returns JSON response พร้อมรายการผู้ติดตามและข้อมูลการแบ่งหน้า
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // ดึง username จาก URL
    const { pathname } = req.nextUrl;
    const username = pathname.split("/")[3]; // /api/[username]/followers -> [username]
    if (!username) {
      return NextResponse.json({ error: "ต้องระบุ username" }, { status: 400 });
    }

    // ดึง query parameters
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // ตรวจสอบความถูกต้องของพารามิเตอร์
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: "หน้าต้องเป็นตัวเลขมากกว่า 0" }, { status: 400 });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "จำนวนต่อหน้าต้องอยู่ระหว่าง 1 ถึง 100" },
        { status: 400 }
      );
    }

    // ค้นหาผู้ใช้
    const user =
      (await UserModel().findOne({ username, isActive: true, isBanned: false }).lean()) ||
      (await SocialMediaUserModel()
        .findOne({ username, isActive: true, isBanned: false })
        .lean());
    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // คำนวณการข้ามข้อมูลสำหรับการแบ่งหน้า
    const skip = (page - 1) * limit;

    // ค้นหารายการผู้ติดตาม
    const followers = await UserFollowModel()
      .find({ followingId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "follower",
        select: "username profile.displayName profile.avatar",
      })
      .lean<PopulatedUserFollow[]>();

    // นับจำนวนผู้ติดตามทั้งหมด
    const totalFollowers = await UserFollowModel().countDocuments({
      followingId: user._id,
    });

    // แปลงข้อมูลผู้ติดตาม
    const formattedFollowers: FollowUser[] = followers
      .filter((follow) => follow.follower)
      .map((follow) => ({
        _id: follow.follower!._id.toString(),
        username: follow.follower!.username,
        profile: {
          displayName: follow.follower!.profile?.displayName,
          avatar: follow.follower!.profile?.avatar,
        },
      }));

    // คำนวณจำนวนหน้าทั้งหมด
    const totalPages = Math.ceil(totalFollowers / limit);

    const response: FollowListResponse = {
      followers: formattedFollowers,
      currentPage: page,
      totalPages,
      totalFollowers,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ [API] ข้อผิดพลาดใน /api/[username]/followers:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}