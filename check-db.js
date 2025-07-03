import mongoose from 'mongoose';
import NovelModel from './src/backend/models/Novel.js';
import UserModel from './src/backend/models/User.js';

const checkDatabase = async () => {
  try {
    await mongoose.connect('mongodb+srv://Admin:OyVfFya79MdCxire@cluster0.1mkjj5e.mongodb.net/');
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');

    const novels = await NovelModel.find({}).select('title author stats');
    console.log('📚 นิยายที่พบในฐานข้อมูล:');
    
    if (novels.length === 0) {
      console.log('❌ ไม่พบนิยายในฐานข้อมูล');
    } else {
      novels.forEach(novel => {
        console.log(`- ${novel.title} | Views: ${novel.stats?.viewsCount || 0} | Author ID: ${novel.author || 'Unknown'}`);
      });
    }
    
    // ตรวจสอบจำนวนเอกสารในแต่ละ collection
    const novelCount = await NovelModel.countDocuments();
    console.log(`\n📊 สรุป:`);
    console.log(`- นิยาย: ${novelCount} เรื่อง`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
};

checkDatabase(); 