// scripts/fix-storymap-indexes.ts
// 🔧 Migration Script: แก้ไข StoryMap indexes เพื่อป้องกัน duplicate key error
// รันสคริปต์นี้เพื่อลบ index เก่าที่มีปัญหาและสร้าง index ใหม่ที่ถูกต้อง

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// โหลด environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

async function fixStoryMapIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('storymaps');

    // 1. แสดง indexes ปัจจุบัน
    console.log('\n📋 Current indexes:');
    const currentIndexes = await collection.indexes();
    currentIndexes.forEach((index: any) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // 2. ลบ index เก่าที่มีปัญหา (ถ้ามี)
    console.log('\n🗑️ Dropping problematic indexes...');
    
    try {
      // ลบ index ที่อาจมีปัญหากับ storyVariables.variableId
      const indexesToDrop = [
        'storyVariables.variableId_1',
        'StoryVariablesVariableIdIndex', // ชื่อเก่าที่อาจมี
      ];

      for (const indexName of indexesToDrop) {
        try {
          await collection.dropIndex(indexName);
          console.log(`  ✅ Dropped index: ${indexName}`);
        } catch (error: any) {
          if (error.codeName === 'IndexNotFound') {
            console.log(`  ⚠️ Index not found (already removed): ${indexName}`);
          } else {
            console.log(`  ⚠️ Could not drop index ${indexName}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log('  ⚠️ Some indexes could not be dropped (may not exist)');
    }

    // 3. สร้าง index ใหม่ที่ถูกต้อง
    console.log('\n🔨 Creating new indexes...');
    
    try {
      // สร้าง sparse index สำหรับ storyVariables.variableId
      await collection.createIndex(
        { "storyVariables.variableId": 1 },
        {
          unique: true,
          sparse: true,
          name: "StoryVariablesVariableIdUniqueIndex",
          partialFilterExpression: {
            $and: [
              { "storyVariables.variableId": { $exists: true } },
              { "storyVariables.variableId": { $ne: null } },
              { "storyVariables.variableId": { $ne: "" } }
            ]
          }
        }
      );
      console.log('  ✅ Created index: StoryVariablesVariableIdUniqueIndex');
    } catch (error: any) {
      if (error.code === 11000 || error.codeName === 'IndexOptionsConflict') {
        console.log('  ⚠️ Index already exists with same specification');
      } else {
        throw error;
      }
    }

    // 4. ทำความสะอาดข้อมูลที่มี null/undefined variableId
    console.log('\n🧹 Cleaning up documents with null/undefined variableIds...');
    
    const documentsWithNullVariables = await collection.find({
      "storyVariables.variableId": { $in: [null, undefined, ""] }
    }).toArray();

    console.log(`  Found ${documentsWithNullVariables.length} documents with null/undefined variableIds`);

    if (documentsWithNullVariables.length > 0) {
      for (const doc of documentsWithNullVariables) {
        // กรอง storyVariables ที่มี variableId ที่ถูกต้องเท่านั้น
        const cleanedVariables = (doc.storyVariables || []).filter((v: any) => 
          v && v.variableId && v.variableId !== null && v.variableId !== ""
        );

        await collection.updateOne(
          { _id: doc._id },
          { $set: { storyVariables: cleanedVariables } }
        );

        console.log(`  ✅ Cleaned document: ${doc._id} (removed ${(doc.storyVariables?.length || 0) - cleanedVariables.length} invalid variables)`);
      }
    }

    // 5. แสดง indexes หลังการแก้ไข
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach((index: any) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
      if (index.partialFilterExpression) {
        console.log(`    Partial filter:`, JSON.stringify(index.partialFilterExpression));
      }
    });

    console.log('\n✅ StoryMap indexes fixed successfully!');
    console.log('\n📝 Summary:');
    console.log(`  - Cleaned ${documentsWithNullVariables.length} documents`);
    console.log(`  - Created sparse index for storyVariables.variableId`);
    console.log(`  - Index now allows empty arrays and filters out null values`);

  } catch (error) {
    console.error('\n❌ Error fixing StoryMap indexes:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// รันสคริปต์
fixStoryMapIndexes()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
