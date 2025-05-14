// src/app/api/[username]/follow/route.ts
// API สำหรับจัดการการติดตามและเลิกติดตามผู้ใช้
// รองรับการเพิ่มและลบความสัมพันธ์การติดตาม พร้อมบันทึกกิจกรรม

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUserhaha";
import UserFollowModel from "@/backend/models/UserFollow";
import ActivityHistoryModel from "@/backend/models/ActivityHistory";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// อินเทอร์เฟซสำหรับการตอบกลับ API
interface FollowResponse {
  message: string;
}

/**
 * POST: สร้างความสัมพันธ์การติดตามผู้ใช้ตาม username
 * @param req ข้อมูลคำขอจาก Next.js
 * @returns JSON response พร้อมข้อความยืนยันการติดตาม
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ตรวจสอบการยืนยันตัวตน
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "ต้องล็อกอินเพื่อดำเนินการนี้" }, { status: 401 });
    }

    // เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // ดึง username จาก URL
    const { pathname } = req.nextUrl;
    const username = pathname.split("/")[3]; // /api/[username]/follow -> [username]
    if (!username) {
      return NextResponse.json({ error: "ต้องระบุ username" }, { status: 400 });
    }

    // ค้นหาผู้ใช้ที่ต้องการติดตาม
    const targetUser =
      (await UserModel().findOne({ username, isActive: true, isBanned: false }).lean()) ||
      (await SocialMediaUserModel().findOne({ username, isActive: true, isBanned: false }).lean());
    if (!targetUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // ค้นหาผู้ใช้ที่ล็อกอิน
    const currentUser =
      (await UserModel().findOne({ _id: session.user.id, isActive: true, isBanned: false }).lean()) ||
      (await SocialMediaUserModel()
        .findOne({ _id: session.user.id, isActive: true, isBanned: false })
        .lean());
    if (!currentUser) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้ที่ล็อกอิน" }, { status: 404 });
    }

    // ตรวจสอบว่าเป็นการติดตามตัวเอง
    if (currentUser._id.toString() === targetUser._id.toString()) {
      return NextResponse.json({ error: "ไม่สามารถติดตามตัวเองได้" }, { status: 400 });
    }

    // ตรวจสอบว่ามีการติดตามอยู่แล้ว
    const existingFollow = await UserFollowModel()
      .findOne({
        followerId: currentUser._id,
        followingId: targetUser._id,
      })
      .lean();
    if (existingFollow) {
      return NextResponse.json({ error: "คุณติดตามผู้ใช้นี้อยู่แล้ว" }, { status: 400 });
    }

    // สร้างความสัมพันธ์การติดตาม
    await UserFollowModel().create({
      followerId: currentUser._id,
      followingId: targetUser._id,
    });

    // บันทึกกิจกรรม USER_FOLLOWED
    await ActivityHistoryModel().create({
      user: currentUser._id,
      activityType: "USER_FOLLOWED",
      message: `ติดตามผู้ใช้ @${targetUser.username}`,
      details: {
        targetUserId: targetUser._id,
      },
    });

    const response: FollowResponse = { message: `ติดตาม ${targetUser.username} สำเร็จ` };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ [API] ข้อผิดพลาดใน /api/[username]/follow (POST):", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: ลบความสัมพันธ์การติดตามผู้ใช้ตาม username
 * @param req ข้อมูลคำขอจาก Next.js
 * @returns JSON response พร้อมข้อความยืนยันการเลิกติดตาม
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    // ตรวจสอบการยืนยันตัวตน
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "ต้องล็อกอินเพื่อดำเนินการนี้" }, { status: 401 });
    }

    // เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // ดึง username จาก URL
    const { pathname } = req.nextUrl;
    const username = pathname.split("/")[3]; // /api/[username]/follow -> [username]
    if (!username) {
      return NextResponse.json({ error: "ต้องระบุ username" }, { status: 400 });
    }

    // ค้นหาผู้ใช้ที่ต้องการเลิกติดตาม
    const targetUser =
      (await UserModel().findOne({ username, isActive: true, isBanned: false }).lean()) ||
      (await SocialMediaUserModel().findOne({ username, isActive: true, isBanned: false }).lean());
    if (!targetUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // ค้นหาผู้ใช้ที่ล็อกอิน
    const currentUser =
      (await UserModel().findOne({ _id: session.user.id, isActive: true, isBanned: false }).lean()) ||
      (await SocialMediaUserModel()
        .findOne({ _id: session.user.id, isActive: true, isBanned: false })
        .lean());
    if (!currentUser) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้ที่ล็อกอิน" }, { status: 404 });
    }

    // ตรวจสอบว่ามีการติดตามอยู่
    const existingFollow = await UserFollowModel()
      .findOne({
        followerId: currentUser._id,
        followingId: targetUser._id,
      })
      .lean();
    if (!existingFollow) {
      return NextResponse.json({ error: "คุณไม่ได้ติดตามผู้ใช้นี้" }, { status: 400 });
    }

    // ลบความสัมพันธ์การติดตาม
    await UserFollowModel().deleteOne({
      followerId: currentUser._id,
      followingId: targetUser._id,
    });

    // บันทึกกิจกรรม USER_UNFOLLOWED
    await ActivityHistoryModel().create({
      user: currentUser._id,
      activityType: "USER_UNFOLLOWED",
      message: `เลิกติดตามผู้ใช้ @${targetUser.username}`,
      details: {
        targetUserId: targetUser._id,
      },
    });

    const response: FollowResponse = { message: `เลิกติดตาม ${targetUser.username} สำเร็จ` };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ [API] ข้อผิดพลาดใน /api/[username]/follow (DELETE):", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}