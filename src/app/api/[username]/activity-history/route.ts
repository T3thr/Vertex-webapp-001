// src/app/api/users/[username]/activity-history/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose, { Types } from "mongoose";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";
import ActivityHistoryModel from "@/backend/models/ActivityHistory";
import NovelModel from "@/backend/models/Novel";
import EpisodeModel from "@/backend/models/Episode";
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // Adjust path to your NextAuth config

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

// อินเทอร์เฟซสำหรับผู้ใช้รวม (User หรือ SocialMediaUser)
interface CombinedUser {
  _id: Types.ObjectId;
  username: string;
  preferences: {
    privacy: {
      readingHistoryVisibility: "public" | "followersOnly" | "private";
    };
  };
}

// ฟังก์ชันช่วยเหลือเพื่อตรวจสอบว่าเป็นโปรไฟล์ของตัวเองหรือไม่
async function isOwnProfile(session: any, viewedUserId: Types.ObjectId): Promise<boolean> {
  if (!session?.user?.id) return false;
  return session.user.id === viewedUserId.toString();
}

// ฟังก์ชันช่วยเหลือเพื่อตรวจสอบการติดตาม
async function isFollowing(followerId: Types.ObjectId, followingId: Types.ObjectId): Promise<boolean> {
  const UserFollow = mongoose.model("UserFollow");
  const follow = await UserFollow.findOne({
    followerId: followerId,
    followingId: followingId,
    status: "active",
  });
  return !!follow;
}

