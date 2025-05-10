// src/scripts/admin-seed.ts

import mongoose from "mongoose";
import { config } from "dotenv";
import dbConnect from "@/backend/lib/mongodb";
import { IUser } from "@/backend/models/User";

// โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
// Loading environment variables from .env file
config({ path: ".env" });

// โหลดตัวแปรสภาพแวดล้อม
// Load environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const AUTHOR_EMAIL = process.env.AUTHOR_EMAIL;
const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME;
const AUTHOR_PASSWORD = process.env.AUTHOR_PASSWORD;

/**
 * สร้างหรืออัปเดตผู้ใช้แอดมิน
 * Create or update admin user
 * @param User - Mongoose model for User
 */
async function seedAdmin(User: mongoose.Model<IUser>) {
  try {
    // ตรวจสอบตัวแปรสภาพแวดล้อม
    // Check environment variables
    if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
      throw new Error(
        "ตัวแปรสภาพแวดล้อมที่จำเป็นสำหรับแอดมินขาดหายไป: ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD ใน .env"
      );
    }

    // ตรวจสอบว่ามีผู้ใช้แอดมินอยู่แล้วหรือไม่
    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      $or: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }],
    });

    if (existingAdmin) {
      console.log(`ℹ️ ผู้ใช้แอดมินมีอยู่แล้ว: ${existingAdmin.email}`);

      // อัปเดตข้อมูลผู้ใช้แอดมิน
      // Update admin user information
      existingAdmin.email = ADMIN_EMAIL.toLowerCase();
      existingAdmin.username = ADMIN_USERNAME;
      existingAdmin.password = ADMIN_PASSWORD; // รหัสผ่านจะถูกแฮชใน pre("save") middleware
      existingAdmin.role = "Admin";
      existingAdmin.profile = {
        displayName: ADMIN_USERNAME,
        bio: "ผู้ดูแลระบบของแพลตฟอร์มนิยายภาพ",
        ...existingAdmin.profile, // รักษาค่าเดิมของฟิลด์ที่ไม่ได้ระบุ
      };
      existingAdmin.trackingStats = {
        totalLoginDays: existingAdmin.trackingStats.totalLoginDays || 0,
        totalNovelsRead: existingAdmin.trackingStats.totalNovelsRead || 0,
        totalEpisodesRead: existingAdmin.trackingStats.totalEpisodesRead || 0,
        totalCoinSpent: existingAdmin.trackingStats.totalCoinSpent || 0,
        totalRealMoneySpent: existingAdmin.trackingStats.totalRealMoneySpent || 0,
        lastNovelReadId: existingAdmin.trackingStats.lastNovelReadId,
        lastNovelReadAt: existingAdmin.trackingStats.lastNovelReadAt,
        joinDate: existingAdmin.trackingStats.joinDate || new Date(),
      };
      existingAdmin.socialStats = {
        followersCount: existingAdmin.socialStats.followersCount || 0,
        followingCount: existingAdmin.socialStats.followingCount || 0,
        novelsCreatedCount: existingAdmin.socialStats.novelsCreatedCount || 0,
        commentsMadeCount: existingAdmin.socialStats.commentsMadeCount || 0,
        ratingsGivenCount: existingAdmin.socialStats.ratingsGivenCount || 0,
        likesGivenCount: existingAdmin.socialStats.likesGivenCount || 0,
      };
      existingAdmin.preferences = {
        language: "th",
        theme: "system",
        notifications: {
          email: true,
          push: true,
          novelUpdates: true,
          comments: true,
          donations: true,
          newFollowers: true,
          systemAnnouncements: true,
        },
        privacy: {
          showActivityStatus: existingAdmin.preferences.privacy.showActivityStatus ?? true,
          profileVisibility: existingAdmin.preferences.privacy.profileVisibility || "public",
          readingHistoryVisibility: existingAdmin.preferences.privacy.readingHistoryVisibility || "followersOnly",
        },
      };
      existingAdmin.wallet = {
        coinBalance: existingAdmin.wallet.coinBalance || 0,
        lastCoinTransactionAt: existingAdmin.wallet.lastCoinTransactionAt,
      };
      existingAdmin.gamification = {
        level: existingAdmin.gamification.level || 1,
        experiencePoints: existingAdmin.gamification.experiencePoints || 0, // Fixed: Changed `experience` to `experiencePoints`
        achievements: existingAdmin.gamification.achievements || [],
        badges: existingAdmin.gamification.badges || [],
        streaks: {
          currentLoginStreak: existingAdmin.gamification.streaks.currentLoginStreak || 0,
          longestLoginStreak: existingAdmin.gamification.streaks.longestLoginStreak || 0,
          lastLoginDate: existingAdmin.gamification.streaks.lastLoginDate,
        },
      };
      existingAdmin.writerVerification = {
        status: "none",
        submittedAt: undefined,
        verifiedAt: undefined,
        rejectedReason: undefined,
        documents: existingAdmin.writerVerification?.documents || [],
      };
      existingAdmin.isEmailVerified = true;
      existingAdmin.isActive = true;
      existingAdmin.isBanned = false;
      existingAdmin.lastLoginAt = new Date();

      await existingAdmin.save();
      console.log(`✅ อัปเดตข้อมูลแอดมินสำเร็จ: ${ADMIN_EMAIL}`);
      return;
    }

    // สร้างผู้ใช้แอดมินใหม่ถ้ายังไม่มี
    // Create new admin user if none exists
    console.log("🌱 สร้างบัญชีผู้ใช้แอดมิน...");
    const adminUser = await User.create({
      email: ADMIN_EMAIL.toLowerCase(),
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD, // รหัสผ่านจะถูกแฮชใน pre("save") middleware
      role: "Admin",
      profile: {
        displayName: ADMIN_USERNAME,
        bio: "ผู้ดูแลระบบของแพลตฟอร์มนิยายภาพ",
      },
      accounts: [], // ปล่อยให้ middleware จัดการเพิ่ม credentials account
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
          systemAnnouncements: true,
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
        experiencePoints: 0, // Fixed: Changed `experience` to `experiencePoints`
        achievements: [],
        badges: [],
        streaks: {
          currentLoginStreak: 0,
          longestLoginStreak: 0,
        },
      },
      writerVerification: {
        status: "none",
        documents: [],
      },
      isEmailVerified: true,
      isActive: true,
      isBanned: false,
      lastLoginAt: new Date(),
    });

    console.log(`✅ สร้างผู้ใช้แอดมินสำเร็จ: ${ADMIN_EMAIL}`);
  } catch (error: any) {
    console.error("❌ เกิดข้อผิดพลาดในการสร้าง/อัปเดตผู้ใช้แอดมิน:", error.message);
    throw error;
  }
}

