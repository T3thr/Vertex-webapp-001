// src/app/api/search/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import CategoryModel from '@/backend/models/Category';
import UserModel from '@/backend/models/User';

export async function GET(request: NextRequest) {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await dbConnect();
    const Novel = NovelModel;
    const Category = CategoryModel;
    const User = UserModel;

    // ดึงพารามิเตอร์การค้นหาจาก URL
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    // ถ้าไม่มีคำค้นหา ให้ส่งค่าว่างกลับไป
    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          novels: [],
          categories: [],
          authors: []
        }
      });
    }

    // ค้นหานิยายที่ตรงกับคำค้นหา
    const novels = await Novel.find(
      { 
        title: { $regex: query, $options: 'i' },
        status: 'published',
        visibility: 'public',
        isDeleted: false
      }
    )
    .sort({ viewsCount: -1 })
    .limit(limit)
    .select('_id title slug coverImage')
    .lean();

    // ค้นหาหมวดหมู่ที่ตรงกับคำค้นหา
    const categories = await Category.find(
      {
        name: { $regex: query, $options: 'i' },
        isVisible: true,
        isDeleted: false
      }
    )
    .sort({ isFeatured: -1, displayOrder: 1 })
    .limit(limit)
    .select('_id name slug iconUrl')
    .lean();

    // ค้นหาผู้เขียนที่ตรงกับคำค้นหา
    const authors = await User.find(
      {
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { 'profile.displayName': { $regex: query, $options: 'i' } }
        ],
        role: 'Writer',
        isActive: true,
        isBanned: false,
        isDeleted: false
      }
    )
    .limit(limit)
    .select('_id username profile.displayName profile.avatar')
    .lean();

    // ส่งข้อมูลกลับ
    return NextResponse.json({
      success: true,
      data: {
        novels,
        categories,
        authors
      }
    });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลข้อเสนอแนะการค้นหา' },
      { status: 500 }
    );
  }
}