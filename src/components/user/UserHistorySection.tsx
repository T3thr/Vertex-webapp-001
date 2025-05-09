// src/app/api/users/[username]/activity-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";
import ActivityHistoryModel from "@/backend/models/ActivityHistory";
import { Types } from "mongoose";

// อินเทอร์เฟซสำหรับ ActivityItem ที่ส่งกลับไปยัง client
interface ActivityItem {
  _id: string;
  userId: string;
  type: string;
  description?: string;
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
  content?: string;
  timestamp: Date;
  novelTitle?: string;
  novelSlug?: string;
  episodeTitle?: string;
  episodeNumber?: number;
  targetUserName?: string;
  targetUserSlug?: string;
}

// อินเทอร์เฟซสำหรับการตอบกลับของ API
interface ActivityHistoryResponse {
  activities: ActivityItem[];
  currentPage: number;
  totalPages: number;
  totalActivities: number;
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

    // กำหนดประเภทของกิจกรรมที่ต้องการแสดง
    const supportedActivityTypes = [
      "EPISODE_READ",
      "COMMENT_CREATED",
      "RATING_GIVEN",
      "USER_FOLLOWED",
      "NOVEL_LIKED",
      "COIN_SPENT_EPISODE",
      "COIN_EARNED_WRITER_DONATION",
    ];

    // คำนวณการข้ามข้อมูลสำหรับ pagination
    const skip = (page - 1) * limit;

    // ค้นหากิจกรรมพร้อม populate ข้อมูลที่เกี่ยวข้อง
    const activities = await ActivityHistoryModel()
      .find({
        user: user._id,
        activityType: { $in: supportedActivityTypes },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate([
        {
          path: "novel",
          select: "title slug",
        },
        {
          path: "episode",
          select: "title episodeNumber",
        },
        {
          path: "targetUser",
          select: "username profile.displayName",
        },
      ])
      .lean();

    // นับจำนวนกิจกรรมทั้งหมด
    const totalActivities = await ActivityHistoryModel().countDocuments({
      user: user._id,
      activityType: { $in: supportedActivityTypes },
    });

    // แปลงข้อมูลกิจกรรมให้ตรงกับ ActivityItem
    const formattedActivities: ActivityItem[] = activities.map((activity) => {
      const details = activity.details || {};
      let description = activity.message || "";
      let content = "";

      // สร้างคำอธิบายตามประเภทกิจกรรม
      switch (activity.activityType) {
        case "EPISODE_READ":
          description = "อ่านตอนใหม่";
          break;
        case "COMMENT_CREATED":
          description = "แสดงความคิดเห็น";
          content = details.commentText || "";
          break;
        case "RATING_GIVEN":
          description = `ให้คะแนน ${details.ratingValue || "N/A"} ดาว`;
          break;
        case "USER_FOLLOWED":
          description = "ติดตามผู้ใช้";
          break;
        case "NOVEL_LIKED":
          description = "ถูกใจนิยาย";
          break;
        case "COIN_SPENT_EPISODE":
          description = "ซื้อตอน";
          break;
        case "COIN_EARNED_WRITER_DONATION":
          description = "ได้รับบริจาค";
          break;
        default:
          description = activity.activityType;
      }

      return {
        _id: activity._id.toString(),
        userId: activity.user.toString(),
        type: activity.activityType,
        description,
        novelId: details.novelId?.toString(),
        episodeId: details.episodeId?.toString(),
        commentId: details.commentId?.toString(),
        ratingId: details.ratingId?.toString(),
        followedUserId: details.targetUserId?.toString(),
        likedNovelId: details.novelId?.toString(),
        purchaseId: details.purchaseId?.toString(),
        donationId: details.donationId?.toString(),
        relatedUser: details.targetUserId?.toString(),
        relatedNovel: details.novelId?.toString(),
        relatedEpisode: details.episodeId?.toString(),
        coinAmount: details.amountCoin,
        content,
        timestamp: activity.createdAt,
        novelTitle: activity.novel?.title,
        novelSlug: activity.novel?.slug,
        episodeTitle: activity.episode?.title,
        episodeNumber: activity.episode?.episodeNumber,
        targetUserName: activity.targetUser?.profile?.displayName || activity.targetUser?.username,
        targetUserSlug: activity.targetUser?.username,
      };
    });

    // คำนวณจำนวนหน้าทั้งหมด
    const totalPages = Math.ceil(totalActivities / limit);

    // สร้างการตอบกลับ
    const response: ActivityHistoryResponse = {
      activities: formattedActivities,
      currentPage: page,
      totalPages,
      totalActivities,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("ข้อผิดพลาดในการดึงประวัติกิจกรรม:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}
