// src/app/api/auth/signup/route.ts
// API สำหรับการสมัครสมาชิกผู้ใช้ใหม่ด้วย Credentials-based authentication
// จัดการการสร้างผู้ใช้ใน User collection พร้อมส่งอีเมลยืนยัน
// reCAPTCHA token ควรจะถูกตรวจสอบแล้วจาก /api/verify-recaptcha ก่อนที่จะเรียก API นี้

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb"; // ตรวจสอบ path ให้ถูกต้อง
import UserModel from "@/backend/models/User"; // ตรวจสอบ path ให้ถูกต้อง
import SocialMediaUserModel from "@/backend/models/SocialMediaUser"; // ตรวจสอบ path ให้ถูกต้อง
import { sendVerificationEmail, generateVerificationToken } from "@/backend/services/sendemail"; // ตรวจสอบ path ให้ถูกต้อง
import { validateEmail, validatePassword, validateUsername } from "@/backend/utils/validation"; // ตรวจสอบ path ให้ถูกต้อง

interface SignUpRequestBody {
  email: string;
  username: string;
  password: string;
  recaptchaToken: string; // โทเค็นที่ได้จาก client-side reCAPTCHA และผ่านการ verify จาก /api/verify-recaptcha แล้ว
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await dbConnect(); // เชื่อมต่อฐานข้อมูล
    console.log("🔵 [Signup API] เชื่อมต่อ MongoDB สำเร็จ"); // Log: เชื่อมต่อ MongoDB สำเร็จ

    const body = await request.json() as SignUpRequestBody;
    const { email, username, password, recaptchaToken } = body;

