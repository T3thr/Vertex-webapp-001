import dbConnect from '@/backend/lib/mongodb';
import CategoryModel, { CategoryType } from '@/backend/models/Category';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const isActive = searchParams.get('isActive') === 'true';

    // Build query
    const query: any = {};
    
    if (type) {
      query.categoryType = type.toUpperCase();
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    
    // Default to active categories only
    if (!searchParams.has('isActive')) {
      query.isActive = true;
    }

    // ดึงหมวดหมู่ตามเงื่อนไข
    const categories = await CategoryModel.find(query)
      .select('_id name slug description categoryType color iconUrl displayOrder')
      .sort({ displayOrder: 1, name: 1 })
      .limit(limit)
      .lean();

    // แปลง _id เป็น string
    const categoriesWithId = categories.map(category => ({
      ...category,
      _id: category._id.toString()
    }));

    return NextResponse.json({
      success: true,
      categories: categoriesWithId,
      count: categoriesWithId.length
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่'
      },
      { status: 500 }
    );
  }
}
