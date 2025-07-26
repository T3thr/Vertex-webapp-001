// src/app/api/auth/signin/oauth/route.ts
// API สำหรับการจัดการการเข้าสู่ระบบ/ลงทะเบียนผ่าน OAuth providers (Google, Twitter, etc.)
// อัปเดตล่าสุด: ปรับปรุงให้เรียบง่ายขึ้นโดยอาศัย Mongoose Schema Defaults และ pre-save hook
// จาก User Model เพื่อสร้าง/อัปเดตผู้ใช้ใหม่ที่สอดคล้องกับโครงสร้างข้อมูลล่าสุด

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUser, IAccount } from "@/backend/models/User"; // << ลดการ import ที่ไม่จำเป็น
import UserProfileModel, { IUserProfile, IUserSocialStats } from "@/backend/models/UserProfile";
import UserSettingsModel, { IUserSettings, INotificationChannelSettings } from "@/backend/models/UserSettings";
import UserSecurityModel, { IUserSecurity } from "@/backend/models/UserSecurity";
import UserGamificationModel, { IUserGamificationDoc } from "@/backend/models/UserGamification";
import UserTrackingModel, { IUserTracking } from "@/backend/models/UserTracking";
import UserAchievementModel from "@/backend/models/UserAchievement";
import UserLibraryItemModel from "@/backend/models/UserLibraryItem";
import { Types, Document } from "mongoose";

interface OAuthSignInRequestBody {
  provider: string;
  providerAccountId: string;
  email?: string | null;
  name?: string | null;
  usernameSuggestion?: string | null;
  picture?: string | null;
  "error-codes"?: string[];
}

type PlainUserObjectData = Omit<
  IUser,
  keyof Document | // Omit Mongoose Document specific keys if IUser itself doesn't directly extend it for this purpose
  '_id' | // We'll handle _id separately as string
  'matchPassword' | // Exclude methods
  'generateEmailVerificationToken' |
  'generatePasswordResetToken'
>;

type OAuthSignInResponseUser = PlainUserObjectData & {
  _id: string;
  accounts: IAccount[]; // IAccount จาก toObject() จะเป็น plain object
};

async function generateUniqueUsername(baseUsername: string): Promise<string> {
  let currentUsername = baseUsername.toLowerCase().replace(/[^a-z0-9_.]/g, "").substring(0, 40);
  if (currentUsername.length < 3) {
    currentUsername = `${currentUsername}${Math.random().toString(36).substring(2, 5)}`;
  }
  currentUsername = currentUsername.substring(0, 50);

  let counter = 0;
  let uniqueUsername = currentUsername;

  // The eslint-disable directive for no-constant-condition was removed as per the warning.
  // If 'no-constant-condition' is an active error rule in your project for 'while(true)',
  // and you intend for this loop to be infinite until broken, you might need to re-evaluate
  // your ESLint setup or the loop's condition if the warning was misleading.
  // For now, assuming removal is correct based on "no problems were reported".
  while (true) {
    const existingUser = await UserModel.findOne({ username: uniqueUsername }).lean();
    if (!existingUser) {
      break;
    }
    counter++;
    const baseForNew = currentUsername.substring(0, 50 - (String(counter).length + 1));
    uniqueUsername = `${baseForNew}_${counter}`;
    if (uniqueUsername.length > 50) {
        uniqueUsername = `user_${Date.now().toString().slice(-7)}_${counter}`;
    }
  }
  return uniqueUsername;
}

// Helper function สำหรับสร้าง default notification settings
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

