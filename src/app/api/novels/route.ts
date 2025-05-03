import dbConnect from "@/backend/lib/mongodb";
import NovelModel from "@/backend/models/Novel";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();
    const novels = await NovelModel()
      .find({ status: "Published" })
      .select("title description coverImage tags status config episodes author")
      .lean();
    return NextResponse.json({ novels });
  } catch (error) {
    console.error("Error fetching novels:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}