/**
 * @file src/app/api/auth/signup/route.ts
 * @description API endpoint for new user registration using credentials-based authentication.
 *              Handles the creation of documents across multiple collections within a transaction
 *              to ensure data integrity for the new modular architecture. Also triggers
 *              the sending of a verification email.
 * @version 2.0.0
 * @date 2024-07-28
 *
 * @history
 * - 2.0.0 (2024-07-28): Refactored to work with modular User models.
 *   - Introduced MongoDB transaction to ensure atomic creation of documents across
 *     `users`, `user_profiles`, `user_settings`, `user_security`, `user_gamification`,
 *     `user_tracking`, and `user_gamification_data` collections.
 *   - Updated imports to use new individual models instead of the monolithic User model.
 * - 1.0.0: Initial implementation with monolithic User model.
 */

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import { sendVerificationEmail } from "@/backend/services/sendemail";
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/backend/utils/validation";

// SECTION: Import New Modular Models
// Import a user model that has been broken down into sub-models for improved scalability and maintainability.
import UserModel, { IAccount } from "@/backend/models/User";
import UserProfileModel, {
  IUserProfile,
  IUserSocialStats,
} from "@/backend/models/UserProfile";
import UserSettingsModel, {
  IUserSettings,
  IUserPreferencesNotifications,
  INotificationChannelSettings,
  IUserDisplayPreferences,
  IUserReadingDisplayPreferences,
  IUserAccessibilityDisplayPreferences,
  IUserContentPrivacyPreferences,
  IUserAnalyticsConsent,
  IVisualNovelGameplayPreferences,
} from "@/backend/models/UserSettings";
import UserSecurityModel, {
  IUserSecurity,
  IUserVerification,
} from "@/backend/models/UserSecurity";
import UserGamificationModel, {
  IUserGamification,
  IUserWallet,
  IUserGamificationDoc,
} from "@/backend/models/UserGamification";
import UserTrackingModel, {
  IUserTracking,
  IUserTrackingStats,
} from "@/backend/models/UserTracking";
import UserAchievementModel from "@/backend/models/UserAchievement";
import UserLibraryItemModel from "@/backend/models/UserLibraryItem";

// SECTION: Type Definitions for Request and Response

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

// SECTION: Default Data Helper Functions
// Functions to create default sub-documents, ensuring consistency for new users.

/**
 * สร้างการตั้งค่าการแจ้งเตือนเริ่มต้นสำหรับช่องทางต่างๆ
 * @returns {INotificationChannelSettings} Object การตั้งค่าเริ่มต้น
 */
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

// SECTION: API Handler (POST)

