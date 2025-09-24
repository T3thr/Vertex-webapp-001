import dbConnect from '@/backend/lib/mongodb';
import NovelModel from '@/backend/models/Novel';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // ดึงข้อมูลนิยายที่เผยแพร่แล้ว
    const novels = await NovelModel.find({
      status: 'published',
      isDeleted: false
    })
    .select('_id title coverImageUrl slug synopsis isCompleted isFeatured publishedAt status totalEpisodesCount publishedEpisodesCount monetizationSettings stats')
    .sort({ title: 1 })
    .lean();

    // แปลง _id เป็น id string และเพิ่มข้อมูลที่จำเป็นสำหรับ NovelCard
    const novelsWithId = novels.map(novel => ({
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
        _id: "default-author-id",
        username: "author",
        profile: {
          displayName: "นักเขียน",
          penName: "นักเขียน",
          avatarUrl: "/images/default-avatar.png"
        }
      },
      themeAssignment: {
        mainTheme: {
          categoryId: {
            name: "ทั่วไป",
            color: "#8bc34a"
          }
        }
      },
      stats: {
        viewsCount: novel.stats?.viewsCount || 0,
        likesCount: novel.stats?.likesCount || 0,
        averageRating: novel.stats?.averageRating || 0,
        lastPublishedEpisodeAt: novel.stats?.lastPublishedEpisodeAt || new Date()
      }
    }));

    return NextResponse.json({
      success: true,
      novels: novelsWithId
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