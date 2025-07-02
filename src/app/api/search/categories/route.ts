// src/app/api/search/categories/route.ts
// API สำหรับดึงหมวดหมู่/ประเภทนิยาย

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import mongoose from 'mongoose';

// Simple Category schema for this API
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  categoryType: { type: String, default: 'genre' },
  isActive: { type: Boolean, default: true },
  description: String,
  color: String
}, {
  timestamps: true,
  collection: 'categories'
});

const CategoryModel = mongoose.models.Category || mongoose.model('Category', CategorySchema);

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'genre';
    const limit = parseInt(searchParams.get('limit') || '50');

    // ดึงหมวดหมู่ที่ active
    const categories = await CategoryModel.find({
      categoryType: type,
      isActive: true
    })
    .select('_id name slug description color')
    .sort({ name: 1 })
    .limit(limit)
    .lean();

    // ถ้าไม่มีหมวดหมู่ในฐานข้อมูล ให้สร้างข้อมูลเริ่มต้น
    if (categories.length === 0 && type === 'genre') {
      const defaultGenres = [
        { name: 'โรแมนติก', slug: 'romance', color: '#FF69B4' },
        { name: 'แฟนตาซี', slug: 'fantasy', color: '#9370DB' },
        { name: 'ลึกลับ/สืบสวน', slug: 'mystery', color: '#2F4F4F' },
        { name: 'ดราม่า', slug: 'drama', color: '#DC143C' },
        { name: 'คอมเมดี้', slug: 'comedy', color: '#FFD700' },
        { name: 'ระทึกขวัญ', slug: 'thriller', color: '#8B0000' },
        { name: 'วิทยาศาสตร์', slug: 'sci-fi', color: '#4169E1' },
        { name: 'ผจญภัย', slug: 'adventure', color: '#228B22' },
        { name: 'สยองขวัญ', slug: 'horror', color: '#800080' },
        { name: 'ประวัติศาสตร์', slug: 'historical', color: '#8B4513' },
        { name: 'ชีวิตจริง', slug: 'slice-of-life', color: '#20B2AA' },
        { name: 'ยูริ (GL)', slug: 'yuri', color: '#FF1493' },
        { name: 'ยาโออิ (BL)', slug: 'yaoi', color: '#00CED1' },
        { name: 'โรงเรียน', slug: 'school', color: '#32CD32' },
        { name: 'ท่องเวลา', slug: 'time-travel', color: '#6A5ACD' }
      ];

      for (const genre of defaultGenres) {
        await CategoryModel.create({
          ...genre,
          categoryType: 'genre',
          description: `หมวดหมู่${genre.name}`,
          isActive: true
        });
      }

      // ดึงข้อมูลใหม่หลังสร้าง
      const newCategories = await CategoryModel.find({
        categoryType: type,
        isActive: true
      })
      .select('_id name slug description color')
      .sort({ name: 1 })
      .limit(limit)
      .lean();

      return NextResponse.json({
        success: true,
        data: newCategories,
        message: 'สร้างหมวดหมู่เริ่มต้นเรียบร้อย'
      });
    }

    return NextResponse.json({
      success: true,
      data: categories,
      total: categories.length
    });

  } catch (error) {
    console.error('Categories API Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่' },
      { status: 500 }
    );
  }
}
