// src/app/api/[username]/activity-history/route.ts
// API สำหรับดึงประวัติกิจกรรมของผู้ใช้
// รองรับการแบ่งหน้าและการกรองตามการตั้งค่าความเป็นส่วนตัว

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose, { Types } from "mongoose";
import UserModel, { IUser } from "@/backend/models/User";
import SocialMediaUserModel, { ISocialMediaUser } from "@/backend/models/SocialMediaUser";
import ActivityHistoryModel, { IActivityHistory } from "@/backend/models/ActivityHistory";
import NovelModel, { INovel } from "@/backend/models/Novel";
import EpisodeModel, { IEpisode } from "@/backend/models/Episode";
import dbConnect from "@/backend/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// อินเทอร์เฟซสำหรับข้อมูลกิจกรรม
interface ActivityItem {
  _id: string;
  userId: string;
  type: string;
  content?: string;
  novelId?: string;
  episodeId?: string;
  commentId?: string;
  ratingId?: string;
  followedUserId?: string;
  likedNovelId?: string;
  purchaseId?: string;
  donationId?: string;
  relatedUser?: string;
  relatedNovel?: string;
  relatedEpisode?: string;
  coinAmount?: number;
  timestamp: Date;
  novelTitle?: string;
  novelSlug?: string;
  episodeTitle?: string;
  episodeNumber?: number;
  targetUserName?: string;
  targetUserSlug?: string;
}

// อินเทอร์เฟซสำหรับการตอบกลับ API
interface ActivityHistoryResponse {
  activities: ActivityItem[];
  currentPage: number;
  totalPages: number;
  totalActivities: number;
}

// รายการประเภทกิจกรรมที่อนุญาต
const ALLOWED_ACTIVITY_TYPES = [
  "EPISODE_READ",
  "COMMENT_CREATED",
  "RATING_GIVEN",
  "USER_FOLLOWED",
  "NOVEL_LIKED",
  "COIN_SPENT_EPISODE",
  "COIN_SPENT_DONATION_WRITER",
  "COIN_EARNED_WRITER_DONATION",
];

/**
 * GET: ดึงประวัติกิจกรรมของผู้ใช้ตาม username
 * @param req ข้อมูลคำขอจาก Next.js
 * @returns JSON response พร้อมรายการกิจกรรมและข้อมูลการแบ่งหน้า
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // ดึง username จาก URL
    const { pathname } = req.nextUrl;
    const username = pathname.split("/")[3]; // /api/[username]/activity-history -> [username]
    if (!username) {
      return NextResponse.json({ error: "ต้องระบุชื่อผู้ใช้" }, { status: 400 });
    }

    // ดึง session เพื่อตรวจสอบการยืนยันตัวตน
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id
      ? new mongoose.Types.ObjectId(session.user.id)
      : null;

    // ค้นหาผู้ใช้
    let viewedUser: IUser | ISocialMediaUser | null = await UserModel()
      .findOne({ username, isDeleted: false })
      .exec();
    if (!viewedUser) {
      viewedUser = await SocialMediaUserModel()
        .findOne({ username, isDeleted: false })
        .exec();
    }
    if (!viewedUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    const isOwnProfile = currentUserId && currentUserId.equals(viewedUser._id);
    const profileVisibility = viewedUser.preferences.privacy.profileVisibility || "public";
    if (!isOwnProfile) {
      if (profileVisibility === "private") {
        return NextResponse.json({ error: "โปรไฟล์นี้เป็นส่วนตัว" }, { status: 403 });
      }
      if (profileVisibility === "followersOnly" && currentUserId) {
        const isFollower = await mongoose.model("UserFollow").findOne({
          followerId: currentUserId,
          followingId: viewedUser._id,
          status: "active",
        });
        if (!isFollower) {
          return NextResponse.json(
            { error: "ต้องติดตามผู้ใช้เพื่อดูประวัติกิจกรรม" },
            { status: 403 }
          );
        }
      }
    }

    // ดึง query parameters
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    if (page < 1 || limit < 1) {
      return NextResponse.json({ error: "page และ limit ต้องมากกว่า 0" }, { status: 400 });
    }

    // กำหนดประเภทกิจกรรมที่แสดง
    const activityFilter = isOwnProfile
      ? ALLOWED_ACTIVITY_TYPES
      : ALLOWED_ACTIVITY_TYPES.filter(
          (type) => !["COIN_SPENT_DONATION_WRITER", "COIN_EARNED_WRITER_DONATION"].includes(type)
        );

    // คำนวณการข้ามข้อมูลสำหรับการแบ่งหน้า
    const skip = (page - 1) * limit;

    // ดึงประวัติกิจกรรม
    const activities = await ActivityHistoryModel()
      .find({
        user: viewedUser._id,
        activityType: { $in: activityFilter },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate<{
        details: {
          novelId?: INovel;
          episodeId?: IEpisode;
          targetUserId?: IUser | ISocialMediaUser;
        };
      }>([
        {
          path: "details.novelId",
          model: NovelModel(),
          select: "title slug",
        },
        {
          path: "details.episodeId",
          model: EpisodeModel(),
          select: "title episodeNumber",
        },
        {
          path: "details.targetUserId",
          model: UserModel(),
          select: "username profile.displayName",
          match: { isDeleted: false },
        },
        {
          path: "details.targetUserId",
          model: SocialMediaUserModel(),
          select: "username profile.displayName",
          match: { isDeleted: false },
        },
      ])
      .exec();

    // นับจำนวนกิจกรรมทั้งหมด
    const totalActivities = await ActivityHistoryModel().countDocuments({
      user: viewedUser._id,
      activityType: { $in: activityFilter },
    });
    const totalPages = Math.ceil(totalActivities / limit);

    // แปลงข้อมูลกิจกรรม
    const formattedActivities: ActivityItem[] = activities.map((activity) => {
      const novel = activity.details.novelId;
      const episode = activity.details.episodeId;
      const targetUser = activity.details.targetUserId;

      return {
        _id: activity._id.toString(),
        userId: activity.user.toString(),
        type: activity.activityType,
        content: activity.content,
        novelId: novel?._id.toString(),
        episodeId: episode?._id.toString(),
        commentId: activity.details.commentId?.toString(),
        ratingId: activity.details.ratingId?.toString(),
        followedUserId: targetUser?._id.toString(),
        likedNovelId: activity.activityType === "NOVEL_LIKED" ? novel?._id.toString() : undefined,
        purchaseId: activity.details.purchaseId?.toString(),
        donationId: activity.details.donationId?.toString(),
        relatedUser: targetUser?._id.toString(),
        relatedNovel: novel?._id.toString(),
        relatedEpisode: episode?._id.toString(),
        coinAmount: activity.details.amountCoin,
        timestamp: activity.createdAt,
        novelTitle: novel?.title,
        novelSlug: novel?.slug,
        episodeTitle: episode?.title,
        episodeNumber: episode?.episodeNumber,
        targetUserName: targetUser?.profile?.displayName || targetUser?.username,
        targetUserSlug: targetUser?.username,
      };
    });

    // สร้างข้อมูลสำหรับการตอบกลับ
    const response: ActivityHistoryResponse = {
      activities: formattedActivities,
      currentPage: page,
      totalPages,
      totalActivities,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ [API] ข้อผิดพลาดใน /api/[username]/activity-history:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}