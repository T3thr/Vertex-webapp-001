import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUserPreferences } from "@/backend/models/User";
import { z } from "zod";
import mongoose from "mongoose";

// Zod schema for validating settings updates
const updateSettingsSchema = z.object({
  preferences: z.object({
    display: z.object({
      theme: z.enum(["light", "dark", "system", "sepia"]).optional(),
      reading: z.object({
        fontSize: z.enum(["small", "medium", "large"]).optional(),
        readingModeLayout: z.enum(["paginated", "scrolling"]).optional(),
        fontFamily: z.string().optional(),
        lineHeight: z.number().optional(),
        textAlignment: z.enum(["left", "justify"]).optional(),
      }).optional(),
      accessibility: z.object({
        dyslexiaFriendlyFont: z.boolean().optional(),
        highContrastMode: z.boolean().optional(),
      }).optional(),
    }).optional(),
    notifications: z.object({
      masterNotificationsEnabled: z.boolean().optional(),
      email: z.object({
        enabled: z.boolean().optional(),
        newsletter: z.boolean().optional(),
        novelUpdatesFromFollowing: z.boolean().optional(),
        newFollowers: z.boolean().optional(),
        commentsOnMyNovels: z.boolean().optional(),
        repliesToMyComments: z.boolean().optional(),
        donationAlerts: z.boolean().optional(),
        systemAnnouncements: z.boolean().optional(),
        securityAlerts: z.boolean().optional(),
        promotionalOffers: z.boolean().optional(),
        achievementUnlocks: z.boolean().optional(),
      }).optional(),
      push: z.object({
        enabled: z.boolean().optional(),
        novelUpdatesFromFollowing: z.boolean().optional(),
        newFollowers: z.boolean().optional(),
        commentsOnMyNovels: z.boolean().optional(),
        repliesToMyComments: z.boolean().optional(),
        donationAlerts: z.boolean().optional(),
        systemAnnouncements: z.boolean().optional(),
        securityAlerts: z.boolean().optional(),
        promotionalOffers: z.boolean().optional(),
        achievementUnlocks: z.boolean().optional(),
      }).optional(),
      inApp: z.object({
        enabled: z.boolean().optional(),
        novelUpdatesFromFollowing: z.boolean().optional(),
        newFollowers: z.boolean().optional(),
        commentsOnMyNovels: z.boolean().optional(),
        repliesToMyComments: z.boolean().optional(),
        donationAlerts: z.boolean().optional(),
        systemAnnouncements: z.boolean().optional(),
        securityAlerts: z.boolean().optional(),
        promotionalOffers: z.boolean().optional(),
        achievementUnlocks: z.boolean().optional(),
      }).optional(),
    }).optional(),
    contentAndPrivacy: z.object({
      showMatureContent: z.boolean().optional(),
      preferredGenres: z.array(z.string()).optional(),
      blockedGenres: z.array(z.string()).optional(),
      blockedTags: z.array(z.string()).optional(),
      blockedAuthors: z.array(z.string()).optional(),
      blockedNovels: z.array(z.string()).optional(),
      profileVisibility: z.enum(["public", "followers_only", "private"]).optional(),
      readingHistoryVisibility: z.enum(["public", "followers_only", "private"]).optional(),
      showActivityStatus: z.boolean().optional(),
      allowDirectMessagesFrom: z.enum(["everyone", "followers", "no_one"]).optional(),
      analyticsConsent: z.object({
        allowPsychologicalAnalysis: z.boolean().optional(),
        allowPersonalizedFeedback: z.boolean().optional(),
      }).optional(),
    }).optional(),
    visualNovelGameplay: z.object({
      textSpeed: z.enum(["slow", "normal", "fast", "instant"]).optional(),
      autoPlayMode: z.enum(["click", "auto_text", "auto_voice"]).optional(),
      autoPlayDelayMs: z.number().optional(),
      skipUnreadText: z.boolean().optional(),
      transitionsEnabled: z.boolean().optional(),
      screenEffectsEnabled: z.boolean().optional(),
      textWindowOpacity: z.number().optional(),
      masterVolume: z.number().optional(),
      bgmVolume: z.number().optional(),
      sfxVolume: z.number().optional(),
      voiceVolume: z.number().optional(),
      voicesEnabled: z.boolean().optional(),
      preferredVoiceLanguage: z.string().optional(),
      showChoiceTimer: z.boolean().optional(),
      blurThumbnailsOfMatureContent: z.boolean().optional(),
      assetPreloading: z.enum(["none", "essential", "full", "wifi_only"]).optional(),
      characterAnimationLevel: z.enum(["none", "simple", "full"]).optional(),
    }).optional(),
  }).optional(),
});

export async function PUT(req: NextRequest) {
  console.log("🔵 [API Settings] Received PUT request to update settings");

  try {
    // 1. Check session and user authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.warn("⚠️ [API Settings] Unauthorized: No session or user ID");
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.warn(`⚠️ [API Settings] Invalid User ID: ${userId}`);
      return NextResponse.json(
        { success: false, error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // 2. Get and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("ℹ️ [API Settings] Raw request body:", requestBody);
    } catch (jsonError: any) {
      console.error("❌ [API Settings] Invalid JSON in request body:", jsonError.message);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validationResult = updateSettingsSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.warn("⚠️ [API Settings] Settings validation failed:", validationResult.error.errors);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid settings data",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    // 3. Connect to database
    await dbConnect();
    console.log(`ℹ️ [API Settings] Connected to MongoDB for User ID: ${userId}`);

    // 4. Prepare update fields
    const updateFields: { [key: string]: any } = {};
    
    // Helper function to recursively build update fields
    const buildUpdateFields = (obj: any, prefix: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            buildUpdateFields(value, `${prefix}${key}.`);
          } else {
            updateFields[`${prefix}${key}`] = value;
          }
        }
      }
    };

    if (validationResult.data.preferences) {
      buildUpdateFields(validationResult.data.preferences, 'preferences.');
    }

    console.log("ℹ️ [API Settings] Fields to update in MongoDB:", updateFields);

    // 5. Update user document
    const updatedUserDocument = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true, lean: true, select: 'preferences email username roles' }
    ).exec();

    if (!updatedUserDocument) {
      console.warn(`⚠️ [API Settings] User not found with ID: ${userId}`);
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const finalUserPreferences = updatedUserDocument.preferences as IUserPreferences;

    console.log(`✅ [API Settings] Successfully updated settings for User ID: ${userId}`);
    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      preferences: finalUserPreferences,
    });

  } catch (error: any) {
    console.error("❌ [API Settings] Unexpected error:", error.message, error.stack);

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: "Invalid data (Mongoose Validation)", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof mongoose.Error) {
      console.error("❌ [API Settings] Mongoose error:", error.message);
      return NextResponse.json(
        { success: false, error: "Database error", details: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error while updating settings", details: error.message },
      { status: 500 }
    );
  }
} 