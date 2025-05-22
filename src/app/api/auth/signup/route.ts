// src/app/api/auth/signup/route.ts
// API สำหรับการสมัครสมาชิกผู้ใช้ใหม่ด้วย Credentials-based authentication
// จัดการการสร้างผู้ใช้ใน User collection (ที่รวมแล้ว) พร้อมส่งอีเมลยืนยัน
// API นี้จะทำการ verify reCAPTCHA token อีกครั้งกับ Google
// อัปเดต: ปรับให้ใช้ UserModel แบบ Monolithic, ปรับปรุง default values สำหรับ IUser

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, {
    IUser,
    IAccount,
    IUserProfile,
    IUserTrackingStats,
    IUserSocialStats,
    IUserPreferences,
    IUserWallet,
    IUserGamification,
    IUserVerification,
    IUserDonationSettings,
    IUserSecuritySettings,
    IMentalWellbeingInsights,
    INotificationChannelSettings,
    IUserDisplayPreferences,
    IUserContentPrivacyPreferences,
    IVisualNovelGameplayPreferences,
    IUserAnalyticsConsent,
    IUserReadingDisplayPreferences,
    IUserAccessibilityDisplayPreferences,
    IShowcasedGamificationItem,
    IUserDisplayBadge
} from "@/backend/models/User";
import { sendVerificationEmail } from "@/backend/services/sendemail";
import { validateEmail, validatePassword, validateUsername } from "@/backend/utils/validation";
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

