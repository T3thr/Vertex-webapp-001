// src/app/api/board/delete/route.ts
// API endpoint สำหรับลบกระทู้

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import BoardModel from "@/backend/models/Board";
import CommunityBoardService from "@/backend/services/CommunityBoard";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // ตรวจสอบว่ามีการล็อกอินหรือไม่
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" },
        { status: 401 }
      );
    }

    // รับข้อมูลจาก request body
    const data = await req.json();
    const { postId } = data;
    
    if (!postId) {
      return NextResponse.json(
        { success: false, error: "ไม่พบ ID ของกระทู้" },
        { status: 400 }
      );
    }
    
    // ดึงข้อมูลกระทู้
    const post = await BoardModel.findById(postId).lean();
    if (!post) {
      return NextResponse.json(
        { success: false, error: "ไม่พบกระทู้" },
        { status: 404 }
      );
    }
    
    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของกระทู้หรือไม่
    console.log('User ID:', session.user.id);
    console.log('Author ID:', post.authorId);
    console.log('Author ID type:', typeof post.authorId);
    
    // แปลง authorId เป็น string ถ้าเป็น ObjectId
    const authorIdString = typeof post.authorId === 'object' && post.authorId !== null 
      ? post.authorId.toString() 
      : post.authorId;
      
    console.log('Author ID as string:', authorIdString);
    console.log('Comparison result:', authorIdString === session.user.id);
    
    if (authorIdString !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "คุณไม่มีสิทธิ์ลบกระทู้นี้" },
        { status: 403 }
      );
    }
    
    // ลบกระทู้ (soft delete)
    await CommunityBoardService.deleteBoard(post._id.toString());
    
    return NextResponse.json({ success: true, message: "ลบกระทู้เรียบร้อยแล้ว" });
  } catch (error) {
    console.error("Error deleting board post:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการลบกระทู้" },
      { status: 500 }
    );
  }
}

