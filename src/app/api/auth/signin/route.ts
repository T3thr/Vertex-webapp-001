// src/app/api/auth/signin/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUser } from "@/backend/models/User";
import { Types } from "mongoose";

// ฟังก์ชัน Handler สำหรับ HTTP POST request (การลงชื่อเข้าใช้ด้วย Credentials)
export async function POST(request: Request) {
  await dbConnect();

  try {
    const { email, username, password } = await request.json();

    if ((!email && !username) || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลหรือชื่อผู้ใช้ และรหัสผ่าน" },
        { status: 400 }
      );
    }

    const user = await UserModel()
      .findOne({
        $or: [{ email: email?.toLowerCase() }, { username }],
      })
      .select("+password") as IUser & { _id: Types.ObjectId };

    if (!user) {
      return NextResponse.json(
        { error: "ไม่พบผู้ใช้ที่ตรงกับอีเมลหรือชื่อผู้ใช้นี้" },
        { status: 404 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "บัญชีนี้อาจถูกสร้างผ่าน Social Login กรุณาลองเข้าสู่ระบบด้วยวิธีอื่น" },
        { status: 400 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "บัญชีนี้ถูกระงับการใช้งาน" },
        { status: 403 }
      );
    }

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return NextResponse.json(
        { error: `บัญชีนี้ถูกแบนจนถึง ${user.bannedUntil.toLocaleDateString("th-TH")}` },
        { status: 403 }
      );
    }

    if (!user.isEmailVerified) {
      return NextResponse.json(
        { error: "ยังไม่ได้ยืนยันอีเมล" },
        { status: 403 }
      );
    }

    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      return NextResponse.json(
        { error: "รหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    user.lastLoginAt = new Date();
    await user.save();

    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      profile: user.profile,
      stats: user.stats,
      preferences: user.preferences,
      wallet: user.wallet,
      isEmailVerified: user.isEmailVerified,
    };

    return NextResponse.json({ user: userResponse }, { status: 200 });
  } catch (error: any) {
    console.error("❌ ข้อผิดพลาดในการลงชื่อเข้าใช้:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดบางอย่างบนเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}
