// src/app/api/trophies/mine/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import UserAchievementModel from "@/backend/models/UserAchievement";
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
    const userAchievements = await UserAchievementModel.findOne({ user: userId })
      .select("earnedItems")
      .lean();
    if (!userAchievements || !userAchievements.earnedItems) {
      return NextResponse.json({ trophies: [] });
    }
    const trophies = userAchievements.earnedItems.map((item: any) => ({
      id: item._id,
      name: item.itemNameSnapshot,
      description: item.itemDescriptionSnapshot,
      imageUrl: item.itemIconUrlSnapshot,
      dateReceived: item.unlockedAt,
      type: item.itemTypeRef,
      rarity: item.itemRaritySnapshot,
    }));
    return NextResponse.json({ trophies });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 