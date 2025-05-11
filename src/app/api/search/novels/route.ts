// src/app/api/search/novels/route.ts
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel from "@/backend/models/Novel";
import UserModel from "@/backend/models/User";
import CategoryModel from "@/backend/models/Category";

export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    
    // Extract search parameters
    const query = searchParams.get("query") || "";
    const categories = searchParams.getAll("categories");
    const tags = searchParams.getAll("tags");
    const status = searchParams.get("status");
    const ageRating = searchParams.get("ageRating");
    const isExplicit = searchParams.get("isExplicit") === "true";
    const sort = searchParams.get("sort") || "trending";
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;
    
    console.log(`📡 API /api/search/novels called with query: "${query}", categories: [${categories}], tags: [${tags}], sort: ${sort}`);
    
    // Build query object
    const mongoQuery: any = {
      isDeleted: false,
      visibility: "public",
    };
    
    // Text search
    if (query) {
      // For Thai language support, we use regex instead of $text because
      // MongoDB's text search doesn't work well with Thai without custom tokenizers
      const searchRegex = new RegExp(query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
      mongoQuery.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ];
    }
    
    // Filter by categories
    if (categories.length > 0) {
      const categoryIds = categories
        .map(id => {
          try {
            return new Types.ObjectId(id);
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean) as Types.ObjectId[];
      
      if (categoryIds.length > 0) {
        mongoQuery.categories = { $in: categoryIds };
      }
    }
    
    // Filter by tags
    if (tags.length > 0) {
      mongoQuery.tags = { $in: tags };
    }
    
    // Filter by status
    if (status && ["published", "completed", "discount"].includes(status)) {
      mongoQuery.status = status;
    }
    
    // Filter by age rating
    if (ageRating) {
      mongoQuery.ageRating = ageRating;
    }
    
    // Filter by explicit content flag
    if (isExplicit !== undefined) {
      mongoQuery.isExplicitContent = isExplicit;
    }
    
    // Build sort options
    const sortOptions: any = {};
    
    switch (sort) {
      case "trending":
        // Sort by popularity metrics
        sortOptions.viewsCount = -1;
        sortOptions.followersCount = -1;
        sortOptions.lastEpisodePublishedAt = -1;
        break;
      case "newest":
        // Sort by most recently updated
        sortOptions.lastEpisodePublishedAt = -1;
        sortOptions.createdAt = -1;
        break;
      case "rating":
        // Sort by rating
        sortOptions.averageRating = -1;
        sortOptions.viewsCount = -1;
        break;
      case "popular":
        // Sort by pure views
        sortOptions.viewsCount = -1;
        break;
      default:
        sortOptions.viewsCount = -1;
        sortOptions.lastEpisodePublishedAt = -1;
    }
    
    // Count total matching documents (for pagination)
    const total = await NovelModel().countDocuments(mongoQuery);
    console.log(`ℹ️ Found ${total} novels matching search criteria`);
    
    // Prepare models for population
    const User = UserModel();
    const Category = CategoryModel();
    
    // Execute the query
    const novels = await NovelModel()
      .find(mongoQuery)
      .populate({
        path: "author",
        select: "username profile.displayName profile.avatar",
        model: User,
      })
      .populate({
        path: "categories",
        select: "name slug iconUrl themeColor",
        model: Category,
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();
    
    console.log(`✅ Fetched ${novels.length} novels for search query`);
    
    // Get categories for filter UI
    // We limit to visible parent categories (level 0) and their immediate children (level 1)
    const allCategories = await CategoryModel()
      .find({ 
        isVisible: true, 
        isDeleted: false, 
        level: { $lte: 1 } 
      })
      .select("name slug iconUrl level parentCategory displayOrder isFeatured")
      .sort({ level: 1, displayOrder: 1 })
      .lean();
    
    // Organize categories hierarchically
    const categoriesTree = allCategories.filter(cat => cat.level === 0).map(parent => {
      const children = allCategories.filter(
        child => child.parentCategory && child.parentCategory.toString() === parent._id.toString()
      );
      
      return {
        ...parent,
        children
      };
    });
    
    // Get popular tags for tag filter
    const popularTags = await NovelModel().aggregate([
      { $match: { isDeleted: false, visibility: "public" } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { tag: "$_id", count: 1, _id: 0 } }
    ]);
    
    // Return the response
    return NextResponse.json(
      {
        novels,
        categories: categoriesTree,
        popularTags: popularTags.map(item => item.tag),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`❌ Error in novel search:`, error.message);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการค้นหานิยาย" },
      { status: 500 }
    );
  }
}