/**
 * ตรวจสอบหรือสร้างผู้ใช้สำหรับเป็นผู้เขียนนิยาย
 * Check or create user for novel author
 * @param User - Mongoose model for User
 * @returns Author ID
 */
async function ensureAuthorExists(User: mongoose.Model<IUser>) {
  try {
    // ตรวจสอบตัวแปรสภาพแวดล้อม
    // Check environment variables
    if (!AUTHOR_EMAIL || !AUTHOR_USERNAME || !AUTHOR_PASSWORD) {
      throw new Error(
        "ตัวแปรสภาพแวดล้อมที่จำเป็นสำหรับผู้เขียนขาดหายไป: AUTHOR_EMAIL, AUTHOR_USERNAME, AUTHOR_PASSWORD ใน .env"
      );
    }

    // ตรวจสอบว่ามีผู้เขียนอยู่แล้วหรือไม่
    // Check if author user already exists
    let author = await User.findOne({ username: AUTHOR_USERNAME });

    if (!author) {
      console.log("🌱 สร้างบัญชีผู้ใช้สำหรับเป็นผู้เขียนนิยาย...");

      author = await User.create({
        username: AUTHOR_USERNAME,
        email: AUTHOR_EMAIL.toLowerCase(),
        password: AUTHOR_PASSWORD, // รหัสผ่านจะถูกแฮชใน pre("save") middleware
        role: "Writer",
        profile: {
          displayName: "นักเขียนนิยาย",
          bio: "ผู้เขียนนิยายหลากหลายแนว รักการเล่าเรื่องและสร้างโลกจินตนาการ",
        },
        accounts: [], // ปล่อยให้ middleware จัดการเพิ่ม credentials account
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
            systemAnnouncements: true,
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
          experiencePoints: 0, // Fixed: Changed `experience` to `experiencePoints`
          achievements: [],
          badges: [],
          streaks: {
            currentLoginStreak: 0,
            longestLoginStreak: 0,
          },
        },
        writerVerification: {
          status: "verified", // ตั้งเป็น verified โดยตรงสำหรับ seed
          verifiedAt: new Date(),
          documents: [],
        },
        isEmailVerified: true,
        isActive: true,
        isBanned: false,
        lastLoginAt: new Date(),
      });

      console.log("✅ สร้างบัญชีผู้เขียนสำเร็จ");
    } else {
      console.log("ℹ️ มีบัญชีผู้เขียนอยู่แล้ว");

      // อัปเดตข้อมูลผู้เขียนถ้ามีอยู่แล้ว
      // Update author information if already exists
      author.email = AUTHOR_EMAIL.toLowerCase();
      author.username = AUTHOR_USERNAME;
      author.password = AUTHOR_PASSWORD; // รหัสผ่านจะถูกแฮชใน pre("save") middleware
      author.role = "Writer";
      author.profile = {
        displayName: "นักเขียนนิยาย",
        bio: "ผู้เขียนนิยายหลากหลายแนว รักการเล่าเรื่องและสร้างโลกจินตนาการ",
        ...author.profile, // รักษาค่าเดิมของฟิลด์ที่ไม่ได้ระบุ
      };
      author.trackingStats = {
        totalLoginDays: author.trackingStats.totalLoginDays || 0,
        totalNovelsRead: author.trackingStats.totalNovelsRead || 0,
        totalEpisodesRead: author.trackingStats.totalEpisodesRead || 0,
        totalCoinSpent: author.trackingStats.totalCoinSpent || 0,
        totalRealMoneySpent: author.trackingStats.totalRealMoneySpent || 0,
        lastNovelReadId: author.trackingStats.lastNovelReadId,
        lastNovelReadAt: author.trackingStats.lastNovelReadAt,
        joinDate: author.trackingStats.joinDate || new Date(),
      };
      author.socialStats = {
        followersCount: author.socialStats.followersCount || 0,
        followingCount: author.socialStats.followingCount || 0,
        novelsCreatedCount: author.socialStats.novelsCreatedCount || 0,
        commentsMadeCount: author.socialStats.commentsMadeCount || 0,
        ratingsGivenCount: author.socialStats.ratingsGivenCount || 0,
        likesGivenCount: author.socialStats.likesGivenCount || 0,
      };
      author.preferences = {
        language: "th",
        theme: "system",
        notifications: {
          email: true,
          push: true,
          novelUpdates: true,
          comments: true,
          donations: true,
          newFollowers: true,
          systemAnnouncements: true,
        },
        privacy: {
          showActivityStatus: author.preferences.privacy.showActivityStatus ?? true,
          profileVisibility: author.preferences.privacy.profileVisibility || "public",
          readingHistoryVisibility: author.preferences.privacy.readingHistoryVisibility || "followersOnly",
        },
      };
      author.wallet = {
        coinBalance: author.wallet.coinBalance || 0,
        lastCoinTransactionAt: author.wallet.lastCoinTransactionAt,
      };
      author.gamification = {
        level: author.gamification.level || 1,
        experiencePoints: author.gamification.experiencePoints || 0, // Fixed: Changed `experience` to `experiencePoints`
        achievements: author.gamification.achievements || [],
        badges: author.gamification.badges || [],
        streaks: {
          currentLoginStreak: author.gamification.streaks.currentLoginStreak || 0,
          longestLoginStreak: author.gamification.streaks.longestLoginStreak || 0,
          lastLoginDate: author.gamification.streaks.lastLoginDate,
        },
      };
      author.writerVerification = {
        status: "verified",
        submittedAt: author.writerVerification?.submittedAt,
        verifiedAt: author.writerVerification?.verifiedAt || new Date(),
        rejectedReason: undefined,
        documents: author.writerVerification?.documents || [],
      };
      author.isEmailVerified = true;
      author.isActive = true;
      author.isBanned = false;
      author.lastLoginAt = new Date();

      await author.save();
      console.log("✅ อัปเดตบัญชีผู้เขียนสำเร็จ");
    }

    return author._id;
  } catch (error: any) {
    console.error("❌ เกิดข้อผิดพลาดในการสร้าง/อัปเดตบัญชีผู้เขียน:", error.message);
    throw error;
  }
}

