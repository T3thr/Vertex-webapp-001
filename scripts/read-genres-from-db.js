// scripts/read-genres-from-db.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function readGenresFromDb() {
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

    console.log("\n🔍 Reading all 'genre' categories from the database, sorted by 'displayOrder'...");
    
    const genres = await categoriesCollection.find({ categoryType: 'genre' })
      .sort({ displayOrder: 1 })
      .project({ name: 1, slug: 1, displayOrder: 1, _id: 0 }) // Select only specific fields
      .toArray();

    if (genres.length === 0) {
      console.log('🟡 No categories with categoryType "genre" found in the database.');
    } else {
      console.log('👇 Found the following genres in the database:');
      console.table(genres);
    }
    
  } catch (error) {
    console.error('❌ An error occurred while reading from the database:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed.');
  }
}

readGenresFromDb();
