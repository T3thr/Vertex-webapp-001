// src/app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check for security
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { path, tag } = body;

    // Get path from query params if not in body
    const url = new URL(request.url);
    const pathParam = url.searchParams.get('path');
    const tagParam = url.searchParams.get('tag');

    const targetPath = path || pathParam || '/';
    const targetTag = tag || tagParam;

    if (targetTag) {
      revalidateTag(targetTag);
      console.log(`✅ [Revalidate] Revalidated tag: ${targetTag}`);
    } else {
      revalidatePath(targetPath);
      console.log(`✅ [Revalidate] Revalidated path: ${targetPath}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Revalidated ${targetTag ? `tag: ${targetTag}` : `path: ${targetPath}`}`,
      revalidated: targetTag || targetPath
    });

  } catch (error) {
    console.error('[Revalidate API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to revalidate',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Allow GET requests for simple revalidation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const path = url.searchParams.get('path') || '/';
    const tag = url.searchParams.get('tag');

    if (tag) {
      revalidateTag(tag);
      console.log(`✅ [Revalidate] Revalidated tag: ${tag}`);
    } else {
      revalidatePath(path);
      console.log(`✅ [Revalidate] Revalidated path: ${path}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Revalidated ${tag ? `tag: ${tag}` : `path: ${path}`}`,
      revalidated: tag || path
    });

  } catch (error) {
    console.error('[Revalidate API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to revalidate',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
