// src/app/api/user/update-preferences/route.ts
// API สำหรับอัปเดตการตั้งค่า (Preferences) ของผู้ใช้
// อัปเดต: ปรับให้ทำงานกับ UserModel ที่รวมศูนย์ และโครงสร้าง IUserPreferences ใหม่

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // ตรวจสอบ Path ให้ถูกต้อง
import dbConnect from "@/backend/lib/mongodb"; // ตรวจสอบ Path ให้ถูกต้อง
import UserModel, { IUser, IUserPreferences, IUserDisplayPreferences } from "@/backend/models/User"; // Import IUser และ IUserPreferences
import { z } from "zod";
import mongoose from "mongoose";

// สคีมา Zod สำหรับตรวจสอบข้อมูลที่ส่งมา (ปรับปรุงให้ตรงกับโครงสร้าง IUserPreferences)
// สามารถขยาย schema นี้เพื่อรองรับการตั้งค่าอื่นๆ ใน IUserPreferences ได้
const updatePreferencesSchema = z.object({
  // ภาษาที่ใช้ใน UI
  language: z.string().optional(),
  // การตั้งค่าการแสดงผล
  display: z.object({
    theme: z.enum(["light", "dark", "system", "sepia"]).optional(),
    // สามารถเพิ่มการตั้งค่าการแสดงผลอื่นๆ ที่นี่ เช่น reading, accessibility
    // reading: z.object({ ... }).optional(),
    // accessibility: z.object({ ... }).optional(),
  }).optional(),
  // notifications: z.object({ ... }).optional(), // ตัวอย่างสำหรับการตั้งค่าการแจ้งเตือน
  // contentAndPrivacy: z.object({ ... }).optional(), // ตัวอย่างสำหรับการตั้งค่าเนื้อหาและความเป็นส่วนตัว
  // visualNovelGameplay: z.object({ ... }).optional(), // ตัวอย่างสำหรับการตั้งค่า Visual Novel
}).partial(); // .partial() ทำให้ทุก field ใน object ไม่จำเป็นต้องส่งมาทั้งหมด

// ประเภทของ Theme ที่รองรับ (เพื่อให้สอดคล้องกับ schema และ model)
type ThemePreference = "light" | "dark" | "system" | "sepia";

/**
 * API Route สำหรับอัปเดตการตั้งค่าของผู้ใช้ (PUT request)
 * @param req - NextRequest object ที่มีข้อมูลคำขอ
 */
