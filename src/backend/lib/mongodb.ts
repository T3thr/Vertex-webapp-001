// src/backend/lib/mongodb.ts
// นำเข้า mongoose สำหรับเชื่อมต่อกับ MongoDB และกำหนดประเภทให้ชัดเจนด้วย TypeScript
// ปรับปรุงให้การเชื่อมต่อเร็วที่สุดโดยไม่ใช้ cache จ่ก mongo ใช้ redis เก็ย cache แทนเพือ speed insight ของ web
import mongoose, { ConnectOptions, Mongoose } from 'mongoose';

// ดึงค่าตัวแปรจากไฟล์ .env และกำหนดประเภทให้เป็น string หรือ undefined
const MONGODB_URI: string | undefined = process.env.MONGODB_URI;
const DB_NAME: string = process.env.DB_NAME || 'DivWy';

// ตรวจสอบว่า MONGODB_URI ถูกกำหนดไว้หรือไม่
if (!MONGODB_URI) {
  throw new Error(
    '❌ MONGODB_URI ไม่ได้ถูกกำหนดไว้ใน .env กรุณาเพิ่มค่าเช่น MONGODB_URI="mongodb+srv://..."'
  );
}

// ตั้งค่า strictQuery เป็น false เพื่อรองรับ query แบบ dynamic
mongoose.set('strictQuery', false);

// กำหนดตัวเลือกสำหรับการเชื่อมต่อ MongoDB ให้เร็วที่สุด
const options: ConnectOptions = {
  dbName: DB_NAME,
  maxPoolSize: 20, // เพิ่ม connection pool สำหรับ performance
  serverSelectionTimeoutMS: 2000, // ลด timeout ให้เร็วขึ้น
  socketTimeoutMS: 10000, // ลด socket timeout
  connectTimeoutMS: 2000, // เพิ่ม connection timeout
  retryWrites: true, // เปิดใช้งาน retry writes
  retryReads: true, // เปิดใช้งาน retry reads
};

/**
 * ฟังก์ชันสำหรับเชื่อมต่อ MongoDB โดยใช้ Mongoose แบบ direct connection (ไม่ใช้ cache)
 * ใช้ Redis สำหรับ caching แทนเพื่อ performance ที่ดีกว่า
 * @returns Promise<Mongoose> คืนค่า instance ของ Mongoose เมื่อเชื่อมต่อสำเร็จ
 * @throws Error หากไม่สามารถเชื่อมต่อได้
 */
export default async function dbConnect(): Promise<Mongoose> {
  try {
    // เชื่อมต่อ MongoDB แบบ direct โดยไม่มี caching
    const connection: Mongoose = await mongoose.connect(MONGODB_URI as string, options);
    console.log(`✅ [MongoDB] เชื่อมต่อสำเร็จ (${DB_NAME}) - ไม่ใช้ internal cache`);
    return connection;
  } catch (err: unknown) {
    console.error(`❌ [MongoDB] การเชื่อมต่อล้มเหลว`, err);
    throw new Error('❌ ไม่สามารถเชื่อมต่อ MongoDB ได้');
  }
}