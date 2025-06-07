// src/app/api/novels/mine/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { NovelStatus, INovel } from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User";
import CategoryModel, { ICategory } from "@/backend/models/Category";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    // Query เฉพาะนิยายของ user นี้ (ไม่กรอง accessLevel/public)
    const query: any = {
      author: userId,
      isDeleted: false,
    };
    const sort: any = { updatedAt: -1 };
    const total = await NovelModel.countDocuments(query);
    const rawNovels = await NovelModel.find(query)
      .populate({
        path: "author",
        select: "username profile.displayName profile.penName profile.avatarUrl roles",
        model: UserModel,
      })
      .populate({
        path: "themeAssignment.mainTheme.categoryId",
        select: "name slug localizations iconUrl color categoryType description",
        model: CategoryModel,
      })
      .populate({
        path: 'themeAssignment.subThemes.categoryId',
        select: 'name slug iconUrl color categoryType description',
        model: CategoryModel,
      })
      .populate({
        path: 'themeAssignment.moodAndTone',
        select: 'name slug iconUrl color categoryType description',
        model: CategoryModel,
      })
      .populate({
        path: 'themeAssignment.contentWarnings',
        select: 'name slug iconUrl color categoryType description',
        model: CategoryModel,
      })
      .populate({
        path: "language",
        select: "name slug localizations iconUrl color categoryType description",
        model: CategoryModel,
      })
      .populate({
        path: "ageRatingCategoryId",
        select: "name slug localizations iconUrl color categoryType description",
        model: CategoryModel,
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }) as any[];

    // Map ข้อมูลดิบ (rawNovels) ไปยังโครงสร้าง NovelCardData ที่ Client Component (NovelCard) คาดหวัง
    const novels = rawNovels.map(novel => {
      const transformPopulatedCategory = (cat: any) => {
        if (!cat || typeof cat !== 'object' || !cat._id) return undefined;
        return {
          _id: cat._id.toString(),
          name: cat.name,
          slug: cat.slug,
          localizations: cat.localizations,
          iconUrl: cat.iconUrl,
          color: cat.color,
          categoryType: cat.categoryType,
          description: cat.description,
        };
      };
      const transformPopulatedCategoryArray = (cats: any[]) => {
        if (!Array.isArray(cats)) return [];
        return cats.map(transformPopulatedCategory).filter(Boolean);
      };
      const authorData = novel.author && typeof novel.author === 'object' && novel.author._id
        ? {
            _id: novel.author._id.toString(),
            username: novel.author.username,
            profile: novel.author.profile,
            roles: novel.author.roles,
          }
        : { _id: new mongoose.Types.ObjectId().toString(), username: "ไม่ทราบนามปากกา" };
      return {
        _id: novel._id?.toString(),
        title: novel.title,
        slug: novel.slug,
        synopsis: novel.synopsis,
        coverImageUrl: novel.coverImageUrl,
        stats: {
          viewsCount: novel.stats?.viewsCount || 0,
          likesCount: novel.stats?.likesCount || 0,
          averageRating: novel.stats?.averageRating || 0,
          lastPublishedEpisodeAt: novel.stats?.lastPublishedEpisodeAt ? new Date(novel.stats.lastPublishedEpisodeAt) : undefined,
        },
        isCompleted: novel.isCompleted,
        isFeatured: novel.isFeatured,
        publishedAt: novel.publishedAt ? new Date(novel.publishedAt) : undefined,
        status: novel.status,
        totalEpisodesCount: novel.totalEpisodesCount,
        publishedEpisodesCount: novel.publishedEpisodesCount,
        currentEpisodePriceCoins: novel.currentEpisodePriceCoins,
        monetizationSettings: novel.monetizationSettings,
        author: authorData,
        themeAssignment: {
          mainTheme: novel.themeAssignment?.mainTheme?.categoryId
            ? {
                categoryId: transformPopulatedCategory(novel.themeAssignment.mainTheme.categoryId),
                customName: novel.themeAssignment.mainTheme.customName,
              }
            : undefined,
          subThemes: novel.themeAssignment?.subThemes?.map((st: any) => ({
            categoryId: transformPopulatedCategory(st.categoryId),
            customName: st.customName,
          })).filter((st: any) => st.categoryId && st.categoryId._id) || [],
          moodAndTone: transformPopulatedCategoryArray(novel.themeAssignment?.moodAndTone),
          contentWarnings: transformPopulatedCategoryArray(novel.themeAssignment?.contentWarnings),
          customTags: novel.themeAssignment?.customTags || [],
        },
        language: transformPopulatedCategory(novel.language) || { _id: new mongoose.Types.ObjectId().toString(), name: 'ไม่ระบุ' },
        ageRatingCategoryId: transformPopulatedCategory(novel.ageRatingCategoryId),
      };
    });

    return NextResponse.json({ novels, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 