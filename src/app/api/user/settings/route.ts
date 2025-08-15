import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import UserSettingsModel, { IUserSettings } from "@/backend/models/UserSettings";
import { z } from "zod";
import mongoose from "mongoose";

// ==================================================================================================
// SECTION: Zod Schemas สำหรับการตรวจสอบข้อมูลขาเข้า (ปรับปรุงให้ตรงกับ User.ts)
// ==================================================================================================

// display.reading
const userReadingDisplayPreferencesSchema = z.object({
  fontFamily: z.string().trim().max(100).optional(),
  // fontSize ใน model เป็น union type, แต่ใน UI ใช้ number slider
  // ดังนั้น Zod ควรรับ number เพื่อให้ง่ายต่อการ validate จาก UI
  fontSize: z.number().min(10).max(24).optional(), // UI slider range
  lineHeight: z.number().min(1).max(3).optional(),
  textAlignment: z.enum(["left", "justify"]).optional(),
  readingModeLayout: z.enum(["paginated", "scrolling"]).optional(),
  textContrastMode: z.boolean().optional(),
}).optional();

// display.accessibility
const userAccessibilityDisplayPreferencesSchema = z.object({
  dyslexiaFriendlyFont: z.boolean().optional(),
  highContrastMode: z.boolean().optional(),
  epilepsySafeMode: z.boolean().optional(),
}).optional();

// display.uiVisibility
const userUIVisibilityPreferencesSchema = z.object({
  textBoxOpacity: z.number().min(0).max(100).optional(),
  backgroundBrightness: z.number().min(0).max(100).optional(),
  textBoxBorder: z.boolean().optional(),
}).optional();

// display.visualEffects
const userVisualEffectsPreferencesSchema = z.object({
  sceneTransitionAnimations: z.boolean().optional(),
  actionSceneEffects: z.boolean().optional(),
}).optional();

// display.characterDisplay
const userCharacterDisplayPreferencesSchema = z.object({
  showCharacters: z.boolean().optional(),
  characterMovementAnimations: z.boolean().optional(),
  hideCharactersDuringText: z.boolean().optional(),
}).optional();

// display.characterVoiceDisplay
const userCharacterVoiceDisplayPreferencesSchema = z.object({
  voiceIndicatorIcon: z.boolean().optional(),
}).optional();

// display.backgroundDisplay
const userBackgroundDisplayPreferencesSchema = z.object({
  backgroundQuality: z.enum(['low', 'mid', 'high']).optional(),
  showCGs: z.boolean().optional(),
  backgroundEffects: z.boolean().optional(),
}).optional();

// display.voiceSubtitles
const userVoiceSubtitlesPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
}).optional();

// รวม display preferences ทั้งหมด
const userDisplayPreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system", "sepia"]).optional(),
  reading: userReadingDisplayPreferencesSchema,
  accessibility: userAccessibilityDisplayPreferencesSchema,
  uiVisibility: userUIVisibilityPreferencesSchema,
  visualEffects: userVisualEffectsPreferencesSchema,
  characterDisplay: userCharacterDisplayPreferencesSchema,
  characterVoiceDisplay: userCharacterVoiceDisplayPreferencesSchema,
  backgroundDisplay: userBackgroundDisplayPreferencesSchema,
  voiceSubtitles: userVoiceSubtitlesPreferencesSchema,
}).optional();

// notifications.channelSettings (ใช้สำหรับ email, push, inApp)
const notificationChannelSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  newsletter: z.boolean().optional(), // เฉพาะ email
  novelUpdatesFromFollowing: z.boolean().optional(),
  newFollowers: z.boolean().optional(),
  commentsOnMyNovels: z.boolean().optional(),
  repliesToMyComments: z.boolean().optional(),
  donationAlerts: z.boolean().optional(),
  systemAnnouncements: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  promotionalOffers: z.boolean().optional(),
  achievementUnlocks: z.boolean().optional(),
}).optional();

// notifications.saveLoad
const userSaveLoadNotificationsSchema = z.object({
  autoSaveNotification: z.boolean().optional(),
  noSaveSpaceWarning: z.boolean().optional(),
}).optional();

// notifications.newContent
const userNewContentNotificationsSchema = z.object({
  contentUpdates: z.boolean().optional(),
  promotionEvent: z.boolean().optional(),
}).optional();

