// app/api/novels/[slug]/storymap/autolayout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';

type AutoLayoutInput = {
  nodes: Array<{ nodeId: string; nodeType: string; position?: { x: number; y: number } }>; 
  edges: Array<{ sourceNodeId: string; targetNodeId: string }>;
  algorithm?: 'dagre' | 'elk' | 'custom';
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    await dbConnect();
    const novel = await NovelModel.findOne({ slug: decodedSlug, author: session.user.id, isDeleted: { $ne: true } }).select('_id');
    if (!novel) {
      return NextResponse.json({ success: false, error: 'ไม่พบนิยาย' }, { status: 404 });
    }

    const body = (await request.json()) as AutoLayoutInput;
    const algorithm = body.algorithm || 'dagre';

    const nodes = body.nodes || [];
    const edges = body.edges || [];

    // Minimal heuristic auto-layout (left-to-right layered) as a placeholder.
    // Can be replaced with real DAGRE/ELK on server (or via worker) later.
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const n of nodes) { inDegree.set(n.nodeId, 0); adj.set(n.nodeId, []); }
    for (const e of edges) {
      if (inDegree.has(e.targetNodeId)) inDegree.set(e.targetNodeId, (inDegree.get(e.targetNodeId) || 0) + 1);
      if (adj.has(e.sourceNodeId)) adj.get(e.sourceNodeId)!.push(e.targetNodeId);
    }
    const queue: string[] = [];
    for (const [id, deg] of inDegree) if (deg === 0) queue.push(id);
    const layers: string[][] = [];
    const seen = new Set<string>();
    while (queue.length) {
      const layerSize = queue.length;
      const layer: string[] = [];
      for (let i = 0; i < layerSize; i++) {
        const u = queue.shift()!;
        if (seen.has(u)) continue;
        seen.add(u);
        layer.push(u);
        for (const v of adj.get(u) || []) {
          const d = (inDegree.get(v) || 0) - 1;
          inDegree.set(v, d);
          if (d === 0) queue.push(v);
        }
      }
      if (layer.length) layers.push(layer);
    }
    // Any remaining nodes (in cycles)
    for (const n of nodes) if (!seen.has(n.nodeId)) {
      layers.push([n.nodeId]);
      seen.add(n.nodeId);
    }

    const xGap = 320; // px between columns
    const yGap = 200; // px between rows
    const positioned = new Map<string, { x: number; y: number }>();
    layers.forEach((layer, colIndex) => {
      layer.forEach((nodeId, rowIndex) => {
        positioned.set(nodeId, { x: colIndex * xGap, y: rowIndex * yGap });
      });
    });

    const arrangedNodes = nodes.map(n => ({
      ...n,
      position: positioned.get(n.nodeId) || n.position || { x: 0, y: 0 },
    }));

    return NextResponse.json({ success: true, algorithmUsed: algorithm, nodes: arrangedNodes });
  } catch (error) {
    console.error('[API] StoryMap Autolayout Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


