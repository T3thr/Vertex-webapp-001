// scripts/seed-sub-categories.js
const mongoose = require('mongoose');
const dbConnect = require('../src/backend/lib/mongodb-script'); // Using a script-safe db connector
const CategoryModel = require('../src/backend/models/Category').default; // Use default export for TS module
require('dotenv').config();

const defaultSubGenres = [
  { name: 'โรแมนติกคอเมดี้', slug: 'rom-com', color: '#FFC0CB', categoryType: 'sub_genre' },
  { name: 'แฟนตาซีสูง', slug: 'high-fantasy', color: '#C8A2C8', categoryType: 'sub_genre' },
  { name: 'สเปซโอเปร่า', slug: 'space-opera', color: '#000080', categoryType: 'sub_genre' },
  { name: 'สืบสวนสอบสวน', slug: 'detective', color: '#A9A9A9', categoryType: 'sub_genre' },
  { name: 'โรงเรียน', slug: 'school-life', color: '#F0E68C', categoryType: 'sub_genre' },
];

async function seedSubCategories() {
  await dbConnect();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('🗑️  Deleting existing sub-genre categories...');
    await CategoryModel.deleteMany({ categoryType: 'sub_genre' }, { session });
    console.log('✅  Existing sub-genre categories deleted.');

    if (defaultSubGenres.length > 0) {
      const subGenresToCreate = defaultSubGenres.map(genre => ({
        ...genre,
        description: `Sub-category for ${genre.name}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      console.log('🌱 Seeding new sub-categories...');
      await CategoryModel.insertMany(subGenresToCreate, { session });
      console.log(`✅ Successfully seeded ${subGenresToCreate.length} sub-categories.`);
    } else {
      console.log('ℹ️ No default sub-genres to seed.');
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ An error occurred during the sub-category seeding process:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

// Export the function
module.exports = { seedSubCategories, defaultSubGenres };
