// src/app/api/novels/[slug]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel, { NovelStatus, NovelAccessLevel } from '@/backend/models/Novel';
import EpisodeModel, { EpisodeStatus } from '@/backend/models/Episode';

/**
 * POST - เผยแพร่นิยาย (Publish Novel)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const body = await request.json();

    await dbConnect();

    // ตรวจสอบสิทธิ์เข้าถึงนิยาย
    const novel = await NovelModel.findOne({
      slug: decodedSlug,
      author: session.user.id,
      isDeleted: { $ne: true }
    });

    if (!novel) {
      return NextResponse.json({ error: 'ไม่พบนิยาย' }, { status: 404 });
    }

    // ตรวจสอบว่ามีตอนที่เผยแพร่แล้วหรือไม่
    const publishedEpisodesCount = await EpisodeModel.countDocuments({
      novelId: novel._id,
      status: EpisodeStatus.PUBLISHED,
      isDeleted: { $ne: true }
    });

    if (publishedEpisodesCount === 0) {
      return NextResponse.json({ 
        error: 'ไม่สามารถเผยแพร่นิยายได้ เนื่องจากยังไม่มีตอนที่เผยแพร่แล้ว' 
      }, { status: 400 });
    }

    // ตรวจสอบข้อมูลที่จำเป็นสำหรับการเผยแพร่
    const requiredFields = [];
    if (!novel.title?.trim()) requiredFields.push('ชื่อเรื่อง');
    if (!novel.synopsis?.trim()) requiredFields.push('เรื่องย่อ');
    if (!novel.coverImageUrl) requiredFields.push('รูปปก');
    
    if (requiredFields.length > 0) {
      return NextResponse.json({ 
        error: `ข้อมูลไม่ครบถ้วน กรุณาเพิ่ม: ${requiredFields.join(', ')}` 
      }, { status: 400 });
    }

    // เตรียมข้อมูลสำหรับอัปเดต
    const updateData: any = {
      status: NovelStatus.PUBLISHED,
      updatedAt: new Date(),
      lastContentUpdatedAt: new Date()
    };

    // ตั้งค่า publishedAt หากยังไม่เคยเผยแพร่
    if (!novel.publishedAt) {
      updateData.publishedAt = new Date();
    }

    // อัปเดต accessLevel หากระบุมา
    if (body.accessLevel && Object.values(NovelAccessLevel).includes(body.accessLevel)) {
      updateData.accessLevel = body.accessLevel;
    } else if (novel.accessLevel === NovelAccessLevel.PRIVATE) {
      // เปลี่ยนจาก private เป็น public โดยอัตโนมัติเมื่อเผยแพร่
      updateData.accessLevel = NovelAccessLevel.PUBLIC;
    }

    // อัปเดตนิยาย
    const updatedNovel = await NovelModel.findByIdAndUpdate(
      novel._id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true 
      }
    )
    .populate('author', 'profile')
    .populate([
      { path: 'themeAssignment.mainTheme.categoryId' },
      { path: 'themeAssignment.subThemes.categoryId' },
      { path: 'themeAssignment.moodAndTone' },
      { path: 'themeAssignment.contentWarnings' },
    ]);

    const serializedNovel = JSON.parse(JSON.stringify(updatedNovel));

    return NextResponse.json({ 
      success: true,
      message: 'เผยแพร่นิยายสำเร็จ',
      novel: serializedNovel,
      publishedEpisodesCount
    });

  } catch (error) {
    console.error('[API] เกิดข้อผิดพลาดในการเผยแพร่นิยาย:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}

/**
 * PATCH - อัปเดตสถานะการเผยแพร่
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const body = await request.json();

    await dbConnect();

    // ตรวจสอบสิทธิ์เข้าถึงนิยาย
    const novel = await NovelModel.findOne({
      slug: decodedSlug,
      author: session.user.id,
      isDeleted: { $ne: true }
    });

    if (!novel) {
      return NextResponse.json({ error: 'ไม่พบนิยาย' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    // อัปเดตสถานะ
    if (body.status && Object.values(NovelStatus).includes(body.status)) {
      updateData.status = body.status;
      
      // หากเปลี่ยนเป็น unpublished หรือ archived
      if (body.status === NovelStatus.UNPUBLISHED || body.status === NovelStatus.ARCHIVED) {
        updateData.unpublishedAt = new Date();
      }
    }

    // อัปเดต accessLevel
    if (body.accessLevel && Object.values(NovelAccessLevel).includes(body.accessLevel)) {
      updateData.accessLevel = body.accessLevel;
    }

    // อัปเดตการตั้งเวลาเผยแพร่
    if (body.scheduledPublicationDate) {
      updateData.scheduledPublicationDate = new Date(body.scheduledPublicationDate);
      if (!updateData.status) {
        updateData.status = NovelStatus.SCHEDULED;
      }
    }

    const updatedNovel = await NovelModel.findByIdAndUpdate(
      novel._id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true 
      }
    )
    .populate('author', 'profile');

    const serializedNovel = JSON.parse(JSON.stringify(updatedNovel));

    return NextResponse.json({ 
      success: true,
      message: 'อัปเดตสถานะการเผยแพร่สำเร็จ',
      novel: serializedNovel
    });

  } catch (error) {
    console.error('[API] เกิดข้อผิดพลาดในการอัปเดตสถานะการเผยแพร่:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}
