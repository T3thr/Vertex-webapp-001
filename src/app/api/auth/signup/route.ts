// src/app/api/auth/signup/route.ts
// API สำหรับการสมัครสมาชิกผู้ใช้ใหม่ด้วย Credentials-based authentication
// จัดการการสร้างผู้ใช้ใน User collection พร้อมส่งอีเมลยืนยัน
// API นี้จะทำการ verify reCAPTCHA token อีกครั้งกับ Google
// อัปเดต: เพิ่ม console log สำหรับ debug และปรับปรุงการ parse JSON

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";
import { sendVerificationEmail, generateVerificationToken } from "@/backend/services/sendemail";
import { validateEmail, validatePassword, validateUsername } from "@/backend/utils/validation";

interface SignUpRequestBody {
  email: string;
  username: string;
  password: string;
  recaptchaToken: string;
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
    await dbConnect();
    console.log("✅ [Signup API] เชื่อมต่อ MongoDB สำเร็จ");

    let body: SignUpRequestBody;
    try {
      body = await request.json();
      console.log(`ℹ️ [Signup API] Body ที่ได้รับ:`, {
        email: body.email,
        username: body.username,
        password: body.password ? '[มีรหัสผ่าน]' : '[ไม่มีรหัสผ่าน]',
        recaptchaToken: body.recaptchaToken ? `${body.recaptchaToken.substring(0, 15)}...` : 'ไม่มี token'
      });
    } catch (jsonError: any) {
      console.error("❌ [Signup API] JSON parse error:", jsonError.message);
      return NextResponse.json(
        { error: `รูปแบบ JSON ไม่ถูกต้อง: ${jsonError.message}`, success: false },
        { status: 400 }
      );
    }

    const { email, username, password, recaptchaToken } = body;

    // ตรวจสอบฟิลด์ที่จำเป็น
    if (!email || !username || !password || !recaptchaToken) {
      const missingFields = [];
      if (!email) missingFields.push("อีเมล");
      if (!username) missingFields.push("ชื่อผู้ใช้");
      if (!password) missingFields.push("รหัสผ่าน");
      if (!recaptchaToken) missingFields.push("reCAPTCHA token");
      console.error(`❌ [Signup API] ข้อมูลไม่ครบถ้วน: ${missingFields.join(", ")}`);
      return NextResponse.json(
        { error: `กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(", ")}`, success: false },
        { status: 400 }
      );
    }

