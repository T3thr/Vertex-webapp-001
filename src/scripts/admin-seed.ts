// src/scripts/admin-seed.ts

import mongoose from "mongoose";
import { hash } from "bcryptjs";
import dbConnect from "@/backend/lib/mongodb";
import { config } from "dotenv";

// Load environment variables from .env file
config({ path: ".env" });

// Load environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function seedAdmin() {
  try {
    // Validate environment variables
    if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
      throw new Error(
        "ตัวแปรสภาพแวดล้อมที่จำเป็นขาดหายไป: ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD ใน .env"
      );
    }

    // Connect to MongoDB
    console.log("กำลังเชื่อมต่อกับ MongoDB...");
    await dbConnect();

    // Get User model
    const UserModel = (await import("@/backend/models/User")).default;

    // Check if admin user already exists
    const existingAdmin = await UserModel().findOne({
      $or: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }],
    });

    if (existingAdmin) {
      console.log(`ผู้ใช้แอดมินมีอยู่แล้ว: ${existingAdmin.email}`);

      // Update existing admin user
      existingAdmin.email = ADMIN_EMAIL.toLowerCase();
      existingAdmin.username = ADMIN_USERNAME;
      existingAdmin.password = await hash(ADMIN_PASSWORD, 12); // รีแฮชรหัสผ่านใหม่
      existingAdmin.role = "Admin";
      existingAdmin.profile.displayName = ADMIN_USERNAME;
      existingAdmin.profile.bio = "ผู้ดูแลระบบของแพลตฟอร์มนิยายภาพ";
      existingAdmin.stats.followers = 0;
      existingAdmin.stats.following = 0;
      existingAdmin.stats.novels = 0;
      existingAdmin.stats.purchases = 0;
      existingAdmin.preferences.language = "th";
      existingAdmin.preferences.theme = "system";
      existingAdmin.preferences.notifications.email = true;
      existingAdmin.preferences.notifications.push = true;
      existingAdmin.wallet.balance = 0;
      existingAdmin.wallet.currency = "THB";
      existingAdmin.isEmailVerified = true;
      existingAdmin.lastLogin = new Date();
      existingAdmin.isActive = true;

      // Save the updated admin user
      await existingAdmin.save();
      console.log(`อัพเดตข้อมูลแอดมินสำเร็จ: ${ADMIN_EMAIL}`);
      return;
    }

    // Create new admin user if not exists
    const adminUser = new (UserModel())({
      email: ADMIN_EMAIL.toLowerCase(),
      username: ADMIN_USERNAME,
      password: await hash(ADMIN_PASSWORD, 12), // Hash password before saving
      role: "Admin",
      profile: {
        displayName: ADMIN_USERNAME,
        bio: "ผู้ดูแลระบบของแพลตฟอร์มนิยายภาพ",
      },
      stats: {
        followers: 0,
        following: 0,
        novels: 0,
        purchases: 0,
      },
      preferences: {
        language: "th",
        theme: "system",
        notifications: {
          email: true,
          push: true,
        },
      },
      wallet: {
        balance: 0,
        currency: "THB",
      },
      isEmailVerified: true,
      lastLogin: new Date(),
      isActive: true,
    });

    await adminUser.save();
    console.log(`สร้างผู้ใช้แอดมินสำเร็จ: ${ADMIN_EMAIL}`);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการสร้างผู้ใช้แอดมิน:", error);
    throw error;
  } finally {
    // Close MongoDB connection
    try {
      await mongoose.connection.close();
      console.log("ปิดการเชื่อมต่อ MongoDB แล้ว");
    } catch (closeError) {
      console.error("เกิดข้อผิดพลาดในการปิดการเชื่อมต่อ MongoDB:", closeError);
    }
  }
}

// Run the seed function
async function main() {
  try {
    await seedAdmin();
    process.exit(0);
  } catch (err) {
    console.error("กระบวนการสร้างข้อมูลล้มเหลว:", err);
    process.exit(1);
  }
}

main();
