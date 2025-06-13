// src/scripts/admin-seed.ts
// สคริปต์สำหรับ seed ผู้ใช้แอดมินและผู้เขียนใน MongoDB
// อัปเดต: ปรับปรุงให้สอดคล้องกับโครงสร้าง IUser และ Sub-interfaces ล่าสุดทั้งหมด
//         มอบหมายการ Hashing รหัสผ่านให้ UserModel pre-save hook จัดการ
//         เพิ่ม field ใหม่และแก้ไข field ที่ไม่ถูกต้องตาม User model ล่าสุด

import mongoose, { Types } from "mongoose";
import { config } from "dotenv";
// ไม่จำเป็นต้องใช้ bcrypt ในไฟล์นี้โดยตรงแล้ว เพราะ pre-save hook ใน User Model จัดการให้
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
    IWriterStats,
    INovelPerformanceStats,
    IActiveNovelPromotionSummary,
    ITrendingNovelSummary
} from "@/backend/models/User"; // ตรวจสอบ path ให้ถูกต้อง

config({ path: ".env" }); // โหลด environment variables จาก .env

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // นี่คือรหัสผ่านแบบ Plain text
const AUTHOR_EMAIL = process.env.AUTHOR_EMAIL;
const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME;
const AUTHOR_PASSWORD = process.env.AUTHOR_PASSWORD; // นี่คือรหัสผ่านแบบ Plain text

/**
 * @function createDefaultPreferences
 * @description สร้าง Object การตั้งค่าเริ่มต้นสำหรับผู้ใช้ใหม่ (IUserPreferences)
 * โดยอ้างอิงจากค่า default ใน UserSchema เพื่อให้มั่นใจว่าข้อมูลถูกต้องและครบถ้วน
 * @returns {IUserPreferences} Object การตั้งค่าเริ่มต้น
 */
function createDefaultPreferences(): IUserPreferences {
    // ฟังก์ชันนี้ถูกสร้างขึ้นมาใหม่โดยอ้างอิงค่า Default จาก UserSchema.ts โดยตรง
    return {
        language: "th",
        display: {
            theme: "system",
            reading: {
                fontFamily: "Sarabun", // หรือค่า default อื่นที่เหมาะสม
                fontSize: "medium",
                lineHeight: 1.6,
                textAlignment: "left",
                readingModeLayout: "scrolling",
                textContrastMode: false
            },
            accessibility: {
                dyslexiaFriendlyFont: false,
                highContrastMode: false,
                epilepsySafeMode: false
            },
            uiVisibility: {
                textBoxOpacity: 80,
                backgroundBrightness: 100,
                textBoxBorder: true
            },
            visualEffects: {
                sceneTransitionAnimations: true,
                actionSceneEffects: true
            },
            characterDisplay: {
                showCharacters: true,
                characterMovementAnimations: true,
                hideCharactersDuringText: false
            },
            characterVoiceDisplay: {
                voiceIndicatorIcon: true
            },
            backgroundDisplay: {
                backgroundQuality: "mid",
                showCGs: true,
                backgroundEffects: true
            },
            voiceSubtitles: {
                enabled: true
            }
        },
        notifications: {
            masterNotificationsEnabled: true,
            email: {
                enabled: true, newsletter: true, novelUpdatesFromFollowing: true, newFollowers: true, commentsOnMyNovels: true, repliesToMyComments: true, donationAlerts: true, systemAnnouncements: true, securityAlerts: true, promotionalOffers: false, achievementUnlocks: true
            },
            push: {
                enabled: true, newsletter: false, novelUpdatesFromFollowing: true, newFollowers: true, commentsOnMyNovels: true, repliesToMyComments: true, donationAlerts: true, systemAnnouncements: true, securityAlerts: true, promotionalOffers: false, achievementUnlocks: true
            },
            inApp: {
                enabled: true, newsletter: false, novelUpdatesFromFollowing: true, newFollowers: true, commentsOnMyNovels: true, repliesToMyComments: true, donationAlerts: true, systemAnnouncements: true, securityAlerts: true, promotionalOffers: false, achievementUnlocks: true
            },
            saveLoad: {
                autoSaveNotification: true,
                noSaveSpaceWarning: true
            },
            newContent: {
                contentUpdates: true,
                promotionEvent: true
            },
            outOfGame: {
                type: "all"
            },
            optional: {
                statChange: false,
                statDetailLevel: "summary"
            }
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
            analyticsConsent: {
                allowPsychologicalAnalysis: false,
                allowPersonalizedFeedback: false
            }
        },
        visualNovelGameplay: {
            textSpeed: "normal",
            textSpeedNumeric: 50,
            instantTextDisplay: false,
            autoPlayMode: "click",
            autoPlayDelayMs: 1500,
            autoPlaySpeedNumeric: 50,
            autoPlayEnabled: false,
            skipUnreadText: false,
            skipReadTextOnly: true,
            skipAllText: false,
            skipOnHold: true,
            transitionsEnabled: true,
            screenEffectsEnabled: true,
            textWindowOpacity: 0.8,
            masterVolume: 1.0,
            bgmVolume: 0.7,
            sfxVolume: 0.8,
            voiceVolume: 1.0,
            voicesEnabled: true,
            preferredVoiceLanguage: "original",
            showChoiceTimer: true,
            blurThumbnailsOfMatureContent: true,
            preferredArtStyles: [],
            preferredGameplayMechanics: [],
            assetPreloading: "essential",
            characterAnimationLevel: "full",
            backlog: {
                enableHistory: true,
                historyVoice: true,
                historyBack: true
            },
            choices: {
                highlightChoices: true,
                routePreview: false
            },
            saveLoad: {
                autoSave: true,
                saveFrequency: "scene"
            },
            decisions: {
                decisionWarning: true,
                importantMark: true
            },
            routeManagement: {
                routeProgress: true,
                showUnvisited: true,
                secretHints: false
            }
        },
    };
}


