// src/backend/services/EpisodeAccessService.ts
// Service สำหรับตรวจสอบสิทธิ์การเข้าถึงตอนนิยาย

import mongoose from 'mongoose';
import { Types } from 'mongoose';
import EpisodeModel, { IEpisode, EpisodeAccessType, EpisodeStatus } from '../models/Episode';
import UserLibraryItemModel from '../models/UserLibraryItem';
import NovelModel from '../models/Novel';
import UserModel from '../models/User';

/**
 * ผลลัพธ์การตรวจสอบสิทธิ์การเข้าถึงตอนนิยาย
 */
export interface EpisodeAccessResult {
  canAccess: boolean;
  reason?: string;
  episodeData?: {
    id: string;
    title: string;
    accessType: EpisodeAccessType;
    status: EpisodeStatus;
    price?: number;
    isOwned?: boolean;
  };
  novelData?: {
    id: string;
    title: string;
    slug: string;
    authorId: string;
  };
}

/**
 * Service สำหรับตรวจสอบสิทธิ์การเข้าถึงตอนนิยาย
 */
export class EpisodeAccessService {
  /**
   * ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงตอนนิยายหรือไม่
   * @param userId ID ของผู้ใช้ (ถ้าไม่มี จะตรวจสอบเฉพาะตอนที่เป็นแบบฟรี)
   * @param episodeId ID ของตอนที่ต้องการเข้าถึง
   * @returns ผลลัพธ์การตรวจสอบสิทธิ์
   */
  public static async checkAccess(userId: string | null, episodeId: string): Promise<EpisodeAccessResult> {
    try {
      // 1. ตรวจสอบว่า episodeId ถูกต้องหรือไม่
      if (!mongoose.Types.ObjectId.isValid(episodeId)) {
        return { canAccess: false, reason: 'รหัสตอนไม่ถูกต้อง' };
      }

      // 2. ดึงข้อมูลตอนนิยาย
      const episode = await EpisodeModel.findById(episodeId)
        .populate('novelId', 'title slug author')
        .lean();

      if (!episode) {
        return { canAccess: false, reason: 'ไม่พบตอนนิยายที่ระบุ' };
      }

      // 3. ตรวจสอบสถานะของตอน
      if (episode.status !== EpisodeStatus.PUBLISHED) {
        return {
          canAccess: false,
          reason: 'ตอนนี้ยังไม่เผยแพร่',
          episodeData: {
            id: episode._id.toString(),
            title: episode.title,
            accessType: episode.accessType,
            status: episode.status
          }
        };
      }

      // 4. สร้างข้อมูลพื้นฐานสำหรับการตอบกลับ
      const novelData = episode.novelId as any; // เนื่องจาก populate จึงเป็น object
      const result: EpisodeAccessResult = {
        canAccess: false,
        episodeData: {
          id: episode._id.toString(),
          title: episode.title,
          accessType: episode.accessType,
          status: episode.status
        },
        novelData: {
          id: novelData._id.toString(),
          title: novelData.title,
          slug: novelData.slug,
          authorId: novelData.author.toString()
        }
      };

      // 5. ตรวจสอบตามประเภทการเข้าถึง
      // 5.1 ถ้าเป็นตอนฟรี ให้เข้าถึงได้เลย
      if (episode.accessType === EpisodeAccessType.FREE) {
        result.canAccess = true;
        return result;
      }

      // 5.2 ถ้าไม่มี userId (ไม่ได้ล็อกอิน) และตอนไม่ใช่ฟรี
      if (!userId) {
        result.reason = 'กรุณาเข้าสู่ระบบเพื่อเข้าถึงตอนนี้';
        return result;
      }

      // 5.3 ตรวจสอบว่าผู้ใช้เป็นผู้เขียนหรือไม่
      if (novelData.author.toString() === userId) {
        result.canAccess = true;
        return result;
      }

      // 5.4 ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
      const user = await UserModel.findById(userId).select('roles').lean();
      if (user && (user.roles.includes('Admin') || user.roles.includes('Moderator'))) {
        result.canAccess = true;
        return result;
      }

      // 5.5 ตรวจสอบว่าผู้ใช้ซื้อตอนนี้แล้วหรือไม่
      const userLibraryItem = await UserLibraryItemModel.findOne({
        userId: new Types.ObjectId(userId),
        novelId: novelData._id,
        purchasedEpisodeIds: { $in: [episode._id] }
      }).lean();

      // ถ้าพบว่าผู้ใช้ซื้อตอนนี้แล้ว
      if (userLibraryItem) {
        result.canAccess = true;
        result.episodeData!.isOwned = true;
        return result;
      }

      // 5.6 ตอนที่ต้องจ่ายและผู้ใช้ยังไม่ได้ซื้อ
      const effectivePrice = await this.getEpisodePrice(episode._id.toString());
      result.episodeData!.price = effectivePrice;
      result.reason = `ตอนนี้ต้องซื้อด้วยราคา ${effectivePrice} เหรียญ`;

      return result;

    } catch (error) {
      console.error('Error in checkAccess:', error);
      return { canAccess: false, reason: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' };
    }
  }

  /**
   * ตรวจสอบว่าผู้ใช้เป็นเจ้าของตอนนิยายหรือไม่
   * @param userId ID ของผู้ใช้
   * @param episodeId ID ของตอน
   * @returns ผลลัพธ์การตรวจสอบ
   */
  public static async isEpisodeOwner(userId: string, episodeId: string): Promise<boolean> {
    try {
      const episode = await EpisodeModel.findById(episodeId).select('novelId').lean();
      if (!episode) return false;

      const novel = await NovelModel.findById(episode.novelId).select('author coAuthors').lean();
      if (!novel) return false;

      // ตรวจสอบว่าผู้ใช้เป็นผู้เขียนหลักหรือผู้เขียนร่วม
      const authorId = novel.author.toString();
      const coAuthors = novel.coAuthors?.map(id => id.toString()) || [];

      return authorId === userId || coAuthors.includes(userId);
    } catch (error) {
      console.error('Error in isEpisodeOwner:', error);
      return false;
    }
  }

  /**
   * ตรวจสอบว่าผู้ใช้ซื้อตอนนี้แล้วหรือไม่
   * @param userId ID ของผู้ใช้
   * @param episodeId ID ของตอน
   * @returns true ถ้าผู้ใช้ซื้อตอนนี้แล้ว
   */
  public static async hasUserPurchasedEpisode(userId: string, episodeId: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(episodeId)) {
        return false;
      }

      // ดึงข้อมูลตอนเพื่อหา novelId
      const episode = await EpisodeModel.findById(episodeId).select('novelId').lean();
      if (!episode) return false;

      // ตรวจสอบว่ามีรายการในคลังที่มีตอนนี้อยู่ในรายการที่ซื้อแล้วหรือไม่
      const userLibraryItem = await UserLibraryItemModel.findOne({
        userId: new Types.ObjectId(userId),
        novelId: episode.novelId,
        purchasedEpisodeIds: { $in: [new Types.ObjectId(episodeId)] }
      }).lean();

      return !!userLibraryItem;
    } catch (error) {
      console.error('Error in hasUserPurchasedEpisode:', error);
      return false;
    }
  }

  /**
   * ดึงราคาของตอนนิยาย
   * @param episodeId ID ของตอน
   * @returns ราคาของตอน (เหรียญ)
   */
  public static async getEpisodePrice(episodeId: string): Promise<number> {
    try {
      const episode = await EpisodeModel.findById(episodeId);
      if (!episode) {
        throw new Error('ไม่พบตอนนิยายที่ระบุ');
      }

      // ใช้ method getEffectivePrice ที่มีอยู่ใน Episode model
      return await episode.getEffectivePrice();
    } catch (error) {
      console.error('Error in getEpisodePrice:', error);
      return 0;
    }
  }
}

export default EpisodeAccessService;
