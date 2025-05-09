// src/app/api/auth/signup/route.ts
// API สำหรับการสมัครสมาชิกผู้ใช้ใหม่ด้วย Credentials-based authentication
// จัดการการสร้างผู้ใช้ใน User collection พร้อมส่งอีเมลยืนยัน

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

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await dbConnect();
    const body = await request.json() as SignUpRequestBody;
    const { email, username, password, recaptchaToken } = body;

    // 1. Validate required fields
    if (!email || !username || !password || !recaptchaToken) {
      console.error(
        `❌ Missing fields: email=${!!email}, username=${!!username}, password=${!!password}, recaptchaToken=${!!recaptchaToken}`
      );
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน (อีเมล, ชื่อผู้ใช้, รหัสผ่าน, reCAPTCHA)" },
        { status: 400 }
      );
    }

    // 2. Validate reCAPTCHA token format
    if (!recaptchaToken || typeof recaptchaToken !== "string" || recaptchaToken.trim() === "") {
      console.error("❌ Invalid reCAPTCHA token");
      return NextResponse.json(
        { error: "กรุณายืนยัน reCAPTCHA" },
        { status: 400 }
      );
    }

    // 3. Validate input data
    if (!validateEmail(email)) {
      console.error(`❌ Invalid email format: ${email}`);
      return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      console.error(`❌ Invalid username: ${username}, reason: ${usernameValidation.message}`);
      return NextResponse.json(
        { error: usernameValidation.message || "ชื่อผู้ใช้ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.error(`❌ Invalid password: ${passwordValidation.message}`);
      return NextResponse.json(
        { error: passwordValidation.message || "รหัสผ่านไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // 4. Verify reCAPTCHA
    const recaptchaResponse = await fetch("http://localhost:3000/api/auth/verify-recaptcha", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: recaptchaToken }),
    });

    if (!recaptchaResponse.ok) {
      const errorData = await recaptchaResponse.json();
      console.error(
        `❌ reCAPTCHA verification failed: status=${recaptchaResponse.status}, error=${JSON.stringify(errorData)}`
      );
      return NextResponse.json(
        { error: errorData.error || "การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่" },
        { status: 400 }
      );
    }

    const recaptchaData = await recaptchaResponse.json();
    if (!recaptchaData.success) {
      console.error(`❌ reCAPTCHA verification failed: ${JSON.stringify(recaptchaData)}`);
      return NextResponse.json(
        { error: recaptchaData.error || "การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่" },
        { status: 400 }
      );
    }

    const lowerCaseEmail = email.toLowerCase();

    // 5. Check for duplicate users
    const existingUser = await Promise.all([
      UserModel().findOne({
        $or: [{ email: lowerCaseEmail }, { username }],
      }).lean(),
      SocialMediaUserModel().findOne({ username }).lean(),
    ]).then(([user, socialUser]) => user || socialUser);

    if (existingUser) {
      const conflictField = existingUser.email === lowerCaseEmail ? "อีเมล" : "ชื่อผู้ใช้";
      console.error(`❌ ${conflictField} already in use: ${existingUser.email === lowerCaseEmail ? lowerCaseEmail : username}`);
      return NextResponse.json(
        { error: `${conflictField} นี้ถูกใช้งานแล้ว` },
        { status: 409 }
      );
    }

    // 6. Generate verification token
    const { token, expiry } = generateVerificationToken();

    // 7. Create new user
    const newUser = new (UserModel())({
      email: lowerCaseEmail,
      username,
      password,
      role: "Reader",
      isEmailVerified: false,
      emailVerificationToken: token,
      emailVerificationTokenExpiry: expiry,
      isActive: true,
      isBanned: false,
      lastLoginAt: new Date(),
      joinedAt: new Date(),
      isDeleted: false,
      accounts: [
        {
          provider: "credentials",
          providerAccountId: lowerCaseEmail,
          type: "credentials",
        },
      ],
      profile: {
        displayName: username,
        avatar: "",
        bio: "",
        coverImage: "",
        preferredGenres: [],
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
        notifications: {
          email: true,
          push: true,
          novelUpdates: true,
          comments: true,
          donations: true,
          newFollowers: true,
          systemAnnouncements: false,
        },
        contentFilters: {
          showMatureContent: false,
          blockedGenres: [],
          blockedTags: [],
        },
        privacy: {
          showActivityStatus: true,
          profileVisibility: "public",
          readingHistoryVisibility: "followersOnly",
        },
      },
      wallet: {
        coinBalance: 0,
      },
      gamification: {
        level: 1,
        experiencePoints: 0,
        achievements: [],
        badges: [],
        streaks: {
          currentLoginStreak: 0,
          longestLoginStreak: 0,
          lastLoginDate: new Date(),
        },
      },
      writerVerification: {
        status: "none",
      },
      donationSettings: {
        isDonationEnabled: false,
      },
    });

    await newUser.save();
    console.log(`✅ [Signup] Created new user (unverified): ${username} (${lowerCaseEmail})`);

    // 8. Send verification email
    try {
      await sendVerificationEmail(lowerCaseEmail, token);
    } catch (emailError: unknown) {
      console.error("❌ [Signup] Failed to send verification email:", emailError);
      return NextResponse.json(
        {
          success: true,
          message: "สมัครสมาชิกสำเร็จ แต่ไม่สามารถส่งอีเมลยืนยันได้ กรุณาขอส่งอีเมลยืนยันใหม่",
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { success: true, message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี" },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("❌ [Signup] Unexpected error:", error);
    let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
    let status = 500;

    if (error instanceof Error && (error as any).code === 11000) {
      const field = Object.keys((error as any).keyValue)[0];
      const value = (error as any).keyValue[field];
      errorMessage = `${field === "email" ? "อีเมล" : "ชื่อผู้ใช้"} '${value}' นี้ถูกใช้งานแล้ว`;
      status = 409;
    } else if (error instanceof Error && error.name === "ValidationError") {
      const errors = Object.values((error as any).errors).map((e: any) => e.message);
      errorMessage = errors.join(", ");
      status = 400;
    } else if (error instanceof SyntaxError) {
      errorMessage = "ข้อมูลที่ส่งมาไม่ถูกต้อง (รูปแบบ JSON ไม่ถูกต้อง)";
      status = 400;
    }

    return NextResponse.json(
      { error: errorMessage, success: false },
      { status }
    );
  }
}