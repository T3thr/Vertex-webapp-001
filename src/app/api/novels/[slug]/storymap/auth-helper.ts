// src/app/api/novels/[slug]/storymap/auth-helper.ts
// Auth helper for validating novel access in storymap routes

import { NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel, { INovel } from '@/backend/models/Novel';

/**
 * Validates if a user has access to modify a novel
 * @param slug - Novel slug
 * @param userId - User ID from session
 * @returns Object with error (if any) and novel data
 */
export async function validateNovelAccess(slug: string, userId: string) {
  try {
    await dbConnect();

    // Find the novel by slug
    const novel = await NovelModel.findOne({ 
      slug, 
      isDeleted: { $ne: true } 
    }).populate('author', '_id').lean() as INovel | null;

    if (!novel) {
      return {
        error: NextResponse.json({ 
          error: 'ไม่พบนิยายที่ระบุ' 
        }, { status: 404 }),
        novel: null
      };
    }

    // Check if user is the author
    const authorId = typeof novel.author === 'object' && novel.author?._id 
      ? novel.author._id.toString() 
      : novel.author?.toString();

    if (authorId !== userId) {
      return {
        error: NextResponse.json({ 
          error: 'คุณไม่มีสิทธิ์เข้าถึงนิยายนี้' 
        }, { status: 403 }),
        novel: null
      };
    }

    return {
      error: null,
      novel
    };

  } catch (error) {
    console.error('[validateNovelAccess] Error:', error);
    return {
      error: NextResponse.json({ 
        error: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' 
      }, { status: 500 }),
      novel: null
    };
  }
}
