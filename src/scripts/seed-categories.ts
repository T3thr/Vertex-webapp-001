// src/scripts/seed-categories.ts
// Script สำหรับสร้าง Categories พื้นฐานในระบบ

import dbConnect from '../backend/lib/mongodb';
import CategoryModel, { CategoryType, CategoryVisibility } from '../backend/models/Category';

interface CategorySeed {
  name: string;
  slug: string;
  categoryType: CategoryType;
  description?: string;
  color?: string;
  iconUrl?: string;
  displayOrder?: number;
  isSystemDefined?: boolean;
  visibility?: CategoryVisibility;
}

const categories: CategorySeed[] = [
  // THEMES - หมวดหมู่หลัก
  {
    name: 'ทั่วไป',
    slug: 'general',
    categoryType: CategoryType.THEME,
    description: 'หมวดหมู่ทั่วไป สำหรับนิยายที่ไม่อยู่ในหมวดหมู่เฉพาะ',
    color: '#8bc34a',
    displayOrder: 0,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'โรแมนซ์',
    slug: 'romance',
    categoryType: CategoryType.THEME,
    description: 'เรื่องราวความรักและความสัมพันธ์',
    color: '#e91e63',
    displayOrder: 1,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'แฟนตาซี',
    slug: 'fantasy',
    categoryType: CategoryType.THEME,
    description: 'โลกแห่งเวทมนตร์และสิ่งมหัศจรรย์',
    color: '#9c27b0',
    displayOrder: 2,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'ไซไฟ',
    slug: 'sci-fi',
    categoryType: CategoryType.THEME,
    description: 'วิทยาศาสตร์และเทคโนโลยีในอนาคต',
    color: '#2196f3',
    displayOrder: 3,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'ระทึกขวัญ',
    slug: 'thriller',
    categoryType: CategoryType.THEME,
    description: 'เรื่องราวที่ทำให้ตื่นเต้นและลุ้นระทึก',
    color: '#ff5722',
    displayOrder: 4,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'ลึกลับ',
    slug: 'mystery',
    categoryType: CategoryType.THEME,
    description: 'การไขปริศนาและความลึกลับ',
    color: '#795548',
    displayOrder: 5,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'ผจญภัย',
    slug: 'adventure',
    categoryType: CategoryType.THEME,
    description: 'การเดินทางและการผจญภัย',
    color: '#ff9800',
    displayOrder: 6,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'ดราม่า',
    slug: 'drama',
    categoryType: CategoryType.THEME,
    description: 'เรื่องราวที่เน้นอารมณ์และความรู้สึก',
    color: '#607d8b',
    displayOrder: 7,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'ตลก',
    slug: 'comedy',
    categoryType: CategoryType.THEME,
    description: 'เรื่องราวที่สนุกสนานและตลกขบขัน',
    color: '#ffeb3b',
    displayOrder: 8,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'สยองขวัญ',
    slug: 'horror',
    categoryType: CategoryType.THEME,
    description: 'เรื่องราวที่น่ากลัวและสยองขวัญ',
    color: '#424242',
    displayOrder: 9,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },

  // LANGUAGES - ภาษา
  {
    name: 'ไทย',
    slug: 'thai',
    categoryType: CategoryType.LANGUAGE,
    description: 'ภาษาไทย',
    displayOrder: 0,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'English',
    slug: 'english',
    categoryType: CategoryType.LANGUAGE,
    description: 'ภาษาอังกฤษ',
    displayOrder: 1,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: '日本語',
    slug: 'japanese',
    categoryType: CategoryType.LANGUAGE,
    description: 'ภาษาญี่ปุ่น',
    displayOrder: 2,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: '한국어',
    slug: 'korean',
    categoryType: CategoryType.LANGUAGE,
    description: 'ภาษาเกาหลี',
    displayOrder: 3,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: '中文',
    slug: 'chinese',
    categoryType: CategoryType.LANGUAGE,
    description: 'ภาษาจีน',
    displayOrder: 4,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },

  // AGE_RATING - เรทติ้งอายุ
  {
    name: 'ทุกวัย',
    slug: 'all-ages',
    categoryType: CategoryType.AGE_RATING,
    description: 'เหมาะสำหรับทุกวัย',
    color: '#4caf50',
    displayOrder: 0,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: '13+',
    slug: 'teen',
    categoryType: CategoryType.AGE_RATING,
    description: 'เหมาะสำหรับวัยรุ่น 13 ปีขึ้นไป',
    color: '#2196f3',
    displayOrder: 1,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: '16+',
    slug: 'mature-teen',
    categoryType: CategoryType.AGE_RATING,
    description: 'เหมาะสำหรับวัยรุ่นตอนปลาย 16 ปีขึ้นไป',
    color: '#ff9800',
    displayOrder: 2,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: '18+',
    slug: 'adult',
    categoryType: CategoryType.AGE_RATING,
    description: 'เหมาะสำหรับผู้ใหญ่ 18 ปีขึ้นไป',
    color: '#f44336',
    displayOrder: 3,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },

  // CONTENT_WARNING - คำเตือนเนื้อหา
  {
    name: 'ความรุนแรง',
    slug: 'violence',
    categoryType: CategoryType.CONTENT_WARNING,
    description: 'มีเนื้อหาที่มีความรุนแรง',
    color: '#f44336',
    displayOrder: 0,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'เนื้อหาผู้ใหญ่',
    slug: 'mature-content',
    categoryType: CategoryType.CONTENT_WARNING,
    description: 'มีเนื้อหาสำหรับผู้ใหญ่',
    color: '#e91e63',
    displayOrder: 1,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'ภาษาหยาบคาย',
    slug: 'strong-language',
    categoryType: CategoryType.CONTENT_WARNING,
    description: 'มีการใช้ภาษาหยาบคาย',
    color: '#ff9800',
    displayOrder: 2,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'เนื้อหาที่อาจกระทบจิตใจ',
    slug: 'disturbing-content',
    categoryType: CategoryType.CONTENT_WARNING,
    description: 'มีเนื้อหาที่อาจกระทบต่อจิตใจ',
    color: '#9c27b0',
    displayOrder: 3,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },

  // ART_STYLE - สไตล์ศิลปะ
  {
    name: 'อนิเมะ',
    slug: 'anime',
    categoryType: CategoryType.ART_STYLE,
    description: 'สไตล์อนิเมะญี่ปุ่น',
    color: '#e91e63',
    displayOrder: 0,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'เรียลิสติก',
    slug: 'realistic',
    categoryType: CategoryType.ART_STYLE,
    description: 'สไตล์เสมือนจริง',
    color: '#795548',
    displayOrder: 1,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'การ์ตูน',
    slug: 'cartoon',
    categoryType: CategoryType.ART_STYLE,
    description: 'สไตล์การ์ตูน',
    color: '#ffeb3b',
    displayOrder: 2,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'พิกเซล',
    slug: 'pixel-art',
    categoryType: CategoryType.ART_STYLE,
    description: 'สไตล์พิกเซลอาร์ต',
    color: '#4caf50',
    displayOrder: 3,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },

  // INTERACTIVITY_LEVEL - ระดับการโต้ตอบ
  {
    name: 'Kinetic Novel',
    slug: 'kinetic',
    categoryType: CategoryType.INTERACTIVITY_LEVEL,
    description: 'นิยายที่ไม่มีการเลือก อ่านเรื่อยเปื่อย',
    color: '#2196f3',
    displayOrder: 0,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'Visual Novel',
    slug: 'visual-novel',
    categoryType: CategoryType.INTERACTIVITY_LEVEL,
    description: 'นิยายที่มีการเลือกและเส้นทางเรื่อง',
    color: '#9c27b0',
    displayOrder: 1,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  },
  {
    name: 'Interactive Fiction',
    slug: 'interactive-fiction',
    categoryType: CategoryType.INTERACTIVITY_LEVEL,
    description: 'นิยายโต้ตอบที่มีระบบเกมเพลย์',
    color: '#ff9800',
    displayOrder: 2,
    isSystemDefined: true,
    visibility: CategoryVisibility.PUBLIC
  }
];

