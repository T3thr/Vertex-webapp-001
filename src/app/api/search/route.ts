import dbConnect from "@/backend/lib/mongodb";
import NovelModel from "@/backend/models/Novel";
import { NextRequest, NextResponse } from "next/server";

// อินเตอร์เฟซสำหรับข้อมูลนิยายที่ได้จาก lean()
interface LeanNovel {
  _id: string; // lean() แปลง ObjectId เป็น string
  title: string;
  coverImage: string;
  author: {
    username?: string;
  };
}

// ฟังก์ชันจัดการ GET request สำหรับการค้นหานิยาย
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    // ตรวจสอบว่า query มีความยาวเพียงพอหรือไม่
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { results: [], message: "คำค้นหาสั้นเกินไป" },
        { status: 400 }
      );
    }

    // เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // สร้าง query สำหรับค้นหาแบบข้อความ
    const results = await NovelModel()
      .find(
        {
          $or: [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
            { "author.username": { $regex: query, $options: "i" } },
            { tags: { $in: [new RegExp(query, "i")] } },
          ],
          status: "published", // ค้นหาเฉพาะนิยายที่เผยแพร่แล้ว
        },
        {
          score: { $meta: "textScore" },
        }
      )
      .select("_id title coverImage author.username")
      .sort({ score: { $meta: "textScore" } })
      .limit(10)
      .lean<LeanNovel>();

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
