// src/app/api/search/novels/route.ts
import { NextRequest, NextResponse } from "next/server"; // Import NextRequest
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel, NovelStatus, NovelAccessLevel } from "@/backend/models/Novel"; // Import INovel และ Enums
import UserModel from "@/backend/models/User"; //
import CategoryModel, { ICategory } from "@/backend/models/Category"; //
import mongoose from "mongoose";


// Interface สำหรับข้อมูลนิยายที่ส่งกลับในผลการค้นหา (ควรจะคล้ายกับ PopulatedNovelForDetailPage แต่เลือกฟิลด์น้อยกว่า)
interface SearchedNovelResult {
  _id: string;
  title: string; //
  slug: string; //
  author?: { // จาก INovel.author (populated)
    _id: string;
    username?: string; //
    profile?: {
      displayName?: string; //
      penName?: string; //
      avatarUrl?: string; //
    };
  };
  coverImageUrl?: string; //
  synopsis: string; //
  status: NovelStatus; //
  // ageRating?: string; // ageRatingCategoryId จะถูก populate เป็น object ด้านล่าง
  ageRatingCategory?: Pick<ICategory, "_id" | "name" | "slug"> | null; //
  // tags?: string[]; // customTags จาก themeAssignment.customTags
  customTags?: string[]; //
  mainThemeCategory?: Pick<ICategory, "_id" | "name" | "slug"> | null; //
  subThemeCategories?: Pick<ICategory, "_id" | "name" | "slug">[]; //
  languageCategory?: Pick<ICategory, "_id" | "name" | "slug"> | null; //
  stats: { // จาก INovel.stats
    viewsCount: number;
    likesCount: number;
    averageRating: number;
    followersCount: number;
    lastPublishedEpisodeAt?: Date; //
    totalWords: number; //
  };
  monetizationSettings?: { // จาก INovel.monetizationSettings
    activePromotion?: {
        isActive: boolean;
        promotionalPriceCoins?: number;
        promotionStartDate?: Date;
        promotionEndDate?: Date;
    } | null;
    defaultEpisodePriceCoins?: number;
  };
  currentEpisodePriceCoins?: number; //คำนวณแล้ว
  totalEpisodesCount: number; //
  publishedEpisodesCount: number; //
  lastContentUpdatedAt: Date; //
  score?: number; // สำหรับ text search relevance
}


