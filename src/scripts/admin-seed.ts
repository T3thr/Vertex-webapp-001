// src/scripts/admin-seed.ts
// REWRITTEN: This script is updated to work with a modularized database schema.
// It now correctly creates a core User and then upserts related documents
// in their respective collections (UserProfile, UserSecurity, etc.).

import mongoose, { Types, Document } from "mongoose";
import { config } from "dotenv";
import dbConnect from "@/backend/lib/mongodb";

// Import all necessary Models and their Interfaces from their correct source files
import UserModel, { IUser, IAccount } from "@/backend/models/User";
import UserProfileModel, { IUserProfile } from "@/backend/models/UserProfile";
import UserTrackingModel from "@/backend/models/UserTracking";
import UserSettingsModel, { IUserSettings } from "@/backend/models/UserSettings";
import UserGamificationModel from "@/backend/models/UserGamification";
import UserSecurityModel, { IUserSecurity } from "@/backend/models/UserSecurity";
import WriterStatsModel, { IWriterStatsDoc as IWriterStats } from "@/backend/models/WriterStats";
import MentalWellbeingInsightsModel from "@/backend/models/MentalWellbeingInsights";

config({ path: ".env" });

const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD, AUTHOR_EMAIL, AUTHOR_USERNAME, AUTHOR_PASSWORD } = process.env;

/**
 * @function createDefaultPreferences
 * @description Creates a default preferences plain object for upserting.
 * @returns A plain object that can be used to create an IUserSettings document.
 */
function createDefaultPreferences() {
    // This function returns a plain object, not a typed Mongoose document.
    // Mongoose will handle type casting on creation.
    return {
        language: "th",
        display: {
            theme: "system",
            reading: {
                fontFamily: "Sarabun",
                fontSize: 16, // Use number instead of string "medium"
                lineHeight: 1.6,
                textAlignment: "left",
                readingModeLayout: "scrolling",
            },
            accessibility: {
                dyslexiaFriendlyFont: false,
                highContrastMode: false,
                reducedMotion: false,
            },
        },
        notifications: {
            masterNotificationsEnabled: true,
            email: { enabled: true },
            push: { enabled: true },
            inApp: { enabled: true },
        },
        contentAndPrivacy: {
            showMatureContent: false,
            profileVisibility: "public",
            readingHistoryVisibility: "followers_only",
            showActivityStatus: true,
            allowDirectMessagesFrom: "followers",
        },
        visualNovelGameplay: {
            textSpeedValue: 50,
            autoPlayDelayMs: 1500,
        },
    };
}


async function seedAdmin() {
        if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
        throw new Error("Admin environment variables are missing (ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD).");
    }

    console.log("🌱 Seeding Admin User...");
    
    // Find or create the core user document
    let adminUser = await UserModel.findOne({ $or: [{ email: ADMIN_EMAIL.toLowerCase() }, { username: ADMIN_USERNAME }] });

    if (adminUser) {
        console.log(`ℹ️ Admin user ${ADMIN_EMAIL} already exists. Updating password and roles...`);
        adminUser.password = ADMIN_PASSWORD; // Let pre-save hook handle hashing
        adminUser.roles = ["Admin", "Writer", "Reader"];
        } else {
        console.log(`✨ Creating new Admin user for ${ADMIN_EMAIL}...`);
        adminUser = new UserModel({
                email: ADMIN_EMAIL.toLowerCase(),
                username: ADMIN_USERNAME,
            password: ADMIN_PASSWORD,
                roles: ["Admin", "Writer", "Reader"],
                isEmailVerified: true,
                emailVerifiedAt: new Date(),
                isActive: true,
            });
        adminUser.accounts.push({
                provider: "credentials",
            providerAccountId: adminUser._id.toString(),
                type: "credentials",
            } as IAccount);
    }
    await adminUser.save();
    const adminId = adminUser._id;

    // Upsert (update or insert) related documents in other collections
    await UserProfileModel.findOneAndUpdate({ userId: adminId }, { userId: adminId, displayName: ADMIN_USERNAME, primaryPenName: ADMIN_USERNAME }, { upsert: true });
    await UserSecurityModel.findOneAndUpdate({ userId: adminId }, { userId: adminId, verification: { kycStatus: "verified", kycVerifiedAt: new Date() } }, { upsert: true });
    await UserSettingsModel.findOneAndUpdate({ userId: adminId }, { userId: adminId, ...createDefaultPreferences() }, { upsert: true });
    await UserGamificationModel.findOneAndUpdate({ userId: adminId }, { userId: adminId, level: 1, experiencePoints: 0 }, { upsert: true });
    await UserTrackingModel.findOneAndUpdate({ userId: adminId }, { userId: adminId, joinDate: new Date() }, { upsert: true });
    await MentalWellbeingInsightsModel.findOneAndUpdate({ userId: adminId }, { userId: adminId }, { upsert: true });

    console.log(`✅ Admin user seeded successfully: ${adminUser.email}`);
}

