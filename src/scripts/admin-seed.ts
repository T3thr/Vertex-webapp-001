import mongoose from "mongoose";
import { hash } from "bcryptjs";
import dbConnect from "@/backend/lib/mongodb";
import { config } from "dotenv";

// Load environment variables from .env file
config({ path: ".env.local" });

// Load environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function seedAdmin() {
  try {
    // Validate environment variables
    if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
      throw new Error(
        "Missing required environment variables: ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD in .env.local"
      );
    }

    // Connect to MongoDB
    console.log("Attempting to connect to MongoDB...");
    await dbConnect();

    // Get or initialize User model
    const UserModel = mongoose.models.User || 
      mongoose.model("User", (await import("@/backend/models/User")).default().schema);

    // Check if admin user already exists
    const existingAdmin = await UserModel.findOne({
      $or: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }],
    });

    if (existingAdmin) {
      console.log(`Admin user already exists: ${existingAdmin.email}`);
      return;
    }

    // Hash admin password
    const hashedPassword = await hash(ADMIN_PASSWORD, 12);

    // Create new admin user
    const adminUser = new UserModel({
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      password: hashedPassword,
      role: "Admin",
      profile: {
        displayName: ADMIN_USERNAME,
        avatar: "", // Optional: Add default avatar URL
        bio: "Administrator of the visual novel platform",
      },
      isEmailVerified: true, // Admins don't need email verification
      lastLogin: new Date(),
      novels: [],
      purchases: [],
    });

    await adminUser.save();
    console.log(`Admin user created successfully: ${ADMIN_EMAIL}`);
  } catch (error) {
    console.error("Error seeding admin user:", error);
    throw error;
  } finally {
    // Close MongoDB connection
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
    } catch (closeError) {
      console.error("Error closing MongoDB connection:", closeError);
    }
  }
}

// Run the seed function
async function main() {
  try {
    await seedAdmin();
    process.exit(0);
  } catch (err) {
    console.error("Seed process failed:", err);
    process.exit(1);
  }
}

main();