// src/scripts/admin-seed.ts

import mongoose from "mongoose";
import { config } from "dotenv";
import dbConnect from "@/backend/lib/mongodb";
import { IUser } from "@/backend/models/User";

// Load environment variables from .env file
config({ path: ".env" });

// Load environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const AUTHOR_EMAIL = process.env.AUTHOR_EMAIL;
const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME;
const AUTHOR_PASSWORD = process.env.AUTHOR_PASSWORD;

/**
 * สร้างหรืออัปเดตผู้ใช้แอดมิน
 * @param User - Mongoose model for User
 */
async function seedAdmin(User: mongoose.Model<IUser>) {
  try {
    // ตรวจสอบตัวแปรสภาพแวดล้อม
    if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
      throw new Error(
        "ตัวแปรสภาพแวดล้อมที่จำเป็นสำหรับแอดมินขาดหายไป: ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD ใน .env"
      );
    }

    // ตรวจสอบว่ามีผู้ใช้แอดมินอยู่แล้วหรือไม่
    const existingAdmin = await User.findOne({
      $or: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }],
    });

    if (existingAdmin) {
      console.log(`ℹ️ ผู้ใช้แอดมินมีอยู่แล้ว: ${existingAdmin.email}`);

      // อัปเดตข้อมูลผู้ใช้แอดมิน
      existingAdmin.email = ADMIN_EMAIL.toLowerCase();
      existingAdmin.username = ADMIN_USERNAME;
      existingAdmin.password = ADMIN_PASSWORD; // รหัสผ่านจะถูกแฮชใน pre("save") middleware
      existingAdmin.role = "Admin";
      existingAdmin.profile = {
        displayName: ADMIN_USERNAME,
        bio: "ผู้ดูแลระบบของแพลตฟอร์มนิยายภาพ",
        ...existingAdmin.profile, // รักษาค่าเดิมของฟิลด์ที่ไม่ได้ระบุ
      };
      existingAdmin.stats = {
        followersCount: existingAdmin.stats.followersCount || 0,
        followingCount: existingAdmin.stats.followingCount || 0,
        novelsCount: existingAdmin.stats.novelsCount || 0,
        purchasesCount: existingAdmin.stats.purchasesCount || 0,
        donationsReceivedAmount: existingAdmin.stats.donationsReceivedAmount || 0,
        donationsMadeAmount: existingAdmin.stats.donationsMadeAmount || 0,
        totalEpisodesSoldCount: existingAdmin.stats.totalEpisodesSoldCount || 0,
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
        },
      };
      existingAdmin.wallet = {
        balance: existingAdmin.wallet?.balance || 0,
        currency: "THB",
        lastTransactionAt: existingAdmin.wallet?.lastTransactionAt,
      };
      existingAdmin.gamification = {
        level: existingAdmin.gamification?.level || 1,
        experience: existingAdmin.gamification?.experience || 0,
        streaks: {
          currentLoginStreak: existingAdmin.gamification?.streaks?.currentLoginStreak || 0,
          longestLoginStreak: existingAdmin.gamification?.streaks?.longestLoginStreak || 0,
          lastLoginDate: existingAdmin.gamification?.streaks?.lastLoginDate,
        },
      };
      existingAdmin.writerVerification = {
        status: "none",
        submittedAt: undefined,
        verifiedAt: undefined,
        rejectedReason: undefined,
        documents: [],
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
      stats: {
        followersCount: 0,
        followingCount: 0,
        novelsCount: 0,
        purchasesCount: 0,
        donationsReceivedAmount: 0,
        donationsMadeAmount: 0,
        totalEpisodesSoldCount: 0,
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
        },
      },
      wallet: {
        balance: 0,
        currency: "THB",
      },
      gamification: {
        level: 1,
        experience: 0,
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
 * @param User - Mongoose model for User
 * @returns Author ID
 */
async function ensureAuthorExists(User: mongoose.Model<IUser>) {
  try {
    // ตรวจสอบตัวแปรสภาพแวดล้อม
    if (!AUTHOR_EMAIL || !AUTHOR_USERNAME || !AUTHOR_PASSWORD) {
      throw new Error(
        "ตัวแปรสภาพแวดล้อมที่จำเป็นสำหรับผู้เขียนขาดหายไป: AUTHOR_EMAIL, AUTHOR_USERNAME, AUTHOR_PASSWORD ใน .env"
      );
    }

    // ตรวจสอบว่ามีผู้เขียนอยู่แล้วหรือไม่
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
        stats: {
          followersCount: 0,
          followingCount: 0,
          novelsCount: 0,
          purchasesCount: 0,
          donationsReceivedAmount: 0,
          donationsMadeAmount: 0,
          totalEpisodesSoldCount: 0,
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
          },
        },
        wallet: {
          balance: 0,
          currency: "THB",
        },
        gamification: {
          level: 1,
          experience: 0,
          streaks: {
            currentLoginStreak: 0,
            longestLoginStreak: 0,
          },
        },
        writerVerification: {
          status: "verified", // ตั้งเป็น verified โดยตรงสำหรับ seed
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
      author.email = AUTHOR_EMAIL.toLowerCase();
      author.username = AUTHOR_USERNAME;
      author.password = AUTHOR_PASSWORD; // รหัสผ่านจะถูกแฮชใน pre("save") middleware
      author.role = "Writer";
      author.profile = {
        displayName: "นักเขียนนิยาย",
        bio: "ผู้เขียนนิยายหลากหลายแนว รักการเล่าเรื่องและสร้างโลกจินตนาการ",
        ...author.profile, // รักษาค่าเดิมของฟิลด์ที่ไม่ได้ระบุ
      };
      author.stats = {
        followersCount: author.stats.followersCount || 0,
        followingCount: author.stats.followingCount || 0,
        novelsCount: author.stats.novelsCount || 0,
        purchasesCount: author.stats.purchasesCount || 0,
        donationsReceivedAmount: author.stats.donationsReceivedAmount || 0,
        donationsMadeAmount: author.stats.donationsMadeAmount || 0,
        totalEpisodesSoldCount: author.stats.totalEpisodesSoldCount || 0,
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
        },
      };
      author.wallet = {
        balance: author.wallet?.balance || 0,
        currency: "THB",
        lastTransactionAt: author.wallet?.lastTransactionAt,
      };
      author.gamification = {
        level: author.gamification?.level || 1,
        experience: author.gamification?.experience || 0,
        streaks: {
          currentLoginStreak: author.gamification?.streaks?.currentLoginStreak || 0,
          longestLoginStreak: author.gamification?.streaks?.longestLoginStreak || 0,
          lastLoginDate: author.gamification?.streaks?.lastLoginDate,
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
 */
async function main() {
  try {
    // เชื่อมต่อ MongoDB
    console.log("🔗 กำลังเชื่อมต่อกับ MongoDB...");
    await dbConnect();
    console.log("✅ [MongoDB] เชื่อมต่อสำเร็จ (NovelMaze)");

    // โหลด User model
    const UserModel = (await import("@/backend/models/User")).default;
    const User = UserModel();

    // รันการ seed สำหรับแอดมินและผู้เขียน
    await seedAdmin(User);
    await ensureAuthorExists(User);

    console.log("🎉 กระบวนการ seed สำเร็จ");
  } catch (err: any) {
    console.error("❌ กระบวนการ seed ล้มเหลว:", err.message);
    process.exit(1);
  } finally {
    // ปิดการเชื่อมต่อ MongoDB
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