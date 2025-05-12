// src/app/api/search/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import CategoryModel from '@/backend/models/Category';

export async function GET(request: NextRequest) {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await dbConnect();
    const Category = CategoryModel();

    // ดึงพารามิเตอร์การค้นหาจาก URL
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'genre'; // เริ่มต้นเป็นประเภท genre
    const parentId = searchParams.get('parentId') || null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // สร้างเงื่อนไขการค้นหา
    const query: any = {
      isVisible: true,
      isDeleted: false
    };

    // กรองตามประเภทหมวดหมู่
    if (type) {
      query.categoryType = type;
    }

    // กรองตามหมวดหมู่หลัก (ถ้ามี)
    if (parentId) {
      query.parentCategory = parentId;
    } else if (parentId === null && type === 'genre') {
      // ถ้าต้องการเฉพาะหมวดหมู่หลัก (top-level)
      query.level = 0;
    }

    // ดึงข้อมูลหมวดหมู่จากฐานข้อมูล
    const totalCategories = await Category.countDocuments(query);
    const categories = await Category.find(query)
      .sort({ isFeatured: -1, displayOrder: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('_id name slug description iconUrl coverImageUrl themeColor displayOrder level isFeatured')
      .lean();

    // คำนวณข้อมูลการแบ่งหน้า
    const totalPages = Math.ceil(totalCategories / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // ส่งข้อมูลกลับ
    return NextResponse.json({
      success: true,
      data: categories,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCategories,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่' },
      { status: 500 }
    );
  }
}