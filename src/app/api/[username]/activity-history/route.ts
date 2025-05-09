// src/app/api/[username]/activity-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose, { Types } from 'mongoose';
import dbConnect from '@/backend/lib/mongodb';
import UserModel from '@/backend/models/User';
import SocialMediaUserModel from '@/backend/models/SocialMediaUser';
import ActivityHistoryModel from '@/backend/models/ActivityHistory';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

// อินเทอร์เฟซสำหรับ response
interface ActivityHistoryResponse {
  activities: ActivityItem[];
  currentPage: number;
  totalPages: number;
  totalActivities: number;
}

// อินเทอร์เฟซสำหรับ ActivityItem
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

// อินเทอร์เฟซสำหรับ populated documents
interface PopulatedNovel {
  _id: Types.ObjectId;
  title: string;
  slug: string;
}

interface PopulatedEpisode {
  _id: Types.ObjectId;
  title: string;
  episodeNumber: number;
}

interface PopulatedUser {
  _id: Types.ObjectId;
  username: string;
  profile?: { displayName?: string };
}

// กิจกรรมที่ต้องการแสดงในประวัติ
const ALLOWED_ACTIVITY_TYPES = [
  'EPISODE_READ',
  'COMMENT_CREATED',
  'RATING_GIVEN',
  'USER_FOLLOWED',
  'NOVEL_LIKED',
  'COIN_SPENT_EPISODE',
  'COIN_SPENT_DONATION_WRITER',
  'COIN_EARNED_WRITER_DONATION',
];

// ฟังก์ชันหลักสำหรับ GET request
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
): Promise<NextResponse<ActivityHistoryResponse | { error: string }>> {
  try {
    // แก้ไข params จาก Promise
    const params = await context.params;
    const { username } = params;

    // ตรวจสอบ username
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'ต้องระบุชื่อผู้ใช้ที่ถูกต้อง' },
        { status: 400 }
      );
    }

    // เชื่อมต่อ MongoDB
    await dbConnect();

    // ดึง session และตรวจสอบผู้ใช้
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id
      ? new mongoose.Types.ObjectId(session.user.id)
      : null;

    // ค้นหาผู้ใช้จาก User หรือ SocialMediaUser
    let viewedUser = await UserModel.findOne({ username, isDeleted: false })
      .lean()
      .exec();
    if (!viewedUser) {
      viewedUser = await SocialMediaUserModel.findOne({
        username,
        isDeleted: false,
      })
        .lean()
        .exec();
    }
    if (!viewedUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    const isOwnProfile = currentUserId && currentUserId.equals(viewedUser._id);
    const profileVisibility = viewedUser.preferences?.privacy?.profileVisibility;
    if (!isOwnProfile) {
      if (profileVisibility === 'private') {
        return NextResponse.json(
          { error: 'โปรไฟล์นี้เป็นส่วนตัว' },
          { status: 403 }
        );
      }
      if (profileVisibility === 'followersOnly' && currentUserId) {
        const isFollower = await mongoose.model('UserFollow').findOne({
          followerId: currentUserId,
          followingId: viewedUser._id,
          status: 'active',
        });
        if (!isFollower) {
          return NextResponse.json(
            { error: 'ต้องติดตามผู้ใช้เพื่อดูประวัติกิจกรรม' },
            { status: 403 }
          );
        }
      }
    }

    // ดึง query parameters
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // ตรวจสอบ page และ limit
    if (page < 1 || limit < 1 || isNaN(page) || isNaN(limit)) {
      return NextResponse.json(
        { error: 'page และ limit ต้องเป็นจำนวนเต็มบวก' },
        { status: 400 }
      );
    }

    // จำกัด limit เพื่อป้องกันการโหลดข้อมูลมากเกินไป
    const maxLimit = Math.min(limit, 50);
    const skip = (page - 1) * maxLimit;

    // กำหนดประเภทกิจกรรมที่แสดง
    let activityFilter: string[] = ALLOWED_ACTIVITY_TYPES;
    if (!isOwnProfile) {
      activityFilter = activityFilter.filter(
        (type) =>
          !['COIN_SPENT_DONATION_WRITER', 'COIN_EARNED_WRITER_DONATION'].includes(
            type
          )
      );
    }

    // ดึงประวัติกิจกรรม
    const activities = await ActivityHistoryModel.find({
      user: viewedUser._id,
      activityType: { $in: activityFilter },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(maxLimit)
      .populate<{
        details: {
          novelId?: PopulatedNovel;
          episodeId?: PopulatedEpisode;
          targetUserId?: PopulatedUser;
        };
      }>([
        {
          path: 'details.novelId',
          model: NovelModel,
          select: 'title slug',
        },
        {
          path: 'details.episodeId',
          model: EpisodeModel,
          select: 'title episodeNumber',
        },
        {
          path: 'details.targetUserId',
          model: UserModel,
          select: 'username profile.displayName',
          match: { isDeleted: false },
        },
        {
          path: 'details.targetUserId',
          model: SocialMediaUserModel,
          select: 'username profile.displayName',
          match: { isDeleted: false },
        },
      ])
      .lean()
      .exec();

    // นับจำนวนกิจกรรมทั้งหมด
    const totalActivities = await ActivityHistoryModel.countDocuments({
      user: viewedUser._id,
      activityType: { $in: activityFilter },
    }).exec();
    const totalPages = Math.ceil(totalActivities / maxLimit);

    // แปลงข้อมูลให้ตรงกับ ActivityItem
    const formattedActivities: ActivityItem[] = activities.map((activity) => {
      const novel = activity.details.novelId;
      const episode = activity.details.episodeId;
      const targetUser = activity.details.targetUserId;

      return {
        _id: activity._id.toString(),
        userId: activity.user.toString(),
        type: activity.activityType,
        content: activity.content,
        novelId: activity.details.novelId?._id.toString(),
        episodeId: activity.details.episodeId?._id.toString(),
        commentId: activity.details.commentId?.toString(),
        ratingId: activity.details.ratingId?.toString(),
        followedUserId: activity.details.targetUserId?._id.toString(),
        likedNovelId:
          activity.activityType === 'NOVEL_LIKED'
            ? activity.details.novelId?._id.toString()
            : undefined,
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
        targetUserName:
          targetUser?.profile?.displayName || targetUser?.username,
        targetUserSlug: targetUser?.username,
      };
    });

    // สร้าง response
    const response: ActivityHistoryResponse = {
      activities: formattedActivities,
      currentPage: page,
      totalPages,
      totalActivities,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error(
      `[API Error] /api/${(await context.params).username}/activity-history:`,
      error
    );
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}