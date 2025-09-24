#!/usr/bin/env ts-node

import { config } from 'dotenv';
import dbConnect from '../backend/lib/mongodb';
import { seedNovelData } from '../data/seed-novel-data';
import { seedCategories } from '../../scripts/seed-categories'; // Import the function
import { seedSubCategories } from '../../scripts/seed-sub-categories'; // Import the sub-category seeder
import NovelModel from '../backend/models/Novel';
import EpisodeModel from '../backend/models/Episode';
import SceneModel from '../backend/models/Scene';
import ChoiceModel from '../backend/models/Choice';
import CharacterModel from '../backend/models/Character';
import CategoryModel from '../backend/models/Category'; // Import Category model

// โหลดตัวแปรสภาพแวดล้อม
config({ path: '.env' });
config({ path: '.env.local' });

const main = async () => {
  try {
    console.log('🚀 เริ่มต้น Seed Script สำหรับ DivWy');
    console.log('================================================');

    // ตรวจสอบตัวแปรสภาพแวดล้อม
    const requiredEnvVars = ['MONGODB_URI', 'AUTHOR_USERNAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ ตัวแปรสภาพแวดล้อมที่จำเป็นหายไป:', missingVars.join(', '));
      console.log('📝 กรุณาตั้งค่าตัวแปรดังกล่าวในไฟล์ .env:');
      console.log(`MONGODB_URI=mongodb://localhost:27017/divwy`);
      console.log(`AUTHOR_USERNAME=your_author_username`);
      console.log(`DB_NAME=DivWy`);
      process.exit(1);
    }

    console.log(`📍 MongoDB URI: ${process.env.MONGODB_URI}`);
    console.log(`📁 Database Name: ${process.env.DB_NAME || 'default_db'}`);
    console.log(`👤 Author Username: ${process.env.AUTHOR_USERNAME}`);
    console.log('');

    // เชื่อมต่อฐานข้อมูลโดยใช้ mongodb.ts config
    console.log('🔌 กำลังเชื่อมต่อฐานข้อมูลผ่าน mongodb.ts...');
    await dbConnect();
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');
    console.log('');
    
    // Step 1: Seed Categories
    console.log('🌿 กำลังสร้างข้อมูลหมวดหมู่ (Categories)...');
    await seedCategories();
    await seedSubCategories(); // Run the sub-category seeder
    console.log('✅ สร้างข้อมูลหมวดหมู่สำเร็จ');
    console.log('');
    
    // Fetch seeded categories to pass to novel seeder
    const categories = await CategoryModel.find({ categoryType: 'genre' }).lean();
    if (categories.length === 0) {
        throw new Error("ไม่พบหมวดหมู่หลังจากการ seed, กรุณาตรวจสอบ 'scripts/seed-categories.js'");
    }

    // ลบข้อมูลเก่าที่เกี่ยวข้องกับนิยายที่จะ seed
    const novelTitlesToDelete = ['Now or Never', 'The Chosen One'];
    console.log(`🔍 กำลังค้นหานิยายและข้อมูลที่เกี่ยวข้องเพื่อลบ: ${novelTitlesToDelete.join(', ')}...`);

    const novelsToDelete = await NovelModel.find({ title: { $in: novelTitlesToDelete } }).select('_id');
    const novelIdsToDelete = novelsToDelete.map(n => n._id);

    if (novelIdsToDelete.length > 0) {
      console.log(`ℹ️  พบนิยาย ${novelIdsToDelete.length} เรื่องที่ต้องลบข้อมูลเกี่ยวข้อง`);
      console.log('🗑️  กำลังลบข้อมูลนิยายเก่า...');
      await EpisodeModel.deleteMany({ novelId: { $in: novelIdsToDelete } });
      await SceneModel.deleteMany({ novelId: { $in: novelIdsToDelete } });
      await ChoiceModel.deleteMany({ novelId: { $in: novelIdsToDelete } });
      await CharacterModel.deleteMany({ novelId: { $in: novelIdsToDelete } });
      await NovelModel.deleteMany({ _id: { $in: novelIdsToDelete } });
      console.log('✅  ลบข้อมูลนิยายเก่าสำเร็จ');
    } else {
      console.log('ℹ️  ไม่พบนิยายเก่าที่ต้องลบ');
    }
    console.log('');

    // Step 2: Run seed data for novels, passing in categories
    console.log('📚 กำลังสร้างข้อมูลนิยายจำลอง...');
    await seedNovelData(categories); // Pass categories to the function

    console.log('');
    console.log('🎉 Seed Script ทำงานเสร็จสิ้น!');
    console.log('================================================');

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error);
    process.exit(1);
  } finally {
    // ปิดการเชื่อมต่อฐานข้อมูล
    const mongoose = (await import('mongoose')).default;
    await mongoose.disconnect();
    console.log('🔌 ปิดการเชื่อมต่อฐานข้อมูลแล้ว');
  }
};

// เรียกใช้ main function
main(); 