// src/app/api/search/tags/popular/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';

export async function GET(request: NextRequest) {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await dbConnect();
    const Novel = NovelModel();

    // ดึงพารามิเตอร์การค้นหาจาก URL
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // คำสั่ง aggregation เพื่อค้นหาแท็กที่นิยม
    const popularTags = await Novel.aggregate([
      // กรองเฉพาะนิยายที่เผยแพร่แล้วและไม่ถูกลบ
      { $match: { status: 'published', visibility: 'public', isDeleted: false } },
      
      // แตกอาร์เรย์แท็กเป็นเอกสารแยก
      { $unwind: '$tags' },
      
      // จัดกลุ่มตามแท็กและนับจำนวน
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      
      // เรียงลำดับตามจำนวนมากไปน้อย
      { $sort: { count: -1 } },
      
      // จำกัดจำนวนผลลัพธ์
      { $limit: limit },
      
      // จัดรูปแบบผลลัพธ์
      {
        $project: {
          _id: 0,
          tag: '$_id',
          count: 1
        }
      }
    ]);

    // ส่งข้อมูลกลับ
    return NextResponse.json({
      success: true,
      data: popularTags
    });
  } catch (error) {
    console.error('Error fetching popular tags:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแท็กยอดนิยม' },
      { status: 500 }
    );
  }
}