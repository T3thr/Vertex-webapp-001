#!/usr/bin/env ts-node

import { config } from 'dotenv';
import mongoose from 'mongoose';
import dbConnect from '../backend/lib/mongodb';
import { createTheYearbookSecretNovel, createMockAuthor } from '../data/the-yearbook-secret';
import NovelModel from '../backend/models/Novel';
import EpisodeModel from '../backend/models/Episode';
import SceneModel from '../backend/models/Scene';
import ChoiceModel from '../backend/models/Choice';
import CharacterModel from '../backend/models/Character';

// Load environment variables
config({ path: '.env' });
config({ path: '.env.local' });

const main = async () => {
  try {
    console.log('🚀 Starting Seed Script for "The Yearbook\'s Secret"');
    console.log('================================================');

    // Check environment variables
    const requiredEnvVars = ['MONGODB_URI', 'AUTHOR_USERNAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars.join(', '));
      process.exit(1);
    }

    // Connect to database
    console.log('🔌 Connecting to the database...');
    await dbConnect();
    console.log('✅ Database connection successful');
    console.log('');

    // Delete old data for "The Yearbook's Secret"
    const novelTitleToDelete = "The Yearbook's Secret";
    console.log(`🔍 Searching for novel and related data to delete: "${novelTitleToDelete}"...`);

    const novelToDelete = await NovelModel.findOne({ title: novelTitleToDelete }).select('_id');

    if (novelToDelete) {
      const novelIdToDelete = novelToDelete._id;
      console.log(`ℹ️ Found novel with ID: ${novelIdToDelete}. Deleting related data...`);

      // Delete related data
      console.log('🗑️  Deleting old Episodes...');
      await EpisodeModel.deleteMany({ novelId: novelIdToDelete });
      console.log('🗑️  Deleting old Scenes...');
      await SceneModel.deleteMany({ novelId: novelIdToDelete });
      console.log('🗑️  Deleting old Choices...');
      await ChoiceModel.deleteMany({ novelId: novelIdToDelete });
      console.log('🗑️  Deleting old Characters...');
      await CharacterModel.deleteMany({ novelId: novelIdToDelete });

      // Delete the novel itself
      console.log('🗑️  Deleting the Novel...');
      await NovelModel.deleteOne({ _id: novelIdToDelete });

      console.log('✅  Successfully deleted old data for "The Yearbook\'s Secret".');

    } else {
      console.log('ℹ️  No previous data found for "The Yearbook\'s Secret".');
    }
    console.log('');

    // Create author (or get existing one)
    console.log('👤 Getting or creating author...');
    const authorId = await createMockAuthor();
    console.log(`✅  Author ready: ${authorId}`);

    // Run the seed function for the novel
    console.log('📚 Seeding data for "The Yearbook\'s Secret"...');
    const seededData = await createTheYearbookSecretNovel(authorId);
    console.log(`✅  Successfully seeded "The Yearbook's Secret":
     - Novel: ${seededData.novel.title} (${seededData.novel._id})
     - Episodes: ${seededData.episodes.length}
     - Characters: ${seededData.characters.length}
     - Choices: ${seededData.choices.length}
     - Scenes: ${seededData.scenes.length}`);

    console.log('');
    console.log('🎉 "The Yearbook\'s Secret" seed script finished successfully!');
    console.log('================================================');

  } catch (error) {
    console.error('💥 An error occurred during the seed process:', error);
    process.exit(1);
  } finally {
    // Disconnect from the database
    await mongoose.disconnect();
    console.log('🔌 Database connection closed.');
  }
};

// Execute the main function
main();