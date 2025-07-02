// src/scripts/writer-application-seed.ts
// Script สำหรับสร้างข้อมูลเริ่มต้นสำหรับระบบใบสมัครนักเขียน

import dbConnect from '@/backend/lib/mongodb';
import LevelModel from '@/backend/models/Level';
import mongoose from 'mongoose';

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

// ข้อมูลระดับผู้ใช้เริ่มต้น
const defaultLevels = [
  {
    levelNumber: 1,
    title: 'มือใหม่หัดอ่าน',
    xpRequiredForThisLevel: 0,
    xpToNextLevelFromThis: 100,
    description: 'ผู้เริ่มต้นที่เพิ่งเข้ามาใช้งานแพลตฟอร์ม',
    iconUrl: '/images/levels/level1.png',
    themeColor: '#28a745',
    rewardsOnReach: [
      {
        type: 'COINS',
        coinsAwarded: 50,
        description: 'เหรียญต้อนรับสำหรับสมาชิกใหม่'
      }
    ]
  },
  {
    levelNumber: 2,
    title: 'นักอ่านใจดี',
    xpRequiredForThisLevel: 100,
    xpToNextLevelFromThis: 150,
    description: 'เริ่มมีส่วนร่วมกับชุมชนและให้การสนับสนุนนักเขียน',
    iconUrl: '/images/levels/level2.png',
    themeColor: '#17a2b8',
    rewardsOnReach: [
      {
        type: 'COINS',
        coinsAwarded: 75,
        description: 'โบนัสสำหรับการมีส่วนร่วม'
      }
    ]
  },
  {
    levelNumber: 3,
    title: 'นักสำรวจโลกนิยาย',
    xpRequiredForThisLevel: 250,
    xpToNextLevelFromThis: 200,
    description: 'อ่านนิยายหลากหลายประเภทและให้ความคิดเห็น',
    iconUrl: '/images/levels/level3.png',
    themeColor: '#6f42c1',
    rewardsOnReach: [
      {
        type: 'COINS',
        coinsAwarded: 100,
        description: 'รางวัลนักสำรวจ'
      },
      {
        type: 'FEATURE_UNLOCK',
        featureKeyToUnlock: 'advanced_bookmarks',
        description: 'ปลดล็อกระบบบุ๊กมาร์กขั้นสูง'
      }
    ]
  },
  {
    levelNumber: 4,
    title: 'นักวิจารณ์มือโปร',
    xpRequiredForThisLevel: 450,
    xpToNextLevelFromThis: 300,
    description: 'ให้คำวิจารณ์ที่มีคุณภาพและช่วยเหลือนักเขียน',
    iconUrl: '/images/levels/level4.png',
    themeColor: '#fd7e14',
    rewardsOnReach: [
      {
        type: 'COINS',
        coinsAwarded: 150,
        description: 'รางวัลนักวิจารณ์'
      }
    ]
  },
  {
    levelNumber: 5,
    title: 'ผู้เชี่ยวชาญ',
    xpRequiredForThisLevel: 750,
    xpToNextLevelFromThis: 500,
    description: 'มีความรู้ความเข้าใจในวรรณกรรมและเนื้อหาขั้นสูง',
    iconUrl: '/images/levels/level5.png',
    themeColor: '#e83e8c',
    rewardsOnReach: [
      {
        type: 'COINS',
        coinsAwarded: 200,
        description: 'รางวัลผู้เชี่ยวชาญ'
      },
      {
        type: 'FEATURE_UNLOCK',
        featureKeyToUnlock: 'writer_application_eligibility',
        description: 'สิทธิ์สมัครเป็นนักเขียน'
      }
    ]
  }
];

