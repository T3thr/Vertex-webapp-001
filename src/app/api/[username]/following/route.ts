// src/app/api/users/[username]/following/route.ts
// API สำหรับดึงรายการผู้ที่ผู้ใช้กำลังติดตาม

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";
import UserFollowModel from "@/backend/models/UserFollow";

// อินเทอร์เฟซสำหรับข้อมูลผู้ใช้ที่ส่งกลับ
interface FollowUser {
  _id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

// อินเทอร์เฟซสำหรับการตอบกลับของ API
interface FollowListResponse {
  following: FollowUser[];
  currentPage: number;
  totalPages: number;
  totalFollowing: number;
}

// อินเทอร์เฟซสำหรับพารามิเตอร์ของ query
interface QueryParams {
  page?: string;
  limit?: string;
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
    const { searchParams } = new URL(req.url);
    const queryParams: QueryParams = Object.fromEntries(searchParams);

    // ตรวจสอบและแปลงพารามิเตอร์ pagination
    const page = parseInt(queryParams.page || "1", 10);
    const limit = parseInt(queryParams.limit || "10", 10);
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: "หน้าต้องเป็นตัวเลขมากกว่า 0" },
        { status: 400 }
      );
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "จำนวนต่อหน้าต้องอยู่ระหว่าง 1 ถึง 100" },
        { status: 400 }
      );
    }

    // ค้นหาผู้ใช้ในทั้งสองคอลเลกชัน
    const user =
      (await UserModel()
        .findOne({ username, isActive: true, isBanned: false })
        .lean()) ||
      (await SocialMediaUserModel()
        .findOne({ username, isActive: true, isBanned: false })
        .lean());

    if (!user) {
      return NextResponse.json(
        { error: "ไม่พบผู้ใช้" },
        { status: 404 }
      );
    }

    // คำนวณการข้ามข้อมูลสำหรับ pagination
    const skip = (page - 1) * limit;

    // ค้นหารายการผู้ที่กำลังติดตามพร้อม populate ข้อมูลผู้ใช้
    const following = await UserFollowModel()
      .find({ followerId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "following",
        select: "username profile.displayName profile.avatar",
      })
      .lean();

    // นับจำนวนผู้ที่กำลังติดตามทั้งหมด
    const totalFollowing = await UserFollowModel().countDocuments({
      followerId: user._id,
    });

    // แปลงข้อมูลผู้ที่กำลังติดตามให้ตรงกับ FollowUser
    const formattedFollowing: FollowUser[] = following
      .filter((follow) => follow.following) // กรองเฉพาะที่มีข้อมูลผู้ที่ถูกติดตาม
      .map((follow) => ({
        _id: follow.following!._id.toString(),
        username: follow.following!.username,
        profile: {
          displayName: follow.following!.profile?.displayName,
          avatar: follow.following!.profile?.avatar,
        },
      }));

    // คำนวณจำนวนหน้าทั้งหมด
    const totalPages = Math.ceil(totalFollowing / limit);

    // สร้างการตอบกลับ
    const response: FollowListResponse = {
      following: formattedFollowing,
      currentPage: page,
      totalPages,
      totalFollowing,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("ข้อผิดพลาดในการดึงรายการผู้ที่กำลังติดตาม:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}