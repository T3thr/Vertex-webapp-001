// src/app/api/novels/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { NovelStatus, NovelAccessLevel, INovel } from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User"; // IUser ถูก import เพื่อ typing author
import CategoryModel, { ICategory } from "@/backend/models/Category"; // ICategory ถูก import เพื่อ typing categories

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

    const skip = (page - 1) * limit;

    console.log(`📡 API /api/novels called with query: ${request.url}`);

    const query: any = {
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      // isDeleted: false, // NovelModel ไม่ได้มี isDeleted field โดยตรง, ถ้าต้องการ soft delete ต้องเพิ่มใน model
    };
    const sort: any = {};

    if (categorySlug) {
      const category = await CategoryModel.findOne({ slug: categorySlug }).lean();
      if (category) {
        // กรองได้หลายแบบ: ธีมหลัก, ธีมรอง, แท็ก narrative, etc.
        // ตัวอย่างนี้จะเน้น mainTheme ก่อน และเพิ่มการรองรับการค้นหาจาก CategoryType อื่นๆ ที่เหมาะสม
        query.$or = [
          { "themeAssignment.mainTheme.categoryId": category._id },
          { "themeAssignment.subThemes.categoryId": category._id },
          // เพิ่มเงื่อนไขสำหรับ narrativeFocus ถ้า categorySlug สื่อถึงสิ่งนั้น
          { "narrativeFocus.artStyle": category._id },
          { "narrativeFocus.commonTropes": category._id },
          { "narrativeFocus.interactivityLevel": category._id },
        ];
      } else {
        console.warn(`⚠️ Category with slug "${categorySlug}" not found.`);
      }
    }

    if (languageId) {
      query.language = languageId; // language ใน NovelModel เป็น ObjectId อ้างอิง Category
    }

    switch (filter) {
      case "trending": // ผลงานยอดนิยม
        // เรียงตามยอดเข้าชม, ผู้ติดตาม, และวันที่อัปเดตตอนล่าสุด
        // หากต้องการให้ "ร้อนแรง" จริงๆ อาจต้องมี logic ที่ซับซ้อนกว่านี้ เช่น view velocity
        sort["stats.viewsCount"] = -1;
        sort["stats.followersCount"] = -1;
        sort["stats.lastPublishedEpisodeAt"] = -1;
        query.isCompleted = false; // อาจจะเน้นเรื่องที่ยังไม่จบสำหรับ trending
        break;
      case "published": // อัพเดทล่าสุด (New Releases)
        // เรียงตามวันที่เผยแพร่นิยาย หรือวันที่อัปเดตตอนล่าสุด
        sort["publishedAt"] = -1; // วันที่เผยแพร่นิยายครั้งแรก
        sort["stats.lastPublishedEpisodeAt"] = -1; // วันที่เผยแพร่ตอนล่าสุด
        break;
      case "promoted": // ส่วนลด หรือ เรื่องเด่นแนะนำ (Promoted / Featured / Discount)
        // query.isFeatured = true; // สำหรับนิยายที่ถูกตั้งค่า isFeatured
        // หรือกรองจาก activePromotion
        const now = new Date();
        query["monetizationSettings.activePromotion.isActive"] = true;
        query["monetizationSettings.activePromotion.promotionStartDate"] = { $lte: now };
        query["monetizationSettings.activePromotion.promotionEndDate"] = { $gte: now };
        query["monetizationSettings.activePromotion.promotionalPriceCoins"] = { $exists: true, $ne: null }; // มีราคาโปรโมชั่น
        sort["stats.viewsCount"] = -1; // อาจจะเรียงตามความนิยมในหมวดโปรโมชั่น
        sort["monetizationSettings.activePromotion.promotionStartDate"] = -1; // โปรโมชั่นที่เริ่มล่าสุด
        break;
      case "completed": // จบบริบูรณ์
        query.isCompleted = true;
        sort["stats.averageRating"] = -1;
        sort["stats.viewsCount"] = -1;
        sort["publishedAt"] = -1; // เรื่องที่จบแล้วและเผยแพร่ล่าสุด
        break;
      default:
        console.error(`❌ Invalid filter parameter: ${filter}`);
        return NextResponse.json(
          { error: "ตัวกรองไม่ถูกต้อง" },
          { status: 400 }
        );
    }

    const total = await NovelModel.countDocuments(query);
    console.log(`ℹ️ Found ${total} novels matching query:`, JSON.stringify(query), `and sort:`, JSON.stringify(sort));

    // ทำการ type assertion ที่นี่หลังจาก .lean() เพื่อให้ TypeScript เข้าใจโครงสร้าง
    const novels: INovel[] = await NovelModel.find(query)
      .populate<{ author: NonNullable<INovel['author']> }>({ // Ensure author is populated
        path: "author",
        select: "username profile.displayName profile.penName profile.avatarUrl roles", // ตรวจสอบว่า field ถูกต้องตาม UserModel
        model: UserModel,
      })
      .populate<{ themeAssignment: { mainTheme: { categoryId: NonNullable<ICategory> } } }>({
        path: "themeAssignment.mainTheme.categoryId",
        select: "name slug localizations iconUrl color categoryType",
        model: CategoryModel,
      })
      .populate<{ language: NonNullable<ICategory> }>({
        path: "language",
        select: "name slug localizations iconUrl color",
        model: CategoryModel,
      })
      .populate<{ ageRatingCategoryId?: ICategory }>({
        path: "ageRatingCategoryId",
        select: "name slug localizations iconUrl color description", // เพิ่ม description ตามที่ใช้ใน Card
        model: CategoryModel,
      })
      // หากต้องการ populate subThemes หรือ contentWarnings (อาจทำให้ query หนักขึ้น)
      // .populate({
      // path: "themeAssignment.subThemes.categoryId",
      // select: "name slug",
      // model: CategoryModel,
      // })
      // .populate({
      // path: "themeAssignment.contentWarnings",
      // select: "name slug iconUrl",
      // model: CategoryModel,
      // })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(); // ใช้ .lean() เพื่อ performance ที่ดีขึ้นถ้าไม่ต้องการ Mongoose document methods

    console.log(`✅ Fetched ${novels.length} novels for filter: ${filter}`);

    return NextResponse.json(
      {
        novels, // ตอนนี้ novels ควรจะมี type ที่ถูกต้องสำหรับ frontend
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
    console.error(`❌ ข้อผิดพลาดในการดึงนิยาย (filter: ${request.url}):`, error.message, error.stack);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย", details: error.message },
      { status: 500 }
    );
  }
}