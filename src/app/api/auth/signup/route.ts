// src/app/api/auth/signup/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUser } from "@/backend/models/User";
import { sendVerificationEmail, generateVerificationToken } from "@/backend/services/sendemail";

// ประเภทสำหรับ Request Body
interface SignUpRequestBody {
  email: string;
  username: string;
  password: string;
  recaptchaToken: string;
}

// POST: สร้างผู้ใช้ใหม่สำหรับ Credentials-based signup
export async function POST(request: Request): Promise<NextResponse> {
  try {
    await dbConnect();
    const body = await request.json() as SignUpRequestBody;
    const { email, username, password, recaptchaToken } = body;

    // 1. ตรวจสอบข้อมูลที่จำเป็น
    if (!email || !username || !password || !recaptchaToken) {
      console.error(`❌ ข้อมูลไม่ครบถ้วน: email=${email}, username=${username}, password=${password ? "provided" : "missing"}, recaptchaToken=${recaptchaToken ? "provided" : "missing"}`);
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน (อีเมล, ชื่อผู้ใช้, รหัสผ่าน, reCAPTCHA)" },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบ reCAPTCHA
    const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY!,
        response: recaptchaToken,
      }).toString(),
    });

    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaData.success || (recaptchaData.score && recaptchaData.score < 0.5)) {
      console.error(`❌ การยืนยัน reCAPTCHA ล้มเหลว: ${JSON.stringify(recaptchaData)}`);
      return NextResponse.json(
        { error: 'การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่' },
        { status: 400 }
      );
    }

    // 3. ตรวจสอบรูปแบบข้อมูล
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      console.error(`❌ รูปแบบอีเมลไม่ถูกต้อง: ${email}`);
      return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      console.error(`❌ รูปแบบชื่อผู้ใช้ไม่ถูกต้อง: ${username}`);
      return NextResponse.json(
        { error: "ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร, ตัวเลข หรือเครื่องหมาย _ เท่านั้น" },
        { status: 400 }
      );
    }
    if (username.length < 3 || username.length > 30) {
      console.error(`❌ ความยาวชื่อผู้ใช้ไม่ถูกต้อง: ${username}`);
      return NextResponse.json(
        { error: "ชื่อผู้ใช้ต้องมีระหว่าง 3 ถึง 30 ตัวอักษร" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      console.error(`❌ รหัสผ่านสั้นเกินไป: length=${password.length}`);
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" },
        { status: 400 }
      );
    }

    const lowerCaseEmail = email.toLowerCase();

    // 4. ตรวจสอบว่ามีผู้ใช้ซ้ำหรือไม่
    const existingUser = await UserModel()
      .findOne({
        $or: [{ email: lowerCaseEmail }, { username }],
      })
      .lean();

    if (existingUser) {
      const conflictField = existingUser.email === lowerCaseEmail ? "อีเมล" : "ชื่อผู้ใช้";
      console.error(`❌ ${conflictField} ถูกใช้งานแล้ว: ${lowerCaseEmail || username}`);
      return NextResponse.json(
        { error: `${conflictField} นี้ถูกใช้งานแล้ว` },
        { status: 409 }
      );
    }

    // 5. สร้าง Verification Token
    const { token, expiry } = generateVerificationToken();

    // 6. สร้างผู้ใช้ใหม่ (ยังไม่ยืนยัน)
    const newUser = new (UserModel())({
      email: lowerCaseEmail,
      username,
      password, // จะถูก hashed โดย middleware
      role: "Reader",
      isEmailVerified: false,
      emailVerificationToken: token,
      emailVerificationTokenExpiry: expiry,
      profile: {
        displayName: username,
        avatar: "",
        bio: "",
        coverImage: "",
        preferredGenres: [],
      },
      stats: {
        followersCount: 0,
        followingCount: 0,
        novelsCount: 0,
        purchasesCount: 0,
        donationsReceivedAmount: 0,
        donationsMadeAmount: 0,
        totalEpisodesSoldCount: 0,
      },
      preferences: {
        language: "th",
        theme: "system",
        notifications: {
          email: true,
          push: true,
          novelUpdates: true,
          comments: true,
          donations: true,
        },
      },
      wallet: {
        balance: 0,
        currency: "THB",
      },
      gamification: {
        level: 1,
        experience: 0,
        streaks: {
          currentLoginStreak: 0,
          longestLoginStreak: 0,
          lastLoginDate: new Date(),
        },
      },
      writerVerification: {
        status: "none",
      },
      isActive: true,
      lastLoginAt: new Date(),
      accounts: [
        {
          provider: "credentials",
          providerAccountId: lowerCaseEmail,
          type: "credentials",
        },
      ],
    });

    await newUser.save();
    console.log(`✅ [Signup] สร้างผู้ใช้ใหม่ (ยังไม่ยืนยัน): ${username} (${lowerCaseEmail})`);

    // 7. ส่งอีเมลยืนยัน
    try {
      await sendVerificationEmail(lowerCaseEmail, token);
    } catch (emailError: unknown) {
      console.error("❌ [Signup] ไม่สามารถส่งอีเมลยืนยันได้:", emailError);
      // แจ้งผู้ใช้ให้ลองส่งอีเมลยืนยันใหม่
      return NextResponse.json(
        {
          success: true,
          message: "สมัครสมาชิกสำเร็จ แต่ไม่สามารถส่งอีเมลยืนยันได้ กรุณาขอส่งอีเมลยืนยันใหม่",
        },
        { status: 201 }
      );
    }

    // 8. ส่ง Response สำเร็จ
    return NextResponse.json(
      { success: true, message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี" },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("❌ [Signup] เกิดข้อผิดพลาด:", error);

    if (error instanceof Error && (error as any).code === 11000) {
      const field = Object.keys((error as any).keyValue)[0];
      const value = (error as any).keyValue[field];
      return NextResponse.json(
        { error: `${field === "email" ? "อีเมล" : "ชื่อผู้ใช้"} '${value}' นี้ถูกใช้งานแล้ว` },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.name === "ValidationError") {
      const errors = Object.values((error as any).errors).map((e: any) => e.message);
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสมัครสมาชิก" },
      { status: 500 }
    );
  }
}