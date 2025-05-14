// src/app/api/[username]/writer-analytics/route.ts
// API สำหรับดึงข้อมูลวิเคราะห์โดยละเอียดสำหรับนักเขียน
// รองรับการดึงข้อมูลจากทั้ง User และ SocialMediaUser พร้อมประมวลผลสถิติ

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUser } from "@/backend/models/User";
import SocialMediaUserModel, { ISocialMediaUser } from "@/backend/models/SocialMediaUserhaha";
import WriterStatsModel from "@/backend/models/WriterStats";
import DonationModel from "@/backend/models/Donation";
import NovelModel from "@/backend/models/Novel";

// อินเทอร์เฟซสำหรับข้อมูลผู้ใช้ที่ใช้ใน API นี้
interface WriterUser {
  _id: mongoose.Types.ObjectId;
  writerStats?: mongoose.Types.ObjectId;
  socialStats?: {
    followersCount: number;
    followingCount: number;
    commentsMadeCount: number;
    likesGivenCount: number;
  };
}

// อินเทอร์เฟซสำหรับการตอบกลับ API
interface WriterAnalyticsResponse {
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
  socialStats: {
    followersCount: number;
    followingCount: number;
    commentsMadeCount: number;
    likesGivenCount: number;
  };
}

/**
 * GET: ดึงข้อมูลวิเคราะห์สำหรับนักเขียนตาม username
 * @param req ข้อมูลคำขอจาก Next.js
 * @returns JSON response พร้อมข้อมูลวิเคราะห์นักเขียน
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // ดึง username จาก URL
    const { pathname } = req.nextUrl;
    const username = pathname.split("/")[3]; // /api/[username]/writer-analytics -> [username]
    if (!username) {
      return NextResponse.json({ error: "ต้องระบุชื่อผู้ใช้" }, { status: 400 });
    }

    // ค้นหาผู้ใช้
    let user: WriterUser | null = await UserModel()
      .findOne({ username, role: "Writer", isActive: true, isBanned: false })
      .select("_id writerStats socialStats")
      .lean<WriterUser>();

    if (!user) {
      user = await SocialMediaUserModel()
        .findOne({ username, role: "Writer", isActive: true, isBanned: false })
        .select("_id writerStats socialStats")
        .lean<WriterUser>();
    }

    if (!user) {
      return NextResponse.json({ error: "ไม่พบนักเขียน" }, { status: 404 });
    }

    // ดึงข้อมูล WriterStats
    const writerStats = await WriterStatsModel()
      .findOne({ user: user._id })
      .select(
        "totalNovelViews_Lifetime totalCoinEarned_Lifetime totalFollowers_Lifetime averageRating_AllNovels novelPerformance monthlyCoinEarnings lastCalculatedAt"
      )
      .lean();

    if (!writerStats) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสถิตินักเขียน" }, { status: 404 });
    }

    // ดึงข้อมูลการบริจาค
    const donations = await DonationModel()
      .aggregate([
        {
          $match: {
            recipient: user._id,
            status: "completed",
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: "$novel",
            totalDonations: { $sum: "$netAmountToRecipient" },
          },
        },
      ])
      .exec();

    const donationMap = new Map(
      donations.map((d) => [d._id?.toString() || "general", d.totalDonations])
    );

    // ดึงข้อมูลนิยาย
    const novelIds = writerStats.novelPerformance.map((np) => new mongoose.Types.ObjectId(np.novelId));
    const novels = await NovelModel()
      .find({ _id: { $in: novelIds }, isDeleted: false })
      .select("title")
      .lean();
    const novelTitleMap = new Map(novels.map((novel) => [novel._id.toString(), novel.title]));

    // สร้างข้อมูลสำหรับการตอบกลับ
    const response: WriterAnalyticsResponse = {
      overview: {
        totalNovelViews: writerStats.totalNovelViews_Lifetime || 0,
        totalCoinRevenue: writerStats.totalCoinEarned_Lifetime || 0,
        totalDonations: donationMap.get("general") || 0,
        totalFollowers: writerStats.totalFollowers_Lifetime || 0,
        averageRating: writerStats.averageRating_AllNovels || 0,
        lastCalculatedAt: writerStats.lastCalculatedAt.toISOString(),
      },
      novelPerformance: writerStats.novelPerformance.map((np) => ({
        novelId: np.novelId.toString(),
        title: novelTitleMap.get(np.novelId.toString()) || "นิยายไม่มีชื่อ",
        totalViews: np.totalViews || 0,
        totalReads: np.totalReads || 0,
        totalLikes: np.totalLikes || 0,
        totalCoinRevenue: np.totalCoinRevenue || 0,
        totalDonations: donationMap.get(np.novelId.toString()) || 0,
      })),
      monthlyEarnings: writerStats.monthlyCoinEarnings?.map((me) => ({
        date: me.date.toISOString(),
        coinValue: me.value || 0,
        donationValue: 0, // รอการคำนวณจาก Donation ในอนาคต
      })) || [],
      socialStats: {
        followersCount: user.socialStats?.followersCount || writerStats.totalFollowers_Lifetime || 0,
        followingCount: user.socialStats?.followingCount || 0,
        commentsMadeCount: user.socialStats?.commentsMadeCount || 0,
        likesGivenCount: user.socialStats?.likesGivenCount || 0,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ [API] ข้อผิดพลาดใน /api/[username]/writer-analytics:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}