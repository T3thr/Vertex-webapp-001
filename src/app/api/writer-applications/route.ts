// src/app/api/writer-applications/route.ts
// API สำหรับการสมัครเป็นนักเขียน

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import WriterApplicationModel, { 
  WriterApplicationStatus, 
  WritingFrequency,
  type IWriterApplication 
} from '@/backend/models/WriterApplication';
import UserModel from '@/backend/models/User';
import { Types } from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'ไม่ได้รับการยืนยันตัวตน' },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const {
      displayName,
      aboutMe,
      contactEmail,
      writingExperience,
      visualNovelExperience,
      portfolioItems,
      preferredGenres,
      sampleContent,
      writingFrequency,
      goalDescription,
      applicationReason,
      hasReadTerms
    } = body;

    // ตรวจสอบข้อมูลพื้นฐาน
    if (!displayName || !aboutMe || !contactEmail || !hasReadTerms) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // ตรวจสอบความยาวของข้อมูล
    if (aboutMe.length < 50) {
      return NextResponse.json(
        { success: false, error: 'การแนะนำตัวต้องมีอย่างน้อย 50 ตัวอักษร' },
        { status: 400 }
      );
    }

    // ตรวจสอบรูปแบบอีเมล
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return NextResponse.json(
        { success: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // ตรวจสอบ portfolio items ถ้ามี
    if (portfolioItems && portfolioItems.length > 0) {
      for (const item of portfolioItems) {
        if (!item.title || !item.url) {
          return NextResponse.json(
            { success: false, error: 'ข้อมูลผลงานไม่ครบถ้วน' },
            { status: 400 }
          );
        }
        
        if (!/^https?:\/\/.+/.test(item.url)) {
          return NextResponse.json(
            { success: false, error: 'URL ผลงานต้องขึ้นต้นด้วย http:// หรือ https://' },
            { status: 400 }
          );
        }
      }
    }

    // ตรวจสอบความถี่การเขียน
    if (writingFrequency && !Object.values(WritingFrequency).includes(writingFrequency)) {
      return NextResponse.json(
        { success: false, error: 'ความถี่การเขียนไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const userId = new Types.ObjectId(session.user.id);

    // ตรวจสอบว่าผู้ใช้เป็น Writer แล้วหรือไม่
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลผู้ใช้' },
        { status: 404 }
      );
    }

    if (user.roles?.includes('Writer')) {
      return NextResponse.json(
        { success: false, error: 'คุณเป็นนักเขียนแล้ว' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีใบสมัครที่รออยู่แล้วหรือไม่
    const existingApplication = await WriterApplicationModel.findOne({
      applicantId: userId,
      status: { 
        $in: [
          WriterApplicationStatus.PENDING_REVIEW, 
          WriterApplicationStatus.UNDER_REVIEW,
          WriterApplicationStatus.REQUIRES_MORE_INFO
        ] 
      }
    });

    if (existingApplication) {
      return NextResponse.json(
        { success: false, error: 'คุณมีใบสมัครที่รอการพิจารณาอยู่แล้ว' },
        { status: 400 }
      );
    }

    // สร้างใบสมัครใหม่
    const applicationData = {
      applicantId: userId,
      displayName: displayName.trim(),
      aboutMe: aboutMe.trim(),
      contactEmail: contactEmail.toLowerCase().trim(),
      writingExperience: writingExperience?.trim() || '',
      visualNovelExperience: visualNovelExperience?.trim() || '',
      portfolioItems: portfolioItems || [],
      preferredGenres: preferredGenres || [],
      sampleContent: sampleContent?.trim() || '',
      writingFrequency: writingFrequency || null,
      goalDescription: goalDescription?.trim() || '',
      applicationReason: applicationReason?.trim() || '',
      hasReadTerms: true,
      status: WriterApplicationStatus.PENDING_REVIEW
    };

    const newApplication = new WriterApplicationModel(applicationData);
    const savedApplication = await newApplication.save();

    // ซ่อนข้อมูลที่ไม่จำเป็นในการตอบกลับ
    const responseData = {
      _id: savedApplication._id,
      status: savedApplication.status,
      submittedAt: savedApplication.submittedAt,
      primaryPenName: savedApplication.primaryPenName
    };

    return NextResponse.json({
      success: true,
      message: 'ส่งใบสมัครเรียบร้อยแล้ว เจ้าหน้าที่จะตรวจสอบและติดต่อกลับภายใน 3-5 วันทำการ',
      data: responseData
    });

  } catch (error) {
    console.error('Writer Application Error:', error);
    
    // จัดการ Validation errors จาก Mongoose
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ถูกต้อง: ' + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการส่งใบสมัคร' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'ไม่ได้รับการยืนยันตัวตน' },
        { status: 401 }
      );
    }

    await dbConnect();

    const userId = new Types.ObjectId(session.user.id);

    // ดึงใบสมัครล่าสุดของผู้ใช้
    const application = await WriterApplicationModel.findOne({
      applicantId: userId
    })
    .sort({ submittedAt: -1 })
    .populate('assignedReviewerId', 'username primaryPenName')
    .lean();

    if (!application) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'ไม่พบใบสมัคร'
      });
    }

    // กรองข้อมูลที่ส่งกลับ (ซ่อนข้อมูลที่ไม่จำเป็น)
    const filteredApplication = {
      _id: application._id,
      primaryPenName: application.primaryPenName,
      aboutMe: application.aboutMe,
      contactEmail: application.contactEmail,
      writingExperience: application.writingExperience,
      visualNovelExperience: application.visualNovelExperience,
      portfolioItems: application.portfolioItems,
      preferredGenres: application.preferredGenres,
      sampleContent: application.sampleContent,
      writingFrequency: application.writingFrequency,
      goalDescription: application.goalDescription,
      applicationReason: application.applicationReason,
      status: application.status,
      submittedAt: application.submittedAt,
      reviewedAt: application.reviewedAt,
      rejectionReason: application.rejectionReason,
      // เฉพาะ public review notes
      publicReviewNotes: application.reviewNotes?.filter((note: any) => note.isPublic) || []
    };

    return NextResponse.json({
      success: true,
      data: filteredApplication
    });

  } catch (error) {
    console.error('Get Writer Application Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'ไม่ได้รับการยืนยันตัวตน' },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const { applicationId, message } = body;

    if (!applicationId || !message) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const userId = new Types.ObjectId(session.user.id);
    const appId = new Types.ObjectId(applicationId);

    // ค้นหาใบสมัคร
    const application = await WriterApplicationModel.findOne({
      _id: appId,
      applicantId: userId
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบใบสมัคร' },
        { status: 404 }
      );
    }

    // เฉพาะใบสมัครที่ต้องการแก้ไขเท่านั้นที่สามารถส่งข้อความได้
    if (application.status !== WriterApplicationStatus.REQUIRES_MORE_INFO) {
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถส่งข้อความในสถานะปัจจุบันได้' },
        { status: 400 }
      );
    }

    // เพิ่มข้อความจากผู้สมัคร
    await (WriterApplicationModel as any).addApplicantMessage(appId, message.trim());

    return NextResponse.json({
      success: true,
      message: 'ส่งข้อความเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('Update Writer Application Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดต' },
      { status: 500 }
    );
  }
} 