// Helper function เพื่อสร้าง default notification settings (เหมือนใน oauth/route.ts)
function createDefaultNotificationChannelSettings(): INotificationChannelSettings {
    return {
        enabled: true,
        newsletter: true,
        novelUpdatesFromFollowing: true,
        newFollowers: true,
        commentsOnMyNovels: true,
        repliesToMyComments: true,
        donationAlerts: true,
        systemAnnouncements: true,
        securityAlerts: true,
        promotionalOffers: false,
        achievementUnlocks: true,
    };
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
        { status: 409 }
      );
    }

    console.log("🔄 [Signup API] สร้าง instance ผู้ใช้ใหม่...");

    // Default values from User.ts will be applied by Mongoose for fields not explicitly set here
    // or for nested fields within objects if not fully specified.
    const defaultReadingPrefs: IUserReadingDisplayPreferences = {
        fontSize: "medium", readingModeLayout: "scrolling", fontFamily: "Sarabun", lineHeight: 1.6, textAlignment: "left",
    };
    const defaultAccessibilityPrefs: IUserAccessibilityDisplayPreferences = {
        dyslexiaFriendlyFont: false, highContrastMode: false,
    };
    const defaultDisplayPrefs: IUserDisplayPreferences = {
        theme: "system", reading: defaultReadingPrefs, accessibility: defaultAccessibilityPrefs,
    };
    const defaultAnalyticsConsent: IUserAnalyticsConsent = {
        allowPsychologicalAnalysis: false, allowPersonalizedFeedback: false, // lastConsentReviewDate will be set by schema if needed
    };
    const defaultContentPrivacyPrefs: IUserContentPrivacyPreferences = {
        showMatureContent: false, preferredGenres: [], profileVisibility: "public",
        readingHistoryVisibility: "followers_only", showActivityStatus: true,
        allowDirectMessagesFrom: "followers", analyticsConsent: defaultAnalyticsConsent,
        // blocked fields will be default empty arrays by Mongoose
    };
    const defaultVisualNovelGameplayPrefs: IVisualNovelGameplayPreferences = {
        textSpeed: "normal", autoPlayMode: "click", autoPlayDelayMs:1500, skipUnreadText: false,
        transitionsEnabled: true, screenEffectsEnabled: true, textWindowOpacity: 0.8,
        masterVolume: 1.0, bgmVolume: 0.7, sfxVolume: 0.8, voiceVolume: 1.0,
        voicesEnabled: true, preferredVoiceLanguage: "original", showChoiceTimer: true,
        blurThumbnailsOfMatureContent: true, preferredArtStyles: [], preferredGameplayMechanics: [],
        assetPreloading: "essential", characterAnimationLevel: "full"
    };

    const newUser = new UserModel({
      username: username,
      email: lowerCaseEmail,
      password: password,
      accounts: [{
        provider: "credentials",
        providerAccountId: new Types.ObjectId().toString(), // This will be unique for this credential account
        type: "credentials",
      } as IAccount],
      roles: ["Reader"],
      isEmailVerified: false,
      isActive: true,
      isBanned: false,
      profile: {
        displayName: username,
      } as IUserProfile,
      trackingStats: { // สอดคล้องกับ IUserTrackingStats และ schema defaults
        joinDate: new Date(),
        totalLoginDays: 0, //ยังไม่ได้ login จริงจัง
        totalNovelsRead: 0,
        totalEpisodesRead: 0,
        totalTimeSpentReadingSeconds: 0,
        totalCoinSpent: 0,
        totalRealMoneySpent: 0,
        // firstLoginAt will be set on first actual login
      } as IUserTrackingStats,
      socialStats: { // สอดคล้องกับ IUserSocialStats และ schema defaults
        followersCount: 0,
        followingCount: 0,
        novelsCreatedCount: 0,
        commentsMadeCount: 0,
        ratingsGivenCount: 0,
        likesGivenCount: 0,
      } as IUserSocialStats,
      preferences: { // สอดคล้องกับ IUserPreferences และ schema defaults
        language: "th",
        display: defaultDisplayPrefs,
        notifications: {
            masterNotificationsEnabled: true,
            email: createDefaultNotificationChannelSettings(),
            push: createDefaultNotificationChannelSettings(),
            inApp: createDefaultNotificationChannelSettings(),
        },
        contentAndPrivacy: defaultContentPrivacyPrefs,
        visualNovelGameplay: defaultVisualNovelGameplayPrefs,
      } as IUserPreferences,
      wallet: { // สอดคล้องกับ IUserWallet และ schema defaults
        coinBalance: 0,
      } as IUserWallet,
      gamification: { // สอดคล้องกับ IUserGamification และ schema defaults
        level: 1,
        currentLevelObject: null, // pre-save hook will attempt to set this
        experiencePoints: 0,
        totalExperiencePointsEverEarned: 0,
        nextLevelXPThreshold: 100, // pre-save hook might update this from Level model
        achievements: [],
        showcasedItems: [] as IShowcasedGamificationItem[],
        primaryDisplayBadge: undefined as IUserDisplayBadge | undefined,
        secondaryDisplayBadges: [] as IUserDisplayBadge[],
        loginStreaks: { currentStreakDays: 0, longestStreakDays: 0 }, // No login yet
        dailyCheckIn: { currentStreakDays: 0 },
        lastActivityAt: new Date(), // Activity is signup itself
      } as IUserGamification,
      // writerStats, verification, donationSettings, securitySettings, mentalWellbeingInsights
      // will use Mongoose schema defaults (typically undefined or basic structures)
      // or can be explicitly set to their minimal default if needed:
      verification: { kycStatus: "none" } as IUserVerification,
      donationSettings: { isEligibleForDonation: false } as IUserDonationSettings,
      securitySettings: {
          twoFactorAuthentication: { isEnabled: false },
          loginAttempts: { count: 0 },
          activeSessions: [],
      } as IUserSecuritySettings,
    });

    const verificationTokenPlain = newUser.generateEmailVerificationToken();

    await newUser.save();
    console.log(`✅ [Signup API] สร้างผู้ใช้ใหม่สำเร็จ (ID: ${newUser._id}), username: ${newUser.username}, email: ${newUser.email}`);

    // อัปเดต providerAccountId ของ credentials account ด้วย ID ผู้ใช้จริง (เป็นทางเลือก)
    const credAccount = newUser.accounts.find(acc => acc.provider === "credentials");
    if (credAccount) {
        credAccount.providerAccountId = newUser._id.toString();
        await newUser.save(); // บันทึกการเปลี่ยนแปลงเล็กน้อยนี้
        console.log(`ℹ️ [Signup API] อัปเดต providerAccountId สำหรับ credentials account ของ ${newUser.username}`);
    }


    try {
      await sendVerificationEmail(newUser.email as string, verificationTokenPlain);
      console.log(`✅ [Signup API] ส่งอีเมลยืนยันไปยัง ${newUser.email} สำเร็จ`);
    } catch (emailError: any) {
      console.error("❌ [Signup API] ไม่สามารถส่งอีเมลยืนยันได้:", emailError.message);
      return NextResponse.json(
        {
          success: true, // ผู้ใช้ถูกสร้างแล้ว
          message: "สมัครสมาชิกสำเร็จ แต่การส่งอีเมลยืนยันมีปัญหา กรุณาลองขอส่งอีเมลยืนยันใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ",
          userId: newUser._id.toString(),
        },
        { status: 201 }
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
    console.error("❌ [Signup API] เกิดข้อผิดพลาดที่ไม่คาดคิด:", error.message || error, error.stack);
    let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
    let status = 500;

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      errorMessage = `${field === "email" ? "อีเมล" : (field === "username" ? "ชื่อผู้ใช้" : `ข้อมูล '${field}'`)} นี้ถูกใช้งานแล้ว`;
      status = 409;
    } else if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e: any) => e.message);
      errorMessage = `ข้อมูลไม่ถูกต้อง: ${errors.join(", ")}`;
      status = 400;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage, success: false }, { status });
  }
}