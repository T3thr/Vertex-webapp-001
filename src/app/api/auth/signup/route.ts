// src/app/api/auth/signup/route.ts
// API สำหรับการสมัครสมาชิกผู้ใช้ใหม่ด้วย Credentials-based authentication
// จัดการการสร้างผู้ใช้ใน User collection พร้อมส่งอีเมลยืนยัน และตรวจสอบ reCAPTCHA โดยตรงกับ Google

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User"; // ตรวจสอบให้แน่ใจว่า path ถูกต้อง
import SocialMediaUserModel from "@/backend/models/SocialMediaUser"; // ตรวจสอบให้แน่ใจว่า path ถูกต้อง
import { sendVerificationEmail, generateVerificationToken } from "@/backend/services/sendemail"; // ตรวจสอบให้แน่ใจว่า path ถูกต้อง
import { validateEmail, validatePassword, validateUsername } from "@/backend/utils/validation"; // ตรวจสอบให้แน่ใจว่า path ถูกต้อง

interface SignUpRequestBody {
  email: string;
  username: string;
  password: string;
  recaptchaToken: string; // โทเค็นที่ได้จาก client-side reCAPTCHA
}

interface RecaptchaVerificationResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await dbConnect(); // เชื่อมต่อฐานข้อมูล
    const body = await request.json() as SignUpRequestBody;
    const { email, username, password, recaptchaToken } = body;

    // 1. ตรวจสอบฟิลด์ที่จำเป็น
    if (!email || !username || !password || !recaptchaToken) {
      console.error(
        `❌ [Signup API] ข้อมูลไม่ครบถ้วน: email=${!!email}, username=${!!username}, password=${!!password}, recaptchaToken=${!!recaptchaToken}`
      );
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน (อีเมล, ชื่อผู้ใช้, รหัสผ่าน, reCAPTCHA)" },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบรูปแบบ reCAPTCHA token
    if (typeof recaptchaToken !== "string" || recaptchaToken.trim() === "") {
      console.error("❌ [Signup API] reCAPTCHA token ไม่ถูกต้อง");
      return NextResponse.json(
        { error: "กรุณายืนยัน reCAPTCHA" },
        { status: 400 }
      );
    }

    // 3. ตรวจสอบความถูกต้องของข้อมูลที่ป้อนเข้ามา
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

    // 4. ตรวจสอบ reCAPTCHA token กับ Google โดยตรง
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error("❌ [Signup API] RECAPTCHA_SECRET_KEY ไม่ได้ตั้งค่าใน environment variables");
      return NextResponse.json(
        { error: "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง" },
        { status: 500 }
      );
    }

    const verificationUrl = "https://www.google.com/recaptcha/api/siteverify";
    const params = new URLSearchParams({
      secret: secretKey,
      response: recaptchaToken,
      // remoteip: request.headers.get('x-forwarded-for') || request.ip // (Optional) User's IP
    });

    console.log("🔄 [Signup API] กำลังส่งคำขอตรวจสอบ reCAPTCHA ไปยัง Google...");
    const googleRecaptchaResponse = await fetch(verificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const googleRecaptchaData: RecaptchaVerificationResponse = await googleRecaptchaResponse.json();

    if (!googleRecaptchaData.success) {
      console.error(
        `❌ [Signup API] การยืนยัน reCAPTCHA โดย Google ล้มเหลว: ${JSON.stringify(googleRecaptchaData)}`
      );
      return NextResponse.json(
        { error: `การยืนยัน reCAPTCHA ล้มเหลว: ${googleRecaptchaData["error-codes"]?.join(", ") || "ไม่ทราบสาเหตุ"}` },
        { status: 400 }
      );
    }
    console.log("✅ [Signup API] การยืนยัน reCAPTCHA โดย Google สำเร็จ");

    // 5. ตรวจสอบผู้ใช้ซ้ำ
    const lowerCaseEmail = email.toLowerCase();
    const User = UserModel(); // เรียก instance ของ Model
    const SocialMediaUser = SocialMediaUserModel(); // เรียก instance ของ Model

    const existingUserInUsers = await User.findOne({
      $or: [{ email: lowerCaseEmail }, { username }],
    }).lean();

    const existingUserInSocialMediaUsers = await SocialMediaUser.findOne({
      username,
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

    // 6. สร้าง token สำหรับยืนยันอีเมล
    const { token: verificationToken, expiry: verificationTokenExpiry } = generateVerificationToken();

    // 7. สร้างผู้ใช้ใหม่
    const newUser = new User({
      email: lowerCaseEmail,
      username,
      password, // Mongoose pre-save hook จะทำการ hash รหัสผ่าน
      role: "Reader", // บทบาทเริ่มต้น
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpiry: verificationTokenExpiry,
      isActive: true,
      isBanned: false,
      lastLoginAt: new Date(),
      joinedAt: new Date(),
      isDeleted: false,
      accounts: [ // เพิ่ม account สำหรับ credentials provider
        {
          provider: "credentials",
          providerAccountId: lowerCaseEmail, // หรือ username ตามความเหมาะสม
          type: "credentials",
        },
      ],
      profile: {
        displayName: username, // ชื่อที่แสดงเริ่มต้น
        avatar: "", // URL รูปโปรไฟล์เริ่มต้น
        bio: "", // คำอธิบายตัวเองเริ่มต้น
        coverImage: "", // รูปปกโปรไฟล์เริ่มต้น
        preferredGenres: [], // หมวดหมู่นิยายที่ชอบเริ่มต้น
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
        language: "th", // ภาษาเริ่มต้น
        theme: "system", // ธีมเริ่มต้น
        notifications: {
          email: true,
          push: true,
          novelUpdates: true,
          comments: true,
          donations: true,
          newFollowers: true,
          systemAnnouncements: false, // หรือ true ตามต้องการ
        },
        contentFilters: {
          showMatureContent: false, // แสดงเนื้อหาสำหรับผู้ใหญ่เริ่มต้น
          blockedGenres: [],
          blockedTags: [],
        },
        privacy: {
          showActivityStatus: true, // แสดงสถานะกิจกรรมเริ่มต้น
          profileVisibility: "public", // การมองเห็นโปรไฟล์เริ่มต้น
          readingHistoryVisibility: "followersOnly", // การมองเห็นประวัติการอ่านเริ่มต้น
        },
      },
      wallet: {
        coinBalance: 0, // ยอดเหรียญเริ่มต้น
      },
      gamification: {
        level: 1, // ระดับเริ่มต้น
        experiencePoints: 0, // คะแนนประสบการณ์เริ่มต้น
        achievements: [],
        badges: [],
        streaks: {
          currentLoginStreak: 0,
          longestLoginStreak: 0,
          lastLoginDate: new Date(),
        },
        // dailyCheckIn สามารถเพิ่มได้หากต้องการ
      },
      writerVerification: { // ข้อมูลการยืนยันนักเขียนเริ่มต้น
        status: "none",
      },
      donationSettings: { // การตั้งค่าการบริจาคเริ่มต้น
        isDonationEnabled: false,
      },
    });

    await newUser.save(); // บันทึกผู้ใช้ใหม่ (middleware จะ hash รหัสผ่าน)
    console.log(`✅ [Signup API] สร้างผู้ใช้ใหม่ (ยังไม่ยืนยันอีเมล): ${username} (${lowerCaseEmail})`);

    // 8. ส่งอีเมลยืนยัน
    try {
      await sendVerificationEmail(lowerCaseEmail, verificationToken);
      console.log(`✅ [Signup API] ส่งอีเมลยืนยันไปยัง ${lowerCaseEmail} สำเร็จ`);
    } catch (emailError: unknown) {
      console.error("❌ [Signup API] ไม่สามารถส่งอีเมลยืนยันได้:", emailError);
      // แม้ว่าอีเมลจะส่งไม่สำเร็จ แต่การสมัครสมาชิกถือว่าสำเร็จแล้ว
      // ผู้ใช้สามารถขอส่งอีเมลยืนยันใหม่ได้ในภายหลัง
      return NextResponse.json(
        {
          success: true,
          message: "สมัครสมาชิกสำเร็จ แต่ไม่สามารถส่งอีเมลยืนยันได้ กรุณาติดต่อผู้ดูแลหรือลองขอส่งอีเมลยืนยันใหม่ในภายหลัง",
        },
        { status: 201 } // Created
      );
    }

    return NextResponse.json(
      { success: true, message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี" },
      { status: 201 } // Created
    );

  } catch (error: unknown) {
    console.error("❌ [Signup API] เกิดข้อผิดพลาดที่ไม่คาดคิด:", error);
    let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
    let status = 500; // Internal Server Error

    if (error instanceof Error) {
      if ((error as any).code === 11000) { // Duplicate key error
        const field = Object.keys((error as any).keyValue)[0];
        const value = (error as any).keyValue[field];
        errorMessage = `${field === "email" ? "อีเมล" : "ชื่อผู้ใช้"} '${value}' นี้ถูกใช้งานแล้ว`;
        status = 409; // Conflict
      } else if (error.name === "ValidationError") { // Mongoose validation error
        const errors = Object.values((error as any).errors).map((e: any) => e.message);
        errorMessage = `ข้อมูลไม่ถูกต้อง: ${errors.join(", ")}`;
        status = 400; // Bad Request
      } else {
        errorMessage = error.message; // General error message
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