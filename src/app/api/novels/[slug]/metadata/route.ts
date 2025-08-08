// app/api/novels/[slug]/metadata/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import CategoryModel from '@/backend/models/Category';
import { NovelStatus } from '@/backend/models/Novel';

/**
 * GET - ดึงข้อมูล metadata ของนิยาย
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    await dbConnect();

    // ดึงข้อมูลนิยายพร้อม populate ข้อมูลที่เกี่ยวข้อง
    const novel = await NovelModel.findOne({
      slug: decodedSlug,
      author: session.user.id,
      isDeleted: { $ne: true }
    })
    .populate('author', 'profile')
    .populate([
      { path: 'themeAssignment.mainTheme.categoryId' },
      { path: 'themeAssignment.subThemes.categoryId' },
      { path: 'themeAssignment.moodAndTone' },
      { path: 'themeAssignment.contentWarnings' },
    ])
    .populate([
      { path: 'narrativeFocus.narrativePacingTags' },
      { path: 'narrativeFocus.primaryConflictTypes' },
      { path: 'narrativeFocus.narrativePerspective' },
      { path: 'narrativeFocus.storyArcStructure' },
      { path: 'narrativeFocus.artStyle' },
      { path: 'narrativeFocus.gameplayMechanics' },
      { path: 'narrativeFocus.interactivityLevel' },
      { path: 'narrativeFocus.playerAgencyLevel' },
      { path: 'narrativeFocus.lengthTag' },
      { path: 'narrativeFocus.commonTropes' },
      { path: 'narrativeFocus.targetAudienceProfileTags' },
      { path: 'narrativeFocus.avoidIfYouDislikeTags' },
    ])
    .populate('ageRatingCategoryId')
    .populate('language')
    .lean();

    if (!novel) {
      return NextResponse.json({ error: 'ไม่พบนิยาย' }, { status: 404 });
    }

    // แปลงข้อมูลให้เป็น JSON-serializable
    const serializedNovel = JSON.parse(JSON.stringify(novel));

    return NextResponse.json({ 
      success: true,
      novel: serializedNovel 
    });

  } catch (error) {
    console.error('[API] เกิดข้อผิดพลาดในการดึง metadata:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}

/**
 * PUT - อัปเดต metadata ของนิยาย
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const body = await request.json();

    await dbConnect();

    // ตรวจสอบสิทธิ์เข้าถึงนิยาย
    const novel = await NovelModel.findOne({
      slug: decodedSlug,
      author: session.user.id,
      isDeleted: { $ne: true }
    });

    if (!novel) {
      return NextResponse.json({ error: 'ไม่พบนิยาย' }, { status: 404 });
    }

    // สร้าง object สำหรับอัปเดต (กรองเฉพาะ field ที่อนุญาต)
    const allowedUpdates: any = {};

    // ข้อมูลพื้นฐาน
    if (body.title) allowedUpdates.title = body.title;
    if (body.synopsis) allowedUpdates.synopsis = body.synopsis;
    if (body.longDescription !== undefined) allowedUpdates.longDescription = body.longDescription;
    if (body.coverImageUrl !== undefined) allowedUpdates.coverImageUrl = body.coverImageUrl;
    if (body.bannerImageUrl !== undefined) allowedUpdates.bannerImageUrl = body.bannerImageUrl;

    // สถานะ
    if (body.status && Object.values(NovelStatus).includes(body.status)) {
      allowedUpdates.status = body.status;
    }

    if (body.isCompleted !== undefined) allowedUpdates.isCompleted = body.isCompleted;
    if (body.endingType) allowedUpdates.endingType = body.endingType;
    if (body.accessLevel) allowedUpdates.accessLevel = body.accessLevel;

    // Theme Assignment
    if (body.themeAssignment) {
      allowedUpdates.themeAssignment = {
        ...novel.themeAssignment,
        ...body.themeAssignment
      };
    }

    // Narrative Focus
    if (body.narrativeFocus) {
      allowedUpdates.narrativeFocus = {
        ...novel.narrativeFocus,
        ...body.narrativeFocus
      };
    }

    // World Building Details
    if (body.worldBuildingDetails) {
      allowedUpdates.worldBuildingDetails = {
        ...novel.worldBuildingDetails,
        ...body.worldBuildingDetails
      };
    }

    // Categories
    if (body.ageRatingCategoryId) allowedUpdates.ageRatingCategoryId = body.ageRatingCategoryId;
    if (body.language) allowedUpdates.language = body.language;

    // Monetization Settings
    if (body.monetizationSettings) {
      allowedUpdates.monetizationSettings = {
        ...novel.monetizationSettings,
        ...body.monetizationSettings
      };
    }

    // Psychological Analysis Config
    if (body.psychologicalAnalysisConfig) {
      allowedUpdates.psychologicalAnalysisConfig = {
        ...novel.psychologicalAnalysisConfig,
        ...body.psychologicalAnalysisConfig
      };
    }

    // อัปเดต timestamp
    allowedUpdates.lastContentUpdatedAt = new Date();

    // ทำการอัปเดต
    const updatedNovel = await NovelModel.findByIdAndUpdate(
      novel._id,
      { $set: allowedUpdates },
      { 
        new: true, 
        runValidators: true 
      }
    )
    .populate('author', 'profile')
    .populate([
      { path: 'themeAssignment.mainTheme.categoryId' },
      { path: 'themeAssignment.subThemes.categoryId' },
      { path: 'themeAssignment.moodAndTone' },
      { path: 'themeAssignment.contentWarnings' },
    ])
    .populate([
      { path: 'narrativeFocus.narrativePacingTags' },
      { path: 'narrativeFocus.primaryConflictTypes' },
      { path: 'narrativeFocus.narrativePerspective' },
      { path: 'narrativeFocus.storyArcStructure' },
      { path: 'narrativeFocus.artStyle' },
      { path: 'narrativeFocus.gameplayMechanics' },
      { path: 'narrativeFocus.interactivityLevel' },
      { path: 'narrativeFocus.playerAgencyLevel' },
      { path: 'narrativeFocus.lengthTag' },
      { path: 'narrativeFocus.commonTropes' },
      { path: 'narrativeFocus.targetAudienceProfileTags' },
      { path: 'narrativeFocus.avoidIfYouDislikeTags' },
    ])
    .populate('ageRatingCategoryId')
    .populate('language');

    const serializedNovel = JSON.parse(JSON.stringify(updatedNovel));

    return NextResponse.json({ 
      success: true,
      message: 'อัปเดต metadata สำเร็จ',
      novel: serializedNovel 
    });

  } catch (error) {
    console.error('[API] เกิดข้อผิดพลาดในการอัปเดต metadata:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}

/**
 * PATCH - อัปเดตบางส่วนของ metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const body = await request.json();

    await dbConnect();

    // ตรวจสอบสิทธิ์เข้าถึงนิยาย
    const novel = await NovelModel.findOne({
      slug: decodedSlug,
      author: session.user.id,
      isDeleted: { $ne: true }
    });

    if (!novel) {
      return NextResponse.json({ error: 'ไม่พบนิยาย' }, { status: 404 });
    }

    // จัดการการอัปเดตแบบเฉพาะเจาะจง
    const updateOperations: any = {};

    // อัปเดตสถิติ (เฉพาะ admin หรือระบบภายใน)
    if (body.operation === 'update_stats' && body.stats) {
      updateOperations['stats'] = {
        ...novel.stats,
        ...body.stats
      };
    }

    // อัปเดตการตั้งค่าการเผยแพร่
    if (body.operation === 'update_publishing' && body.publishingData) {
      if (body.publishingData.publishedAt !== undefined) {
        updateOperations.publishedAt = body.publishingData.publishedAt;
      }
      if (body.publishingData.scheduledPublicationDate !== undefined) {
        updateOperations.scheduledPublicationDate = body.publishingData.scheduledPublicationDate;
      }
      if (body.publishingData.status && Object.values(NovelStatus).includes(body.publishingData.status)) {
        updateOperations.status = body.publishingData.status;
      }
    }

    // อัปเดต feature flag
    if (body.operation === 'update_featured' && body.isFeatured !== undefined) {
      updateOperations.isFeatured = body.isFeatured;
    }

    // ถ้าไม่มีการดำเนินการใด ๆ
    if (Object.keys(updateOperations).length === 0) {
      return NextResponse.json({ 
        error: 'ไม่มีข้อมูลที่ต้องอัปเดต' 
      }, { status: 400 });
    }

    // อัปเดต timestamp
    updateOperations.updatedAt = new Date();

    const updatedNovel = await NovelModel.findByIdAndUpdate(
      novel._id,
      { $set: updateOperations },
      { new: true, runValidators: true }
    );

    const serializedNovel = JSON.parse(JSON.stringify(updatedNovel));

    return NextResponse.json({ 
      success: true,
      message: 'อัปเดตข้อมูลสำเร็จ',
      novel: serializedNovel 
    });

  } catch (error) {
    console.error('[API] เกิดข้อผิดพลาดในการ PATCH metadata:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}