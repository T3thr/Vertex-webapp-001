import dbConnect from "@/backend/lib/mongodb";
import NovelModel from "@/backend/models/Novel";
import { NextRequest, NextResponse } from "next/server";

// อินเตอร์เฟซสำหรับเอกสารนิยายหลังจากใช้ lean()
interface LeanNovel {
  _id: string; // lean() แปลง ObjectId เป็น string
  title: string;
  coverImage: string;
  author: {
    username?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    // ตรวจสอบความยาวของ query
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { results: [], message: "คำค้นสั้นเกินไป" },
        { status: 400 }
      );
    }

    await dbConnect();

    // สร้าง text search query โดยใช้ text index
    const results = await NovelModel()
      .find(
        {
          $text: { $search: query },
          status: "published", // ค้นหาเฉพาะนิยายที่เผยแพร่แล้ว
          isDeleted: false, // กรองเฉพาะนิยายที่ไม่ถูกลบ
        },
        {
          score: { $meta: "textScore" },
        }
      )
      .select("_id title coverImage author.username")
      .sort({ score: { $meta: "textScore" } })
      .limit(10)
      .lean<LeanNovel[]>();

    // จัดรูปแบบผลลัพธ์
    const formattedResults = results.map((novel: LeanNovel) => ({
      id: novel._id,
      title: novel.title,
      coverImage: novel.coverImage,
      author: novel.author?.username || undefined,
    }));

    return NextResponse.json({ results: formattedResults });
  } catch (error) {
    console.error("❌ ข้อผิดพลาดในการค้นหา:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}
