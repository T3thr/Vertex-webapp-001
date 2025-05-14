// src/app/api/auth/signup/route.ts
// API สำหรับการสมัครสมาชิกผู้ใช้ใหม่ด้วย Credentials-based authentication
// จัดการการสร้างผู้ใช้ใน User collection พร้อมส่งอีเมลยืนยัน
// API นี้จะทำการ verify reCAPTCHA token อีกครั้งกับ Google (ตอนนี้เป็นจุดเดียวที่ตรวจสอบ)
// อัปเดต: เพิ่ม console log สำหรับ debug และปรับปรุงการ parse JSON

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUserhaha"; // สมมติว่ามี model นี้
import { sendVerificationEmail, generateVerificationToken } from "@/backend/services/sendemail"; // สมมติว่ามี services เหล่านี้
import { validateEmail, validatePassword, validateUsername } from "@/backend/utils/validation"; // สมมติว่ามี utils เหล่านี้

interface SignUpRequestBody {
  email: string;
  username: string;
  password: string;
  recaptchaToken: string; // Token ที่ได้รับจาก client-side reCAPTCHA
}

// Interface สำหรับการตอบกลับจาก Google reCAPTCHA API
interface RecaptchaResponseFromGoogle {
  success: boolean;
  challenge_ts?: string; // Timestamp ของ challenge load (ISO format yyyy-MM-dd'T'HH:mm:ssZZ)
  hostname?: string;     // Hostname ของเว็บไซต์ที่ reCAPTCHA ถูกใช้งาน
  "error-codes"?: string[]; // Optional array ของ error codes
  // score?: number;      // สำหรับ reCAPTCHA v3
  // action?: string;     // สำหรับ reCAPTCHA v3
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

