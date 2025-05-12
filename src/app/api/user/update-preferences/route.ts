// src/app/api/user/update-preferences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUser } from "@/backend/models/User";
import SocialMediaUserModel, { ISocialMediaUser } from "@/backend/models/SocialMediaUser";
import { z } from "zod";
import mongoose from "mongoose";

// สคีมาเพื่อตรวจสอบข้อมูลที่ส่งมา
const updatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system", "sepia"]).optional(),
  language: z.string().optional(),
  // สามารถเพิ่มการตรวจสอบ preferences อื่นๆ ที่นี่ได้ตามต้องการ
});

// ประเภทของ Theme ที่รองรับ (เพื่อให้สอดคล้องกับ schema และ model)
type ThemePreference = "light" | "dark" | "system" | "sepia";

/**
 * API Route สำหรับอัปเดตการตั้งค่าของผู้ใช้
 * @param req - คำขอ API
 */
export async function PUT(req: NextRequest) {
  try {
    // 1. ตรวจสอบเซสชันผู้ใช้
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      console.warn("[API UpdatePrefs] Unauthenticated access attempt.");
      return NextResponse.json(
        { success: false, error: "ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบเพื่อดำเนินการ" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // ตรวจสอบว่า userId เป็น ObjectId ที่ถูกต้องหรือไม่
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.warn(`[API UpdatePrefs] Invalid user ID format: ${userId}`);
      return NextResponse.json(
        { success: false, error: "ID ผู้ใช้ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // 2. รับและตรวจสอบข้อมูลจากคำขอ
    let rawData;
    try {
      rawData = await req.json();
    } catch (jsonError: any) {
      console.error("[API UpdatePrefs] Invalid JSON in request body:", jsonError.message);
      return NextResponse.json(
        { success: false, error: "ข้อมูลที่ส่งมาไม่ใช่ JSON ที่ถูกต้อง" },
        { status: 400 }
      );
    }

    const validationResult = updatePreferencesSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.warn("[API UpdatePrefs] Validation failed:", validationResult.error.errors);
      return NextResponse.json(
        {
          success: false,
          error: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { theme, language } = validationResult.data;

    // ตรวจสอบว่ามีข้อมูลให้อัปเดตหรือไม่
    if (!theme && !language) {
      return NextResponse.json(
        { success: false, error: "ไม่มีข้อมูลการตั้งค่าให้อัปเดต" },
        { status: 400 }
      );
    }

    // 3. เชื่อมต่อฐานข้อมูล
    await dbConnect();
    console.log(`[API UpdatePrefs] Connected to DB for updating preferences, User ID: ${userId}`);

    // 4. ค้นหาและอัปเดตผู้ใช้
    const updateFields: { [key: string]: any } = {};
    if (theme) updateFields["preferences.theme"] = theme as ThemePreference;
    if (language) updateFields["preferences.language"] = language;

    // สร้าง instance ของ models
    const UserCollection = UserModel();
    const SocialMediaUserCollection = SocialMediaUserModel();

    let updatedUserDocument: IUser | ISocialMediaUser | null = null;

    // พยายามอัปเดตใน User model ก่อน
    updatedUserDocument = await UserCollection.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true, lean: true, select: 'preferences email username role' }
    );

    // ถ้าไม่พบใน User model ให้ลอง SocialMediaUser model
    if (!updatedUserDocument) {
      console.log(`[API UpdatePrefs] User not found in UserModel, trying SocialMediaUserModel for ID: ${userId}`);
      updatedUserDocument = await SocialMediaUserCollection.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true, lean: true, select: 'preferences email username role' }
      );
    }

    if (!updatedUserDocument) {
      console.warn(`[API UpdatePrefs] User not found in both models for ID: ${userId}`);
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลผู้ใช้" },
        { status: 404 }
      );
    }

    console.log(`[API UpdatePrefs] Preferences updated successfully for user ID: ${userId}, theme: ${theme}`);
    return NextResponse.json({
      success: true,
      message: "อัปเดตการตั้งค่าเรียบร้อยแล้ว",
      preferences: updatedUserDocument.preferences,
    });

  } catch (error: any) {
    console.error("❌ [API UpdatePrefs] Unexpected error:", error);
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ถูกต้องตาม schema", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof mongoose.Error) {
      console.error("❌ [API UpdatePrefs] Mongoose error:", error.message);
      return NextResponse.json(
        { success: false, error: "เกิดข้อผิดพลาดเกี่ยวกับฐานข้อมูล", details: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะอัปเดตการตั้งค่า", details: error.message },
      { status: 500 }
    );
  }
}