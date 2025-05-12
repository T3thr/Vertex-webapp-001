// src/app/api/search/novels/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import UserModel from '@/backend/models/User';
import CategoryModel from '@/backend/models/Category';

export async function GET(request: NextRequest) {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await dbConnect();
    const Novel = NovelModel();
    const User = UserModel();
    const Category = CategoryModel();

    // ดึงพารามิเตอร์การค้นหาจาก URL
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const language = searchParams.get('language') || '';
    const ageRating = searchParams.get('ageRating') || '';
    const isPremium = searchParams.get('isPremium') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // สร้างเงื่อนไขการค้นหา
    const searchConditions: any = {
      status: 'published', // แสดงเฉพาะนิยายที่เผยแพร่แล้ว
      visibility: 'public', // แสดงเฉพาะนิยายที่เป็นสาธารณะ
      isDeleted: false
    };

    // ค้นหาด้วยข้อความ
    if (query) {
      searchConditions.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ];
    }
    
    // กรองตามหมวดหมู่
    if (category) {
      try {
        // หาหมวดหมู่จาก slug
        const categoryDoc = await Category.findOne({ slug: category, isDeleted: false });
        if (categoryDoc) {
          searchConditions.categories = categoryDoc._id;
        }
      } catch (error) {
        console.error('Error finding category:', error);
      }
    }
    
    // กรองตามสถานะ
    if (status && ['published', 'completed', 'onHiatus'].includes(status)) {
      searchConditions.status = status;
    }
    
    // กรองตามภาษา
    if (language) {
      searchConditions.language = language;
    }
    
    // กรองตามการจัดเรตติ้ง
    if (ageRating) {
      searchConditions.ageRating = ageRating;
    }
    
    // กรองตามประเภทพรีเมียม
    if (isPremium === 'true') {
      searchConditions.isPremium = true;
    } else if (isPremium === 'false') {
      searchConditions.isPremium = false;
    }
    
    // กำหนดการเรียงลำดับ
    let sortOptions: any = {};
    
    switch (sortBy) {
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'popularity':
        sortOptions = { viewsCount: -1 };
        break;
      case 'rating':
        sortOptions = { averageRating: -1 };
        break;
      case 'mostLiked':
        sortOptions = { likesCount: -1 };
        break;
      case 'mostEpisodes':
        sortOptions = { publishedEpisodesCount: -1 };
        break;
      case 'lastUpdated':
      default:
        sortOptions = { lastSignificantUpdateAt: -1 };
        break;
    }
    
    // ดึงจำนวนนิยายทั้งหมดที่ตรงกับเงื่อนไข
    const totalNovels = await Novel.countDocuments(searchConditions);
    
    // ดึงข้อมูลนิยายจากฐานข้อมูล
    const novels = await Novel.find(searchConditions)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', '_id username profile.displayName profile.avatar')
      .populate('categories', '_id name slug')
      .lean();
    
    // คำนวณข้อมูลการแบ่งหน้า
    const totalPages = Math.ceil(totalNovels / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // ส่งข้อมูลกลับ
    return NextResponse.json({
      success: true,
      data: novels,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalNovels,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error searching novels:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการค้นหานิยาย' },
      { status: 500 }
    );
  }
}