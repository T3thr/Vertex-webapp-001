// scripts/read-novel-titles.js
require('dotenv').config();
const mongoose = require('mongoose');

// Define a minimal schema to read the titles
const NovelSchema = new mongoose.Schema({
    title: String
}, { strict: false, collection: 'novels' });

const NovelModel = mongoose.models.Novel || mongoose.model('Novel', NovelSchema);

const readNovelTitles = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGODB_URI is not defined in .env file");
        }
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB.");

        console.log("🔍 Reading all novel titles from the database...");
        const novels = await NovelModel.find({}, 'title').lean();

        if (novels.length > 0) {
            console.log("--- List of Novel Titles ---");
            novels.forEach(novel => {
                console.log(`- "${novel.title}"`);
            });
            console.log("--------------------------");
        } else {
            console.log("🟡 No novels found in the database.");
        }

    } catch (error) {
        console.error("❌ An error occurred while reading novel titles:", error);
    } finally {
        await mongoose.disconnect();
        console.log("✅ MongoDB connection closed.");
    }
};

readNovelTitles();
