import { NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import AchievementModel, { AchievementCategory, AchievementRarity } from '@/backend/models/Achievement';

export async function GET() {
  // IMPORTANT: Guard this route for dev only
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();

    const achievements = [
      {
        achievementCode: 'FIRST_READER_TIER_1',
        title: 'ก้าวแรกสู่นักอ่าน I',
        description: 'อ่านนิยายครบ 1 ตอน',
        category: AchievementCategory.READING,
        rarity: AchievementRarity.COMMON,
        unlockConditions: [{ eventName: 'USER_READ_EPISODE', targetValue: 1 }],
        points: 10,
        tierKey: 'FIRST_READER',
        tierLevel: 1,
        maxTier: 3,
      },
      {
        achievementCode: 'FIRST_READER_TIER_2',
        title: 'ก้าวแรกสู่นักอ่าน II',
        description: 'อ่านนิยายครบ 5 ตอน',
        category: AchievementCategory.READING,
        rarity: AchievementRarity.UNCOMMON,
        unlockConditions: [{ eventName: 'USER_READ_EPISODE', targetValue: 5 }],
        points: 25,
        tierKey: 'FIRST_READER',
        tierLevel: 2,
        maxTier: 3,
      },
      {
        achievementCode: 'FIRST_READER_TIER_3',
        title: 'ก้าวแรกสู่นักอ่าน III',
        description: 'อ่านนิยายครบ 10 ตอน',
        category: AchievementCategory.READING,
        rarity: AchievementRarity.RARE,
        unlockConditions: [{ eventName: 'USER_READ_EPISODE', targetValue: 10 }],
        points: 50,
        tierKey: 'FIRST_READER',
        tierLevel: 3,
        maxTier: 3,
      },
    ];

    for (const ach of achievements) {
      await AchievementModel.findOneAndUpdate(
        { achievementCode: ach.achievementCode },
        ach,
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ message: 'Seeded tiered achievements: FIRST_READER (1-3).'}, { status: 200 });
  } catch (error) {
    console.error('API Error during achievement seeding:', error);
    return NextResponse.json({ message: 'Seeding failed', error: (error as Error).message }, { status: 500 });
  }
}