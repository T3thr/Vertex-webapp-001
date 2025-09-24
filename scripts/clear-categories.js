// scripts/clear-categories.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function clearCategories() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in your .env file.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB.');

    const database = client.db(); // Use default DB from connection string
    const categoriesCollection = database.collection('categories');

    const countBefore = await categoriesCollection.countDocuments();
    if (countBefore === 0) {
        console.log('✅ No categories found to delete. Collection is already empty.');
        return;
    }

    console.log(`🔍 Found ${countBefore} categories. Deleting...`);

    const deleteResult = await categoriesCollection.deleteMany({});

    console.log(`✅ Successfully deleted ${deleteResult.deletedCount} categories.`);
    
  } catch (error) {
    console.error('❌ An error occurred while clearing categories:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed.');
  }
}

clearCategories();
