// src/app/api/auth/signup/route.ts
// API สำหรับการสมัครสมาชิกผู้ใช้ใหม่ด้วย Credentials-based authentication
// จัดการการสร้างผู้ใช้ใน User collection พร้อมส่งอีเมลยืนยัน
// API นี้จะทำการ verify reCAPTCHA token ที่ได้รับจาก client อีกครั้งกับ Google

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
  recaptchaToken: string; // โทเค็นที่ได้จาก client-side reCAPTCHA
}

interface RecaptchaResponseFromGoogle {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export async function POST(request: Request): Promise<NextResponse> {
  console.log("🔵 [Signup API] ได้รับคำขอสมัครสมาชิก...");
  try {
    await dbConnect(); // เชื่อมต่อฐานข้อมูล
    const body = await request.json() as SignUpRequestBody;
    const { email, username, password, recaptchaToken } = body;

    // 1. ตรวจสอบฟิลด์ที่จำเป็น
    if (!email || !username || !password || !recaptchaToken) {
      const missingFields = [];
      if (!email) missingFields.push("อีเมล");
      if (!username) missingFields.push("ชื่อผู้ใช้");
      if (!password) missingFields.push("รหัสผ่าน");
      if (!recaptchaToken) missingFields.push("reCAPTCHA token");
      console.error(`❌ [Signup API] ข้อมูลไม่ครบถ้วน: ${missingFields.join(", ")}`);
      return NextResponse.json(
        { error: `กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }
    console.log(`ℹ️ [Signup API] ข้อมูลที่ได้รับ: email=${email}, username=${username}, recaptchaToken=${recaptchaToken ? 'มี' : 'ไม่มี'}`);


    // 2. ตรวจสอบความถูกต้องของข้อมูลที่ป้อนเข้ามา
    if (!validateEmail(email)) {
      console.error(`❌ [Signup API] รูปแบบอีเมลไม่ถูกต้อง: ${email}`);
      return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      console.error(`❌ [Signup API] ชื่อผู้ใช้ไม่ถูกต้อง: ${username}, เหตุผล: ${usernameValidation.message}`);
      return NextResponse.json(
        { error: usernameValidation.message || "ชื่อผู้ใช้ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.error(`❌ [Signup API] รหัสผ่านไม่ถูกต้อง: ${passwordValidation.message}`);
      return NextResponse.json(
        { error: passwordValidation.message || "รหัสผ่านไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // 3. ตรวจสอบ reCAPTCHA token กับ Google (server-side verification)
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error("❌ [Signup API] RECAPTCHA_SECRET_KEY ไม่ได้ถูกตั้งค่าใน environment variables!");
      return NextResponse.json(
        { error: "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง (SK)", success: false },
        { status: 500 }
      );
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;
    console.log("🔄 [Signup API] กำลังส่งคำขอตรวจสอบ reCAPTCHA token ไปยัง Google (server-side)...");
    const googleResponse = await fetch(verificationUrl, { method: "POST" });
    const googleRecaptchaData: RecaptchaResponseFromGoogle = await googleResponse.json();

    if (!googleRecaptchaData.success) {
      console.warn(
        `❌ [Signup API] การยืนยัน reCAPTCHA โดย Google ล้มเหลว (server-side): Success=${googleRecaptchaData.success}, Error Codes=${googleRecaptchaData["error-codes"]?.join(", ") || "ไม่ระบุ"}`
      );
      let userFriendlyError = "การยืนยัน reCAPTCHA โดย Google ล้มเหลว";
      if (googleRecaptchaData["error-codes"]?.includes("timeout-or-duplicate")) {
          userFriendlyError = "การยืนยัน reCAPTCHA หมดเวลาหรือซ้ำซ้อน กรุณาลองใหม่";
      } else if (googleRecaptchaData["error-codes"]?.includes("invalid-input-response")) {
          userFriendlyError = "โทเค็น reCAPTCHA ไม่ถูกต้องหรือไม่สมบูรณ์";
      }
      return NextResponse.json(
        { success: false, error: userFriendlyError, "error-codes": googleRecaptchaData["error-codes"] || [] },
        { status: 400 }
      );
    }
    console.log(`✅ [Signup API] การยืนยัน reCAPTCHA token (server-side) สำเร็จโดย Google Hostname: ${googleRecaptchaData.hostname}`);

    // 4. ตรวจสอบผู้ใช้ซ้ำ (ทั้งใน User และ SocialMediaUser collection)
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
      console.error(`❌ [Signup API] ${conflictField} นี้ถูกใช้งานแล้ว: ${conflictField === "อีเมล" ? lowerCaseEmail : username}`);
      return NextResponse.json(
        { error: `${conflictField} นี้ถูกใช้งานแล้ว`, success: false },
        { status: 409 } // Conflict
      );
    }

    // 5. สร้าง token สำหรับยืนยันอีเมล
    const { token: verificationToken, hashedToken: hashedVerificationToken, expiry: verificationTokenExpiry } = generateVerificationToken();

    // 6. สร้างผู้ใช้ใหม่ใน User collection
    const newUser = new User({
      email: lowerCaseEmail,
      username,
      password, // Mongoose pre-save hook จะทำการ hash รหัสผ่าน
      role: "Reader",
      isEmailVerified: false,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationTokenExpiry: verificationTokenExpiry,
      isActive: true,
      isBanned: false,
      profile: {
        displayName: username,
      },
      trackingStats: {
        totalLoginDays: 0,
        totalNovelsRead: 0,
        totalEpisodesRead: 0,
        totalCoinSpent: 0,
        totalRealMoneySpent: 0,
        joinDate: new Date(),
      },
      socialStats: {
        followersCount: 0,
        followingCount: 0,
        novelsCreatedCount: 0,
        commentsMadeCount: 0,
        ratingsGivenCount: 0,
        likesGivenCount: 0,
      },
      preferences: {
        language: "th",
        theme: "system",
        notifications: { email: true, push: true, novelUpdates: true, comments: true, donations: true, newFollowers: true, systemAnnouncements: true },
        contentFilters: { showMatureContent: false, blockedGenres: [], blockedTags: [] },
        privacy: { showActivityStatus: true, profileVisibility: "public", readingHistoryVisibility: "followersOnly" },
      },
      wallet: {
        coinBalance: 0,
      },
      gamification: {
        level: 1,
        experiencePoints: 0,
        achievements: [],
        badges: [],
        streaks: { currentLoginStreak: 0, longestLoginStreak: 0 },
        dailyCheckIn: { currentStreak: 0}
      },
      writerVerification: { status: "none" },
      donationSettings: { isDonationEnabled: false },
      joinedAt: new Date(),
    });

    await newUser.save();
    console.log(`✅ [Signup API] สร้างผู้ใช้ใหม่ (ยังไม่ยืนยันอีเมล): ${username} (${lowerCaseEmail})`);

    // 7. ส่งอีเมลยืนยัน (ใช้ plain token)
    try {
      await sendVerificationEmail(lowerCaseEmail, verificationToken);
      console.log(`✅ [Signup API] ส่งอีเมลยืนยันไปยัง ${lowerCaseEmail} สำเร็จ`);
    } catch (emailError: unknown) {
      console.error("❌ [Signup API] ไม่สามารถส่งอีเมลยืนยันได้:", emailError);
      return NextResponse.json(
        {
          success: true, // การสร้างบัญชีสำเร็จ
          message: "สมัครสมาชิกสำเร็จ แต่มีปัญหาในการส่งอีเมลยืนยัน กรุณาลองขอส่งอีเมลยืนยันใหม่อีกครั้งในภายหลัง",
        },
        { status: 201 } // Created, but with a notice
      );
    }

    return NextResponse.json(
      { success: true, message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี" },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error("❌ [Signup API] เกิดข้อผิดพลาดที่ไม่คาดคิด:", error);
    let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
    let status = 500;

    if (error instanceof Error) {
      if ((error as any).code === 11000) { // Duplicate key error
        const field = Object.keys((error as any).keyValue)[0];
        const value = (error as any).keyValue[field];
        errorMessage = `${field === "email" ? "อีเมล" : "ชื่อผู้ใช้"} '${value}' นี้ถูกใช้งานแล้ว`;
        status = 409; // Conflict
      } else if (error.name === "ValidationError") {
        const errors = Object.values((error as any).errors).map((e: any) => e.message);
        errorMessage = `ข้อมูลไม่ถูกต้อง: ${errors.join(", ")}`;
        status = 400; // Bad Request
      } else {
        errorMessage = error.message;
      }
    } else if (typeof error === 'string') {
        errorMessage = error;
    }

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