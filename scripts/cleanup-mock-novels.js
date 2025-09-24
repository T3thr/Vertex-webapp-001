// scripts/cleanup-mock-novels.js
require('dotenv').config();
const mongoose = require('mongoose');

// Define simplified schemas for deletion purposes
const NovelSchema = new mongoose.Schema({}, { strict: false, collection: 'novels' });
const EpisodeSchema = new mongoose.Schema({}, { strict: false, collection: 'episodes' });
const SceneSchema = new mongoose.Schema({}, { strict: false, collection: 'scenes' });
const ChoiceSchema = new mongoose.Schema({}, { strict: false, collection: 'choices' });
const CharacterSchema = new mongoose.Schema({}, { strict: false, collection: 'characters' });

const NovelModel = mongoose.models.Novel || mongoose.model('Novel', NovelSchema);
const EpisodeModel = mongoose.models.Episode || mongoose.model('Episode', EpisodeSchema);
const SceneModel = mongoose.models.Scene || mongoose.model('Scene', SceneSchema);
const ChoiceModel = mongoose.models.Choice || mongoose.model('Choice', ChoiceSchema);
const CharacterModel = mongoose.models.Character || mongoose.model('Character', CharacterSchema);

const cleanupMockNovels = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGODB_URI is not defined in .env file");
        }
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB.");

        const novelTitlesToDelete = ['Now or Never', 'The Chosen One'];
        console.log(`🔍 Finding mock novels to delete: ${novelTitlesToDelete.join(', ')}...`);

        const novelsToDelete = await NovelModel.find({ title: { $in: novelTitlesToDelete } }).select('_id');
        const novelIdsToDelete = novelsToDelete.map(n => n._id);

        if (novelIdsToDelete.length > 0) {
            console.log(`ℹ️ Found ${novelIdsToDelete.length} mock novels. Proceeding with deletion of related data...`);

            console.log('🗑️ Deleting related Episodes...');
            const episodeResult = await EpisodeModel.deleteMany({ novelId: { $in: novelIdsToDelete } });
            console.log(`✅ Deleted ${episodeResult.deletedCount} episodes.`);

            console.log('🗑️ Deleting related Scenes...');
            const sceneResult = await SceneModel.deleteMany({ novelId: { $in: novelIdsToDelete } });
            console.log(`✅ Deleted ${sceneResult.deletedCount} scenes.`);

            console.log('🗑️ Deleting related Choices...');
            const choiceResult = await ChoiceModel.deleteMany({ novelId: { $in: novelIdsToDelete } });
            console.log(`✅ Deleted ${choiceResult.deletedCount} choices.`);

            console.log('🗑️ Deleting related Characters...');
            const characterResult = await CharacterModel.deleteMany({ novelId: { $in: novelIdsToDelete } });
            console.log(`✅ Deleted ${characterResult.deletedCount} characters.`);

            console.log('🗑️ Deleting the Novels themselves...');
            const novelResult = await NovelModel.deleteMany({ _id: { $in: novelIdsToDelete } });
            console.log(`✅ Deleted ${novelResult.deletedCount} novels.`);

            console.log('🎉 Mock novel data cleanup completed successfully!');
        } else {
            console.log('🟡 No mock novels found to delete. The database is already clean.');
        }

    } catch (error) {
        console.error("❌ An error occurred during the cleanup process:", error);
    } finally {
        await mongoose.disconnect();
        console.log("✅ MongoDB connection closed.");
    }
};

cleanupMockNovels();
