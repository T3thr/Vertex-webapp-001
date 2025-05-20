// src/scripts/admin-seed.ts
// สคริปต์สำหรับ seed ผู้ใช้แอดมินและผู้เขียนใน MongoDB
// อัปเดต: ปรับปรุงให้สอดคล้องกับโครงสร้าง IUser และ Sub-interfaces ล่าสุดทั้งหมด
//         มอบหมายการ Hashing รหัสผ่านให้ UserModel pre-save hook จัดการ

import mongoose, { Types } from "mongoose";
import { config } from "dotenv";
// import bcrypt from "bcryptjs"; // ไม่จำเป็นต้องใช้ bcrypt ในไฟล์นี้โดยตรงแล้ว
import dbConnect from "@/backend/lib/mongodb"; // ตรวจสอบ path
import UserModelImport, { // เปลี่ยนชื่อ import เพื่อไม่ให้ชนกับตัวแปร User ด้านล่าง
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
    IUserDisplayPreferences,
    IUserReadingDisplayPreferences,
    IUserAccessibilityDisplayPreferences,
    IUserPreferencesNotifications,
    INotificationChannelSettings,
    IUserContentPrivacyPreferences,
    IUserAnalyticsConsent,
    IVisualNovelGameplayPreferences,
    IShowcasedGamificationItem,
    IUserDisplayBadge,
    IWriterStats,
    INovelPerformanceStats
} from "@/backend/models/User"; // ตรวจสอบ path ให้ถูกต้อง

config({ path: ".env" }); // โหลด environment variables จาก .env

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // นี่คือรหัสผ่านแบบ Plain text
const AUTHOR_EMAIL = process.env.AUTHOR_EMAIL;
const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME;
const AUTHOR_PASSWORD = process.env.AUTHOR_PASSWORD; // นี่คือรหัสผ่านแบบ Plain text

// Helper function to create default notification settings (ครบถ้วนตาม IUser)
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

// Helper function to create default IUserPreferences (ครบถ้วนตาม IUser)
function createDefaultPreferences(): IUserPreferences {
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
    const defaultNotifications: IUserPreferencesNotifications = {
        masterNotificationsEnabled: true,
        email: createDefaultNotificationChannelSettings(),
        push: createDefaultNotificationChannelSettings(),
        inApp: createDefaultNotificationChannelSettings(),
    };

    return {
        language: "th",
        display: defaultDisplayPrefs,
        notifications: defaultNotifications,
        contentAndPrivacy: defaultContentPrivacyPrefs,
        visualNovelGameplay: defaultVisualNovelGameplayPrefs,
    };
}


