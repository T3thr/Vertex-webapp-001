// src/backend/services/CommunityBoard.ts
// บริการจัดการกระทู้และการสนทนาในชุมชน

import mongoose from 'mongoose';
import BoardModel, { BoardStatus, BoardType, IBoard } from '../models/Board';
import { CategoryType } from '../models/Category';

// อินเตอร์เฟซสำหรับข้อมูลที่ใช้สร้างกระทู้ใหม่
export interface CreateBoardPostDto {
  title: string;
  content: string;
  authorId: string;
  boardType: BoardType;
  sourceType?: string; // เพิ่ม sourceType เพื่อระบุที่มาของกระทู้ (review, problem, etc.)
  categoryAssociatedId: string;
  novelAssociatedId?: string;
  novelTitle?: string;
  tags?: string[];
  containsSpoilers?: boolean;
  reviewDetails?: {
    ratingValue: number;
    ratingBreakdown?: {
      story?: number;
      characters?: number;
      visuals?: number;
      audio?: number;
      gameplay?: number;
    };
    readingProgress: "not_started" | "in_progress" | "completed";
  };
}

// คลาสบริการจัดการกระทู้
class CommunityBoardService {
  /**
   * สร้างกระทู้ใหม่
   * @param postData ข้อมูลกระทู้ที่จะสร้าง
   * @returns กระทู้ที่สร้างแล้ว
   */
  async createBoardPost(postData: CreateBoardPostDto): Promise<IBoard> {
    try {
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!postData.title || !postData.content || !postData.authorId) {
        throw new Error('ข้อมูลไม่ครบถ้วน กรุณาระบุหัวข้อ เนื้อหา และผู้เขียน');
      }

      // ดึงข้อมูลผู้ใช้เพื่อเอา username
      const UserModel = (await import('../models/User')).default;
      const author = await UserModel.findById(postData.authorId).select('username profile.avatarUrl roles');
      if (!author) {
        throw new Error('ไม่พบข้อมูลผู้ใช้');
      }

      // สร้างหมวดหมู่เริ่มต้นถ้าไม่มี
      let categoryId = postData.categoryAssociatedId;
      
      // ตรวจสอบว่า categoryId เป็น ObjectId ที่ถูกต้องหรือไม่
      const isValidObjectId = categoryId && mongoose.Types.ObjectId.isValid(categoryId);
      
      if (!categoryId || !isValidObjectId) {
        const CategoryModel = (await import('../models/Category')).default;
        let generalCategory = await CategoryModel.findOne({ 
          slug: 'general-discussion',
          categoryType: CategoryType.TAG
        });
        
        if (!generalCategory) {
          generalCategory = await CategoryModel.create({
            name: 'พูดคุยทั่วไป',
            slug: 'general-discussion',
            categoryType: CategoryType.TAG,
            description: 'พูดคุยเรื่องทั่วไป แชร์ประสบการณ์ และแลกเปลี่ยนความคิดเห็น',
            isActive: true,
            isSystemDefined: true,
            visibility: 'public',
            displayOrder: 0
          });
        }
        categoryId = generalCategory._id.toString();
      }

      // สร้าง slug จากชื่อกระทู้
      const slug = await this.generateUniqueSlug(postData.title);

      // สร้างข้อมูลพื้นฐานของกระทู้
      const boardData: any = {
        title: postData.title,
        slug,
        content: postData.content,
        contentFormat: 'markdown', // ค่าเริ่มต้นเป็น markdown
        authorId: new mongoose.Types.ObjectId(postData.authorId),
        authorUsername: author.username, // เพิ่ม authorUsername ที่จำเป็น
        authorAvatarUrl: author.profile?.avatarUrl, // เพิ่ม authorAvatarUrl
        authorRoles: author.roles || [], // เพิ่ม authorRoles
        boardType: postData.boardType || BoardType.DISCUSSION,
        sourceType: postData.sourceType || null, // เพิ่ม sourceType เพื่อระบุที่มาของกระทู้
        status: BoardStatus.PUBLISHED,
        categoryAssociated: new mongoose.Types.ObjectId(categoryId),
        tags: postData.tags || [],
        containsSpoilers: postData.containsSpoilers || false,
        stats: {
          viewsCount: 0,
          repliesCount: 0,
          likesCount: 0,
          upvotesCount: 0,
          downvotesCount: 0,
          sharesCount: 0,
          bookmarksCount: 0
        }
      };

      // เพิ่ม reviewDetails เฉพาะเมื่อเป็น REVIEW type
      if (postData.boardType === BoardType.REVIEW && postData.reviewDetails) {
        boardData.reviewDetails = postData.reviewDetails;
      }

      // สร้างกระทู้ใหม่
      const newBoardPost = new BoardModel(boardData);

      // เพิ่มข้อมูลนิยายที่เกี่ยวข้อง (ถ้ามี)
      if (postData.novelAssociatedId) {
        newBoardPost.novelAssociated = new mongoose.Types.ObjectId(postData.novelAssociatedId);
      } else if (postData.novelTitle) {
        // ใช้ชื่อนิยายที่ผู้ใช้กรอกแทน ID
        (newBoardPost as any).novelTitle = postData.novelTitle;
      }


      // บันทึกกระทู้
      await newBoardPost.save();
      return newBoardPost;
    } catch (error) {
      console.error('Error creating board post:', error);
      throw error;
    }
  }

  /**
   * สร้าง slug ที่ไม่ซ้ำสำหรับกระทู้
   * @param title ชื่อกระทู้
   * @returns slug ที่ไม่ซ้ำ
   */
  private async generateUniqueSlug(title: string): Promise<string> {
    // สร้าง slug จากชื่อกระทู้
    let baseSlug = title
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // ลบเครื่องหมายวรรณยุกต์
      .replace(/\s+/g, "-") // แทนที่ช่องว่างด้วยเครื่องหมายยัติภังค์
      .replace(/[^\w-]+/g, "") // ลบอักขระพิเศษ
      .replace(/\-\-+/g, "-") // แทนที่เครื่องหมายยัติภังค์ซ้ำด้วยเครื่องหมายเดียว
      .replace(/^-+/, "") // ลบเครื่องหมายยัติภังค์ที่อยู่ด้านหน้า
      .replace(/-+$/, ""); // ลบเครื่องหมายยัติภังค์ที่อยู่ด้านหลัง
      
    if (!baseSlug) {
      baseSlug = `board-${new mongoose.Types.ObjectId().toString().slice(-8)}`;
    }

    let finalSlug = baseSlug.substring(0, 240);
    let count = 0;

    // ตรวจสอบว่า slug ซ้ำหรือไม่
    while (true) {
      const existingBoard = await BoardModel.findOne({ slug: finalSlug });
      if (!existingBoard) break;
      count++;
      finalSlug = `${baseSlug.substring(0, 240 - String(count).length - 1)}-${count}`;
    }

    return finalSlug;
  }

  /**
   * ดึงกระทู้ล่าสุดทั้งหมด
   * @param limit จำนวนกระทู้ที่ต้องการดึง
   * @param skip จำนวนกระทู้ที่ต้องการข้าม
   * @returns รายการกระทู้
   */
  async getLatestPosts(limit: number = 10, skip: number = 0): Promise<any[]> {
    try {
      return await BoardModel.find({ status: BoardStatus.PUBLISHED, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'username profile.avatarUrl')
        .populate('categoryAssociated', 'name')
        .lean();
    } catch (error) {
      console.error('Error fetching latest posts:', error);
      throw error;
    }
  }

  /**
   * ดึงกระทู้ยอดนิยม
   * @param limit จำนวนกระทู้ที่ต้องการดึง
   * @returns รายการกระทู้ยอดนิยม
   */
  async getPopularPosts(limit: number = 5): Promise<any[]> {
    try {
      return await BoardModel.find({ status: BoardStatus.PUBLISHED, isDeleted: false })
        .sort({ 'stats.viewsCount': -1, 'stats.likesCount': -1 })
        .limit(limit)
        .populate('authorId', 'username profile.avatarUrl')
        .populate('categoryAssociated', 'name')
        .lean();
    } catch (error) {
      console.error('Error fetching popular posts:', error);
      throw error;
    }
  }

  /**
   * ดึงกระทู้ตามประเภท
   * @param boardType ประเภทของกระทู้
   * @param limit จำนวนกระทู้ที่ต้องการดึง
   * @param skip จำนวนกระทู้ที่ต้องการข้าม
   * @returns รายการกระทู้ตามประเภท
   */
  async getPostsByType(boardType: BoardType, limit: number = 10, skip: number = 0): Promise<any[]> {
    try {
      return await BoardModel.find({ boardType, status: BoardStatus.PUBLISHED, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'username profile.avatarUrl')
        .populate('categoryAssociated', 'name')
        .lean();
    } catch (error) {
      console.error(`Error fetching ${boardType} posts:`, error);
      throw error;
    }
  }

  /**
   * ดึงกระทู้ตาม ID
   * @param boardId ID ของกระทู้
   * @returns ข้อมูลกระทู้
   */
  async getBoardById(boardId: string): Promise<any | null> {
    try {
      return await BoardModel.findById(boardId)
        .populate('authorId', 'username profile.avatarUrl')
        .populate('categoryAssociated', 'name')
        .lean();
    } catch (error) {
      console.error('Error fetching board by ID:', error);
      throw error;
    }
  }

  /**
   * ดึงกระทู้ตาม slug
   * @param slug slug ของกระทู้
   * @returns ข้อมูลกระทู้
   */
  async getBoardBySlug(slug: string): Promise<any | null> {
    try {
      return await BoardModel.findOne({ slug, status: BoardStatus.PUBLISHED, isDeleted: false })
        .populate('authorId', '_id username profile.avatarUrl') // เพิ่ม _id เพื่อให้แน่ใจว่าดึง ID มาด้วย
        .populate('categoryAssociated', 'name')
        .lean();
    } catch (error) {
      console.error('Error fetching board by slug:', error);
      throw error;
    }
  }

  /**
   * เพิ่มจำนวนการดู
   * @param boardId ID ของกระทู้
   * @param userId ID ของผู้ใช้ (ถ้ามี)
   */
  async incrementViewCount(boardId: string, userId?: string): Promise<void> {
    try {
      await BoardModel.findByIdAndUpdate(boardId, {
        $inc: { 'stats.viewsCount': 1 }
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
      throw error;
    }
  }

  /**
   * ลบกระทู้ (soft delete)
   * @param boardId ID ของกระทู้
   * @returns ผลลัพธ์การลบกระทู้
   */
  async deleteBoard(boardId: string): Promise<any> {
    try {
      return await BoardModel.findByIdAndUpdate(boardId, {
        isDeleted: true,
        status: BoardStatus.DELETED,
        updatedAt: new Date()
      }, { new: true });
    } catch (error) {
      console.error('Error deleting board post:', error);
      throw error;
    }
  }
}

export default new CommunityBoardService();
