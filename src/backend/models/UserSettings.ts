// src/backend/models/UserSettings.ts
// โมเดลการตั้งค่าผู้ใช้ (UserSettings Model) - User Preferences & Settings
// ตามมาตรฐาน DivWy (Modularized Architecture)
//
// **ปรัชญาการออกแบบ:**
// โมเดลนี้ถูกสร้างขึ้นเพื่อรวบรวม "การตั้งค่า" ทั้งหมดที่ผู้ใช้สามารถปรับแต่งได้ไว้ในที่เดียว
// การแยกออกมาจาก Core User Model มีข้อดีคือ:
// 1.  **Reduced Document Size:** ลดขนาดของเอกสาร User หลักได้อย่างมีนัยสำคัญ เนื่องจากข้อมูลการตั้งค่ามักจะมีรายละเอียดเยอะ
// 2.  **Infrequent Access Pattern:** การตั้งค่าส่วนใหญ่จะถูกเข้าถึงเฉพาะเมื่อผู้ใช้เข้าหน้า "Settings" หรือเมื่อมีฟีเจอร์ที่ต้องใช้ค่า setting นั้นๆ
//     จึงไม่จำเป็นต้องดึงข้อมูลนี้มาทุกครั้งที่มีการ authenticate
// 3.  **Schema Organization:** ทำให้การจัดการ Schema สำหรับการตั้งค่าที่ซับซ้อน (เช่น การตั้งค่า VN, การแจ้งเตือน) เป็นระเบียบและดูแลรักษาง่ายขึ้น
//
// **อัปเดตล่าสุด:** ปรับปรุงสู่มาตรฐานระดับโลก - Default Value Management, Type Safety, Bounded Arrays, Dynamic Config

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ==================================================================================================
// SECTION: ศูนย์รวมค่าเริ่มต้น (Default Value Management) - ประเด็นที่ 1
// ==================================================================================================

/**
 * @const DEFAULT_VALUES
 * @description ศูนย์รวมค่าเริ่มต้นทั้งหมด เพื่อความสอดคล้องและง่ายต่อการบำรุงรักษา
 * ข้อดี: DRY principle, Centralized configuration, Easy maintenance
 * ข้อเสีย: อาจซับซ้อนสำหรับ nested objects (แก้ด้วย helper functions)
 */
const DEFAULT_VALUES = {
  // Language & System
  LANGUAGE: "th" as const,
  SETTINGS_VERSION: 1,
  
  // UI & Display
  THEME: "system" as const,
  FONT_SIZE: 16, // ใช้ number แทน mixed type เพื่อความชัดเจน
  LINE_HEIGHT: 1.6,
  TEXT_ALIGNMENT: "left" as const,
  READING_MODE: "scrolling" as const,
  
  // Volume Controls (0-100 scale for UI consistency)
  MASTER_VOLUME: 100,
  BGM_VOLUME: 70,
  SFX_VOLUME: 80,
  VOICE_VOLUME: 100,
  
  // Text Speed (0-100 scale, converted to ms internally)
  TEXT_SPEED_VALUE: 50,
  AUTO_PLAY_SPEED_VALUE: 50,
  AUTO_PLAY_DELAY_MS: 1500,
  
  // UI Opacity & Visual
  TEXT_BOX_OPACITY: 80,
  BACKGROUND_BRIGHTNESS: 100,
  
  // Array Limits (ป้องกัน unbounded arrays)
  MAX_BLOCKED_ITEMS: 1000,
  MAX_PREFERRED_GENRES: 50,
  MAX_BLOCKED_TAGS: 200,
} as const;

/**
 * @const SUPPORTED_LANGUAGES
 * @description รายการภาษาที่รองรับ พร้อม metadata สำหรับ dynamic configuration
 * ข้อดี: รองรับ A/B testing, Feature flags, Localization metadata
 */
const SUPPORTED_LANGUAGES = [
  { code: "th", name: "ไทย", rtl: false, enabled: true },
  { code: "en", name: "English", rtl: false, enabled: true },
  { code: "ja", name: "日本語", rtl: false, enabled: true },
  { code: "ko", name: "한국어", rtl: false, enabled: true },
  { code: "zh", name: "中文", rtl: false, enabled: true },
  { code: "vi", name: "Tiếng Việt", rtl: false, enabled: false }, // Feature flag example
  { code: "id", name: "Bahasa Indonesia", rtl: false, enabled: true },
] as const;

/**
 * @const SUPPORTED_THEMES
 * @description รายการธีมที่รองรับ พร้อม configuration สำหรับ dynamic theming
 */
