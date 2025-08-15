import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import UserModel from "@/backend/models/User";
import RatingReviewService from "@/backend/services/RatingReview";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/ratings/[id]
 * ดึงข้อมูลการให้คะแนนและรีวิวตาม ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid rating ID format" },
        { status: 400 }
      );
    }
    
    const rating = await RatingReviewService.getById(id);
    
    if (!rating) {
      return NextResponse.json(
        { success: false, error: "Rating not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, rating });
  } catch (error: any) {
    console.error("[Rating API][GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ratings/[id]
 * อัปเดตการให้คะแนนและรีวิว
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid rating ID format" },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const {
      overallScore,
      scoreDetails,
      reviewTitle,
      reviewContent,
      containsSpoilers,
    } = body || {};
    
    // ตรวจสอบค่า overallScore
    if (overallScore !== undefined && (typeof overallScore !== "number" || overallScore < 1 || overallScore > 5)) {
      return NextResponse.json(
        { success: false, error: "Overall score must be a number between 1 and 5" },
        { status: 400 }
      );
    }
    
    // ตรวจสอบ scoreDetails ถ้ามี
    if (scoreDetails && (!Array.isArray(scoreDetails) || scoreDetails.some(detail => 
      !detail.aspect || typeof detail.score !== "number" || detail.score < 1 || detail.score > 5
    ))) {
      return NextResponse.json(
        { success: false, error: "Invalid scoreDetails format or values" },
        { status: 400 }
      );
    }
    
    // ตรวจสอบความยาวของ reviewTitle และ reviewContent
    if (reviewTitle !== undefined && reviewTitle !== null && reviewTitle.length > 255) {
      return NextResponse.json(
        { success: false, error: "Review title is too long (max 255 characters)" },
        { status: 400 }
      );
    }
    
    if (reviewContent !== undefined && reviewContent !== null && reviewContent.length > 10000) {
      return NextResponse.json(
        { success: false, error: "Review content is too long (max 10000 characters)" },
        { status: 400 }
      );
    }
    
    const updateData = {
      ratingId: id,
      userId: session.user.id,
      overallScore,
      scoreDetails,
      reviewTitle,
      reviewContent,
      containsSpoilers,
    };
    
    const updated = await RatingReviewService.update(updateData);
    
    return NextResponse.json({ success: true, rating: updated });
  } catch (error: any) {
    console.error("[Rating API][PUT] Error:", error);
    
    // จัดการข้อผิดพลาดเฉพาะ
    if (error.message.includes("ไม่พบรีวิวที่ต้องการแก้ไข")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    
    if (error.message.includes("คุณไม่มีสิทธิ์แก้ไขรีวิวนี้")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ratings/[id]
 * ลบการให้คะแนนและรีวิว (Soft Delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid rating ID format" },
        { status: 400 }
      );
    }
    
    // ดึงข้อมูลจาก request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }
    
    const { reason } = body || {};
    
    // ตรวจสอบว่าผู้ใช้เป็นผู้ดูแลระบบหรือไม่
    const user = await UserModel.findById(session.user.id).select("roles");
    const isModerator = user?.roles?.some(role => ["Admin", "Moderator"].includes(role));
    
    const deleteData = {
      ratingId: id,
      userId: session.user.id,
      asModerator: isModerator,
      reason,
    };
    
    const deleted = await RatingReviewService.softDelete(deleteData);
    
    return NextResponse.json({ success: true, rating: deleted });
  } catch (error: any) {
    console.error("[Rating API][DELETE] Error:", error);
    
    // จัดการข้อผิดพลาดเฉพาะ
    if (error.message.includes("ไม่พบรีวิวที่ต้องการลบ")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    
    if (error.message.includes("คุณไม่มีสิทธิ์ลบรีวิวนี้")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
