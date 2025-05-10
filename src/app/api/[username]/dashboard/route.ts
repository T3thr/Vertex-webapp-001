// src/app/api/[username]/dashboard/route.ts
// API สำหรับดึงข้อมูลแดชบอร์ดของผู้ใช้ (นักเขียนและผู้อ่าน)
// รองรับการแสดงข้อมูลวิเคราะห์สำหรับนักเขียนและกิจกรรมล่าสุดสำหรับผู้อ่าน

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import UserModel, { IUser } from "@/backend/models/User";
import SocialMediaUserModel, { ISocialMediaUser } from "@/backend/models/SocialMediaUser";
import NovelModel, { INovel } from "@/backend/models/Novel";
import ActivityHistoryModel from "@/backend/models/ActivityHistory";
import dbConnect from "@/backend/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// อินเทอร์เฟซสำหรับข้อมูลวิเคราะห์นักเขียน
interface WriterAnalyticsData {
  overview: {
    totalNovelViews: number;
    totalCoinRevenue: number;
    totalDonations: number;
    totalFollowers: number;
    averageRating: number;
    lastCalculatedAt: string;
  };
  novelPerformance: Array<{
    novelId: string;
    title: string;
    totalViews: number;
    totalReads: number;
    totalLikes: number;
    totalCoinRevenue: number;
    totalDonations: number;
  }>;
}

// อินเทอร์เฟซสำหรับกิจกรรมผู้อ่าน
interface ReaderActivityData {
  lastNovelRead?: { title: string; novelSlug: string; _id: string };
  lastNovelLiked?: { title: string; novelSlug: string; _id: string };
  lastWriterFollowed?: { name: string; username: string; _id: string };
}

// อินเทอร์เฟซสำหรับการตอบกลับ API
interface DashboardResponse {
  writerAnalytics?: WriterAnalyticsData;
  readerActivity?: ReaderActivityData;
}

/**
 * GET: ดึงข้อมูลแดชบอร์ดสำหรับผู้ใช้ตาม username
 * @param req ข้อมูลคำขอจาก Next.js
 * @returns JSON response พร้อมข้อมูลแดชบอร์ด
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // ตรวจสอบการยืนยันตัวตน
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    // ดึง username จาก URL
    const { pathname } = req.nextUrl;
    const username = pathname.split("/")[3]; // /api/[username]/dashboard -> [username]
    if (!username) {
      return NextResponse.json({ error: "ต้องระบุ username" }, { status: 400 });
    }

    // ค้นหาผู้ใช้ใน User หรือ SocialMediaUser
    const user: IUser | ISocialMediaUser | null =
      (await UserModel().findOne({ username }).lean()) ||
      (await SocialMediaUserModel().findOne({ username }).lean());
    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // ตรวจสอบว่าเป็นผู้ใช้ที่เข้าสู่ระบบหรือมีสิทธิ์ Admin
    if (session.user.username !== username && user.role !== "Admin") {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    }

    const response: DashboardResponse = {};

    // สำหรับนักเขียน: ดึงข้อมูลวิเคราะห์
    if (user.role === "Writer") {
      // ดึงนิยายทั้งหมดของผู้ใช้
      const novels = await NovelModel()
        .find({ author: user._id, isDeleted: false })
        .select("title slug viewsCount totalReads likesCount stats averageRating")
        .lean() as Array<INovel>;

      // คำนวณข้อมูลภาพรวม
      const totalNovelViews = novels.reduce((sum, novel) => sum + (novel.viewsCount || 0), 0);
      const totalCoinRevenue = novels.reduce(
        (sum, novel) => sum + (novel.stats?.totalPurchasesAmount || 0),
        0
      );
      const totalDonations = novels.reduce(
        (sum, novel) => sum + (novel.stats?.totalDonationsAmount || 0),
        0
      );
      const totalFollowers = user.socialStats?.followersCount || 0;
      const averageRating =
        novels.length > 0
          ? novels.reduce((sum, novel) => sum + (novel.averageRating || 0), 0) / novels.length
          : 0;

      // สร้าง novelPerformance
      const novelPerformance = novels.map((novel) => ({
        novelId: novel._id.toString(),
        title: novel.title,
        totalViews: novel.viewsCount || 0,
        totalReads: novel.totalReads || 0,
        totalLikes: novel.likesCount || 0,
        totalCoinRevenue: novel.stats?.totalPurchasesAmount || 0,
        totalDonations: novel.stats?.totalDonationsAmount || 0,
      }));

      response.writerAnalytics = {
        overview: {
          totalNovelViews,
          totalCoinRevenue,
          totalDonations,
          totalFollowers,
          averageRating,
          lastCalculatedAt: new Date().toISOString(),
        },
        novelPerformance,
      };
    }

    // สำหรับผู้อ่านหรือนักเขียน: ดึงกิจกรรมล่าสุด
    if (user.role === "Reader" || user.role === "Writer") {
      // ดึงกิจกรรมล่าสุดจาก ActivityHistory
      const activities = await ActivityHistoryModel()
        .find({ user: user._id })
        .sort({ createdAt: -1 })
        .limit(50) // จำกัดจำนวนเพื่อประสิทธิภาพ
        .lean();

      const readerActivity: ReaderActivityData = {};

      // ค้นหา lastNovelRead
      const lastReadActivity = activities.find((act) => act.activityType === "EPISODE_READ");
      if (lastReadActivity && lastReadActivity.details?.novelId) {
        const novel = await NovelModel()
          .findById(lastReadActivity.details.novelId)
          .select("title slug")
          .lean();
        if (novel) {
          readerActivity.lastNovelRead = {
            _id: novel._id.toString(),
            title: novel.title,
            novelSlug: novel.slug,
          };
        }
      }

      // ค้นหา lastNovelLiked
      const lastLikedActivity = activities.find((act) => act.activityType === "NOVEL_LIKED");
      if (lastLikedActivity && lastLikedActivity.details?.novelId) {
        const novel = await NovelModel()
          .findById(lastLikedActivity.details.novelId)
          .select("title slug")
          .lean();
        if (novel) {
          readerActivity.lastNovelLiked = {
            _id: novel._id.toString(),
            title: novel.title,
            novelSlug: novel.slug,
          };
        }
      }

      // ค้นหา lastWriterFollowed
      const lastFollowedActivity = activities.find((act) => act.activityType === "USER_FOLLOWED");
      if (lastFollowedActivity && lastFollowedActivity.details?.targetUserId) {
        const followedUser =
          (await UserModel()
            .findById(lastFollowedActivity.details.targetUserId)
            .select("username profile.displayName")
            .lean()) ||
          (await SocialMediaUserModel()
            .findById(lastFollowedActivity.details.targetUserId)
            .select("username profile.displayName")
            .lean());
        if (followedUser) {
          readerActivity.lastWriterFollowed = {
            _id: followedUser._id.toString(),
            name: followedUser.profile?.displayName || followedUser.username,
            username: followedUser.username,
          };
        }
      }

      response.readerActivity = readerActivity;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ [API] ข้อผิดพลาดใน /api/[username]/dashboard:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}