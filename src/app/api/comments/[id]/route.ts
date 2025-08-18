import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import UserModel from "@/backend/models/User";
import CommentingService from "@/backend/services/Commenting";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const comment = await CommentingService.getById(id);
    if (!comment) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    console.error("[Comment API][GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json();
    const { content, action } = body || {};

    // Pin/Unpin action reserved for moderators/editors/admins - basic role check
    if (action === "pin" || action === "unpin") {
      const user = await UserModel.findById(session.user.id).select("roles");
      const canPin = !!user?.roles?.some((r) => ["Admin", "Moderator", "Editor"].includes(r));
      if (!canPin) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      const updated = await CommentingService.pin(id, session.user.id, action === "pin");
      return NextResponse.json({ success: true, comment: updated });
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json({ success: false, error: "Missing content" }, { status: 400 });
    }

    const updated = await CommentingService.updateContent({
      commentId: id,
      userId: session.user.id,
      newContent: content,
    });

    return NextResponse.json({ success: true, comment: updated });
  } catch (error: any) {
    console.error("[Comment API][PUT] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const body = request.method === "DELETE" ? await safeParseJson(request) : {};
    const asModerator = Boolean(body?.asModerator);

    // If deleting as moderator, check role
    if (asModerator) {
      const user = await UserModel.findById(session.user.id).select("roles");
      const canModerate = !!user?.roles?.some((r) => ["Admin", "Moderator"].includes(r));
      if (!canModerate) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }

    const deleted = await CommentingService.softDelete({
      commentId: id,
      userId: session.user.id,
      asModerator,
      reason: body?.reason,
    });

    return NextResponse.json({ success: true, comment: deleted });
  } catch (error: any) {
    console.error("[Comment API][DELETE] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}

async function safeParseJson(req: NextRequest): Promise<any | undefined> {
  try {
    const text = await req.text();
    if (!text) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
} 