/**
 * เรียกใช้งานฟังก์ชัน seed
 * Run the seed function
 */
async function main() {
  try {
    // เชื่อมต่อ MongoDB
    // Connect to MongoDB
    console.log("🔗 กำลังเชื่อมต่อกับ MongoDB...");
    await dbConnect();
    console.log("✅ [MongoDB] เชื่อมต่อสำเร็จ (NovelMaze)");

    // โหลด User model
    // Load User model
    const UserModel = (await import("@/backend/models/User")).default;
    const User = UserModel();

    // รันการ seed สำหรับแอดมินและผู้เขียน
    // Run seeding for admin and author
    await seedAdmin(User);
    await ensureAuthorExists(User);

    console.log("🎉 กระบวนการ seed สำเร็จ");
  } catch (err: any) {
    console.error("❌ กระบวนการ seed ล้มเหลว:", err.message);
    process.exit(1);
  } finally {
    // ปิดการเชื่อมต่อ MongoDB
    // Close MongoDB connection
    try {
      await mongoose.connection.close();
      console.log("🔌 ปิดการเชื่อมต่อ MongoDB แล้ว");
    } catch (closeError: any) {
      console.error("❌ เกิดข้อผิดพลาดในการปิดการเชื่อมต่อ MongoDB:", closeError.message);
    }
    process.exit(0);
  }
}

main();