// Helper function สำหรับสร้าง user documents ที่เกี่ยวข้องทั้งหมดสำหรับ OAuth user ใหม่
async function createCompleteUserDocuments(userId: Types.ObjectId, username: string, email?: string, displayName?: string): Promise<void> {
  const now = new Date();

  // สร้างเอกสารทั้งหมดแบบ parallel เพื่อประสิทธิภาพ
  await Promise.all([
    // UserProfile
    UserProfileModel.create({
      userId,
      displayName: displayName || username,
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
    } as Partial<IUserProfile>),

    // UserSettings
    UserSettingsModel.create({
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
    } as Partial<IUserSettings>),

    // UserSecurity
    UserSecurityModel.create({
      userId,
      verification: { kycStatus: "none" },
      twoFactorAuthentication: { isEnabled: false },
      loginAttempts: { count: 0 },
      activeSessions: [],
    } as Partial<IUserSecurity>),

    // UserGamification
    UserGamificationModel.create({
      userId,
      wallet: { coinBalance: 0 },
      gamification: {
        level: 1,
        experiencePoints: 0,
        totalExperiencePointsEverEarned: 0,
        nextLevelXPThreshold: 100,
        achievements: [],
        showcasedItems: [],
        secondaryDisplayBadges: [],
        loginStreaks: { currentStreakDays: 0, longestStreakDays: 0 },
        dailyCheckIn: { currentStreakDays: 0 },
        lastActivityAt: now,
      },
    } as Partial<IUserGamificationDoc>),

    // UserTracking
    UserTrackingModel.create({
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
    } as Partial<IUserTracking>),

    // UserAchievement
    UserAchievementModel.create({
      user: userId,
      earnedItems: [],
      ongoingProgress: new Map(),
      totalExperiencePointsFromGamification: 0,
    })

    // หมายเหตุ: UserLibraryItem จะถูกสร้างเมื่อผู้ใช้เพิ่มรายการเข้าคลังครั้งแรก
    // ดังนั้นไม่จำเป็นต้องสร้างที่นี่
  ]);

  console.log(`✅ [OAuth Helper] สร้างเอกสารย่อยทั้งหมดสำหรับ User ID: ${userId} สำเร็จ`);
}

