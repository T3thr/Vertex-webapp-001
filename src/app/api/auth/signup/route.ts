// src/app/api/auth/signup/route.ts
// API สำหรับการสมัครสมาชิกผู้ใช้ใหม่ด้วย Credentials-based authentication
// จัดการการสร้างผู้ใช้ใน User collection พร้อมส่งอีเมลยืนยัน
// reCAPTCHA token จะถูกตรวจสอบจาก client-side ก่อนที่จะเรียก API นี้

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
    const body = await request.json() as SignUpRequestBody;
    const { email, username, password, recaptchaToken } = body;

    // 1. ตรวจสอบฟิลด์ที่จำเป็น (email, username, password)
    // recaptchaToken ควรจะถูกตรวจสอบแล้วโดย client ก่อนเรียก API นี้
    // แต่ยังคงรับค่ามาเพื่อความยืดหยุ่น หรือถ้าต้องการบันทึก/ตรวจสอบเพิ่มเติม
    if (!email || !username || !password) {
      console.error(
        `❌ [Signup API] ข้อมูลไม่ครบถ้วน: email=${!!email}, username=${!!username}, password=${!!password}, recaptchaToken=${!!recaptchaToken}`
      );
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลอีเมล, ชื่อผู้ใช้, และรหัสผ่านให้ครบถ้วน" }, // แจ้งเฉพาะข้อมูลที่จำเป็นจริงๆ
        { status: 400 }
      );
    }

    // เพิ่มการตรวจสอบ recaptchaToken อีกครั้ง (เผื่อกรณี client ส่งมาโดยไม่ได้ verify)
    // ในโฟลว์ที่ถูกต้อง token นี้ควรจะถูก verify แล้วโดย /api/verify-recaptcha
    if (!recaptchaToken || typeof recaptchaToken !== 'string' || recaptchaToken.trim() === '') {
        console.warn("⚠️ [Signup API] คำขอ Signup ได้รับโดยไม่มี reCAPTCHA token หรือ token ไม่ถูกต้อง แม้ว่าควรจะถูกตรวจสอบแล้ว");
        // อาจจะตัดสินใจ block หรือดำเนินการต่อโดยมีความเสี่ยง
        // ในที่นี้เราจะ return error เพื่อความปลอดภัย
        return NextResponse.json(
            { error: "การตรวจสอบ reCAPTCHA ไม่สำเร็จ กรุณาลองอีกครั้ง" },
            { status: 400 }
        );
    }

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

    // 3. ตรวจสอบผู้ใช้ซ้ำ (ทั้งใน User และ SocialMediaUser collection)
    const lowerCaseEmail = email.toLowerCase();
    const User = UserModel();
    const SocialMediaUser = SocialMediaUserModel();

    const existingUserInUsers = await User.findOne({
      $or: [{ email: lowerCaseEmail }, { username }],
    }).lean();

    const existingUserInSocialMediaUsers = await SocialMediaUser.findOne({
      $or: [{ email: lowerCaseEmail }, { username }], // ตรวจสอบ email และ username ใน SocialMediaUser ด้วย
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
        { error: `${conflictField} นี้ถูกใช้งานแล้ว` },
        { status: 409 } // Conflict
      );
    }

    // 4. สร้าง token สำหรับยืนยันอีเมล
    const { token: verificationToken, hashedToken: hashedVerificationToken, expiry: verificationTokenExpiry } = generateVerificationToken();

    // 5. สร้างผู้ใช้ใหม่ใน User collection
    const newUser = new User({
      email: lowerCaseEmail,
      username,
      password, // Mongoose pre-save hook จะทำการ hash รหัสผ่าน
      role: "Reader",
      isEmailVerified: false,
      emailVerificationToken: hashedVerificationToken, // เก็บ hashed token ใน DB
      emailVerificationTokenExpiry: verificationTokenExpiry,
      isActive: true, // เปิดใช้งานบัญชีทันที แต่ต้องยืนยันอีเมล
      isBanned: false,
      profile: {
        displayName: username,
      },
      // เพิ่ม default values สำหรับ sub-documents และ fields อื่นๆ ตาม IUser interface
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
        notifications: { /* default values */ email: true, push: true, novelUpdates: true, comments: true, donations: true, newFollowers: true, systemAnnouncements: true },
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

    await newUser.save(); // บันทึกผู้ใช้ใหม่ (middleware จะ hash รหัสผ่าน)
    console.log(`✅ [Signup API] สร้างผู้ใช้ใหม่ (ยังไม่ยืนยันอีเมล): ${username} (${lowerCaseEmail})`);

    // 6. ส่งอีเมลยืนยัน (ใช้ plain token)
    try {
      await sendVerificationEmail(lowerCaseEmail, verificationToken); // ส่ง plain token ในอีเมล
      console.log(`✅ [Signup API] ส่งอีเมลยืนยันไปยัง ${lowerCaseEmail} สำเร็จ`);
    } catch (emailError: unknown) {
      console.error("❌ [Signup API] ไม่สามารถส่งอีเมลยืนยันได้:", emailError);
      // การสมัครยังคงสำเร็จ แต่แจ้งผู้ใช้เรื่องปัญหาการส่งอีเมล
      return NextResponse.json(
        {
          success: true, // การสร้างบัญชีสำเร็จ
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