// src/app/api/auth/signin/oauth/route.ts
// API สำหรับการจัดการการเข้าสู่ระบบ/ลงทะเบียนผ่าน OAuth providers (Google, Twitter, etc.)
// อัปเดต: ทำงานกับ UserModel ที่รวมแล้ว และสร้าง/อัปเดตผู้ใช้ใน User collection เดียว
// แก้ไข: ปรับปรุงการจัดการ Type ของ Subdocument และ Default values สำหรับ Nested Objects

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
  // เพิ่มเติม sub-interfaces ของ gamification ถ้าจำเป็น
  IShowcasedGamificationItem,
  IUserDisplayBadge,
} from "@/backend/models/User"; // ตรวจสอบว่า path ถูกต้องและ import ครบถ้วน
import { Types, Document } from "mongoose";

// ประเภทสำหรับ Request Body จาก NextAuth JWT Callback (คงเดิม)
interface OAuthSignInRequestBody {
  provider: string;
  providerAccountId: string;
  email?: string | null;
  name?: string | null;
  usernameSuggestion?: string | null;
  picture?: string | null;
}

// --- Định nghĩa Type สำหรับ Response ---
// 1. สร้าง Type สำหรับ IUser ที่เป็น Plain Object (ไม่มี Mongoose Document methods/properties)
// และ Omit '_id' เพื่อที่เราจะกำหนดเป็น string โดยเฉพาะ
type PlainUserObjectData = Omit<
  IUser,
  keyof Document | // Omit standard Mongoose Document properties like save(), model(), etc.
  '_id' | // Omit original _id which is Types.ObjectId
  'matchPassword' | // Omit custom methods
  'generateEmailVerificationToken' |
  'generatePasswordResetToken'
>;

// 2. กำหนด Type สุดท้ายสำหรับ User Response ที่มี _id เป็น string
// และตรวจสอบว่า sub-documents ถูกแปลงเป็น plain objects อย่างถูกต้อง (ถ้าจำเป็น)
// โดยทั่วไป toObject() จะจัดการเรื่องนี้ แต่ Type ต้องสะท้อนโครงสร้างสุดท้าย
type OAuthSignInResponseUser = PlainUserObjectData & {
  _id: string; // _id ใน response จะเป็น string
  // หาก sub-documents เช่น 'accounts' มี _id ของตัวเองที่เป็น ObjectId และต้องการให้เป็น string ใน response
  // จะต้องมีการแปลงและกำหนด Type ที่นี่ด้วย แต่ IAccount ใน User.ts มี _id: false ซึ่งหมายถึงไม่มี _id field
  // ดังนั้น accounts: IAccount[] (ที่ IAccount เป็น plain interface) ก็เพียงพอ
  accounts: IAccount[]; // IUser.accounts เป็น Types.DocumentArray<IAccount>, toObject() ควรให้ IAccount[]
  // หาก IUserProfile หรือ interface อื่นๆ ที่ใช้ใน IUser มี method หรือเป็น Mongoose subdocument instance
  // การ cast หรือ toObject() ซ้อนอาจจำเป็น แต่จาก User.ts ส่วนใหญ่เป็น plain interfaces
};


// ฟังก์ชันสำหรับสร้าง username ที่ไม่ซ้ำกัน (คงเดิม)
async function generateUniqueUsername(baseUsername: string): Promise<string> {
  let currentUsername = baseUsername.toLowerCase().replace(/[^a-z0-9_.]/g, "").substring(0, 40);
  if (currentUsername.length < 3) {
    currentUsername = `${currentUsername}${Math.random().toString(36).substring(2, 5)}`;
  }
  currentUsername = currentUsername.substring(0, 50);

  let counter = 0;
  let uniqueUsername = currentUsername;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existingUser = await UserModel.findOne({ username: uniqueUsername }).lean();
    if (!existingUser) {
      break;
    }
    counter++;
    const baseForNew = currentUsername.substring(0, 50 - (String(counter).length + 1));
    uniqueUsername = `${baseForNew}_${counter}`;
    if (uniqueUsername.length > 50) { // Fallback หากชื่อยาวเกินไป
        uniqueUsername = `user_${Date.now().toString().slice(-7)}_${counter}`;
    }
  }
  return uniqueUsername;
}

// Helper function เพื่อสร้าง default notification settings (ปรับปรุงให้ครบตาม IUser)
function createDefaultNotificationChannelSettings(): INotificationChannelSettings {
    return {
        enabled: true,
        newsletter: true, // หรือ false ตาม default ที่ต้องการ
        novelUpdatesFromFollowing: true,
        newFollowers: true,
        commentsOnMyNovels: true,
        repliesToMyComments: true,
        donationAlerts: true,
        systemAnnouncements: true,
        securityAlerts: true, // เพิ่มเข้ามา
        promotionalOffers: false, // เพิ่มเข้ามา
        achievementUnlocks: true, // เพิ่มเข้ามา
    };
}

