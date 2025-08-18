import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { RateableType } from "@/backend/models/Rating";
import RatingReviewService from "@/backend/services/RatingReview";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/ratings
 * ดึงรายการการให้คะแนนและรีวิวตามเงื่อนไข
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // ดึงพารามิเตอร์จาก URL
    const targetId = searchParams.get("targetId") || undefined;
    const targetType = (searchParams.get("targetType") as RateableType) || undefined;
    const userId = searchParams.get("userId") || undefined;
    const novelIdContext = searchParams.get("novelIdContext") || undefined;
    const minScore = searchParams.get("minScore") ? Number(searchParams.get("minScore")) : undefined;
    const maxScore = searchParams.get("maxScore") ? Number(searchParams.get("maxScore")) : undefined;
    const containsSpoilers = searchParams.has("containsSpoilers") ? 
      searchParams.get("containsSpoilers") === "true" : undefined;
    const hasReview = searchParams.has("hasReview") ? 
      searchParams.get("hasReview") === "true" : undefined;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");
    const sort = searchParams.get("sort") as "newest" | "oldest" | "highest" | "lowest" | "helpful" || "newest";
    
    // ตรวจสอบความถูกต้องของพารามิเตอร์
    if (targetId && !mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json(
        { success: false, error: "Invalid targetId format" },
        { status: 400 }
      );
    }
    
    if (targetType && !Object.values(RateableType).includes(targetType)) {
      return NextResponse.json(
        { success: false, error: "Invalid targetType" },
        { status: 400 }
      );
    }
    
    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid userId format" },
        { status: 400 }
      );
    }
    
    if (novelIdContext && !mongoose.Types.ObjectId.isValid(novelIdContext)) {
      return NextResponse.json(
        { success: false, error: "Invalid novelIdContext format" },
        { status: 400 }
      );
    }
    
    // สร้างเงื่อนไขการค้นหา
    const query = {
      targetId,
      targetType,
      userId,
      novelIdContext,
      minScore,
      maxScore,
      containsSpoilers,
      hasReview,
      page,
      limit,
      sort,
    };
    
    // ดึงข้อมูลจาก service
    const result = await RatingReviewService.list(query);
    
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[Ratings API][GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ratings
 * สร้างการให้คะแนนและรีวิวใหม่
 */
export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบการเข้าสู่ระบบ
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // ดึงข้อมูลจาก request body
    const body = await request.json();
    const {
      targetId,
      targetType,
      overallScore,
      scoreDetails,
      reviewTitle,
      reviewContent,
      containsSpoilers,
      language,
      novelIdContext,
    } = body || {};
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!targetId || !targetType || overallScore === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: targetId, targetType, overallScore" },
        { status: 400 }
      );
    }
    
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json(
        { success: false, error: "Invalid targetId format" },
        { status: 400 }
      );
    }
    
    if (!Object.values(RateableType).includes(targetType)) {
      return NextResponse.json(
        { success: false, error: "Invalid targetType" },
        { status: 400 }
      );
    }
    
    if (typeof overallScore !== "number" || overallScore < 1 || overallScore > 5) {
      return NextResponse.json(
        { success: false, error: "Overall score must be a number between 1 and 5" },
        { status: 400 }
      );
    }
    
    // ตรวจสอบ scoreDetails ถ้ามี
    if (scoreDetails && (!Array.isArray(scoreDetails) || scoreDetails.some(detail => 
      !detail.aspect || !Object.values(RateableType).includes(detail.aspect) ||
      typeof detail.score !== "number" || detail.score < 1 || detail.score > 5
    ))) {
      return NextResponse.json(
        { success: false, error: "Invalid scoreDetails format or values" },
        { status: 400 }
      );
    }
    
    // ตรวจสอบความยาวของ reviewTitle และ reviewContent
    if (reviewTitle && reviewTitle.length > 255) {
      return NextResponse.json(
        { success: false, error: "Review title is too long (max 255 characters)" },
        { status: 400 }
      );
    }
    
    if (reviewContent && reviewContent.length > 10000) {
      return NextResponse.json(
        { success: false, error: "Review content is too long (max 10000 characters)" },
        { status: 400 }
      );
    }
    
    // สร้างข้อมูลสำหรับ service
    const input = {
      userId: session.user.id,
      targetId,
      targetType,
      overallScore,
      scoreDetails,
      reviewTitle,
      reviewContent,
      containsSpoilers,
      language,
      novelIdContext,
    };
    
    // สร้างการให้คะแนนและรีวิวใหม่
    const rating = await RatingReviewService.create(input);
    
    return NextResponse.json(
      { success: true, rating },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Ratings API][POST] Error:", error);
    
    // จัดการข้อผิดพลาดเฉพาะ
    if (error.message.includes("คุณได้ให้คะแนนเนื้อหานี้ไปแล้ว")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 } // Conflict
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