export async function GET(request: NextRequest) { // ใช้ NextRequest
  await dbConnect(); //

  try {
    const { searchParams } = new URL(request.url);

    // ดึงพารามิเตอร์จาก URL
    const query = searchParams.get("q")?.trim() || "";
    const mainThemeId = searchParams.get("mainTheme") || ""; // ID ของ Main Theme Category (เช่น genre)
    const subThemeId = searchParams.get("subTheme") || "";   // ID ของ Sub-Theme Category
    const tagQuery = searchParams.getAll("tag") || []; // เปลี่ยนเป็น tagQuery เพื่อไม่ให้ชนกับ customTags ใน model
    const sort = searchParams.get("sort") || "relevance"; // relevance, lastContentUpdatedAt, stats.lastPublishedEpisodeAt, stats.viewsCount, stats.averageRating, stats.followersCount
    const novelStatus = searchParams.get("status") || ""; // DRAFT, PUBLISHED, UNPUBLISHED, ARCHIVED, COMPLETED (ONGOING คือ !isCompleted)
    // explicitContent ถูกแทนที่ด้วยการกรองจาก ageRatingCategoryId หรือ contentWarningCategories
    const ageRatingId = searchParams.get("ageRating") || ""; // ID ของ Age Rating Category
    const isDiscountedParam = searchParams.get("discounted"); // "true", "false", "" (all)
    const languageId = searchParams.get("lang") || ""; // ID ของ Language Category
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    console.log(`📡 API /api/search/novels called with query: ${query}, mainThemeId: ${mainThemeId}, subThemeId: ${subThemeId}, sort: ${sort}, limit: ${limit}, page: ${page}`);

    // สร้างเงื่อนไขการค้นหา
    const searchCriteria: mongoose.FilterQuery<INovel> = {
      // isDeleted: false, // ไม่มี field นี้ใน NovelModel
      accessLevel: NovelAccessLevel.PUBLIC, // โดยทั่วไปจะค้นหาเฉพาะนิยายที่เป็น public
      status: { $in: [NovelStatus.PUBLISHED, NovelStatus.SCHEDULED] } // เริ่มต้นให้ค้นหาเฉพาะที่ published หรือ scheduled
                                                                 // หรืออาจจะ $nin: [NovelStatus.BANNED_BY_ADMIN, NovelStatus.REJECTED_BY_ADMIN]
    };

    // กรองตามสถานะนิยาย (published, completed, ongoing, etc.)
    if (novelStatus && novelStatus !== "all") {
      if (novelStatus === "completed") {
        searchCriteria.isCompleted = true; //
        searchCriteria.status = NovelStatus.PUBLISHED; // โดยทั่วไปนิยายที่จบแล้วควรจะ published
      } else if (novelStatus === "ongoing") {
        searchCriteria.isCompleted = false; //
        searchCriteria.status = NovelStatus.PUBLISHED;
      } else if (Object.values(NovelStatus).includes(novelStatus as NovelStatus)) {
        searchCriteria.status = novelStatus as NovelStatus;
      }
    }


    // กรองตาม ageRatingCategoryId
    if (ageRatingId && ageRatingId !== "all") {
      searchCriteria.ageRatingCategoryId = new mongoose.Types.ObjectId(ageRatingId);
    }

    // กรองตาม language ID (language category)
    if (languageId && languageId !== "all") {
      searchCriteria.language = new mongoose.Types.ObjectId(languageId);
    }

    // กรองตามการลดราคา
    if (isDiscountedParam === "true") {
      searchCriteria["monetizationSettings.activePromotion.isActive"] = true;
      // อาจจะต้องเพิ่มการตรวจสอบ date range ของ promotion ด้วย $and และ $lte, $gte
      const now = new Date();
      searchCriteria.$and = [
        ...(searchCriteria.$and || []),
        { "monetizationSettings.activePromotion.promotionStartDate": { $lte: now } },
        { "monetizationSettings.activePromotion.promotionEndDate": { $gte: now } },
      ];
    } else if (isDiscountedParam === "false") {
      searchCriteria.$or = [
        { "monetizationSettings.activePromotion.isActive": false },
        { "monetizationSettings.activePromotion.isActive": { $exists: false } },
        // หรือเงื่อนไขที่ซับซ้อนกว่านี้เพื่อตรวจสอบวันที่
      ];
    }

    // กรองตามหมวดหมู่หลัก (mainTheme)
    if (mainThemeId) {
      searchCriteria["themeAssignment.mainTheme.categoryId"] = new mongoose.Types.ObjectId(mainThemeId);
    }

    // กรองตามหมวดหมู่รอง (subTheme)
    if (subThemeId) {
      searchCriteria["themeAssignment.subThemes.categoryId"] = new mongoose.Types.ObjectId(subThemeId);
    }

    // กรองตามแท็ก (customTags)
    if (tagQuery.length > 0) {
      searchCriteria["themeAssignment.customTags"] = { $all: tagQuery.map(tag => tag.toLowerCase()) };
    }

    // ถ้ามีการค้นหาด้วยข้อความ ใช้ text search (ต้องมี text index ใน Model)
    if (query) {
      const langForSearch = languageId ? (await CategoryModel.findById(languageId).select("name").lean())?.name?.toLowerCase() || "none" : "none"; // หรือ "thai" ตาม default ใน schema
      searchCriteria.$text = {
        $search: query,
        // $language: langForSearch, // ถ้าต้องการ dynamic language สำหรับ text search (Mongo 5.0+)
                                     // หรือใช้ default_language ที่ตั้งไว้ใน index
        $caseSensitive: false,
        $diacriticSensitive: false, // อาจจะไม่จำเป็นถ้า $language จัดการได้ดี
      };
    }

    // กำหนดการเรียงลำดับ
    const sortOptions: any = {};
    if (query && sort === "relevance") {
      sortOptions.score = { $meta: "textScore" };
    } else {
      switch (sort) {
        case "latestUpdate": // อัปเดตเนื้อหาล่าสุดของนิยาย
          sortOptions.lastContentUpdatedAt = -1;
          break;
        case "latestEpisode": // อัปเดตตอนล่าสุด
          sortOptions["stats.lastPublishedEpisodeAt"] = -1;
          break;
        case "popular": // ยอดวิว
          sortOptions["stats.viewsCount"] = -1;
          break;
        case "rating": // คะแนนเฉลี่ย
          sortOptions["stats.averageRating"] = -1;
          break;
        case "followers": // จำนวนผู้ติดตาม
          sortOptions["stats.followersCount"] = -1;
          break;
        default: // ถ้าไม่ระบุหรือ relevance โดยไม่มี query ก็เรียงตามอัปเดตเนื้อหาล่าสุด
          sortOptions.lastContentUpdatedAt = -1;
          break;
      }
    }
    // เพิ่มการเรียงตาม _id เพื่อความเสถียรของ pagination หากค่าที่เรียงซ้ำกัน
    sortOptions._id = -1;


    // Fields to select (เลือกเฉพาะที่จำเป็นสำหรับหน้า search results)
    const selectedFields =
      "title slug coverImageUrl synopsis status isCompleted " +
      "themeAssignment.mainTheme.categoryId themeAssignment.subThemes.categoryId themeAssignment.customTags " +
      "ageRatingCategoryId language " +
      "stats.viewsCount stats.likesCount stats.averageRating stats.followersCount stats.lastPublishedEpisodeAt stats.totalWords " +
      "monetizationSettings.activePromotion monetizationSettings.defaultEpisodePriceCoins " +
      "totalEpisodesCount publishedEpisodesCount author lastContentUpdatedAt";

    // ดึงข้อมูลนิยาย
    const novelsQuery = NovelModel
      .find(searchCriteria)
      .populate<{ author: SearchedNovelResult["author"] }>({
        path: "author",
        model: UserModel,
        select: "username profile.displayName profile.penName profile.avatarUrl", // อัปเดต fields
      })
      .populate<{ mainThemeCategory: SearchedNovelResult["mainThemeCategory"] }>({
        path: "themeAssignment.mainTheme.categoryId",
        model: CategoryModel,
        select: "_id name slug", // เลือกฟิลด์ที่จำเป็น
      })
      .populate<{ subThemeCategories: SearchedNovelResult["subThemeCategories"] }>({
        path: "themeAssignment.subThemes.categoryId",
        model: CategoryModel,
        select: "_id name slug",
      })
      .populate<{ ageRatingCategory: SearchedNovelResult["ageRatingCategory"] }>({
        path: "ageRatingCategoryId",
        model: CategoryModel,
        select: "_id name slug",
      })
      .populate<{ languageCategory: SearchedNovelResult["languageCategory"] }>({
        path: "language",
        model: CategoryModel,
        select: "_id name slug",
      })
      .select(selectedFields + (query && sort === "relevance" ? " score" : "")) // เพิ่ม score ถ้ามีการ search
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(); // ใช้ .lean()

    const rawNovels = await novelsQuery;

    // Map ผลลัพธ์เพื่อคำนวณ currentEpisodePriceCoins
    const novels: SearchedNovelResult[] = rawNovels.map((novel: any) => {
        const now = new Date();
        const promo = novel.monetizationSettings?.activePromotion;
        let currentPrice = novel.monetizationSettings?.defaultEpisodePriceCoins ?? 0;
        if (
            promo &&
            promo.isActive &&
            promo.promotionalPriceCoins !== undefined &&
            (!promo.promotionStartDate || new Date(promo.promotionStartDate) <= now) &&
            (!promo.promotionEndDate || new Date(promo.promotionEndDate) >= now)
        ) {
            currentPrice = promo.promotionalPriceCoins;
        }
        return {
            ...novel,
            _id: novel._id.toString(),
            author: novel.author,
            coverImageUrl: novel.coverImageUrl,
            synopsis: novel.synopsis,
            status: novel.status,
            ageRatingCategory: novel.ageRatingCategory,
            customTags: novel.themeAssignment?.customTags,
            mainThemeCategory: novel.mainThemeCategory,
            subThemeCategories: novel.subThemeCategories,
            languageCategory: novel.languageCategory,
            stats: novel.stats,
            monetizationSettings: novel.monetizationSettings,
            currentEpisodePriceCoins: currentPrice,
            totalEpisodesCount: novel.totalEpisodesCount,
            publishedEpisodesCount: novel.publishedEpisodesCount,
            lastContentUpdatedAt: novel.lastContentUpdatedAt,
            score: novel.score
        };
    });


    // นับจำนวนนิยายทั้งหมดที่ตรงกับเงื่อนไข
    const total = await NovelModel.countDocuments(searchCriteria);

    console.log(`✅ Found ${novels.length} novels matching query (total: ${total})`);

    // ดึงข้อมูลหมวดหมู่ที่ถูกเลือก (ถ้ามี) เพื่อแสดงผลบนหน้าค้นหา
    let mainThemeCategoryData = null;
    if (mainThemeId) {
      mainThemeCategoryData = await CategoryModel.findById(mainThemeId).select("name slug description coverImageUrl color").lean(); //
    }
    let subThemeCategoryData = null;
    if (subThemeId) {
      subThemeCategoryData = await CategoryModel.findById(subThemeId).select("name slug description color").lean(); //
    }

    // สรุปแท็กที่เกี่ยวข้องกับผลลัพธ์การค้นหา (สำหรับแนะนำแท็กที่เกี่ยวข้อง)
    let relatedTagsResult: {tag: string, count: number}[] = [];
    if (novels.length > 0) {
      const tagFrequency: Record<string, number> = {};
      novels.forEach((novelDoc: SearchedNovelResult) => {
        novelDoc.customTags?.forEach((tag: string) => { // ใช้ customTags
          if (!tagQuery.includes(tag)) { // ข้ามแท็กที่ถูกเลือกไว้แล้ว
            tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
          }
        });
      });
      relatedTagsResult = Object.entries(tagFrequency)
        .sort((a, b) => b[1] - a[1]) // เรียงตามความถี่
        .slice(0, 10) // เอา 10 อันดับแรก
        .map(entry => ({ tag: entry[0], count: entry[1] }));
    }

    return NextResponse.json(
      {
        novels,
        mainThemeCategory: mainThemeCategoryData, // หมวดหมู่หลักที่เลือก
        subThemeCategory: subThemeCategoryData,   // หมวดหมู่รองที่เลือก
        relatedTags: relatedTagsResult,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`❌ ข้อผิดพลาดในการค้นหานิยาย:`, error.message, error.stack);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการค้นหานิยาย", details: error.message },
      { status: 500 }
    );
  }
}