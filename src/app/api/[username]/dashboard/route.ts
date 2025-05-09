// src/app/api/[username]/dashboard/route.ts
// API route สำหรับดึงข้อมูลแดชบอร์ดของผู้ใช้ตามบทบาท (Reader/Writer)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";
import NovelModel from "@/backend/models/Novel";
import ActivityHistoryModel from "@/backend/models/ActivityHistory";
import DonationModel from "@/backend/models/Donation";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// Interface สำหรับการตอบกลับ API
interface DashboardResponse {
  readerActivity?: {
    lastNovelRead?: { title: string; novelSlug: string; _id: string };
    lastNovelLiked?: { title: string; novelSlug: string; _id: string };
    lastWriterFollowed?: { name: string; username: string; _id: string };
  };
  writerAnalytics?: {
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
    monthlyEarnings: Array<{
      date: string;
      coinValue: number;
      donationValue: number;
    }>;
  };
}

// ฟังก์ชัน GET สำหรับดึงข้อมูลแดชบอร์ดของผู้ใช้
export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
): Promise<NextResponse> {
  try {
    // เชื่อมต่อกับ MongoDB
    await dbConnect();

    // ตรวจสอบการยืนยันตัวตน
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const { username } = params;

    // ค้นหาผู้ใช้จาก User หรือ SocialMediaUser
    const user = await UserModel().findOne({ username, isActive: true, isDeleted: false })
      .lean()
      .exec();
    const socialMediaUser = !user
      ? await SocialMediaUserModel()
          .findOne({ username, isActive: true, isDeleted: false })
          .lean()
          .exec()
      : null;

    if (!user && !socialMediaUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    const currentUser = user || socialMediaUser;
    const userId = new mongoose.Types.ObjectId(currentUser._id);

    // ตรวจสอบว่าเป็นเจ้าของบัญชีหรือมีสิทธิ์แอดมิน
    if (
      session.user.username !== username &&
      (!session.user.role || session.user.role !== "Admin")
    ) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    }

    const response: DashboardResponse = {};

    // ดึงข้อมูลกิจกรรมสำหรับ Reader และ Writer
    if (currentUser.role === "Reader" || currentUser.role === "Writer") {
      const activities = await ActivityHistoryModel()
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate([
          { path: "details.novelId", select: "title slug" },
          { path: "details.targetUserId", select: "username profile.displayName" },
        ])
        .lean()
        .exec();

      response.readerActivity = {
        lastNovelRead: null,
        lastNovelLiked: null,
        lastWriterFollowed: null,
      };

      for (const activity of activities) {
        if (
          activity.activityType === "EPISODE_READ" &&
          activity.details?.novelId &&
          !response.readerActivity.lastNovelRead
        ) {
          response.readerActivity.lastNovelRead = {
            _id: activity.details.novelId._id.toString(),
            title: activity.details.novelId.title,
            novelSlug: activity.details.novelId.slug,
          };
        }
        if (
          activity.activityType === "NOVEL_LIKED" &&
          activity.details?.novelId &&
          !response.readerActivity.lastNovelLiked
        ) {
          response.readerActivity.lastNovelLiked = {
            _id: activity.details.novelId._id.toString(),
            title: activity.details.novelId.title,
            novelSlug: activity.details.novelId.slug,
          };
        }
        if (
          activity.activityType === "USER_FOLLOWED" &&
          activity.details?.targetUserId &&
          !response.readerActivity.lastWriterFollowed
        ) {
          response.readerActivity.lastWriterFollowed = {
            _id: activity.details.targetUserId._id.toString(),
            name: activity.details.targetUserId.profile?.displayName || activity.details.targetUserId.username,
            username: activity.details.targetUserId.username,
          };
        }
        if (
          response.readerActivity.lastNovelRead &&
          response.readerActivity.lastNovelLiked &&
          response.readerActivity.lastWriterFollowed
        ) {
          break;
        }
      }
    }

    // ดึงข้อมูลวิเคราะห์สำหรับ Writer
    if (currentUser.role === "Writer") {
      // ดึงข้อมูลนิยายของนักเขียน
      const novels = await NovelModel()
        .find({ author: userId, isDeleted: false })
        .select("title slug viewsCount totalReads likesCount totalCoinRevenue stats.totalDonationsAmount averageRating")
        .lean()
        .exec();

      // คำนวณภาพรวม
      const overview = {
        totalNovelViews: novels.reduce((sum, novel) => sum + (novel.viewsCount || 0), 0),
        totalCoinRevenue: novels.reduce((sum, novel) => sum + (novel.totalCoinRevenue || 0), 0),
        totalDonations: novels.reduce((sum, novel) => sum + (novel.stats?.totalDonationsAmount || 0), 0),
        totalFollowers: currentUser.socialStats?.followersCount || 0,
        averageRating:
          novels.length > 0
            ? novels.reduce((sum, novel) => sum + (novel.averageRating || 0), 0) / novels.length
            : 0,
        lastCalculatedAt: new Date().toISOString(),
      };

      // ประสิทธิภาพนิยาย
      const novelPerformance = novels.map((novel) => ({
        novelId: novel._id.toString(),
        title: novel.title,
        totalViews: novel.viewsCount || 0,
        totalReads: novel.totalReads || 0,
        totalLikes: novel.likesCount || 0,
        totalCoinRevenue: novel.totalCoinRevenue || 0,
        totalDonations: novel.stats?.totalDonationsAmount || 0,
      }));

      // รายได้รายเดือน
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12); // ย้อนหลัง 12 เดือน
      const monthlyEarnings = await Promise.all(
        Array.from({ length: 12 }, (_, i) => {
          const monthStart = new Date(startDate);
          monthStart.setMonth(startDate.getMonth() + i);
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthStart.getMonth() + 1);

          return (async () => {
            // รายได้จากเหรียญ (การซื้อตอน)
            const coinRevenue = await ActivityHistoryModel()
              .aggregate([
                {
                  $match: {
                    user: userId,
                    activityType: "COIN_EARNED_WRITER_SALE",
                    createdAt: { $gte: monthStart, $lt: monthEnd },
                  },
                },
                { $group: { _id: null, total: { $sum: "$details.amountCoin" } } },
              ])
              .exec();

            // รายได้จากการบริจาค
            const donationRevenue = await DonationModel()
              .aggregate([
                {
                  $match: {
                    recipientUser: userId,
                    status: "completed",
                    createdAt: { $gte: monthStart, $lt: monthEnd },
                  },
                },
                { $group: { _id: null, total: { $sum: "$amount" } } },
              ])
              .exec();

            return {
              date: monthStart.toISOString(),
              coinValue: coinRevenue[0]?.total || 0,
              donationValue: donationRevenue[0]?.total || 0,
            };
          })();
        })
      );

      response.writerAnalytics = {
        overview,
        novelPerformance,
        monthlyEarnings,
      };
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ [API] ข้อผิดพลาดใน /api/[username]/dashboard:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลแดชบอร์ด" },
      { status: 500 }
    );
  }
}