// Helper function สำหรับตรวจสอบและสร้าง sub-documents ที่ขาดหายไปสำหรับผู้ใช้เดิม
async function ensureUserSubDocuments(userId: Types.ObjectId, username: string, email?: string): Promise<void> {
  const now = new Date();
  
  // ตรวจสอบและสร้าง documents ที่ขาดหายไป
  const checks = await Promise.allSettled([
    // ตรวจสอบ UserProfile
    UserProfileModel.findOne({ userId }).then(doc => {
      if (!doc) {
        return UserProfileModel.create({
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
        } as Partial<IUserProfile>);
      }
      return null;
    }),

    // ตรวจสอบ UserSettings
    UserSettingsModel.findOne({ userId }).then(doc => {
      if (!doc) {
        return UserSettingsModel.create({
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
        } as Partial<IUserSettings>);
      }
      return null;
    }),

    // ตรวจสอบ UserSecurity
    UserSecurityModel.findOne({ userId }).then(doc => {
      if (!doc) {
        return UserSecurityModel.create({
          userId,
          verification: { kycStatus: "none" },
          twoFactorAuthentication: { isEnabled: false },
          loginAttempts: { count: 0 },
          activeSessions: [],
        } as Partial<IUserSecurity>);
      }
      return null;
    }),

    // ตรวจสอบ UserGamification
    UserGamificationModel.findOne({ userId }).then(doc => {
      if (!doc) {
        return UserGamificationModel.create({
          userId,
          wallet: { coinBalance: 0 },
          gamification: {
            level: 1,
            experiencePoints: 0,
            totalExperiencePointsEverEarned: 0,
            nextLevelXPThreshold: 100,
            achievements: [],
            showcasedItems: [],
            secondaryDisplayBadges: [],
            loginStreaks: { currentStreakDays: 0, longestStreakDays: 0 },
            dailyCheckIn: { currentStreakDays: 0 },
            lastActivityAt: now,
          },
        } as Partial<IUserGamificationDoc>);
      }
      return null;
    }),

    // ตรวจสอบ UserTracking
    UserTrackingModel.findOne({ userId }).then(doc => {
      if (!doc) {
        return UserTrackingModel.create({
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
        } as Partial<IUserTracking>);
      }
      return null;
    }),

    // ตรวจสอบ UserAchievement
    UserAchievementModel.findOne({ user: userId }).then(doc => {
      if (!doc) {
        return UserAchievementModel.create({
          user: userId,
          earnedItems: [],
          ongoingProgress: new Map(),
          totalExperiencePointsFromGamification: 0,
        });
      }
      return null;
    })
  ]);

  // นับจำนวน documents ที่สร้างใหม่
  const createdCount = checks.filter(result => 
    result.status === 'fulfilled' && result.value !== null
  ).length;

  if (createdCount > 0) {
    console.log(`✅ [OAuth Helper] สร้าง sub-documents ที่ขาดหายไป ${createdCount} รายการสำหรับ User ID: ${userId}`);
  }

  // ตรวจสอบ errors
  const errors = checks.filter(result => result.status === 'rejected');
  if (errors.length > 0) {
    console.warn(`⚠️ [OAuth Helper] มีข้อผิดพลาดในการสร้าง sub-documents:`, errors);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  let wasNewlyCreated = false;
  await dbConnect();
  console.log("🔵 [API:OAuthSignIn] เชื่อมต่อ MongoDB สำเร็จ");

  try {
    const body = (await request.json()) as OAuthSignInRequestBody;
    const { provider, providerAccountId, email, name, usernameSuggestion, picture } = body;

    console.log(`ℹ️ [API:OAuthSignIn] ได้รับ request จาก provider: ${provider}, providerAccountId: ${providerAccountId}, email: ${email}`);

    if (!provider || !providerAccountId) {
      console.error("❌ [API:OAuthSignIn] ข้อมูลไม่ครบถ้วน: provider หรือ providerAccountId ไม่มีค่า");
      return NextResponse.json(
        { error: "ข้อมูล Provider หรือ Provider Account ID ไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    if (!email && !usernameSuggestion && !name && provider !== "twitter") {
        console.error("❌ [API:OAuthSignIn] ข้อมูลไม่เพียงพอ (ต้องการ email หรือ name/usernameSuggestion)");
        return NextResponse.json(
          { error: "ข้อมูลจาก Provider ไม่เพียงพอ (ต้องการ email หรือ name)" },
          { status: 400 }
        );
    }

    // แก้ไข Type ของ userDocument: เนื่องจาก IUser extends Document, เราสามารถใช้ IUser | null ได้เลย
    let userDocument: IUser | null = await UserModel.findOne({
      "accounts.provider": provider,
      "accounts.providerAccountId": providerAccountId,
    });

    if (userDocument) {
      console.log(`✅ [API:OAuthSignIn] พบผู้ใช้เดิมด้วย ${provider} ID: ${providerAccountId} (Username: ${userDocument.username})`);

      if (!userDocument.isActive) {
        console.warn(`⚠️ [API:OAuthSignIn] บัญชี (เดิม) ไม่ใช้งาน: ${userDocument.username}`);
        return NextResponse.json({ error: "บัญชีนี้ถูกปิดใช้งาน" }, { status: 403 });
      }
      if (userDocument.isBanned) {
        const banMessage = userDocument.bannedUntil ? `บัญชีถูกระงับถึง ${new Date(userDocument.bannedUntil).toLocaleString("th-TH")}` : "บัญชีถูกระงับถาวร";
        console.warn(`⚠️ [API:OAuthSignIn] บัญชี (เดิม) ถูกแบน: ${userDocument.username}`);
        return NextResponse.json({ error: banMessage, banReason: userDocument.banReason }, { status: 403 });
      }

      let updated = false;
      if (email && userDocument.email !== email.toLowerCase()) {
        if (!userDocument.email || !userDocument.isEmailVerified) {
          const existingEmailUser = await UserModel.findOne({ email: email.toLowerCase(), _id: { $ne: userDocument._id } });
          if (!existingEmailUser) {
            userDocument.email = email.toLowerCase();
            userDocument.isEmailVerified = true;
            userDocument.emailVerifiedAt = new Date();
            updated = true;
            console.log(`🔄 [API:OAuthSignIn] อัปเดตอีเมลสำหรับผู้ใช้ ${userDocument.username} เป็น ${email}`);
          } else {
            console.warn(`⚠️ [API:OAuthSignIn] อีเมล ${email} จาก ${provider} ถูกใช้แล้วโดยบัญชีอื่น ไม่สามารถอัปเดตได้`);
          }
        }
      } else if (email && !userDocument.email) {
         const existingEmailUser = await UserModel.findOne({ email: email.toLowerCase(), _id: { $ne: userDocument._id } });
        if (!existingEmailUser) {
          userDocument.email = email.toLowerCase();
          userDocument.isEmailVerified = true;
          userDocument.emailVerifiedAt = new Date();
          updated = true;
          console.log(`➕ [API:OAuthSignIn] เพิ่มอีเมล ${email} ให้กับผู้ใช้ ${userDocument.username}`);
        } else {
            console.warn(`⚠️ [API:OAuthSignIn] อีเมล ${email} จาก ${provider} ถูกใช้แล้วโดยบัญชีอื่น ไม่สามารถเพิ่มได้`);
        }
      }

      if (userDocument.profile) {
          if (name && !userDocument.profile.displayName) {
            userDocument.profile.displayName = name;
            updated = true;
          }
          if (picture) {
            userDocument.profile.avatarUrl = picture;
            updated = true;
          }
      } else {
          // Mongoose subdocuments (like profile) are automatically initialized
          // if their schema has defaults or they are assigned an object.
          // If profile can be undefined in IUser and the schema doesn't auto-create it,
          // this direct assignment is correct.
          userDocument.profile = {
              displayName: name || undefined,
              avatarUrl: picture || undefined,
              gender: "prefer_not_to_say", // Default
          };
          updated = true;
      }

      userDocument.lastLoginAt = new Date();
      await userDocument.save();
      
      // ตรวจสอบและสร้าง sub-documents ที่อาจขาดหายไปสำหรับผู้ใช้เดิม
      try {
        await ensureUserSubDocuments(userDocument._id, userDocument.username as string, userDocument.email);
      } catch (subDocError: any) {
        console.warn(`⚠️ [API:OAuthSignIn] ไม่สามารถสร้าง sub-documents ที่ขาดหายไปสำหรับผู้ใช้ ${userDocument.username}:`, subDocError.message);
      }
      
      console.log(`🔄 [API:OAuthSignIn] อัปเดต lastLoginAt ${updated ? 'และข้อมูลอื่นๆ ' : ''}สำหรับผู้ใช้ ${userDocument.username}`);

    } else {
      if (email) {
        const existingUserWithEmail = await UserModel.findOne({ email: email.toLowerCase() });
        if (existingUserWithEmail) {
          userDocument = existingUserWithEmail; // existingUserWithEmail is IUser | null
          console.log(`🔗 [API:OAuthSignIn] พบผู้ใช้ด้วยอีเมล ${email} (Username: ${userDocument.username}), กำลังเชื่อมบัญชี ${provider}`);

          if (!userDocument.isActive) return NextResponse.json({ error: "บัญชีที่เชื่อมโยงด้วยอีเมลนี้ถูกปิดใช้งาน" }, { status: 403 });
          if (userDocument.isBanned) return NextResponse.json({ error: "บัญชีที่เชื่อมโยงด้วยอีเมลนี้ถูกระงับ" }, { status: 403 });

          const accountExists = userDocument.accounts.some(
            acc => acc.provider === provider && acc.providerAccountId === providerAccountId
          );

          if (!accountExists) {
            const newAccountObject: IAccount = {
              provider,
              providerAccountId,
              type: "oauth",
            } as IAccount; // Mongoose subdocument array handles this correctly
            userDocument.accounts.push(newAccountObject);

            if (!userDocument.isEmailVerified) {
                userDocument.isEmailVerified = true;
                userDocument.emailVerifiedAt = new Date();
            }
            if (userDocument.profile) {
                if (name && !userDocument.profile.displayName) userDocument.profile.displayName = name;
                if (picture) userDocument.profile.avatarUrl = picture;
            } else {
                userDocument.profile = { displayName: name || undefined, avatarUrl: picture || undefined, gender: "prefer_not_to_say" };
            }

            userDocument.lastLoginAt = new Date();
            await userDocument.save();
            console.log(`✅ [API:OAuthSignIn] เชื่อมบัญชี ${provider} กับผู้ใช้ ${userDocument.username} สำเร็จ`);
          } else {
            console.log(`ℹ️ [API:OAuthSignIn] บัญชี ${provider} นี้ถูกเชื่อมกับผู้ใช้ ${userDocument.username} อยู่แล้ว`);
            userDocument.lastLoginAt = new Date(); // อัปเดต lastLoginAt แม้ว่าบัญชีจะเชื่อมอยู่แล้ว
            await userDocument.save();
          }
        }
      }

      if (!userDocument) {
        wasNewlyCreated = true;
        console.log(
          `✨ [API:OAuthSignIn] ไม่พบผู้ใช้, กำลังสร้างบัญชีใหม่จาก ${provider} ด้วย email: ${email}, name: ${name}`
        );

        const newUsernameBase =
          usernameSuggestion ||
          (email ? email.split("@")[0] : "") ||
          name?.replace(/\s+/g, "") ||
          `user${Date.now().toString().slice(-6)}`;
        const finalUsername = await generateUniqueUsername(newUsernameBase);

        // สร้างผู้ใช้ใหม่พร้อมกับ sub-documents ทั้งหมด
        const newUserInput = {
          username: finalUsername,
          email: email ? email.toLowerCase() : undefined,
          isEmailVerified: !!email,
          emailVerifiedAt: email ? new Date() : undefined,
          accounts: [{ provider, providerAccountId, type: "oauth" } as IAccount],
          roles: ["Reader"], // กำหนด role เริ่มต้น
          lastLoginAt: new Date(),
        };

        if (newUserInput.email) {
          const existingEmailUser = await UserModel.findOne({
            email: newUserInput.email,
          });
          if (existingEmailUser) {
            console.error(`❌ [API:OAuthSignIn] ขณะสร้างผู้ใช้ใหม่ อีเมล ${newUserInput.email} ถูกใช้งานแล้ว (race condition)`);
            return NextResponse.json({ error: `อีเมล ${newUserInput.email} นี้ถูกใช้งานแล้วโดยบัญชีอื่น.` }, { status: 409 });
          }
        }

        // สร้าง User document หลักก่อน
        userDocument = new UserModel(newUserInput);
        await userDocument.save();
        console.log(`✅ [API:OAuthSignIn] สร้างผู้ใช้หลัก ${userDocument.username} จาก ${provider} สำเร็จ`);

        // สร้าง sub-documents ทั้งหมดที่เกี่ยวข้อง
        try {
          await createCompleteUserDocuments(
            userDocument._id, 
            finalUsername, 
            email || undefined, 
            name || finalUsername
          );
          console.log(`✅ [API:OAuthSignIn] สร้างเอกสารย่อยทั้งหมดสำหรับผู้ใช้ ${userDocument.username} สำเร็จ`);
        } catch (subDocError: any) {
          console.error(`❌ [API:OAuthSignIn] ข้อผิดพลาดในการสร้างเอกสารย่อย:`, subDocError);
          // หากเกิดข้อผิดพลาดในการสร้าง sub-documents ให้ลบ user หลักออกด้วย
          await UserModel.findByIdAndDelete(userDocument._id);
          throw new Error(`ไม่สามารถสร้างข้อมูลผู้ใช้ครบถ้วน: ${subDocError.message}`);
        }
      }
    }

    if (!userDocument) {
        console.error("❌ [API:OAuthSignIn] เกิดข้อผิดพลาดร้ายแรง: ไม่สามารถหาหรือสร้าง User document ได้");
        return NextResponse.json({ error: "ไม่สามารถประมวลผลการเข้าสู่ระบบ OAuth ได้" }, { status: 500 });
    }

    // userDocument is of type IUser (which extends Mongoose.Document)
    const plainUserObject = userDocument.toObject<IUser>(); // Convert Mongoose document to plain object

    // Destructure to remove Mongoose-specific or method fields for the response
    const {
        _id: objectId, // Mongoose _id is Types.ObjectId
        accounts: originalAccounts, // This will be an array of plain objects after toObject()
        // Exclude methods defined in IUser that are not part of PlainUserObjectData
        matchPassword, // Example method from IUser that should be excluded
        generateEmailVerificationToken, // Example method
        generatePasswordResetToken, // Example method
        // Exclude fields from mongoose.Document that are not in PlainUserObjectData
        // (Many are handled by Omit<IUser, keyof Document ...> in PlainUserObjectData type)
        __v, // Example version key
        $isNew, // Example Mongoose internal
        // ... any other Mongoose document specific fields or methods not wanted in response
        ...restOfUserObject
    } = plainUserObject;


    const userResponse: OAuthSignInResponseUser = {
      ...(restOfUserObject as PlainUserObjectData), // Cast the rest to ensure it matches
      _id: objectId.toString(), // Convert ObjectId to string for JSON response
      // Ensure accounts are plain objects if they weren't fully converted by toObject() for subdocuments
      accounts: originalAccounts.map(acc => {
          // If IAccount subdocuments have their own toObject, it would have been called.
          // This is a safeguard or explicit conversion if needed.
          const plainAcc = { ...acc };
          // If IAccount has methods or Mongoose specifics, omit them here too.
          // For this example, assume IAccount from toObject() is already plain enough.
          return plainAcc as unknown as IAccount; // Cast to IAccount (plain object version)
      }),
    };

     // ลบ password field เผื่อกรณีที่อาจจะมี (ซึ่งไม่ควรมีใน OAuth user)
    if ('password' in (userResponse as any)) {
        delete (userResponse as any).password;
    }


    console.log(`✅ [API:OAuthSignIn] ส่งข้อมูลผู้ใช้ ${userResponse.username} กลับ (ID: ${userResponse._id})`);
    return NextResponse.json({ user: userResponse }, { status: wasNewlyCreated ? 201 : 200 });

  } catch (error: any) {
    console.error("❌ [API:OAuthSignIn] ข้อผิดพลาด:", error.message, error.stack);
    if (error.code === 11000) { // MongoDB duplicate key error
        const field = Object.keys(error.keyValue)[0];
        const message = `${field === 'email' ? 'อีเมล' : (field === 'username' ? 'ชื่อผู้ใช้' : `ฟิลด์ '${field}'`)} นี้ถูกใช้งานแล้ว`;
        return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการประมวลผล Social Sign-In", details: error.message },
      { status: 500 }
    );
  }
}