// ข้อมูลหมวดหมู่เริ่มต้น
const defaultGenres = [
  { name: 'โรแมนติก', slug: 'romance', color: '#FF69B4', description: 'เรื่องราวความรักที่อบอุ่นและหวานชื่น' },
  { name: 'แฟนตาซี', slug: 'fantasy', color: '#9370DB', description: 'โลกแห่งเวทมนตร์และสิ่งมหัศจรรย์' },
  { name: 'ลึกลับ/สืบสวน', slug: 'mystery', color: '#2F4F4F', description: 'เรื่องราวการไขปริศนาและความลึกลับ' },
  { name: 'ดราม่า', slug: 'drama', color: '#DC143C', description: 'เรื่องราวชีวิตที่เต็มไปด้วยอารมณ์' },
  { name: 'คอมเมดี้', slug: 'comedy', color: '#FFD700', description: 'เรื่องสนุกสนานและเฮฮา' },
  { name: 'ระทึกขวัญ', slug: 'thriller', color: '#8B0000', description: 'เรื่องที่ทำให้หัวใจเต้นแรง' },
  { name: 'วิทยาศาสตร์', slug: 'sci-fi', color: '#4169E1', description: 'เรื่องราวในอนาคตและเทคโนโลยี' },
  { name: 'ผจญภัย', slug: 'adventure', color: '#228B22', description: 'การเดินทางและการสำรวจ' },
  { name: 'สยองขวัญ', slug: 'horror', color: '#800080', description: 'เรื่องน่ากลัวและลึกลับ' },
  { name: 'ประวัติศาสตร์', slug: 'historical', color: '#8B4513', description: 'เรื่องราวในอดีตกาล' },
  { name: 'ชีวิตจริง', slug: 'slice-of-life', color: '#20B2AA', description: 'เรื่องราวในชีวิตประจำวัน' },
  { name: 'ยูริ (GL)', slug: 'yuri', color: '#FF1493', description: 'ความรักระหว่างผู้หญิงด้วยกัน' },
  { name: 'ยาโออิ (BL)', slug: 'yaoi', color: '#00CED1', description: 'ความรักระหว่างผู้ชายด้วยกัน' },
  { name: 'โรงเรียน', slug: 'school', color: '#32CD32', description: 'เรื่องราวในสถานศึกษา' },
  { name: 'ท่องเวลา', slug: 'time-travel', color: '#6A5ACD', description: 'การเดินทางข้ามกาลเวลา' }
];

async function seedWriterApplicationData() {
  try {
    console.log('🚀 เริ่มต้น seed ข้อมูลระบบใบสมัครนักเขียน...');
    
    await dbConnect();
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');

    // Seed Levels
    console.log('📊 กำลัง seed ข้อมูลระดับผู้ใช้...');
    
    for (const levelData of defaultLevels) {
      const existingLevel = await LevelModel.findOne({ levelNumber: levelData.levelNumber });
      
      if (!existingLevel) {
        await LevelModel.create({
          ...levelData,
          isActive: true,
          schemaVersion: 1
        });
        console.log(`   ✓ สร้างระดับ ${levelData.levelNumber}: ${levelData.title}`);
      } else {
        console.log(`   - ระดับ ${levelData.levelNumber} มีอยู่แล้ว`);
      }
    }

    // Seed Categories/Genres
    console.log('🎭 กำลัง seed ข้อมูลหมวดหมู่...');
    
    for (const genreData of defaultGenres) {
      const existingGenre = await CategoryModel.findOne({ slug: genreData.slug });
      
      if (!existingGenre) {
        await CategoryModel.create({
          ...genreData,
          categoryType: 'genre',
          isActive: true
        });
        console.log(`   ✓ สร้างหมวดหมู่: ${genreData.name}`);
      } else {
        console.log(`   - หมวดหมู่ ${genreData.name} มีอยู่แล้ว`);
      }
    }

    console.log('🎉 Seed ข้อมูลเรียบร้อยแล้ว!');
    console.log(`   📈 ระดับทั้งหมด: ${defaultLevels.length} ระดับ`);
    console.log(`   🎨 หมวดหมู่ทั้งหมด: ${defaultGenres.length} หมวดหมู่`);

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการ seed ข้อมูล:', error);
    throw error;
  }
}

// เรียกใช้งาน script ถ้าไฟล์นี้ถูกรันโดยตรง
if (require.main === module) {
  seedWriterApplicationData()
    .then(() => {
      console.log('✨ Seed สำเร็จ!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seed ล้มเหลว:', error);
      process.exit(1);
    });
}

export default seedWriterApplicationData; 