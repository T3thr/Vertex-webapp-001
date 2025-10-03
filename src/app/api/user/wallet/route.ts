// src/app/api/user/wallet/route.ts
// API endpoint สำหรับดึงข้อมูลกระเป๋าเงินของผู้ใช้

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import UserGamificationModel from "@/backend/models/UserGamification";

export async function GET(req: NextRequest) {
  try {
    // 1. ตรวจสอบการยืนยันตัวตนของผู้ใช้
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" },
        { status: 401 }
      );
    }

    // 2. เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // 3. ดึงข้อมูลกระเป๋าเงินของผู้ใช้
    const userGamification = await UserGamificationModel.findOne({ userId: session.user.id }).lean();

    if (!userGamification) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลกระเป๋าเงินของผู้ใช้" },
        { status: 404 }
      );
    }

    // 4. ส่งข้อมูลกระเป๋าเงินกลับไป
    return NextResponse.json({
      success: true,
      coinBalance: userGamification.wallet?.coinBalance || 0,
      lastCoinTransactionAt: userGamification.wallet?.lastCoinTransactionAt,
      userId: session.user.id,
    });
  } catch (error: any) {
    console.error("❌ [API User Wallet] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลกระเป๋าเงิน" },
      { status: 500 }
    );
  }
}