async function ensureAuthorExists() {
        if (!AUTHOR_EMAIL || !AUTHOR_USERNAME || !AUTHOR_PASSWORD) {
        throw new Error("Author environment variables are missing (AUTHOR_EMAIL, AUTHOR_USERNAME, AUTHOR_PASSWORD).");
        }
    
    console.log("🌱 Seeding Author User...");

    let authorUser = await UserModel.findOne({ $or: [{ email: AUTHOR_EMAIL.toLowerCase() }, { username: AUTHOR_USERNAME }] });

    if (authorUser) {
        console.log(`ℹ️ Author user ${AUTHOR_EMAIL} already exists. Updating password and roles...`);
        authorUser.password = AUTHOR_PASSWORD;
        authorUser.roles = Array.from(new Set([...authorUser.roles, "Writer", "Reader"]));
        } else {
        console.log(`✨ Creating new Author user for ${AUTHOR_EMAIL}...`);
        authorUser = new UserModel({
                email: AUTHOR_EMAIL.toLowerCase(),
                username: AUTHOR_USERNAME,
            password: AUTHOR_PASSWORD,
                roles: ["Writer", "Reader"],
                isEmailVerified: true,
                emailVerifiedAt: new Date(),
                isActive: true,
            });
        authorUser.accounts.push({
                provider: "credentials",
            providerAccountId: authorUser._id.toString(),
            type: "credentials",
            } as IAccount);
    }
    await authorUser.save();
    const authorId = authorUser._id;

    // Upsert related documents
    await UserProfileModel.findOneAndUpdate({ userId: authorId }, { userId: authorId, displayName: AUTHOR_USERNAME, primaryPenName: AUTHOR_USERNAME }, { upsert: true });
    await UserSecurityModel.findOneAndUpdate({ userId: authorId }, { userId: authorId, verification: { kycStatus: "verified", kycVerifiedAt: new Date() } }, { upsert: true });
    await WriterStatsModel.findOneAndUpdate({ userId: authorId }, { userId: authorId, writerSince: new Date() }, { upsert: true });
    await UserSettingsModel.findOneAndUpdate({ userId: authorId }, { userId: authorId, ...createDefaultPreferences() }, { upsert: true });
    await UserGamificationModel.findOneAndUpdate({ userId: authorId }, { userId: authorId, level: 1, experiencePoints: 0 }, { upsert: true });
    await UserTrackingModel.findOneAndUpdate({ userId: authorId }, { userId: authorId, joinDate: new Date() }, { upsert: true });
    await MentalWellbeingInsightsModel.findOneAndUpdate({ userId: authorId }, { userId: authorId }, { upsert: true });

    console.log(`✅ Author user seeded successfully: ${authorUser.email}`);
}

async function main() {
    try {
        console.log("🔗 Connecting to MongoDB...");
        await dbConnect();
        console.log("✅ [MongoDB] Connected");

        await seedAdmin();
        await ensureAuthorExists();

        console.log("🎉 Seeding process completed successfully.");
    } catch (err: any) {
        console.error("❌ Seeding process failed:", err.message);
        process.exit(1);
    } finally {
        try {
            await mongoose.connection.close();
            console.log("🔌 MongoDB connection closed.");
        } catch (closeError: any) {
            console.error("❌ Error closing MongoDB connection:", closeError.message);
        }
        process.exit(0);
    }
}

main();