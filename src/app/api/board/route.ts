// src/app/api/board/route.ts
// API endpoint สำหรับดึงข้อมูลกระทู้

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import { BoardType } from "@/backend/models/Board";
import CommunityBoardService from "@/backend/services/CommunityBoard";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// ดึงกระทู้ทั้งหมด
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const limit = Number(searchParams.get("limit")) || 10;
    const skip = Number(searchParams.get("skip")) || 0;
    
    let posts;
    if (type === "popular") {
      posts = await CommunityBoardService.getPopularPosts(limit);
    } else if (type && Object.values(BoardType).includes(type as BoardType)) {
      posts = await CommunityBoardService.getPostsByType(type as BoardType, limit, skip);
    } else {
      posts = await CommunityBoardService.getLatestPosts(limit, skip);
    }
    
    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error("Error fetching board posts:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลกระทู้" },
      { status: 500 }
    );
  }
}

// สร้างกระทู้ใหม่
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "กรุณาเข้าสู่ระบบก่อนสร้างกระทู้" },
        { status: 401 }
      );
    }
    
    const data = await req.json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!data.title || !data.content) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
        { status: 400 }
      );
    }
    
    // เพิ่ม authorId จาก session
    const postData = {
      ...data,
      authorId: session.user.id
    };
    
    const newPost = await CommunityBoardService.createBoardPost(postData);
    
    return NextResponse.json({ 
      success: true, 
      message: "สร้างกระทู้สำเร็จ", 
      post: newPost 
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating board post:", error);
    return NextResponse.json(
      { success: false, error: error.message || "เกิดข้อผิดพลาดในการสร้างกระทู้" },
      { status: 500 }
    );
  }
}
