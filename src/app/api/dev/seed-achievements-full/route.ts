import { NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import AchievementModel, { AchievementCategory, AchievementRarity } from '@/backend/models/Achievement';

type TierPlan = {
  tierKey: string;
  titleBase: string;
  descriptionBase: string;
  category: AchievementCategory;
  eventName: string;
  targets: number[];
  rarities?: AchievementRarity[];
  points?: number[];
  isSecret?: boolean;
};

function autoScale<T>(length: number, pick: (i: number) => T): T[] {
  return Array.from({ length }, (_, i) => pick(i));
}

function defaultRarityForIndex(index: number): AchievementRarity {
  switch (index) {
    case 0: return AchievementRarity.COMMON;
    case 1: return AchievementRarity.UNCOMMON;
    case 2: return AchievementRarity.RARE;
    case 3: return AchievementRarity.EPIC;
    default: return AchievementRarity.LEGENDARY;
  }
}

function defaultPointsForIndex(index: number): number {
  const base = [10, 20, 40, 80, 150, 250, 400];
  return base[index] ?? 400;
}

function roman(n: number): string {
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let num = n; let out = '';
  for (const [v, s] of map) { while (num >= v) { out += s; num -= v; } }
  return out;
}

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();

    const plans: TierPlan[] = [
      {
        tierKey: 'DAILY_STREAK',
        titleBase: 'ต่อเนื่องไม่หยุด',
        descriptionBase: 'Streak การเช็คอินประจำวัน',
        category: AchievementCategory.USER_PROGRESSION,
        eventName: 'USER_DAILY_CHECKIN_STREAK',
        targets: [3, 7, 14, 30, 100],
      },
      {
        tierKey: 'COMMENTER',
        titleBase: 'นักคอมเมนต์',
        descriptionBase: 'คอมเมนต์ในเรื่อง/ตอน',
        category: AchievementCategory.ENGAGEMENT,
        eventName: 'USER_COMMENTED',
        targets: [1, 10, 50, 200],
      },
      {
        tierKey: 'FOLLOW_AUTHOR',
        titleBase: 'ผู้ติดตามนักเขียน',
        descriptionBase: 'กดติดตามนักเขียน',
        category: AchievementCategory.SOCIAL_INTERACTION,
        eventName: 'USER_FOLLOWED_AUTHOR',
        targets: [1, 10, 50],
      },
      {
        tierKey: 'AUTHOR_PUBLISH',
        titleBase: 'เริ่มต้นเผยแพร่',
        descriptionBase: 'เผยแพร่ตอนใหม่',
        category: AchievementCategory.WRITING,
        eventName: 'AUTHOR_PUBLISHED_EPISODE',
        targets: [1, 10, 30, 100],
      },
      {
        tierKey: 'AUTHOR_VIEWS',
        titleBase: 'ยอดวิวทะลุเป้า',
        descriptionBase: 'ยอดวิวรวมถึงเป้า',
        category: AchievementCategory.WRITING,
        eventName: 'AUTHOR_REACHED_VIEWS',
        targets: [1000, 5000, 10000, 50000, 100000],
        rarities: [
          AchievementRarity.UNCOMMON,
          AchievementRarity.RARE,
          AchievementRarity.RARE,
          AchievementRarity.EPIC,
          AchievementRarity.LEGENDARY,
        ],
      },
      {
        tierKey: 'NIGHT_OWL',
        titleBase: 'นกฮูกยามดึก',
        descriptionBase: 'อ่านช่วงตี 0–3',
        category: AchievementCategory.READING,
        eventName: 'USER_READ_AT_HOUR_00_03',
        targets: [10],
        rarities: [AchievementRarity.RARE],
      },
      {
        tierKey: 'EARLY_BIRD',
        titleBase: 'นกเช้ายันรุ่ง',
        descriptionBase: 'อ่านช่วงตี 5–7',
        category: AchievementCategory.READING,
        eventName: 'USER_READ_AT_HOUR_05_07',
        targets: [10],
        rarities: [AchievementRarity.UNCOMMON],
      },
    ];

    const created: string[] = [];
    for (const plan of plans) {
      const maxTier = plan.targets.length;
      const rarities = plan.rarities ?? autoScale(maxTier, defaultRarityForIndex);
      const points = plan.points ?? autoScale(maxTier, defaultPointsForIndex);
      for (let i = 0; i < maxTier; i += 1) {
        const tierLevel = i + 1;
        const achievementCode = `${plan.tierKey}_T${tierLevel}`.toUpperCase();
        const doc = {
          achievementCode,
          title: `${plan.titleBase} ${roman(tierLevel)}`,
          description: `${plan.descriptionBase} ${plan.targets[i]}`,
          category: plan.category,
          rarity: rarities[i],
          unlockConditions: [{ eventName: plan.eventName, targetValue: plan.targets[i] }],
          points: points[i],
          tierKey: plan.tierKey,
          tierLevel,
          maxTier,
          isSecret: plan.tierKey === 'NIGHT_OWL' || plan.tierKey === 'EARLY_BIRD',
          isActive: true,
          isRepeatable: false,
          displayOrder: 0,
          schemaVersion: 1,
        } as const;

        await AchievementModel.findOneAndUpdate(
          { achievementCode: doc.achievementCode },
          doc,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        created.push(doc.achievementCode);
      }
    }

    return NextResponse.json({ message: 'Seeded achievements', count: created.length, codes: created });
  } catch (error: any) {
    console.error('[seed-achievements-full] Error:', error);
    return NextResponse.json({ message: 'Seeding failed', error: error?.message }, { status: 500 });
  }
}


