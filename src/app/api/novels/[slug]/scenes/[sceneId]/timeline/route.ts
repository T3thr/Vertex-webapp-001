// app/api/novels/[slug]/scenes/[sceneId]/timeline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import SceneModel from '@/backend/models/Scene';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sceneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    const { slug, sceneId } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const body = await request.json();

    await dbConnect();

    // Verify ownership
    const novel = await NovelModel.findOne({ slug: decodedSlug, author: session.user.id, isDeleted: { $ne: true } }).select('_id');
    if (!novel) {
      return NextResponse.json({ success: false, error: 'ไม่พบนิยาย' }, { status: 404 });
    }

    const scene = await SceneModel.findOne({ _id: sceneId, novelId: novel._id });
    if (!scene) {
      return NextResponse.json({ success: false, error: 'ไม่พบฉาก' }, { status: 404 });
    }

    // Very light validation: ensure array of tracks; avoid overlapping events within same exact start/duration (basic)
    const timelineTracks = Array.isArray(body.timelineTracks) ? body.timelineTracks : [];
    for (const track of timelineTracks) {
      if (!Array.isArray(track.events)) continue;
      const pairs = new Set<string>();
      for (const ev of track.events) {
        const key = `${ev.eventType}:${ev.startTimeMs}:${ev.durationMs ?? 0}`;
        if (pairs.has(key)) {
          return NextResponse.json({ success: false, error: 'พบอีเวนต์ซ้ำเวลา/ประเภทในแทร็คเดียวกัน' }, { status: 400 });
        }
        pairs.add(key);
      }
    }

    scene.timelineTracks = timelineTracks as any;
    if (typeof body.estimatedTimelineDurationMs === 'number') {
      scene.estimatedTimelineDurationMs = body.estimatedTimelineDurationMs;
    }
    await scene.save();

    return NextResponse.json({ success: true, scene: JSON.parse(JSON.stringify(scene)) });
  } catch (error) {
    console.error('[API] Update Scene Timeline Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


