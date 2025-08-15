import dbConnect from "@/backend/lib/mongodb";
import RatingModel, { IRating, RateableType, RatingAspect } from "@/backend/models/Rating";
import UserModel from "@/backend/models/User";
import mongoose, { Types } from "mongoose";

export type CreateRatingInput = {
  userId: string;
  targetId: string;
  targetType: RateableType;
  overallScore: number;
  scoreDetails?: Array<{
    aspect: RatingAspect;
    score: number;
  }>;
  reviewTitle?: string;
  reviewContent?: string;
  containsSpoilers?: boolean;
  language?: string;
  novelIdContext?: string;
};

export type UpdateRatingInput = {
  ratingId: string;
  userId: string; // ผู้ใช้ที่เป็นเจ้าของรีวิว (สำหรับตรวจสอบสิทธิ์)
  overallScore?: number;
  scoreDetails?: Array<{
    aspect: RatingAspect;
    score: number;
  }>;
  reviewTitle?: string;
  reviewContent?: string;
  containsSpoilers?: boolean;
};

export type ListRatingsQuery = {
  targetId?: string;
  targetType?: RateableType;
  userId?: string;
  novelIdContext?: string;
  minScore?: number;
  maxScore?: number;
  containsSpoilers?: boolean;
  hasReview?: boolean;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest" | "highest" | "lowest" | "helpful";
};

export type DeleteRatingInput = {
  ratingId: string;
  userId: string;
  asModerator?: boolean;
  reason?: string;
};

function toObjectId(id: string): Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid ObjectId: " + id);
  }
  return new mongoose.Types.ObjectId(id);
}

