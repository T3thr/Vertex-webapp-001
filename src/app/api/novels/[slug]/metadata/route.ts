// src/app/api/novels/[slug]/metadata/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';

// GET - ดึงข้อมูล metadata ของนิยาย
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // ดึงข้อมูลนิยาย
    const novel = await NovelModel.findOne({
      slug: decodeURIComponent(slug),
      author: session.user.id,
      isDeleted: { $ne: true }
    })
    .populate([
      { path: 'themeAssignment.mainTheme.categoryId' },
      { path: 'themeAssignment.subThemes.categoryId' },
      { path: 'themeAssignment.moodAndTone' },
      { path: 'themeAssignment.contentWarnings' },
      { path: 'ageRatingCategoryId' },
      { path: 'language' }
    ])
    .lean();

    if (!novel) {
      return NextResponse.json(
        { error: 'Novel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: novel
    });

  } catch (error) {
    console.error('Error fetching novel metadata:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - อัปเดต metadata ของนิยาย
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      synopsis,
      coverImageUrl,
      status,
      accessLevel,
      isCompleted,
      themeAssignment,
      narrativeFocus,
      ageRatingCategoryId,
      language
    } = body;

    await dbConnect();

    // ตรวจสอบสิทธิ์ในการเข้าถึงนิยาย
    const existingNovel = await NovelModel.findOne({
      slug: decodeURIComponent(slug),
      author: session.user.id,
      isDeleted: { $ne: true }
    });

    if (!existingNovel) {
      return NextResponse.json(
        { error: 'Novel not found' },
        { status: 404 }
      );
    }

    // เตรียมข้อมูลสำหรับอัปเดต
    const updateData: any = {
      updatedAt: new Date(),
      lastContentUpdatedAt: new Date()
    };

    // อัปเดตข้อมูลพื้นฐาน
    if (title !== undefined) updateData.title = title;
    if (synopsis !== undefined) updateData.synopsis = synopsis;
    if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl;
    if (status !== undefined) updateData.status = status;
    if (accessLevel !== undefined) updateData.accessLevel = accessLevel;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (ageRatingCategoryId !== undefined) updateData.ageRatingCategoryId = ageRatingCategoryId;
    if (language !== undefined) updateData.language = language;

    // อัปเดต Theme Assignment
    if (themeAssignment) {
      updateData.themeAssignment = {
        ...existingNovel.themeAssignment,
        ...themeAssignment
      };
    }

    // อัปเดต Narrative Focus
    if (narrativeFocus) {
      updateData.narrativeFocus = {
        ...existingNovel.narrativeFocus,
        ...narrativeFocus
      };
    }

    // ตั้งค่าวันที่เผยแพร่
    if (status === 'published' && existingNovel.status !== 'published') {
      updateData.publishedAt = new Date();
    } else if (status !== 'published' && existingNovel.status === 'published') {
      updateData.publishedAt = null;
    }

    // อัปเดตนิยาย
    const updatedNovel = await NovelModel.findOneAndUpdate(
      {
        slug: decodeURIComponent(slug),
        author: session.user.id,
        isDeleted: { $ne: true }
      },
      { $set: updateData },
      {
        new: true,
        runValidators: true
      }
    )
    .populate([
      { path: 'themeAssignment.mainTheme.categoryId' },
      { path: 'themeAssignment.subThemes.categoryId' },
      { path: 'themeAssignment.moodAndTone' },
      { path: 'themeAssignment.contentWarnings' },
      { path: 'ageRatingCategoryId' },
      { path: 'language' }
    ]);

    if (!updatedNovel) {
      return NextResponse.json(
        { error: 'Failed to update novel' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedNovel
    });

  } catch (error) {
    console.error('Error updating novel metadata:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - เผยแพร่นิยาย
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body; // 'publish' หรือ 'unpublish'

    await dbConnect();

    // ตรวจสอบสิทธิ์ในการเข้าถึงนิยาย
    const novel = await NovelModel.findOne({
      slug: decodeURIComponent(slug),
      author: session.user.id,
      isDeleted: { $ne: true }
    });

    if (!novel) {
      return NextResponse.json(
        { error: 'Novel not found' },
        { status: 404 }
      );
    }

    let updateData: any = {
      updatedAt: new Date()
    };

    if (action === 'publish') {
      // ตรวจสอบความพร้อมในการเผยแพร่
      if (!novel.title || !novel.synopsis) {
        return NextResponse.json(
          { error: 'Title and synopsis are required for publishing' },
          { status: 400 }
        );
      }

      updateData.status = 'published';
      updateData.publishedAt = new Date();
      
    } else if (action === 'unpublish') {
      updateData.status = 'unpublished';
      updateData.publishedAt = null;
      
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // อัปเดตสถานะการเผยแพร่
    const updatedNovel = await NovelModel.findOneAndUpdate(
      {
        slug: decodeURIComponent(slug),
        author: session.user.id,
        isDeleted: { $ne: true }
      },
      { $set: updateData },
      {
        new: true,
        runValidators: true
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedNovel,
      message: action === 'publish' ? 'Novel published successfully' : 'Novel unpublished successfully'
    });

  } catch (error) {
    console.error('Error updating novel publication status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