// notifications.outOfGame
const userOutOfGameNotificationsSchema = z.object({
  type: z.enum(['all', 'new-episode', 'daily-gift', 'stat-progress']).optional(),
}).optional();

// notifications.optional
const userOptionalNotificationsSchema = z.object({
  statChange: z.boolean().optional(),
  statDetailLevel: z.enum(['detail', 'summary']).optional(),
}).optional();

// รวม notifications preferences ทั้งหมด
const userPreferencesNotificationsSchema = z.object({
  masterNotificationsEnabled: z.boolean().optional(),
  email: notificationChannelSettingsSchema,
  push: notificationChannelSettingsSchema,
  inApp: notificationChannelSettingsSchema,
  saveLoad: userSaveLoadNotificationsSchema,
  newContent: userNewContentNotificationsSchema,
  outOfGame: userOutOfGameNotificationsSchema,
  optional: userOptionalNotificationsSchema,
}).optional();

// contentAndPrivacy.analyticsConsent
const userAnalyticsConsentSchema = z.object({
  allowPsychologicalAnalysis: z.boolean().optional(),
  allowPersonalizedFeedback: z.boolean().optional(),
  lastConsentReviewDate: z.string().datetime().optional(), // Date object in Zod is handled as string for API
}).optional();

// รวม contentAndPrivacy preferences ทั้งหมด
const userContentPrivacyPreferencesSchema = z.object({
  showMatureContent: z.boolean().optional(),
  preferredGenres: z.array(z.string()).optional(), // ObjectId strings
  blockedGenres: z.array(z.string()).optional(),
  blockedTags: z.array(z.string()).optional(),
  blockedAuthors: z.array(z.string()).optional(),
  blockedNovels: z.array(z.string()).optional(),
  profileVisibility: z.enum(["public", "followers_only", "private"]).optional(),
  readingHistoryVisibility: z.enum(["public", "followers_only", "private"]).optional(),
  showActivityStatus: z.boolean().optional(),
  allowDirectMessagesFrom: z.enum(["everyone", "followers", "no_one"]).optional(),
  analyticsConsent: userAnalyticsConsentSchema,
}).optional();


// visualNovelGameplay.backlog
const vnBacklogPreferencesSchema = z.object({
  enableHistory: z.boolean().optional(),
  historyVoice: z.boolean().optional(),
  historyBack: z.boolean().optional(),
}).optional();

// visualNovelGameplay.choices
const vnChoiceDisplayPreferencesSchema = z.object({
  highlightChoices: z.boolean().optional(),
  routePreview: z.boolean().optional(),
}).optional();

// visualNovelGameplay.saveLoad
const vnSaveLoadPreferencesSchema = z.object({
  autoSave: z.boolean().optional(),
  saveFrequency: z.enum(["5min", "10min", "scene", "chapter_start", "chapter_end"]).optional(),
}).optional();

// visualNovelGameplay.decisions
const vnDecisionWarningPreferencesSchema = z.object({
  decisionWarning: z.boolean().optional(),
  importantMark: z.boolean().optional(),
}).optional();

// visualNovelGameplay.routeManagement
const vnRouteManagementPreferencesSchema = z.object({
  routeProgress: z.boolean().optional(),
  showUnvisited: z.boolean().optional(),
  secretHints: z.boolean().optional(),
}).optional();

// visualNovelGameplay.blueprintEditor - เพิ่มสำหรับ Blueprint Tab
const vnBlueprintEditorPreferencesSchema = z.object({
  autoSaveEnabled: z.boolean().optional(),
  autoSaveIntervalSec: z.union([z.literal(15), z.literal(30)]).optional(),
  showSceneThumbnails: z.boolean().optional(),
  showNodeLabels: z.boolean().optional(),
  showConnectionLines: z.boolean().optional(),
  showGrid: z.boolean().optional(),
  autoLayout: z.boolean().optional(),
  enableAnimations: z.boolean().optional(),
  snapToGrid: z.boolean().optional(),
  gridSize: z.number().min(10).max(50).optional(),
  nodeOrientation: z.enum(['horizontal', 'vertical']).optional(),
  zoomLevel: z.number().min(0.1).max(3).optional(),
  viewOffset: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  nodeDefaultColor: z.string().optional(),
  edgeDefaultColor: z.string().optional(),
  connectionLineStyle: z.enum(["solid", "dashed", "dotted"]).optional(),
  collaborationEnabled: z.boolean().optional(),
  showOtherCursors: z.boolean().optional(),
  performanceMode: z.boolean().optional(),
  conflictResolutionStrategy: z.enum(['last_write_wins', 'merge', 'manual']).optional(),
}).optional();

