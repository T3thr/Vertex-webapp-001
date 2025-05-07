// src/app/api/novels/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel from "@/backend/models/Novel";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";

// ฟังก์ชันจัดการ GET request สำหรับดึงข้อมูลนิยาย
export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "trending";
    const limit = parseInt(searchParams.get("limit") || "8", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    console.log(`📡 API /api/novels called with query: ${request.url}`);

    // ตัวกรองสำหรับ query
    const query: any = {
      isDeleted: false,
      visibility: "public",
    };
    const sort: any = {};

    switch (filter) {
      case "trending":
        // นิยายยอดนิยม: เรียงตามยอดเข้าชม, ผู้ติดตาม, และวันที่อัพเดตล่าสุด
        sort["stats.views"] = -1;
        sort["stats.followers"] = -1;
        sort.lastEpisodeAt = -1;
        break;
      case "published":
        // อัพเดตล่าสุด: เรียงตามวันที่อัพเดตและวันที่สร้าง
        sort.lastEpisodeAt = -1;
        sort.createdAt = -1;
        query.status = "published";
        break;
      case "discount":
        // ส่วนลดพิเศษ: นิยายที่มีสถานะ discount
        query.status = "discount";
        sort["stats.views"] = -1;
        sort.createdAt = -1;
        break;
      case "completed":
        // จบบริบูรณ์: นิยายที่มีสถานะ completed
        query.status = "completed";
        sort["stats.rating"] = -1;
        sort["stats.views"] = -1;
        break;
      default:
        console.error(`❌ Invalid filter parameter: ${filter}`);
        return NextResponse.json(
          { error: "ตัวกรองไม่ถูกต้อง" },
          { status: 400 }
        );
    }

    // นับจำนวนนิยายที่ตรงกับ query เพื่อ debug
    const total = await NovelModel().countDocuments(query);
    console.log(`ℹ️ Found ${total} novels matching filter: ${filter}`);

    // สร้าง User Model ที่จะใช้สำหรับ populate
    const User = UserModel();
    const SocialMediaUser = SocialMediaUserModel();
    
    // ดึงข้อมูลนิยายพร้อม populate author (สนับสนุนทั้ง User และ SocialMediaUser)
    const novels = await NovelModel()
      .find(query)
      .populate([
        {
          path: "author",
          select: "username profile.displayName profile.avatar",
          model: User
        }
      ])
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`✅ Fetched ${novels.length} novels for filter: ${filter}`);

    // ขั้นตอนเพิ่มเติม: ตรวจสอบหากไม่พบข้อมูล user จาก UserModel ให้ลองหาจาก SocialMediaUserModel
    for (const novel of novels) {
      if (novel.author === null) {
        const socialMediaUser = await SocialMediaUser
          .findById(novel.author)
          .select("username profile.displayName profile.avatar")
          .lean();
        
        if (socialMediaUser) {
          novel.author = socialMediaUser;
        }
      }
    }

    return NextResponse.json(
      {
        novels,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`❌ ข้อผิดพลาดในการดึงนิยาย (filter: ${request.url}):`, error.message);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย" },
      { status: 500 }
    );
  }
}
