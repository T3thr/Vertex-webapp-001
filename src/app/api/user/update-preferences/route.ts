// src/app/api/user/update-preferences/route.ts
// API สำหรับอัปเดตการตั้งค่า (Preferences) ของผู้ใช้, โดยเฉพาะ Theme
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; 
import dbConnect from "@/backend/lib/mongodb"; 
import UserSettingsModel, { IUserSettings } from "@/backend/models/UserSettings"; // ✅ Import IUserSettings จาก UserSettings.ts
import UserModel from "@/backend/models/User"; // ✅ Import User model
import { z } from "zod";
import mongoose from "mongoose";

// Theme type ที่รองรับ (สอดคล้องกับ User model และ ThemeContext)
type ThemePreference = "light" | "dark" | "system" | "sepia";

// Zod schema สำหรับตรวจสอบข้อมูลที่ส่งมา
// ปรับ schema ให้ตรงกับโครงสร้างที่ client ส่งมา: { preferences: { display: { theme: '...' } } }
const updateUserPreferencesSchema = z.object({
  preferences: z.object({
    display: z.object({
      theme: z.enum(["light", "dark", "system", "sepia"], {
        required_error: "Theme is required (ต้องระบุ Theme ใน preferences.display.theme)",
        invalid_type_error: "Invalid theme value (ค่า Theme ไม่ถูกต้องใน preferences.display.theme)",
      }),
      // สามารถเพิ่มการตั้งค่า display อื่นๆ ที่นี่ถ้ามี
    }),
    // สามารถเพิ่มหมวดหมู่ preferences อื่นๆ ที่นี่ถ้ามี (เช่น 'language')
  }),
});

/**
 * @method PUT
 * @description API Route สำหรับอัปเดตการตั้งค่า Theme ของผู้ใช้ (และอาจรวมถึง preferences อื่นๆ ในอนาคต)
 * @param req - NextRequest object ที่มีข้อมูลคำขอ
 * @returns NextResponse object พร้อมผลลัพธ์การอัปเดต
 */
export async function PUT(req: NextRequest) { // Client จะเรียกใช้ method PUT
  console.log("🔵 [API UpdatePrefs] ได้รับคำขอ PUT เพื่ออัปเดต Preferences...");

  try {
    // 1. ตรวจสอบ Session และการยืนยันตัวตนของผู้ใช้
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      console.warn("⚠️ [API UpdatePrefs] ไม่อนุญาต: ไม่มี session หรือ user ID");
      return NextResponse.json(
        { success: false, error: "ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.warn(`⚠️ [API UpdatePrefs] User ID ไม่ถูกต้อง: ${userId}`);
      return NextResponse.json(
        { success: false, error: "ID ผู้ใช้ไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    console.log(`ℹ️ [API UpdatePrefs] ผู้ใช้ยืนยันตัวตนแล้ว: ${userId}`);

    // 2. รับและตรวจสอบข้อมูล (payload) จาก request body
    let requestBody;
    try {
      requestBody = await req.json();
      // Log ข้อมูลดิบที่ได้รับ (ตรงกับที่ client ส่งมา)
      console.log("ℹ️ [API UpdatePrefs] ข้อมูลดิบจาก Request Body:", requestBody);
    } catch (jsonError: any) {
      console.error("❌ [API UpdatePrefs] Invalid JSON ใน Request Body:", jsonError.message);
      return NextResponse.json(
        { success: false, error: "ข้อมูลที่ส่งมาไม่ใช่รูปแบบ JSON ที่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบข้อมูลด้วย Zod schema ที่อัปเดตแล้ว
    const validationResult = updateUserPreferencesSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.warn("⚠️ [API UpdatePrefs] การตรวจสอบข้อมูล Preferences ล้มเหลว:", validationResult.error.errors);
      return NextResponse.json(
        {
          success: false,
          error: "ข้อมูล Preferences ที่ส่งมาไม่ถูกต้อง",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    // ดึงค่า theme ที่ผ่านการ validate ออกมาจากโครงสร้างที่ client ส่งมา
    const { theme: newThemePreference } = validationResult.data.preferences.display;
    console.log("ℹ️ [API UpdatePrefs] Theme ที่จะอัปเดต (หลัง Zod validation):", newThemePreference);

    // 3. เชื่อมต่อฐานข้อมูล
    await dbConnect();
    console.log(`ℹ️ [API UpdatePrefs] เชื่อมต่อ MongoDB สำเร็จสำหรับ User ID: ${userId}`);

    // 4. อัปเดต UserSettings
    const updatedUserSettings = await UserSettingsModel.findOneAndUpdate(
      { userId: userId },
      { $set: { "display.theme": newThemePreference } },
      { new: true, runValidators: true }
    );

    if (!updatedUserSettings) {
      console.warn(`⚠️ [API UpdatePrefs] ไม่พบการตั้งค่าผู้ใช้ด้วย ID: ${userId}`);
      return NextResponse.json(
        { success: false, error: "ไม่พบการตั้งค่าผู้ใช้" },
        { status: 404 }
      );
    }

    console.log(`✅ [API UpdatePrefs] อัปเดต Theme Preference สำเร็จสำหรับ User ID: ${userId}`);
    return NextResponse.json({
      success: true,
      message: "อัปเดตการตั้งค่า Theme เรียบร้อยแล้ว",
      preferences: updatedUserSettings.display, // ส่ง preferences ที่อัปเดตแล้วทั้งหมดกลับไป
    });

  } catch (error: any) {
    console.error("❌ [API UpdatePrefs] เกิดข้อผิดพลาดที่ไม่คาดคิด:", error.message, error.stack);

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: "ข้อมูลที่ส่งมาไม่ถูกต้อง (Mongoose Validation)", details: error.errors },
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
      { success: false, error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะอัปเดตการตั้งค่า Theme", details: error.message },
      { status: 500 }
    );
  }
}