export async function PUT(req: NextRequest) {
  console.log("🔵 [API UpdatePrefs] ได้รับคำขออัปเดตการตั้งค่า...");
  try {
    // 1. ตรวจสอบเซสชันผู้ใช้ (Authentication)
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      console.warn("⚠️ [API UpdatePrefs] ไม่ได้รับอนุญาต: ไม่มีเซสชันผู้ใช้");
      return NextResponse.json(
        { success: false, error: "ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบเพื่อดำเนินการ" },
        { status: 401 }
      );
    }

    const userId = session.user.id; // ID ของผู้ใช้จากเซสชัน

    // ตรวจสอบความถูกต้องของ userId (ควรเป็น ObjectId ที่ถูกต้อง)
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.warn(`⚠️ [API UpdatePrefs] รูปแบบ User ID ไม่ถูกต้อง: ${userId}`);
      return NextResponse.json(
        { success: false, error: "ID ผู้ใช้ไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    console.log(`ℹ️ [API UpdatePrefs] ผู้ใช้ที่ยืนยันตัวตนแล้ว: ${userId}`);

    // 2. รับและตรวจสอบข้อมูลจาก body ของคำขอ
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("ℹ️ [API UpdatePrefs] ข้อมูลดิบจาก Request Body:", requestBody);
    } catch (jsonError: any) {
      console.error("❌ [API UpdatePrefs] Invalid JSON ใน Request Body:", jsonError.message);
      return NextResponse.json(
        { success: false, error: "ข้อมูลที่ส่งมาไม่ใช่รูปแบบ JSON ที่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบข้อมูลด้วย Zod schema
    const validationResult = updatePreferencesSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.warn("⚠️ [API UpdatePrefs] การตรวจสอบข้อมูลล้มเหลว:", validationResult.error.errors);
      return NextResponse.json(
        {
          success: false,
          error: "ข้อมูลที่ส่งมาไม่ถูกต้องตามรูปแบบที่กำหนด",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const preferencesToUpdate = validationResult.data; // ข้อมูล preferences ที่ผ่านการตรวจสอบแล้ว
    console.log("ℹ️ [API UpdatePrefs] ข้อมูล Preferences ที่จะอัปเดต (หลัง Zod validation):", preferencesToUpdate);

    // ตรวจสอบว่ามีข้อมูลให้อัปเดตอย่างน้อยหนึ่งอย่างหรือไม่
    if (Object.keys(preferencesToUpdate).length === 0) {
      console.log("ℹ️ [API UpdatePrefs] ไม่มีข้อมูลการตั้งค่าให้อัปเดตในคำขอ");
      return NextResponse.json(
        { success: false, error: "ไม่มีข้อมูลการตั้งค่าให้อัปเดต" },
        { status: 400 }
      );
    }

    // 3. เชื่อมต่อฐานข้อมูล
    await dbConnect();
    console.log(`ℹ️ [API UpdatePrefs] เชื่อมต่อ MongoDB สำเร็จสำหรับ User ID: ${userId}`);

    // 4. เตรียม field สำหรับอัปเดตใน MongoDB
    // เราจะใช้ dot notation สำหรับ nested fields ใน preferences
    const updateFields: { [key: string]: any } = {};

    if (preferencesToUpdate.language) {
      updateFields["preferences.language"] = preferencesToUpdate.language;
    }
    if (preferencesToUpdate.display?.theme) {
      updateFields["preferences.display.theme"] = preferencesToUpdate.display.theme as ThemePreference;
    }
    // --- สามารถเพิ่มการ map field อื่นๆ จาก preferencesToUpdate ไปยัง updateFields ที่นี่ ---
    // ตัวอย่าง:
    // if (preferencesToUpdate.display?.reading?.fontSize) {
    //   updateFields["preferences.display.reading.fontSize"] = preferencesToUpdate.display.reading.fontSize;
    // }
    // if (preferencesToUpdate.notifications?.email?.enabled !== undefined) { // สำหรับ boolean
    //   updateFields["preferences.notifications.email.enabled"] = preferencesToUpdate.notifications.email.enabled;
    // }

    // ตรวจสอบอีกครั้งว่ามี fields ที่จะอัปเดตจริงๆ
    if (Object.keys(updateFields).length === 0) {
        console.log("ℹ️ [API UpdatePrefs] ไม่มี field ที่ถูก map สำหรับการอัปเดตฐานข้อมูล");
        return NextResponse.json(
            { success: false, error: "ไม่มีข้อมูลการตั้งค่าที่รู้จักให้อัปเดต" },
            { status: 400 }
        );
    }
    console.log("ℹ️ [API UpdatePrefs] Fields ที่จะถูกตั้งค่าใน MongoDB:", updateFields);


    // 5. ค้นหาและอัปเดตผู้ใช้ใน UserModel
    // ใช้ findByIdAndUpdate กับ UserModel เท่านั้น
    const updatedUserDocument = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true, lean: true, select: 'preferences email username roles' } // lean: true เพื่อ performance
    ).exec(); // ใช้ IUser โดยตรง

    if (!updatedUserDocument) {
      console.warn(`⚠️ [API UpdatePrefs] ไม่พบผู้ใช้ด้วย ID: ${userId} ใน UserModel`);
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลผู้ใช้" },
        { status: 404 }
      );
    }

    // `updatedUserDocument` ตอนนี้เป็น plain object เนื่องจากใช้ lean: true
    // และมีเฉพาะ fields ที่ select ไว้ (preferences, email, username, roles)
    const finalUserPreferences = updatedUserDocument.preferences as IUserPreferences;

    console.log(`✅ [API UpdatePrefs] อัปเดต Preferences สำเร็จสำหรับ User ID: ${userId}`);
    return NextResponse.json({
      success: true,
      message: "อัปเดตการตั้งค่าเรียบร้อยแล้ว",
      preferences: finalUserPreferences, // ส่ง preferences ที่อัปเดตแล้วกลับไป
      // user: { // (Optional) ส่งข้อมูลผู้ใช้บางส่วนกลับไป ถ้า client ต้องการอัปเดต session เอง
      //   id: userId,
      //   email: updatedUserDocument.email,
      //   username: updatedUserDocument.username,
      //   roles: updatedUserDocument.roles,
      //   preferences: finalUserPreferences
      // }
    });

  } catch (error: any) {
    console.error("❌ [API UpdatePrefs] เกิดข้อผิดพลาดที่ไม่คาดคิด:", error.message, error.stack);
    if (error.name === 'ValidationError') { // Mongoose validation error
      return NextResponse.json(
        { success: false, error: "ข้อมูลที่ส่งมาไม่ถูกต้อง (Mongoose Validation)", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof mongoose.Error) { // General Mongoose error
      console.error("❌ [API UpdatePrefs] Mongoose error:", error.message);
      return NextResponse.json(
        { success: false, error: "เกิดข้อผิดพลาดเกี่ยวกับฐานข้อมูล", details: error.message },
        { status: 500 }
      );
    }
    // General server error
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะอัปเดตการตั้งค่า", details: error.message },
      { status: 500 }
    );
  }
}