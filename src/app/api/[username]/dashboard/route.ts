// src/app/api/[username]/dashboard/route.ts
// API route สำหรับดึงข้อมูลแดชบอร์ดของผู้ใช้ตามบทบาท (Reader/Writer)

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import UserModel from "@/backend/models/User";
import WriterStatsModel from "@/backend/models/WriterStats";
import NovelModel from "@/backend/models/Novel";
import dbConnect from '@/backend/lib/mongodb';

// Interface สำหรับการตอบกลับของ API
interface DashboardResponse {
  writerStats?: {
    totalNovelViews: number;
    totalCoinRevenue: number;
    monthlyNewFollowers: number;
    lastCalculatedAt: string;
  };
  readerActivity?: {
    lastNovelRead?: { title: string; novelSlug: string; _id: string };
    lastNovelLiked?: { title: string; novelSlug: string; _id: string };
    lastWriterFollowed?: { name: string; username: string; _id: string };
  };
}

// ฟังก์ชันจัดการ GET request
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
): Promise<NextResponse<DashboardResponse | { error: string }>> {
  try {
    await dbConnect();

    const { username } = params;
    if (!username) {
      return NextResponse.json({ error: "ต้องระบุชื่อผู้ใช้" }, { status: 400 });
    }

    // ค้นหาผู้ใช้จาก username
    const user = await UserModel()
      .findOne({ username, isActive: true, isBanned: false })
      .select("role _id trackingStats socialStats");
    
    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    const response: DashboardResponse = {};

    // ดึงข้อมูลสำหรับนักเขียน
    if (user.role === "Writer") {
      const writerStats = await WriterStatsModel()
        .findOne({ user: user._id })
        .select("totalNovelViews_Lifetime totalCoinEarned_Lifetime monthlyNewFollowers lastCalculatedAt");

      if (writerStats) {
        const latestMonthlyFollowers = writerStats.monthlyNewFollowers?.slice(-1)[0]?.value || 0;
        response.writerStats = {
          totalNovelViews: writerStats.totalNovelViews_Lifetime || 0,
          totalCoinRevenue: writerStats.totalCoinEarned_Lifetime || 0,
          monthlyNewFollowers: latestMonthlyFollowers,
          lastCalculatedAt: writerStats.lastCalculatedAt.toISOString(),
        };
      }
    }

    // ดึงข้อมูลกิจกรรมผู้อ่าน
    if (user.role === "Reader" || user.role === "Writer") {
      response.readerActivity = {};

      // ดึงนิยายที่อ่านล่าสุด
      if (user.trackingStats?.lastNovelReadId) {
        const lastNovel = await NovelModel()
          .findOne({ _id: user.trackingStats.lastNovelReadId, isDeleted: false })
          .select("title slug");

        if (lastNovel) {
          response.readerActivity.lastNovelRead = {
            _id: lastNovel._id.toString(),
            title: lastNovel.title,
            novelSlug: lastNovel.slug,
          };
        }
      }

      // ดึงนิยายที่ถูกใจล่าสุด (สมมติมี Like model)
      const mockLastLikedNovel = await NovelModel()
        .findOne({ status: "published", isDeleted: false })
        .select("title slug")
        .sort({ createdAt: -1 });

      if (mockLastLikedNovel) {
        response.readerActivity.lastNovelLiked = {
          _id: mockLastLikedNovel._id.toString(),
          title: mockLastLikedNovel.title,
          novelSlug: mockLastLikedNovel.slug,
        };
      }

      // ดึงนักเขียนที่ติดตามล่าสุด (สมมติจาก userFollowing virtual)
      const lastFollowed = await UserModel()
        .findOne({ role: "Writer", isActive: true, isBanned: false })
        .select("username profile.displayName")
        .sort({ createdAt: -1 });

      if (lastFollowed) {
        response.readerActivity.lastWriterFollowed = {
          _id: lastFollowed._id.toString(),
          name: lastFollowed.profile.displayName || lastFollowed.username,
          username: lastFollowed.username,
        };
      }
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("ข้อผิดพลาดใน API /dashboard:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}