
// NOTE: ใช้ dynamic import หลังจากโหลด .env เพื่อให้ process.env พร้อมก่อนโหลดโมดูล MongoDB
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment from .env.local (if exists) then .env
const envPathLocal = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPathLocal)) {
  dotenv.config({ path: envPathLocal });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

type TierPlan = {
  tierKey: string;
  titleBase: string;
  descriptionBase: string;
  category: string; // ใช้ string เพื่อลดการพึ่งพา types ของโมเดล
  eventName: string;
  targets: number[];
  rarities?: string[];
  points?: number[];
  isSecret?: boolean;
};

function autoScale<T>(length: number, pick: (i: number) => T): T[] {
  return Array.from({ length }, (_, i) => pick(i));
}

function defaultRarityForIndex(index: number): string {
  switch (index) {
    case 0: return 'Common';
    case 1: return 'Uncommon';
    case 2: return 'Rare';
    case 3: return 'Epic';
    default: return 'Legendary';
  }
}

function defaultPointsForIndex(index: number): number {
  // ไล่ระดับคะแนน: 10, 20, 40, 80, 150, ...
  const base = [10, 20, 40, 80, 150, 250, 400];
  return base[index] ?? 400;
}

const plans: TierPlan[] = [
  {
    tierKey: 'READER_PROGRESS',
    titleBase: 'นักอ่านก้าวหน้า',
    descriptionBase: 'อ่านตอนสะสม',
    category: 'Reading',
    eventName: 'USER_READ_EPISODE',
    targets: [1, 10, 50, 200, 500],
  },
  {
    tierKey: 'COMPLETIONIST',
    titleBase: 'จบให้หมด',
    descriptionBase: 'อ่านจบนิยาย',
    category: 'Reading',
    eventName: 'USER_COMPLETED_STORY',
    targets: [1, 5, 20],
  },
  {
    tierKey: 'DAILY_STREAK',
    titleBase: 'ต่อเนื่องไม่หยุด',
    descriptionBase: 'Streak การเช็คอินประจำวัน',
    category: 'UserProgression',
    eventName: 'USER_DAILY_CHECKIN_STREAK',
    targets: [3, 7, 14, 30, 100],
  },
  {
    tierKey: 'COMMENTER',
    titleBase: 'นักคอมเมนต์',
    descriptionBase: 'คอมเมนต์ในเรื่อง/ตอน',
    category: 'Engagement',
    eventName: 'USER_COMMENTED',
    targets: [1, 10, 50, 200],
  },
  {
    tierKey: 'FOLLOW_AUTHOR',
    titleBase: 'ผู้ติดตามนักเขียน',
    descriptionBase: 'กดติดตามนักเขียน',
    category: 'SocialInteraction',
    eventName: 'USER_FOLLOWED_AUTHOR',
    targets: [1, 10, 50],
  },
  {
    tierKey: 'AUTHOR_PUBLISH',
    titleBase: 'เริ่มต้นเผยแพร่',
    descriptionBase: 'เผยแพร่ตอนใหม่',
    category: 'Writing',
    eventName: 'AUTHOR_PUBLISHED_EPISODE',
    targets: [1, 10, 30, 100],
  },
  {
    tierKey: 'AUTHOR_VIEWS',
    titleBase: 'ยอดวิวทะลุเป้า',
    descriptionBase: 'ยอดวิวรวมถึงเป้า',
    category: 'Writing',
    eventName: 'AUTHOR_REACHED_VIEWS',
    targets: [1000, 5000, 10000, 50000, 100000],
    rarities: ['Uncommon', 'Rare', 'Rare', 'Epic', 'Legendary'],
  },
  {
    tierKey: 'NIGHT_OWL',
    titleBase: 'นกฮูกยามดึก',
    descriptionBase: 'อ่านช่วงตี 0–3',
    category: 'Reading',
    eventName: 'USER_READ_AT_HOUR_00_03',
    targets: [10],
    isSecret: true,
  },
  {
    tierKey: 'EARLY_BIRD',
    titleBase: 'นกเช้ายันรุ่ง',
    descriptionBase: 'อ่านช่วงตี 5–7',
    category: 'Reading',
    eventName: 'USER_READ_AT_HOUR_05_07',
    targets: [10],
    isSecret: true,
  },
];

const seedAchievements = async () => {
  // dynamic import หลังจากโหลด .env แล้ว
  const { default: connectToDatabase } = await import('../lib/mongodb');
  const AchievementModule = await import('../models/Achievement');
  const AchievementModel = AchievementModule.default as any;

  const allDocs: any[] = [];

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
        isSecret: !!plan.isSecret,
        isActive: true,
        isRepeatable: false,
        displayOrder: 0,
        schemaVersion: 1,
      } as const;

      allDocs.push(doc);
    }
  }

  for (const ach of allDocs) {
    await AchievementModel.findOneAndUpdate(
      { achievementCode: ach.achievementCode },
      ach,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Seeded ${allDocs.length} achievements across ${plans.length} plans.`);
  process.exit(0);
};

// Helper: แปลงเลขเป็นตัวโรมันเล็กๆ สำหรับชื่อ tier
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

seedAchievements().catch(err => {
  console.error(err);
  process.exit(1);
});