const SUPPORTED_THEMES = [
  { code: "light", name: "Light", cssClass: "theme-light", enabled: true },
  { code: "dark", name: "Dark", cssClass: "theme-dark", enabled: true },
  { code: "system", name: "System", cssClass: "theme-system", enabled: true },
  { code: "sepia", name: "Sepia", cssClass: "theme-sepia", enabled: true },
  { code: "oled", name: "OLED", cssClass: "theme-oled", enabled: false }, // Future theme
] as const;

/**
 * Helper Functions สำหรับสร้าง Default Objects
 */
const createDefaultNotificationChannel = (): INotificationChannelSettings => ({
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
});

const createDefaultPushNotificationChannel = (): INotificationChannelSettings => ({
  ...createDefaultNotificationChannel(),
  newsletter: false, // Different default for push
});

// ==================================================================================================
// SECTION: Type-Safe Interfaces - ประเด็นที่ 3 (แก้ไข Data Type Ambiguity)
// ==================================================================================================

// --- Improved Display Preferences (แก้ไข mixed types) ---
export interface IUserReadingDisplayPreferences {
  fontFamily?: string;
  fontSize: number; // เปลี่ยนจาก mixed type เป็น number ที่ชัดเจน (pixels)
  lineHeight: number;
  textAlignment: "left" | "justify" | "center";
  readingModeLayout: "paginated" | "scrolling";
  textContrastMode: boolean;
}

export interface IUserAccessibilityDisplayPreferences {
  dyslexiaFriendlyFont: boolean;
  highContrastMode: boolean;
  epilepsySafeMode: boolean;
  reducedMotion: boolean; // เพิ่ม accessibility option
}

export interface IUserUIVisibilityPreferences {
  theme: 'light' | 'dark' | 'sepia' | 'system_default';
  textBoxOpacity: number; // percentage
  backgroundBrightness: number; // percentage
  textBoxBorder: boolean;
  isDialogueBoxVisible: boolean;
}

export interface IUserVisualEffectsPreferences {
  sceneTransitionAnimations: boolean;
  actionSceneEffects: boolean;
  particleEffects: boolean; // เพิ่ม granular control
}

export interface IUserCharacterDisplayPreferences {
  showCharacters: boolean;
  characterMovementAnimations: boolean;
  hideCharactersDuringText: boolean;
}

export interface IUserCharacterVoiceDisplayPreferences {
  voiceIndicatorIcon: boolean;
}

export interface IUserBackgroundDisplayPreferences {
  backgroundQuality: "low" | "mid" | "high";
  showCGs: boolean;
  backgroundEffects: boolean;
}

export interface IUserVoiceSubtitlesPreferences {
  enabled: boolean;
}

export interface IUserDisplayPreferences {
  theme: typeof SUPPORTED_THEMES[number]["code"];
  reading: IUserReadingDisplayPreferences;
  accessibility: IUserAccessibilityDisplayPreferences;
  uiVisibility: IUserUIVisibilityPreferences;
  visualEffects: IUserVisualEffectsPreferences;
  characterDisplay: IUserCharacterDisplayPreferences;
  characterVoiceDisplay: IUserCharacterVoiceDisplayPreferences;
  backgroundDisplay: IUserBackgroundDisplayPreferences;
  voiceSubtitles: IUserVoiceSubtitlesPreferences;
}

// --- Notification Preferences (ใช้ defaults จาก constants) ---
export interface INotificationChannelSettings {
  enabled: boolean;
  newsletter: boolean;
  novelUpdatesFromFollowing: boolean;
  newFollowers: boolean;
  commentsOnMyNovels: boolean;
  repliesToMyComments: boolean;
  donationAlerts: boolean;
  systemAnnouncements: boolean;
  securityAlerts: boolean;
  promotionalOffers: boolean;
  achievementUnlocks: boolean;
}

export interface IUserSaveLoadNotifications {
  autoSaveNotification: boolean;
  noSaveSpaceWarning: boolean;
}

export interface IUserNewContentNotifications {
  contentUpdates: boolean;
  promotionEvent: boolean;
}

export interface IUserOutOfGameNotifications {
  type: "all" | "new-episode" | "daily-gift" | "stat-progress";
}

export interface IUserOptionalNotifications {
  statChange: boolean;
  statDetailLevel: "detail" | "summary";
}

export interface IUserPreferencesNotifications {
  masterNotificationsEnabled: boolean;
  email: INotificationChannelSettings;
  push: INotificationChannelSettings;
  inApp: INotificationChannelSettings;
  saveLoad: IUserSaveLoadNotifications;
  newContent: IUserNewContentNotifications;
  outOfGame: IUserOutOfGameNotifications;
  optional: IUserOptionalNotifications;
}

