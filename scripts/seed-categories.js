// scripts/seed-categories.js
const mongoose = require('mongoose');
const dbConnect = require('../src/backend/lib/mongodb-script'); // Using a script-safe db connector
const CategoryModel = require('../src/backend/models/Category').default; // Use default export for TS module
require('dotenv').config();

const defaultGenres = [
    { name: 'BoyLove', slug: 'boy-love', color: '#87CEEB', categoryType: 'genre' },
    { name: 'GirlLove', slug: 'girl-love', color: '#FFB6C1', categoryType: 'genre' },
    { name: 'โรแมนติก', slug: 'romance', color: '#FF69B4', categoryType: 'genre' },
    { name: 'ทะลุมิติ', slug: 'isekai', color: '#48D1CC', categoryType: 'genre' },
    { name: 'แฟนตาซี', slug: 'fantasy', color: '#9370DB', categoryType: 'genre' },
    { name: 'สยองขวัญ', slug: 'horror', color: '#800080', categoryType: 'genre' },
    { name: 'ตื่นเต้นระทึกขวัญ', slug: 'thriller', color: '#8B0000', categoryType: 'genre' },
    { name: 'แปลงร่างเป็นสัตว์', slug: 'animal-transformation', color: '#228B22', categoryType: 'genre' },
    { name: 'ผจญภัย', slug: 'adventure', color: '#32CD32', categoryType: 'genre' },
    { name: 'มหาลัย', slug: 'university', color: '#1E90FF', categoryType: 'genre' },
    { name: 'ย้อนยุค', slug: 'historical', color: '#8B4513', categoryType: 'genre' },
    { name: 'มาเฟีย', slug: 'mafia', color: '#2F4F4F', categoryType: 'genre' },
    { name: 'ซุปเปอร์สตาร์', slug: 'superstar', color: '#FFD700', categoryType: 'genre' },
    { name: 'ดราม่า', slug: 'drama', color: '#DC143C', categoryType: 'genre' },
    { name: 'Slice Of Life', slug: 'slice-of-life', color: '#20B2AA', categoryType: 'genre' },
    { name: 'การเมือง', slug: 'politics', color: '#708090', categoryType: 'genre' },
    { name: 'ศิลปะการต่อสู้', slug: 'martial-arts', color: '#A52A2A', categoryType: 'genre' },
    { name: 'Sci-fi', slug: 'sci-fi', color: '#4169E1', categoryType: 'genre' },
];

async function seedCategories() {
  await dbConnect();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('🗑️  Deleting existing genre categories...');
    await CategoryModel.deleteMany({ categoryType: 'genre' }, { session });
    console.log('✅  Existing genre categories deleted.');

    if (defaultGenres.length > 0) {
      const genresToCreate = defaultGenres.map(genre => ({
        ...genre,
        description: `Category for ${genre.name}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      console.log('🌱 Seeding new categories...');
      await CategoryModel.insertMany(genresToCreate, { session });
      console.log(`✅ Successfully seeded ${genresToCreate.length} categories.`);
    } else {
      console.log('ℹ️ No default genres to seed.');
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ An error occurred during the seeding process:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

// Export the function
module.exports = { seedCategories, defaultGenres };
