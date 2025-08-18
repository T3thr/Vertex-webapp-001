// src/app/api/board/[slug]/route.ts
// API endpoint สำหรับดึงข้อมูลกระทู้ตาม slug

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import CommunityBoardService from "@/backend/services/CommunityBoard";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// ดึงข้อมูลกระทู้ตาม slug
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "ไม่พบ slug ของกระทู้" },
        { status: 400 }
      );
    }
    
    const post = await CommunityBoardService.getBoardBySlug(slug);
    if (!post) {
      return NextResponse.json(
        { success: false, error: "ไม่พบกระทู้" },
        { status: 404 }
      );
    }
    
    // เพิ่มจำนวนการดู
    const session = await getServerSession(authOptions);
    await CommunityBoardService.incrementViewCount(post._id.toString(), session?.user?.id);
    
    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("Error fetching board post:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลกระทู้" },
      { status: 500 }
    );
  }
}