export async function POST(request: Request): Promise<NextResponse> {
  console.log("🔵 [Signup API v2] ได้รับคำขอสมัครสมาชิก...");

  const session = await mongoose.startSession();
  console.log("ℹ️ [Signup API v2] เริ่มต้น MongoDB Session");

  try {
    await dbConnect();
    console.log("✅ [Signup API v2] เชื่อมต่อ MongoDB สำเร็จ");

    let body: SignUpRequestBody;
    try {
      body = await request.json();
    } catch (jsonError: any) {
      console.error("❌ [Signup API v2] JSON parse error:", jsonError.message);
      return NextResponse.json(
        { error: `รูปแบบ JSON ไม่ถูกต้อง: ${jsonError.message}`, success: false },
        { status: 400 }
      );
    }

    const { email, username, password, recaptchaToken } = body;

    // --- Input Validation ---
    if (!email || !username || !password || !recaptchaToken) {
      const missingFields = ["email", "username", "password", "recaptchaToken"].filter(field => !body[field as keyof SignUpRequestBody]);
      console.error(`❌ [Signup API v2] ข้อมูลไม่ครบถ้วน: ${missingFields.join(", ")}`);
      return NextResponse.json(
        { error: `กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(", ")}`, success: false },
        { status: 400 }
      );
    }

    // --- Business Logic Validation ---
    if (!validateEmail(email)) return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง", success: false }, { status: 400 });
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) return NextResponse.json({ error: usernameValidation.message || "ชื่อผู้ใช้ไม่ถูกต้อง", success: false }, { status: 400 });
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) return NextResponse.json({ error: passwordValidation.message || "รหัสผ่านไม่ปลอดภัย", success: false }, { status: 400 });

    // --- reCAPTCHA Verification ---
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
        console.error("❌ [Signup API v2] RECAPTCHA_SECRET_KEY ไม่ได้ตั้งค่า");
        return NextResponse.json({ error: "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง", success: false }, { status: 500 });
    }
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;
    const googleResponse = await fetch(verificationUrl, { method: "POST" });
    const googleRecaptchaData: RecaptchaResponseFromGoogle = await googleResponse.json();
    if (!googleRecaptchaData.success) {
        console.warn(`❌ [Signup API v2] การยืนยัน reCAPTCHA ล้มเหลว:`, googleRecaptchaData["error-codes"]);
        return NextResponse.json({ success: false, error: "การยืนยัน reCAPTCHA ล้มเหลว", "error-codes": googleRecaptchaData["error-codes"] || [] }, { status: 400 });
    }
    console.log(`✅ [Signup API v2] reCAPTCHA ผ่านการยืนยัน`);

    // --- Check for existing user ---
    const lowerCaseEmail = email.toLowerCase();
    const existingUser = await UserModel.findOne({ $or: [{ email: lowerCaseEmail }, { username: username }] }).lean();
    if (existingUser) {
        const conflictField = existingUser.email === lowerCaseEmail ? "อีเมล" : "ชื่อผู้ใช้";
        console.error(`❌ [Signup API v2] ${conflictField} นี้ถูกใช้งานแล้ว`);
        return NextResponse.json({ error: `${conflictField} นี้ถูกใช้งานแล้ว`, success: false }, { status: 409 });
    }

    // --- Transactional User Creation ---
    console.log("🔄 [Signup API v2] เริ่ม Transaction สำหรับการสร้างผู้ใช้ใหม่...");
    let newUserId: mongoose.Types.ObjectId | undefined;
    let userEmailForToken: string | undefined;
    let verificationTokenPlain: string | undefined;

    await session.withTransaction(async () => {
        // Step 1: สร้างเอกสาร User หลัก (Identity)
        const newUser = new UserModel({
            username,
            email: lowerCaseEmail,
            password,
            accounts: [{
                provider: "credentials",
                providerAccountId: new mongoose.Types.ObjectId().toString(), // Placeholder, will be updated
                type: "credentials",
            } as IAccount],
            roles: ["Reader"],
        });

        const verificationToken = newUser.generateEmailVerificationToken(); // Generate token before save
        await newUser.save({ session });
        console.log(`✅ [Tx] สร้างเอกสาร User หลักสำเร็จ (ID: ${newUser._id})`);

        // Update providerAccountId with the actual userId for consistency
        const credAccount = newUser.accounts.find(acc => acc.provider === "credentials");
        if (credAccount) {
            credAccount.providerAccountId = newUser._id.toString();
            await newUser.save({ session }); // Small update within the same transaction
        }

        const userId = newUser._id;
        newUserId = userId;
        userEmailForToken = newUser.email;
        verificationTokenPlain = verificationToken;

        // Step 2: สร้างเอกสารอื่นๆ ที่เกี่ยวข้องทั้งหมด
        const now = new Date();

        // 2a. UserProfile
        const profilePromise = UserProfileModel.create([{
            userId,
            displayName: username,
            socialStats: {
                followersCount: 0,
                followingUsersCount: 0,
                followingNovelsCount: 0,
                novelsCreatedCount: 0,
                boardPostsCreatedCount: 0,
                commentsMadeCount: 0,
                ratingsGivenCount: 0,
                likesGivenCount: 0,
            } as IUserSocialStats,
            joinDate: now,
        } as Partial<IUserProfile>], { session });

        // 2b. UserSettings
        const settingsPromise = UserSettingsModel.create([{
            userId,
            language: "th",
            display: {
                theme: "system",
                reading: { fontSize: 16, readingModeLayout: "scrolling", fontFamily: "Sarabun", lineHeight: 1.6, textAlignment: "left", textContrastMode: false },
                accessibility: { dyslexiaFriendlyFont: false, highContrastMode: false, epilepsySafeMode: false, reducedMotion: false },
                uiVisibility: { theme: 'system_default', textBoxOpacity: 100, backgroundBrightness: 100, textBoxBorder: true, isDialogueBoxVisible: true },
                visualEffects: { sceneTransitionAnimations: true, actionSceneEffects: true, particleEffects: true },
                characterDisplay: { showCharacters: true, characterMovementAnimations: true, hideCharactersDuringText: false },
                characterVoiceDisplay: { voiceIndicatorIcon: true },
                backgroundDisplay: { backgroundQuality: 'mid', showCGs: true, backgroundEffects: true },
                voiceSubtitles: { enabled: true },
            },
            notifications: {
                masterNotificationsEnabled: true,
                email: createDefaultNotificationChannelSettings(),
                push: createDefaultNotificationChannelSettings(),
                inApp: createDefaultNotificationChannelSettings(),
                saveLoad: { autoSaveNotification: true, noSaveSpaceWarning: true },
                newContent: { contentUpdates: true, promotionEvent: true },
                outOfGame: { type: 'all' },
                optional: { statChange: true, statDetailLevel: 'summary' },
            },
            contentAndPrivacy: {
                showMatureContent: false,
                preferredGenres: [],
                blockedGenres: [],
                blockedTags: [],
                blockedAuthors: [],
                blockedNovels: [],
                profileVisibility: "public",
                readingHistoryVisibility: "followers_only",
                showActivityStatus: true,
                allowDirectMessagesFrom: "followers",
                analyticsConsent: { allowPsychologicalAnalysis: false, allowPersonalizedFeedback: false },
            },
            visualNovelGameplay: {
                textSpeedValue: 50,
                instantTextDisplay: false,
                autoPlayMode: "click",
                autoPlayDelayMs: 2000,
                autoPlaySpeedValue: 50,
                autoPlayEnabled: false,
                skipUnreadText: false,
                skipReadTextOnly: true,
                skipAllText: false,
                skipOnHold: true,
                transitionsEnabled: true,
                screenEffectsEnabled: true,
                textWindowOpacity: 80,
                masterVolume: 100,
                bgmVolume: 80,
                sfxVolume: 90,
                voiceVolume: 100,
                voicesEnabled: true,
                preferredVoiceLanguage: "default",
                showChoiceTimer: true,
                blurThumbnailsOfMatureContent: true,
                preferredArtStyles: [],
                preferredGameplayMechanics: [],
                assetPreloading: "essential",
                characterAnimationLevel: "full",
                backlog: { enableHistory: true, historyVoice: false, historyBack: true },
                choices: { highlightChoices: true, routePreview: false },
                saveLoad: { autoSave: true, saveFrequency: 'scene' },
                decisions: { decisionWarning: true, importantMark: true },
                routeManagement: { routeProgress: true, showUnvisited: true, secretHints: false },
             },
        } as Partial<IUserSettings>], { session });
        
        // 2c. UserSecurity
        const securityPromise = UserSecurityModel.create([{
            userId,
            verification: { kycStatus: "none" },
        } as Partial<IUserSecurity>], { session });

        // 2d. UserGamification
        const gamificationPromise = UserGamificationModel.create([{
            userId,
            wallet: { coinBalance: 0 },
            gamification: {
                level: 1,
                experiencePoints: 0,
                totalExperiencePointsEverEarned: 0,
                nextLevelXPThreshold: 100, // This could be dynamically set from Level 1 model
                achievements: [],
                showcasedItems: [],
                secondaryDisplayBadges: [],
                loginStreaks: { currentStreakDays: 0, longestStreakDays: 0 },
                dailyCheckIn: { currentStreakDays: 0 },
                lastActivityAt: now,
            },
        } as Partial<IUserGamificationDoc>], { session });

        // 2e. UserTracking
        const trackingPromise = UserTrackingModel.create([{
            userId,
            trackingStats: {
                joinDate: now,
                totalLoginDays: 0,
                totalNovelsRead: 0,
                totalEpisodesRead: 0,
                totalTimeSpentReadingSeconds: 0,
                totalCoinSpent: 0,
                totalRealMoneySpent: 0,
            },
        } as Partial<IUserTracking>], { session });
        
        // 2f. UserAchievement Data
        const achievementPromise = UserAchievementModel.create([{
            user: userId,
            earnedItems: [],
            ongoingProgress: new Map(),
            totalExperiencePointsFromGamification: 0,
        }], { session });

        // 2g. UserLibraryItem (สร้างเอกสารเปล่าเพื่อเตรียมไว้สำหรับการเพิ่มรายการในอนาคต)
        // หมายเหตุ: UserLibraryItem จะถูกสร้างเมื่อผู้ใช้เพิ่มนิยายเข้าคลังครั้งแรก
        // ดังนั้นเราไม่จำเป็นต้องสร้างเอกสารเปล่าที่นี่
        // แต่เราจะเตรียม promise เปล่าไว้เพื่อความสอดคล้อง
        const libraryPromise = Promise.resolve(); // Placeholder - UserLibraryItem จะถูกสร้างตามความต้องการ

        // Wait for all creation promises to resolve
        await Promise.all([
            profilePromise, settingsPromise, securityPromise,
            gamificationPromise, trackingPromise, achievementPromise,
            libraryPromise
        ]);

        console.log(`✅ [Tx] สร้างเอกสารย่อยทั้งหมดสำหรับ User ID: ${userId} สำเร็จ`);
    });

    console.log(`✅ [Signup API v2] Transaction สำหรับ User ID: ${newUserId} สำเร็จสมบูรณ์`);

    // --- Send Verification Email ---
    if (userEmailForToken && verificationTokenPlain) {
        try {
            await sendVerificationEmail(userEmailForToken, verificationTokenPlain);
            console.log(`✅ [Signup API v2] ส่งอีเมลยืนยันไปยัง ${userEmailForToken} สำเร็จ`);
        } catch (emailError: any) {
            console.error("❌ [Signup API v2] ไม่สามารถส่งอีเมลยืนยันได้:", emailError.message);
            // Even if email fails, user creation was successful.
            return NextResponse.json({
                success: true,
                message: "สมัครสมาชิกสำเร็จ แต่การส่งอีเมลยืนยันมีปัญหา กรุณาลองใหม่ในภายหลัง",
                userId: newUserId,
            }, { status: 201 });
        }
    } else {
        throw new Error("เกิดข้อผิดพลาด: ไม่สามารถสร้างข้อมูลสำหรับส่งอีเมลยืนยันได้");
    }

    return NextResponse.json({
        success: true,
        message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี",
        userId: newUserId,
    }, { status: 201 });

  } catch (error: any) {
    console.error("❌ [Signup API v2] เกิดข้อผิดพลาดในกระบวนการสมัครสมาชิก:", error.message || error, error.stack);
    let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
    let status = 500;

    if (error.code === 11000) {
        errorMessage = `ข้อมูลนี้ถูกใช้งานแล้ว`;
        status = 409;
    } else if (error.name === "ValidationError") {
        errorMessage = `ข้อมูลไม่ถูกต้อง: ${Object.values(error.errors).map((e: any) => e.message).join(", ")}`;
        status = 400;
    } else if (error.message) {
        errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage, success: false }, { status });
  } finally {
    await session.endSession();
    console.log("ℹ️ [Signup API v2] สิ้นสุด MongoDB Session");
  }
}