// src/app/api/[username]/dashboard/route.ts
// API route สำหรับดึงข้อมูลแดชบอร์ดของผู้ใช้ตามบทบาท (Reader/Writer)

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";
import ActivityHistoryModel from "@/backend/models/ActivityHistory";
import NovelModel from "@/backend/models/Novel";
import UserFollowModel from "@/backend/models/UserFollow";
import { Types } from "mongoose";

// อินเทอร์เฟซสำหรับข้อมูลที่ส่งกลับ
interface ReaderActivityResponse {
  readerActivity: {
    lastNovelRead?: { title: string; novelSlug: string; _id: string };
    lastNovelLiked?: { title: string; novelSlug: string; _id: string };
    lastWriterFollowed?: { name: string; username: string; _id: string };
  };
}

// ฟังก์ชัน GET สำหรับดึงข้อมูลแดชบอร์ดผู้อ่าน
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
): Promise<NextResponse> {
  try {
    await dbConnect();

    const { username } = params;

    // ค้นหาผู้ใช้จาก User หรือ SocialMediaUser
    let user = await UserModel().findOne({ username }).lean();
    if (!user) {
      user = await SocialMediaUserModel().findOne({ username }).lean();
    }

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // ดึงข้อมูลกิจกรรมล่าสุดจาก ActivityHistory
    const activities = await ActivityHistoryModel()
      .find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(100) // จำกัดจำนวนเพื่อประสิทธิภาพ
      .lean();

    const response: ReaderActivityResponse = { readerActivity: {} };

    // ดึงข้อมูล lastNovelRead
    const lastEpisodeRead = activities.find(
      (activity) => activity.activityType === "EPISODE_READ" && activity.details?.novelId
    );
    if (lastEpisodeRead?.details?.novelId) {
      const novel = await NovelModel()
        .findById(lastEpisodeRead.details.novelId)
        .select("title slug")
        .lean();
      if (novel) {
        response.readerActivity.lastNovelRead = {
          title: novel.title,
          novelSlug: novel.slug,
          _id: novel._id.toString(),
        };
      }
    }

    // ดึงข้อมูล lastNovelLiked
    const lastNovelLiked = activities.find(
      (activity) => activity.activityType === "NOVEL_LIKED" && activity.details?.novelId
    );
    if (lastNovelLiked?.details?.novelId) {
      const novel = await NovelModel()
        .findById(lastNovelLiked.details.novelId)
        .select("title slug")
        .lean();
      if (novel) {
        response.readerActivity.lastNovelLiked = {
          title: novel.title,
          novelSlug: novel.slug,
          _id: novel._id.toString(),
        };
      }
    }

    // ดึงข้อมูล lastWriterFollowed
    const lastUserFollowed = activities.find(
      (activity) => activity.activityType === "USER_FOLLOWED" && activity.details?.targetUserId
    );
    if (lastUserFollowed?.details?.targetUserId) {
      const followedUser = await UserModel()
        .findById(lastUserFollowed.details.targetUserId)
        .select("username profile.displayName")
        .lean() ||
        await SocialMediaUserModel()
          .findById(lastUserFollowed.details.targetUserId)
          .select("username profile.displayName")
          .lean();
      if (followedUser) {
        response.readerActivity.lastWriterFollowed = {
          name: followedUser.profile?.displayName || followedUser.username,
          username: followedUser.username,
          _id: followedUser._id.toString(),
        };
      }
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate" },
    });
  } catch (error) {
    console.error("❌ [API] ข้อผิดพลาดใน /api/[username]/dashboard:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}