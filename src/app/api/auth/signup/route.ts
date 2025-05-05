// src/app/api/auth/signup/route.ts

// นำเข้าโมดูลที่จำเป็น
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb"; // Utility สำหรับเชื่อมต่อฐานข้อมูล
import UserModel, { IUser } from "@/backend/models/User"; // Mongoose Model สำหรับ User
import bcrypt from "bcryptjs"; // Library สำหรับ hash รหัสผ่าน

// ฟังก์ชัน Handler สำหรับ HTTP POST request (การสมัครสมาชิก)
export async function POST(request: Request) {
  // เชื่อมต่อฐานข้อมูล
  await dbConnect();

  try {
    // ดึงข้อมูล email, username, password จาก request body
    const { email, username, password } = await request.json();

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน (อีเมล, ชื่อผู้ใช้, รหัสผ่าน)" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามี email หรือ username นี้ในระบบแล้วหรือยัง
    const existingUser = await UserModel().findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });// ใช้ lean() เพื่อ performance ถ้าไม่ต้องการ Mongoose document methods

    if (existingUser) {
      let errorMessage = "";
      if (existingUser.email === email.toLowerCase()) {
        errorMessage = "อีเมลนี้ถูกใช้งานแล้ว";
      } else {
        errorMessage = "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว";
      }
      return NextResponse.json({ error: errorMessage }, { status: 409 }); // 409 Conflict
    }

    // Hash รหัสผ่านก่อนบันทึก
    const salt = await bcrypt.genSalt(10); // สร้าง salt
    const hashedPassword = await bcrypt.hash(password, salt); // Hash รหัสผ่าน

    // สร้างผู้ใช้ใหม่ในฐานข้อมูล
    const newUser = new (UserModel()) ({
      email: email.toLowerCase(),
      username,
      password: hashedPassword,
      role: "Reader", // กำหนด role เริ่มต้น
      isEmailVerified: false, // ยังไม่ได้ยืนยันอีเมล
      // profile, novels, purchases จะใช้ค่า default จาก schema
    });

    await newUser.save(); // บันทึกผู้ใช้ใหม่

    // ไม่ส่งข้อมูล password กลับไป
    const userResponse = { ...newUser.toObject() };
    delete userResponse.password;

    // ส่ง response กลับไปว่าสมัครสมาชิกสำเร็จ
    return NextResponse.json(
      { message: "สมัครสมาชิกสำเร็จ", user: userResponse },
      { status: 201 } // 201 Created
    );

  } catch (error: any) {
    console.error("❌ ข้อผิดพลาดในการสมัครสมาชิก:", error);

    // จัดการกับ Mongoose validation errors
    if (error.name === 'ValidationError') {
      let errors = Object.values(error.errors).map((el: any) => el.message);
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    // จัดการกับ Mongoose duplicate key errors (ถึงแม้จะเช็คไปแล้ว แต่เผื่อ race condition)
    if (error.code === 11000) {
        let field = Object.keys(error.keyValue)[0];
        let message = `${field === 'email' ? 'อีเมล' : 'ชื่อผู้ใช้'} นี้ถูกใช้งานแล้ว`;
        return NextResponse.json({ error: message }, { status: 409 });
    }

    // ข้อผิดพลาดอื่นๆ
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดบางอย่างบนเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

