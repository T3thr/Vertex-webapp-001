// src/app/u/[username]/page.tsx

import dbConnect from "@/backend/lib/mongodb"; // Utility สำหรับเชื่อมต่อ MongoDB
import UserModel from "@/backend/models/User"; // Mongoose Model สำหรับ User
import { notFound } from "next/navigation"; // Function สำหรับแสดงหน้า 404
import Image from "next/image"; // Component สำหรับแสดงรูปภาพจาก Next.js
import React from "react"; // React library
import { Tabs } from "@/components/mydashboard/Tabs";

interface UserPageProps {
  params: Promise<{ username: string }>;
}

// ไม่ต้องกำหนด type UserPageProps
export default async function UserPage({
  params: paramsPromise,
}: UserPageProps) {
  const params = await paramsPromise;

  await dbConnect(); // เชื่อมต่อกับ MongoDB

  // ค้นหา user จาก database ด้วย username และ isDeleted เป็น false
  // .select() เพื่อเลือกเฉพาะ fields ที่ต้องการ
  // .lean() เพื่อให้ได้ plain JavaScript object แทน Mongoose document (เร็วขึ้น)
  const user = await UserModel.findOne({
    username: params.username,
    isDeleted: false,
  })
    .select("username profile roles isActive isBanned writerStats socialStats")
    .lean();

  // ถ้าไม่พบ user ให้แสดงหน้า 404
  if (!user) {
    return notFound(); // เรียกใช้ notFound() ที่ import มา
  }

  // Destructure ข้อมูล user ที่ได้จาก database
  // TypeScript จะพยายาม infer type จาก .lean() และ .select()
  // ถ้าต้องการความแม่นยำสูงสุด สามารถกำหนด Interface/Type สำหรับ user object ที่ดึงมาได้
  const { profile, username, roles, isActive, isBanned } = user;

  const totalNovels = user?.writerStats?.totalNovelsPublished ?? 0;
  const favoriteNovels = 5; // TODO: ดึงจาก UserLibraryItem หรือระบบ Favorite จริง
  const followers = user?.socialStats?.followersCount ?? 0;
  const totalReads = user?.writerStats?.totalReadsAcrossAllNovels ?? 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
      <div
        className="rounded-2xl border border-gray-600 shadow-lg"
        style={
          profile?.coverImageUrl
            ? {
                backgroundImage: `url(${profile.coverImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: '#374151', // fallback color if image fails
              }
            : { backgroundColor: '#374151' }
        }
      >
        {/* ส่วนแสดงรูปโปรไฟล์ */}
        <div className="flex items-center justify-center p-10">
          {profile?.avatarUrl ? ( // ตรวจสอบว่ามี avatarUrl ใน profile หรือไม่
            <Image
              src={profile.avatarUrl} // URL ของรูปโปรไฟล์ ( || '' ไม่จำเป็นแล้วเพราะมีการเช็ค profile.avatarUrl ก่อนหน้า)
              alt={profile.displayName || username || ""}
              width={256} // กำหนดความกว้างของรูปเริ่มต้น
              height={256} // กำหนดความสูงของรูปเริ่มต้น
              className="rounded-full border shadow w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 lg:w-64 lg:h-64" // ปรับขนาดตาม responsive
              priority // โหลดรูปก่อน
            />
          ) : (
            // ถ้าไม่มี avatarUrl ให้แสดงตัวอักษรแรกของ displayName หรือ username
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 rounded-full bg-gray-200 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">
              {profile?.displayName?.[0] || username?.[0] || "?"}
            </div>
          )}
        </div>
      </div>
      <div className="py-2">
        <h1 className="text-2xl font-bold flex items-center justify-center">
          {profile?.displayName || username}
        </h1>
        <div className="text-gray-500 flex items-center justify-center">
          @{username}
        </div>
        <div className="flex items-center justify-center gap-10 py-2">
          <button className="bg-green-500 text-white px-4 py-2 rounded-md">
            แชร์โปรไฟล์นี้
          </button>
          <button className="bg-green-500 text-white px-4 py-2 rounded-md">
            แก้ไขโปรไฟล์
          </button>
        </div>
        <div className="flex justify-between items-center py-6">
          <div>งานเขียนนิยาย {totalNovels} เรื่อง</div>
          <div>นิยายเรื่องโปรด {favoriteNovels} เรื่อง</div>
          <div>ผู้ติดตาม {followers} คน</div>
          <div>ยอดอ่านรวม {totalReads} ครั้ง</div>
        </div>
      </div>
      <div className="border-t border-b border-gray-300 py-4">
        <Tabs />
      </div>
    </main>
  );
}
