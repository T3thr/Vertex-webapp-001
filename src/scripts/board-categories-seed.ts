// src/scripts/board-categories-seed.ts
// Script สำหรับสร้างหมวดหมู่เริ่มต้นสำหรับ Board

import dbConnect from '@/backend/lib/mongodb';
import CategoryModel, { CategoryType } from '@/backend/models/Category';

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

async function seedBoardCategories() {
  try {
    console.log('🚀 เริ่มต้น seed หมวดหมู่สำหรับ Board...');
    
    await dbConnect();
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');

    for (const categoryData of boardCategories) {
      const existingCategory = await CategoryModel.findOne({ 
        slug: categoryData.slug,
        categoryType: categoryData.categoryType 
      });
      
      if (!existingCategory) {
        await CategoryModel.create({
          ...categoryData,
          isActive: true,
          isSystemDefined: true,
          visibility: 'public',
          displayOrder: 0
        });
        console.log(`   ✓ สร้างหมวดหมู่: ${categoryData.name}`);
      } else {
        console.log(`   - หมวดหมู่ ${categoryData.name} มีอยู่แล้ว`);
      }
    }

    console.log('🎉 Seed หมวดหมู่ Board เรียบร้อยแล้ว!');
    console.log(`   📂 หมวดหมู่ทั้งหมด: ${boardCategories.length} หมวดหมู่`);

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการ seed หมวดหมู่ Board:', error);
    throw error;
  }
}

// รัน script ถ้าเรียกใช้โดยตรง
if (require.main === module) {
  seedBoardCategories()
    .then(() => {
      console.log('✅ Seed หมวดหมู่ Board เสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed หมวดหมู่ Board ล้มเหลว:', error);
      process.exit(1);
    });
}

export default seedBoardCategories;
