// src/app/api/search/novels/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel } from "@/backend/models/Novel"; // Import INovel
import UserModel from "@/backend/models/User";
import CategoryModel from "@/backend/models/Category";

export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);

    // ดึงพารามิเตอร์จาก URL
    const query = searchParams.get("q") || "";
    const categoryId = searchParams.get("category") || ""; // ID ของหมวดหมู่หลัก
    const subCategoryId = searchParams.get("subCategory") || ""; // ID ของหมวดหมู่รอง (ใหม่)
    const tags = searchParams.getAll("tag") || [];
    const sort = searchParams.get("sort") || "relevance"; // relevance, latest, popular, rating, followers, lastSignificantUpdateAt (ใหม่)
    const status = searchParams.get("status") || ""; // published, completed, onHiatus (ไม่รวม discount)
    const explicitContent = searchParams.get("explicit") || ""; // yes, no, "" (all)
    const ageRating = searchParams.get("age") || ""; // everyone, teen, mature17+, adult18+, "" (all)
    const isDiscounted = searchParams.get("discounted"); // true, false, "" (all) (ใหม่)
    const language = searchParams.get("lang") || ""; // th, en, etc. (ใหม่)
    const limit = parseInt(searchParams.get("limit") || "20", 10); // Default to 20 for better pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    console.log(`📡 API /api/search/novels called with query: ${query}, categoryId: ${categoryId}, subCategoryId: ${subCategoryId}, sort: ${sort}, limit: ${limit}, page: ${page}`);

    // สร้างเงื่อนไขการค้นหา
    const searchCriteria: any = {
      isDeleted: false,
      visibility: "public", // โดยทั่วไปจะค้นหาเฉพาะนิยายที่เป็น public
    };

    // กรองตามสถานะ (ไม่รวม discount เพราะ isDiscounted เป็น boolean field แยก)
    if (status && status !== "all" && ["published", "completed", "onHiatus", "archived"].includes(status)) {
      searchCriteria.status = status;
    }

    // กรองตามการจำกัดเนื้อหาผู้ใหญ่
    if (explicitContent === "yes") {
      searchCriteria.isExplicitContent = true;
    } else if (explicitContent === "no") {
      searchCriteria.isExplicitContent = false;
    }

    // กรองตามเรตติ้งอายุ
    if (ageRating && ageRating !== "all") {
      searchCriteria.ageRating = ageRating;
    }
    
    // กรองตามภาษา
    if (language && language !== "all") {
        searchCriteria.language = language;
    }

    // กรองตามการลดราคา (ใหม่)
    if (isDiscounted === "true") {
      searchCriteria.isDiscounted = true;
    } else if (isDiscounted === "false") {
      searchCriteria.isDiscounted = false;
    }

    // กรองตามหมวดหมู่หลัก
    if (categoryId) {
      searchCriteria.categories = categoryId; // Assumes categories field in Novel model stores primary category IDs
    }

    // กรองตามหมวดหมู่รอง (ใหม่)
    if (subCategoryId) {
        searchCriteria.subCategories = subCategoryId; // Assumes subCategories field in Novel model
    }

    // กรองตามแท็ก
    if (tags.length > 0) {
      searchCriteria.tags = { $all: tags }; // $all ensures all specified tags are present
    }

    // ถ้ามีการค้นหาด้วยข้อความ ใช้ text search
    if (query) {
      searchCriteria.$text = {
        $search: query,
        $language: "thai", // สามารถปรับเปลี่ยนหรือทำให้ dynamic ตาม language filter
        $caseSensitive: false,
        $diacriticSensitive: false,
      };
    }

    // กำหนดการเรียงลำดับ
    const sortOptions: any = {};
    if (query && sort === "relevance") {
      sortOptions.score = { $meta: "textScore" };
    } else {
      switch (sort) {
        case "latest": // อัปเดตตอนล่าสุด
          sortOptions.lastEpisodePublishedAt = -1;
          break;
        case "popular": // ยอดวิว
          sortOptions.viewsCount = -1;
          break;
        case "rating": // คะแนนเฉลี่ย
          sortOptions.averageRating = -1;
          break;
        case "followers": // จำนวนผู้ติดตาม
          sortOptions.followersCount = -1;
          break;
        case "lastSignificantUpdateAt": // การอัปเดตสำคัญล่าสุด (เช่น แก้ไขข้อมูลหลัก)
          sortOptions.lastSignificantUpdateAt = -1;
          break;
        default: // ถ้าไม่ระบุหรือ relevance โดยไม่มี query ก็เรียงตามอัปเดตตอนล่าสุด
          sortOptions.lastEpisodePublishedAt = -1;
          break;
      }
    }
    // เพิ่มการเรียงตาม _id เพื่อความเสถียรของ pagination หากค่าที่เรียงซ้ำกัน
    sortOptions._id = -1;


    // สร้าง User Model ที่จะใช้สำหรับ populate
    const User = UserModel();

    // Fields to select
    const selectedFields = "title slug coverImage description status isExplicitContent ageRating tags lastEpisodePublishedAt viewsCount likesCount averageRating followersCount author categories subCategories isDiscounted discountDetails language episodesCount publishedEpisodesCount";

    // ดึงข้อมูลนิยาย
    const novelsQuery = NovelModel()
      .find(searchCriteria)
      .populate({
        path: "author",
        select: "username profile.displayName profile.avatar", // ตรวจสอบว่า path นี้ถูกต้องใน UserModel
        model: User,
      })
      .populate({ // Populate primary categories
        path: "categories",
        select: "name slug iconUrl themeColor", // เลือกฟิลด์ที่จำเป็นจาก Category
        model: CategoryModel(),
      })
      .populate({ // Populate sub-categories (if you have them and want to display them)
        path: "subCategories",
        select: "name slug iconUrl themeColor",
        model: CategoryModel(),
      })
      .select(selectedFields + (query && sort === "relevance" ? " score" : "")) // เพิ่ม score ถ้ามีการ search
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();
      
    if (query && sort === "relevance") {
        // Mongoose may require explicitly adding the $meta field in select when using it in sort
        // For lean queries, this might behave differently, ensure `score` is available if sorting by it.
    }

    const novels = await novelsQuery;

    // นับจำนวนนิยายทั้งหมดที่ตรงกับเงื่อนไข
    const total = await NovelModel().countDocuments(searchCriteria);

    console.log(`✅ Found ${novels.length} novels matching query (total: ${total})`);

    // ดึงข้อมูลหมวดหมู่ที่ถูกเลือก (ถ้ามี) เพื่อแสดงผลบนหน้าค้นหา
    let categoryData = null;
    if (categoryId) {
      categoryData = await CategoryModel().findById(categoryId).select("name slug description coverImageUrl").lean();
    }
    let subCategoryData = null;
    if (subCategoryId) {
        subCategoryData = await CategoryModel().findById(subCategoryId).select("name slug description").lean();
    }

    // สรุปแท็กที่เกี่ยวข้องกับผลลัพธ์การค้นหา (สำหรับแนะนำแท็กที่เกี่ยวข้อง)
    let relatedTags: string[] = [];
    if (novels.length > 0) {
      const tagFrequency: Record<string, number> = {};
      novels.forEach((novel:any) => { // Cast novel to any or use INovel if lean returns typed objects
        novel.tags?.forEach((tag: string) => {
          if (!tags.includes(tag)) { // ข้ามแท็กที่ถูกเลือกไว้แล้ว
            tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
          }
        });
      });
      relatedTags = Object.entries(tagFrequency)
        .sort((a, b) => b[1] - a[1]) // เรียงตามความถี่
        .slice(0, 10) // เอา 10 อันดับแรก
        .map(entry => entry[0]);
    }

    return NextResponse.json(
      {
        novels,
        category: categoryData, // หมวดหมู่หลักที่เลือก
        subCategory: subCategoryData, // หมวดหมู่รองที่เลือก (ใหม่)
        relatedTags,
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