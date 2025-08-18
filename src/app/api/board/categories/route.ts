// src/app/api/board/categories/route.ts
// API endpoint สำหรับดึงข้อมูลหมวดหมู่สำหรับกระทู้

import dbConnect from "@/backend/lib/mongodb";
import CategoryModel, { CategoryType } from "@/backend/models/Category";
import { NextRequest, NextResponse } from "next/server";

// ดึงรายการหมวดหมู่สำหรับกระทู้
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const limit = Number(searchParams.get("limit")) || 100;
    
    // สร้าง query filter
    const filter: any = { 
      isActive: true,
      visibility: "public"
    };
    
    // กรองตามประเภทหมวดหมู่ที่ใช้กับกระทู้
    if (type !== "all") {
      filter.categoryType = type;
    } else {
      // ถ้าเป็น "all" ให้ดึงเฉพาะหมวดหมู่ที่เกี่ยวข้องกับกระทู้
      filter.categoryType = {
        $in: [
          CategoryType.TAG,
          CategoryType.THEME,
          CategoryType.GENRE,
          CategoryType.SUB_GENRE,
          CategoryType.FANDOM
        ]
      };
    }
    
    // ดึงข้อมูลหมวดหมู่จากฐานข้อมูล
    const categories = await CategoryModel.find(filter)
      .select('_id name slug description categoryType iconUrl color')
      .sort({ displayOrder: 1, name: 1 })
      .limit(limit)
      .lean();
    
    return NextResponse.json({ 
      success: true, 
      categories 
    });
  } catch (error) {
    console.error("Error fetching board categories:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่" },
      { status: 500 }
    );
  }
}
