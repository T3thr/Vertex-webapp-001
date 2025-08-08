// app/api/novels/[slug]/storymap/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';

type ValidateInput = {
  title?: string;
  nodes: Array<{
    nodeId: string;
    nodeType: string;
    title?: string;
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    edgeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    label?: string;
    condition?: { expression?: string } | null;
    priority?: number;
  }>;
  storyVariables?: any[];
  startNodeId?: string;
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

    // Verify novel ownership
    const novel = await NovelModel.findOne({
      slug: decodedSlug,
      author: session.user.id,
      isDeleted: { $ne: true },
    }).select('_id');

    if (!novel) {
      return NextResponse.json({ success: false, error: 'ไม่พบนิยาย' }, { status: 404 });
    }

    const body = (await request.json()) as ValidateInput;
    const nodes = body.nodes || [];
    const edges = body.edges || [];
    const startNodeId = body.startNodeId || (nodes[0]?.nodeId ?? '');

    const problems: Array<{
      severity: 'error' | 'warning' | 'info';
      code: string;
      message: string;
      location?: { nodeId?: string; edgeId?: string };
    }> = [];

    // Unique nodeId
    const nodeIdSet = new Set<string>();
    for (const n of nodes) {
      if (!n.nodeId) {
        problems.push({ severity: 'error', code: 'NODE_ID_MISSING', message: 'พบ node ที่ไม่มี nodeId' });
        continue;
      }
      if (nodeIdSet.has(n.nodeId)) {
        problems.push({ severity: 'error', code: 'NODE_ID_DUPLICATE', message: `nodeId ซ้ำ: ${n.nodeId}`, location: { nodeId: n.nodeId } });
      } else {
        nodeIdSet.add(n.nodeId);
      }
    }

    // Unique edgeId & broken edges
    const edgeIdSet = new Set<string>();
    for (const e of edges) {
      if (!e.edgeId) {
        problems.push({ severity: 'error', code: 'EDGE_ID_MISSING', message: 'พบ edge ที่ไม่มี edgeId' });
        continue;
      }
      if (edgeIdSet.has(e.edgeId)) {
        problems.push({ severity: 'error', code: 'EDGE_ID_DUPLICATE', message: `edgeId ซ้ำ: ${e.edgeId}`, location: { edgeId: e.edgeId } });
      } else {
        edgeIdSet.add(e.edgeId);
      }
      if (!nodeIdSet.has(e.sourceNodeId)) {
        problems.push({ severity: 'error', code: 'EDGE_SOURCE_MISSING', message: `แหล่งที่มาของเส้นไม่พบ: ${e.sourceNodeId}`, location: { edgeId: e.edgeId } });
      }
      if (!nodeIdSet.has(e.targetNodeId)) {
        problems.push({ severity: 'error', code: 'EDGE_TARGET_MISSING', message: `ปลายทางของเส้นไม่พบ: ${e.targetNodeId}`, location: { edgeId: e.edgeId } });
      }
    }

    // Start node
    if (!startNodeId || !nodeIdSet.has(startNodeId)) {
      problems.push({ severity: 'error', code: 'START_NODE_MISSING', message: 'ไม่มี startNodeId หรือ node ไม่พบ' });
    }

    // Graph reachability and cycles
    const adjacency = new Map<string, string[]>();
    for (const id of nodeIdSet) adjacency.set(id, []);
    for (const e of edges) {
      if (adjacency.has(e.sourceNodeId)) {
        adjacency.get(e.sourceNodeId)!.push(e.targetNodeId);
      }
    }

    // Reachability
    const visited = new Set<string>();
    const stack: string[] = [];
    if (startNodeId && nodeIdSet.has(startNodeId)) {
      stack.push(startNodeId);
      while (stack.length) {
        const cur = stack.pop()!;
        if (visited.has(cur)) continue;
        visited.add(cur);
        for (const nxt of adjacency.get(cur) || []) stack.push(nxt);
      }
      for (const id of nodeIdSet) {
        if (!visited.has(id)) {
          problems.push({ severity: 'warning', code: 'NODE_UNREACHABLE', message: `Node ไม่สามารถเข้าถึงได้: ${id}`, location: { nodeId: id } });
        }
      }
    }

    // Cycle detection (DFS coloring)
    const color = new Map<string, number>(); // 0=unseen,1=visiting,2=done
    const cycleEdges: Array<{ from: string; to: string }> = [];
    const dfs = (u: string) => {
      color.set(u, 1);
      for (const v of adjacency.get(u) || []) {
        const c = color.get(v) || 0;
        if (c === 0) dfs(v);
        else if (c === 1) cycleEdges.push({ from: u, to: v });
      }
      color.set(u, 2);
    };
    if (startNodeId && nodeIdSet.has(startNodeId)) {
      dfs(startNodeId);
      if (cycleEdges.length > 0) {
        problems.push({ severity: 'warning', code: 'CYCLE_DETECTED', message: `พบวัฏจักรจำนวน ${cycleEdges.length} จุด` });
      }
    }

    // Condition lint (very light-weight)
    for (const e of edges) {
      const expr = e.condition?.expression?.trim();
      if (expr && /\beval\b|\bFunction\b/.test(expr)) {
        problems.push({ severity: 'warning', code: 'UNSAFE_EXPRESSION', message: 'Expression มีโค้ดที่ไม่ปลอดภัย (eval/Function)', location: { edgeId: e.edgeId } });
      }
      if (expr === '') {
        problems.push({ severity: 'info', code: 'EMPTY_EXPRESSION', message: 'Expression ว่าง', location: { edgeId: e.edgeId } });
      }
    }

    const summary = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      unreachableNodes: nodes.length - visited.size,
      errorCount: problems.filter(p => p.severity === 'error').length,
      warningCount: problems.filter(p => p.severity === 'warning').length,
      infoCount: problems.filter(p => p.severity === 'info').length,
    };

    return NextResponse.json({ success: true, summary, problems });
  } catch (error) {
    console.error('[API] StoryMap Validate Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


