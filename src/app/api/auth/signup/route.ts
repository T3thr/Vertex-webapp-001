// src/app/api/auth/signup/route.ts
// API สำหรับการสมัครสมาชิกผู้ใช้ใหม่ด้วย Credentials-based authentication
// จัดการการสร้างผู้ใช้ใน User collection (ที่รวมแล้ว) พร้อมส่งอีเมลยืนยัน
// API นี้จะทำการ verify reCAPTCHA token อีกครั้งกับ Google
// อัปเดต: ปรับให้ใช้ UserModel แบบ Monolithic, ปรับปรุง default values สำหรับ IUser

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb"; // ตรวจสอบ Path ให้ถูกต้อง
import UserModel, { IUser, IAccount, IUserProfile } from "@/backend/models/User"; // Import IUser และ Sub-interfaces ที่จำเป็น
import { sendVerificationEmail } from "@/backend/services/sendemail"; // << สมมติว่า generateVerificationToken อยู่ใน User model method แล้ว
import { validateEmail, validatePassword, validateUsername } from "@/backend/utils/validation"; // ตรวจสอบ Path ให้ถูกต้อง
import { Types } from "mongoose";

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
        recaptchaToken: body.recaptchaToken ? `${body.recaptchaToken.substring(0, 15)}...` : '[ไม่มี token]'
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
      if (!recaptchaToken) missingFields.push("reCAPTCHA token");
      console.error(`❌ [Signup API] ข้อมูลไม่ครบถ้วน: ${missingFields.join(", ")}`);
      return NextResponse.json(
        { error: `กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(", ")}`, success: false },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบความถูกต้องของข้อมูล
    if (!validateEmail(email)) {
      console.error(`❌ [Signup API] รูปแบบอีเมลไม่ถูกต้อง: ${email}`);
      return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง", success: false }, { status: 400 });
    }
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      console.error(`❌ [Signup API] ชื่อผู้ใช้ไม่ถูกต้อง: ${username}, เหตุผล: ${usernameValidation.message}`);
      return NextResponse.json(
        { error: usernameValidation.message || "ชื่อผู้ใช้ไม่ถูกต้องตามนโยบาย", success: false },
        { status: 400 }
      );
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.error(`❌ [Signup API] รหัสผ่านไม่ถูกต้อง: ${passwordValidation.message}`);
      return NextResponse.json(
        { error: passwordValidation.message || "รหัสผ่านไม่ตรงตามนโยบายความปลอดภัย", success: false },
        { status: 400 }
      );
    }

    // 3. ตรวจสอบ reCAPTCHA Token
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error("❌ [Signup API] RECAPTCHA_SECRET_KEY ไม่ได้ตั้งค่า");
      return NextResponse.json(
        { error: "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง (SK missing)", success: false },
        { status: 500 }
      );
    }
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;
    console.log("🔄 [Signup API] ส่งคำขอตรวจสอบ reCAPTCHA ไปยัง Google...");
    const googleResponse = await fetch(verificationUrl, { method: "POST" });
    const googleRecaptchaData: RecaptchaResponseFromGoogle = await googleResponse.json();
    console.log(`ℹ️ [Signup API] การตอบกลับจาก Google reCAPTCHA:`, googleRecaptchaData);

    if (!googleRecaptchaData.success) {
      console.warn(`❌ [Signup API] การยืนยัน reCAPTCHA ล้มเหลว:`, googleRecaptchaData["error-codes"]);
      return NextResponse.json(
        { success: false, error: "การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่อีกครั้ง", "error-codes": googleRecaptchaData["error-codes"] || [] },
        { status: 400 }
      );
    }
    console.log(`✅ [Signup API] reCAPTCHA ผ่านการยืนยัน`);

    // 4. ตรวจสอบผู้ใช้ซ้ำใน UserModel (ที่รวมแล้ว)
    const lowerCaseEmail = email.toLowerCase();
    console.log(`🔍 [Signup API] ตรวจสอบผู้ใช้ซ้ำ: email=${lowerCaseEmail}, username=${username}`);
    const existingUser = await UserModel.findOne({
      $or: [{ email: lowerCaseEmail }, { username: username }],
    }).lean();

    if (existingUser) {
      let conflictField = "ข้อมูล";
      if (existingUser.email === lowerCaseEmail) conflictField = "อีเมล";
      else if (existingUser.username === username) conflictField = "ชื่อผู้ใช้";
      console.error(`❌ [Signup API] ${conflictField} '${conflictField === "อีเมล" ? lowerCaseEmail : username}' ถูกใช้งานแล้ว`);
      return NextResponse.json(
        { error: `${conflictField} นี้ถูกใช้งานแล้ว`, success: false },
        { status: 409 } // Conflict
      );
    }

    // 5. สร้างผู้ใช้ใหม่
    // การ hash password จะถูกจัดการโดย pre-save hook ใน UserSchema ที่คุณให้มา
    // การสร้าง emailVerificationToken และ expiry ก็จะถูกจัดการโดย method ใน UserSchema
    console.log("🔄 [Signup API] สร้าง instance ผู้ใช้ใหม่...");
    const newUser = new UserModel({
      username: username,
      email: lowerCaseEmail,
      password: password, // Password จะถูก hash โดย pre-save hook
      accounts: [{ // เพิ่มบัญชีประเภท credentials
        provider: "credentials",
        providerAccountId: new Types.ObjectId().toString(), // สร้าง ID ชั่วคราว หรือจะใช้ _id ของ user ก็ได้หลัง save
        type: "credentials",
      } as IAccount],
      roles: ["Reader"], // บทบาทเริ่มต้น
      isEmailVerified: false,
      isActive: true, // บัญชี active ทันที แต่ต้องยืนยันอีเมล
      isBanned: false,
      profile: { // Default profile values (อ้างอิงจาก IUserProfile)
        displayName: username, // เริ่มต้นให้ displayName เป็น username
        // avatarUrl, coverImageUrl, bio, gender, etc. จะเป็น undefined หรือค่า default จาก schema
      } as IUserProfile, // Cast เพื่อความชัดเจน
      writerStats: undefined, // ผู้ใช้ใหม่ยังไม่มี writerStats
      trackingStats: { // Default trackingStats (อ้างอิงจาก IUserTrackingStats)
        joinDate: new Date(),
        totalLoginDays: 0,
        totalNovelsRead: 0,
        totalEpisodesRead: 0,
        totalTimeSpentReadingSeconds: 0,
        totalCoinSpent: 0,
        totalRealMoneySpent: 0,
      },
      socialStats: { // Default socialStats (อ้างอิงจาก IUserSocialStats)
        followersCount: 0,
        followingCount: 0,
        novelsCreatedCount: 0,
        commentsMadeCount: 0,
        ratingsGivenCount: 0,
        likesGivenCount: 0,
      },
      preferences: { // Default preferences (อ้างอิงจาก IUserPreferences และ Sub-interfaces)
        language: "th",
        display: {
          theme: "system",
          reading: { fontSize: "medium", readingModeLayout: "scrolling", lineHeight: 1.6, textAlignment: "left" },
          accessibility: { dyslexiaFriendlyFont: false, highContrastMode: false },
        },
        notifications: {
          masterNotificationsEnabled: true,
          email: { enabled: true, newsletter: true, novelUpdatesFromFollowing:true, newFollowers:true, commentsOnMyNovels:true, repliesToMyComments:true, donationAlerts:true, systemAnnouncements:true, securityAlerts:true, promotionalOffers:false, achievementUnlocks:true },
          push: { enabled: true, novelUpdatesFromFollowing:true, newFollowers:true, commentsOnMyNovels:true, repliesToMyComments:true, donationAlerts:true, systemAnnouncements:true, securityAlerts:true, promotionalOffers:false, achievementUnlocks:true },
          inApp: { enabled: true, novelUpdatesFromFollowing:true, newFollowers:true, commentsOnMyNovels:true, repliesToMyComments:true, donationAlerts:true, systemAnnouncements:true, securityAlerts:true, promotionalOffers:false, achievementUnlocks:true },
        },
        contentAndPrivacy: {
          showMatureContent: false,
          preferredGenres: [],
          profileVisibility: "public",
          readingHistoryVisibility: "followers_only",
          showActivityStatus: true,
          allowDirectMessagesFrom: "followers",
          analyticsConsent: { allowPsychologicalAnalysis: false, allowPersonalizedFeedback: false },
        },
        visualNovelGameplay: { // Default Visual Novel Gameplay Preferences
            textSpeed: "normal", autoPlayMode: "click", autoPlayDelayMs:1500, skipUnreadText: false,
            transitionsEnabled: true, screenEffectsEnabled: true, textWindowOpacity: 0.8,
            masterVolume: 1.0, bgmVolume: 0.7, sfxVolume: 0.8, voiceVolume: 1.0,
            voicesEnabled: true, preferredVoiceLanguage: "original", showChoiceTimer: true,
            blurThumbnailsOfMatureContent: true, preferredArtStyles: [], preferredGameplayMechanics: [],
            assetPreloading: "essential", characterAnimationLevel: "full"
        },
      },
      wallet: { // Default wallet (อ้างอิงจาก IUserWallet)
        coinBalance: 0,
      },
      gamification: { // Default gamification (อ้างอิงจาก IUserGamification)
        level: 1,
        currentLevelObject: null, // จะถูก set โดย pre-save hook ถ้า Level 1 มีใน DB
        experiencePoints: 0,
        totalExperiencePointsEverEarned: 0,
        nextLevelXPThreshold: 100, // ค่าเริ่มต้น, pre-save hook อาจอัปเดตจาก Level model
        achievements: [],
        showcasedItems: [],
        loginStreaks: { currentStreakDays: 0, longestStreakDays: 0 }, // ยังไม่ login
        dailyCheckIn: { currentStreakDays: 0 },
        lastActivityAt: new Date(),
      },
      verification: { kycStatus: "none" }, // Default verification
      donationSettings: { isEligibleForDonation: false }, // Default donation settings
      securitySettings: { // Default security settings
        twoFactorAuthentication: { isEnabled: false },
        loginAttempts: { count: 0 },
        activeSessions: [],
      },
      // mentalWellbeingInsights จะเป็น undefined หรือ default จาก schema
    });

    // 5.1 สร้าง Token ยืนยันอีเมลผ่าน method ของ user instance
    const verificationTokenPlain = newUser.generateEmailVerificationToken(); // Method นี้จะ set hashed token และ expiry ใน newUser ด้วย

    // 6. บันทึกผู้ใช้ใหม่ (ซึ่งจะ trigger pre-save hook สำหรับ hashing password และ gamification level)
    await newUser.save();
    console.log(`✅ [Signup API] สร้างผู้ใช้ใหม่สำเร็จ (ID: ${newUser._id}), username: ${newUser.username}, email: ${newUser.email}`);

    // 7. ส่งอีเมลยืนยัน
    try {
      await sendVerificationEmail(newUser.email as string, verificationTokenPlain); // ส่ง plain token ไปในอีเมล
      console.log(`✅ [Signup API] ส่งอีเมลยืนยันไปยัง ${newUser.email} สำเร็จ`);
    } catch (emailError: any) {
      console.error("❌ [Signup API] ไม่สามารถส่งอีเมลยืนยันได้:", emailError.message);
      // ผู้ใช้ถูกสร้างแล้ว แต่ส่งอีเมลไม่ได้
      return NextResponse.json(
        {
          success: true,
          message: "สมัครสมาชิกสำเร็จ แต่การส่งอีเมลยืนยันมีปัญหา กรุณาลองขอส่งอีเมลยืนยันใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ",
          userId: newUser._id.toString(),
        },
        { status: 201 } // Created, but with a warning for the client
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี",
        userId: newUser._id.toString(),
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("❌ [Signup API] เกิดข้อผิดพลาดที่ไม่คาดคิด:", error.message || error);
    let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
    let status = 500;

    if (error.code === 11000) { // MongoDB duplicate key
      const field = Object.keys(error.keyValue)[0];
      errorMessage = `${field === "email" ? "อีเมล" : (field === "username" ? "ชื่อผู้ใช้" : `ข้อมูล '${field}'`)} นี้ถูกใช้งานแล้ว`;
      status = 409; // Conflict
    } else if (error.name === "ValidationError") { // Mongoose validation error
      const errors = Object.values(error.errors).map((e: any) => e.message);
      errorMessage = `ข้อมูลไม่ถูกต้อง: ${errors.join(", ")}`;
      status = 400; // Bad Request
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage, success: false }, { status });
  }
}