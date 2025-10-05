import dbConnect from '@/backend/lib/mongodb';
import NovelModel, { NovelStatus, NovelAccessLevel, NovelEndingType, NovelContentType } from '@/backend/models/Novel';
import StoryMapModel, { StoryMapNodeType } from '@/backend/models/StoryMap';
import CategoryModel, { CategoryType } from '@/backend/models/Category';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { Types } from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'published';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const novelType = searchParams.get('novelType');
    
    const skip = (page - 1) * limit;

    // Build base query
    const query: any = {
      isDeleted: false,
      accessLevel: { $in: ['public', 'unlisted'] } // Only show public and unlisted novels
    };

    // Apply filters based on filter parameter
    switch (filter) {
      case 'trending':
        query.status = NovelStatus.PUBLISHED;
        query['stats.trendingStats.trendingScore'] = { $gt: 0 };
        break;
        
      case 'published':
      case 'new_releases':
        query.status = NovelStatus.PUBLISHED;
        break;
        
      case 'promoted':
        query.status = NovelStatus.PUBLISHED;
        query['monetizationSettings.activePromotion.isActive'] = true;
        break;
        
      case 'completed':
        query.status = { $in: [NovelStatus.PUBLISHED, NovelStatus.COMPLETED] };
        query.isCompleted = true;
        break;
        
      default:
        query.status = NovelStatus.PUBLISHED;
        break;
    }

    // Apply novel type filter if specified
    if (novelType) {
      query['sourceType.type'] = novelType;
    }

    // Determine sort order based on filter
    let sort: any = { publishedAt: -1 }; // Default: newest first
    
    switch (filter) {
      case 'trending':
        sort = { 'stats.trendingStats.trendingScore': -1, 'stats.viewsCount': -1 };
        break;
      case 'published':
        sort = { 'stats.lastPublishedEpisodeAt': -1, publishedAt: -1 };
        break;
      case 'promoted':
        sort = { 'stats.trendingStats.trendingScore': -1, publishedAt: -1 };
        break;
      case 'completed':
        sort = { 'stats.averageRating': -1, 'stats.viewsCount': -1 };
        break;
    }

    // Execute query
    const novels = await NovelModel.find(query)
      .select('_id title coverImageUrl slug synopsis isCompleted isFeatured publishedAt status totalEpisodesCount publishedEpisodesCount monetizationSettings stats author themeAssignment')
      .populate('author', 'profile.displayName profile.penName profile.avatarUrl')
      .populate('themeAssignment.mainTheme.categoryId', 'name color')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // แปลง _id เป็น id string และเพิ่มข้อมูลที่จำเป็นสำหรับ NovelCard
    const novelsWithId = novels.map((novel: any) => ({
      _id: novel._id.toString(),
      id: novel._id.toString(),
      title: novel.title,
      slug: novel.slug || `novel-${novel._id.toString()}`,
      synopsis: novel.synopsis || "",
      coverImageUrl: novel.coverImageUrl || "/images/default.png",
      isCompleted: novel.isCompleted || false,
      isFeatured: novel.isFeatured || false,
      publishedAt: novel.publishedAt || new Date(),
      status: novel.status || "published",
      totalEpisodesCount: novel.totalEpisodesCount || 0,
      publishedEpisodesCount: novel.publishedEpisodesCount || 0,
      currentEpisodePriceCoins: novel.monetizationSettings?.defaultEpisodePriceCoins || 0,
      author: {
        _id: novel.author?._id?.toString() || "default-author-id",
        username: novel.author?.username || "author",
        profile: {
          displayName: novel.author?.profile?.displayName || novel.author?.profile?.penName || "นักเขียน",
          penName: novel.author?.profile?.penName || novel.author?.profile?.displayName || "นักเขียน",
          avatarUrl: novel.author?.profile?.avatarUrl || "/images/default-avatar.png"
        }
      },
      themeAssignment: {
        mainTheme: {
          categoryId: {
            name: novel.themeAssignment?.mainTheme?.categoryId?.name || "ทั่วไป",
            color: novel.themeAssignment?.mainTheme?.categoryId?.color || "#8bc34a"
          }
        }
      },
      stats: {
        viewsCount: novel.stats?.viewsCount || 0,
        likesCount: novel.stats?.likesCount || 0,
        averageRating: novel.stats?.averageRating || 0,
        lastPublishedEpisodeAt: novel.stats?.lastPublishedEpisodeAt || new Date(),
        trendingScore: novel.stats?.trendingStats?.trendingScore || 0
      }
    }));

    // Get total count for pagination
    const totalCount = await NovelModel.countDocuments(query);

    return NextResponse.json({
      success: true,
      novels: novelsWithId,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + novelsWithId.length < totalCount
      },
      filter,
      novelType
    });

  } catch (error) {
    console.error('Error fetching novels:', error);
    return NextResponse.json(
      {
        success: false, 
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // ตรวจสอบ authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    
    const title = formData.get('title') as string;
    const slug = formData.get('slug') as string;
    const penName = formData.get('penName') as string;
    const synopsis = formData.get('synopsis') as string;
    const longDescription = formData.get('longDescription') as string;
    const contentType = formData.get('contentType') as string;
    const endingType = formData.get('endingType') as string;
    const authorId = formData.get('authorId') as string;
    const mainThemeId = formData.get('mainThemeId') as string;
    const languageId = formData.get('languageId') as string;
    const ageRating = formData.get('ageRating') as string;
    const coverImage = formData.get('coverImage') as File;
    const bannerImage = formData.get('bannerImage') as File;

    // Validation
    if (!title?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อเรื่อง' }, { status: 400 });
    }

    if (!slug?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุ Slug' }, { status: 400 });
    }

    if (!penName?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุนามปากกา' }, { status: 400 });
    }

    if (!synopsis?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุเรื่องย่อ' }, { status: 400 });
    }

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์สร้างนิยาย
    if (authorId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ตรวจสอบและหา default categories
    let validMainThemeId = mainThemeId;
    let validLanguageId = languageId;
    const validAgeRatingId = ageRating;

    // หา default theme ถ้าไม่ได้เลือก
    if (!validMainThemeId) {
      let defaultTheme = await CategoryModel.findOne({
        categoryType: CategoryType.THEME,
        slug: 'general',
        isActive: true
      });

      if (!defaultTheme) {
        defaultTheme = await CategoryModel.create({
          name: 'ทั่วไป',
          slug: 'general',
          categoryType: CategoryType.THEME,
          description: 'หมวดหมู่ทั่วไป',
          isActive: true,
          isSystemDefined: true,
          visibility: 'public',
          displayOrder: 0,
          color: '#8bc34a'
        });
      }
      validMainThemeId = defaultTheme._id.toString();
    }

    // หา default language ถ้าไม่ได้เลือก
    if (!validLanguageId) {
      let defaultLanguage = await CategoryModel.findOne({
        categoryType: CategoryType.LANGUAGE,
        slug: 'thai',
        isActive: true
      });

      if (!defaultLanguage) {
        defaultLanguage = await CategoryModel.create({
          name: 'ไทย',
          slug: 'thai',
          categoryType: CategoryType.LANGUAGE,
          description: 'ภาษาไทย',
          isActive: true,
          isSystemDefined: true,
          visibility: 'public',
          displayOrder: 0
        });
      }
      validLanguageId = defaultLanguage._id.toString();
    }

    // ตรวจสอบ Category IDs ที่ถูกเลือก
    const categoryChecks = [];
    if (validMainThemeId) {
      categoryChecks.push(CategoryModel.findById(validMainThemeId));
    }
    if (validLanguageId) {
      categoryChecks.push(CategoryModel.findById(validLanguageId));
    }
    if (validAgeRatingId) {
      categoryChecks.push(CategoryModel.findById(validAgeRatingId));
    }

    if (categoryChecks.length > 0) {
      const categoryResults = await Promise.all(categoryChecks);
      const invalidCategories = categoryResults.filter(cat => !cat);
      if (invalidCategories.length > 0) {
        return NextResponse.json({ error: 'หมวดหมู่ที่เลือกไม่ถูกต้อง' }, { status: 400 });
      }
    }

    // ตรวจสอบว่า slug ซ้ำหรือไม่
    const existingNovel = await NovelModel.findOne({ 
      slug: slug.trim().toLowerCase(),
      isDeleted: { $ne: true }
    });

    if (existingNovel) {
      return NextResponse.json({ error: 'Slug นี้ถูกใช้แล้ว กรุณาเลือก Slug อื่น' }, { status: 400 });
    }

    // สร้าง Novel object
    const novelData: any = {
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      synopsis: synopsis.trim(),
      longDescription: longDescription?.trim() || '',
      author: new Types.ObjectId(authorId),
      status: NovelStatus.DRAFT,
      accessLevel: NovelAccessLevel.PRIVATE,
      isCompleted: false,
      endingType: endingType as NovelEndingType || NovelEndingType.MULTIPLE_ENDINGS,
      sourceType: {
        type: contentType as NovelContentType || NovelContentType.INTERACTIVE_FICTION
      },
      themeAssignment: {
        mainTheme: {
          categoryId: new Types.ObjectId(validMainThemeId)
        }
      },
      language: new Types.ObjectId(validLanguageId),
      ageRatingCategoryId: validAgeRatingId ? new Types.ObjectId(validAgeRatingId) : undefined,
      totalEpisodesCount: 0,
      publishedEpisodesCount: 0,
      stats: {
        viewsCount: 0,
        uniqueViewersCount: 0,
        likesCount: 0,
        commentsCount: 0,
        discussionThreadCount: 0,
        ratingsCount: 0,
        averageRating: 0,
        followersCount: 0,
        sharesCount: 0,
        bookmarksCount: 0,
        totalWords: 0,
        estimatedReadingTimeMinutes: 0,
        completionRate: 0,
        purchasesCount: 0
      },
      monetizationSettings: {
        isCoinBasedUnlock: false,
        defaultEpisodePriceCoins: 0,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false
      },
      psychologicalAnalysisConfig: {
        allowsPsychologicalAnalysis: false
      },
      collaborationSettings: {
        allowCoAuthorRequests: false
      }
    };

    // Handle image uploads (simplified - in production, use cloud storage)
    if (coverImage && coverImage.size > 0) {
      // For now, we'll skip file upload and use placeholder
      // In production, upload to cloud storage and set novelData.coverImageUrl
      console.log('Cover image upload skipped for now');
    }

    if (bannerImage && bannerImage.size > 0) {
      // For now, we'll skip file upload and use placeholder
      // In production, upload to cloud storage and set novelData.bannerImageUrl
      console.log('Banner image upload skipped for now');
    }

    // สร้าง Novel
    const novel = new NovelModel(novelData);
    await novel.save();

    // สร้าง StoryMap เริ่มต้นสำหรับ Novel
    const startNodeId = `start_${Date.now()}`;
    const storyMapData = {
      novelId: novel._id,
      title: `แผนผังเรื่อง - ${novel.title}`,
      version: 1,
      description: 'แผนผังเรื่องเริ่มต้นสำหรับ Visual Novel',
      nodes: [
        {
          nodeId: startNodeId,
          nodeType: StoryMapNodeType.START_NODE,
          title: 'จุดเริ่มต้น',
          position: { x: 100, y: 100 },
          editorVisuals: {
            color: '#10b981',
            zIndex: 1
          }
        }
      ],
      edges: [],
      groups: [],
      startNodeId: startNodeId,
      storyVariables: [],
      lastModifiedByUserId: new Types.ObjectId(authorId),
      isActive: true,
      editorMetadata: {
        zoomLevel: 1,
        viewOffsetX: 0,
        viewOffsetY: 0,
        gridSize: 20,
        showGrid: true,
        showSceneThumbnails: true,
        showNodeLabels: true,
        uiPreferences: {
          nodeDefaultColor: '#3b82f6',
          edgeDefaultColor: '#64748b',
          connectionLineStyle: 'solid',
          showConnectionLines: true,
          autoSaveEnabled: false,
          autoSaveIntervalSec: 30,
          snapToGrid: false,
          enableAnimations: true,
          nodeDefaultOrientation: 'vertical'
        }
      }
    };

    console.log('[Novel Creation] 🗺️ Creating initial StoryMap:', {
      novelId: novel._id.toString(),
      novelTitle: novel.title,
      startNodeId,
      storyVariablesCount: storyMapData.storyVariables.length
    });

    const storyMap = new StoryMapModel(storyMapData);
    
    try {
      await storyMap.save();
      console.log('[Novel Creation] ✅ StoryMap created successfully:', {
        storyMapId: storyMap._id.toString(),
        version: storyMap.version
      });
    } catch (storyMapError: any) {
      console.error('[Novel Creation] ❌ Failed to create StoryMap:', storyMapError);
      
      // ถ้า StoryMap สร้างไม่สำเร็จ ให้ลบ Novel ที่สร้างไปแล้วด้วย
      try {
        await NovelModel.findByIdAndDelete(novel._id);
        console.log('[Novel Creation] 🗑️ Rolled back Novel creation due to StoryMap error');
      } catch (rollbackError) {
        console.error('[Novel Creation] ❌ Failed to rollback Novel:', rollbackError);
      }
      
      // ส่ง error กลับไปให้ client
      throw storyMapError;
    }

    // Return created novel with populated data
    const createdNovel = await NovelModel.findById(novel._id)
      .populate('language', 'name')
      .populate('themeAssignment.mainTheme.categoryId', 'name color')
      .populate('ageRatingCategoryId', 'name')
      .lean();

    return NextResponse.json({
      success: true,
      novel: {
        ...createdNovel,
        _id: createdNovel?._id.toString(),
        slug: createdNovel?.slug,
        penName: penName
      }
    });

  } catch (error: any) {
    console.error('Error creating novel:', error);
    
    // Handle specific errors
    if (error.code === 11000) {
      return NextResponse.json({ error: 'ชื่อนิยายหรือ slug ซ้ำกัน' }, { status: 400 });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: validationErrors.join(', ') }, { status: 400 });
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างนิยาย' 
      },
      { status: 500 }
    );
  }
}