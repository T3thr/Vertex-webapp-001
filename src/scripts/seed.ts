#!/usr/bin/env ts-node

import { config } from 'dotenv';
import dbConnect from '../backend/lib/mongodb';
import { seedNovelData } from '../data/seed-novel-data';
import NovelModel from '../backend/models/Novel';
import EpisodeModel from '../backend/models/Episode';
import SceneModel from '../backend/models/Scene';
import ChoiceModel from '../backend/models/Choice';
import CharacterModel from '../backend/models/Character';

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

    // ลบข้อมูลเก่าที่เกี่ยวข้องกับนิยายที่จะ seed
    const novelTitlesToDelete = ['Now or Never', 'The Chosen One'];
    console.log(`🔍 กำลังค้นหานิยายและข้อมูลที่เกี่ยวข้องเพื่อลบ: ${novelTitlesToDelete.join(', ')}...`);

    const novelsToDelete = await NovelModel.find({ title: { $in: novelTitlesToDelete } }).select('_id');
    const novelIdsToDelete = novelsToDelete.map(n => n._id);

    if (novelIdsToDelete.length > 0) {
      console.log(`ℹ️  พบนิยาย ${novelIdsToDelete.length} เรื่องที่ต้องลบข้อมูลเกี่ยวข้อง`);

      // ลบ Episodes ที่เกี่ยวข้อง
      console.log('🗑️  กำลังลบ Episodes เก่า...');
      const episodeResult = await EpisodeModel.deleteMany({ novelId: { $in: novelIdsToDelete } });
      console.log(`✅  ลบ ${episodeResult.deletedCount} episodes สำเร็จ`);

      // ลบ Scenes ที่เกี่ยวข้อง
      console.log('🗑️  กำลังลบ Scenes เก่า...');
      const sceneResult = await SceneModel.deleteMany({ novelId: { $in: novelIdsToDelete } });
      console.log(`✅  ลบ ${sceneResult.deletedCount} scenes สำเร็จ`);

      // ลบ Choices ที่เกี่ยวข้อง
      console.log('🗑️  กำลังลบ Choices เก่า...');
      const choiceResult = await ChoiceModel.deleteMany({ novelId: { $in: novelIdsToDelete } });
      console.log(`✅  ลบ ${choiceResult.deletedCount} choices สำเร็จ`);

      // ลบ Characters ที่เกี่ยวข้อง
      console.log('🗑️  กำลังลบ Characters เก่า...');
      const characterResult = await CharacterModel.deleteMany({ novelId: { $in: novelIdsToDelete } });
      console.log(`✅  ลบ ${characterResult.deletedCount} characters สำเร็จ`);
      
      // ลบ Novels เอง
      console.log('🗑️  กำลังลบ Novels...');
      const novelResult = await NovelModel.deleteMany({ _id: { $in: novelIdsToDelete } });
      console.log(`✅  ลบ ${novelResult.deletedCount} นิยายสำเร็จ`);

    } else {
      console.log('ℹ️  ไม่พบนิยายเก่าที่ต้องลบ');
    }
    console.log('');

    // รัน seed data สำหรับนิยาย
    console.log('📚 กำลังสร้างข้อมูลนิยายจำลอง...');
    await seedNovelData();

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