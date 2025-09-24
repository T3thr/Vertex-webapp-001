import dbConnect from '@/backend/lib/mongodb';
import NovelModel, { INovel } from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import SceneModel from '@/backend/models/Scene';
import StoryMapModel from '@/backend/models/StoryMap';
import BoardModel from '@/backend/models/Board';
import CommentModel from '@/backend/models/Comment';
import UserModel, { IUser } from '@/backend/models/User';
import CategoryModel, { ICategory } from '@/backend/models/Category';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { Types } from 'mongoose';

// Existing GET endpoint (keeping the original implementation)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();

    // รอการ resolve ของ params ใน Next.js 15
    const { slug } = await context.params;

    // Decode slug เพื่อจัดการกับ special characters
    const decodedSlug = decodeURIComponent(slug);

    console.log(`📡 [API /novels/[slug]] กำลังดึงข้อมูลนิยายสำหรับ slug: "${decodedSlug}"`);

    // ค้นหานิยายตาม slug พร้อม populate ข้อมูลที่เกี่ยวข้อง
    const novelFromDb = await NovelModel.findOne({
      slug: decodedSlug,
      isDeleted: false,
    })
      .populate<{ author: IUser }>({
        path: 'author',
        select: '_id username profile writerStats',
        model: UserModel,
      })
      .populate<{ 'themeAssignment.mainTheme.categoryId': ICategory }>({
        path: 'themeAssignment.mainTheme.categoryId',
        select: '_id name slug color',
        model: CategoryModel,
      })
      .populate<{ 'themeAssignment.subThemes.categoryId': ICategory[] }>({
        path: 'themeAssignment.subThemes.categoryId',
        select: '_id name slug color',
        model: CategoryModel,
      })
      .populate<{ 'themeAssignment.moodAndTone': ICategory[] }>({
        path: 'themeAssignment.moodAndTone',
        select: '_id name slug color',
        model: CategoryModel,
      })
      .populate<{ 'themeAssignment.contentWarnings': ICategory[] }>({
        path: 'themeAssignment.contentWarnings',
        select: '_id name slug color',
        model: CategoryModel,
      })
      .populate<{ ageRatingCategoryId: ICategory }>({
        path: 'ageRatingCategoryId',
        select: '_id name slug color',
        model: CategoryModel,
      })
      .populate<{ language: ICategory }>({
        path: 'language',
        select: '_id name slug',
        model: CategoryModel,
      })
      .lean();

    // ตรวจสอบว่าพบนิยายหรือไม่
    if (!novelFromDb) {
      console.warn(`⚠️ [API /novels/[slug]] ไม่พบนิยายสำหรับ slug: "${decodedSlug}"`);
      return NextResponse.json(
        {
          error: "Novel not found",
          message: `ไม่พบนิยายที่มี slug "${decodedSlug}"`,
        },
        { status: 404 }
      );
    }

    // ฟังก์ชันช่วยแปลง category เป็น PopulatedCategoryInfo
    const transformCategory = (cat: any) => {
      if (!cat) return null;
      return {
        _id: cat._id?.toString() || '',
        name: cat.name || '',
        slug: cat.slug || '',
        color: cat.color || '#6B7280'
      };
    };

    // แปลงข้อมูลให้เป็น format ที่ต้องการ
    const transformedNovel = {
      _id: novelFromDb._id.toString(),
      title: novelFromDb.title,
      slug: novelFromDb.slug,
      synopsis: novelFromDb.synopsis,
      longDescription: novelFromDb.longDescription,
      coverImageUrl: novelFromDb.coverImageUrl,
      bannerImageUrl: novelFromDb.bannerImageUrl,
      status: novelFromDb.status,
      accessLevel: novelFromDb.accessLevel,
      isCompleted: novelFromDb.isCompleted,
      endingType: novelFromDb.endingType,
      totalEpisodesCount: novelFromDb.totalEpisodesCount,
      publishedEpisodesCount: novelFromDb.publishedEpisodesCount,
      publishedAt: novelFromDb.publishedAt?.toISOString(),
      lastContentUpdatedAt: novelFromDb.lastContentUpdatedAt.toISOString(),
      createdAt: novelFromDb.createdAt.toISOString(),
      updatedAt: novelFromDb.updatedAt.toISOString(),
      
      // Author information
      author: {
        _id: novelFromDb.author._id.toString(),
        username: novelFromDb.author.username,
        profile: novelFromDb.author.profile
      },
      
      // Theme assignment with populated categories
      themeAssignment: {
        mainTheme: {
          categoryId: transformCategory(novelFromDb.themeAssignment.mainTheme.categoryId),
          customName: novelFromDb.themeAssignment.mainTheme.customName
        },
        subThemes: novelFromDb.themeAssignment.subThemes?.map((subTheme: any) => ({
          categoryId: transformCategory(subTheme.categoryId),
          customName: subTheme.customName
        })) || [],
        moodAndTone: novelFromDb.themeAssignment.moodAndTone?.map(transformCategory) || [],
        contentWarnings: novelFromDb.themeAssignment.contentWarnings?.map(transformCategory) || [],
        customTags: novelFromDb.themeAssignment.customTags || []
      },
      
      // Other populated fields
      ageRatingCategoryId: transformCategory(novelFromDb.ageRatingCategoryId),
      language: transformCategory(novelFromDb.language),
      
      // Stats
      stats: novelFromDb.stats,
      
      // Monetization settings
      monetizationSettings: novelFromDb.monetizationSettings,
      
      // Source type
      sourceType: novelFromDb.sourceType
    };

    console.log(`✅ [API /novels/[slug]] ดึงข้อมูลนิยาย "${novelFromDb.title}" สำเร็จ`);

    return NextResponse.json({
      success: true,
      novel: transformedNovel
    });

  } catch (error: any) {
    console.error('❌ [API /novels/[slug]] เกิดข้อผิดพลาด:', error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย",
        details: error.message
      },
      { status: 500 }
    );
  }
}