export const RatingReviewService = {
  /**
   * สร้างการให้คะแนนและรีวิวใหม่
   * @param input ข้อมูลการให้คะแนนและรีวิว
   * @returns ข้อมูลการให้คะแนนและรีวิวที่สร้างขึ้น
   */
  async create(input: CreateRatingInput) {
    await dbConnect();

    const userId = toObjectId(input.userId);
    const targetId = toObjectId(input.targetId);
    
    // ตรวจสอบว่าผู้ใช้เคยให้คะแนนเป้าหมายนี้แล้วหรือไม่
    const existingRating = await RatingModel.findOne({
      userId,
      targetId,
      targetType: input.targetType,
    });

    if (existingRating) {
      throw new Error("คุณได้ให้คะแนนเนื้อหานี้ไปแล้ว กรุณาใช้การแก้ไขแทน");
    }

    // สร้างข้อมูลสำหรับบันทึก
    const ratingData: Partial<IRating> = {
      userId,
      targetId,
      targetType: input.targetType,
      overallScore: input.overallScore,
      containsSpoilers: input.containsSpoilers || false,
      status: "visible", // ค่าเริ่มต้นคือแสดงผลทันที
    };

    // เพิ่มข้อมูลเพิ่มเติมถ้ามี
    if (input.scoreDetails && input.scoreDetails.length > 0) {
      // ใช้ any เพื่อหลีกเลี่ยงปัญหา type ของ DocumentArray
      (ratingData as any).scoreDetails = input.scoreDetails;
    }

    if (input.reviewTitle) {
      ratingData.reviewTitle = input.reviewTitle.trim();
    }

    if (input.reviewContent) {
      ratingData.reviewContent = input.reviewContent.trim();
    }

    if (input.language) {
      ratingData.language = input.language;
    }

    if (input.novelIdContext) {
      ratingData.novelIdContext = toObjectId(input.novelIdContext);
    }

    // บันทึกข้อมูล
    const doc = await RatingModel.create(ratingData);

    // ดึงข้อมูลผู้ใช้เพื่อแสดงผล
    const populated = await RatingModel.findById(doc._id)
      .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
      .lean();

    return populated;
  },

  /**
   * อัปเดตการให้คะแนนและรีวิวที่มีอยู่แล้ว
   * @param input ข้อมูลสำหรับอัปเดต
   * @returns ข้อมูลการให้คะแนนและรีวิวที่อัปเดตแล้ว
   */
  async update(input: UpdateRatingInput) {
    await dbConnect();

    const ratingId = toObjectId(input.ratingId);
    const userId = toObjectId(input.userId);

    // ตรวจสอบว่ารีวิวนี้มีอยู่จริงและเป็นของผู้ใช้นี้
    const existing = await RatingModel.findById(ratingId).select("userId status");
    
    if (!existing) {
      throw new Error("ไม่พบรีวิวที่ต้องการแก้ไข");
    }
    
    if (existing.userId.toString() !== userId.toString()) {
      throw new Error("คุณไม่มีสิทธิ์แก้ไขรีวิวนี้");
    }
    
    if (existing.status !== "visible") {
      throw new Error("ไม่สามารถแก้ไขรีวิวที่ถูกซ่อนหรือลบแล้ว");
    }

    // สร้างข้อมูลสำหรับอัปเดต
    const updateData: any = {
      $set: {
        isEdited: true,
        lastEditedAt: new Date(),
      }
    };

    // เพิ่มข้อมูลที่ต้องการอัปเดต
    if (input.overallScore !== undefined) {
      updateData.$set.overallScore = input.overallScore;
    }

    if (input.scoreDetails) {
      updateData.$set.scoreDetails = input.scoreDetails;
    }

    if (input.reviewTitle !== undefined) {
      updateData.$set.reviewTitle = input.reviewTitle ? input.reviewTitle.trim() : null;
    }

    if (input.reviewContent !== undefined) {
      updateData.$set.reviewContent = input.reviewContent ? input.reviewContent.trim() : null;
    }

    if (input.containsSpoilers !== undefined) {
      updateData.$set.containsSpoilers = input.containsSpoilers;
    }

    // บันทึกประวัติการแก้ไข
    updateData.$push = {
      editHistory: {
        editedAt: new Date(),
        editedByUserId: userId,
        previousOverallScore: existing.overallScore,
        previousReviewContent: existing.reviewContent,
      }
    };

    // อัปเดตข้อมูล
    const updated = await RatingModel.findByIdAndUpdate(
      ratingId,
      updateData,
      { new: true }
    )
      .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
      .lean();

    return updated;
  },

  /**
   * ดึงข้อมูลการให้คะแนนและรีวิวตามเงื่อนไข
   * @param query เงื่อนไขการค้นหา
   * @returns รายการการให้คะแนนและรีวิวที่ตรงตามเงื่อนไข
   */
  async list(query: ListRatingsQuery) {
    await dbConnect();

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    // สร้างเงื่อนไขการค้นหา
    const filter: any = {
      status: "visible", // แสดงเฉพาะรีวิวที่มองเห็นได้
    };

    // เพิ่มเงื่อนไขตามพารามิเตอร์ที่ระบุ
    if (query.targetId) {
      filter.targetId = toObjectId(query.targetId);
    }

    if (query.targetType) {
      filter.targetType = query.targetType;
    }

    if (query.userId) {
      filter.userId = toObjectId(query.userId);
    }

    if (query.novelIdContext) {
      filter.novelIdContext = toObjectId(query.novelIdContext);
    }

    if (query.minScore !== undefined) {
      filter.overallScore = filter.overallScore || {};
      filter.overallScore.$gte = query.minScore;
    }

    if (query.maxScore !== undefined) {
      filter.overallScore = filter.overallScore || {};
      filter.overallScore.$lte = query.maxScore;
    }

    if (query.containsSpoilers !== undefined) {
      filter.containsSpoilers = query.containsSpoilers;
    }

    if (query.hasReview === true) {
      filter.reviewContent = { $exists: true, $nin: [null, ""] };
    } else if (query.hasReview === false) {
      filter.$or = [
        { reviewContent: { $exists: false } },
        { reviewContent: null },
        { reviewContent: "" }
      ];
    }

    // กำหนดการเรียงลำดับ
    let sort: any = { createdAt: -1 }; // ค่าเริ่มต้นคือเรียงตามวันที่สร้างล่าสุด
    
    if (query.sort === "oldest") {
      sort = { createdAt: 1 };
    } else if (query.sort === "highest") {
      sort = { overallScore: -1, createdAt: -1 };
    } else if (query.sort === "lowest") {
      sort = { overallScore: 1, createdAt: -1 };
    } else if (query.sort === "helpful") {
      sort = { helpfulVotesCount: -1, createdAt: -1 };
    }

    // ดึงข้อมูลและจำนวนทั้งหมด
    const [total, ratings] = await Promise.all([
      RatingModel.countDocuments(filter),
      RatingModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
        .lean()
    ]);

    // คำนวณสถิติเพิ่มเติม (ถ้าต้องการ)
    let stats = null;
    if (query.targetId && query.targetType) {
      const aggregateResult = await RatingModel.aggregate([
        { $match: { targetId: toObjectId(query.targetId), targetType: query.targetType, status: "visible" } },
        { $group: {
            _id: null,
            averageScore: { $avg: "$overallScore" },
            count: { $sum: 1 },
            distribution: {
              $push: "$overallScore"
            }
          }
        }
      ]);

      if (aggregateResult.length > 0) {
        const result = aggregateResult[0];
        // สร้างการกระจายคะแนน
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        result.distribution.forEach((score: number) => {
          const roundedScore = Math.round(score);
          if (roundedScore >= 1 && roundedScore <= 5) {
            distribution[roundedScore as keyof typeof distribution]++;
          }
        });

        stats = {
          averageScore: parseFloat(result.averageScore.toFixed(2)),
          count: result.count,
          distribution: distribution
        };
      }
    }

    return { total, page, limit, ratings, stats };
  },

  /**
   * ดึงข้อมูลการให้คะแนนและรีวิวตาม ID
   * @param ratingId ID ของการให้คะแนนและรีวิว
   * @returns ข้อมูลการให้คะแนนและรีวิว
   */
  async getById(ratingId: string) {
    await dbConnect();
    
    const _id = toObjectId(ratingId);
    
    const rating = await RatingModel.findById(_id)
      .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
      .lean();
      
    return rating;
  },

  /**
   * ดึงข้อมูลการให้คะแนนและรีวิวของผู้ใช้สำหรับเป้าหมายที่ระบุ
   * @param userId ID ของผู้ใช้
   * @param targetId ID ของเป้าหมาย
   * @param targetType ประเภทของเป้าหมาย
   * @returns ข้อมูลการให้คะแนนและรีวิว
   */
  async getUserRatingForTarget(userId: string, targetId: string, targetType: RateableType) {
    await dbConnect();
    
    const rating = await RatingModel.findOne({
      userId: toObjectId(userId),
      targetId: toObjectId(targetId),
      targetType,
      status: "visible"
    })
      .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
      .lean();
      
    return rating;
  },

  /**
   * ลบการให้คะแนนและรีวิว (Soft Delete)
   * @param input ข้อมูลสำหรับการลบ
   * @returns ข้อมูลการให้คะแนนและรีวิวที่ถูกลบ
   */
  async softDelete(input: DeleteRatingInput) {
    await dbConnect();
    
    const ratingId = toObjectId(input.ratingId);
    const userId = toObjectId(input.userId);
    
    // ตรวจสอบว่ารีวิวนี้มีอยู่จริง
    const existing = await RatingModel.findById(ratingId).select("userId status");
    
    if (!existing) {
      throw new Error("ไม่พบรีวิวที่ต้องการลบ");
    }
    
    // ตรวจสอบสิทธิ์ในการลบ
    if (!input.asModerator && existing.userId.toString() !== userId.toString()) {
      throw new Error("คุณไม่มีสิทธิ์ลบรีวิวนี้");
    }
    
    // กำหนดสถานะการลบ
    const newStatus = input.asModerator ? "deleted_by_moderator" : "deleted_by_user";
    
    // อัปเดตสถานะและข้อมูลการลบ
    const updated = await RatingModel.findByIdAndUpdate(
      ratingId,
      {
        $set: {
          status: newStatus,
          statusReason: input.reason,
          deletedAt: new Date(),
          deletedByUserId: userId,
        },
      },
      { new: true }
    )
      .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
      .lean();
      
    return updated;
  },

  /**
   * บันทึกการโหวตว่ารีวิวมีประโยชน์หรือไม่
   * @param ratingId ID ของการให้คะแนนและรีวิว
   * @param userId ID ของผู้ใช้ที่โหวต
   * @param isHelpful true ถ้าโหวตว่ามีประโยชน์, false ถ้าโหวตว่าไม่มีประโยชน์
   * @returns ผลลัพธ์การโหวต
   */
  async voteHelpfulness(ratingId: string, userId: string, isHelpful: boolean) {
    await dbConnect();
    
    const _id = toObjectId(ratingId);
    const _userId = toObjectId(userId);
    
    // ตรวจสอบว่ารีวิวนี้มีอยู่จริง
    const rating = await RatingModel.findById(_id);
    
    if (!rating) {
      throw new Error("ไม่พบรีวิวที่ต้องการโหวต");
    }
    
    if (rating.status !== "visible") {
      throw new Error("ไม่สามารถโหวตรีวิวที่ถูกซ่อนหรือลบแล้ว");
    }
    
    // ตรวจสอบว่าผู้ใช้ไม่ได้โหวตรีวิวของตัวเอง
    if (rating.userId.toString() === _userId.toString()) {
      throw new Error("คุณไม่สามารถโหวตรีวิวของตัวเองได้");
    }
    
    // ตรวจสอบว่าผู้ใช้เคยโหวตรีวิวนี้แล้วหรือไม่
    // หมายเหตุ: ในระบบจริงควรมี RatingVote model แยกต่างหาก
    // แต่ในตัวอย่างนี้จะใช้วิธีเก็บใน array ใน rating document เพื่อความเรียบง่าย
    const voterIndex = rating.voters?.findIndex((v: { userId: mongoose.Types.ObjectId }) => v.userId.toString() === _userId.toString());
    
    if (voterIndex !== undefined && voterIndex >= 0) {
      // ผู้ใช้เคยโหวตแล้ว ตรวจสอบว่าโหวตเหมือนเดิมหรือไม่
      const previousVote = rating.voters[voterIndex].isHelpful;
      
      if (previousVote === isHelpful) {
        // โหวตซ้ำแบบเดิม ให้ยกเลิกการโหวต
        rating.voters.splice(voterIndex, 1);
        
        // อัปเดตจำนวนโหวต
        if (isHelpful) {
          rating.helpfulVotesCount = Math.max(0, (rating.helpfulVotesCount || 0) - 1);
        } else {
          rating.unhelpfulVotesCount = Math.max(0, (rating.unhelpfulVotesCount || 0) - 1);
        }
      } else {
        // เปลี่ยนการโหวต
        rating.voters[voterIndex].isHelpful = isHelpful;
        
        // อัปเดตจำนวนโหวต
        if (isHelpful) {
          rating.helpfulVotesCount = (rating.helpfulVotesCount || 0) + 1;
          rating.unhelpfulVotesCount = Math.max(0, (rating.unhelpfulVotesCount || 0) - 1);
        } else {
          rating.helpfulVotesCount = Math.max(0, (rating.helpfulVotesCount || 0) - 1);
          rating.unhelpfulVotesCount = (rating.unhelpfulVotesCount || 0) + 1;
        }
      }
    } else {
      // ผู้ใช้ยังไม่เคยโหวต
      if (!rating.voters) {
        rating.voters = [];
      }
      
      // เพิ่มข้อมูลการโหวต
      rating.voters.push({
        userId: _userId,
        isHelpful,
        votedAt: new Date()
      });
      
      // อัปเดตจำนวนโหวต
      if (isHelpful) {
        rating.helpfulVotesCount = (rating.helpfulVotesCount || 0) + 1;
      } else {
        rating.unhelpfulVotesCount = (rating.unhelpfulVotesCount || 0) + 1;
      }
    }
    
    // บันทึกการเปลี่ยนแปลง
    await rating.save();
    
    // ดึงข้อมูลที่อัปเดตแล้วพร้อม populate
    const updated = await RatingModel.findById(_id)
      .populate({ path: "userId", model: UserModel, select: "_id username avatarUrl primaryPenName roles" })
      .lean();
      
    return updated;
  },

  /**
   * ดึงสถิติการให้คะแนนสำหรับเป้าหมายที่ระบุ
   * @param targetId ID ของเป้าหมาย
   * @param targetType ประเภทของเป้าหมาย
   * @returns สถิติการให้คะแนน
   */
  async getTargetStatistics(targetId: string, targetType: RateableType) {
    await dbConnect();
    
    const _targetId = toObjectId(targetId);
    
    // คำนวณสถิติจากข้อมูลการให้คะแนนทั้งหมด
    const aggregateResult = await RatingModel.aggregate([
      { 
        $match: { 
          targetId: _targetId, 
          targetType, 
          status: "visible" 
        } 
      },
      { 
        $group: {
          _id: null,
          averageScore: { $avg: "$overallScore" },
          count: { $sum: 1 },
          reviewsCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ["$reviewContent", null] },
                  { $ne: ["$reviewContent", ""] }
                ]},
                1,
                0
              ]
            }
          },
          distribution: { $push: "$overallScore" },
          // คำนวณค่าเฉลี่ยสำหรับแต่ละด้าน (ถ้ามี)
          aspectScores: {
            $push: "$scoreDetails"
          }
        }
      }
    ]);
    
    if (aggregateResult.length === 0) {
      return {
        averageScore: 0,
        count: 0,
        reviewsCount: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        aspectAverages: {}
      };
    }
    
    const result = aggregateResult[0];
    
    // สร้างการกระจายคะแนน
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    result.distribution.forEach((score: number) => {
      const roundedScore = Math.round(score);
      if (roundedScore >= 1 && roundedScore <= 5) {
        distribution[roundedScore as keyof typeof distribution]++;
      }
    });
    
    // คำนวณค่าเฉลี่ยสำหรับแต่ละด้าน
    const aspectAverages: Record<string, number> = {};
    const aspectCounts: Record<string, number> = {};
    
    // รวบรวมคะแนนทั้งหมดสำหรับแต่ละด้าน
    result.aspectScores.forEach((details: Array<{ aspect: string; score: number }> | null | undefined) => {
      if (details && Array.isArray(details)) {
        details.forEach(detail => {
          if (!aspectAverages[detail.aspect]) {
            aspectAverages[detail.aspect] = 0;
            aspectCounts[detail.aspect] = 0;
          }
          aspectAverages[detail.aspect] += detail.score;
          aspectCounts[detail.aspect]++;
        });
      }
    });
    
    // คำนวณค่าเฉลี่ย
    Object.keys(aspectAverages).forEach(aspect => {
      if (aspectCounts[aspect] > 0) {
        aspectAverages[aspect] = parseFloat((aspectAverages[aspect] / aspectCounts[aspect]).toFixed(2));
      }
    });
    
    return {
      averageScore: parseFloat(result.averageScore.toFixed(2)),
      count: result.count,
      reviewsCount: result.reviewsCount,
      distribution,
      aspectAverages
    };
  }
};

export default RatingReviewService;
