// scripts/read-categories.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function readCategories() {
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

    console.log('🔍 Reading categories with categoryType: "genre"...');
    const genres = await categoriesCollection.find({ categoryType: 'genre' }).project({ name: 1, slug: 1, _id: 0 }).toArray();

    if (genres.length === 0) {
      console.log('🟡 No categories with categoryType "genre" found.');
    } else {
      console.log('📚 Found categories:');
      console.table(genres);
    }

  } catch (error) {
    console.error('❌ An error occurred while reading categories:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed.');
  }
}

readCategories();
