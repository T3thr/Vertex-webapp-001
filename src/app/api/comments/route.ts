// src/app/api/comments/route.ts
// API endpoint สำหรับจัดการความคิดเห็น (Comments)

import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import { registerModels } from '@/backend/models';
import CommentModel, { CommentStatus, CommentableType } from '@/backend/models/Comment';
import UserModel from '@/backend/models/User';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// GET: ดึงรายการความคิดเห็น
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    registerModels();
    
    // ดึง query parameters
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('targetId');
    const targetType = searchParams.get('targetType') as CommentableType;
    const parentCommentId = searchParams.get('parentCommentId');
    const boardId = searchParams.get('boardId');
    const novelId = searchParams.get('novelId');
    const episodeId = searchParams.get('episodeId');
    const limit = Number(searchParams.get('limit')) || 50;
    const skip = Number(searchParams.get('skip')) || 0;
    
    // ตรวจสอบพารามิเตอร์ที่จำเป็น
    if (!targetId || !targetType) {
      return NextResponse.json(
        { error: 'กรุณาระบุ targetId และ targetType' },
        { status: 400 }
      );
    }
    
    // สร้าง query filter
    const filter: any = {
      status: CommentStatus.VISIBLE,
    };
    
    // กรณีดึงความคิดเห็นของเป้าหมายโดยตรง (เช่น ความคิดเห็นของกระทู้)
    if (targetId && targetType) {
      filter.targetId = targetId;
      filter.targetType = targetType;
    }
    
    // กรณีดึงการตอบกลับของความคิดเห็น
    if (parentCommentId) {
      filter.parentCommentId = parentCommentId;
    }
    
    // กรณีดึงความคิดเห็นตาม context
    if (boardId) filter.boardId = boardId;
    if (novelId) filter.novelId = novelId;
    if (episodeId) filter.episodeId = episodeId;
    
    // ดึงข้อมูลความคิดเห็น
    const comments = await CommentModel.find(filter)
      .sort({ isPinned: -1, createdAt: 1 }) // เรียงตามปักหมุด (มาก่อน) แล้วเรียงตามเวลา (เก่าไปใหม่)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username profile.avatarUrl')
      .lean();
    
    // แปลงข้อมูลให้เหมาะสมกับการส่งกลับ
    const formattedComments = comments.map((comment: any) => ({
      id: comment._id.toString(),
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: comment.userId._id.toString(),
        name: comment.userId.username,
        image: comment.userId.profile?.avatarUrl || '/images/default-avatar.png',
      },
      likesCount: comment.likesCount,
      repliesCount: comment.repliesCount,
      isEdited: comment.isEdited,
      isPinned: comment.isPinned,
      isBestAnswer: comment.awards?.isBestAnswer || false,
      depth: comment.depth,
      parentCommentId: comment.parentCommentId?.toString(),
    }));
    
    return NextResponse.json({ 
      success: true, 
      comments: formattedComments,
      total: await CommentModel.countDocuments(filter),
    });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลความคิดเห็น' },
      { status: 500 }
    );
  }
}

// POST: สร้างความคิดเห็นใหม่
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // ตรวจสอบการเข้าสู่ระบบ
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    registerModels();
    
    // ดึงข้อมูลจาก request body
    const data = await req.json();
    const { 
      targetId, 
      targetType, 
      parentCommentId, 
      content,
      boardId,
      novelId,
      episodeId,
    } = data;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!targetId || !targetType || !content) {
      return NextResponse.json(
        { error: 'กรุณาระบุข้อมูลให้ครบถ้วน (targetId, targetType, content)' },
        { status: 400 }
      );
    }
    
    // ตรวจสอบความยาวของเนื้อหา
    if (content.length < 1 || content.length > 5000) {
      return NextResponse.json(
        { error: 'เนื้อหาความคิดเห็นต้องมีความยาวระหว่าง 1-5000 ตัวอักษร' },
        { status: 400 }
      );
    }
    
    // สร้างความคิดเห็นใหม่
    const newComment = new CommentModel({
      userId: session.user.id,
      targetId,
      targetType,
      parentCommentId: parentCommentId || null,
      content,
      status: CommentStatus.VISIBLE,
      boardId: boardId || null,
      novelId: novelId || null,
      episodeId: episodeId || null,
      userIpAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });
    
    // บันทึกความคิดเห็น
    await newComment.save();
    
    // ดึงข้อมูลผู้ใช้เพื่อส่งกลับ
    const user = await UserModel.findById(session.user.id).select('username profile.avatarUrl').lean();
    
    // ส่งข้อมูลกลับ
    return NextResponse.json({
      success: true,
      comment: {
        id: newComment._id.toString(),
        content: newComment.content,
        createdAt: newComment.createdAt,
        updatedAt: newComment.updatedAt,
        user: {
          id: user?._id.toString(),
          name: user?.username || 'ผู้ใช้',
          image: user?.profile?.avatarUrl || '/images/default-avatar.png',
        },
        likesCount: 0,
        repliesCount: 0,
        isEdited: false,
        isPinned: false,
        isBestAnswer: false,
        depth: newComment.depth,
        parentCommentId: newComment.parentCommentId?.toString(),
      }
    });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างความคิดเห็น' },
      { status: 500 }
    );
  }
}

