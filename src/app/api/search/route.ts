import dbConnect from "@/backend/lib/mongodb";
import NovelModel from "@/backend/models/Novel";
import { NextRequest, NextResponse } from "next/server";

// Define the type for a novel document after lean()
interface LeanNovel {
  map(arg0: (novel: LeanNovel) => {
      id: string; // No need for .toString() since lean() already returns string
      title: string; coverImage: string; author: string | undefined;
  }): unknown;
  _id: string; // lean() converts ObjectId to string
  title: string;
  coverImage: string;
  author: {
    username?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { results: [], message: "Query too short" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Create a text search query
    const results = await NovelModel()
      .find(
        {
          $or: [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
            { "author.username": { $regex: query, $options: "i" } },
            { tags: { $in: [new RegExp(query, "i")] } },
          ],
          status: "Published", // Only search published novels
        },
        {
          score: { $meta: "textScore" },
        }
      )
      .select("_id title coverImage author.username")
      .sort({ score: { $meta: "textScore" } })
      .limit(10)
      .lean<LeanNovel>();

    // Format the results
    const formattedResults = results.map((novel: LeanNovel) => ({
      id: novel._id, // No need for .toString() since lean() already returns string
      title: novel.title,
      coverImage: novel.coverImage,
      author: novel.author?.username || undefined,
    }));

    return NextResponse.json({ results: formattedResults });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}