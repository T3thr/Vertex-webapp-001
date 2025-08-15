// src/types/rating.ts
// ไฟล์นี้เก็บ types สำหรับใช้ใน client components

/**
 * @enum {string} RateableType
 * @description ประเภทของเนื้อหาที่สามารถให้คะแนนและรีวิวได้ (client-side version)
 */
export enum RateableType {
  NOVEL = "Novel",
  EPISODE = "Episode",
  CHARACTER = "Character",
  STORY_ARC = "StoryArc",
  PLATFORM_FEATURE = "PlatformFeature",
  OFFICIAL_MEDIA = "OfficialMedia",
  USER_GENERATED_CONTENT = "UserGeneratedContent",
}

/**
 * @enum {string} RatingAspect
 * @description ด้านต่างๆ ที่สามารถให้คะแนนได้
 */
export enum RatingAspect {
  OVERALL = "overall",
  STORY = "story",
  CHARACTERS = "characters",
  WORLD_BUILDING = "world_building",
  WRITING_STYLE = "writing_style",
  ARTWORK = "artwork",
  MUSIC_SOUND = "music_sound",
  USER_EXPERIENCE = "user_experience",
}

/**
 * @interface RatingUser
 * @description ข้อมูลผู้ใช้สำหรับแสดงในการให้คะแนนและรีวิว
 */
export interface RatingUser {
  _id: string;
  username: string;
  avatarUrl?: string;
  primaryPenName?: string;
  roles: string[];
}

/**
 * @interface RatingScoreDetail
 * @description รายละเอียดคะแนนสำหรับแต่ละด้าน
 */
export interface RatingScoreDetail {
  aspect: RatingAspect;
  score: number;
}

/**
 * @interface RatingVoter
 * @description ข้อมูลผู้โหวตว่ารีวิวมีประโยชน์หรือไม่
 */
export interface RatingVoter {
  userId: string;
  isHelpful: boolean;
  votedAt: string;
}

/**
 * @interface Rating
 * @description ข้อมูลการให้คะแนนและรีวิวสำหรับแสดงผล
 */
export interface Rating {
  _id: string;
  userId: RatingUser;
  targetId: string;
  targetType: RateableType;
  overallScore: number;
  scoreDetails?: RatingScoreDetail[];
  reviewTitle?: string;
  reviewContent?: string;
  containsSpoilers: boolean;
  language?: string;
  novelIdContext?: string;
  helpfulVotesCount: number;
  unhelpfulVotesCount: number;
  voters?: RatingVoter[];
  status: string;
  isEdited?: boolean;
  lastEditedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * @interface RatingStatistics
 * @description สถิติการให้คะแนนสำหรับเป้าหมาย
 */
export interface RatingStatistics {
  averageScore: number;
  count: number;
  reviewsCount: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  aspectAverages: Record<string, number>;
}

/**
 * @interface CreateRatingRequest
 * @description รูปแบบคำขอสำหรับสร้างการให้คะแนนและรีวิวใหม่
 */
export interface CreateRatingRequest {
  targetId: string;
  targetType: RateableType;
  overallScore: number;
  scoreDetails?: RatingScoreDetail[];
  reviewTitle?: string;
  reviewContent?: string;
  containsSpoilers?: boolean;
  language?: string;
  novelIdContext?: string;
}

/**
 * @interface UpdateRatingRequest
 * @description รูปแบบคำขอสำหรับอัปเดตการให้คะแนนและรีวิว
 */
export interface UpdateRatingRequest {
  overallScore?: number;
  scoreDetails?: RatingScoreDetail[];
  reviewTitle?: string;
  reviewContent?: string;
  containsSpoilers?: boolean;
}

/**
 * @interface VoteRatingRequest
 * @description รูปแบบคำขอสำหรับโหวตว่ารีวิวมีประโยชน์หรือไม่
 */
export interface VoteRatingRequest {
  isHelpful: boolean;
}

/**
 * @interface DeleteRatingRequest
 * @description รูปแบบคำขอสำหรับลบการให้คะแนนและรีวิว
 */
export interface DeleteRatingRequest {
  reason?: string;
}

/**
 * @interface RatingListResponse
 * @description รูปแบบการตอบกลับสำหรับรายการการให้คะแนนและรีวิว
 */
export interface RatingListResponse {
  total: number;
  page: number;
  limit: number;
  ratings: Rating[];
  stats?: RatingStatistics;
}

/**
 * @interface RatingResponse
 * @description รูปแบบการตอบกลับสำหรับการให้คะแนนและรีวิว
 */
export interface RatingResponse {
  success: boolean;
  rating?: Rating;
  error?: string;
}

/**
 * @interface RatingListQueryParams
 * @description พารามิเตอร์สำหรับการค้นหาการให้คะแนนและรีวิว
 */
export interface RatingListQueryParams {
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
}

/**
 * @interface RatingStatisticsResponse
 * @description รูปแบบการตอบกลับสำหรับสถิติการให้คะแนน
 */
export interface RatingStatisticsResponse {
  success: boolean;
  stats?: RatingStatistics;
  error?: string;
}
