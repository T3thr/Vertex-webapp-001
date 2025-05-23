// src/app/api/novels/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { NovelStatus, NovelAccessLevel, INovel, NovelContentType, IPromotionDetails } from "@/backend/models/Novel";
import UserModel from "@/backend/models/User"; // IUser can be used for typing if needed, but PopulatedAuthor is more specific for card
import CategoryModel, { ICategory } from "@/backend/models/Category";
import { NovelCardData, PopulatedAuthor, PopulatedCategory } from "@/components/NovelCard"; // Import the specific data structure for the frontend
import mongoose from "mongoose";

// Helper function to ensure models are initialized
// Mongoose automatically handles model compilation, but this can be an explicit check.
const ensureModels = () => {
  NovelModel;
  UserModel;
  CategoryModel;
};

export async function GET(request: Request) {
  try {
    await dbConnect();
    ensureModels(); // ตรวจสอบว่า model ถูก initialize แล้ว

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "trending";
    const limit = parseInt(searchParams.get("limit") || "8", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const categorySlug = searchParams.get("categorySlug");
    const languageId = searchParams.get("languageId");
    const novelType = searchParams.get("novelType"); // สำหรับกรองประเภทนิยาย เช่น visual-novel

    const skip = (page - 1) * limit;

    console.log(`📡 [API /api/novels] Called with URL: ${request.url}`);

    const query: any = {
      status: NovelStatus.PUBLISHED, // ดึงเฉพาะนิยายที่เผยแพร่แล้ว
      accessLevel: NovelAccessLevel.PUBLIC, // ดึงเฉพาะนิยายที่เป็นสาธารณะ
      isDeleted: false, // ดึงเฉพาะนิยายที่ไม่ถูกลบ (soft delete)
    };
    const sort: any = {};

    if (novelType === "visual-novel") {
      query["sourceType.type"] = NovelContentType.INTERACTIVE_FICTION; // กรอง Visual Novel โดยตรง
      console.log(`ℹ️ [API /api/novels] Filtering for Visual Novels (Interactive Fiction)`);
    }

    if (categorySlug) {
      const category = await CategoryModel.findOne({ slug: categorySlug }).lean();
      if (category) {
        console.log(`ℹ️ [API /api/novels] Filtering by category: ${category.name} (ID: ${category._id})`);
        // สร้างเงื่อนไข $or เพื่อค้นหาจากหลาย fields ที่เกี่ยวข้องกับ category
        const categoryConditions = [
          { "themeAssignment.mainTheme.categoryId": category._id },
          { "themeAssignment.subThemes.categoryId": category._id },
          { "narrativeFocus.artStyle": category._id },
          { "narrativeFocus.commonTropes": category._id },
          { "narrativeFocus.interactivityLevel": category._id },
          { "narrativeFocus.narrativePacingTags": category._id },
          { "narrativeFocus.primaryConflictTypes": category._id },
          { "narrativeFocus.targetAudienceProfileTags": category._id },
          { "narrativeFocus.lengthTag": category._id },
          // สามารถเพิ่ม field อื่นๆ ที่เป็น ObjectId อ้างอิง Category ได้ตามต้องการ
        ];
        if (query.$or) {
          query.$and = [ { $or: query.$or } , { $or: categoryConditions }];
        } else {
          query.$or = categoryConditions;
        }

      } else {
        console.warn(`⚠️ [API /api/novels] Category with slug "${categorySlug}" not found.`);
        // ถ้าไม่เจอ category อาจจะคืนค่าว่าง หรือไม่กรองเลยก็ได้ ขึ้นอยู่กับ requirement
        // return NextResponse.json({ novels: [], pagination: { total: 0, page, limit, totalPages:0 }}, { status: 200 });
      }
    }

    if (languageId) {
      // ตรวจสอบว่าเป็น ObjectId ที่ถูกต้องหรือไม่ ก่อนนำไป query
      if (mongoose.Types.ObjectId.isValid(languageId)) {
        query.language = languageId; // language ใน NovelModel เป็น ObjectId อ้างอิง Category
         console.log(`ℹ️ [API /api/novels] Filtering by languageId: ${languageId}`);
      } else {
        console.warn(`⚠️ [API /api/novels] Invalid languageId format: "${languageId}". Skipping language filter.`);
      }
    }

    switch (filter) {
      case "trending": // ผลงานยอดนิยม
        sort["stats.trendingStats.trendingScore"] = -1; // ใช้ trendingScore เป็นหลัก
        sort["stats.viewsCount"] = -1; // สำรองด้วย viewsCount
        sort["stats.followersCount"] = -1;
        sort["stats.lastPublishedEpisodeAt"] = -1;
        // query.isCompleted = false; // อาจจะไม่จำเป็นต้องจำกัดว่ายังไม่จบเสมอไปสำหรับ trending
        console.log(`ℹ️ [API /api/novels] Applying filter: trending`);
        break;
      case "published": // อัพเดทล่าสุด (New Releases)
        sort["publishedAt"] = -1; // วันที่เผยแพร่นิยายครั้งแรก
        sort["stats.lastPublishedEpisodeAt"] = -1; // วันที่เผยแพร่ตอนล่าสุด
        console.log(`ℹ️ [API /api/novels] Applying filter: published (new releases)`);
        break;
      case "promoted": // เรื่องเด่นแนะนำ หรือ ส่วนลด
        const now = new Date();
        // query.isFeatured = true; // สำหรับนิยายที่ถูกตั้งค่า isFeatured โดยแอดมิน
        // หรือ กรองจากโปรโมชั่นที่ active
         query.$or = [
            { isFeatured: true },
            {
                "monetizationSettings.activePromotion.isActive": true,
                "monetizationSettings.activePromotion.promotionStartDate": { $lte: now },
                "monetizationSettings.activePromotion.promotionEndDate": { $gte: now },
                "monetizationSettings.activePromotion.promotionalPriceCoins": { $exists: true, $ne: null }
            }
        ];
        sort["stats.viewsCount"] = -1;
        sort["publishedAt"] = -1;
        console.log(`ℹ️ [API /api/novels] Applying filter: promoted (featured or active promotions)`);
        break;
      case "completed": // จบบริบูรณ์
        query.isCompleted = true;
        sort["stats.averageRating"] = -1;
        sort["stats.viewsCount"] = -1;
        sort["publishedAt"] = -1; // เรื่องที่จบแล้วและเผยแพร่ล่าสุด
        console.log(`ℹ️ [API /api/novels] Applying filter: completed`);
        break;
      default:
        console.error(`❌ [API /api/novels] Invalid filter parameter: ${filter}`);
        return NextResponse.json(
          { error: "ตัวกรองไม่ถูกต้อง" },
          { status: 400 }
        );
    }

    const total = await NovelModel.countDocuments(query);
    console.log(`ℹ️ [API /api/novels] Found ${total} novels matching query:`, JSON.stringify(query), `Sort:`, JSON.stringify(sort));

    // ใช้ NovelCardData[] เป็น type สำหรับผลลัพธ์เพื่อให้สอดคล้องกับ frontend
    const novels: NovelCardData[] = await NovelModel.find(query)
      .populate<{ author: PopulatedAuthor }>({
        path: "author",
        select: "username profile.displayName profile.penName profile.avatarUrl roles",
        model: UserModel, // Explicitly provide model for robustness
      })
      .populate<{ themeAssignment: { mainTheme: { categoryId: PopulatedCategory } } }>({
        path: "themeAssignment.mainTheme.categoryId",
        select: "name slug localizations iconUrl color categoryType",
        model: CategoryModel,
      })
      .populate<{ language: PopulatedCategory }>({
        path: "language",
        select: "name slug localizations iconUrl color",
        model: CategoryModel,
      })
      .populate<{ ageRatingCategoryId?: PopulatedCategory }>({
        path: "ageRatingCategoryId",
        select: "name slug localizations iconUrl color description", // description ถูกใช้ใน Card
        model: CategoryModel,
      })
      // พิจารณา populate เพิ่มเติมตามความจำเป็น เช่น subThemes, contentWarnings หาก NovelCard ต้องการแสดง
      // .populate<{ themeAssignment: { subThemes?: { categoryId: PopulatedCategory }[] } }>({
      //   path: "themeAssignment.subThemes.categoryId",
      //   select: "name slug iconUrl color categoryType",
      //   model: CategoryModel,
      // })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }); // lean() เพื่อ performance และ virtuals: true เผื่อมี virtuals ที่ต้องการใช้

    console.log(`✅ [API /api/novels] Fetched ${novels.length} novels for filter: ${filter}, page: ${page}, limit: ${limit}`);

    return NextResponse.json(
      {
        novels, // novels ตอนนี้เป็น type NovelCardData[]
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
    console.error(`❌ [API /api/novels] Error fetching novels (URL: ${request.url}):`, error.message, error.stack);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย", details: error.message },
      { status: 500 }
    );
  }
}