// src/app/api/novels/search/route.ts
// API endpoint สำหรับค้นหานิยาย

import dbConnect from "@/backend/lib/mongodb";
import NovelModel from "@/backend/models/Novel";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q");
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุคำค้นหาอย่างน้อย 2 ตัวอักษร" },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // ค้นหานิยายตามชื่อหรือผู้เขียน
    const novels = await NovelModel.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { 'author.username': { $regex: query, $options: 'i' } }
      ],
      isPublished: true,
      isDeleted: false
    })
    .select('_id title coverImageUrl author')
    .limit(10)
    .populate('author', 'username displayName')
    .lean();
    
    // แปลงข้อมูลให้เป็นรูปแบบที่เหมาะสม
    const formattedNovels = novels.map((novel: any) => ({
      id: novel._id.toString(),
      title: novel.title,
      coverUrl: novel.coverImageUrl || "/images/default-cover.png",
      author: novel.author?.displayName || novel.author?.username || "ไม่ระบุผู้เขียน"
    }));
    
    return NextResponse.json({ 
      success: true, 
      novels: formattedNovels 
    });
  } catch (error) {
    console.error("Error searching novels:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการค้นหานิยาย" },
      { status: 500 }
    );
  }
}
