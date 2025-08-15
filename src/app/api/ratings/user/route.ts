import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { RateableType } from "@/backend/models/Rating";
import RatingReviewService from "@/backend/services/RatingReview";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/ratings/user
 * ดึงข้อมูลการให้คะแนนและรีวิวของผู้ใช้สำหรับเป้าหมายที่ระบุ
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    
    const targetId = searchParams.get("targetId");
    const targetType = searchParams.get("targetType") as RateableType | null;
    
    // ตรวจสอบพารามิเตอร์ที่จำเป็น
    if (!targetId || !targetType) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: targetId, targetType" },
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
    
    // ดึงข้อมูลการให้คะแนนและรีวิวของผู้ใช้
    const rating = await RatingReviewService.getUserRatingForTarget(
      session.user.id,
      targetId,
      targetType
    );
    
    return NextResponse.json({ 
      success: true, 
      rating: rating || null,
      hasRated: !!rating
    });
  } catch (error: any) {
    console.error("[User Rating API][GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
