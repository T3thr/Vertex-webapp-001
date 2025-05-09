// src/pages/api/users/[username]/activity-history.ts

import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import UserModel, { IUser } from '@/backend/models/User';
import ActivityHistoryModel, { IActivityHistory } from '@/backend/models/ActivityHistory';
import NovelModel, { INovel } from '@/backend/models/Novel';
import EpisodeModel, { IEpisode } from '@/backend/models/Episode';

// อินเทอร์เฟซสำหรับการตอบกลับของ API
interface ActivityHistoryResponse {
  activities: ActivityItem[];
  currentPage: number;
  totalPages: number;
  totalActivities: number;
}

// อินเทอร์เฟซสำหรับรายการกิจกรรมที่ส่งกลับ
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

// อินเทอร์เฟซสำหรับ details ที่มีการ populate
interface PopulatedDetails {
  novelId?: INovel;
  episodeId?: IEpisode;
  targetUserId?: IUser;
  commentId?: mongoose.Types.ObjectId;
  ratingId?: mongoose.Types.ObjectId;
  purchaseId?: mongoose.Types.ObjectId;
  donationId?: mongoose.Types.ObjectId;
  amountCoin?: number;
  commentText?: string;
  [key: string]: any;
}

// ตัวจัดการ API สำหรับดึงประวัติกิจกรรมของผู้ใช้
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ตรวจสอบว่าเป็นเมธอด GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'เฉพาะเมธอด GET เท่านั้นที่ได้รับอนุญาต' });
  }

  try {
    // เชื่อมต่อกับ MongoDB ถ้ายังไม่ได้เชื่อมต่อ
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || '');
    }

    const { username } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // ตรวจสอบความถูกต้องของพารามิเตอร์
    if (typeof username !== 'string' || page < 1 || limit < 1) {
      return res.status(400).json({ message: 'พารามิเตอร์ไม่ถูกต้อง' });
    }

    // ค้นหาผู้ใช้จาก username
    const user = await UserModel().findOne({ username, isDeleted: false, isActive: true, isBanned: false });
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }

    // คำนวณการข้ามข้อมูลสำหรับการแบ่งหน้า
    const skip = (page - 1) * limit;

    // สร้างเงื่อนไขการค้นหา
    const query = {
      user: user._id,
      activityType: {
        $in: [
          'EPISODE_READ',
          'COMMENT_CREATED',
          'RATING_GIVEN',
          'USER_FOLLOWED',
          'NOVEL_LIKED',
          'COIN_SPENT_EPISODE',
          'COIN_EARNED_WRITER_DONATION',
        ],
      },
    };

    // ดึงจำนวนกิจกรรมทั้งหมด
    const totalActivities = await ActivityHistoryModel().countDocuments(query);

    // ดึงกิจกรรมพร้อมการ populate ข้อมูลที่เกี่ยวข้อง
    const activities = await ActivityHistoryModel()
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate([
        { path: 'details.novelId', model: NovelModel(), select: 'title slug' },
        { path: 'details.episodeId', model: EpisodeModel(), select: 'title episodeNumber' },
        { path: 'details.targetUserId', model: UserModel(), select: 'username' },
      ])
      .lean() as Array<IActivityHistory & { details: PopulatedDetails }>;

    // แปลงข้อมูลกิจกรรมให้ตรงกับอินเทอร์เฟซที่คอมโพเนนต์ต้องการ
    const formattedActivities: ActivityItem[] = activities.map((activity) => {
      // แมปประเภทกิจกรรมให้ตรงกับที่คอมโพเนนต์ใช้
      let type: string;
      switch (activity.activityType) {
        case 'EPISODE_READ':
          type = 'READ_EPISODE';
          break;
        case 'COMMENT_CREATED':
          type = 'COMMENT';
          break;
        case 'RATING_GIVEN':
          type = 'RATING';
          break;
        case 'USER_FOLLOWED':
          type = 'FOLLOW_USER';
          break;
        case 'NOVEL_LIKED':
          type = 'LIKE_NOVEL';
          break;
        case 'COIN_SPENT_EPISODE':
          type = 'PURCHASE_EPISODE';
          break;
        case 'COIN_EARNED_WRITER_DONATION':
          type = 'RECEIVE_DONATION';
          break;
        default:
          type = activity.activityType;
      }

      // สร้างคำอธิบายสำหรับแต่ละประเภทกิจกรรม
      let description = '';
      switch (type) {
        case 'READ_EPISODE':
          description = 'อ่านตอนของนิยาย';
          break;
        case 'COMMENT':
          description = 'แสดงความคิดเห็น';
          break;
        case 'RATING':
          description = 'ให้คะแนนนิยาย';
          break;
        case 'FOLLOW_USER':
          description = 'ติดตามผู้ใช้';
          break;
        case 'LIKE_NOVEL':
          description = 'ชอบนิยาย';
          break;
        case 'PURCHASE_EPISODE':
          description = 'ซื้อตอนของนิยาย';
          break;
        case 'RECEIVE_DONATION':
          description = 'ได้รับการบริจาค';
          break;
        default:
          description = activity.message || `กิจกรรม: ${type}`;
      }

      return {
        _id: activity._id.toString(),
        userId: activity.user.toString(),
        type,
        description,
        novelId: activity.details?.novelId?._id?.toString(),
        episodeId: activity.details?.episodeId?._id?.toString(),
        commentId: activity.details?.commentId?.toString(),
        ratingId: activity.details?.ratingId?.toString(),
        followedUserId: activity.details?.targetUserId?._id?.toString(),
        likedNovelId: activity.details?.novelId?._id?.toString(),
        purchaseId: activity.details?.purchaseId?.toString(),
        donationId: activity.details?.donationId?.toString(),
        relatedUser: activity.details?.targetUserId?.username,
        relatedNovel: activity.details?.novelId?.title,
        relatedEpisode: activity.details?.episodeId?.title,
        coinAmount: activity.details?.amountCoin,
        content: activity.details?.commentText || activity.message,
        timestamp: activity.createdAt,
        novelTitle: activity.details?.novelId?.title,
        novelSlug: activity.details?.novelId?.slug,
        episodeTitle: activity.details?.episodeId?.title,
        episodeNumber: activity.details?.episodeId?.episodeNumber,
        targetUserName: activity.details?.targetUserId?.username,
        targetUserSlug: activity.details?.targetUserId?.username, // ใช้ username เป็น slug เพื่อความเรียบง่าย
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

    return res.status(200).json(response);
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงประวัติกิจกรรม:', error);
    return res.status(500).json({ message: 'ข้อผิดพลาดของเซิร์ฟเวอร์ภายใน' });
  }
}