import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { CommentableType } from "@/backend/models/Comment";
import CommentingService from "@/backend/services/Commenting";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get("targetId");
    const targetType = searchParams.get("targetType");
    const parentCommentId = searchParams.get("parentCommentId");
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");
    const sort = (searchParams.get("sort") as any) || "new";

    if (!targetId || !targetType) {
      return NextResponse.json(
        { success: false, error: "Missing targetId or targetType" },
        { status: 400 }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json(
        { success: false, error: "Invalid targetId" },
        { status: 400 }
      );
    }
    if (!Object.values(CommentableType).includes(targetType as CommentableType)) {
      return NextResponse.json(
        { success: false, error: "Invalid targetType" },
        { status: 400 }
      );
    }

    const data = await CommentingService.list({
      targetId,
      targetType: targetType as CommentableType,
      parentCommentId: parentCommentId || undefined,
      page,
      limit,
      sort,
      includePinnedFirst: true,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error("[Comments API][GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { targetId, targetType, content, parentCommentId, mentionedUserIds, context } = body || {};

    if (!targetId || !targetType || !content) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: targetId, targetType, content" },
        { status: 400 }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json(
        { success: false, error: "Invalid targetId" },
        { status: 400 }
      );
    }

    if (!Object.values(CommentableType).includes(targetType)) {
      return NextResponse.json(
        { success: false, error: "Invalid targetType" },
        { status: 400 }
      );
    }

    const created = await CommentingService.create({
      userId: session.user.id,
      targetId,
      targetType,
      content,
      parentCommentId: parentCommentId || undefined,
      mentionedUserIds: Array.isArray(mentionedUserIds) ? mentionedUserIds : undefined,
      context,
      meta: {
        ip: request.headers.get("x-forwarded-for") || request.ip || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({ success: true, comment: created }, { status: 201 });
  } catch (error: any) {
    console.error("[Comments API][POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
} 