// src/app/api/board/user/[username]/route.ts
// API endpoint สำหรับดึงกระทู้ของผู้ใช้

import dbConnect from "@/backend/lib/mongodb";
import { registerModels } from "@/backend/models";
import BoardModel from "@/backend/models/Board";
import UserModel from "@/backend/models/User";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    // ดึง query parameters จาก URL
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    
    if (!username) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุชื่อผู้ใช้" },
        { status: 400 }
      );
    }
    
    await dbConnect();
    registerModels();
    
    // ค้นหาผู้ใช้จากชื่อผู้ใช้
    const user = await UserModel.findOne({ username, isDeleted: false })
      .select('_id')
      .lean();
      
    if (!user) {
      return NextResponse.json(
        { success: false, error: "ไม่พบผู้ใช้" },
        { status: 404 }
      );
    }
    
    // สร้าง query สำหรับการค้นหา
    const query: any = {
      authorId: user._id,
      status: "published",
      isDeleted: false
    };
    
    // เพิ่มเงื่อนไขตามประเภทกระทู้ที่ต้องการ
    if (type === 'reviews') {
      // ดึงกระทู้ที่สร้างจากหน้ารีวิวและกระทู้ที่มี boardType เป็น REVIEW
      query.$or = [
        { boardType: 'REVIEW' },
        { sourceType: 'review' }
      ];
    } else if (type === 'problems') {
      // ดึงกระทู้ที่สร้างจากหน้าปัญหาและกระทู้ที่มี boardType เป็น QUESTION หรือ BUG_REPORT
      query.$or = [
        { boardType: { $in: ['QUESTION', 'BUG_REPORT'] } },
        { sourceType: 'problem' }
      ];
    }
    
    // ดึงกระทู้ที่ผู้ใช้สร้าง
    const posts = await BoardModel.find(query)
      .select('_id slug title content boardType sourceType authorId authorUsername authorAvatarUrl createdAt stats categoryAssociated novelAssociated')
      .populate('categoryAssociated', 'name')
      .populate('novelAssociated', 'title coverImageUrl slug')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
      
    console.log('Query:', JSON.stringify(query));
    console.log('Found posts:', posts.length);
    
    // แปลงข้อมูลให้เหมาะสมกับการส่งกลับ
    const formattedPosts = posts.map(post => {
      const category = post.categoryAssociated as any;
      const novel = post.novelAssociated as any;
      
      return {
        id: post._id.toString(),
        slug: post.slug,
        title: post.title,
        content: post.content,
        boardType: post.boardType,
        sourceType: post.sourceType || null,
        author: {
          id: post.authorId.toString(),
          name: post.authorUsername || username,
          avatar: post.authorAvatarUrl || "/images/default-avatar.png",
        },
        category: category ? {
          id: category._id.toString(),
          name: category.name
        } : null,
        novel: novel ? {
          id: novel._id.toString(),
          title: novel.title,
          coverImageUrl: novel.coverImageUrl,
          slug: novel.slug
        } : null,
        createdAt: post.createdAt,
        viewCount: post.stats?.viewsCount || 0,
        commentCount: post.stats?.repliesCount || 0,
      };
    });
    
    return NextResponse.json({
      success: true,
      posts: formattedPosts
    });
    
  } catch (error: any) {
    console.error("Error fetching user posts:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลกระทู้" },
      { status: 500 }
    );
  }
}
