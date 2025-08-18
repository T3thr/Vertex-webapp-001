import { RateableType } from "@/backend/models/Rating";
import RatingReviewService from "@/backend/services/RatingReview";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/ratings/statistics
 * ดึงข้อมูลสถิติการให้คะแนนสำหรับเป้าหมายที่ระบุ
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // ดึงพารามิเตอร์จาก URL
    const targetId = searchParams.get("targetId");
    const targetType = searchParams.get("targetType") as RateableType | null;
    
    // ตรวจสอบความถูกต้องของพารามิเตอร์
    if (!targetId || !targetType) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: targetId and targetType" },
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
    
    // ดึงข้อมูลสถิติจาก service
    const stats = await RatingReviewService.getTargetStatistics(targetId, targetType);
    
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error("[Ratings Statistics API][GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}