// --- Content & Privacy (เพิ่ม bounded arrays) - ประเด็นที่ 2 ---
export interface IUserAnalyticsConsent {
  allowPsychologicalAnalysis: boolean;
  allowPersonalizedFeedback: boolean;
  lastConsentReviewDate?: Date;
}

/**
 * @interface IUserContentPrivacyPreferences
 * @description การตั้งค่าเนื้อหาและความเป็นส่วนตัว พร้อมการจำกัดขนาด arrays
 * **Bounded Arrays Strategy:**
 * - ใช้ validation ใน Schema เพื่อจำกัดขนาด array
 * - เพิ่ม cleanup logic ใน middleware เมื่อเกินขีดจำกัด (FIFO)
 * - พิจารณาย้ายไปยัง separate collection เมื่อเกิน threshold
 */
export interface IUserContentPrivacyPreferences {
  showMatureContent: boolean;
  preferredGenres: Types.ObjectId[]; // จำกัดที่ MAX_PREFERRED_GENRES
  blockedGenres: Types.ObjectId[]; // จำกัดที่ MAX_BLOCKED_ITEMS
  blockedTags: string[]; // จำกัดที่ MAX_BLOCKED_TAGS
  blockedAuthors: Types.ObjectId[]; // จำกัดที่ MAX_BLOCKED_ITEMS
  blockedNovels: Types.ObjectId[]; // จำกัดที่ MAX_BLOCKED_ITEMS
  profileVisibility: "public" | "followers_only" | "private";
  readingHistoryVisibility: "public" | "followers_only" | "private";
  showActivityStatus: boolean;
  allowDirectMessagesFrom: "everyone" | "followers" | "no_one";
  analyticsConsent: IUserAnalyticsConsent;
}

// --- VN Gameplay (ลบความซ้ำซ้อนของ dual types) ---
export interface IVNBacklogPreferences {
  enableHistory: boolean;
  historyVoice: boolean;
  historyBack: boolean;
}

export interface IVNChoiceDisplayPreferences {
  highlightChoices: boolean;
  routePreview: boolean;
}

export interface IVNSaveLoadPreferences {
  autoSave: boolean;
  saveFrequency: "5min" | "10min" | "scene" | "chapter_start" | "chapter_end";
}

export interface IVNDecisionWarningPreferences {
  decisionWarning: boolean;
  importantMark: boolean;
}

export interface IVNRouteManagementPreferences {
  routeProgress: boolean;
  showUnvisited: boolean;
  secretHints: boolean;
}

/**
 * @interface IVisualNovelGameplayPreferences
 * @description ปรับปรุงการตั้งค่า VN โดยลบความซ้ำซ้อน และใช้ type ที่ชัดเจน
 * **ข้อปรับปรุง:**
 * - ลบ textSpeed enum ออก เหลือแค่ textSpeedValue (0-100)
 * - ใช้ helper functions แปลงค่าเป็น milliseconds ในแอปพลิเคชัน
 * - Volume ใช้ scale 0-100 เพื่อความสอดคล้องกับ UI
 */
export interface IVisualNovelGameplayPreferences {
  // Text Control (ใช้ scale 0-100 เพื่อความชัดเจน)
  textSpeedValue: number; // 0 = instant, 100 = very slow
  instantTextDisplay: boolean;

  // Auto Play
  autoPlayMode: "click" | "auto_text" | "auto_voice";
  autoPlayDelayMs: number;
  autoPlaySpeedValue: number; // 0-100 scale
  autoPlayEnabled: boolean;

  // Skip Controls
  skipUnreadText: boolean;
  skipReadTextOnly: boolean;
  skipAllText: boolean;
  skipOnHold: boolean;

  // Visual Effects
  transitionsEnabled: boolean;
  screenEffectsEnabled: boolean;
  textWindowOpacity: number; // 0-100 scale

  // Audio (ใช้ scale 0-100 เพื่อความสอดคล้อง)
  masterVolume: number;
  bgmVolume: number;
  sfxVolume: number;
  voiceVolume: number;

  // Voice Settings
  voicesEnabled: boolean;
  preferredVoiceLanguage: string;
  showChoiceTimer: boolean;
  blurThumbnailsOfMatureContent: boolean;

  // Personalization (จำกัดขนาด arrays)
  preferredArtStyles: Types.ObjectId[];
  preferredGameplayMechanics: Types.ObjectId[];

