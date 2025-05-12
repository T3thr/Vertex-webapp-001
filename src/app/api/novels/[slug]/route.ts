// src/app/api/novels/[slug]/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/backend/lib/mongodb';
import NovelModel, { INovel } from '@/backend/models/Novel';
import UserModel, { IUser } from '@/backend/models/User'; // Import UserModel และ IUser
import CategoryModel, { ICategory } from '@/backend/models/Category'; // Import CategoryModel และ ICategory
import EpisodeModel, { IEpisode } from '@/backend/models/Episode'; // Import EpisodeModel และ IEpisode
import mongoose from 'mongoose';

// Interface สำหรับข้อมูลที่ Populate แล้ว (เพื่อให้ Type Safe)
interface PopulatedNovel extends Omit<INovel, 'author' | 'categories'> {
  author: Pick<IUser, '_id' | 'username' | 'profile'> | null; // เลือกเฉพาะ field ที่จำเป็น
  categories: Pick<ICategory, '_id' | 'name' | 'slug'>[]; // เลือกเฉพาะ field ที่จำเป็น

}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  // เชื่อมต่อฐานข้อมูล
  await dbConnect();
  const { slug } = params;

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  console.log(`📡 API /api/novels/${slug} called`);

  try {
    // สร้าง Instance ของ Models ที่จะใช้ Populate
    const User = UserModel();
    const Category = CategoryModel();
    const Episode = EpisodeModel();

    // ค้นหานิยายด้วย slug และเงื่อนไขเพิ่มเติม (ไม่ถูกลบ, มองเห็นได้แบบ public)
    // Populate ข้อมูลที่เกี่ยวข้อง: author, categories
    const novel: PopulatedNovel | null = await NovelModel()
      .findOne({ slug: slug, isDeleted: false, visibility: 'public' })
      .populate<{ author: PopulatedNovel['author'] }>({
        path: 'author',
        model: User, // ระบุ Model ที่ใช้ Populate
        select: '_id username profile.displayName profile.avatar profile.bio', // เลือกฟิลด์ที่ต้องการจาก User
      })
      .populate<{ categories: PopulatedNovel['categories'] }>({
        path: 'categories',
        model: Category, // ระบุ Model ที่ใช้ Populate
        select: '_id name slug', // เลือกฟิลด์ที่ต้องการจาก Category
      })
      // .populate('subCategories', 'name slug') // ถ้าต้องการ SubCategories ด้วย
      .lean() // ใช้ lean() เพื่อให้ได้ Plain JavaScript Object และประสิทธิภาพที่ดีขึ้น
      .exec(); // ใช้ exec() เพื่อให้แน่ใจว่า query ทำงาน

    if (!novel) {
      console.log(`❌ Novel with slug "${slug}" not found.`);
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // ดึงข้อมูลตอน (เฉพาะตอนที่เผยแพร่แล้ว เรียงตามลำดับ) - อาจจำกัดจำนวนถ้าต้องการ
    const episodes = await Episode.find({
      novel: novel._id,
      status: 'published',
      isDeleted: false,
    })
      .sort({ episodeNumber: 1 }) // เรียงตามลำดับตอน
      .select('_id title slug episodeNumber isFree priceInCoins publishedAt') // เลือกเฉพาะฟิลด์ที่จำเป็น
      .limit(100) // ตัวอย่าง: จำกัดแค่ 100 ตอนแรก (ปรับตามต้องการ)
      .lean()
      .exec();

    // รวมข้อมูลตอนเข้าไปใน novel object
    const novelWithEpisodes = { ...novel, episodes };

    console.log(`✅ Fetched novel "${novel.title}" successfully.`);
    return NextResponse.json(novelWithEpisodes, { status: 200 });

  } catch (error: any) {
    console.error(`❌ Error fetching novel with slug "${slug}":`, error);
    // จัดการกับ CastError ถ้า ObjectId ไม่ถูกต้อง
    if (error instanceof mongoose.Error.CastError) {
        return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'An error occurred while fetching the novel', details: error.message },
      { status: 500 }
    );
  }
}