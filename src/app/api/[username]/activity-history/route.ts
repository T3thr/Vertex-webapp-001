// src/app/api/[username]/activity-history/route.ts
{/*
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUser } from "@/backend/models/User";
import SocialMediaUserModel, { ISocialMediaUser } from "@/backend/models/SocialMediaUser";
import ActivityHistoryModel, { IActivityHistory } from "@/backend/models/ActivityHistory";
import NovelModel, { INovel } from "@/backend/models/Novel";
import EpisodeModel, { IEpisode } from "@/backend/models/Episode";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// อินเทอร์เฟซสำหรับการตอบกลับ API
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

interface ActivityHistoryResponse {
  activities: ActivityItem[];
  currentPage: number;
  totalPages: number;
  totalActivities: number;
}

// ตัวเลือกการจัดเรียง
const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
} as const;

// ประเภทของการจัดเรียง
type SortOption = keyof typeof SORT_OPTIONS;

// ฟังก์ชันหลักสำหรับจัดการ GET request
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
): Promise<NextResponse> {
  try {
    // เชื่อมต่อกับ MongoDB
    await dbConnect();

    // ดึงพารามิเตอร์จาก URL
    const { username } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const sort = (searchParams.get("sort") as SortOption) || "newest";

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "หน้าหรือจำนวนต่อหน้าต้องมากกว่า 0" },
        { status: 400 }
      );
    }

    // ค้นหาผู้ใช้จาก username หรือ slug
    const user =
      (await UserModel()
        .findOne({ $or: [{ username }, { slug: username }], isActive: true, isDeleted: false })
        .lean()) ||
      (await SocialMediaUserModel()
        .findOne({ $or: [{ username }, { slug: username }], isActive: true, isDeleted: false })
        .lean());

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // ตรวจสอบ session เพื่อดูว่าเป็นเจ้าของโปรไฟล์หรือไม่
    const session = await getServerSession(authOptions);
    const isOwnProfile = session?.user?._id === user._id.toString();

    // สร้างเงื่อนไขการค้นหา
    const query: mongoose.FilterQuery<IActivityHistory> = {
      user: user._id,
    };

    // จำกัดประเภทกิจกรรมที่แสดงตามการมองเห็น
    const publicActivityTypes = [
      "EPISODE_READ",
      "COMMENT_CREATED",
      "RATING_GIVEN",
      "USER_FOLLOWED",
      "NOVEL_LIKED",
      "COIN_SPENT_EPISODE",
      "COIN_SPENT_DONATION_WRITER",
      "COIN_EARNED_WRITER_DONATION",
    ];

    if (!isOwnProfile) {
      query.activityType = { $in: publicActivityTypes };
    }

    // คำนวณข้อมูลการแบ่งหน้า
    const totalActivities = await ActivityHistoryModel().countDocuments(query);
    const totalPages = Math.ceil(totalActivities / limit);
    const skip = (page - 1) * limit;

    // ดึงข้อมูลกิจกรรม
    const activities = await ActivityHistoryModel()
      .find(query)
      .sort(SORT_OPTIONS[sort] || SORT_OPTIONS.newest)
      .skip(skip)
      .limit(limit)
      .lean();

    // เตรียมข้อมูลสำหรับการตอบกลับ
    const activityItems: ActivityItem[] = await Promise.all(
      activities.map(async (activity) => {
        const item: ActivityItem = {
          _id: activity._id.toString(),
          userId: activity.user.toString(),
          type: activity.activityType,
          content: activity.content,
          timestamp: activity.createdAt,
        };

        // เพิ่มข้อมูลที่เกี่ยวข้องจาก details
        if (activity.details) {
          if (activity.details.novelId) {
            item.novelId = activity.details.novelId.toString();
            item.novelSlug = activity.details.novelSlug;
            // ดึง novelTitle ถ้า novelSlug ไม่มี
            if (!item.novelSlug) {
              const novel = await NovelModel()
                .findById(activity.details.novelId)
                .select("title slug")
                .lean();
              if (novel) {
                item.novelTitle = novel.title;
                item.novelSlug = novel.slug;
              }
            } else {
              item.novelTitle = activity.details.novelTitle || "";
            }
          }
          if (activity.details.episodeId) {
            item.episodeId = activity.details.episodeId.toString();
            item.episodeNumber = activity.details.episodeNumber;
            if (!item.episodeNumber) {
              const episode = await EpisodeModel()
                .findById(activity.details.episodeId)
                .select("title episodeNumber")
                .lean();
              if (episode) {
                item.episodeTitle = episode.title;
                item.episodeNumber = episode.episodeNumber;
              }
            } else {
              item.episodeTitle = activity.details.episodeTitle || "";
            }
          }
          if (activity.details.commentId) {
            item.commentId = activity.details.commentId.toString();
          }
          if (activity.details.ratingId) {
            item.ratingId = activity.details.ratingId.toString();
          }
          if (activity.details.targetUserId) {
            item.followedUserId = activity.details.targetUserId.toString();
            item.targetUserSlug = activity.details.targetUserSlug;
            if (!item.targetUserSlug) {
              const targetUser =
                (await UserModel()
                  .findById(activity.details.targetUserId)
                  .select("username slug")
                  .lean()) ||
                (await SocialMediaUserModel()
                  .findById(activity.details.targetUserId)
                  .select("username slug")
                  .lean());
              if (targetUser) {
                item.targetUserName = targetUser.username;
                item.targetUserSlug = targetUser.slug;
              }
            } else {
              item.targetUserName = activity.details.targetUserName || "";
            }
          }
          if (activity.details.likedNovelId) {
            item.likedNovelId = activity.details.likedNovelId?.toString();
          }
          if (activity.details.purchaseId) {
            item.purchaseId = activity.details.purchaseId.toString();
          }
          if (activity.details.donationId) {
            item.donationId = activity.details.donationId.toString();
          }
          if (typeof activity.details.amountCoin === "number") {
            item.coinAmount = activity.details.amountCoin;
          }
        }

        return item;
      })
    );

    // สร้าง response
    const response: ActivityHistoryResponse = {
      activities: activityItems,
      currentPage: page,
      totalPages,
      totalActivities,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ ข้อผิดพลาดในการดึงประวัติกิจกรรม:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงประวัติกิจกรรม" },
      { status: 500 }
    );
  }
}

*/}