// รวม visualNovelGameplay preferences ทั้งหมด
const visualNovelGameplayPreferencesSchema = z.object({
  textSpeed: z.enum(["slow", "normal", "fast", "instant"]).optional(),
  textSpeedNumeric: z.number().min(0).max(100).optional(),
  instantTextDisplay: z.boolean().optional(),
  autoPlayMode: z.enum(["click", "auto_text", "auto_voice"]).optional(),
  autoPlayDelayMs: z.number().min(0).optional(),
  autoPlaySpeedNumeric: z.number().min(0).max(100).optional(),
  autoPlayEnabled: z.boolean().optional(),
  skipUnreadText: z.boolean().optional(),
  skipReadTextOnly: z.boolean().optional(),
  skipAllText: z.boolean().optional(),
  skipOnHold: z.boolean().optional(),
  transitionsEnabled: z.boolean().optional(),
  screenEffectsEnabled: z.boolean().optional(),
  textWindowOpacity: z.number().min(0).max(1).optional(),
  masterVolume: z.number().min(0).max(1).optional(),
  bgmVolume: z.number().min(0).max(1).optional(),
  sfxVolume: z.number().min(0).max(1).optional(),
  voiceVolume: z.number().min(0).max(1).optional(),
  voicesEnabled: z.boolean().optional(),
  preferredVoiceLanguage: z.string().optional(),
  showChoiceTimer: z.boolean().optional(),
  blurThumbnailsOfMatureContent: z.boolean().optional(),
  preferredArtStyles: z.array(z.string()).optional(),
  preferredGameplayMechanics: z.array(z.string()).optional(),
  assetPreloading: z.enum(["none", "essential", "full", "wifi_only"]).optional(),
  characterAnimationLevel: z.enum(["none", "simple", "full"]).optional(),
  backlog: vnBacklogPreferencesSchema,
  choices: vnChoiceDisplayPreferencesSchema,
  saveLoad: vnSaveLoadPreferencesSchema,
  decisions: vnDecisionWarningPreferencesSchema,
  routeManagement: vnRouteManagementPreferencesSchema,
  blueprintEditor: vnBlueprintEditorPreferencesSchema, // เพิ่มการรองรับ Blueprint Editor
}).optional();

// Schema หลักสำหรับการอัปเดต preferences
const updateSettingsSchema = z.object({
  preferences: z.object({
    language: z.string().trim().max(100).optional(),
    display: userDisplayPreferencesSchema,
    notifications: userPreferencesNotificationsSchema,
    contentAndPrivacy: userContentPrivacyPreferencesSchema,
    visualNovelGameplay: visualNovelGameplayPreferencesSchema,
  }).strict() // ใช้ .strict() เพื่อให้แน่ใจว่าไม่มี field ที่ไม่รู้จัก
});

// ==================================================================================================
// END SECTION: Zod Schemas
// ==================================================================================================


