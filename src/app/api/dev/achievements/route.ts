import { NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import AchievementModel from '@/backend/models/Achievement';

export async function GET(request: Request) {
  // Dev-only endpoint for inspecting all achievement definitions
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const tierKey = searchParams.get('tierKey') || undefined;
    const q = searchParams.get('q') || undefined;
    const limit = Math.min(Number(searchParams.get('limit') || 200), 500);

    const filter: any = { };
    if (tierKey) filter.tierKey = tierKey.toUpperCase();
    if (q) filter.$or = [
      { achievementCode: new RegExp(q, 'i') },
      { title: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
      { tierKey: new RegExp(q, 'i') },
    ];

    const docs = await AchievementModel
      .find(filter)
      .select('achievementCode title description category rarity tierKey tierLevel maxTier points isSecret isActive unlockConditions displayOrder createdAt updatedAt')
      .sort({ tierKey: 1, tierLevel: 1, displayOrder: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ count: docs.length, items: docs });
  } catch (error: any) {
    console.error('[dev/achievements] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error?.message }, { status: 500 });
  }
}


