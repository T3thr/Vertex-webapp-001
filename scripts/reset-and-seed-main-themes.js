// scripts/reset-and-seed-main-themes.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

// รายการธีมหลักที่ต้องการให้มีในระบบ
const defaultGenres = [
  { name: 'BoyLove', slug: 'boy-love', color: '#87CEEB', displayOrder: 1, categoryType: 'genre' },
  { name: 'GirlLove', slug: 'girl-love', color: '#FFB6C1', displayOrder: 2, categoryType: 'genre' },
  { name: 'โรแมนติก', slug: 'romance', color: '#FF69B4', displayOrder: 3, categoryType: 'genre' },
  { name: 'ทะลุมิติ', slug: 'isekai', color: '#48D1CC', displayOrder: 4, categoryType: 'genre' },
  { name: 'แฟนตาซี', slug: 'fantasy', color: '#9370DB', displayOrder: 5, categoryType: 'genre' },
  { name: 'สยองขวัญ', slug: 'horror', color: '#800080', displayOrder: 6, categoryType: 'genre' },
  { name: 'ตื่นเต้นระทึกขวัญ', slug: 'thriller', color: '#8B0000', displayOrder: 7, categoryType: 'genre' },
  { name: 'แปลงร่างเป็นสัตว์', slug: 'animal-transformation', color: '#228B22', displayOrder: 8, categoryType: 'genre' },
  { name: 'ผจญภัย', slug: 'adventure', color: '#32CD32', displayOrder: 9, categoryType: 'genre' },
  { name: 'มหาลัย', slug: 'university', color: '#1E90FF', displayOrder: 10, categoryType: 'genre' },
  { name: 'ย้อนยุค', slug: 'historical', color: '#8B4513', displayOrder: 11, categoryType: 'genre' },
  { name: 'มาเฟีย', slug: 'mafia', color: '#2F4F4F', displayOrder: 12, categoryType: 'genre' },
  { name: 'ซุปเปอร์สตาร์', slug: 'superstar', color: '#FFD700', displayOrder: 13, categoryType: 'genre' },
  { name: 'ดราม่า', slug: 'drama', color: '#DC143C', displayOrder: 14, categoryType: 'genre' },
  { name: 'Slice Of Life', slug: 'slice-of-life', color: '#20B2AA', displayOrder: 15, categoryType: 'genre' },
  { name: 'การเมือง', slug: 'politics', color: '#708090', displayOrder: 16, categoryType: 'genre' },
  { name: 'ศิลปะการต่อสู้', slug: 'martial-arts', color: '#A52A2A', displayOrder: 17, categoryType: 'genre' },
  { name: 'Sci-fi', slug: 'sci-fi', color: '#4169E1', displayOrder: 18, categoryType: 'genre' },
];

async function resetAndSeedMainThemes() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in your .env file.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB.');

    const database = client.db();
    const categoriesCollection = database.collection('categories');

    // 1. ลบหมวดหมู่ 'genre' ทั้งหมดที่มีอยู่
    console.log("🔥 Deleting existing 'genre' categories...");
    const deleteResult = await categoriesCollection.deleteMany({ categoryType: 'genre' });
    console.log(`✅ Successfully deleted ${deleteResult.deletedCount} 'genre' categories.`);

    // 2. สร้างหมวดหมู่ 'genre' ใหม่จากรายการที่กำหนด
    console.log("🌱 Seeding new 'genre' categories...");
    const genresToCreate = defaultGenres.map(genre => ({
      ...genre,
      description: `Category for ${genre.name}`,
      isActive: true,
      isSystemDefined: true,
      visibility: 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const insertResult = await categoriesCollection.insertMany(genresToCreate);
    console.log(`✅ Successfully inserted ${insertResult.insertedCount} new 'genre' categories.`);
    
  } catch (error) {
    console.error('❌ An error occurred during the reset and seed process:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed.');
  }
}

resetAndSeedMainThemes();
