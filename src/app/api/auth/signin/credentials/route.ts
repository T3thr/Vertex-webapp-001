// src/app/api/auth/signin/credentials/route.ts
// API สำหรับการลงชื่อเข้าใช้ด้วย Credentials (อีเมล/ชื่อผู้ใช้ และรหัสผ่าน)
// อัปเดต: แก้ไขการ query user และเรียก matchPassword ให้ถูกต้อง

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IAccount, IUser } from "@/backend/models/User"; // IUser และ UserModel
import { Types } from "mongoose";

interface CredentialsSignInRequestBody {
  identifier: string;
  password: string;
}

// CredentialsSignInResponseUser ควรจะเหมือนกับโครงสร้าง IUser ที่ client คาดหวัง
// ซึ่งอาจจะ map มาจาก SessionUser ใน options.ts อีกที
// เพื่อความง่ายใน API นี้ เราจะคืนโครงสร้าง IUser (หลังจาก toObject และแปลง _id)
type CredentialsSignInResponseUser = Omit<IUser, '_id' | 'password' | 'accounts'> & {
    _id: string;
    accounts: Array<Pick<IUser['accounts'][number], 'provider' | 'providerAccountId' | 'type'>>; // ส่งเฉพาะ field ที่จำเป็นและปลอดภัย
};


export async function POST(request: Request) {
  try {
    await dbConnect();
    console.log("🔵 [API:CredentialsSignIn] เชื่อมต่อ MongoDB สำเร็จ");

    const body: CredentialsSignInRequestBody = await request.json();
    const { identifier, password } = body;
    console.log(`ℹ️ [API:CredentialsSignIn] ข้อมูลที่ได้รับ: identifier=${identifier}`);

    if (!identifier?.trim() || !password?.trim()) {
      console.warn("⚠️ [API:CredentialsSignIn] ข้อมูลไม่ครบถ้วน");
      return NextResponse.json(
        { error: "กรุณาระบุอีเมล/ชื่อผู้ใช้ และรหัสผ่าน" },
        { status: 400 }
      );
    }

    console.log(`🔍 [API:CredentialsSignIn] ค้นหาผู้ใช้ด้วย identifier: ${identifier}`);
    // Query ผู้ใช้โดยไม่ใช้ .lean() เพื่อให้ได้ Mongoose document instance
    // และ select password มาเพื่อใช้ใน matchPassword
    const userDocument = await UserModel.findOne({
      $and: [
        {
          $or: [
            { email: identifier.trim().toLowerCase() },
            { username: { $regex: `^${identifier.trim()}$`, $options: "i" } },
          ],
        },
        {
          accounts: { // ตรวจสอบว่ามี account ประเภท credentials
            $elemMatch: { provider: "credentials", type: "credentials" },
          },
        },
      ],
    }).select("+password +accounts"); // <--- สำคัญ: เลือก +password มาด้วย

    if (!userDocument) {
      console.warn(`⚠️ [API:CredentialsSignIn] ไม่พบผู้ใช้หรือบัญชี credentials: ${identifier}`);
      return NextResponse.json(
        { error: "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }
    console.log(`✅ [API:CredentialsSignIn] พบผู้ใช้: ${userDocument.username} (ID: ${userDocument._id})`);

    // ตรวจสอบรหัสผ่าน (userDocument เป็น Mongoose document instance แล้ว)
    const isPasswordValid = await userDocument.matchPassword(password); // เรียก method จาก instance โดยตรง
    if (!isPasswordValid) {
      console.warn(`⚠️ [API:CredentialsSignIn] รหัสผ่านไม่ถูกต้องสำหรับ: ${identifier}`);
      return NextResponse.json(
        { error: "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }
    console.log(`✅ [API:CredentialsSignIn] รหัสผ่านถูกต้องสำหรับ: ${userDocument.username}`);

    // ตรวจสอบสถานะบัญชี (ใช้ userDocument ที่เป็น Mongoose document instance)
    if (!userDocument.isActive) {
      console.warn(`⚠️ [API:CredentialsSignIn] บัญชีไม่ใช้งาน: ${identifier}`);
      return NextResponse.json(
        { error: "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแล" },
        { status: 403 }
      );
    }

    if (userDocument.isBanned) {
      const banMessage = userDocument.bannedUntil
        ? `บัญชีนี้ถูกระงับจนถึง ${new Date(userDocument.bannedUntil).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`
        : "บัญชีนี้ถูกระงับถาวร";
      console.warn(`⚠️ [API:CredentialsSignIn] บัญชีถูกแบน: ${identifier}`);
      return NextResponse.json(
        { error: banMessage, banReason: userDocument.banReason || "ไม่ระบุสาเหตุ" },
        { status: 403 }
      );
    }

    if (userDocument.email && !userDocument.isEmailVerified) {
      console.warn(`⚠️ [API:CredentialsSignIn] อีเมลยังไม่ยืนยัน: ${identifier}`);
      return NextResponse.json(
        { error: "ยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมายของคุณ" },
        { status: 403 }
      );
    }
    console.log(`✅ [API:CredentialsSignIn] สถานะบัญชีถูกต้อง`);

    // อัปเดตเวลา login ล่าสุด
    userDocument.lastLoginAt = new Date();
    await userDocument.save({ validateModifiedOnly: true }); // validateModifiedOnly อาจจะไม่จำเป็นถ้าไม่แก้ไข field อื่น
    console.log(`ℹ️ [API:CredentialsSignIn] อัปเดต lastLoginAt สำหรับ: ${userDocument.username}`);

    // เตรียมข้อมูลผู้ใช้สำหรับ response โดยใช้ toObject() และแปลง _id
    const userObject = userDocument.toObject<IUser & { _id: Types.ObjectId }>(); // <--- ใช้ IUser
    
    const userResponse: CredentialsSignInResponseUser = {
        ...(userObject as Omit<IUser, '_id' | 'password' | 'accounts'>), // Cast เพื่อหลีกเลี่ยง type conflict ชั่วคราว
        _id: userObject._id.toString(),
        // ส่งเฉพาะข้อมูล accounts ที่ปลอดภัยและจำเป็น
        accounts: userObject.accounts.map(acc => ({
            provider: acc.provider,
            providerAccountId: acc.providerAccountId,
            type: acc.type,
        })) as IAccount[], // Cast to IAccount[]
    };

    // password จะไม่ถูกรวมอยู่แล้วถ้า schema มี select: false และ toObject() เคารพ điều đó
    // แต่ถ้าต้องการความมั่นใจ ก็สามารถ delete property password จาก userResponse ได้
    // delete (userResponse as any).password; // ถ้ายังกังวล


    console.log(`✅ [API:CredentialsSignIn] การลงชื่อเข้าใช้สำเร็จ: ${identifier}`);
    return NextResponse.json(
      { success: true, user: userResponse }, // ส่ง userResponse ที่แปลงแล้ว
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [API:CredentialsSignIn] ข้อผิดพลาด:", error.message || error, error.stack);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลงชื่อเข้าใช้: " + (error.message || "ข้อผิดพลาดที่ไม่ทราบสาเหตุ")},
      { status: 500 }
    );
  }
}