async function seedAdmin(User: mongoose.Model<IUser>) {
    try {
        if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
            throw new Error("ตัวแปรสภาพแวดล้อมสำหรับแอดมินขาดหายไป: ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD");
        }

        // ไม่ต้อง hash password ที่นี่แล้ว UserModel pre-save hook จะจัดการเอง
        const existingAdmin = await User.findOne({ $or: [{ email: ADMIN_EMAIL.toLowerCase() }, { username: ADMIN_USERNAME }] });

        // Data objects สำหรับ default values ที่สอดคล้องกับ Schema
        const adminProfileData: IUserProfile = {
            displayName: ADMIN_USERNAME,
            penNames: [ADMIN_USERNAME],
            primaryPenName: ADMIN_USERNAME,
            bio: "ผู้ดูแลระบบของแพลตฟอร์มนิยายภาพ DivWy",
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
            boardPostsCreatedCount: existingAdmin?.socialStats?.boardPostsCreatedCount || 0, // **เพิ่มใหม่**
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
            kycStatus: "verified",
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
            // การ merge ควรทำอย่างระมัดระวัง สำหรับ seed script การตั้งค่าใหม่จาก default อาจจะดีกว่า
            existingAdmin.profile = { ...existingAdmin.profile, ...adminProfileData };
            existingAdmin.trackingStats = { ...existingAdmin.trackingStats, ...adminTrackingStatsData };
            existingAdmin.socialStats = { ...existingAdmin.socialStats, ...adminSocialStatsData };
            existingAdmin.preferences = createDefaultPreferences(); // ใช้ default ที่ถูกต้องเสมอ
            existingAdmin.wallet = { ...existingAdmin.wallet, ...adminWalletData };
            existingAdmin.gamification = { ...existingAdmin.gamification, ...adminGamificationData };
            existingAdmin.verification = { ...existingAdmin.verification, ...adminVerificationData };
            existingAdmin.donationSettings = { ...existingAdmin.donationSettings, ...adminDonationSettingsData };
            existingAdmin.securitySettings = existingAdmin.securitySettings ? { ...existingAdmin.securitySettings, ...adminSecuritySettingsData } : adminSecuritySettingsData;
            existingAdmin.mentalWellbeingInsights = existingAdmin.mentalWellbeingInsights ? { ...existingAdmin.mentalWellbeingInsights, ...adminMentalWellbeingData } : adminMentalWellbeingData;
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
                console.warn(`⚠️ ProviderAccountId ของ Admin (${credAccount.providerAccountId}) ไม่ตรงกับ _id (${existingAdmin._id.toString()}). กำลังอัปเดต...`);
                credAccount.providerAccountId = existingAdmin._id.toString();
            }

            await existingAdmin.save(); // การ save() จะ trigger pre-save hook
            console.log(`✅ อัปเดตข้อมูลแอดมินสำเร็จ: ${ADMIN_EMAIL}`);
        } else {
            console.log("🌱 สร้างบัญชีผู้ใช้แอดมินใหม่...");
            // ใช้ new Model() และ save() เพื่อให้สามารถกำหนด providerAccountId จาก _id ได้
            const newAdmin = new User({
                email: ADMIN_EMAIL.toLowerCase(),
                username: ADMIN_USERNAME,
                password: ADMIN_PASSWORD, // ส่ง password แบบ plain text
                roles: ["Admin", "Writer", "Reader"],
                profile: adminProfileData,
                accounts: [], // จะเพิ่มด้านล่าง
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
                emailVerifiedAt: new Date(),
                isActive: true,
                isBanned: false,
                lastLoginAt: new Date(),
            });

            // ตั้งค่า providerAccountId โดยอ้างอิงจาก _id ที่ Mongoose สร้างขึ้น
            newAdmin.accounts.push({
                provider: "credentials",
                providerAccountId: newAdmin._id.toString(),
                type: "credentials",
            } as IAccount);

            await newAdmin.save();
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
        let author = await User.findOne({ $or: [{ email: AUTHOR_EMAIL.toLowerCase() }, { username: AUTHOR_USERNAME }] });

        // Data objects สำหรับ default values
        const authorProfileData: IUserProfile = {
            displayName: AUTHOR_USERNAME,
            penNames: [AUTHOR_USERNAME],
            primaryPenName: AUTHOR_USERNAME,
            bio: "นักเขียนนิยายภาพ มากประสบการณ์ พร้อมแบ่งปันจินตนาการผ่านตัวอักษรและภาพ",
            gender: "prefer_not_to_say",
        };
        const authorTrackingStatsData: IUserTrackingStats = {
            joinDate: author?.trackingStats?.joinDate || new Date(),
            firstLoginAt: author?.trackingStats?.firstLoginAt || new Date(),
            totalLoginDays: author?.trackingStats?.totalLoginDays || 1,
            totalNovelsRead: 0, totalEpisodesRead: 0, totalTimeSpentReadingSeconds: 0, totalCoinSpent: 0, totalRealMoneySpent: 0,
        };
        const authorSocialStatsData: IUserSocialStats = {
            followersCount: 0, followingCount: 0, novelsCreatedCount: 0, boardPostsCreatedCount: 0, commentsMadeCount: 0, ratingsGivenCount: 0, likesGivenCount: 0
        };
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
        
        // **ปรับปรุง**: แก้ไขโครงสร้าง IWriterStats ให้ตรงกับ Schema ใน User.ts
        // - ลบ `totalViewsReceived` ที่ไม่มีใน Schema
        // - เพิ่ม `activeNovelPromotions` และ `trendingNovels` ที่เป็น field ใหม่
        const authorWriterStatsData: IWriterStats = {
            totalNovelsPublished: 0,
            totalEpisodesPublished: 0,
            totalViewsAcrossAllNovels: 0,
            totalReadsAcrossAllNovels: 0,
            totalLikesReceivedOnNovels: 0,
            totalCommentsReceivedOnNovels: 0,
            totalEarningsToDate: 0,
            totalCoinsReceived: 0,
            totalRealMoneyReceived: 0,
            totalDonationsReceived: 0,
            writerSince: new Date(),
            novelPerformanceSummaries: new Types.DocumentArray<INovelPerformanceStats>([]),
            activeNovelPromotions: new Types.DocumentArray<IActiveNovelPromotionSummary>([]),
            trendingNovels: new Types.DocumentArray<ITrendingNovelSummary>([]),
            totalViewsReceived: undefined
        };

        if (author) {
            console.log(`ℹ️ ผู้ใช้ผู้เขียนมีอยู่แล้ว: ${author.email}`);
            author.email = AUTHOR_EMAIL.toLowerCase();
            author.username = AUTHOR_USERNAME;
            // ส่ง password แบบ plain text, pre-save hook จะ hash ให้
            author.password = AUTHOR_PASSWORD;
            author.roles = Array.from(new Set([...author.roles, "Writer", "Reader"]));
            author.profile = { ...author.profile, ...authorProfileData };
            author.trackingStats = { ...author.trackingStats, ...authorTrackingStatsData };
            author.socialStats = { ...author.socialStats, ...authorSocialStatsData };
            author.preferences = createDefaultPreferences(); // ใช้ default ที่ถูกต้องเสมอ
            author.wallet = { ...author.wallet, ...authorWalletData };
            author.gamification = { ...author.gamification, ...authorGamificationData };
            author.verification = { ...author.verification, ...authorVerificationData };
            author.donationSettings = { ...author.donationSettings, ...authorDonationSettingsData };
            author.securitySettings = author.securitySettings ? { ...author.securitySettings, ...authorSecuritySettingsData } : authorSecuritySettingsData;
            author.mentalWellbeingInsights = author.mentalWellbeingInsights ? { ...author.mentalWellbeingInsights, ...authorMentalWellbeingData } : authorMentalWellbeingData;
            // ตรวจสอบและสร้าง writerStats โดยใช้ข้อมูลที่ถูกต้อง
            author.writerStats = author.writerStats ? { ...author.writerStats, ...authorWriterStatsData } : authorWriterStatsData;
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
                 console.warn(`⚠️ ProviderAccountId ของ Author (${credAccount.providerAccountId}) ไม่ตรงกับ _id (${author._id.toString()}). กำลังอัปเดต...`);
                 credAccount.providerAccountId = author._id.toString();
            }

            await author.save(); // การ save() จะ trigger pre-save hook
            console.log(`✅ อัปเดตข้อมูลผู้เขียนสำเร็จ: ${AUTHOR_EMAIL}`);
        } else {
            console.log("🌱 สร้างบัญชีผู้ใช้สำหรับเป็นผู้เขียนนิยายใหม่...");
            
            const newAuthor = new User({
                email: AUTHOR_EMAIL.toLowerCase(),
                username: AUTHOR_USERNAME,
                password: AUTHOR_PASSWORD, // ส่ง password แบบ plain text
                roles: ["Writer", "Reader"],
                profile: authorProfileData,
                accounts: [], // จะเพิ่มด้านล่าง
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
                emailVerifiedAt: new Date(),
                isActive: true,
                isBanned: false,
                lastLoginAt: new Date(),
            });

            newAuthor.accounts.push({
                provider: "credentials",
                providerAccountId: newAuthor._id.toString(),
                type: "credentials"
            } as IAccount);
            
            author = await newAuthor.save();
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
        console.error("❌ กระบวนการ seed ล้มเหลว:", err.message);
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