export async function PUT(req: NextRequest) {
  console.log("🔵 [API Settings] Received PUT request to update settings");

  try {
    // 1. ตรวจสอบ Session และการยืนยันตัวตนของผู้ใช้
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

    // 2. ดึงและตรวจสอบ Request Body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("ℹ️ [API Settings] Raw request body:", JSON.stringify(requestBody, null, 2));
    } catch (jsonError: any) {
      console.error("❌ [API Settings] Invalid JSON in request body:", jsonError.message);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // ใช้ Zod ในการตรวจสอบข้อมูลขาเข้าอย่างละเอียด
    const validationResult = updateSettingsSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.warn("⚠️ [API Settings] Settings validation failed:", validationResult.error.errors);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid settings data",
          details: validationResult.error.format(), // แสดงรายละเอียด error ที่อ่านง่าย
        },
        { status: 400 }
      );
    }

    // 3. เชื่อมต่อฐานข้อมูล
    await dbConnect();
    console.log(`ℹ️ [API Settings] Connected to MongoDB for User ID: ${userId}`);

    // 4. เตรียม fields สำหรับการอัปเดต
    const updateFields: { [key: string]: any } = {};
    
    // ฟังก์ชัน helper สำหรับสร้าง update fields แบบ recursive เพื่อรองรับ nested objects
    const buildUpdateFields = (obj: any, prefix: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        // กรองค่า undefined และ null ออกไป เพื่อไม่ให้ไป overwrite ค่าเดิมใน DB หากไม่ได้ตั้งค่ามา
        // แต่ถ้าเป็น false หรือ 0 หรือ array ว่าง ให้ใส่ได้
        if (value === undefined || value === null) {
          continue;
        }

        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          // ถ้าเป็น object และไม่ใช่อาร์เรย์ ให้เรียกตัวเองแบบ recursive
          buildUpdateFields(value, `${prefix}${key}.`);
        } else {
          // ถ้าเป็นค่า primitive หรือ array ให้เพิ่มเข้าใน updateFields
          updateFields[`${prefix}${key}`] = value;
        }
      }
    };

    // เริ่มสร้าง update fields จาก preferences ที่ผ่านการ validate แล้ว
    if (validationResult.data.preferences) {
      buildUpdateFields(validationResult.data.preferences, 'preferences.');
    }

    if (Object.keys(updateFields).length === 0) {
      console.warn("⚠️ [API Settings] No valid fields to update after validation.");
      return NextResponse.json(
        { success: false, error: "No valid settings fields provided for update." },
        { status: 400 }
      );
    }

    console.log("ℹ️ [API Settings] Fields to update in MongoDB:", JSON.stringify(updateFields, null, 2));

    // 5. อัปเดต User Document
    // `select` clause เลือกเฉพาะ fields ที่จำเป็นต้องส่งกลับไปให้ client
    const updatedUserDocument = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { 
        new: true,         // คืนค่า document ที่ถูกอัปเดตแล้ว
        runValidators: true, // รัน Mongoose validators ที่ถูกกำหนดใน Schema
        lean: true,        // คืนค่าเป็น plain JavaScript object แทน Mongoose Document เพื่อ performance ที่ดีขึ้น
        select: 'preferences username email roles' // เลือก field ที่ต้องการส่งกลับ
      }
    ).exec();

    if (!updatedUserDocument) {
      console.warn(`⚠️ [API Settings] User not found with ID: ${userId}`);
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // เนื่องจากใช้ lean: true, `preferences` จะเป็น plain object ที่ตรงกับ IUserPreferences
    const finalUserPreferences = updatedUserDocument.preferences as IUserSettings;

    console.log(`✅ [API Settings] Successfully updated settings for User ID: ${userId}`);
    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      preferences: finalUserPreferences, // ส่ง preferences ที่อัปเดตแล้วกลับไป
    });

  } catch (error: any) {
    console.error("❌ [API Settings] Unexpected error:", error.message, error.stack);

    if (error.name === 'ValidationError') {
      // Mongoose validation errors
      return NextResponse.json(
        { success: false, error: "Invalid data (Mongoose Validation)", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof mongoose.Error) {
      // Mongoose specific errors
      console.error("❌ [API Settings] Mongoose error:", error.message);
      return NextResponse.json(
        { success: false, error: "Database error", details: error.message },
        { status: 500 }
      );
    }
    // General unexpected errors
    return NextResponse.json(
      { success: false, error: "Internal server error while updating settings", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handles PATCH requests to update a user's settings.
 * This is the primary endpoint for saving settings from the visual novel reader.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    await dbConnect();
    const body = await request.json();

    // The body should contain settings data
    if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'No settings data provided' }, { status: 400 });
    }

    // ตรวจสอบว่ามี data ที่จะอัปเดต (รองรับ blueprintEditor settings) - แก้ไข null/undefined check
    const hasDisplayData = body.display && typeof body.display === 'object' && Object.keys(body.display).length > 0;
    const hasGameplayData = body.gameplay && typeof body.gameplay === 'object' && Object.keys(body.gameplay).length > 0;
    const hasVisualNovelGameplayData = body.visualNovelGameplay && typeof body.visualNovelGameplay === 'object' && Object.keys(body.visualNovelGameplay).length > 0;
    const hasPreferencesData = body.preferences && typeof body.preferences === 'object' && Object.keys(body.preferences).length > 0;
    
    if (!hasDisplayData && !hasGameplayData && !hasVisualNovelGameplayData && !hasPreferencesData) {
        return NextResponse.json({ error: 'No valid settings data provided' }, { status: 400 });
    }
    
    // Flatten the nested object for MongoDB's $set operator
    const updateFields: { [key: string]: any } = {};
    const buildUpdateFields = (obj: any, prefix: string) => {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            buildUpdateFields(value, newPrefix);
          } else {
            updateFields[newPrefix] = value;
          }
        }
      }
    };
    
    // The settings from the reader are under `visualNovelGameplay` and `display` in the main UserSettings document.
    if (body.gameplay) {
      buildUpdateFields(body.gameplay, 'visualNovelGameplay');
    }
    if (body.display) {
      buildUpdateFields(body.display, 'display');
    }
    // รองรับการอัปเดต visualNovelGameplay โดยตรง (สำหรับ blueprintEditor settings)
    if (body.visualNovelGameplay) {
      buildUpdateFields(body.visualNovelGameplay, 'visualNovelGameplay');
    }
    
    // รองรับ structure ใหม่จาก NovelEditor (preferences.visualNovelGameplay)
    if (body.preferences?.visualNovelGameplay) {
      buildUpdateFields(body.preferences.visualNovelGameplay, 'visualNovelGameplay');
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 200 });
    }

    // Check if the user already has settings
    const existingSettings = await UserSettingsModel.findOne({ userId: userId }).lean();
    
    let updatedSettings;
    if (existingSettings) {
      // Update existing settings (partial update)
      updatedSettings = await UserSettingsModel.findOneAndUpdate(
        { userId: userId },
        { $set: updateFields, $inc: { settingsVersion: 1 } },
        { 
          new: true, // Return the modified document
          runValidators: false, // Disable validation for partial updates
          lean: true
        }
      );
    } else {
      // Create new settings with default values for required fields
      const defaultSettings = {
        userId: userId,
        settingsVersion: 1,
        display: {
          uiVisibility: {
            theme: 'system_default', // Required field default
            textBoxOpacity: 85,
            backgroundBrightness: 50,
            textBoxBorder: true,
            isDialogueBoxVisible: true
          }
        },
        visualNovelGameplay: {
          blueprintEditor: {
            autoSaveEnabled: false,
            autoSaveIntervalSec: 30,
            showSceneThumbnails: true,
            showNodeLabels: true,
            showConnectionLines: true,
            showGrid: true,
            autoLayout: false,
            enableAnimations: true,
            snapToGrid: false,
            gridSize: 20,
            nodeOrientation: 'vertical',
            zoomLevel: 1.0,
            viewOffset: { x: 0, y: 0 },
            nodeDefaultColor: "#3b82f6",
            edgeDefaultColor: "#64748b",
            connectionLineStyle: "solid",
            collaborationEnabled: false,
            showOtherCursors: true,
            performanceMode: false,
            conflictResolutionStrategy: 'merge'
          }
        },
        preferences: {}
      };
      
      // Apply the updates using proper nested object merging
      const mergedSettings: any = { ...defaultSettings };
      for (const [key, value] of Object.entries(updateFields)) {
        const keyParts = key.split('.');
        let current: any = mergedSettings;
        
        // Navigate to the correct nested object
        for (let i = 0; i < keyParts.length - 1; i++) {
          const part = keyParts[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
        
        // Set the final value
        current[keyParts[keyParts.length - 1]] = value;
      }
      
      updatedSettings = await UserSettingsModel.create(mergedSettings);
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully.',
      settings: updatedSettings
    });

  } catch (error) {
    console.error('❌ [API PATCH Settings] Error updating user settings:', error);
    return NextResponse.json(
      { error: 'An internal error occurred while saving settings.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // ตรวจสอบการ authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    // เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // ดึงการตั้งค่าผู้ใช้
    const user = await UserModel.findById(session.user.id)
      .select('settings.readerSettings')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้' },
        { status: 404 }
      );
    }

    // ส่งกลับการตั้งค่า หรือค่าเริ่มต้นหากไม่มี
    const defaultSettings = {
      textSpeed: 2,
      fontSize: 16,
      bgOpacity: 0.8,
      autoPlay: false
    };

    return NextResponse.json({
      readerSettings: user.settings?.readerSettings || defaultSettings
    });

  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า' },
      { status: 500 }
    );
  }
}
