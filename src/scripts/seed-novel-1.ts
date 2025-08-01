#!/usr/bin/env ts-node

import { config } from 'dotenv';
import dbConnect from '../backend/lib/mongodb';
import { seedWhisper999Data } from '../data/TheWhisperOf999';
import mongoose from 'mongoose';
import NovelModel from '../backend/models/Novel';
import EpisodeModel from '../backend/models/Episode';
import SceneModel from '../backend/models/Scene';
import ChoiceModel from '../backend/models/Choice';
import CharacterModel from '../backend/models/Character';

// โหลดตัวแปรสภาพแวดล้อมจาก .env และ .env.local
config({ path: '.env' });
config({ path: '.env.local' });

const main = async () => {
  try {
    console.log('🚀 เริ่มต้น Seed Script สำหรับ "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"');
    console.log('===================================================================');

    // ตรวจสอบตัวแปรสภาพแวดล้อมที่จำเป็น
    const requiredEnvVars = ['MONGODB_URI', 'AUTHOR_USERNAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ ตัวแปรสภาพแวดล้อมที่จำเป็นหายไป:', missingVars.join(', '));
      console.log('📝 กรุณาตั้งค่าตัวแปรดังกล่าวในไฟล์ .env หรือ .env.local');
      console.log(`   MONGODB_URI="your_mongodb_connection_string"`);
      console.log(`   AUTHOR_USERNAME="your_author_username"`);
      console.log(`   DB_NAME="your_database_name"`);
      process.exit(1);
    }

    console.log(`📍 MongoDB URI: ${process.env.MONGODB_URI}`);
    console.log(`📁 Database Name: ${process.env.DB_NAME || 'default_db'}`);
    console.log(`👤 Author Username: ${process.env.AUTHOR_USERNAME}`);
    console.log('');

    // เชื่อมต่อฐานข้อมูลโดยใช้ dbConnect จาก lib
    console.log('🔌 กำลังเชื่อมต่อฐานข้อมูล...');
    await dbConnect();
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');
    console.log('');
    
    // ----- START: Cleanup Logic -----
    const novelSlug = 'เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999';
    const novelTitle = 'เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999';

    console.log(`🔍 กำลังค้นหานิยายและข้อมูลที่เกี่ยวข้องเพื่อลบ (slug="${novelSlug}" หรือ title="${novelTitle}")...`);

    const novelsToDelete = await NovelModel.find({
      $or: [
        { slug: novelSlug },
        { title: { $regex: new RegExp(`^${novelTitle}$`, 'i') } },
      ]
    }).select('_id');

    const novelIdsToDelete = novelsToDelete.map(n => n._id);

    if (novelIdsToDelete.length > 0) {
      console.log(`ℹ️  พบนิยาย ${novelIdsToDelete.length} เรื่องที่ต้องลบข้อมูลเกี่ยวข้อง (ก่อน seed ใหม่)`);

      // ลบข้อมูลที่เกี่ยวข้องแบบขนาน
      console.log('🗑️  กำลังลบข้อมูล Episodes, Scenes, Choices, Characters เก่า...');
      const [epRes, scRes, chRes, charRes] = await Promise.all([
        EpisodeModel.deleteMany({ novelId: { $in: novelIdsToDelete } }),
        SceneModel.deleteMany({ novelId: { $in: novelIdsToDelete } }),
        ChoiceModel.deleteMany({ novelId: { $in: novelIdsToDelete } }),
        CharacterModel.deleteMany({ novelId: { $in: novelIdsToDelete } }),
      ]);
      console.log(`✅  ลบ episodes=${epRes.deletedCount}, scenes=${scRes.deletedCount}, choices=${chRes.deletedCount}, characters=${charRes.deletedCount}`);

      // ลบ Novels เอง
      const novelResult = await NovelModel.deleteMany({ _id: { $in: novelIdsToDelete } });
      console.log(`✅  ลบ novels=${novelResult.deletedCount}`);
    } else {
      console.log('ℹ️  ไม่พบนิยายเก่าที่ต้องลบ');
    }

    // ----- END: Cleanup Logic -----

    console.log('📚 กำลังสร้างข้อมูลนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"...');
    await seedWhisper999Data();

    console.log('');
    console.log('🎉 Seed Script สำหรับ "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999" ทำงานเสร็จสิ้น!');
    console.log('===================================================================');

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาดระหว่างการ seed ข้อมูล:', error);
    process.exit(1);
  } finally {
    // ปิดการเชื่อมต่อฐานข้อมูลเสมอ ไม่ว่าจะสำเร็จหรือล้มเหลว
    await mongoose.disconnect();
    console.log('🔌 ปิดการเชื่อมต่อฐานข้อมูลแล้ว');
  }
  
  // Exit the process to prevent hanging
  process.exit(0);
};

// เรียกใช้ main function เพื่อเริ่มการทำงาน
main(); 