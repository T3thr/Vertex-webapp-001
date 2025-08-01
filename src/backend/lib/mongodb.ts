// src/backend/lib/mongodb.ts
// นำเข้า mongoose สำหรับเชื่อมต่อกับ MongoDB และกำหนดประเภทให้ชัดเจนด้วย TypeScript
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

// สร้าง interface สำหรับเก็บสถานะการเชื่อมต่อใน global cache
interface MongooseGlobalCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// ประกาศ global type-safe สำหรับ Next.js เพื่อให้ TypeScript รู้จัก property mongooseCache
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseGlobalCache | undefined;
}

// กำหนด cache ให้ global object และใช้ type assertion เพื่อความปลอดภัย
const globalWithMongoose = global as typeof globalThis & {
  mongooseCache?: MongooseGlobalCache;
};

// ตรวจสอบและกำหนดค่าเริ่มต้นให้ mongooseCache ถ้ายังไม่มี
if (!globalWithMongoose.mongooseCache) {
  globalWithMongoose.mongooseCache = { conn: null, promise: null };
}

const cached: MongooseGlobalCache = globalWithMongoose.mongooseCache;

/**
 * ฟังก์ชันสำหรับเชื่อมต่อ MongoDB โดยใช้ Mongoose พร้อมระบบ cache และ retry
 * @returns Promise<Mongoose> คืนค่า instance ของ Mongoose เมื่อเชื่อมต่อสำเร็จ
 * @throws Error หากไม่สามารถเชื่อมต่อได้หลังจากลองใหม่ครบจำนวนครั้ง
 */
export default async function dbConnect(): Promise<Mongoose> {
  // หากมีการเชื่อมต่ออยู่แล้ว ให้คืนค่า instance ที่แคชไว้
  if (cached.conn) {
    console.log(`✅ [MongoDB] ใช้การเชื่อมต่อจาก Cache (${DB_NAME})`);
    return cached.conn;
  }

  // ถ้ายังไม่มี Promise ที่กำลังเชื่อมต่อ ให้เริ่มกระบวนการเชื่อมต่อใหม่
  if (!cached.promise) {
    // ตั้งค่า strictQuery เป็น false เพื่อรองรับ query แบบ dynamic
    mongoose.set('strictQuery', false);

    // กำหนดตัวเลือกสำหรับการเชื่อมต่อ MongoDB
    const options: ConnectOptions = {
      dbName: DB_NAME,
      maxPoolSize: 10, // จำกัดขนาด connection pool
      serverSelectionTimeoutMS: 5000, // รอ server ไม่เกิน 5 วินาที
      socketTimeoutMS: 45000, // ปิด socket เมื่อไม่ได้ใช้งานนาน 45 วินาที
    };

    // สร้าง Promise สำหรับการเชื่อมต่อพร้อม retry logic
    cached.promise = (async () => {
      const maxRetries: number = 3;
      for (let i = 0; i < maxRetries; i++) {
        try {
          // ตรวจสอบว่า MONGODB_URI ไม่เป็น undefined (ยืนยันจากเงื่อนไขด้านบน)
          // ใช้ type assertion เพื่อบอก TypeScript ว่า MONGODB_URI เป็น string แน่นอน
          const connection: Mongoose = await mongoose.connect(MONGODB_URI as string, options);
          console.log(`✅ [MongoDB] เชื่อมต่อสำเร็จ (${DB_NAME})`);
          return connection;
        } catch (err: unknown) {
          // บันทึกข้อผิดพลาดและลองใหม่
          console.error(`❌ [MongoDB] พยายามเชื่อมต่อครั้งที่ ${i + 1} ล้มเหลว`, err);
          if (i === maxRetries - 1) {
            throw new Error('❌ ไม่สามารถเชื่อมต่อ MongoDB ได้หลังจากพยายามหลายครั้ง');
          }
          // รอ 2 วินาทีก่อนลองใหม่
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      throw new Error('❌ ไม่สามารถเชื่อมต่อ MongoDB ได้หลังจากพยายามหลายครั้ง');
    })();
  }

  // รอให้การเชื่อมต่อสำเร็จและเก็บ instance ไว้ใน cache
  cached.conn = await cached.promise;
  return cached.conn;
}