  // Performance
  assetPreloading: "none" | "essential" | "full" | "wifi_only";
  characterAnimationLevel: "none" | "simple" | "full";

  // Sub-preferences
  backlog: IVNBacklogPreferences;
  choices: IVNChoiceDisplayPreferences;
  saveLoad: IVNSaveLoadPreferences;
  decisions: IVNDecisionWarningPreferences;
  routeManagement: IVNRouteManagementPreferences;
}

// ==================================================================================================
// SECTION: Main Interface
// ==================================================================================================

export interface IUserSettings extends Document {
  userId: Types.ObjectId;
  settingsVersion: number;
  language: typeof SUPPORTED_LANGUAGES[number]["code"];
  display: IUserDisplayPreferences;
  notifications: IUserPreferencesNotifications;
  contentAndPrivacy: IUserContentPrivacyPreferences;
  visualNovelGameplay: IVisualNovelGameplayPreferences;

  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Utility Functions
// ==================================================================================================

/**
 * Text Speed Conversion Utilities
 * แปลงค่า 0-100 scale เป็น milliseconds สำหรับใช้งานจริง
 */
export const TextSpeedUtils = {
  toMilliseconds: (speedValue: number): number => {
    // 0 = เร็วมาก (เช่น 10ms/char), 100 = ช้ามาก (เช่น 100ms/char)
    // การแปลงค่านี้ขึ้นอยู่กับการนำไปใช้จริง แต่เป็นตัวอย่างการแปลงค่าที่เป็น non-linear
    if (speedValue <= 0) return 10;
    if (speedValue >= 100) return 100;
    return 100 - speedValue; // Inverted: 100 is fast, 0 is slow in UI
  },
  
  toSpeedValue: (milliseconds: number): number => {
    // แปลงกลับจาก ms เป็น 0-100 scale
    const value = 100 - milliseconds;
    return Math.max(0, Math.min(100, value));
  }
};

/**
 * Volume Conversion Utilities
 * แปลงค่า 0-100 scale เป็น 0-1 range สำหรับ audio APIs
 */
export const VolumeUtils = {
  toAudioLevel: (volumeValue: number): number => {
    return Math.max(0, Math.min(1, volumeValue / 100));
  },
  
  toVolumeValue: (audioLevel: number): number => {
    return Math.round(Math.max(0, Math.min(100, audioLevel * 100)));
  }
};

// ==================================================================================================
// SECTION: Improved Schemas with Validation
// ==================================================================================================

// Array Validation Helper
const createBoundedArray = (ref: string, maxLength: number) => ({
  type: [Schema.Types.ObjectId],
  ref,
  validate: {
    validator: function(arr: Types.ObjectId[]) {
      return arr.length <= maxLength;
    },
    message: `Array cannot exceed ${maxLength} items`
  },
  index: true
});

// --- Display Schemas ---
const UserReadingDisplayPreferencesSchema = new Schema<IUserReadingDisplayPreferences>({
  fontFamily: { type: String, trim: true, maxlength: 100 },
  fontSize: { 
    type: Number, 
    required: true, 
    default: DEFAULT_VALUES.FONT_SIZE,
    min: 12, 
    max: 32 
  },
  lineHeight: { 
    type: Number, 
    min: 1, 
    max: 3, 
    default: DEFAULT_VALUES.LINE_HEIGHT 
  },
  textAlignment: { 
    type: String, 
    enum: ["left", "justify", "center"], 
    default: DEFAULT_VALUES.TEXT_ALIGNMENT 
  },
  readingModeLayout: { 
    type: String, 
    enum: ["paginated", "scrolling"], 
    required: true, 
    default: DEFAULT_VALUES.READING_MODE 
  },
  textContrastMode: { type: Boolean, default: false }
}, { _id: false });

const UserAccessibilityDisplayPreferencesSchema = new Schema<IUserAccessibilityDisplayPreferences>({
  dyslexiaFriendlyFont: { type: Boolean, default: false },
  highContrastMode: { type: Boolean, default: false },
  epilepsySafeMode: { type: Boolean, default: false },
  reducedMotion: { type: Boolean, default: false }
}, { _id: false });

const UserUIVisibilityPreferencesSchema = new Schema<IUserUIVisibilityPreferences>({
  theme: { type: String, enum: ['light', 'dark', 'sepia', 'system_default'], required: true },
  textBoxOpacity: { 
    type: Number, 
    min: 0, 
    max: 100, 
    default: DEFAULT_VALUES.TEXT_BOX_OPACITY 
  },
  backgroundBrightness: { 
    type: Number, 
    min: 0, 
    max: 100, 
    default: DEFAULT_VALUES.BACKGROUND_BRIGHTNESS 
  },
  textBoxBorder: { type: Boolean, default: true },
  isDialogueBoxVisible: { type: Boolean, default: true }
}, { _id: false });

const UserVisualEffectsPreferencesSchema = new Schema<IUserVisualEffectsPreferences>({
  sceneTransitionAnimations: { type: Boolean, default: true },
  actionSceneEffects: { type: Boolean, default: true },
  particleEffects: { type: Boolean, default: true }
}, { _id: false });

const UserCharacterDisplayPreferencesSchema = new Schema<IUserCharacterDisplayPreferences>({
  showCharacters: { type: Boolean, default: true },
  characterMovementAnimations: { type: Boolean, default: true },
  hideCharactersDuringText: { type: Boolean, default: false }
}, { _id: false });

const UserCharacterVoiceDisplayPreferencesSchema = new Schema<IUserCharacterVoiceDisplayPreferences>({
  voiceIndicatorIcon: { type: Boolean, default: true }
}, { _id: false });

const UserBackgroundDisplayPreferencesSchema = new Schema<IUserBackgroundDisplayPreferences>({
  backgroundQuality: { type: String, enum: ["low", "mid", "high"], default: "mid" },
  showCGs: { type: Boolean, default: true },
  backgroundEffects: { type: Boolean, default: true }
}, { _id: false });

const UserVoiceSubtitlesPreferencesSchema = new Schema<IUserVoiceSubtitlesPreferences>({
  enabled: { type: Boolean, default: true }
}, { _id: false });

const UserDisplayPreferencesSchema = new Schema<IUserDisplayPreferences>({
  theme: { 
    type: String, 
    enum: SUPPORTED_THEMES.filter(t => t.enabled).map(t => t.code),
    required: true, 
    default: DEFAULT_VALUES.THEME 
  },
  reading: { type: UserReadingDisplayPreferencesSchema, default: () => ({}), required: true },
  accessibility: { type: UserAccessibilityDisplayPreferencesSchema, default: () => ({}), required: true },
  uiVisibility: { type: UserUIVisibilityPreferencesSchema, default: () => ({}), required: true },
  visualEffects: { type: UserVisualEffectsPreferencesSchema, default: () => ({}), required: true },
  characterDisplay: { type: UserCharacterDisplayPreferencesSchema, default: () => ({}), required: true },
  characterVoiceDisplay: { type: UserCharacterVoiceDisplayPreferencesSchema, default: () => ({}), required: true },
  backgroundDisplay: { type: UserBackgroundDisplayPreferencesSchema, default: () => ({}), required: true },
  voiceSubtitles: { type: UserVoiceSubtitlesPreferencesSchema, default: () => ({}), required: true }
}, { _id: false });

// --- Notification Schemas ---
const NotificationChannelSettingsSchema = new Schema<INotificationChannelSettings>({
  enabled: { type: Boolean, default: true },
  newsletter: { type: Boolean, default: true },
  novelUpdatesFromFollowing: { type: Boolean, default: true },
  newFollowers: { type: Boolean, default: true },
  commentsOnMyNovels: { type: Boolean, default: true },
  repliesToMyComments: { type: Boolean, default: true },
  donationAlerts: { type: Boolean, default: true },
  systemAnnouncements: { type: Boolean, default: true },
  securityAlerts: { type: Boolean, default: true },
  promotionalOffers: { type: Boolean, default: false },
  achievementUnlocks: { type: Boolean, default: true }
}, { _id: false });

const UserSaveLoadNotificationsSchema = new Schema<IUserSaveLoadNotifications>({
  autoSaveNotification: { type: Boolean, default: true },
  noSaveSpaceWarning: { type: Boolean, default: true }
}, { _id: false });

const UserNewContentNotificationsSchema = new Schema<IUserNewContentNotifications>({
  contentUpdates: { type: Boolean, default: true },
  promotionEvent: { type: Boolean, default: true }
}, { _id: false });

const UserOutOfGameNotificationsSchema = new Schema<IUserOutOfGameNotifications>({
  type: { type: String, enum: ["all", "new-episode", "daily-gift", "stat-progress"], default: "all" }
}, { _id: false });

const UserOptionalNotificationsSchema = new Schema<IUserOptionalNotifications>({
  statChange: { type: Boolean, default: false },
  statDetailLevel: { type: String, enum: ["detail", "summary"], default: "summary" }
}, { _id: false });

const UserPreferencesNotificationsSchema = new Schema<IUserPreferencesNotifications>({
  masterNotificationsEnabled: { type: Boolean, default: true },
  email: { type: NotificationChannelSettingsSchema, default: createDefaultNotificationChannel, required: true },
  push: { type: NotificationChannelSettingsSchema, default: createDefaultPushNotificationChannel, required: true },
  inApp: { type: NotificationChannelSettingsSchema, default: createDefaultPushNotificationChannel, required: true },
  saveLoad: { type: UserSaveLoadNotificationsSchema, default: () => ({}), required: true },
  newContent: { type: UserNewContentNotificationsSchema, default: () => ({}), required: true },
  outOfGame: { type: UserOutOfGameNotificationsSchema, default: () => ({}), required: true },
  optional: { type: UserOptionalNotificationsSchema, default: () => ({}), required: true }
}, { _id: false });

// --- Content & Privacy Schemas (พร้อม bounded arrays) ---
const UserAnalyticsConsentSchema = new Schema<IUserAnalyticsConsent>({
  allowPsychologicalAnalysis: { type: Boolean, default: false },
  allowPersonalizedFeedback: { type: Boolean, default: false },
  lastConsentReviewDate: { type: Date }
}, { _id: false });

const UserContentPrivacyPreferencesSchema = new Schema<IUserContentPrivacyPreferences>({
  showMatureContent: { type: Boolean, default: false },
  preferredGenres: {
    ...createBoundedArray("Category", DEFAULT_VALUES.MAX_PREFERRED_GENRES),
    default: []
  },
  blockedGenres: {
    ...createBoundedArray("Category", DEFAULT_VALUES.MAX_BLOCKED_ITEMS),
    default: []
  },
  blockedTags: {
    type: [String],
    validate: {
      validator: function(arr: string[]) {
        return arr.length <= DEFAULT_VALUES.MAX_BLOCKED_TAGS;
      },
      message: `Blocked tags cannot exceed ${DEFAULT_VALUES.MAX_BLOCKED_TAGS} items`
    },
    default: []
  },
  blockedAuthors: {
    ...createBoundedArray("User", DEFAULT_VALUES.MAX_BLOCKED_ITEMS),
    default: []
  },
  blockedNovels: {
    ...createBoundedArray("Novel", DEFAULT_VALUES.MAX_BLOCKED_ITEMS),
    default: []
  },
  profileVisibility: { type: String, enum: ["public", "followers_only", "private"], default: "public" },
  readingHistoryVisibility: { type: String, enum: ["public", "followers_only", "private"], default: "followers_only" },
  showActivityStatus: { type: Boolean, default: true },
  allowDirectMessagesFrom: { type: String, enum: ["everyone", "followers", "no_one"], default: "followers" },
  analyticsConsent: { type: UserAnalyticsConsentSchema, default: () => ({}), required: true }
}, { _id: false });

// --- VN Gameplay Schemas (ปรับปรุงแล้ว) ---
const VNBacklogPreferencesSchema = new Schema<IVNBacklogPreferences>({
  enableHistory: { type: Boolean, default: true },
  historyVoice: { type: Boolean, default: true },
  historyBack: { type: Boolean, default: true }
}, { _id: false });

const VNChoiceDisplayPreferencesSchema = new Schema<IVNChoiceDisplayPreferences>({
  highlightChoices: { type: Boolean, default: true },
  routePreview: { type: Boolean, default: false }
}, { _id: false });

const VNSaveLoadPreferencesSchema = new Schema<IVNSaveLoadPreferences>({
  autoSave: { type: Boolean, default: true },
  saveFrequency: { type: String, enum: ["5min", "10min", "scene", "chapter_start", "chapter_end"], default: "scene" }
}, { _id: false });

const VNDecisionWarningPreferencesSchema = new Schema<IVNDecisionWarningPreferences>({
  decisionWarning: { type: Boolean, default: true },
  importantMark: { type: Boolean, default: true }
}, { _id: false });

const VNRouteManagementPreferencesSchema = new Schema<IVNRouteManagementPreferences>({
  routeProgress: { type: Boolean, default: true },
  showUnvisited: { type: Boolean, default: true },
  secretHints: { type: Boolean, default: false }
}, { _id: false });

const VisualNovelGameplayPreferencesSchema = new Schema<IVisualNovelGameplayPreferences>({
  // Text Control (ใช้ค่าเดียว ไม่ซ้ำซ้อน)
  textSpeedValue: { type: Number, min: 0, max: 100, default: DEFAULT_VALUES.TEXT_SPEED_VALUE },
  instantTextDisplay: { type: Boolean, default: false },

  // Auto Play
  autoPlayMode: { type: String, enum: ["click", "auto_text", "auto_voice"], default: "click" },
  autoPlayDelayMs: { type: Number, min: 0, default: DEFAULT_VALUES.AUTO_PLAY_DELAY_MS },
  autoPlaySpeedValue: { type: Number, min: 0, max: 100, default: DEFAULT_VALUES.AUTO_PLAY_SPEED_VALUE },
  autoPlayEnabled: { type: Boolean, default: false },

  // Skip Controls
  skipUnreadText: { type: Boolean, default: false },
  skipReadTextOnly: { type: Boolean, default: true },
  skipAllText: { type: Boolean, default: false },
  skipOnHold: { type: Boolean, default: true },

  // Visual Effects
  transitionsEnabled: { type: Boolean, default: true },
  screenEffectsEnabled: { type: Boolean, default: true },
  textWindowOpacity: { type: Number, min: 0, max: 100, default: DEFAULT_VALUES.TEXT_BOX_OPACITY },

  // Audio (ใช้ scale 0-100)
  masterVolume: { type: Number, min: 0, max: 100, default: DEFAULT_VALUES.MASTER_VOLUME },
  bgmVolume: { type: Number, min: 0, max: 100, default: DEFAULT_VALUES.BGM_VOLUME },
  sfxVolume: { type: Number, min: 0, max: 100, default: DEFAULT_VALUES.SFX_VOLUME },
  voiceVolume: { type: Number, min: 0, max: 100, default: DEFAULT_VALUES.VOICE_VOLUME },

  // Voice Settings
  voicesEnabled: { type: Boolean, default: true },
  preferredVoiceLanguage: { type: String, trim: true, default: "original" },
  showChoiceTimer: { type: Boolean, default: true },
  blurThumbnailsOfMatureContent: { type: Boolean, default: true },

  // Personalization (ใช้ bounded array)
  preferredArtStyles: { ...createBoundedArray("Category", DEFAULT_VALUES.MAX_PREFERRED_GENRES), default: [] },
  preferredGameplayMechanics: { ...createBoundedArray("Category", DEFAULT_VALUES.MAX_PREFERRED_GENRES), default: [] },
  
  // Performance
  assetPreloading: { type: String, enum: ["none", "essential", "full", "wifi_only"], default: "essential" },
  characterAnimationLevel: { type: String, enum: ["none", "simple", "full"], default: "full" },

  // Sub-preferences
  backlog: { type: VNBacklogPreferencesSchema, default: () => ({}), required: true },
  choices: { type: VNChoiceDisplayPreferencesSchema, default: () => ({}), required: true },
  saveLoad: { type: VNSaveLoadPreferencesSchema, default: () => ({}), required: true },
  decisions: { type: VNDecisionWarningPreferencesSchema, default: () => ({}), required: true },
  routeManagement: { type: VNRouteManagementPreferencesSchema, default: () => ({}), required: true },
}, { _id: false });


// ==================================================================================================
// SECTION: Schema หลักสำหรับ UserSettings (UserSettingsSchema)
// ==================================================================================================

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
      comment: "FK to User collection"
    },
    settingsVersion: {
        type: Number,
        required: true,
        default: DEFAULT_VALUES.SETTINGS_VERSION,
        comment: "Schema version for future migrations"
    },
    language: {
      type: String,
      enum: SUPPORTED_LANGUAGES.filter(lang => lang.enabled).map(lang => lang.code),
      default: DEFAULT_VALUES.LANGUAGE,
      required: true
    },
    display: {
        type: UserDisplayPreferencesSchema,
        default: () => ({}),
        required: true
    },
    notifications: {
        type: UserPreferencesNotificationsSchema,
        default: () => ({}),
        required: true
    },
    contentAndPrivacy: {
        type: UserContentPrivacyPreferencesSchema,
        default: () => ({}),
        required: true
    },
    visualNovelGameplay: {
        type: VisualNovelGameplayPreferencesSchema,
        default: () => ({}),
        required: true
    },
  },
  {
    timestamps: true,
    collection: "usersettings",
  }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================
