// src/app/api/user/update-preferences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";

/**
 * API Route สำหรับอัปเดตการตั้งค่าของผู้ใช้
 * @param req - คำขอ API
 */
export async function PUT(req: NextRequest) {
  try {
    // ตรวจสอบเซสชันผู้ใช้
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบเพื่อดำเนินการ" },
        { status: 401 }
      );
    }

    // รับข้อมูลจากคำขอ
    const data = await req.json();
    
    // เชื่อมต่อฐานข้อมูล
    await dbConnect();
    
    // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
    const user = await UserModel().findById(session.user.id);
    
    if (!user) {
      return NextResponse.json(
        { error: "ไม่พบผู้ใช้" },
        { status: 404 }
      );
    }

    // อัปเดตข้อมูลการตั้งค่า
    // อัปเดตเฉพาะข้อมูลที่ส่งมา
    if (data.theme) {
      user.preferences.theme = data.theme;
    }
    
    if (data.language) {
      user.preferences.language = data.language;
    }
    
    if (data.notifications) {
      Object.assign(user.preferences.notifications, data.notifications);
    }
    
    if (data.privacy) {
      Object.assign(user.preferences.privacy, data.privacy);
    }

    // บันทึกการเปลี่ยนแปลง
    await user.save();
    
    return NextResponse.json({
      success: true,
      message: "อัปเดตการตั้งค่าเรียบร้อยแล้ว",
      preferences: user.preferences
    });
    
  } catch (error: any) {
    console.error("❌ [API] ข้อผิดพลาดในการอัปเดตการตั้งค่า:", error);
    
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า" },
      { status: 500 }
    );
  }
}