    // ตรวจสอบความถูกต้องของข้อมูล
    if (!validateEmail(email)) {
      console.error(`❌ [Signup API] รูปแบบอีเมลไม่ถูกต้อง: ${email}`);
      return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง", success: false }, { status: 400 });
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      console.error(`❌ [Signup API] ชื่อผู้ใช้ไม่ถูกต้อง: ${username}, เหตุผล: ${usernameValidation.message}`);
      return NextResponse.json(
        { error: usernameValidation.message || "ชื่อผู้ใช้ไม่ถูกต้อง", success: false },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.error(`❌ [Signup API] รหัสผ่านไม่ถูกต้อง: ${passwordValidation.message}`);
      return NextResponse.json(
        { error: passwordValidation.message || "รหัสผ่านไม่ถูกต้อง", success: false },
        { status: 400 }
      );
    }

    // ตรวจสอบ reCAPTCHA
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    console.log(`ℹ️ [Signup API] RECAPTCHA_SECRET_KEY: ${secretKey ? 'มี' : 'ไม่มี'}`);
    if (!secretKey) {
      console.error("❌ [Signup API] RECAPTCHA_SECRET_KEY ไม่ได้ตั้งค่า");
      return NextResponse.json(
        { error: "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง (SK)", success: false },
        { status: 500 }
      );
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;
    console.log("🔄 [Signup API] ส่งคำขอตรวจสอบ reCAPTCHA ไปยัง Google...");
    const googleResponse = await fetch(verificationUrl, { method: "POST" });
    const googleRecaptchaData: RecaptchaResponseFromGoogle = await googleResponse.json();

    if (!googleRecaptchaData.success) {
      console.warn(`❌ [Signup API] การยืนยัน reCAPTCHA ล้มเหลว:`, {
        success: googleRecaptchaData.success,
        errorCodes: googleRecaptchaData["error-codes"]?.join(", ") || "ไม่ระบุ"
      });
      let userFriendlyError = "การยืนยัน reCAPTCHA ล้มเหลว";
      if (googleRecaptchaData["error-codes"]?.includes("timeout-or-duplicate")) {
        userFriendlyError = "การยืนยัน reCAPTCHA หมดเวลาหรือซ้ำซ้อน กรุณาลองใหม่";
      } else if (googleRecaptchaData["error-codes"]?.includes("invalid-input-response")) {
        userFriendlyError = "โทเค็น reCAPTCHA ไม่ถูกต้อง";
      }
      return NextResponse.json(
        { success: false, error: userFriendlyError, "error-codes": googleRecaptchaData["error-codes"] || [] },
        { status: 400 }
      );
    }
    console.log(`✅ [Signup API] reCAPTCHA ผ่านการยืนยัน, Hostname: ${googleRecaptchaData.hostname}`);

    // ตรวจสอบผู้ใช้ซ้ำ
    const lowerCaseEmail = email.toLowerCase();
    const User = UserModel();
    const SocialMediaUser = SocialMediaUserModel();

    console.log(`🔍 [Signup API] ตรวจสอบผู้ใช้ซ้ำ: email=${lowerCaseEmail}, username=${username}`);
    const existingUserInUsers = await User.findOne({
      $or: [{ email: lowerCaseEmail }, { username }],
    }).lean();

    const existingUserInSocialMediaUsers = await SocialMediaUser.findOne({
      $or: [{ email: lowerCaseEmail }, { username }],
    }).lean();

    if (existingUserInUsers || existingUserInSocialMediaUsers) {
      let conflictField = "ข้อมูล";
      if (existingUserInUsers?.email === lowerCaseEmail || existingUserInSocialMediaUsers?.email === lowerCaseEmail) {
        conflictField = "อีเมล";
      } else if (existingUserInUsers?.username === username || existingUserInSocialMediaUsers?.username === username) {
        conflictField = "ชื่อผู้ใช้";
      }
      console.error(`❌ [Signup API] ${conflictField} ถูกใช้งานแล้ว: ${conflictField === "อีเมล" ? lowerCaseEmail : username}`);
      return NextResponse.json(
        { error: `${conflictField} นี้ถูกใช้งานแล้ว`, success: false },
        { status: 409 }
      );
    }

    // สร้าง token สำหรับยืนยันอีเมล
    console.log("🔄 [Signup API] สร้าง token สำหรับยืนยันอีเมล...");
    const { token: verificationToken, hashedToken: hashedVerificationToken, expiry: verificationTokenExpiry } = generateVerificationToken();

    // สร้างผู้ใช้ใหม่
    console.log("🔄 [Signup API] สร้างผู้ใช้ใหม่ใน User collection...");
    const newUser = new User({
      email: lowerCaseEmail,
      username,
      password,
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

    // 7. ส่งอีเมลยืนยัน
    try {
      await sendVerificationEmail(lowerCaseEmail, verificationToken);
      console.log(`✅ [Signup API] ส่งอีเมลยืนยันไปยัง ${lowerCaseEmail} สำเร็จ`);
    } catch (emailError: unknown) {
      console.error("❌ [Signup API] ไม่สามารถส่งอีเมลยืนยันได้:", emailError);
      return NextResponse.json(
        {
          success: true,
          message: "สมัครสมาชิกสำเร็จ แต่มีปัญหาในการส่งอีเมลยืนยัน กรุณาลองขอส่งอีเมลยืนยันใหม่อีกครั้งในภายหลัง",
        },
        { status: 201 }
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
      if ((error as any).code === 11000) {
        const field = Object.keys((error as any).keyValue)[0];
        const value = (error as any).keyValue[field];
        errorMessage = `${field === "email" ? "อีเมล" : "ชื่อผู้ใช้"} '${value}' นี้ถูกใช้งานแล้ว`;
        status = 409;
      } else if (error.name === "ValidationError") {
        const errors = Object.values((error as any).errors).map((e: any) => e.message);
        errorMessage = `ข้อมูลไม่ถูกต้อง: ${errors.join(", ")}`;
        status = 400;
      } else {
        errorMessage = error.message;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      errorMessage = "ข้อมูลที่ส่งมาไม่ถูกต้อง (รูปแบบ JSON ไม่ถูกต้อง)";
      status = 400;
    }

    return NextResponse.json(
      { error: errorMessage, success: false },
      { status }
    );
  }
}