// GET: ดึงประวัติกิจกรรมของผู้ใช้
export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  try {
    // เชื่อมต่อกับ MongoDB
    await dbConnect();

    // ดึง query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "หน้าหรือจำนวนต่อหน้าต้องมากกว่า 0" },
        { status: 400 }
      );
    }

    // ค้นหาผู้ใช้จาก username ใน User หรือ SocialMediaUser
    const user =
      (await UserModel().findOne({ username: params.username, isDeleted: false })) ||
      (await SocialMediaUserModel().findOne({ username: params.username, isDeleted: false }));

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // ดึงเซสชันของผู้ใช้ที่ร้องขอ (เพื่อตรวจสอบ isOwnProfile และการติดตาม)
    const session = await getServerSession(authOptions);
    const isOwn = await isOwnProfile(session, user._id);
    const requestingUserId = session?.user?.id ? new Types.ObjectId(session.user.id) : null;

    // กำหนดเงื่อนไขการมองเห็น
    let activityFilter: any = {
      user: user._id,
    };

    if (!isOwn) {
      const visibility = user.preferences.privacy.readingHistoryVisibility;
      if (visibility === "private") {
        return NextResponse.json(
          { error: "ประวัติการอ่านเป็นส่วนตัว" },
          { status: 403 }
        );
      }
      if (visibility === "followersOnly" && requestingUserId) {
        const isFollower = await isFollowing(requestingUserId, user._id);
        if (!isFollower) {
          return NextResponse.json(
            { error: "ต้องติดตามผู้ใช้เพื่อดูประวัติการอ่าน" },
            { status: 403 }
          );
        }
      }
      // จำกัดเฉพาะกิจกรรมที่เกี่ยวข้องกับเนื้อหาสาธารณะ
      activityFilter.activityType = {
        $in: [
          "EPISODE_READ",
          "COMMENT_CREATED",
          "RATING_GIVEN",
          "NOVEL_LIKED",
          "EPISODE_LIKED",
          "USER_FOLLOWED",
          "COIN_SPENT_EPISODE",
          "COIN_SPENT_DONATION_WRITER",
          "COIN_SPENT_DONATION_NOVEL",
          "COIN_SPENT_DONATION_CHARACTER",
          "COIN_EARNED_WRITER_DONATION",
        ],
      };
    }

    // คำนวณการแบ่งหน้า
    const skip = (page - 1) * limit;
    const totalActivities = await ActivityHistoryModel().countDocuments(activityFilter);
    const totalPages = Math.ceil(totalActivities / limit);

    // ดึงข้อมูลกิจกรรมพร้อม populate
    const activities = await ActivityHistoryModel()
      .find(activityFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .populate([
        {
          path: "details.novelId",
          model: NovelModel(),
          select: "title slug",
          match: { isDeleted: false },
        },
        {
          path: "details.episodeId",
          model: EpisodeModel(),
          select: "title episodeNumber",
          match: { isDeleted: false },
        },
        {
          path: "details.targetUserId",
          model: UserModel(),
          select: "username",
          match: { isDeleted: false },
        },
        {
          path: "details.targetUserId",
          model: SocialMediaUserModel(),
          select: "username",
          match: { isDeleted: false },
        },
      ]);

    // แปลงข้อมูลเป็น ActivityItem
    const formattedActivities: ActivityItem[] = activities.map((activity) => {
      const details = activity.details || {};
      const novel = details.novelId as any;
      const episode = details.episodeId as any;
      const targetUser = details.targetUserId as any;

      // แมป activityType จาก ActivityHistory ไปเป็น type ที่คอมโพเนนต์ใช้
      const typeMap: { [key: string]: string } = {
        EPISODE_READ: "READ_EPISODE",
        COMMENT_CREATED: "COMMENT",
        RATING_GIVEN: "RATING",
        USER_FOLLOWED: "FOLLOW_USER",
        NOVEL_LIKED: "LIKE_NOVEL",
        COIN_SPENT_EPISODE: "PURCHASE_EPISODE",
        COIN_EARNED_WRITER_DONATION: "RECEIVE_DONATION",
        COIN_SPENT_DONATION_WRITER: "RECEIVE_DONATION",
        COIN_SPENT_DONATION_NOVEL: "RECEIVE_DONATION",
        COIN_SPENT_DONATION_CHARACTER: "RECEIVE_DONATION",
      };

      // สร้างคำอธิบาย (ถ้าไม่มีใน message)
      let description = activity.message;
      if (!description) {
        switch (activity.activityType) {
          case "EPISODE_READ":
            description = `อ่านตอนของนิยาย`;
            break;
          case "COMMENT_CREATED":
            description = `แสดงความคิดเห็นในนิยาย`;
            break;
          case "RATING_GIVEN":
            description = `ให้คะแนนนิยาย`;
            break;
          case "USER_FOLLOWED":
            description = `ติดตามผู้ใช้`;
            break;
          case "NOVEL_LIKED":
            description = `ถูกใจนิยาย`;
            break;
          case "COIN_SPENT_EPISODE":
            description = `ซื้อตอนของนิยาย`;
            break;
          case "COIN_EARNED_WRITER_DONATION":
          case "COIN_SPENT_DONATION_WRITER":
          case "COIN_SPENT_DONATION_NOVEL":
          case "COIN_SPENT_DONATION_CHARACTER":
            description = `ได้รับการบริจาค`;
            break;
          default:
            description = `ทำกิจกรรม: ${activity.activityType}`;
        }
      }

      return {
        _id: activity._id.toString(),
        userId: activity.user.toString(),
        type: typeMap[activity.activityType] || activity.activityType,
        description,
        novelId: details.novelId?._id?.toString(),
        episodeId: details.episodeId?._id?.toString(),
        commentId: details.commentId?.toString(),
        ratingId: details.ratingId?.toString(),
        followedUserId: details.targetUserId?._id?.toString(),
        likedNovelId: details.novelId?._id?.toString(),
        purchaseId: details.purchaseId?.toString(),
        donationId: details.donationId?.toString(),
        relatedUser: targetUser?.username,
        relatedNovel: novel?.title,
        relatedEpisode: episode?.title,
        coinAmount: details.amountCoin,
        content: activity.message,
        timestamp: activity.createdAt,
        novelTitle: novel?.title,
        novelSlug: novel?.slug,
        episodeTitle: episode?.title,
        episodeNumber: episode?.episodeNumber,
        targetUserName: targetUser?.username,
        targetUserSlug: targetUser?.username,
      };
    });

    // สร้างการตอบกลับ
    const response: ActivityHistoryResponse = {
      activities: formattedActivities,
      currentPage: page,
      totalPages,
      totalActivities,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("ข้อผิดพลาดใน API /api/users/[username]/activity-history:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงประวัติกิจกรรม" },
      { status: 500 }
    );
  }
}