    // 1. ตรวจสอบฟิลด์ที่จำเป็น
    if (!email || !username || !password || !recaptchaToken) {
      const missingFields = [];
      if (!email) missingFields.push("อีเมล");
      if (!username) missingFields.push("ชื่อผู้ใช้");
      if (!password) missingFields.push("รหัสผ่าน");
      if (!recaptchaToken) missingFields.push("reCAPTCHA token"); // สำคัญมาก
      console.error(`❌ [Signup API] ข้อมูลไม่ครบถ้วน: ${missingFields.join(", ")}`);
      return NextResponse.json(
        { error: `กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(", ")}`, success: false },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบความถูกต้องของข้อมูล (email, username, password)
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

    // 3. ตรวจสอบ reCAPTCHA Token กับ Google (นี่คือจุดตรวจสอบเพียงจุดเดียว)
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    console.log(`ℹ️ [Signup API] RECAPTCHA_SECRET_KEY: ${secretKey ? 'มี' : 'ไม่มี'}`);
    if (!secretKey) {
      console.error("❌ [Signup API] RECAPTCHA_SECRET_KEY ไม่ได้ตั้งค่าใน Environment Variables");
      return NextResponse.json(
        { error: "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง (SK missing)", success: false },
        { status: 500 } // Server configuration error
      );
    }

    const verificationUrl = "https://www.google.com/recaptcha/api/siteverify";
    const params = new URLSearchParams({
        secret: secretKey,
        response: recaptchaToken,
        // สามารถเพิ่ม IP ของผู้ใช้ (ถ้ามีและต้องการ) ด้วย request.headers.get('x-forwarded-for') หรือเทียบเท่า
        // remoteip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || ''
    });

    console.log("🔄 [Signup API] ส่งคำขอตรวจสอบ reCAPTCHA ไปยัง Google...");
    const googleResponse = await fetch(verificationUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });

    const googleRecaptchaData: RecaptchaResponseFromGoogle = await googleResponse.json();
    console.log(`ℹ️ [Signup API] การตอบกลับจาก Google reCAPTCHA:`, googleRecaptchaData);

    if (!googleRecaptchaData.success) {
      console.warn(`❌ [Signup API] การยืนยัน reCAPTCHA ล้มเหลวจาก Google:`, {
        success: googleRecaptchaData.success,
        errorCodes: googleRecaptchaData["error-codes"]?.join(", ") || "ไม่ระบุ",
        hostname: googleRecaptchaData.hostname,
      });
      let userFriendlyError = "การยืนยัน reCAPTCHA ล้มเหลว";
      if (googleRecaptchaData["error-codes"]?.includes("timeout-or-duplicate")) {
        userFriendlyError = "การยืนยัน reCAPTCHA หมดเวลาหรือซ้ำซ้อน กรุณาลองใหม่";
      } else if (googleRecaptchaData["error-codes"]?.includes("invalid-input-response")) {
        userFriendlyError = "โทเค็น reCAPTCHA ไม่ถูกต้อง";
      } else if (googleRecaptchaData["error-codes"]?.includes("bad-request")) {
        userFriendlyError = "คำขอ reCAPTCHA ไม่ถูกต้อง";
      } // สามารถเพิ่ม error codes อื่นๆ ได้ตามเอกสารของ Google

      return NextResponse.json(
        { success: false, error: userFriendlyError, "error-codes": googleRecaptchaData["error-codes"] || [] },
        { status: 400 } // Bad Request เนื่องจาก reCAPTCHA ไม่ผ่าน
      );
    }
    console.log(`✅ [Signup API] reCAPTCHA ผ่านการยืนยัน, Hostname: ${googleRecaptchaData.hostname}, Timestamp: ${googleRecaptchaData.challenge_ts}`);

    // 4. ตรวจสอบผู้ใช้ซ้ำในฐานข้อมูล
    const lowerCaseEmail = email.toLowerCase();
    const User = UserModel(); // สร้าง instance ของ User model
    const SocialMediaUser = SocialMediaUserModel(); // สร้าง instance ของ SocialMediaUser model

    console.log(`🔍 [Signup API] ตรวจสอบผู้ใช้ซ้ำ: email=${lowerCaseEmail}, username=${username}`);
    const existingUserInUsers = await User.findOne({
      $or: [{ email: lowerCaseEmail }, { username: username }], // ควรใช้ username แบบ case-insensitive ด้วยถ้าต้องการ
    }).lean(); // .lean() เพื่อ performance ที่ดีขึ้นถ้าไม่ต้องใช้ Mongoose document methods

    const existingUserInSocialMediaUsers = await SocialMediaUser.findOne({
      $or: [{ email: lowerCaseEmail }, { username: username }],
    }).lean();

    if (existingUserInUsers || existingUserInSocialMediaUsers) {
      let conflictField = "ข้อมูล";
      if ((existingUserInUsers?.email === lowerCaseEmail) || (existingUserInSocialMediaUsers?.email === lowerCaseEmail)) {
        conflictField = "อีเมล";
      } else if ((existingUserInUsers?.username === username) || (existingUserInSocialMediaUsers?.username === username)) {
        // หาก username ใน DB เก็บแบบ case-sensitive, การเปรียบเทียบนี้ถูกต้อง
        // หากต้องการ case-insensitive, query ด้านบนควรใช้ $regex หรือ collation
        conflictField = "ชื่อผู้ใช้";
      }
      console.error(`❌ [Signup API] ${conflictField} '${conflictField === "อีเมล" ? lowerCaseEmail : username}' ถูกใช้งานแล้ว`);
      return NextResponse.json(
        { error: `${conflictField} นี้ถูกใช้งานแล้ว`, success: false },
        { status: 409 } // Conflict
      );
    }

    // 5. สร้าง token สำหรับยืนยันอีเมล
    console.log("🔄 [Signup API] สร้าง token สำหรับยืนยันอีเมล...");
    const { token: verificationToken, hashedToken: hashedVerificationToken, expiry: verificationTokenExpiry } = generateVerificationToken();

    // 6. สร้างผู้ใช้ใหม่ (ยังไม่ได้ hash password, ควร hash ก่อนบันทึก)
    console.log("🔄 [Signup API] สร้างผู้ใช้ใหม่ใน User collection...");
    // หมายเหตุ: การ hash password ควรทำใน model pre-save hook หรือก่อนสร้าง instance
    // ตัวอย่างนี้สมมติว่า model จัดการ hash password เอง หรือมีการ hash ก่อนหนนี้
    const newUser = new User({
      email: lowerCaseEmail,
      username,
      password, // << สำคัญ: Password ควรถูก HASH ก่อนบันทึกลง DB !!!
      role: "Reader", // หรือค่า default อื่นๆ
      isEmailVerified: false,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationTokenExpiry: verificationTokenExpiry,
      isActive: true, // บัญชี active แต่ยังไม่ verify email
      isBanned: false,
      profile: {
        displayName: username,
        // photoURL: '', // default or leave empty
        // bio: '',
      },
      trackingStats: {
        totalLoginDays: 0,
        totalNovelsRead: 0,
        totalEpisodesRead: 0,
        totalCoinSpent: 0,
        totalRealMoneySpent: 0,
        joinDate: new Date(),
        // lastLoginDate: null,
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
        language: "th", // default
        theme: "system", // default
        notifications: { email: true, push: true, novelUpdates: true, comments: true, donations: true, newFollowers: true, systemAnnouncements: true },
        contentFilters: { showMatureContent: false, blockedGenres: [], blockedTags: [] },
        privacy: { showActivityStatus: true, profileVisibility: "public", readingHistoryVisibility: "followersOnly" },
      },
      wallet: {
        coinBalance: 0,
        // transactionHistory: [],
      },
      gamification: {
        level: 1,
        experiencePoints: 0,
        achievements: [],
        badges: [],
        streaks: { currentLoginStreak: 0, longestLoginStreak: 0 },
        dailyCheckIn: { currentStreak: 0 /* lastCheckInDate: null */ }
      },
      // writerDetails: { isVerifiedWriter: false, penName: '', status: 'none' },
      writerVerification: { status: "none" }, // 'none', 'pending', 'approved', 'rejected'
      donationSettings: { isDonationEnabled: false /* paypalAddress: '' */ },
      joinedAt: new Date(),
      // ... other fields from your schema
    });

    await newUser.save();
    console.log(`✅ [Signup API] สร้างผู้ใช้ใหม่ (ยังไม่ยืนยันอีเมล): ${username} (${lowerCaseEmail})`);

    // 7. ส่งอีเมลยืนยัน
    try {
      await sendVerificationEmail(lowerCaseEmail, verificationToken);
      console.log(`✅ [Signup API] ส่งอีเมลยืนยันไปยัง ${lowerCaseEmail} สำเร็จ`);
    } catch (emailError: unknown) {
      console.error("❌ [Signup API] ไม่สามารถส่งอีเมลยืนยันได้:", emailError);
      // ผู้ใช้ถูกสร้างแล้ว แต่ส่งอีเมลไม่ได้ ควรแจ้งผู้ใช้และอาจมีกลไกให้ขอส่งใหม่
      return NextResponse.json(
        {
          success: true, // การสมัครสมาชิกสำเร็จ แต่การส่งอีเมลมีปัญหา
          message: "สมัครสมาชิกสำเร็จ แต่มีปัญหาในการส่งอีเมลยืนยัน กรุณาลองขอส่งอีเมลยืนยันใหม่อีกครั้งในภายหลัง หรือติดต่อผู้ดูแล",
          userId: newUser._id // อาจส่ง user id กลับไปเผื่อ client ต้องการ
        },
        { status: 201 } // Created, but with a warning
      );
    }

    return NextResponse.json(
      { success: true, message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี", userId: newUser._id },
      { status: 201 } // Created
    );

  } catch (error: unknown) {
    console.error("❌ [Signup API] เกิดข้อผิดพลาดที่ไม่คาดคิด:", error);
    let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
    let status = 500;

    if (error instanceof Error) {
      // @ts-expect-error MongoDB duplicate key error
      if (error.code === 11000) {
        // @ts-expect-error Accessing keyValue
        const field = Object.keys(error.keyValue)[0];
        // @ts-expect-error Accessing keyValue[field]
        const value = error.keyValue[field];
        errorMessage = `${field === "email" ? "อีเมล" : (field === "username" ? "ชื่อผู้ใช้" : `ข้อมูล '${field}'`)} '${value}' นี้ถูกใช้งานแล้ว`;
        status = 409; // Conflict

      } else if (error.name === "ValidationError") {
        // @ts-expect-error Accessing errors
        const errors = Object.values(error.errors).map((e: any) => e.message);
        errorMessage = `ข้อมูลไม่ถูกต้อง: ${errors.join(", ")}`;
        status = 400; // Bad Request
      } else {
        errorMessage = error.message;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    // ตรวจสอบ SyntaxError สำหรับ JSON parsing โดยเฉพาะ (ถึงแม้จะมีการดักจับก่อนหน้า)
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