async function seedAdmin(User: mongoose.Model<IUser>) {
    try {
        if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
            throw new Error("ตัวแปรสภาพแวดล้อมสำหรับแอดมินขาดหายไป: ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD");
        }

        // ไม่ต้อง hash password ที่นี่แล้ว UserModel pre-save hook จะจัดการเอง
        // const salt = await bcrypt.genSalt(10); // Salt rounds ควรตรงกับใน UserModel (คือ 10)
        // const hashedAdminPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

        const existingAdmin = await User.findOne({ $or: [{ email: ADMIN_EMAIL.toLowerCase() }, { username: ADMIN_USERNAME }] });

        // Data objects สำหรับ default values (คงโครงสร้างเดิมไว้ส่วนใหญ่)
        const adminProfileData: IUserProfile = {
            displayName: ADMIN_USERNAME,
            penName: ADMIN_USERNAME,
            bio: "ผู้ดูแลระบบของแพลตฟอร์มนิยายภาพ NovelMaze",
            gender: "prefer_not_to_say",
        };
        const adminTrackingStatsData: IUserTrackingStats = {
            joinDate: existingAdmin?.trackingStats?.joinDate || new Date(),
            firstLoginAt: existingAdmin?.trackingStats?.firstLoginAt || new Date(),
            totalLoginDays: existingAdmin?.trackingStats?.totalLoginDays || 1,
            totalNovelsRead: existingAdmin?.trackingStats?.totalNovelsRead || 0,
            totalEpisodesRead: existingAdmin?.trackingStats?.totalEpisodesRead || 0,
            totalTimeSpentReadingSeconds: existingAdmin?.trackingStats?.totalTimeSpentReadingSeconds || 0,
            totalCoinSpent: existingAdmin?.trackingStats?.totalCoinSpent || 0,
            totalRealMoneySpent: existingAdmin?.trackingStats?.totalRealMoneySpent || 0,
        };
        const adminSocialStatsData: IUserSocialStats = {
            followersCount: existingAdmin?.socialStats?.followersCount || 0,
            followingCount: existingAdmin?.socialStats?.followingCount || 0,
            novelsCreatedCount: existingAdmin?.socialStats?.novelsCreatedCount || 0,
            commentsMadeCount: existingAdmin?.socialStats?.commentsMadeCount || 0,
            ratingsGivenCount: existingAdmin?.socialStats?.ratingsGivenCount || 0,
            likesGivenCount: existingAdmin?.socialStats?.likesGivenCount || 0,
        };
        const adminWalletData: IUserWallet = {
            coinBalance: existingAdmin?.wallet?.coinBalance || 0,
        };
        const adminGamificationData: IUserGamification = {
            level: existingAdmin?.gamification?.level || 1,
            currentLevelObject: existingAdmin?.gamification?.currentLevelObject || null,
            experiencePoints: existingAdmin?.gamification?.experiencePoints || 0,
            totalExperiencePointsEverEarned: existingAdmin?.gamification?.totalExperiencePointsEverEarned || 0,
            nextLevelXPThreshold: existingAdmin?.gamification?.nextLevelXPThreshold || 100,
            achievements: existingAdmin?.gamification?.achievements || [],
            showcasedItems: existingAdmin?.gamification?.showcasedItems || [],
            primaryDisplayBadge: existingAdmin?.gamification?.primaryDisplayBadge,
            secondaryDisplayBadges: existingAdmin?.gamification?.secondaryDisplayBadges || [],
            loginStreaks: {
                currentStreakDays: existingAdmin?.gamification?.loginStreaks?.currentStreakDays || 1,
                longestStreakDays: existingAdmin?.gamification?.loginStreaks?.longestStreakDays || 1,
                lastLoginDate: new Date(),
            },
            dailyCheckIn: {
                currentStreakDays: existingAdmin?.gamification?.dailyCheckIn?.currentStreakDays || 0,
                lastCheckInDate: existingAdmin?.gamification?.dailyCheckIn?.lastCheckInDate,
            },
            lastActivityAt: new Date(),
        };
        const adminVerificationData: IUserVerification = {
            kycStatus: existingAdmin?.verification?.kycStatus || "verified",
            kycVerifiedAt: existingAdmin?.verification?.kycVerifiedAt || new Date(),
        };
        const adminDonationSettingsData: IUserDonationSettings = {
            isEligibleForDonation: false,
        };
        const adminSecuritySettingsData: IUserSecuritySettings = {
            twoFactorAuthentication: { isEnabled: false },
            loginAttempts: { count: 0 },
            activeSessions: [],
        };
        const adminMentalWellbeingData: IMentalWellbeingInsights = {
            overallEmotionalTrend: "unknown",
        };

        if (existingAdmin) {
            console.log(`ℹ️ ผู้ใช้แอดมินมีอยู่แล้ว: ${existingAdmin.email}`);
            existingAdmin.email = ADMIN_EMAIL.toLowerCase();
            existingAdmin.username = ADMIN_USERNAME;
            // ส่ง password แบบ plain text, pre-save hook จะ hash ให้
            existingAdmin.password = ADMIN_PASSWORD;
            existingAdmin.roles = ["Admin", "Writer", "Reader"];
            existingAdmin.profile = { ...adminProfileData, ...existingAdmin.profile }; // ให้ค่าใหม่ทับค่าเก่าใน profile
            existingAdmin.trackingStats = { ...adminTrackingStatsData, ...existingAdmin.trackingStats };
            existingAdmin.socialStats = { ...adminSocialStatsData, ...existingAdmin.socialStats };
            existingAdmin.preferences = existingAdmin.preferences ? { ...createDefaultPreferences(), ...existingAdmin.preferences } : createDefaultPreferences();
            existingAdmin.wallet = { ...adminWalletData, ...existingAdmin.wallet };
            existingAdmin.gamification = { ...adminGamificationData, ...existingAdmin.gamification };
            existingAdmin.verification = { ...adminVerificationData, ...existingAdmin.verification };
            existingAdmin.donationSettings = { ...adminDonationSettingsData, ...existingAdmin.donationSettings };
            existingAdmin.securitySettings = existingAdmin.securitySettings ? { ...adminSecuritySettingsData, ...existingAdmin.securitySettings } : adminSecuritySettingsData;
            existingAdmin.mentalWellbeingInsights = existingAdmin.mentalWellbeingInsights ? { ...adminMentalWellbeingData, ...existingAdmin.mentalWellbeingInsights } : adminMentalWellbeingData;
            existingAdmin.isEmailVerified = true;
            existingAdmin.isActive = true;
            existingAdmin.isBanned = false;
            existingAdmin.lastLoginAt = new Date();

            const credAccount = existingAdmin.accounts.find(acc => acc.provider === 'credentials');
            if (!credAccount) {
                existingAdmin.accounts.push({
                    provider: "credentials",
                    providerAccountId: existingAdmin._id.toString(),
                    type: "credentials",
                } as IAccount);
            } else if (credAccount && credAccount.providerAccountId !== existingAdmin._id.toString()) {
                // ถ้ามี credentials account อยู่แล้ว และ providerAccountId ไม่ตรงกับ _id ปัจจุบัน (อาจไม่ควรเกิด)
                // อาจจะอัปเดต providerAccountId หรือ log warning
                console.warn(`⚠️ ProviderAccountId ของ Admin (${credAccount.providerAccountId}) ไม่ตรงกับ _id (${existingAdmin._id.toString()}). พิจารณาอัปเดต.`);
                // credAccount.providerAccountId = existingAdmin._id.toString();
            }


            await existingAdmin.save(); // การ save() จะ trigger pre-save hook
            console.log(`✅ อัปเดตข้อมูลแอดมินสำเร็จ: ${ADMIN_EMAIL}`);
        } else {
            console.log("🌱 สร้างบัญชีผู้ใช้แอดมินใหม่...");
            const newAdmin = await User.create({
                email: ADMIN_EMAIL.toLowerCase(),
                username: ADMIN_USERNAME,
                password: ADMIN_PASSWORD, // ส่ง password แบบ plain text
                roles: ["Admin", "Writer", "Reader"],
                profile: adminProfileData,
                accounts: [{
                    provider: "credentials",
                    providerAccountId: ADMIN_USERNAME, // จะถูก override โดย pre-save hook ให้เป็น _id (ถ้า logic นั้นมีอยู่) หรือใช้ค่านี้
                    type: "credentials",
                } as IAccount],
                trackingStats: adminTrackingStatsData,
                socialStats: adminSocialStatsData,
                preferences: createDefaultPreferences(),
                wallet: adminWalletData,
                gamification: adminGamificationData,
                verification: adminVerificationData,
                donationSettings: adminDonationSettingsData,
                securitySettings: adminSecuritySettingsData,
                mentalWellbeingInsights: adminMentalWellbeingData,
                isEmailVerified: true,
                isActive: true,
                isBanned: false,
                lastLoginAt: new Date(),
            });
            console.log(`✅ สร้างผู้ใช้แอดมินสำเร็จ: ${newAdmin.email} (ID: ${newAdmin._id})`);
        }
    } catch (error: any) {
        console.error("❌ เกิดข้อผิดพลาดในการสร้าง/อัปเดตผู้ใช้แอดมิน:", error.message, error.stack);
        throw error;
    }
}

