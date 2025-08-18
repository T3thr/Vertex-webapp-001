// src/app/u/[username]/page.tsx

import dbConnect from "@/backend/lib/mongodb"; // Utility สำหรับเชื่อมต่อ MongoDB
import UserModel from "@/backend/models/User"; // Mongoose Model สำหรับ User
import UserAchievementModel from "@/backend/models/UserAchievement"; // Import a UserAchievement model
import UserGamificationModel from "@/backend/models/UserGamification";
import AchievementModel from "@/backend/models/Achievement";
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

  // --- Start of new data fetching logic ---

  // 1. Fetch data from both models in parallel
  const [userAchievementsData, gamificationData, allAchievements] = await Promise.all([
    UserAchievementModel.findOne({ userId: user._id })
      .populate({
        path: 'earnedItems.itemModelId',
        model: 'Achievement',
        select: 'title description customIconUrl rarity tierKey'
      })
      .lean(),
    UserGamificationModel.findOne({ userId: user._id })
      .populate({
        path: 'gamification.achievements',
        model: 'Achievement',
        select: 'title description customIconUrl rarity tierKey achievementCode'
      })
      .select('gamification.achievements gamification.level gamification.experiencePoints')
      .lean(),
    // All active achievements definitions (for showing locked/inactive progress = 0)
    AchievementModel.find({ isActive: true })
      .select('title description customIconUrl rarity tierKey tierLevel unlockConditions')
      .sort({ tierKey: 1, tierLevel: 1 })
      .lean()
  ]);

  const combinedAchievements = new Map<string, any>();

  // Pre-seed with Tier 1 of each tierKey so that locked achievements appear with progress 0/target
  const firstTierByKey = new Map<string, any>();
  allAchievements?.forEach((ach: any) => {
    if (!ach.tierKey) return;
    const exists = firstTierByKey.get(ach.tierKey);
    if (!exists || (ach.tierLevel ?? Infinity) < (exists.tierLevel ?? Infinity)) {
      firstTierByKey.set(ach.tierKey, ach);
    }
  });
  firstTierByKey.forEach((ach: any, tierKey: string) => {
    const target = ach?.unlockConditions?.[0]?.targetValue ?? 1;
    combinedAchievements.set(tierKey, {
      _id: ach._id?.toString() || tierKey,
      title: ach.title,
      description: ach.description,
      customIconUrl: ach.customIconUrl,
      rarity: ach.rarity,
      progress: { current: 0, target, tier: 1 },
    });
  });

  // 2. Process new tiered achievements from UserAchievementModel (Source of Truth for these)
  // Be robust even if populate fails; still show earned tier by code with a friendly title
  userAchievementsData?.earnedItems?.forEach((item: any) => {
    const populated = item.itemModelId as any;
    const achievementKey = item.itemCode || populated?.tierKey || populated?._id?.toString() || `ACH_${Math.random().toString(36).slice(2)}`;
    const displayTitle = populated?.title ||
      (item.itemCode === 'FIRST_READER' ? 'ก้าวแรกสู่นักอ่าน I' : (item.itemCode || 'Achievement'));
    const description = populated?.description || undefined;
    const customIconUrl = populated?.customIconUrl || undefined;
    const rarity = populated?.rarity || 'Common';
    const id = (populated?._id?.toString()) || achievementKey;

    combinedAchievements.set(achievementKey, {
      _id: id,
      title: displayTitle,
      description,
      customIconUrl,
      rarity,
      progress: item.progress || null,
    });
  });

  // 3. Process old achievements from UserGamificationModel, adding them only if they don't already exist
  gamificationData?.gamification.achievements.forEach((ach: any) => {
    const achievementKey = ach.tierKey || ach.achievementCode; // Use tierKey or code to check for existence
    if (ach._id && !combinedAchievements.has(achievementKey)) {
      combinedAchievements.set(achievementKey, {
        _id: ach._id.toString(),
        title: ach.title,
        description: ach.description,
        customIconUrl: ach.customIconUrl,
        rarity: ach.rarity,
        progress: null, // No progress data for old achievements
      });
    }
  });
  
  const achievements = Array.from(combinedAchievements.values()).sort((a: any, b: any) => {
    const score = (x: any) => {
      const p = x?.progress;
      if (!p) return -1; // ไม่มี progress ให้ถอยไปท้าย
      const completedTiers = Math.max(0, (p.tier || 1) - 1);
      const fraction = p && p.target > 0 ? p.current / p.target : 0;
      // ให้น้ำหนักกับจำนวน Tier ที่ปลดล็อกก่อน จากนั้นดูเปอร์เซ็นต์ tier ปัจจุบัน
      return completedTiers * 1000 + fraction;
    };
    return score(b) - score(a);
  });

  // --- End of new data fetching logic ---

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
        <Tabs
          achievements={achievements}
          level={gamificationData?.gamification.level || 1} 
          experiencePoints={gamificationData?.gamification.experiencePoints || 0}
        />
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
