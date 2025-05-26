// src/app/api/search/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb'; //
import CategoryModel, { ICategory, CategoryType, CategoryVisibility } from '@/backend/models/Category'; //
import mongoose from "mongoose";

// Interface สำหรับ Category ที่จะส่งกลับ
interface CategorySearchResult extends Pick<ICategory,
  "_id" | "name" | "slug" | "description" | "iconUrl" | "coverImageUrl" | "color" | "displayOrder" | "isPromoted" | "categoryType"
> {
  localizations?: ICategory["localizations"]; //
  novelCount?: number; // จาก usageStats
}

export async function GET(request: NextRequest) {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await dbConnect(); //

    // ดึงพารามิเตอร์การค้นหาจาก URL
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as CategoryType | null; // ประเภทของหมวดหมู่
    const parentId = searchParams.get('parentId') || null; // ID หมวดหมู่แม่
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const q = searchParams.get('q')?.trim() || ''; // คำค้นหาชื่อหมวดหมู่
    const includeChildrenCount = searchParams.get('includeChildrenCount') === 'true'; // ต้องการจำนวนหมวดหมู่ย่อยหรือไม่
    const forNovelCreation = searchParams.get('forNovelCreation') === 'true'; // ดึงหมวดหมู่สำหรับหน้าสร้างนิยายหรือไม่ (อาจมีเงื่อนไขพิเศษ)


    // สร้างเงื่อนไขการค้นหา
    const query: mongoose.FilterQuery<ICategory> = {
      visibility: CategoryVisibility.PUBLIC, // แสดงเฉพาะ public categories
      isActive: true, // แสดงเฉพาะ active categories
      // isSystemDefined: false, // อาจจะไม่ต้องการให้ user เห็น system-defined บางประเภท ยกเว้นจำเป็น
    };

    // กรองตามประเภทหมวดหมู่
    if (type && Object.values(CategoryType).includes(type)) {
      query.categoryType = type;
    }

    // กรองตามหมวดหมู่หลัก (ถ้ามี)
    if (parentId === "null" || (parentId === null && type)) { // "null" string or actual null for top-level
      query.parentCategoryId = null; //
    } else if (parentId) {
      query.parentCategoryId = new mongoose.Types.ObjectId(parentId);
    }

    // ถ้ามีการค้นหาด้วยข้อความ
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } }, // ค้นหาชื่อภาษาหลัก
        { "localizations.name": { $regex: q, $options: 'i' } } // ค้นหาชื่อใน localizations
      ];
    }

    // เงื่อนไขพิเศษสำหรับหน้าสร้างนิยาย
    // เช่น ไม่แสดงหมวดหมู่ที่เป็น editorial_tag, event_tag, sensitive_choice_topic โดยตรง
    if (forNovelCreation) {
        query.categoryType = { $nin: [
            CategoryType.EDITORIAL_TAG,
            CategoryType.EVENT_TAG,
            CategoryType.SENSITIVE_CHOICE_TOPIC,
            CategoryType.MEDIA_TYPE, // โดยทั่วไปผู้ใช้ไม่เลือก media type โดยตรง
            // CategoryType.OTHER, // อาจจะไม่ให้เลือก other โดยตรง
        ]};
    }


    // ดึงข้อมูลหมวดหมู่จากฐานข้อมูล
    const totalCategories = await CategoryModel.countDocuments(query);

    const categoriesQuery = CategoryModel.find(query)
      .sort({ isPromoted: -1, displayOrder: 1, "usageStats.novelCount": -1, name: 1 }) // เรียงตามโปรโมท, ลำดับ, จำนวนนิยาย, ชื่อ
      .skip((page - 1) * limit)
      .limit(limit)
      .select('_id name slug description iconUrl coverImageUrl color displayOrder isPromoted categoryType localizations usageStats.novelCount') // เลือก fields ที่ต้องการ
      .lean();

    const categoriesRaw = await categoriesQuery;

    const categoriesResult: CategorySearchResult[] = categoriesRaw.map(cat => ({
        _id: cat._id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        iconUrl: cat.iconUrl,
        coverImageUrl: cat.coverImageUrl,
        color: cat.color,
        displayOrder: cat.displayOrder,
        isPromoted: cat.isPromoted,
        categoryType: cat.categoryType,
        localizations: cat.localizations,
        novelCount: cat.usageStats?.novelCount // ดึง novelCount จาก usageStats
    }));

    // (Optional) หากต้องการนับจำนวน children ของแต่ละ category ที่ดึงมา
    if (includeChildrenCount) {
        for (let i = 0; i < categoriesResult.length; i++) {
            const childCount = await CategoryModel.countDocuments({
                parentCategoryId: categoriesResult[i]._id,
                isActive: true,
                visibility: CategoryVisibility.PUBLIC
            });
            (categoriesResult[i] as any).childrenCount = childCount; // เพิ่ม field childrenCount เข้าไป
        }
    }


    // คำนวณข้อมูลการแบ่งหน้า
    const totalPages = Math.ceil(totalCategories / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // ส่งข้อมูลกลับ
    return NextResponse.json({
      success: true,
      data: categoriesResult,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCategories,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error: any) { // Explicitly type error as any or Error
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่', details: error.message },
      { status: 500 }
    );
  }
}
