// src/app/api/search/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel from "@/backend/models/Novel";
import CategoryModel from "@/backend/models/Category";
import UserModel from "@/backend/models/User";

/**
 * API สำหรับค้นหานิยายและหมวดหมู่
 * สามารถค้นหาด้วยคำสำคัญ (q) และมีออปชันการกรองและเรียงลำดับ
 */
export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || "novel"; // novel, category, author
    const categories = searchParams.getAll("category") || [];
    const tags = searchParams.getAll("tag") || [];
    const status = searchParams.get("status") || "";
    const sortBy = searchParams.get("sort") || "relevance";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    console.log(`📡 API /api/search called with query: "${query}", type: ${type}`);

    // กรณีไม่มีการค้นหา แสดงนิยายยอดนิยมหรือล่าสุด
    if (!query && categories.length === 0 && tags.length === 0 && !status) {
      return NextResponse.json(
        { error: "กรุณาระบุคำค้นหาหรือตัวกรอง" },
        { status: 400 }
      );
    }

    // เตรียมการ query สำหรับ MongoDB
    const searchQuery: any = {
      isDeleted: false,
      visibility: "public",
    };

    // ถ้ามีการระบุ status ชัดเจน เช่น draft, published, completed
    if (status) {
      searchQuery.status = status;
    } else {
      // ถ้าไม่ระบุ status ให้เลือกเฉพาะนิยายที่เผยแพร่ หรือจบแล้ว
      searchQuery.status = { $in: ["published", "completed", "discount"] };
    }

    // กรณีค้นหาด้วยคำสำคัญ
    if (query) {
      // ใช้ text search ของ MongoDB
      searchQuery.$text = { $search: query };
    }

    // กรณีกรองด้วยหมวดหมู่
    if (categories.length > 0) {
      searchQuery.categories = { $in: categories };
    }

    // กรณีกรองด้วยแท็ก
    if (tags.length > 0) {
      searchQuery.tags = { $in: tags };
    }

    // สร้างเงื่อนไขการเรียงลำดับ
    const sort: any = {};
    
    if (query) {
      // ถ้ามีคำค้นหา ให้เรียงตามความเกี่ยวข้องก่อน
      sort.score = { $meta: "textScore" };
    }

    // เรียงลำดับตาม parameter ที่ได้รับ
    switch (sortBy) {
      case "latest":
        sort.lastEpisodePublishedAt = -1;
        sort.updatedAt = -1;
        break;
      case "oldest":
        sort.firstPublishedAt = 1;
        break;
      case "popular":
        sort.viewsCount = -1;
        sort.followersCount = -1;
        break;
      case "rating":
        sort.averageRating = -1;
        sort.viewsCount = -1;
        break;
      case "relevance":
      default:
        // ถ้าไม่มีคำค้นหาและเลือก relevance ให้เรียงตามความนิยม
        if (!query && sortBy === "relevance") {
          sort.viewsCount = -1;
          sort.followersCount = -1;
        }
        break;
    }

    // สร้าง User Model ที่จะใช้สำหรับ populate
    const User = UserModel();
    
    // ดึงข้อมูลนิยายพร้อม populate author
    let results: any;
    let total: number;
    
    switch (type) {
      case "category":
        // ค้นหาหมวดหมู่
        const Category = CategoryModel();
        const categoryQuery: any = {
          isDeleted: false,
          isVisible: true,
        };
        
        if (query) {
          categoryQuery.$text = { $search: query };
        }
        
        total = await Category.countDocuments(categoryQuery);
        results = await Category.find(categoryQuery)
          .sort(query ? { score: { $meta: "textScore" } } : { displayOrder: 1 })
          .skip(skip)
          .limit(limit)
          .lean();
        
        return NextResponse.json(
          {
            categories: results,
            pagination: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit),
            },
          },
          { status: 200 }
        );
        
      case "novel":
      default:
        // ค้นหานิยาย
        total = await NovelModel().countDocuments(searchQuery);
        
        // เตรียม projection ให้เลือกเฉพาะฟิลด์ที่จำเป็น เพื่อเพิ่มประสิทธิภาพ
        const projection = query ? { score: { $meta: "textScore" } } : {};
        
        results = await NovelModel()
          .find(searchQuery, projection)
          .populate({
            path: "author",
            select: "username profile.displayName profile.avatar",
            model: User,
          })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean();
        
        return NextResponse.json(
          {
            novels: results,
            pagination: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit),
            },
          },
          { status: 200 }
        );
    }
  } catch (error: any) {
    console.error(`❌ ข้อผิดพลาดในการค้นหา (query: ${request.url}):`, error.message);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการค้นหาข้อมูล" },
      { status: 500 }
    );
  }
}