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
import FollowModel from '@/backend/models/Follow';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    const userId = new Types.ObjectId(session.user.id);

    // ดึงข้อมูลนิยายของนักเขียน
    const novels = await NovelModel.find({
      author: userId,
      isDeleted: { $ne: true }
    }).select('stats title').lean();

    const totalViews = novels.reduce((sum, novel) => 
      sum + (novel.stats?.viewsCount || 0), 0
    );

    const totalLikes = novels.reduce((sum, novel) => 
      sum + (novel.stats?.likesCount || 0), 0
    );

    const totalComments = novels.reduce((sum, novel) => 
      sum + (novel.stats?.commentsCount || 0), 0
    );

    // ดึงข้อมูลรายได้
    const earningAnalytics = await EarningAnalyticModel.find({
      targetType: 'writer',
      targetId: userId
    }).sort({ summaryDate: -1 }).limit(12).lean();

    const totalEarnings = earningAnalytics.reduce((sum, analytic) => 
      sum + (analytic.netEarnings || 0), 0
    );

    // ดึงข้อมูลผู้ติดตามแบบ realtime และแยกประเภท
    // 1. ผู้ติดตามผู้ใช้ (User followers) - จาก Follow model
    const userFollowersCount = await FollowModel.countDocuments({
      followingType: 'User',
      followingId: userId,
      isDeleted: { $ne: true },
      status: 'ACTIVE'
    });

    // 2. ผู้ติดตามนิยายทั้งหมด (Novel followers) - รวมจากทุกนิยาย
    const novelFollowersCount = novels.reduce((sum, novel) => 
      sum + (novel.stats?.followersCount || 0), 0
    );

    // 3. รวมผู้ติดตามทั้งหมด
    const totalFollowers = userFollowersCount + novelFollowersCount;

    // สร้าง breakdown ข้อมูลผู้ติดตาม
    const followersBreakdown = {
      userFollowers: userFollowersCount,
      novelFollowers: novelFollowersCount,
      total: totalFollowers
    };

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
          totalEarnings: { $sum: '$netEarnings' },
          totalViews: { $sum: '$grossRevenue.total' },
          totalTransactions: { $sum: '$transactionCounts.total' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // การกระจายตามประเภทนิยาย (Genre Distribution)
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
          as: 'mainThemeCategory'
        }
      },
      {
        $unwind: {
          path: '$mainThemeCategory',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$mainThemeCategory.name',
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
            month: { $month: '$publishedAt' },
            day: { $dayOfMonth: '$publishedAt' }
          },
          totalViews: { $sum: '$stats.viewsCount' },
          totalLikes: { $sum: '$stats.likesCount' },
          totalComments: { $sum: '$stats.commentsCount' },
          novelsCount: { $sum: 1 }
        }
      },
      {
        $addFields: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          engagement: {
            $add: ['$totalViews', { $multiply: ['$totalLikes', 2] }, { $multiply: ['$totalComments', 3] }]
          }
        }
      },
      {
        $sort: { date: 1 }
      },
      {
        $limit: 30
      }
    ]);

    // นิยายยอดนิยม 30 อันดับแรก (ตามยอดชม)
    const topNovelsByViews = novels
      .sort((a, b) => (b.stats?.viewsCount || 0) - (a.stats?.viewsCount || 0))
      .slice(0, 30)
      .map(novel => ({
        novelId: novel._id.toString(),
        title: novel.title,
        views: novel.stats?.viewsCount || 0
      }));

    // นิยายที่มีรายได้สูงสุด 30 อันดับแรก
    const topNovelsByEarnings = earningAnalytics
      .filter(analytic => analytic.novelId)
      .reduce((acc, analytic) => {
        const novelId = analytic.novelId.toString();
        const existingNovel = acc.find(n => n.novelId === novelId);
        
        if (existingNovel) {
          existingNovel.earnings += analytic.netEarnings || 0;
        } else {
          const novel = novels.find(n => n._id.toString() === novelId);
          if (novel) {
            acc.push({
              novelId: novelId,
              title: novel.title,
              earnings: analytic.netEarnings || 0
            });
          }
        }
        return acc;
      }, [] as Array<{novelId: string, title: string, earnings: number}>)
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 30);

    return NextResponse.json({
      success: true,
      data: {
        // สถิติพื้นฐาน
        totalNovels: novels.length,
        totalViews,
        totalLikes,
        totalComments,
        totalEarnings,
        totalFollowers,
        followersBreakdown, // เพิ่ม breakdown ข้อมูลผู้ติดตาม
        
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
        ),
        
        // เพิ่ม timestamp สำหรับการอัพเดท
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 