
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { gamificationService } from '@/backend/services/GamificationService';
import dbConnect from '@/backend/lib/mongodb';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const summary = await gamificationService.getGamificationSummary(session.user.id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching gamification summary:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}