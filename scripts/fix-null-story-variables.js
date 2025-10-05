// scripts/fix-null-story-variables.js
// 🔥 CRITICAL FIX: Clean up StoryMaps with null variableId values
// This script fixes existing database documents that have null values in storyVariables array

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function fixNullStoryVariables() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const StoryMap = mongoose.connection.collection('storymaps');

    // Find all StoryMaps
    console.log('\n📊 Analyzing StoryMaps...');
    const allStoryMaps = await StoryMap.find({}).toArray();
    console.log(`Found ${allStoryMaps.length} StoryMaps`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const storyMap of allStoryMaps) {
      const hasNullVariables = storyMap.storyVariables?.some(v => 
        v.variableId === null || 
        v.variableId === undefined || 
        v.variableId === '' ||
        v.variableId === 'null' ||
        v.variableId === 'undefined'
      );

      if (hasNullVariables) {
        console.log(`\n🔧 Fixing StoryMap: ${storyMap._id} (${storyMap.title})`);
        console.log(`  - Original variables count: ${storyMap.storyVariables?.length || 0}`);
        
        // Filter out variables with null/invalid IDs
        const cleanedVariables = (storyMap.storyVariables || []).filter(v => 
          v.variableId && 
          v.variableId !== null && 
          v.variableId !== undefined && 
          v.variableId !== '' &&
          v.variableId !== 'null' &&
          v.variableId !== 'undefined'
        );

        console.log(`  - Cleaned variables count: ${cleanedVariables.length}`);
        console.log(`  - Removed: ${(storyMap.storyVariables?.length || 0) - cleanedVariables.length} invalid variables`);

        try {
          // Use $set to explicitly replace the storyVariables array
          const result = await StoryMap.updateOne(
            { _id: storyMap._id },
            { 
              $set: { 
                storyVariables: cleanedVariables,
                updatedAt: new Date()
              } 
            }
          );

          if (result.modifiedCount > 0) {
            console.log(`  ✅ Fixed successfully`);
            fixedCount++;
          } else {
            console.log(`  ⚠️  No changes made`);
          }
        } catch (error) {
          console.error(`  ❌ Error fixing StoryMap ${storyMap._id}:`, error.message);
          errorCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`  Total StoryMaps: ${allStoryMaps.length}`);
    console.log(`  Fixed: ${fixedCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Clean: ${allStoryMaps.length - fixedCount - errorCount}`);
    console.log('='.repeat(60));

    if (fixedCount > 0) {
      console.log('\n✅ Database cleanup completed successfully!');
      console.log('   All null storyVariable IDs have been removed.');
    } else {
      console.log('\n✅ No issues found - database is clean!');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the fix
console.log('🔧 StoryMap Null Variable Cleanup Script');
console.log('=' .repeat(60));
fixNullStoryVariables();

