#!/usr/bin/env ts-node

import { config } from 'dotenv';
import dbConnect from '../backend/lib/mongodb';
import { createWhisper999Novel } from '../data/TheWhisperOf999';
import mongoose from 'mongoose';
import NovelModel from '../backend/models/Novel';
import EpisodeModel from '../backend/models/Episode';
import SceneModel from '../backend/models/Scene';
import ChoiceModel from '../backend/models/Choice';
import CharacterModel from '../backend/models/Character';
import UserModel from '../backend/models/User';
import UserProfileModel from '../backend/models/UserProfile';
import StoryMapModel from '../backend/models/StoryMap';
import bcrypt from 'bcryptjs';

// โหลดตัวแปรสภาพแวดล้อมจาก .env และ .env.local
config({ path: '.env' });
config({ path: '.env.local' });

const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME || 'whisper_author';

/**
 * ฟังก์ชันสร้างผู้แต่งจำลองในฐานข้อมูล
 * @returns ObjectId ของผู้แต่งที่สร้างขึ้น
 */
const createMockAuthor = async () => {
  const author = await UserModel.findOne({ username: AUTHOR_USERNAME });
  if (author) {
    // Ensure profile exists
    if (!author.profile) {
        let userProfile = await UserProfileModel.findOne({ userId: author._id });
        if (!userProfile) {
            userProfile = new UserProfileModel({
                userId: author._id,
                displayName: 'นักเขียนเงา',
                penNames: ['ผู้เขียนเสียงกระซิบ', 'Shadow Scribe'],
                bio: 'นักเขียนผู้หลงใหลในเรื่องราวลึกลับและสยองขวัญ',
            });
            await userProfile.save();
        }
        author.profile = userProfile._id;
        await author.save();
    }
    console.log(`✅ พบผู้แต่งในฐานข้อมูล: ${author.username} (${author._id})`);
    return author._id;
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash('password123', salt);

  const newAuthor = new UserModel({
    username: AUTHOR_USERNAME,
    email: 'author_whisper@novelmaze.com',
    password: hashedPassword,
    accounts: [{
      provider: 'credentials',
      providerAccountId: 'author_whisper@novelmaze.com',
      type: 'credentials'
    }],
    roles: ['Writer'],
    primaryPenName: 'นักเขียนเงา',
    isEmailVerified: true,
    isActive: true,
    isBanned: false,
    isDeleted: false,
  });

  const savedAuthor = await newAuthor.save();

  const authorProfile = new UserProfileModel({
      userId: savedAuthor._id,
      displayName: 'นักเขียนเงา',
      penNames: ['ผู้เขียนเสียงกระซิบ', 'Shadow Scribe'],
      bio: 'นักเขียนผู้หลงใหลในเรื่องราวลึกลับและสยองขวัญ',
  });
  await authorProfile.save();
  
  savedAuthor.profile = authorProfile._id;
  await savedAuthor.save();

  console.log(`✅ สร้างผู้แต่งใหม่: ${savedAuthor.username} (${savedAuthor._id})`);
  return savedAuthor._id;
};

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
      console.log('🗑️  กำลังลบข้อมูล Episodes, Scenes, Choices, Characters, StoryMaps เก่า...');
      
      // ลบ StoryMaps ทั้งหมดที่เกี่ยวข้องกับ Novel นี้ (ทั้ง Novel-level และ Episode-level)
      // ก่อนอื่นต้องหา Episodes ที่เกี่ยวข้องกับ Novel เหล่านี้
      const episodesToDelete = await EpisodeModel.find({ novelId: { $in: novelIdsToDelete } }).select('_id');
      const episodeIdsToDelete = episodesToDelete.map(ep => ep._id);
      
      const smRes = await StoryMapModel.deleteMany({ 
        $or: [
          { novelId: { $in: novelIdsToDelete } }, // Novel-level StoryMaps
          { episodeId: { $in: episodeIdsToDelete } } // Episode-level StoryMaps
        ]
      });
      console.log(`🗑️  ลบ StoryMaps: ${smRes.deletedCount} รายการ`);
      
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

    console.log('👤 กำลังสร้างข้อมูลผู้แต่ง...');
    const authorId = await createMockAuthor();
    console.log(`✅ สร้างผู้แต่งสำเร็จ: ${authorId}`);

    console.log('📚 กำลังสร้างข้อมูลนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"...');
    const whisperData = await createWhisper999Novel(authorId);
    console.log(`✅ สร้างนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999" สำเร็จ:
    - นิยาย: ${whisperData.novel._id}
    - ตอน: ${whisperData.episodes.length} ตอน
    - ตัวละคร: ${whisperData.characters.length} ตัว
    - ตัวเลือก: ${whisperData.choices.length} ตัวเลือก
    - ฉาก: ${whisperData.scenes.length} ฉาก
    - StoryMap: ${whisperData.storyMap._id}`);

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