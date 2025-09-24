// src/backend/lib/mongodb-script.js
const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;

const dbConnect = async () => {
  if (isConnected) {
    console.log('✅ MongoDB connection already established');
    return;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in your .env file.');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    isConnected = true;
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

module.exports = dbConnect;