// PATCH: แก้ไขความคิดเห็น
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // ตรวจสอบการเข้าสู่ระบบ
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนแก้ไขความคิดเห็น' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    registerModels();
    
    // ดึงข้อมูลจาก request body
    const data = await req.json();
    const { commentId, content } = data;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!commentId || !content) {
      return NextResponse.json(
        { error: 'กรุณาระบุ commentId และ content' },
        { status: 400 }
      );
    }
    
    // ตรวจสอบความยาวของเนื้อหา
    if (content.length < 1 || content.length > 5000) {
      return NextResponse.json(
        { error: 'เนื้อหาความคิดเห็นต้องมีความยาวระหว่าง 1-5000 ตัวอักษร' },
        { status: 400 }
      );
    }
    
    // ค้นหาความคิดเห็นที่ต้องการแก้ไข
    const comment = await CommentModel.findById(commentId);
    
    if (!comment) {
      return NextResponse.json(
        { error: 'ไม่พบความคิดเห็นที่ต้องการแก้ไข' },
        { status: 404 }
      );
    }
    
    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของความคิดเห็นหรือไม่
    if (comment.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์แก้ไขความคิดเห็นนี้' },
        { status: 403 }
      );
    }
    
    // เก็บประวัติการแก้ไข (ถ้ามีการเปลี่ยนแปลงเนื้อหา)
    if (comment.content !== content) {
      // สร้าง editHistory ถ้ายังไม่มี
      if (!comment.editHistory) {
        // @ts-expect-error - เนื่องจาก TypeScript อาจไม่เข้าใจ DocumentArray ของ Mongoose
        comment.editHistory = [];
      }
      
      // เพิ่มประวัติการแก้ไข
      const editHistoryItem = {
        editedAt: new Date(),
        editedByUserId: session.user.id,
        previousContent: comment.content,
      };
      
      // @ts-expect-error - เนื่องจาก TypeScript อาจไม่เข้าใจ DocumentArray ของ Mongoose
      comment.editHistory.push(editHistoryItem);
    }
    
    // อัปเดตข้อมูล
    comment.content = content;
    comment.isEdited = true;
    comment.lastEditedAt = new Date();
    
    // บันทึกการเปลี่ยนแปลง
    await comment.save();
    
    return NextResponse.json({
      success: true,
      comment: {
        id: comment._id.toString(),
        content: comment.content,
        isEdited: comment.isEdited,
        lastEditedAt: comment.lastEditedAt,
      }
    });
  } catch (error: any) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการแก้ไขความคิดเห็น' },
      { status: 500 }
    );
  }
}

// DELETE: ลบความคิดเห็น (soft delete)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // ตรวจสอบการเข้าสู่ระบบ
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนลบความคิดเห็น' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    registerModels();
    
    // ดึง query parameters
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('commentId');
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!commentId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ commentId' },
        { status: 400 }
      );
    }
    
    // ค้นหาความคิดเห็นที่ต้องการลบ
    const comment = await CommentModel.findById(commentId);
    
    if (!comment) {
      return NextResponse.json(
        { error: 'ไม่พบความคิดเห็นที่ต้องการลบ' },
        { status: 404 }
      );
    }
    
    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของความคิดเห็นหรือไม่
    const isAdmin = session.user.roles?.includes('Admin') || session.user.roles?.includes('Moderator');
    if (comment.userId.toString() !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์ลบความคิดเห็นนี้' },
        { status: 403 }
      );
    }
    
    // อัปเดตสถานะเป็น soft delete
    if (isAdmin && comment.userId.toString() !== session.user.id) {
      comment.status = CommentStatus.DELETED_BY_MODERATOR;
      // @ts-expect-error - เนื่องจาก TypeScript อาจไม่เข้าใจประเภทของ ObjectId
      comment.hiddenOrDeletedByUserId = session.user.id;
      comment.moderationDetails = {
        actionTaken: 'delete',
        // @ts-expect-error - เนื่องจาก TypeScript อาจไม่เข้าใจประเภทของ ObjectId
        moderatorId: session.user.id,
        actionAt: new Date(),
      };
    } else {
      comment.status = CommentStatus.DELETED_BY_USER;
      // @ts-expect-error - เนื่องจาก TypeScript อาจไม่เข้าใจประเภทของ ObjectId
      comment.hiddenOrDeletedByUserId = session.user.id;
    }
    
    comment.deletedAt = new Date();
    
    // บันทึกการเปลี่ยนแปลง
    await comment.save();
    
    return NextResponse.json({
      success: true,
      message: 'ลบความคิดเห็นเรียบร้อยแล้ว'
    });
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบความคิดเห็น' },
      { status: 500 }
    );
  }
}