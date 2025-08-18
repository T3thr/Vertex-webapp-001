import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import UserGamificationModel from '@/backend/models/UserGamification';
import { gamificationService } from '@/backend/services/GamificationService';

const TZ = 'Asia/Bangkok';

function dayKey(date: Date, tz: string = TZ): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    return fmt.format(date);
  } catch {
    // Fallback to UTC if timezone not available
    return date.toISOString().slice(0, 10);
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const doc = await UserGamificationModel.findOne({ userId: session.user.id }).select('gamification.loginStreaks').lean();
  const streak = doc?.gamification?.loginStreaks;

  const today = dayKey(new Date());
  const last = streak?.lastLoginDate ? dayKey(new Date(streak.lastLoginDate)) : undefined;
  const hasCheckedInToday = last === today;

  return NextResponse.json({
    hasCheckedInToday,
    currentStreakDays: streak?.currentStreakDays ?? 0,
    longestStreakDays: streak?.longestStreakDays ?? 0,
    lastCheckInDate: streak?.lastLoginDate ?? null,
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const userId = session.user.id;
  const now = new Date();
  const todayKey = dayKey(now);

  const doc = await UserGamificationModel.findOne({ userId });
  if (!doc) {
    // create baseline doc
    await UserGamificationModel.create({ userId, gamification: { loginStreaks: { currentStreakDays: 0, longestStreakDays: 0, lastLoginDate: undefined } } as any });
  }

  const fresh = await UserGamificationModel.findOne({ userId });
  const streak = fresh!.gamification.loginStreaks;
  const lastKey = streak.lastLoginDate ? dayKey(new Date(streak.lastLoginDate)) : undefined;

  if (lastKey === todayKey) {
    return NextResponse.json({ message: 'checked_in_already_today' }, { status: 200 });
  }

  const yesterdayKey = dayKey(addDays(now, -1));
  const nextCurrent = lastKey === yesterdayKey ? (streak.currentStreakDays || 0) + 1 : 1;
  const nextLongest = Math.max(nextCurrent, streak.longestStreakDays || 0);

  streak.currentStreakDays = nextCurrent;
  streak.longestStreakDays = nextLongest;
  streak.lastLoginDate = now;
  await fresh!.save();

  // Progress daily streak achievement tier
  try {
    await gamificationService.trackAchievementProgress(userId, 'DAILY_STREAK', 1);
  } catch (e) {
    console.warn('[DailyCheckIn] trackAchievementProgress failed:', e);
  }

  return NextResponse.json({ message: 'checked_in', currentStreakDays: nextCurrent, longestStreakDays: nextLongest });
}