// NEW: Complete novel deletion endpoint
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();

    // Get session for authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'
      }, { status: 401 });
    }

    const { slug } = await context.params;
    const decodedSlug = decodeURIComponent(slug);

    console.log(`🗑️ [DELETE Novel] เริ่มกระบวนการลบนิยาย slug: "${decodedSlug}" โดย user: ${session.user.id}`);

    // Find the novel to delete
    const novel = await NovelModel.findOne({
      slug: decodedSlug,
      isDeleted: { $ne: true }
    }).select('_id title author coAuthors');

    if (!novel) {
      return NextResponse.json({
        error: 'Novel not found',
        message: 'ไม่พบนิยายที่ต้องการลบ'
      }, { status: 404 });
    }

    // Check authorization - only author or co-authors can delete
    const userId = new Types.ObjectId(session.user.id);
    const isAuthor = (novel.author as any).equals(userId);
    const isCoAuthor = novel.coAuthors && novel.coAuthors.some((coAuthor: any) => 
      (coAuthor._id || coAuthor).equals(userId)
    );

    if (!isAuthor && !isCoAuthor) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'คุณไม่มีสิทธิ์ลบนิยายเรื่องนี้'
      }, { status: 403 });
    }

    const novelId = novel._id;
    const novelTitle = novel.title;

    console.log(`🗑️ [DELETE Novel] เริ่มลบข้อมูลที่เกี่ยวข้องกับนิยาย: "${novelTitle}" (ID: ${novelId})`);

    // Start cascade deletion process
    const deletionResults = {
      novel: false,
      episodes: 0,
      scenes: 0,
      storyMaps: 0,
      boards: 0,
      comments: 0,
      errors: [] as string[]
    };

    try {
      // 1. Delete all scenes related to this novel
      console.log('🗑️ [DELETE Novel] กำลังลบ Scenes...');
      const scenesResult = await SceneModel.deleteMany({ novelId: novelId });
      deletionResults.scenes = scenesResult.deletedCount || 0;
      console.log(`✅ [DELETE Novel] ลบ Scenes จำนวน: ${deletionResults.scenes}`);
    } catch (error: any) {
      deletionResults.errors.push(`Scenes deletion error: ${error.message}`);
      console.error('❌ [DELETE Novel] Error deleting scenes:', error);
    }

    try {
      // 2. Delete all episodes related to this novel
      console.log('🗑️ [DELETE Novel] กำลังลบ Episodes...');
      const episodesResult = await EpisodeModel.deleteMany({ novelId: novelId });
      deletionResults.episodes = episodesResult.deletedCount || 0;
      console.log(`✅ [DELETE Novel] ลบ Episodes จำนวน: ${deletionResults.episodes}`);
    } catch (error: any) {
      deletionResults.errors.push(`Episodes deletion error: ${error.message}`);
      console.error('❌ [DELETE Novel] Error deleting episodes:', error);
    }

    try {
      // 3. Delete all story maps related to this novel
      console.log('🗑️ [DELETE Novel] กำลังลบ Story Maps...');
      const storyMapsResult = await StoryMapModel.deleteMany({ novelId: novelId });
      deletionResults.storyMaps = storyMapsResult.deletedCount || 0;
      console.log(`✅ [DELETE Novel] ลบ Story Maps จำนวน: ${deletionResults.storyMaps}`);
    } catch (error: any) {
      deletionResults.errors.push(`Story Maps deletion error: ${error.message}`);
      console.error('❌ [DELETE Novel] Error deleting story maps:', error);
    }

    try {
      // 4. Handle boards - unlink novel association instead of deleting
      console.log('🗑️ [DELETE Novel] กำลังยกเลิกการเชื่อมโยง Boards...');
      const boardsResult = await BoardModel.updateMany(
        { novelAssociated: novelId },
        { 
          $unset: { novelAssociated: 1 },
          $set: { 
            isOrphaned: true,
            orphanedReason: `Novel "${novelTitle}" was deleted`,
            orphanedAt: new Date()
          }
        }
      );
      deletionResults.boards = boardsResult.modifiedCount || 0;
      console.log(`✅ [DELETE Novel] ยกเลิกการเชื่อมโยง Boards จำนวน: ${deletionResults.boards}`);
    } catch (error: any) {
      deletionResults.errors.push(`Boards unlinking error: ${error.message}`);
      console.error('❌ [DELETE Novel] Error unlinking boards:', error);
    }

    try {
      // 5. Delete comments related to this novel and its episodes
      console.log('🗑️ [DELETE Novel] กำลังลบ Comments...');
      const commentsResult = await CommentModel.deleteMany({
        $or: [
          { 'context.novelId': novelId },
          { targetType: 'NOVEL', targetId: novelId }
        ]
      });
      deletionResults.comments = commentsResult.deletedCount || 0;
      console.log(`✅ [DELETE Novel] ลบ Comments จำนวน: ${deletionResults.comments}`);
    } catch (error: any) {
      deletionResults.errors.push(`Comments deletion error: ${error.message}`);
      console.error('❌ [DELETE Novel] Error deleting comments:', error);
    }

    try {
      // 6. Finally, delete the novel itself using findOneAndDelete to trigger middleware
      console.log('🗑️ [DELETE Novel] กำลังลบ Novel หลัก...');
      const deletedNovel = await NovelModel.findOneAndDelete({ _id: novelId });
      deletionResults.novel = !!deletedNovel;
      console.log(`✅ [DELETE Novel] ลบ Novel หลักสำเร็จ: ${deletionResults.novel}`);
    } catch (error: any) {
      deletionResults.errors.push(`Novel deletion error: ${error.message}`);
      console.error('❌ [DELETE Novel] Error deleting novel:', error);
      
      // If novel deletion fails, this is critical
      return NextResponse.json({
        error: 'Novel deletion failed',
        message: 'เกิดข้อผิดพลาดในการลบนิยาย',
        details: error.message,
        partialResults: deletionResults
      }, { status: 500 });
    }

    // Log final results
    console.log(`🎉 [DELETE Novel] การลบนิยาย "${novelTitle}" เสร็จสิ้น:`, deletionResults);

    // Return success response with deletion summary
    return NextResponse.json({
      success: true,
      message: `ลบนิยาย "${novelTitle}" และข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว`,
      deletionSummary: {
        novelTitle,
        episodesDeleted: deletionResults.episodes,
        scenesDeleted: deletionResults.scenes,
        storyMapsDeleted: deletionResults.storyMaps,
        boardsUnlinked: deletionResults.boards,
        commentsDeleted: deletionResults.comments,
        errors: deletionResults.errors
      }
    });

  } catch (error: any) {
    console.error('❌ [DELETE Novel] Critical error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'เกิดข้อผิดพลาดร้ายแรงในการลบนิยาย',
      details: error.message
    }, { status: 500 });
  }
}