    // 1. ตรวจสอบฟิลด์ที่จำเป็น (email, username, password, recaptchaToken)
    // recaptchaToken ถูกส่งมาจาก AuthModal หลังจากผ่าน /api/verify-recaptcha
    if (!email || !username || !password || !recaptchaToken) {
      console.error(
        `❌ [Signup API] ข้อมูลไม่ครบถ้วน: email=${!!email}, username=${!!username}, password=${!!password}, recaptchaToken=${!!recaptchaToken}`
      ); // Log: ข้อมูลไม่ครบถ้วน
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลอีเมล, ชื่อผู้ใช้, รหัสผ่าน และ reCAPTCHA token ให้ครบถ้วน" },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบความถูกต้องของข้อมูลที่ป้อนเข้ามา
    if (!validateEmail(email)) {
      console.error(`❌ [Signup API] รูปแบบอีเมลไม่ถูกต้อง: ${email}`); // Log: รูปแบบอีเมลไม่ถูกต้อง
      return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      console.error(`❌ [Signup API] ชื่อผู้ใช้ไม่ถูกต้อง: ${username}, เหตุผล: ${usernameValidation.message}`); // Log: ชื่อผู้ใช้ไม่ถูกต้อง
      return NextResponse.json(
        { error: usernameValidation.message || "ชื่อผู้ใช้ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.error(`❌ [Signup API] รหัสผ่านไม่ถูกต้อง: ${passwordValidation.message}`); // Log: รหัสผ่านไม่ถูกต้อง
      return NextResponse.json(
        { error: passwordValidation.message || "รหัสผ่านไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // 3. ตรวจสอบผู้ใช้ซ้ำ (ทั้งใน User และ SocialMediaUser collection)
    const lowerCaseEmail = email.toLowerCase();
    const User = UserModel();
    const SocialMediaUser = SocialMediaUserModel();

    const existingUserInUsers = await User.findOne({
      $or: [{ email: lowerCaseEmail }, { username }],
    }).lean();

    const existingUserInSocialMediaUsers = await SocialMediaUser.findOne({
      $or: [{ email: lowerCaseEmail }, { username }],
    }).lean();

    if (existingUserInUsers || existingUserInSocialMediaUsers) {
      let conflictField = "ข้อมูล";
      if (existingUserInUsers?.email === lowerCaseEmail || (existingUserInSocialMediaUsers as any)?.email === lowerCaseEmail) {
        conflictField = "อีเมล";
      } else if (existingUserInUsers?.username === username || existingUserInSocialMediaUsers?.username === username) {
        conflictField = "ชื่อผู้ใช้";
      }
      console.error(`❌ [Signup API] ${conflictField} นี้ถูกใช้งานแล้ว: ${conflictField === "อีเมล" ? lowerCaseEmail : username}`); // Log: ข้อมูลซ้ำ
      return NextResponse.json(
        { error: `${conflictField} นี้ถูกใช้งานแล้ว` },
        { status: 409 } // Conflict
      );
    }

    // 4. สร้าง token สำหรับยืนยันอีเมล
    // Plain token จะถูกส่งทางอีเมล, Hashed token จะถูกเก็บในฐานข้อมูล
    const { token: verificationToken, hashedToken: hashedVerificationToken, expiry: verificationTokenExpiry } = generateVerificationToken();
    console.log(`🔑 [Signup API] สร้าง Token ยืนยันสำหรับ ${lowerCaseEmail}`); // Log: สร้าง Token

    // 5. สร้างผู้ใช้ใหม่ใน User collection
    const newUser = new User({
      email: lowerCaseEmail,
      username,
      password, // Mongoose pre-save hook จะทำการ hash รหัสผ่าน
      role: "Reader", // บทบาทเริ่มต้น
      isEmailVerified: false, // ยังไม่ได้ยืนยันอีเมล
      emailVerificationToken: hashedVerificationToken, // เก็บ Hashed Token
      emailVerificationTokenExpiry: verificationTokenExpiry,
      isActive: true, // เปิดใช้งานบัญชีทันที แต่ต้องยืนยันอีเมล
      isBanned: false,
      profile: {
        displayName: username, // ใช้ username เป็น displayName เริ่มต้น
      },
      trackingStats: { /* default values */ },
      socialStats: { /* default values */ },
      preferences: { /* default values */ },
      wallet: { coinBalance: 0 },
      gamification: { /* default values */ },
      writerVerification: { status: "none" },
      donationSettings: { isDonationEnabled: false },
      joinedAt: new Date(),
    });

    await newUser.save(); // บันทึกผู้ใช้ใหม่ (middleware จะ hash รหัสผ่าน)
    console.log(`✅ [Signup API] สร้างผู้ใช้ใหม่สำเร็จ (ยังไม่ยืนยันอีเมล): ${username} (${lowerCaseEmail})`); // Log: สร้างผู้ใช้ใหม่สำเร็จ

    // 6. ส่งอีเมลยืนยัน (ใช้ plain token)
    try {
      await sendVerificationEmail(lowerCaseEmail, verificationToken); // ส่ง Plain Token ไปในอีเมล
      console.log(`📧 [Signup API] ส่งอีเมลยืนยันไปยัง ${lowerCaseEmail} สำเร็จ`); // Log: ส่งอีเมลสำเร็จ
    } catch (emailError: unknown) {
      console.error("❌ [Signup API] ไม่สามารถส่งอีเมลยืนยันได้:", emailError); // Log: ส่งอีเมลล้มเหลว
      // การสมัครยังคงสำเร็จ แต่แจ้งผู้ใช้เรื่องปัญหาการส่งอีเมล
      return NextResponse.json(
        {
          success: true,
          message: "สมัครสมาชิกสำเร็จ แต่มีปัญหาในการส่งอีเมลยืนยัน กรุณาลองขอส่งอีเมลยืนยันใหม่อีกครั้งในภายหลัง",
        },
        { status: 201 } // Created, but with a warning
      );
    }

    // ส่งการตอบกลับเมื่อสำเร็จทุกขั้นตอน
    return NextResponse.json(
      { success: true, message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี" },
      { status: 201 } // HTTP 201 Created
    );

  } catch (error: unknown) {
    console.error("❌ [Signup API] เกิดข้อผิดพลาดที่ไม่คาดคิดใน POST handler:", error); // Log: ข้อผิดพลาดที่ไม่คาดคิด
    let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
    let status = 500;

    if (error instanceof Error) {
      // จัดการกับ MongoDB duplicate key error
      if ((error as any).code === 11000) {
        const field = Object.keys((error as any).keyValue)[0];
        const value = (error as any).keyValue[field];
        errorMessage = `${field === "email" ? "อีเมล" : "ชื่อผู้ใช้"} '${value}' นี้ถูกใช้งานแล้ว`;
        status = 409; // Conflict
      } else if (error.name === "ValidationError") {
        // จัดการกับ Mongoose validation error
        const errors = Object.values((error as any).errors).map((e: any) => e.message);
        errorMessage = `ข้อมูลไม่ถูกต้อง: ${errors.join(", ")}`;
        status = 400; // Bad Request
      } else {
        errorMessage = error.message;
      }
    } else if (typeof error === 'string') {
        errorMessage = error;
    }

    // ตรวจสอบ lỗi JSON parsing
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
        errorMessage = "ข้อมูลที่ส่งมาไม่ถูกต้อง (รูปแบบ JSON ไม่ถูกต้อง)";
        status = 400; // Bad Request
    }

    return NextResponse.json(
      { error: errorMessage, success: false },
      { status }
    );
  }
}