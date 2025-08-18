import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import RatingReviewService from "@/backend/services/RatingReview";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ratings/[id]/vote
 * โหวตว่ารีวิวมีประโยชน์หรือไม่
 */
export async function POST(
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
    const { isHelpful } = body || {};
    
    if (typeof isHelpful !== "boolean") {
      return NextResponse.json(
        { success: false, error: "isHelpful must be a boolean" },
        { status: 400 }
      );
    }
    
    const updated = await RatingReviewService.voteHelpfulness(id, session.user.id, isHelpful);
    
    return NextResponse.json({ success: true, rating: updated });
  } catch (error: any) {
    console.error("[Rating Vote API][POST] Error:", error);
    
    // จัดการข้อผิดพลาดเฉพาะ
    if (error.message.includes("ไม่พบรีวิวที่ต้องการโหวต")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    
    if (error.message.includes("คุณไม่สามารถโหวตรีวิวของตัวเองได้")) {
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
