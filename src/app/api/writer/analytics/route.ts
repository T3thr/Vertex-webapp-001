import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import mongoose, { Types } from 'mongoose';

// Import Models
import UserModel from '@/backend/models/User';
import UserProfileModel from '@/backend/models/UserProfile';
import NovelModel from '@/backend/models/Novel';
import WriterStatsModel from '@/backend/models/WriterStats';
import EarningAnalyticModel from '@/backend/models/EarningAnalytic';
import EarningTransactionModel from '@/backend/models/EarningTransaction';

export async function GET(request: NextRequest) {
  try {
    // ตรวจสอบ authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    await dbConnect();
    const userId = new Types.ObjectId(session.user.id);

    // ดึงข้อมูลผู้ใช้และโปรไฟล์
    const [user, userProfile] = await Promise.all([
      UserModel.findById(userId).lean(),
      UserProfileModel.findOne({ userId }).lean()
    ]);

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้ใช้' },
        { status: 404 }
      );
    }

    // ดึงข้อมูลนิยายของผู้ใช้
    const novels = await NovelModel.find({ 
      author: userId, 
      isDeleted: { $ne: true } 
    }).lean();

    // คำนวณสถิติจากนิยาย
    const totalNovels = novels.length;
    const totalViews = novels.reduce((sum, novel) => sum + (novel.stats?.viewsCount || 0), 0);
    const totalLikes = novels.reduce((sum, novel) => sum + (novel.stats?.likesCount || 0), 0);
    const totalComments = novels.reduce((sum, novel) => sum + (novel.stats?.commentsCount || 0), 0);

    // ดึงข้อมูลรายได้
    const earningAnalytics = await EarningAnalyticModel.find({
      targetType: 'writer',
      targetId: userId
    }).sort({ summaryDate: -1 }).limit(12).lean();

    const totalEarnings = earningAnalytics.reduce((sum, analytic) => 
      sum + (analytic.totalEarningsThisPeriod || 0), 0
    );

    // ดึงข้อมูลผู้ติดตาม (จาก UserProfile.socialStats)
    const totalFollowers = userProfile?.socialStats?.followersCount || 0;

    // ดึงข้อมูลรายได้รายเดือน (สำหรับ charts)
    const monthlyEarnings = await EarningAnalyticModel.aggregate([
      {
        $match: {
          targetType: 'writer',
          targetId: userId,
          summaryDate: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$summaryDate' },
            month: { $month: '$summaryDate' }
          },
          totalEarnings: { $sum: '$totalEarningsThisPeriod' },
          totalViews: { $sum: '$totalViewsThisPeriod' },
          totalReads: { $sum: '$totalReadsThisPeriod' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // ดึงข้อมูลนิยายยอดนิยม (Top 30)
    const topNovelsByViews = await NovelModel.find({
      author: userId,
      isDeleted: { $ne: true },
      status: { $in: ['published', 'completed'] }
    })
    .sort({ 'stats.viewsCount': -1 })
    .limit(30)
    .select('title stats.viewsCount stats.averageRating stats.likesCount')
    .lean();

    // ดึงข้อมูลนิยายที่มีรายได้สูงสุด (จำลองจากยอดชม * คะแนน)
    const topNovelsByEarnings = novels
      .map(novel => ({
        ...novel,
        estimatedEarnings: (novel.stats?.viewsCount || 0) * (novel.stats?.averageRating || 1) * 0.1
      }))
      .sort((a, b) => b.estimatedEarnings - a.estimatedEarnings)
      .slice(0, 30);

    // ดึงข้อมูลการกระจายตามประเภท
    const genreDistribution = await NovelModel.aggregate([
      {
        $match: {
          author: userId,
          isDeleted: { $ne: true }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'themeAssignment.mainTheme.categoryId',
          foreignField: '_id',
          as: 'genre'
        }
      },
      {
        $unwind: '$genre'
      },
      {
        $group: {
          _id: '$genre.name',
          count: { $sum: 1 },
          totalViews: { $sum: '$stats.viewsCount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // ข้อมูลการมีส่วนร่วมของผู้อ่าน (Engagement Timeline)
    const engagementTimeline = await NovelModel.aggregate([
      {
        $match: {
          author: userId,
          isDeleted: { $ne: true },
          publishedAt: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$publishedAt' },
            month: { $month: '$publishedAt' }
          },
          totalViews: { $sum: '$stats.viewsCount' },
          totalLikes: { $sum: '$stats.likesCount' },
          totalComments: { $sum: '$stats.commentsCount' },
          novelCount: { $sum: 1 }
        }
      },
      {
        $addFields: {
          engagementRate: {
            $cond: {
              if: { $gt: ['$totalViews', 0] },
              then: { $multiply: [{ $divide: [{ $add: ['$totalLikes', '$totalComments'] }, '$totalViews'] }, 100] },
              else: 0
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        // สถิติพื้นฐาน
        totalNovels,
        totalViews,
        totalLikes,
        totalComments,
        totalEarnings,
        totalFollowers,
        
        // ข้อมูลสำหรับ Charts
        monthlyEarnings,
        genreDistribution,
        engagementTimeline,
        topNovelsByViews,
        topNovelsByEarnings,
        
        // ข้อมูลเพิ่มเติม
        averageRating: novels.length > 0 
          ? novels.reduce((sum, novel) => sum + (novel.stats?.averageRating || 0), 0) / novels.length
          : 0,
        publishedNovels: novels.filter(novel => 
          ['published', 'completed'].includes(novel.status)
        ).length,
        totalChapters: novels.reduce((sum, novel) => 
          sum + (novel.publishedEpisodesCount || 0), 0
        )
      }
    });

  } catch (error) {
    console.error('Error in writer analytics API:', error);
    return NextResponse.json(
      { 
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 