export async function POST(request: Request): Promise<NextResponse> {
  let wasNewlyCreated = false; // Flag สำหรับติดตามว่ามีการสร้างผู้ใช้ใหม่หรือไม่
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
     // Twitter อาจไม่มี email, แต่ถ้าเป็น provider อื่นและไม่มี email และไม่มี name/usernameSuggestion ก็จะขาดข้อมูล
    if (!email && !usernameSuggestion && !name && provider !== "twitter") {
        console.error("❌ [API:OAuthSignIn] ข้อมูลไม่เพียงพอ (ต้องการ email หรือ name/usernameSuggestion)");
        return NextResponse.json(
          { error: "ข้อมูลจาก Provider ไม่เพียงพอ (ต้องการ email หรือ name)" },
          { status: 400 }
        );
    }


    let userDocument: (IUser & { _id: Types.ObjectId }) | null = await UserModel.findOne({
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
        if (!userDocument.email || !userDocument.isEmailVerified) { // อัปเดตถ้า email เดิมไม่มี หรือยังไม่ verified
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

      // ตรวจสอบว่า userDocument.profile มีค่าก่อนเข้าถึง property ภายใน
      if (userDocument.profile) {
          if (name && !userDocument.profile.displayName) {
            userDocument.profile.displayName = name;
            updated = true;
          }
          if (picture && !userDocument.profile.avatarUrl) {
            userDocument.profile.avatarUrl = picture;
            updated = true;
          }
      } else { // ถ้า profile เป็น undefined ให้สร้าง object ใหม่
          userDocument.profile = {
              displayName: name || undefined,
              avatarUrl: picture || undefined,
              // กำหนด default อื่นๆ ของ IUserProfile ที่จำเป็น
              gender: "prefer_not_to_say",
          };
          updated = true;
      }


      userDocument.lastLoginAt = new Date();
      await userDocument.save();
      console.log(`🔄 [API:OAuthSignIn] อัปเดต lastLoginAt ${updated ? 'และข้อมูลอื่นๆ ' : ''}สำหรับผู้ใช้ ${userDocument.username}`);

    } else { // ไม่พบผู้ใช้ด้วย provider + providerAccountId
      if (email) { // ลองค้นหาด้วย email ถ้ามี
        const existingUserWithEmail = await UserModel.findOne({ email: email.toLowerCase() });
        if (existingUserWithEmail) {
          userDocument = existingUserWithEmail; // ผู้ใช้คนนี้มีบัญชีอยู่แล้วด้วย email นี้
          console.log(`🔗 [API:OAuthSignIn] พบผู้ใช้ด้วยอีเมล ${email} (Username: ${userDocument.username}), กำลังเชื่อมบัญชี ${provider}`);

          if (!userDocument.isActive) return NextResponse.json({ error: "บัญชีที่เชื่อมโยงด้วยอีเมลนี้ถูกปิดใช้งาน" }, { status: 403 });
          if (userDocument.isBanned) return NextResponse.json({ error: "บัญชีที่เชื่อมโยงด้วยอีเมลนี้ถูกระงับ" }, { status: 403 });

          const accountExists = userDocument.accounts.some(
            acc => acc.provider === provider && acc.providerAccountId === providerAccountId
          );

          if (!accountExists) {
            const newAccountObject: IAccount = { // สร้าง plain object สำหรับ IAccount
              provider,
              providerAccountId,
              type: "oauth",
            } as IAccount; // Cast เพื่อให้สอดคล้องกับ Type, Mongoose จะจัดการ
            userDocument.accounts.push(newAccountObject);

            if (!userDocument.isEmailVerified) { // ถ้า email หลักยังไม่ verify ให้ verify เลย
                userDocument.isEmailVerified = true;
                userDocument.emailVerifiedAt = new Date();
            }
            if (userDocument.profile) {
                if (name && !userDocument.profile.displayName) userDocument.profile.displayName = name;
                if (picture && !userDocument.profile.avatarUrl) userDocument.profile.avatarUrl = picture;
            } else {
                userDocument.profile = { displayName: name || undefined, avatarUrl: picture || undefined, gender: "prefer_not_to_say" };
            }

            userDocument.lastLoginAt = new Date();
            await userDocument.save();
            console.log(`✅ [API:OAuthSignIn] เชื่อมบัญชี ${provider} กับผู้ใช้ ${userDocument.username} สำเร็จ`);
          } else {
            console.log(`ℹ️ [API:OAuthSignIn] บัญชี ${provider} นี้ถูกเชื่อมกับผู้ใช้ ${userDocument.username} อยู่แล้ว`);
          }
        }
      }

      // ถ้ายังไม่พบ userDocument (คือ ไม่มีทั้ง providerId และ email ที่ตรงกัน) ให้สร้างใหม่
      if (!userDocument) {
        wasNewlyCreated = true; // ตั้งค่า flag
        console.log(`✨ [API:OAuthSignIn] ไม่พบผู้ใช้, กำลังสร้างบัญชีใหม่จาก ${provider} ด้วย email: ${email}, name: ${name}`);

        const newUsernameBase = usernameSuggestion || (email ? email.split("@")[0] : "") || name?.replace(/\s+/g, "") || `user${Date.now().toString().slice(-6)}`;
        const finalUsername = await generateUniqueUsername(newUsernameBase);

        // --- สร้าง Default Values สำหรับ Nested Objects อย่างครบถ้วน ---
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
            allowPsychologicalAnalysis: false, allowPersonalizedFeedback: false, lastConsentReviewDate: new Date(),
        };
        const defaultContentPrivacyPrefs: IUserContentPrivacyPreferences = {
            showMatureContent: false, preferredGenres: [], blockedGenres: [], blockedTags: [], blockedAuthors: [], blockedNovels: [],
            profileVisibility: "public", readingHistoryVisibility: "followers_only", showActivityStatus: true,
            allowDirectMessagesFrom: "followers", analyticsConsent: defaultAnalyticsConsent,
        };
        const defaultVisualNovelGameplayPrefs: IVisualNovelGameplayPreferences = {
            textSpeed: "normal", autoPlayMode: "click", autoPlayDelayMs: 1500, skipUnreadText: false,
            transitionsEnabled: true, screenEffectsEnabled: true, textWindowOpacity: 0.8, masterVolume: 1.0,
            bgmVolume: 0.7, sfxVolume: 0.8, voiceVolume: 1.0, voicesEnabled: true, preferredVoiceLanguage: "original",
            showChoiceTimer: true, blurThumbnailsOfMatureContent: true, preferredArtStyles: [], preferredGameplayMechanics: [],
            assetPreloading: "essential", characterAnimationLevel: "full",
        };
        const defaultProfile: IUserProfile = {
            displayName: name || finalUsername, avatarUrl: picture || undefined,
            penName: undefined, bio: undefined, coverImageUrl: undefined, gender: "prefer_not_to_say",
            dateOfBirth: undefined, country: undefined, timezone: undefined, location: undefined, websiteUrl: undefined,
        };
        const defaultTrackingStats: IUserTrackingStats = {
            joinDate: new Date(), totalLoginDays: 1, totalNovelsRead: 0, totalEpisodesRead: 0,
            totalTimeSpentReadingSeconds: 0, totalCoinSpent: 0, totalRealMoneySpent: 0, firstLoginAt: new Date(),
            lastNovelReadAt: undefined, lastNovelReadId: undefined,
        };
        const defaultSocialStats: IUserSocialStats = {
            followersCount: 0, followingCount: 0, novelsCreatedCount: 0, commentsMadeCount: 0, ratingsGivenCount: 0, likesGivenCount: 0,
        };
        const defaultPreferences: IUserPreferences = {
            language: "th", display: defaultDisplayPrefs,
            notifications: {
                masterNotificationsEnabled: true, email: createDefaultNotificationChannelSettings(),
                push: createDefaultNotificationChannelSettings(), inApp: createDefaultNotificationChannelSettings(),
            },
            contentAndPrivacy: defaultContentPrivacyPrefs, visualNovelGameplay: defaultVisualNovelGameplayPrefs,
        };
        const defaultWallet: IUserWallet = { coinBalance: 0, lastCoinTransactionAt: undefined };
        const defaultGamification: IUserGamification = {
            level: 1, currentLevelObject: null, experiencePoints: 0, totalExperiencePointsEverEarned: 0,
            nextLevelXPThreshold: 100, achievements: [], showcasedItems: [] as IShowcasedGamificationItem[],
            primaryDisplayBadge: undefined as IUserDisplayBadge | undefined,
            secondaryDisplayBadges: [] as IUserDisplayBadge[],
            loginStreaks: { currentStreakDays: 1, longestStreakDays: 1, lastLoginDate: new Date() },
            dailyCheckIn: { currentStreakDays: 0, lastCheckInDate: undefined }, lastActivityAt: new Date(),
        };
        const defaultVerification: IUserVerification = { kycStatus: "none" };
        const defaultDonationSettings: IUserDonationSettings = { isEligibleForDonation: false };
        const defaultSecuritySettings: IUserSecuritySettings = {
            twoFactorAuthentication: { isEnabled: false }, loginAttempts: { count: 0 }, activeSessions: [],
        };
        const defaultMentalWellbeingInsights: IMentalWellbeingInsights = {
            overallEmotionalTrend: "unknown", consultationRecommended: false,
        };

        const newUserInput = { // สร้าง object สำหรับ new UserModel โดยตรง ไม่ต้องใช้ Partial<IUser>
          username: finalUsername,
          email: email ? email.toLowerCase() : undefined,
          isEmailVerified: !!email,
          emailVerifiedAt: email ? new Date() : undefined,
          roles: ["Reader"],
          profile: defaultProfile,
          accounts: [{ provider, providerAccountId, type: "oauth" } as IAccount],
          trackingStats: defaultTrackingStats,
          socialStats: defaultSocialStats,
          preferences: defaultPreferences,
          wallet: defaultWallet,
          gamification: defaultGamification,
          isActive: true,
          isBanned: false,
          lastLoginAt: new Date(),
          // Optional fields from IUser not explicitly set above will use Mongoose schema defaults or be undefined
          writerStats: undefined,
          verifiedBadges: [],
          verification: defaultVerification,
          donationSettings: defaultDonationSettings,
          securitySettings: defaultSecuritySettings,
          mentalWellbeingInsights: defaultMentalWellbeingInsights,
          isDeleted: false,
        };

        if (newUserInput.email) {
            const existingEmailUser = await UserModel.findOne({ email: newUserInput.email });
            if (existingEmailUser) {
                console.error(`❌ [API:OAuthSignIn] ขณะสร้างผู้ใช้ใหม่ อีเมล ${newUserInput.email} ถูกใช้งานแล้ว (race condition)`);
                return NextResponse.json({ error: `อีเมล ${newUserInput.email} นี้ถูกใช้งานแล้วโดยบัญชีอื่น.` }, { status: 409 });
            }
        }

        // Cast newUserInput to any temporarily if TypeScript complains about missing Mongoose methods/properties
        // Mongoose will handle applying schema defaults for fields not provided.
        userDocument = new UserModel(newUserInput as any) as (IUser & { _id: Types.ObjectId });
        await userDocument.save();
        console.log(`✅ [API:OAuthSignIn] สร้างผู้ใช้ใหม่ ${userDocument.username} จาก ${provider} สำเร็จ`);
      }
    }

    if (!userDocument) { // Double check, ควรจะมีค่าเสมอ ณ จุดนี้
        console.error("❌ [API:OAuthSignIn] เกิดข้อผิดพลาดร้ายแรง: ไม่สามารถหาหรือสร้าง User document ได้");
        return NextResponse.json({ error: "ไม่สามารถประมวลผลการเข้าสู่ระบบ OAuth ได้" }, { status: 500 });
    }

    // --- สร้าง Response Object ---
    // 1. แปลง Mongoose document เป็น plain JavaScript object
    const plainUserObject = userDocument.toObject<IUser>(); // toObject() โดยทั่วไปจะคืน plain object ที่มี _id เป็น ObjectId

    // 2. สร้าง userResponse โดย map field และแปลง _id เป็น string
    // ต้องมั่นใจว่าทุก field ใน OAuthSignInResponseUser ได้รับการกำหนดค่า
    const userResponse: OAuthSignInResponseUser = {
      // ใช้ spread operator กับ plainUserObject ที่ cast ให้ไม่มี _id (ชั่วคราว)
      // เพื่อหลีกเลี่ยง conflict กับ _id: string ที่เราจะใส่
      ...(plainUserObject as Omit<IUser, '_id'>),
      _id: userDocument._id.toString(), // กำหนด _id เป็น string อย่างชัดเจน

      // ตรวจสอบว่า 'accounts' ถูกแปลงเป็น plain array of plain objects
      // IAccount ใน User.ts คือ Types.DocumentArray<IAccount> (ที่ IAccount extends Document)
      // toObject() ของ parent document ควรจะเรียก toObject() บน subdocuments ด้วย
      // แต่เพื่อความแน่นอน เราสามารถ map และเรียก toObject() อีกครั้งถ้า IAccount ยังเป็น Mongoose Document instance
      accounts: plainUserObject.accounts.map(acc => (acc.toObject ? acc.toObject() : acc) as IAccount),
    };
    
    // ลบ password ออกจาก object ที่จะส่งกลับ (ถึงแม้ OAuth user จะไม่มี password ใน model นี้)
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
        return NextResponse.json({ error: message }, { status: 409 }); // Conflict
    }
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการประมวลผล Social Sign-In", details: error.message },
      { status: 500 }
    );
  }
}