async function ensureAuthorExists(User: mongoose.Model<IUser>) {
    try {
        if (!AUTHOR_EMAIL || !AUTHOR_USERNAME || !AUTHOR_PASSWORD) {
            throw new Error("ตัวแปรสภาพแวดล้อมสำหรับผู้เขียนขาดหายไป: AUTHOR_EMAIL, AUTHOR_USERNAME, AUTHOR_PASSWORD");
        }
        // ไม่ต้อง hash password ที่นี่แล้ว UserModel pre-save hook จะจัดการเอง
        // const salt = await bcrypt.genSalt(10);
        // const hashedAuthorPassword = await bcrypt.hash(AUTHOR_PASSWORD, salt);

        let author = await User.findOne({ $or: [{ email: AUTHOR_EMAIL.toLowerCase() }, { username: AUTHOR_USERNAME }] });

        // Data objects สำหรับ default values
        const authorProfileData: IUserProfile = {
            displayName: AUTHOR_USERNAME,
            penName: AUTHOR_USERNAME,
            bio: "นักเขียนนิยายภาพ มากประสบการณ์ พร้อมแบ่งปันจินตนาการผ่านตัวอักษรและภาพ",
            gender: "prefer_not_to_say",
        };
        const authorTrackingStatsData: IUserTrackingStats = {
            joinDate: author?.trackingStats?.joinDate || new Date(),
            firstLoginAt: author?.trackingStats?.firstLoginAt || new Date(),
            totalLoginDays: author?.trackingStats?.totalLoginDays || 1,
            totalNovelsRead: 0, totalEpisodesRead: 0, totalTimeSpentReadingSeconds:0, totalCoinSpent:0, totalRealMoneySpent:0,
        };
        const authorSocialStatsData: IUserSocialStats = { followersCount: 0, followingCount: 0, novelsCreatedCount: 0, commentsMadeCount: 0, ratingsGivenCount: 0, likesGivenCount: 0 };
        const authorWalletData: IUserWallet = { coinBalance: 0 };
        const authorGamificationData: IUserGamification = {
            level: 1, currentLevelObject: null, experiencePoints: 0, totalExperiencePointsEverEarned: 0, nextLevelXPThreshold: 100,
            achievements: [], showcasedItems: [], primaryDisplayBadge: undefined, secondaryDisplayBadges: [],
            loginStreaks: { currentStreakDays: 1, longestStreakDays: 1, lastLoginDate: new Date() },
            dailyCheckIn: { currentStreakDays: 0 }, lastActivityAt: new Date(),
        };
        const authorVerificationData: IUserVerification = {
            kycStatus: "verified", kycVerifiedAt: new Date(), writerApplicationId: new Types.ObjectId()
        };
        const authorDonationSettingsData: IUserDonationSettings = { isEligibleForDonation: true, activeAuthorDirectDonationAppId: new Types.ObjectId() };
        const authorSecuritySettingsData: IUserSecuritySettings = { twoFactorAuthentication: { isEnabled: false }, loginAttempts: { count: 0 }, activeSessions: [] };
        const authorMentalWellbeingData: IMentalWellbeingInsights = { overallEmotionalTrend: "unknown" };
        const authorWriterStatsData: IWriterStats = {
            totalNovelsPublished: 0, totalEpisodesPublished: 0, totalViewsAcrossAllNovels: 0, totalReadsAcrossAllNovels: 0,
            totalLikesReceivedOnNovels: 0, totalCommentsReceivedOnNovels: 0, totalEarningsToDate: 0, totalCoinsReceived: 0,
            totalRealMoneyReceived: 0, totalDonationsReceived: 0, writerSince: new Date(),
            novelPerformanceSummaries: [] as unknown as Types.DocumentArray<INovelPerformanceStats>,
        };

        if (author) {
            console.log(`ℹ️ ผู้ใช้ผู้เขียนมีอยู่แล้ว: ${author.email}`);
            author.email = AUTHOR_EMAIL.toLowerCase();
            author.username = AUTHOR_USERNAME;
            // ส่ง password แบบ plain text, pre-save hook จะ hash ให้
            author.password = AUTHOR_PASSWORD;
            author.roles = Array.from(new Set([...author.roles, "Writer", "Reader"]));
            author.profile = { ...authorProfileData, ...author.profile };
            author.trackingStats = { ...authorTrackingStatsData, ...author.trackingStats };
            author.socialStats = { ...authorSocialStatsData, ...author.socialStats };
            author.preferences = author.preferences ? { ...createDefaultPreferences(), ...author.preferences } : createDefaultPreferences();
            author.wallet = { ...authorWalletData, ...author.wallet };
            author.gamification = { ...authorGamificationData, ...author.gamification };
            author.verification = { ...authorVerificationData, ...author.verification };
            author.donationSettings = { ...authorDonationSettingsData, ...author.donationSettings };
            author.securitySettings = author.securitySettings ? { ...authorSecuritySettingsData, ...author.securitySettings } : authorSecuritySettingsData;
            author.mentalWellbeingInsights = author.mentalWellbeingInsights ? { ...authorMentalWellbeingData, ...author.mentalWellbeingInsights } : authorMentalWellbeingData;
            author.writerStats = author.writerStats ? { ...authorWriterStatsData, ...author.writerStats } : authorWriterStatsData;
            author.isEmailVerified = true;
            author.isActive = true;
            author.isBanned = false;
            author.lastLoginAt = new Date();

            const credAccount = author.accounts.find(acc => acc.provider === 'credentials');
            if (!credAccount) {
                author.accounts.push({
                    provider: "credentials", providerAccountId: author._id.toString(), type: "credentials",
                } as IAccount);
            } else if (credAccount && credAccount.providerAccountId !== author._id.toString()){
                 console.warn(`⚠️ ProviderAccountId ของ Author (${credAccount.providerAccountId}) ไม่ตรงกับ _id (${author._id.toString()}). พิจารณาอัปเดต.`);
                // credAccount.providerAccountId = author._id.toString();
            }

            await author.save(); // การ save() จะ trigger pre-save hook
            console.log(`✅ อัปเดตข้อมูลผู้เขียนสำเร็จ: ${AUTHOR_EMAIL}`);
        } else {
            console.log("🌱 สร้างบัญชีผู้ใช้สำหรับเป็นผู้เขียนนิยายใหม่...");
            author = await User.create({
                email: AUTHOR_EMAIL.toLowerCase(),
                username: AUTHOR_USERNAME,
                password: AUTHOR_PASSWORD, // ส่ง password แบบ plain text
                roles: ["Writer", "Reader"],
                profile: authorProfileData,
                accounts: [{ provider: "credentials", providerAccountId: AUTHOR_USERNAME, type: "credentials" } as IAccount],
                trackingStats: authorTrackingStatsData,
                socialStats: authorSocialStatsData,
                preferences: createDefaultPreferences(),
                wallet: authorWalletData,
                gamification: authorGamificationData,
                verification: authorVerificationData,
                donationSettings: authorDonationSettingsData,
                securitySettings: authorSecuritySettingsData,
                mentalWellbeingInsights: authorMentalWellbeingData,
                writerStats: authorWriterStatsData,
                isEmailVerified: true,
                isActive: true,
                isBanned: false,
                lastLoginAt: new Date(),
            });
            console.log(`✅ สร้างบัญชีผู้เขียนสำเร็จ: ${author.email} (ID: ${author._id})`);
        }
        return author._id;
    } catch (error: any) {
        console.error("❌ เกิดข้อผิดพลาดในการสร้าง/อัปเดตบัญชีผู้เขียน:", error.message, error.stack);
        throw error;
    }
}

async function main() {
    try {
        console.log("🔗 กำลังเชื่อมต่อกับ MongoDB...");
        await dbConnect();
        console.log("✅ [MongoDB] เชื่อมต่อสำเร็จ");

        const User = UserModelImport; // ใช้ Model ที่ import มา

        await seedAdmin(User);
        await ensureAuthorExists(User);

        console.log("🎉 กระบวนการ seed สำเร็จ");
    } catch (err: any) {
        console.error("❌ กระบวนการ seed ล้มเหลว:", err.message, err.stack);
        process.exit(1); // ออกจาก process ด้วย error code
    } finally {
        try {
            await mongoose.connection.close();
            console.log("🔌 ปิดการเชื่อมต่อ MongoDB แล้ว");
        } catch (closeError: any) {
            console.error("❌ เกิดข้อผิดพลาดในการปิดการเชื่อมต่อ MongoDB:", closeError.message);
        }
        process.exit(0); // ออกจาก process เมื่อสำเร็จ
    }
}

main();