async function seedCategories() {
  try {
    console.log('🌱 เริ่มต้น seeding categories...');
    
    await dbConnect();
    console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');

    // ลบ categories เก่าที่เป็น system defined (ถ้ามี)
    await CategoryModel.deleteMany({ isSystemDefined: true });
    console.log('🗑️  ลบ categories เก่าที่เป็น system defined');

    // สร้าง categories ใหม่
    const createdCategories = await CategoryModel.insertMany(
      categories.map(cat => ({
        ...cat,
        isActive: true,
        visibility: cat.visibility || CategoryVisibility.PUBLIC,
        isSystemDefined: cat.isSystemDefined !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    );

    console.log(`✅ สร้าง ${createdCategories.length} categories สำเร็จ`);

    // แสดงสรุปตาม categoryType
    const summary = categories.reduce((acc, cat) => {
      acc[cat.categoryType] = (acc[cat.categoryType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 สรุปการสร้าง Categories:');
    Object.entries(summary).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} รายการ`);
    });

    console.log('\n🎉 Seeding categories เสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการ seed categories:', error);
    process.exit(1);
  }
}

// เรียกใช้ function หากไฟล์นี้ถูกรันโดยตรง
if (require.main === module) {
  seedCategories()
    .then(() => {
      console.log('✨ Script เสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script ล้มเหลว:', error);
      process.exit(1);
    });
}

export default seedCategories;
