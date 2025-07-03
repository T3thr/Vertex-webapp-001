#!/usr/bin/env ts-node

import { config } from 'dotenv';
import dbConnect from '../backend/lib/mongodb';
import { runSeedNovelData } from '../data/seed-novel-data';

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

    // รัน seed data สำหรับนิยาย
    console.log('📚 กำลังสร้างข้อมูลนิยายจำลอง...');
    await runSeedNovelData();

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