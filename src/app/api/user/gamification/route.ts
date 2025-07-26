// src/app/api/user/gamification/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import UserGamificationModel from "@/backend/models/UserGamification";

export async function GET() {
  try {
    // ตรวจสอบ session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบ", success: false },
        { status: 401 }
      );
    }

    await dbConnect();

    // ค้นหาข้อมูล gamification ของผู้ใช้
    const userGamification = await UserGamificationModel.findOne({
      userId: session.user.id
    }).lean();

    if (!userGamification) {
      // หากไม่มีข้อมูล gamification ให้สร้างใหม่
      const newGamification = new UserGamificationModel({
        userId: session.user.id,
        wallet: {
          coinBalance: 0,
          julyBonusClaimed: false
        }
      });

      await newGamification.save();

      return NextResponse.json({
        success: true,
        data: {
          coinBalance: 0,
          julyBonusClaimed: false
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        coinBalance: userGamification.wallet?.coinBalance || 0,
        julyBonusClaimed: userGamification.wallet?.julyBonusClaimed || false
      }
    });

  } catch (error) {
    console.error("❌ [Gamification API] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล", success: false },
      { status: 500 }
    );
  }
}
