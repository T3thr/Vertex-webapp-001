import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUserPreferences } from "@/backend/models/User";
import { z } from "zod";
import mongoose from "mongoose";

// Zod schema for validating settings updates, aligned with User.ts
const accessibilityDisplaySchema = z.object({
  dyslexiaFriendlyFont: z.boolean().optional(),
  highContrastMode: z.boolean().optional(),
  epilepsySafeMode: z.boolean().optional(),
}).optional();

const uiVisibilitySchema = z.object({
  textBoxOpacity: z.number().min(0).max(100).optional(),
  backgroundBrightness: z.number().min(0).max(100).optional(),
  textBoxBorder: z.boolean().optional(),
}).optional();

const fontSettingsSchema = z.object({
  fontSize: z.number().min(10).max(24).optional(),
  fontFamily: z.enum(['sans-serif', 'serif', 'monospace']).optional(),
  textContrastMode: z.boolean().optional(),
}).optional();

const visualEffectsSchema = z.object({
  sceneTransitionAnimations: z.boolean().optional(),
  actionSceneEffects: z.boolean().optional(),
}).optional();

const characterDisplaySchema = z.object({
  showCharacters: z.boolean().optional(),
  characterMovementAnimations: z.boolean().optional(),
  hideCharactersDuringText: z.boolean().optional(),
}).optional();

const characterVoiceDisplaySchema = z.object({
  voiceIndicatorIcon: z.boolean().optional(),
}).optional();

const backgroundDisplaySchema = z.object({
  backgroundQuality: z.enum(['low', 'mid', 'high']).optional(),
  showCGs: z.boolean().optional(),
  backgroundEffects: z.boolean().optional(),
}).optional();

const voiceSubtitlesSchema = z.object({
  enabled: z.boolean().optional(),
}).optional();

const displayPreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system", "sepia"]).optional(),
  accessibility: accessibilityDisplaySchema,
  uiVisibility: uiVisibilitySchema,
  fontSettings: fontSettingsSchema,
  visualEffects: visualEffectsSchema,
  characterDisplay: characterDisplaySchema,
  characterVoiceDisplay: characterVoiceDisplaySchema,
  backgroundDisplay: backgroundDisplaySchema,
  voiceSubtitles: voiceSubtitlesSchema,
}).optional();

const readingPreferencesSchema = z.object({
  textSpeed: z.number().min(0).max(100).optional(),
  instantText: z.boolean().optional(),
  skipRead: z.boolean().optional(),
  skipAll: z.boolean().optional(),
  skipHold: z.boolean().optional(),
  autoSpeed: z.number().min(0).max(100).optional(),
  autoPlay: z.boolean().optional(),
  enableHistory: z.boolean().optional(),
  historyVoice: z.boolean().optional(),
  historyBack: z.boolean().optional(),
  choiceTimer: z.boolean().optional(),
  highlightChoices: z.boolean().optional(),
  routePreview: z.boolean().optional(),
  autoSave: z.boolean().optional(),
  saveFrequency: z.enum(['5min', '10min', 'scene']).optional(),
  decisionWarning: z.boolean().optional(),
  importantMark: z.boolean().optional(),
  routeProgress: z.boolean().optional(),
  showUnvisited: z.boolean().optional(),
  secretHints: z.boolean().optional(),
}).optional();

const emailNotificationSchema = z.object({ enabled: z.boolean().optional() }).optional();
const pushNotificationSchema = z.object({ enabled: z.boolean().optional() }).optional();

const saveLoadNotificationSchema = z.object({
  autoSaveNotification: z.boolean().optional(),
  noSaveSpaceWarning: z.boolean().optional(),
}).optional();

const newContentNotificationSchema = z.object({
  contentUpdates: z.boolean().optional(),
  promotionEvent: z.boolean().optional(),
}).optional();

const outOfGameNotificationSchema = z.object({
  type: z.enum(['all', 'new-episode', 'daily-gift', 'stat-progress']).optional(),
}).optional();

const optionalNotificationSchema = z.object({
  statChange: z.boolean().optional(),
  statDetailLevel: z.enum(['detail', 'summary']).optional(),
}).optional();

const notificationPreferencesSchema = z.object({
  email: emailNotificationSchema,
  push: pushNotificationSchema,
  saveLoad: saveLoadNotificationSchema,
  newContent: newContentNotificationSchema,
  outOfGame: outOfGameNotificationSchema,
  optional: optionalNotificationSchema,
}).optional();

const privacyPreferencesSchema = z.object({
  profileVisibility: z.boolean().optional(),
  readingHistory: z.boolean().optional(),
  activityStatus: z.boolean().optional(),
  dataCollection: z.boolean().optional(),
}).optional();

const updateSettingsSchema = z.object({
  preferences: z.object({
    display: displayPreferencesSchema,
    reading: readingPreferencesSchema,
    notifications: notificationPreferencesSchema,
    privacy: privacyPreferencesSchema,
  }),
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