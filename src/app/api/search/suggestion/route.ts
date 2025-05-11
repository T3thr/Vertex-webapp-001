// src/app/api/search/suggestions/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel from "@/backend/models/Novel";
import CategoryModel from "@/backend/models/Category";

export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    
    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }
    
    console.log(`📡 API /api/search/suggestions called with query: ${query}`);
    
    // Create regex for case-insensitive search
    const regexSearch = new RegExp(query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
    
    // Find matching novels (titles)
    const novelTitles = await NovelModel()
      .find({
        title: regexSearch,
        isDeleted: false,
        visibility: "public"
      })
      .select("title")
      .limit(3)
      .lean();
    
    // Find matching categories
    const categories = await CategoryModel()
      .find({
        name: regexSearch,
        isVisible: true,
        isDeleted: false
      })
      .select("name")
      .limit(2)
      .lean();
    
    // Find matching tags (aggregating from novels)
    const tagsAggregation = await NovelModel().aggregate([
      { $match: { isDeleted: false, visibility: "public" } },
      { $unwind: "$tags" },
      { $match: { tags: regexSearch } },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);
    
    // Format suggestions
    const novelSuggestions = novelTitles.map(novel => ({
      type: 'novel',
      text: novel.title
    }));
    
    const categorySuggestions = categories.map(category => ({
      type: 'category',
      text: category.name
    }));
    
    const tagSuggestions = tagsAggregation.map(tag => ({
      type: 'tag',
      text: tag._id
    }));
    
    // Combine and limit results
    const allSuggestions = [
      ...novelSuggestions,
      ...categorySuggestions,
      ...tagSuggestions
    ].slice(0, 8);
    
    console.log(`✅ Found ${allSuggestions.length} suggestions for query: ${query}`);
    
    return NextResponse.json({ suggestions: allSuggestions }, { status: 200 });
  } catch (error: any) {
    console.error(`❌ Error fetching search suggestions:`, error.message);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงคำแนะนำสำหรับการค้นหา" },
      { status: 500 }
    );
  }
}