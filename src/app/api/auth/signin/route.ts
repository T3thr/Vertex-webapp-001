// src/app/api/auth/signin/route.ts

// นำเข้าโมดูลที่จำเป็น
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb"; // Utility สำหรับเชื่อมต่อฐานข้อมูล
import UserModel, { IUser } from "@/backend/models/User"; // Mongoose Model สำหรับ User
import bcrypt from "bcryptjs"; // Library สำหรับเปรียบเทียบ hash รหัสผ่าน

// ฟังก์ชัน Handler สำหรับ HTTP POST request (การลงชื่อเข้าใช้ด้วย Credentials)
export async function POST(request: Request) {
  // เชื่อมต่อฐานข้อมูล
  await dbConnect();

  try {
    // ดึงข้อมูล email หรือ username และ password จาก request body
    const { email, username, password } = await request.json();

    // ตรวจสอบว่ามี email หรือ username และ password หรือไม่
    if ((!email && !username) || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลหรือชื่อผู้ใช้ และรหัสผ่าน" },
        { status: 400 } // Bad Request
      );
    }

    // ค้นหาผู้ใช้ด้วย email หรือ username
    // ใช้ .select("+password") เพื่อดึงฟิลด์ password ที่ปกติถูกซ่อนไว้
    const user = await UserModel().findOne({
      $or: [
        { email: email?.toLowerCase() },
        { username: username }
      ],
    }).select("+password");

    // ตรวจสอบว่าพบผู้ใช้หรือไม่
    if (!user) {
      return NextResponse.json(
        { error: "ไม่พบผู้ใช้ที่ตรงกับอีเมลหรือชื่อผู้ใช้นี้" },
        { status: 404 } // Not Found
      );
    }

    // ตรวจสอบว่าผู้ใช้มีรหัสผ่านหรือไม่ (อาจไม่มีถ้าสมัครผ่าน social login)
    if (!user.password) {
        return NextResponse.json(
            { error: "บัญชีนี้อาจถูกสร้างผ่าน Social Login กรุณาลองเข้าสู่ระบบด้วยวิธีอื่น" },
            { status: 400 } // Bad Request
        );
    }

    // เปรียบเทียบรหัสผ่านที่ส่งมากับ hash ในฐานข้อมูล
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    // ถ้า รหัสผ่านไม่ตรงกัน
    if (!isPasswordMatch) {
      return NextResponse.json(
        { error: "รหัสผ่านไม่ถูกต้อง" },
        { status: 401 } // Unauthorized
      );
    }

    // ถ้า รหัสผ่านถูกต้อง
    // อัปเดต lastLogin
    user.lastLogin = new Date();
    await user.save();

    // สร้าง object ผู้ใช้ที่จะส่งคืน (โดยไม่มีรหัสผ่าน)
    // เราต้องส่งคืนข้อมูลที่ตรงกับโครงสร้างที่ CredentialsProvider คาดหวังใน authorize callback
    // และตรงกับประเภท User ที่เราประกาศใน next-auth.d.ts
    const userResponse = {
        id: user._id.toString(), // แปลง ObjectId เป็น string
        email: user.email,
        username: user.username,
        role: user.role,
        profile: user.profile,
        // ไม่ต้องส่ง password
    };

    // ส่งข้อมูลผู้ใช้กลับไป (NextAuth CredentialsProvider จะใช้ข้อมูลนี้)
    return NextResponse.json({ user: userResponse }, { status: 200 });

  } catch (error: any) {
    console.error("❌ ข้อผิดพลาดในการลงชื่อเข้าใช้:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดบางอย่างบนเซิร์ฟเวอร์" },
      { status: 500 } // Internal Server Error
    );
  }
}

