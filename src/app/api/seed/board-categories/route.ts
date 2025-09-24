// src/app/api/seed/board-categories/route.ts
// API endpoint สำหรับ seed หมวดหมู่ Board

import dbConnect from '@/backend/lib/mongodb';
import CategoryModel, { CategoryType } from '@/backend/models/Category';
import { NextResponse } from 'next/server';

const boardCategories = [
  {
    name: 'พูดคุยทั่วไป',
    slug: 'general-discussion',
    categoryType: CategoryType.TAG,
    description: 'พูดคุยเรื่องทั่วไป แชร์ประสบการณ์ และแลกเปลี่ยนความคิดเห็น',
    color: '#3b82f6'
  },
  {
    name: 'รีวิวนิยาย',
    slug: 'novel-reviews',
    categoryType: CategoryType.TAG,
    description: 'รีวิวและวิจารณ์นิยายที่คุณอ่าน',
    color: '#10b981'
  },
  {
    name: 'คำถามและปัญหา',
    slug: 'questions-problems',
    categoryType: CategoryType.TAG,
    description: 'ถามคำถามและขอความช่วยเหลือ',
    color: '#f59e0b'
  },
  {
    name: 'แนะนำนิยาย',
    slug: 'novel-recommendations',
    categoryType: CategoryType.TAG,
    description: 'แนะนำนิยายที่น่าสนใจให้ผู้อื่น',
    color: '#8b5cf6'
  },
  {
    name: 'สปอยล์',
    slug: 'spoilers',
    categoryType: CategoryType.TAG,
    description: 'พูดคุยเรื่องสปอยล์ของนิยายต่างๆ',
    color: '#ef4444'
  },
  {
    name: 'ทฤษฎีและคาดเดา',
    slug: 'theories-predictions',
    categoryType: CategoryType.TAG,
    description: 'ทฤษฎีและคาดเดาเรื่องราวในนิยาย',
    color: '#06b6d4'
  }
];

export async function POST() {
  try {
    console.log('🚀 เริ่มต้น seed หมวดหมู่สำหรับ Board...');
    
    await dbConnect();
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');

    const createdCategories = [];
    const existingCategories = [];

    for (const categoryData of boardCategories) {
      const existingCategory = await CategoryModel.findOne({ 
        slug: categoryData.slug,
        categoryType: categoryData.categoryType 
      });
      
      if (!existingCategory) {
        const newCategory = await CategoryModel.create({
          ...categoryData,
          isActive: true,
          isSystemDefined: true,
          visibility: 'public',
          displayOrder: 0
        });
        createdCategories.push(newCategory);
        console.log(`   ✓ สร้างหมวดหมู่: ${categoryData.name}`);
      } else {
        existingCategories.push(existingCategory);
        console.log(`   - หมวดหมู่ ${categoryData.name} มีอยู่แล้ว`);
      }
    }

    console.log('🎉 Seed หมวดหมู่ Board เรียบร้อยแล้ว!');

    return NextResponse.json({
      success: true,
      message: 'Seed หมวดหมู่ Board สำเร็จ',
      data: {
        created: createdCategories.length,
        existing: existingCategories.length,
        total: boardCategories.length,
        categories: [...createdCategories, ...existingCategories]
      }
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการ seed หมวดหมู่ Board:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'เกิดข้อผิดพลาดในการ seed หมวดหมู่ Board',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
