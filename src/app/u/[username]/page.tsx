// src/app/u/[username]/page.tsx

import dbConnect from '@/backend/lib/mongodb'; // Utility สำหรับเชื่อมต่อ MongoDB
import UserModel from '@/backend/models/User'; // Mongoose Model สำหรับ User
import { notFound } from 'next/navigation'; // Function สำหรับแสดงหน้า 404
import Image from 'next/image'; // Component สำหรับแสดงรูปภาพจาก Next.js
import React from 'react'; // React library

interface UserPageProps {
  params: Promise<{ username: string }>;
}

// ไม่ต้องกำหนด type UserPageProps
export default async function UserPage({ params: paramsPromise }: UserPageProps) {
  const params = await paramsPromise;

  await dbConnect(); // เชื่อมต่อกับ MongoDB

  // ค้นหา user จาก database ด้วย username และ isDeleted เป็น false
  // .select() เพื่อเลือกเฉพาะ fields ที่ต้องการ
  // .lean() เพื่อให้ได้ plain JavaScript object แทน Mongoose document (เร็วขึ้น)
  const user = await UserModel.findOne({ username: params.username, isDeleted: false })
    .select('username profile roles isActive isBanned')
    .lean();

  // ถ้าไม่พบ user ให้แสดงหน้า 404
  if (!user) {
    return notFound(); // เรียกใช้ notFound() ที่ import มา
  }

  // Destructure ข้อมูล user ที่ได้จาก database
  // TypeScript จะพยายาม infer type จาก .lean() และ .select()
  // ถ้าต้องการความแม่นยำสูงสุด สามารถกำหนด Interface/Type สำหรับ user object ที่ดึงมาได้
  const { profile, username, roles, isActive, isBanned } = user;

  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        {/* ส่วนแสดงรูปโปรไฟล์ */}
        {profile?.avatarUrl ? ( // ตรวจสอบว่ามี avatarUrl ใน profile หรือไม่
          <Image
            src={profile.avatarUrl} // URL ของรูปโปรไฟล์ ( || '' ไม่จำเป็นแล้วเพราะมีการเช็ค profile.avatarUrl ก่อนหน้า)
            alt={profile.displayName || username || ''}
            width={96} // กำหนดความกว้างของรูป
            height={96} // กำหนดความสูงของรูป
            className="rounded-full border shadow" // CSS classes สำหรับ styling
          />
        ) : (
          // ถ้าไม่มี avatarUrl ให้แสดงตัวอักษรแรกของ displayName หรือ username
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold">
            {profile?.displayName?.[0] || username?.[0] || '?'}
          </div>
        )}
        <div>
          {/* แสดงชื่อ displayName หรือ username */}
          <h1 className="text-2xl font-bold">{profile?.displayName || username}</h1>
          {/* แสดง username */}
          <div className="text-gray-500">@{username}</div>
          {/* แสดง roles ของ user ถ้ามี */}
          {roles && roles.length > 0 && (
            <div className="mt-1 text-sm text-gray-600">{roles.join(', ')}</div>
          )}
          {/* แสดงสถานะบัญชี: ปิดใช้งาน */}
          {!isActive && <div className="text-red-500 text-xs mt-1">บัญชีนี้ถูกปิดใช้งาน</div>}
          {/* แสดงสถานะบัญชี: ถูกแบน */}
          {isBanned && <div className="text-red-600 text-xs mt-1">บัญชีนี้ถูกแบน</div>}
        </div>
      </div>

      {/* ส่วนแสดง Bio ถ้ามี */}
      {profile?.bio && (
        <div className="mb-4 text-foreground whitespace-pre-line">{profile.bio}</div>
      )}

      {/* สามารถเพิ่ม Section อื่นๆ ที่เกี่ยวข้องกับ User Profile ได้ที่นี่
        เช่น สถิติการเขียน (writerStats), ข้อมูลโซเชียล (socialStats), การตั้งค่า (preferences) เป็นต้น
      */}
    </main>
  );
}