// src/app/api/writer-applications/[id]/route.ts
// Admin API สำหรับจัดการใบสมัครนักเขียน

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import WriterApplicationModel, { 
  WriterApplicationStatus, 
  WriterLevel,
  type IWriterApplication 
} from '@/backend/models/WriterApplication';
import UserModel from '@/backend/models/User';
import WriterStatsModel from '@/backend/models/WriterStats';
import { Types } from 'mongoose';

// GET - ดูรายละเอียดใบสมัคร (Admin เท่านั้น)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'ไม่ได้รับการยืนยันตัวตน' },
        { status: 401 }
      );
    }

    await dbConnect();

    // ตรวจสอบสิทธิ์ Admin/Moderator
    const user = await UserModel.findById(session.user.id);
    if (!user?.roles?.some(role => ['Admin', 'Moderator'].includes(role))) {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const applicationId = new Types.ObjectId(params.id);
    
    const application = await WriterApplicationModel.findById(applicationId)
      .populate('applicantId', 'username email primaryPenName avatarUrl roles createdAt')
      .populate('assignedReviewerId', 'username primaryPenName')
      .populate('reviewNotes.reviewerId', 'username primaryPenName')
      .lean();

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบใบสมัคร' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('Get Writer Application Details Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตสถานะใบสมัคร (Admin เท่านั้น)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'ไม่ได้รับการยืนยันตัวตน' },
        { status: 401 }
      );
    }

    await dbConnect();

    // ตรวจสอบสิทธิ์ Admin/Moderator
    const user = await UserModel.findById(session.user.id);
    if (!user?.roles?.some(role => ['Admin', 'Moderator'].includes(role))) {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      action, 
      status, 
      notes, 
      reason, 
      reviewNote, 
      estimatedLevel,
      priority,
      assignToSelf 
    } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุการดำเนินการ' },
        { status: 400 }
      );
    }

    const applicationId = new Types.ObjectId(params.id);
    const reviewerId = new Types.ObjectId(session.user.id);

    const application = await WriterApplicationModel.findById(applicationId);
    
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบใบสมัคร' },
        { status: 404 }
      );
    }

    let responseMessage = '';

    switch (action) {
      case 'assign':
        if (assignToSelf) {
          application.assignedReviewerId = reviewerId;
          responseMessage = 'มอบหมายงานให้ตัวเองเรียบร้อย';
        }
        break;

      case 'change_status':
        if (!status || !Object.values(WriterApplicationStatus).includes(status)) {
          return NextResponse.json(
            { success: false, error: 'สถานะไม่ถูกต้อง' },
            { status: 400 }
          );
        }

        // เพิ่มการเปลี่ยนสถานะ
        application.addStatusChange(status, reviewerId, notes, reason);

        if (status === WriterApplicationStatus.APPROVED) {
          if (estimatedLevel && Object.values(WriterLevel).includes(estimatedLevel)) {
            application.estimatedLevel = estimatedLevel;
          }
          responseMessage = 'อนุมัติใบสมัครเรียบร้อย';
        } else if (status === WriterApplicationStatus.REJECTED) {
          if (reason) {
            application.rejectionReason = reason;
          }
          responseMessage = 'ปฏิเสธใบสมัครเรียบร้อย';
        } else if (status === WriterApplicationStatus.REQUIRES_REVISION) {
          responseMessage = 'ส่งใบสมัครกลับเพื่อแก้ไข';
        } else {
          responseMessage = 'เปลี่ยนสถานะเรียบร้อย';
        }
        break;

      case 'add_review_note':
        if (!reviewNote || !reviewNote.content) {
          return NextResponse.json(
            { success: false, error: 'กรุณาระบุเนื้อหาบันทึก' },
            { status: 400 }
          );
        }

        application.addReviewNote(
          reviewerId,
          reviewNote.content,
          reviewNote.isPublic || false,
          reviewNote.category || 'general'
        );
        responseMessage = 'เพิ่มบันทึกเรียบร้อย';
        break;

      case 'update_priority':
        if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
          return NextResponse.json(
            { success: false, error: 'ลำดับความสำคัญไม่ถูกต้อง' },
            { status: 400 }
          );
        }
        application.priority = priority;
        responseMessage = 'อัปเดตลำดับความสำคัญเรียบร้อย';
        break;

      case 'update_estimated_level':
        if (!estimatedLevel || !Object.values(WriterLevel).includes(estimatedLevel)) {
          return NextResponse.json(
            { success: false, error: 'ระดับที่ประเมินไม่ถูกต้อง' },
            { status: 400 }
          );
        }
        application.estimatedLevel = estimatedLevel;
        responseMessage = 'อัปเดตระดับที่ประเมินเรียบร้อย';
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'การดำเนินการไม่ถูกต้อง' },
          { status: 400 }
        );
    }

    await application.save();

    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: {
        _id: application._id,
        status: application.status,
        priority: application.priority,
        estimatedLevel: application.estimatedLevel,
        assignedReviewerId: application.assignedReviewerId
      }
    });

  } catch (error) {
    console.error('Update Writer Application Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดต' },
      { status: 500 }
    );
  }
}

// DELETE - ลบใบสมัคร (Admin เท่านั้น)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'ไม่ได้รับการยืนยันตัวตน' },
        { status: 401 }
      );
    }

    await dbConnect();

    // ตรวจสอบสิทธิ์ Admin เท่านั้น (Moderator ไม่สามารถลบได้)
    const user = await UserModel.findById(session.user.id);
    if (!user?.roles?.includes('Admin')) {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์ลบใบสมัคร' },
        { status: 403 }
      );
    }

    const applicationId = new Types.ObjectId(params.id);
    
    const application = await WriterApplicationModel.findById(applicationId);
    
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบใบสมัคร' },
        { status: 404 }
      );
    }

    // ตรวจสอบว่าใบสมัครไม่ได้อยู่ในสถานะ APPROVED
    if (application.status === WriterApplicationStatus.APPROVED) {
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถลบใบสมัครที่อนุมัติแล้วได้' },
        { status: 400 }
      );
    }

    await WriterApplicationModel.findByIdAndDelete(applicationId);

    return NextResponse.json({
      success: true,
      message: 'ลบใบสมัครเรียบร้อย'
    });

  } catch (error) {
    console.error('Delete Writer Application Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบ' },
      { status: 500 }
    );
  }
} 