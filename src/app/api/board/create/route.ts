// src/app/api/board/create/route.ts
// API endpoint สำหรับสร้างกระทู้/รีวิวใหม่

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import CommunityBoardService from "@/backend/services/CommunityBoard";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // ตรวจสอบว่ามีการล็อกอินหรือไม่
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "กรุณาเข้าสู่ระบบก่อนสร้างกระทู้" },
        { status: 401 }
      );
    }

    // รับข้อมูลจาก request body
    const data = await req.json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!data.title || !data.content) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุหัวข้อและเนื้อหา" },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // เตรียมข้อมูลสำหรับสร้างกระทู้/รีวิว
    const postData = {
      title: data.title,
      content: data.content,
      authorId: session.user.id,
      boardType: data.boardType || "DISCUSSION", // DISCUSSION, REVIEW, PROBLEM
      sourceType: data.sourceType || req.nextUrl.searchParams.get('sourceType') || null, // เพิ่ม sourceType เพื่อระบุที่มาของกระทู้
      categoryAssociatedId: data.categoryAssociatedId || "", // จะถูกกำหนดเป็น general-discussion ถ้าไม่ระบุ
      novelAssociatedId: data.novelAssociatedId || undefined,
      novelTitle: data.novelTitle || undefined,
      tags: data.tags || [],
      containsSpoilers: data.containsSpoilers || false,
      reviewDetails: data.reviewDetails || undefined
    };
    
    // สร้างกระทู้/รีวิวใหม่
    const newPost = await CommunityBoardService.createBoardPost(postData);
    
    // คืนค่าข้อมูลกระทู้/รีวิวที่สร้าง
    return NextResponse.json({ 
      success: true, 
      post: {
        id: newPost._id.toString(),
        slug: newPost.slug,
        title: newPost.title,
        boardType: newPost.boardType
      }
    });
  } catch (error: any) {
    console.error("Error creating board post:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "เกิดข้อผิดพลาดในการสร้างกระทู้" 
      },
      { status: 500 }
    );
  }
}