UserSettingsSchema.pre<IUserSettings>("save", async function (next) {
    // Logic 1: ถ้าผู้ใช้ปิด master notification, ให้ปิด notification ย่อยๆ ทั้งหมดด้วย
    if (this.isModified("notifications.masterNotificationsEnabled") && !this.notifications.masterNotificationsEnabled) {
        const channels = ['email', 'push', 'inApp'] as const;
        channels.forEach(channel => {
            if (this.notifications[channel]) {
                this.notifications[channel].enabled = false;
            }
        });
    }

    // Logic 2: จัดการ Bounded Arrays (FIFO)
    const handleBoundedArray = (path: 'blockedGenres' | 'blockedTags' | 'blockedAuthors' | 'blockedNovels') => {
        if (path === 'blockedTags') {
            const limit = DEFAULT_VALUES.MAX_BLOCKED_TAGS;
            if (this.isModified(`contentAndPrivacy.blockedTags`) && this.contentAndPrivacy.blockedTags.length > limit) {
                this.contentAndPrivacy.blockedTags = this.contentAndPrivacy.blockedTags.slice(this.contentAndPrivacy.blockedTags.length - limit);
            }
        } else {
            const limit = DEFAULT_VALUES.MAX_BLOCKED_ITEMS;
            // In this branch, `path` is one of the ObjectId[] types, so the assignment is safe.
            if (this.isModified(`contentAndPrivacy.${path}`) && this.contentAndPrivacy[path].length > limit) {
                this.contentAndPrivacy[path] = this.contentAndPrivacy[path].slice(this.contentAndPrivacy[path].length - limit);
            }
        }
    };
    
    handleBoundedArray('blockedGenres');
    handleBoundedArray('blockedTags');
    handleBoundedArray('blockedAuthors');
    handleBoundedArray('blockedNovels');

    next();
});


// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const UserSettingsModel = (models.UserSettings as mongoose.Model<IUserSettings>) || model<IUserSettings>("UserSettings", UserSettingsSchema);

export default UserSettingsModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Centralized Defaults:** การย้ายค่าเริ่มต้นทั้งหมดมาไว้ใน `DEFAULT_VALUES` ช่วยให้การปรับแต่งค่า Default ทั่วทั้งแอปพลิเคชันทำได้จากจุดเดียว
//
// 2.  **Type Safety:** การเปลี่ยน field ที่มีความกำกวม (เช่น `fontSize` ที่เป็น mixed type, `textSpeed` และ `textSpeedNumeric` ที่ทำงานคู่กัน)
//     ให้เป็น type เดียวที่ชัดเจน (เช่น `fontSize: number`, `textSpeedValue: number`) ช่วยลดข้อผิดพลาดและทำให้โค้ดฝั่ง Client และ Server เข้าใจตรงกันได้ง่ายขึ้น
//
// 3.  **Bounded Arrays:** การใช้ `validate` ร่วมกับ middleware `pre('save')` เพื่อจำกัดขนาดของ array (เช่น `blockedAuthors`)
//     เป็นกลยุทธ์สำคัญในการป้องกัน "Unbounded Array" ซึ่งอาจทำให้ขนาดเอกสาร MongoDB ใหญ่เกินไปและส่งผลต่อประสิทธิภาพ
//
// 4.  **Dynamic Configuration:** การใช้ `SUPPORTED_LANGUAGES` และ `SUPPORTED_THEMES` ทำให้การเปิด/ปิดฟีเจอร์ (Feature Flagging)
//     หรือการเพิ่มตัวเลือกใหม่ๆ ในอนาคตทำได้โดยไม่ต้องแก้ไข Schema โดยตรง
//
// 5.  **Service Layer Responsibility:** ยังคงเป็นแนวปฏิบัติที่ดีที่สุดที่ Service Layer (เช่น `UserService` หรือ `AuthService`)
//     จะเป็นผู้รับผิดชอบในการสร้างเอกสาร UserSettings เริ่มต้นสำหรับผู้ใช้ใหม่ โดยเรียก `new UserSettingsModel({ userId: newUser._id }).save()`
//     หลังจากที่สร้าง User document สำเร็จ
//
// 6.  **Schema Versioning & Migration:** ฟิลด์ `settingsVersion` ที่เพิ่มเข้ามาเป็นรากฐานสำคัญสำหรับ "Schema Migration" ในอนาคต
//     หากมีการเปลี่ยนแปลงโครงสร้างของ Settings ที่ไม่สามารถใช้ค่า Default ได้ Application Layer ควรอ่านเวอร์ชันนี้
//     และทำการแปลงข้อมูล on-the-fly ก่อนส่งให้ client พร้อมกับอัปเดตเอกสารให้เป็นเวอร์ชันล่าสุด
//
// 7.  **Utility Functions:** การมี `TextSpeedUtils` และ `VolumeUtils` ช่วยแยก Logic การแปลงค่าออกจาก Business Logic หลัก
//     ทำให้การคำนวณสอดคล้องกันทุกส่วนของแอปพลิเคชันที่ต้องการใช้ค่าเหล่านี้
// ==================================================================================================