// src/backend/models/Scene.ts
// โมเดลฉากใน Visual Novel (Scene Model) - หัวใจหลักของ Visual Novel Editor แพลตฟอร์ม DivWy
// เวอร์ชันปรับปรุง: เพิ่มความสามารถในการจัดการสถานะที่ซับซ้อน, UI elements, และ Timeline control ที่ละเอียดขึ้น

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
// IUser, INovel, IEpisode, ICharacter, IChoice, IMedia, IOfficialMedia, IItem, IStoryState จะถูก import ตามการใช้งานจริง
// หรือใช้ Types.ObjectId แล้วให้ service layer จัดการ populate และ type checking

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Scene
// ==================================================================================================

/**
 * @enum {string} TextContentType
 * @description ประเภทของเนื้อหาข้อความในฉาก
 * - `dialogue`: บทสนทนาของตัวละคร
 * - `narration`: คำบรรยาย หรือความคิดของผู้บรรยาย/ผู้เล่าเรื่อง
 * - `thought_bubble`: ข้อความในใจของตัวละคร (แสดงผลแตกต่างจาก narration)
 * - `ui_text`: ข้อความบน User Interface ภายในฉาก เช่น ชื่อปุ่ม, คำแนะนำการเล่น
 * - `label`: ป้ายชื่อ หรือคำอธิบายสั้นๆ บนองค์ประกอบต่างๆ ในฉาก
 * - `system_message`: ข้อความจากระบบเกม (เช่น "คุณได้รับไอเทม X", "บันทึกเกมแล้ว")
 */
export enum TextContentType {
  DIALOGUE = "dialogue",
  NARRATION = "narration",
  THOUGHT_BUBBLE = "thought_bubble",
  UI_TEXT = "ui_text",
  LABEL = "label",
  SYSTEM_MESSAGE = "system_message",
}

/**
 * @enum {string} VisualNovelMediaType
 * @description ประเภทของสื่อที่ใช้ในฉาก Visual Novel (เพื่อความชัดเจนในการจัดการภายใน Scene Editor)
 * - `image`: รูปภาพ (เช่น CG, item icon, background part, character expression ที่เป็นไฟล์แยก)
 * - `video`: วิดีโอ (เช่น cutscene, animated background, special effect video)
 * - `audio_effect`: เสียงประกอบ (SFX - Sound Effects)
 * - `background_music`: เพลงประกอบฉาก (BGM - Background Music)
 * - `voice_over`: เสียงพากย์ของตัวละคร หรือเสียงผู้บรรยาย
 * - `character_sprite`: สไปรท์ตัวละคร (อาจเป็น sprite sheet หรือภาพตัวละครเต็มตัวที่ใช้แสดง)
 * - `ui_asset`: ทรัพยากรสำหรับ UI โดยเฉพาะ (เช่น กรอบข้อความ, รูปปุ่ม, ไอคอน UI)
 */
export enum VisualNovelMediaType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO_EFFECT = "audio_effect",
  BACKGROUND_MUSIC = "background_music",
  VOICE_OVER = "voice_over",
  CHARACTER_SPRITE = "character_sprite",
  UI_ASSET = "ui_asset",
}

/**
 * @enum {string} VariableScope
 * @description ขอบเขตของตัวแปรที่จะถูกตั้งค่าโดย ChoiceActionType.SET_VARIABLE หรือ TimelineEventType.SET_VARIABLE
 * - `scene`: ตัวแปรเฉพาะฉากนี้ (ISceneVariable)
 * - `episode`: ตัวแปรของตอนนี้ (อาจเก็บใน Episode Model หรือ StoryState ที่เชื่อมโยงกับ Episode)
 * - `novel_global`: ตัวแปรส่วนกลางของนิยาย (StoryState)
 * - `player_profile`: ตัวแปรของผู้เล่น (เช่น achievements, ค่าสถิติรวม ที่จัดเก็บใน User Model หรือ PlayerProfile Model แยก)
 * - `character_status`: สถานะหรือตัวแปรของตัวละครที่ระบุ (อ้างอิง Character Model หรือข้อมูลสถานะที่เกี่ยวข้อง)
 */
export enum VariableScope {
  SCENE = "scene",
  EPISODE = "episode",
  NOVEL_GLOBAL = "novel_global",
  PLAYER_PROFILE = "player_profile",
  CHARACTER_STATUS = "character_status",
}

/**
 * @enum {string} ChoiceActionType
 * @description ประเภทของการกระทำ (Action) ที่จะเกิดขึ้นเมื่อผู้เล่นเลือกตัวเลือก (Choice)
 * ปรับปรุงให้รองรับการจัดการสถานะและตัวแปรที่ละเอียดขึ้น
 */
export enum ChoiceActionType {
  GO_TO_SCENE = "go_to_scene",
  SET_VARIABLE = "set_variable",
  UPDATE_RELATIONSHIP = "update_relationship",
  UNLOCK_ACHIEVEMENT = "unlock_achievement",
  PLAY_SOUND = "play_sound",
  SHOW_MEDIA_ELEMENT = "show_media_element",
  HIDE_MEDIA_ELEMENT = "hide_media_element",
  ADD_ITEM_TO_INVENTORY = "add_item_to_inventory",
  REMOVE_ITEM_FROM_INVENTORY = "remove_item_from_inventory",
  USE_ITEM = "use_item",
  CUSTOM_SCRIPT = "custom_script",
  END_NOVEL_BRANCH = "end_novel_branch",
  CONDITIONAL_ACTION = "conditional_action",
  START_QUEST = "start_quest",
  UPDATE_QUEST_PROGRESS = "update_quest_progress",
  APPLY_STATUS_EFFECT = "apply_status_effect",
  REMOVE_STATUS_EFFECT = "remove_status_effect",
}

/**
 * @enum {string} TimelineEventType
 * @description ประเภทของเหตุการณ์ (Event) ที่สามารถเกิดขึ้นใน Timeline ของฉาก
 */
export enum TimelineEventType {
  // Character Control
  SHOW_CHARACTER = "show_character",
  HIDE_CHARACTER = "hide_character",
  CHANGE_CHARACTER_EXPRESSION = "change_character_expression",
  MOVE_CHARACTER = "move_character",
  CHARACTER_ANIMATION = "character_animation",
  APPLY_CHARACTER_STATUS = "apply_character_status",
  REMOVE_CHARACTER_STATUS = "remove_character_status",

  // Text Control
  SHOW_TEXT_BLOCK = "show_text_block",
  HIDE_TEXT_BLOCK = "hide_text_block",
  UPDATE_TEXT_BLOCK = "update_text_block",

  // Audio Control
  PLAY_AUDIO = "play_audio",
  STOP_AUDIO = "stop_audio",
  ADJUST_AUDIO_VOLUME = "adjust_audio_volume", // << เพิ่มใหม่
  FADE_AUDIO_VOLUME = "fade_audio_volume",   // << เพิ่มใหม่
  SET_AUDIO_PITCH = "set_audio_pitch",       // << เพิ่มใหม่
  SET_AUDIO_PAN = "set_audio_pan",         // << เพิ่มใหม่


  // Background Control
  CHANGE_BACKGROUND = "change_background",

  // Visual Element (CGs, Overlays) Control
  SHOW_VISUAL_ELEMENT = "show_visual_element",
  HIDE_VISUAL_ELEMENT = "hide_visual_element",
  ANIMATE_VISUAL_ELEMENT = "animate_visual_element",

  // Video Element Control
  SHOW_VIDEO_ELEMENT = "show_video_element",
  HIDE_VIDEO_ELEMENT = "hide_video_element",
  CONTROL_VIDEO = "control_video",

  // Status UI Element Control
  SHOW_STATUS_UI_ELEMENT = "show_status_ui_element",
  HIDE_STATUS_UI_ELEMENT = "hide_status_ui_element",
  UPDATE_STATUS_UI_ELEMENT = "update_status_ui_element",

  // Choice Group Control
  SHOW_CHOICE_GROUP = "show_choice_group",
  HIDE_CHOICE_GROUP = "hide_choice_group",

  // Scene Logic & Flow
  WAIT = "wait",
  SET_VARIABLE = "set_variable",
  RUN_CUSTOM_SCRIPT = "run_custom_script",
  SCREEN_EFFECT = "screen_effect",
  TRANSITION_EFFECT = "transition_effect",
  APPLY_SCENE_EFFECT = "apply_scene_effect",
  REMOVE_SCENE_EFFECT = "remove_scene_effect",
  TRIGGER_HOTSPOT = "trigger_hotspot",
  ENABLE_HOTSPOT = "enable_hotspot",

  // Camera Control << เพิ่มใหม่
  CAMERA_ZOOM = "camera_zoom",
  CAMERA_PAN = "camera_pan",
  CAMERA_ROTATE = "camera_rotate",
  CAMERA_SHAKE = "camera_shake",
  CAMERA_FOCUS_ON_TARGET = "camera_focus_on_target", // << เพิ่มใหม่ (Optional)
  CAMERA_RESET = "camera_reset",                 // << เพิ่มใหม่ (Optional)
  END_NOVEL = "end_novel",
}

/**
 * @enum {string} SceneTransitionType
 * @description ประเภทของการเปลี่ยนฉาก (Transition) เมื่อจะไปยังฉากถัดไป
 */
export enum SceneTransitionType {
  NONE = "none", FADE = "fade", SLIDE_LEFT = "slide_left", SLIDE_RIGHT = "slide_right",
  SLIDE_UP = "slide_up", SLIDE_DOWN = "slide_down",
  WIPE_LEFT = "wipe_left",         // << เพิ่มใหม่
  WIPE_RIGHT = "wipe_right",       // << เพิ่มใหม่
  WIPE_UP = "wipe_up",           // << เพิ่มใหม่
  WIPE_DOWN = "wipe_down",         // << เพิ่มใหม่
  DISSOLVE = "dissolve",         // << เพิ่มใหม่
  ZOOM_IN = "zoom_in",           // << เพิ่มใหม่
  ZOOM_OUT = "zoom_out",          // << เพิ่มใหม่
  CUSTOM = "custom",
}

/**
 * @enum {string} ScreenEffectType
 * @description (เพิ่มใหม่ ถ้ายังไม่มี) ประเภทของ Screen Effect
 */
export enum ScreenEffectType {
    SHAKE = "shake",
    FLASH = "flash",
    BLUR = "blur",
    FADE_TO_COLOR = "fade_to_color", // << เพิ่มใหม่
    GRAYSCALE = "grayscale",
    SEPIA = "sepia",
    INVERT_COLORS = "invert_colors",
    CUSTOM_SHADER = "custom_shader", // สำหรับเอฟเฟกต์ที่ซับซ้อน
}


/**
 * @enum {string} StatusEffectType
 * @description ประเภทของ Status Effect
 */
export enum StatusEffectType {
  BUFF = "buff", DEBUFF = "debuff", DAMAGE_OVER_TIME = "damage_over_time",
  HEAL_OVER_TIME = "heal_over_time", STUN = "stun", SILENCE = "silence",
  MODIFIER = "modifier", CUSTOM = "custom",
}

/**
 * @enum {string} StatusUIType
 * @description ประเภทของ UI ที่ใช้แสดงสถานะ
 */
export enum StatusUIType {
  GAUGE_BAR = "gauge_bar", NUMERIC_DISPLAY = "numeric_display", ICON_LIST = "icon_list",
  TEXT_LABEL = "text_label", RADIAL_GAUGE = "radial_gauge", CUSTOM_HTML = "custom_html",
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซย่อย (Sub-Interfaces) และ Schemas ย่อยสำหรับโครงสร้างข้อมูลที่ซับซ้อนภายใน Scene
// ==================================================================================================

/**
 * @interface ITransform
 * @description ข้อมูลการแปลงรูปทรงขององค์ประกอบในฉาก (ตำแหน่ง, ขนาด, การหมุน, ความโปร่งใส, ลำดับการแสดงผล)
 */
export interface ITransform {
  positionX?: number; positionY?: number; scaleX?: number; scaleY?: number;
  rotation?: number; opacity?: number; zIndex?: number;
  anchorPointX?: "left" | "center" | "right";
  anchorPointY?: "top" | "center" | "bottom";
}
const TransformSchema = new Schema<ITransform>({
  positionX: { type: Number, default: 0 },
  positionY: { type: Number, default: 0 },
  scaleX: { type: Number, default: 1, min:0 },
  scaleY: { type: Number, default: 1, min:0 },
  rotation: { type: Number, default: 0 },
  opacity: { type: Number, default: 1, min: 0, max: 1 },
  zIndex: { type: Number, default: 0 },
  anchorPointX: { type: String, enum: ["left", "center", "right"], default: "center" },
  anchorPointY: { type: String, enum: ["top", "center", "bottom"], default: "center" },
}, { _id: false });


/**
 * @interface IBackgroundSetting
 * @description การตั้งค่าพื้นหลังของฉาก
 */
export interface IBackgroundSetting {
  type: "color" | "image" | "video"; value: string; isOfficialMedia?: boolean;
  blurEffect?: string; colorOverlay?: string; fitMode?: "cover" | "contain" | "tile" | "stretch";
}
const BackgroundSettingSchema = new Schema<IBackgroundSetting>({
  type: { type: String, enum: ["color", "image", "video"], default: "color", required: true },
  value: { type: String, required: [true, "กรุณาระบุค่าสำหรับพื้นหลัง"], trim: true },
  isOfficialMedia: { type: Boolean, default: false },
  blurEffect: { type: String, trim: true, maxlength: [50, "Blur effect string is too long"] },
  colorOverlay: { type: String, trim: true, maxlength: [50, "Color overlay string is too long"] },
  fitMode: { type: String, enum: ["cover", "contain", "tile", "stretch"], default: "cover"}
}, { _id: false });


/**
 * @interface IConditionLogic
 * @description โครงสร้างสำหรับเงื่อนไขที่ซับซ้อน
 */
export interface IConditionLogic {
  type: "variable_check" | "inventory_check" | "status_effect_check" | "script_check" | "compound_logic";
  variableName?: string; scope?: VariableScope; characterInstanceIdForVar?: string; characterIdForVar?: Types.ObjectId;
  comparisonOperator?: "==" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "not_contains" | "has_flag" | "missing_flag";
  expectedValue?: any;
  itemId?: Types.ObjectId; quantityRequired?: number; inventoryOwnerInstanceId?: string;
  targetCharacterInstanceIdForStatus?: string; statusEffectName?: string; hasStatusEffect?: boolean;
  scriptIdToCheck?: string; scriptContentToCheck?: string;
  logicalOperator?: "AND" | "OR" | "NOT";
  subConditions?: IConditionLogic[];
}
const ConditionLogicSchema = new Schema<IConditionLogic>({
  type: { type: String, enum: ["variable_check", "inventory_check", "status_effect_check", "script_check", "compound_logic"], required: true },
  variableName: { type: String, trim: true },
  scope: { type: String, enum: Object.values(VariableScope) },
  characterInstanceIdForVar: { type: String, trim: true },
  characterIdForVar: { type: Schema.Types.ObjectId, ref: 'Character' },
  comparisonOperator: { type: String, enum: ["==", "!=", ">", "<", ">=", "<=", "contains", "not_contains", "has_flag", "missing_flag"] },
  expectedValue: { type: Schema.Types.Mixed },
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
  quantityRequired: { type: Number, default: 1 },
  inventoryOwnerInstanceId: { type: String, trim: true },
  targetCharacterInstanceIdForStatus: { type: String, trim: true },
  statusEffectName: { type: String, trim: true },
  hasStatusEffect: { type: Boolean },
  scriptIdToCheck: { type: String, trim: true },
  scriptContentToCheck: { type: String, trim: true },
  logicalOperator: { type: String, enum: ["AND", "OR", "NOT"] },
}, { _id: false });
(ConditionLogicSchema as any).add({ subConditions: [ConditionLogicSchema] });


/**
 * @interface IStatusEffect
 * @description ข้อมูล Status Effect ที่สามารถนำไปใช้กับตัวละครหรือองค์ประกอบอื่นๆ
 */
export interface IStatusEffect {
  effectName: string; type: StatusEffectType; description?: string;
  iconMediaId?: Types.ObjectId; iconMediaSourceType?: "Media" | "OfficialMedia";
  durationMs?: number; magnitude?: number; tickIntervalMs?: number;
  affectedStats?: { statName: string; changeValue: string | number; isPercentage?: boolean; }[];
  customLogicScriptId?: string;
  applicationConditions?: Types.DocumentArray<IConditionLogic>;
  stackable?: boolean; maxStacks?: number;
  visualEffectOnCharacter?: string;
  soundEffectOnApply?: string;
  soundEffectOnTick?: string;
  soundEffectOnExpire?: string;
}
const StatusEffectSchema = new Schema<IStatusEffect>({
  effectName: { type: String, required: true, trim: true, maxlength: 100 },
  type: { type: String, enum: Object.values(StatusEffectType), required: true },
  description: { type: String, trim: true, maxlength: 255 },
  iconMediaId: { type: Schema.Types.ObjectId, refPath: "statusEffectIconMediaSourceType" },
  iconMediaSourceType: { type: String, enum: ["Media", "OfficialMedia"], alias: "statusEffectIconMediaSourceType" },
  durationMs: { type: Number, min: 0, default: 0 },
  magnitude: { type: Number },
  tickIntervalMs: { type: Number, min: 0 },
  affectedStats: [{
    _id: false,
    statName: { type: String, required: true, trim: true },
    changeValue: { type: Schema.Types.Mixed, required: true },
    isPercentage: { type: Boolean, default: false },
  }],
  customLogicScriptId: { type: String, trim: true },
  applicationConditions: [ConditionLogicSchema],
  stackable: { type: Boolean, default: false },
  maxStacks: { type: Number, min: 1, default: 1 },
  visualEffectOnCharacter: { type: String, trim: true },
  soundEffectOnApply: { type: String, trim: true },
  soundEffectOnTick: { type: String, trim: true },
  soundEffectOnExpire: { type: String, trim: true },
}, { _id: false });


/**
 * @interface ICharacterInScene
 * @description การตั้งค่าตัวละครที่ปรากฏในฉาก
 */
export interface ICharacterInScene {
  instanceId: string; characterId: Types.ObjectId; expressionId?: string;
  transform?: ITransform; isVisible?: boolean;
  enterAnimation?: string; exitAnimation?: string; layerId?: string;
  currentStatusEffects?: Types.DocumentArray<IStatusEffect>;
}
const CharacterInSceneSchema = new Schema<ICharacterInScene>({
  instanceId: { type: String, required: [true, "Instance ID is required for character in scene"] },
  characterId: { type: Schema.Types.ObjectId, ref: "Character", required: [true, "กรุณาระบุ ID ของตัวละคร (Character ID is required)"] },
  expressionId: { type: String, trim: true },
  transform: { type: TransformSchema, default: () => ({}) },
  isVisible: { type: Boolean, default: true },
  enterAnimation: { type: String, trim: true, maxlength: [100, "Enter animation name is too long"] },
  exitAnimation: { type: String, trim: true, maxlength: [100, "Exit animation name is too long"] },
  layerId: { type: String, trim: true },
  currentStatusEffects: [StatusEffectSchema],
}, { _id: false });

/**
 * @interface ITextContent
 * @description การตั้งค่าข้อความที่แสดงในฉาก (เช่น บทสนทนา, คำบรรยาย)
 */
export interface ITextContent {
  instanceId: string; type: TextContentType; characterId?: Types.ObjectId;
  speakerDisplayName?: string; content: string; fontFamily?: string; fontSize?: number;
  color?: string; textAlign?: "left" | "center" | "right" | "justify";
  transform?: ITransform; voiceOverMediaId?: Types.ObjectId;
  voiceOverMediaSourceType?: "Media" | "OfficialMedia"; displaySpeed?: number;
  textStylePresetId?: string; layerId?: string;
}
const TextContentSchema = new Schema<ITextContent>({
  instanceId: { type: String, required: [true, "Instance ID is required for text content"] },
  type: { type: String, enum: Object.values(TextContentType), default: TextContentType.DIALOGUE, required: true },
  characterId: { type: Schema.Types.ObjectId, ref: "Character" },
  speakerDisplayName: { type: String, trim: true, maxlength: [100, "Speaker display name is too long"] },
  content: { type: String, required: [true, "กรุณาระบุเนื้อหาข้อความ (Text content is required)"], trim: false, maxlength: [5000, "เนื้อหาข้อความยาวเกินไป"] },
  fontFamily: { type: String, trim: true, maxlength: [100, "Font family name is too long"] },
  fontSize: { type: Number, min: 1 },
  color: { type: String, trim: true, maxlength: [50, "Color string is too long"] },
  textAlign: { type: String, enum: ["left", "center", "right", "justify"], default: "left" },
  transform: { type: TransformSchema, default: () => ({}) },
  voiceOverMediaId: { type: Schema.Types.ObjectId, refPath: "textContentVoiceOverMediaSourceType" },
  voiceOverMediaSourceType: { type: String, enum: ["Media", "OfficialMedia"], alias: "textContentVoiceOverMediaSourceType"},
  displaySpeed: { type: Number, default:0, min: 0 },
  textStylePresetId: { type: String, trim: true },
  layerId: { type: String, trim: true },
}, { _id: false });


/**
 * @interface IVisualElement
 * @description การตั้งค่าองค์ประกอบภาพ (เช่น รูปภาพ CG, icons, overlays) ในฉาก
 */
export interface IVisualElement {
  instanceId: string; mediaId: Types.ObjectId; mediaSourceType: "Media" | "OfficialMedia";
  transform?: ITransform; isVisible?: boolean; altText?: string;
  onClickActionScript?: string;
  hoverEffect?: string; layerId?: string;
}
const VisualElementSchema = new Schema<IVisualElement>({
  instanceId: { type: String, required: [true, "Instance ID is required for visual element"] },
  mediaId: { type: Schema.Types.ObjectId, required: [true, "Media ID is required for visual element"], refPath: "visualElementMediaSourceType" },
  mediaSourceType: { type: String, enum: ["Media", "OfficialMedia"], required: true, alias: "visualElementMediaSourceType" },
  transform: { type: TransformSchema, default: () => ({}) },
  isVisible: { type: Boolean, default: true },
  altText: { type: String, trim: true, maxlength: [255, "Alt text is too long"] },
  onClickActionScript: { type: String, trim: true, maxlength: [1000, "onClickAction script is too long"] },
  hoverEffect: {type: String, trim: true, maxlength: [100, "Hover effect name is too long"]},
  layerId: { type: String, trim: true },
}, { _id: false });


/**
 * @interface IVideoElement
 * @description การตั้งค่าวิดีโอในฉาก
 */
export interface IVideoElement {
  instanceId: string; mediaId: Types.ObjectId; mediaSourceType: "Media" | "OfficialMedia";
  transform?: ITransform; autoplay?: boolean; loop?: boolean; controls?: boolean;
  volume?: number; isMuted?: boolean; isVisible?: boolean; onEndedActionScript?: string; layerId?: string;
}
const VideoElementSchema = new Schema<IVideoElement>({
  instanceId: { type: String, required: [true, "Instance ID is required for video element"] },
  mediaId: { type: Schema.Types.ObjectId, required: [true, "Media ID is required for video element"], refPath: "videoElementMediaSourceType" },
  mediaSourceType: { type: String, enum: ["Media", "OfficialMedia"], required: true, alias: "videoElementMediaSourceType" },
  transform: { type: TransformSchema, default: () => ({}) },
  autoplay: { type: Boolean, default: false },
  loop: { type: Boolean, default: false },
  controls: { type: Boolean, default: false },
  volume: { type: Number, min: 0, max: 1, default: 1 },
  isMuted: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true },
  onEndedActionScript: { type: String, trim: true, maxlength: [1000, "onEndedAction script is too long"]},
  layerId: { type: String, trim: true },
}, { _id: false });


/**
 * @interface IAudioElement
 * @description การตั้งค่าเสียงในฉาก (SFX, BGM, Voice Over ที่ไม่ได้ผูกกับ TextContent โดยตรง)
 * เพิ่ม volume, pan, pitch, fadeInSeconds, fadeOutSeconds, loopStartPointMs, loopEndPointMs ตามโจทย์
 */
export interface IAudioElement {
  instanceId: string;
  type: "audio_effect" | "background_music" | "voice_over";
  mediaId: Types.ObjectId;
  mediaSourceType: "Media" | "OfficialMedia";
  /** @description ระดับความดังของเสียง (0.0 ถึง 1.0, ค่าเริ่มต้น 1.0) */
  volume?: number;
  /** @description ตำแหน่งเสียงในระบบสเตอริโอ (-1 ซ้ายสุด, 0 กลาง, 1 ขวาสุด, ค่าเริ่มต้น 0) */
  pan?: number;
  /** @description ระดับ pitch ของเสียง (เช่น 0.5 ถึง 2.0, ค่าเริ่มต้น 1.0) */
  pitch?: number;
  loop?: boolean;
  autoplayOnLoad?: boolean;
  /** @description (สำหรับ BGM/Loopable) ระยะเวลา fade in (วินาที) */
  fadeInSeconds?: number;
  /** @description (สำหรับ BGM/Loopable) ระยะเวลา fade out (วินาที) */
  fadeOutSeconds?: number;
  /** @description (สำหรับ BGM/Loopable) จุดเริ่มต้นการวนลูป (มิลลิวินาที) */
  loopStartPointMs?: number;
  /** @description (สำหรับ BGM/Loopable) จุดสิ้นสุดการวนลูป (มิลลิวินาที) */
  loopEndPointMs?: number;
  audioChannel?: string;
}
const AudioElementSchema = new Schema<IAudioElement>({
  instanceId: { type: String, required: [true, "Instance ID is required for audio element"] },
  type: { type: String, enum: ["audio_effect", "background_music", "voice_over"], required: true },
  mediaId: { type: Schema.Types.ObjectId, required: [true, "Media ID is required for audio element"], refPath: "audioElementMediaSourceType" },
  mediaSourceType: { type: String, enum: ["Media", "OfficialMedia"], required: true, alias: "audioElementMediaSourceType" },
  volume: { type: Number, min: 0, max: 1, default: 1, comment: "ระดับความดัง (0-1)" },
  pan: { type: Number, min: -1, max: 1, default: 0, comment: "ตำแหน่งสเตอริโอ (-1 ซ้าย, 0 กลาง, 1 ขวา)" },
  pitch: { type: Number, default: 1, comment: "ระดับ Pitch (เช่น 0.5-2.0)" },
  loop: { type: Boolean, default: false },
  autoplayOnLoad: { type: Boolean, default: false },
  fadeInSeconds: { type: Number, min: 0, comment: "ระยะเวลา Fade In (วินาที)" },
  fadeOutSeconds: { type: Number, min: 0, comment: "ระยะเวลา Fade Out (วินาที)" },
  loopStartPointMs: { type: Number, min: 0, comment: "จุดเริ่ม Loop (ms)" },
  loopEndPointMs: { type: Number, min: 0, comment: "จุดจบ Loop (ms)" },
  audioChannel: { type: String, trim: true, maxlength: [50, "Audio channel name is too long"] },
}, { _id: false });


/**
 * @interface IChoiceGroupInScene
 * @description การอ้างอิงกลุ่มตัวเลือก (Choice Group) ที่จะแสดงในฉากนี้
 */
export interface IChoiceGroupInScene {
  instanceId: string; choiceGroupId: Types.ObjectId;
  transform?: ITransform; isModal?: boolean;
  displayCondition?: string | IConditionLogic;
  layerId?: string;
  choiceGroupLayout?: string;
}
const ChoiceGroupInSceneSchema = new Schema<IChoiceGroupInScene>({
  instanceId: { type: String, required: [true, "Instance ID is required for choice group in scene"] },
  choiceGroupId: { type: Schema.Types.ObjectId, ref: "Choice", required: [true, "Choice Group ID (referencing a Choice document) is required"] },
  transform: { type: TransformSchema, default: () => ({}) },
  isModal: { type: Boolean, default: true },
  displayCondition: { type: ConditionLogicSchema },
  layerId: { type: String, trim: true },
  choiceGroupLayout: { type: String, trim: true },
}, { _id: false });


/**
 * @interface IConfigurableAction
 * @description โครงสร้าง Action ที่สามารถกำหนดค่าได้
 */
export interface IConfigurableAction {
  actionType: ChoiceActionType;
  actionParameters: any;
  delayMs?: number;
  conditionToExecute?: string | IConditionLogic;
}
const ConfigurableActionSchema = new Schema<IConfigurableAction>({
  actionType: { type: String, enum: Object.values(ChoiceActionType), required: true },
  actionParameters: { type: Schema.Types.Mixed, required: true },
  delayMs: { type: Number, min: 0, default: 0 },
  conditionToExecute: { type: ConditionLogicSchema },
}, { _id: false });


/**
 * @interface IInteractiveHotspot
 * @description พื้นที่ (รูปทรงต่างๆ) ที่ผู้เล่นสามารถคลิกได้บนฉาก
 */
export interface IInteractiveHotspot {
  hotspotId: string; transform: ITransform;
  shapeType?: "rectangle" | "circle" | "polygon";
  shapeData?: any;
  tooltip?: string;
  actions: Types.DocumentArray<IConfigurableAction>;
  isVisibleDebug?: boolean; isActive?: boolean;
  activationCondition?: string | IConditionLogic;
  consumeClick?: boolean; layerId?: string; maxClicks?: number;
  hoverEnterActions?: Types.DocumentArray<IConfigurableAction>;
  hoverExitActions?: Types.DocumentArray<IConfigurableAction>;
  cursorStyle?: string;
}
const InteractiveHotspotSchema = new Schema<IInteractiveHotspot>({
  hotspotId: { type: String, required: [true, "Hotspot ID is required"] },
  transform: { type: TransformSchema, required: [true, "Transform is required for hotspot to define its area"] },
  shapeType: { type: String, enum: ["rectangle", "circle", "polygon"], default: "rectangle" },
  shapeData: { type: Schema.Types.Mixed },
  tooltip: { type: String, trim: true, maxlength: [255, "Tooltip for hotspot is too long"] },
  actions: [ConfigurableActionSchema],
  isVisibleDebug: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  activationCondition: { type: ConditionLogicSchema },
  consumeClick: { type: Boolean, default: false },
  layerId: { type: String, trim: true },
  maxClicks: { type: Number, min:0, default:0 },
  hoverEnterActions: [ConfigurableActionSchema],
  hoverExitActions: [ConfigurableActionSchema],
  cursorStyle: { type: String, trim: true },
}, { _id: false });


/**
 * @interface ISceneLayer
 * @description การจัดการ Layer ภายในฉาก
 */
export interface ISceneLayer {
  layerId: string; layerName: string; zIndex: number;
  isVisible?: boolean; isLocked?: boolean; opacity?: number;
  blendingMode?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity";
}
const SceneLayerSchema = new Schema<ISceneLayer>({
  layerId: { type: String, required: [true, "Layer ID is required"] },
  layerName: { type: String, required: [true, "Layer name is required"], trim: true, maxlength: [100, "Layer name is too long"] },
  zIndex: { type: Number, required: [true, "zIndex is required for layer ordering"] },
  isVisible: { type: Boolean, default: true },
  isLocked: { type: Boolean, default: false },
  opacity: { type: Number, min: 0, max: 1, default: 1 },
  blendingMode: { type: String, enum: ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], default: "normal" },
}, { _id: false });


// SECTION: Specific Timeline Event Parameter Interfaces (ตามที่ผู้ใช้กำหนดและเพิ่มเติม)

/** @interface ITimelineEventParametersBase - Base for all event parameters. */
export interface ITimelineEventParametersBase {
    transitionDurationMs?: number;
    easingFunction?: "linear" | "easeInQuad" | "easeOutQuad" | "easeInOutQuad" | string;
    /** @description (สำหรับ PLAY_AUDIO, STOP_AUDIO) ID ของ Audio Element instance ที่ต้องการควบคุม */
    audioElementInstanceId?: string; // << เพิ่มตามโจทย์
}

/** @description Parameters for SHOW_CHARACTER / HIDE_CHARACTER events */
export interface IShowHideCharacterEventParams extends ITimelineEventParametersBase {
    targetTransform?: ITransform; expressionId?: string; entryAnimation?: string; exitAnimation?: string;
}
/** @description Parameters for CHANGE_CHARACTER_EXPRESSION event */
export interface IChangeCharacterExpressionEventParams extends ITimelineEventParametersBase {
    newExpressionId: string;
}
/** @description Parameters for MOVE_CHARACTER event */
export interface IMoveCharacterEventParams extends ITimelineEventParametersBase {
    newTransform: ITransform;
}
/** @description Parameters for CHARACTER_ANIMATION event */
export interface ICharacterAnimationEventParams extends ITimelineEventParametersBase {
    animationName: string; loop?: boolean; iterations?: number;
}

// แก้ไข: เปลี่ยน IShowHideTextBlockEventParams จาก interface เป็น type alias
/** @description Parameters for SHOW_TEXT_BLOCK / HIDE_TEXT_BLOCK events */
export type IShowHideTextBlockEventParams = ITimelineEventParametersBase;

/** @description Parameters for UPDATE_TEXT_BLOCK event */
export interface IUpdateTextBlockEventParams extends ITimelineEventParametersBase {
    newContent?: string; newSpeakerDisplayName?: string; newColor?: string; typewriterEffectSpeed?: number;
}

/** @description Parameters for PLAY_AUDIO events (รวมจากโจทย์) */
export interface IPlayAudioParams extends ITimelineEventParametersBase {
    // audioElementInstanceId ถูกย้ายไป ITimelineEventParametersBase
    mediaId?: Types.ObjectId; mediaSourceType?: "Media" | "OfficialMedia";
    loop?: boolean; volume?: number; channel?: string; fadeInDurationMs?: number; startTimeInAudioMs?: number;
}
/** @description Parameters for STOP_AUDIO events (รวมจากโจทย์) */
export interface IStopAudioParams extends ITimelineEventParametersBase {
    // audioElementInstanceId ถูกย้ายไป ITimelineEventParametersBase
    mediaId?: Types.ObjectId; channel?: string; fadeOutDurationMs?: number;
}
/** @description Parameters for ADJUST_AUDIO_VOLUME events (ใหม่) */
export interface IAdjustAudioVolumeParams extends ITimelineEventParametersBase {
    // audioElementInstanceId ถูกย้ายไป ITimelineEventParametersBase
    targetVolume: number; // 0.0 ถึง 1.0
    // durationSeconds (สำหรับ transition) ควรมาจาก ITimelineEvent.durationMs
}
/** @description Parameters for FADE_AUDIO_VOLUME events (ใหม่) */
export interface IFadeAudioVolumeParams extends ITimelineEventParametersBase {
    // audioElementInstanceId ถูกย้ายไป ITimelineEventParametersBase
    targetVolume: number; // 0.0 ถึง 1.0
    // durationSeconds (ระยะเวลา fade) ควรมาจาก ITimelineEvent.durationMs
}
/** @description Parameters for SET_AUDIO_PITCH events (ใหม่) */
export interface ISetAudioPitchParams extends ITimelineEventParametersBase {
    // audioElementInstanceId ถูกย้ายไป ITimelineEventParametersBase
    targetPitch: number; // เช่น 0.5 ถึง 2.0
}
/** @description Parameters for SET_AUDIO_PAN events (ใหม่) */
export interface ISetAudioPanParams extends ITimelineEventParametersBase {
    // audioElementInstanceId ถูกย้ายไป ITimelineEventParametersBase
    targetPan: number; // -1 (L) ถึง 1 (R)
}


/** @description Parameters for CHANGE_BACKGROUND event */
export interface IChangeBackgroundEventParams extends ITimelineEventParametersBase {
    newBackground: IBackgroundSetting;
}

// แก้ไข: เปลี่ยน IShowHideVisualElementParams จาก interface เป็น type alias
/** @description Parameters for SHOW_VISUAL_ELEMENT / HIDE_VISUAL_ELEMENT events */
export type IShowHideVisualElementParams = ITimelineEventParametersBase;

/** @description Parameters for ANIMATE_VISUAL_ELEMENT event */
export interface IAnimateVisualElementEventParams extends ITimelineEventParametersBase {
    animationName?: string; targetTransform?: ITransform; loop?: boolean; iterations?: number;
}

// แก้ไข: เปลี่ยน IShowHideVideoElementParams จาก interface เป็น type alias
/** @description Parameters for SHOW_VIDEO_ELEMENT / HIDE_VIDEO_ELEMENT events */
export type IShowHideVideoElementParams = ITimelineEventParametersBase;

/** @description Parameters for CONTROL_VIDEO event */
export interface IControlVideoParams extends ITimelineEventParametersBase {
    controlType: "play" | "pause" | "stop" | "seek" | "set_volume" | "mute" | "unmute";
    seekTimeMs?: number; volumeLevel?: number;
}

// แก้ไข: เปลี่ยน IShowHideStatusUIElementParams จาก interface เป็น type alias
/** @description Parameters for SHOW_STATUS_UI_ELEMENT / HIDE_STATUS_UI_ELEMENT events */
export type IShowHideStatusUIElementParams = ITimelineEventParametersBase;

/** @description Parameters for UPDATE_STATUS_UI_ELEMENT event */
export interface IUpdateStatusUIElementParams extends ITimelineEventParametersBase {
    newValue?: any; overrideText?: string;
}

// แก้ไข: เปลี่ยน IShowHideChoiceGroupParams จาก interface เป็น type alias
/** @description Parameters for SHOW_CHOICE_GROUP / HIDE_CHOICE_GROUP events */
export type IShowHideChoiceGroupParams = ITimelineEventParametersBase;

// แก้ไข: เปลี่ยน IWaitEventParams จาก interface เป็น type alias
/** @description Parameters for WAIT event */
export type IWaitEventParams = ITimelineEventParametersBase;

/** @description Parameters for SET_VARIABLE event */
export interface ISetVariableParams extends ITimelineEventParametersBase {
  variableName: string; value: any; scope: VariableScope; characterInstanceId?: string;
}
/** @description Parameters for RUN_CUSTOM_SCRIPT event */
export interface IRunCustomScriptParams extends ITimelineEventParametersBase {
    scriptId?: string; scriptContent?: string; contextParameters?: { [key: string]: any };
}
/** @description Parameters for SCREEN_EFFECT event (ปรับปรุงตามโจทย์) */
export interface IScreenEffectParams extends ITimelineEventParametersBase {
    effectType: ScreenEffectType; // ใช้ Enum ใหม่
    /** @description ความรุนแรง (0.0-1.0 หรือ pixel สำหรับ shake) */
    intensity?: number;
    /** @description ระยะเวลาของเอฟเฟกต์ (ms) ถ้าไม่ระบุจะใช้ durationMs ของ Event */
    durationSeconds?: number; // << โจทย์ระบุเป็น seconds
    /** @description สี (HEX/RGBA) สำหรับ FLASH หรือ FADE_TO_COLOR */
    color?: string;
    shaderId?: string; shaderParameters?: { [key: string]: any };
}
/** @description Parameters for TRANSITION_EFFECT (intra-scene element transition) */
export interface ITransitionEffectParams extends ITimelineEventParametersBase {
    transitionName: string;
}
/** @description Parameters for APPLY_CHARACTER_STATUS event */
export interface IApplyCharacterStatusEventParams extends ITimelineEventParametersBase {
    statusEffectToApply: IStatusEffect;
}
/** @description Parameters for REMOVE_CHARACTER_STATUS event */
export interface IRemoveCharacterStatusEventParams extends ITimelineEventParametersBase {
    statusEffectName: string;
}

/** @interface ISceneEffectInstance */
export interface ISceneEffectInstance {
    instanceId: string;
    effectType: "fog" | "rain" | "snow" | "color_filter" | "post_process_shader" | "custom_overlay" | string;
    parameters: any;
    startTimeMsOffset?: number;
    durationMs?: number;
    targetLayerId?: string;
    zIndexInSceneEffects?: number;
}
const SceneEffectInstanceSchema = new Schema<ISceneEffectInstance>({
    instanceId: { type: String, required: true },
    effectType: { type: String, required: true },
    parameters: { type: Schema.Types.Mixed },
    startTimeMsOffset: { type: Number, min: 0, default:0 },
    durationMs: { type: Number, min: 0 },
    targetLayerId: { type: String, trim: true },
    zIndexInSceneEffects: { type: Number, default: 0 },
}, { _id: false });

/** @description Parameters for APPLY_SCENE_EFFECT event */
export interface IApplySceneEffectEventParams extends ITimelineEventParametersBase {
    effectInstance: ISceneEffectInstance;
}

// แก้ไข: เปลี่ยน IRemoveSceneEffectEventParams จาก interface เป็น type alias
/** @description Parameters for REMOVE_SCENE_EFFECT event */
export type IRemoveSceneEffectEventParams = ITimelineEventParametersBase;

// แก้ไข: เปลี่ยน ITriggerHotspotEventParams จาก interface เป็น type alias
/** @description Parameters for TRIGGER_HOTSPOT event */
export type ITriggerHotspotEventParams = ITimelineEventParametersBase;

/** @description Parameters for ENABLE_HOTSPOT event */
export interface IEnableHotspotEventParams extends ITimelineEventParametersBase {
    shouldBeEnabled: boolean;
}

// Camera Control Event Parameters (ใหม่)
/** @description Parameters for CAMERA_ZOOM event */
export interface ICameraZoomEventParams extends ITimelineEventParametersBase {
    targetZoom: number; // เช่น 1.5 (150%), 0.8 (80%)
    // durationSeconds จากโจทย์ ควรแปลงเป็น durationMs ใน ITimelineEvent
}
/** @description Parameters for CAMERA_PAN event */
export interface ICameraPanEventParams extends ITimelineEventParametersBase {
    targetPosition: { x: number; y: number };
    // durationSeconds จากโจทย์ ควรแปลงเป็น durationMs ใน ITimelineEvent
}
/** @description Parameters for CAMERA_ROTATE event */
export interface ICameraRotateEventParams extends ITimelineEventParametersBase {
    targetRotation: number; // องศา
    // durationSeconds จากโจทย์ ควรแปลงเป็น durationMs ใน ITimelineEvent
}
/** @description Parameters for CAMERA_SHAKE event */
export interface ICameraShakeEventParams extends ITimelineEventParametersBase {
    intensity: number; // ความรุนแรง
    // durationSeconds จากโจทย์ ควรแปลงเป็น durationMs ใน ITimelineEvent
}
/** @description Parameters for CAMERA_FOCUS_ON_TARGET event */
export interface ICameraFocusOnTargetEventParams extends ITimelineEventParametersBase {
    targetInstanceId: string; // characterInstanceId หรือ elementInstanceId
    zoomLevel?: number; // Optional: zoom level when focusing
}

// แก้ไข: เปลี่ยน ICameraResetEventParams จาก interface เป็น type alias
/** @description Parameters for CAMERA_RESET event */
export type ICameraResetEventParams = ITimelineEventParametersBase;


/**
 * @interface ITimelineEvent
 * @description เหตุการณ์ (Event) ที่เกิดขึ้นใน Timeline ของฉาก เพื่อควบคุมการแสดงผลและ logic ต่างๆ
 */
export interface ITimelineEvent {
  eventId: string; startTimeMs: number; durationMs?: number;
  eventType: TimelineEventType; targetInstanceId?: string;
  parameters: // Union of all specific event parameter types
    | ITimelineEventParametersBase // General base
    | IShowHideCharacterEventParams | IChangeCharacterExpressionEventParams | IMoveCharacterEventParams | ICharacterAnimationEventParams
    | IShowHideTextBlockEventParams | IUpdateTextBlockEventParams
    | IPlayAudioParams | IStopAudioParams | IAdjustAudioVolumeParams | IFadeAudioVolumeParams | ISetAudioPitchParams | ISetAudioPanParams // << เพิ่ม Audio Params ใหม่
    | IChangeBackgroundEventParams
    | IShowHideVisualElementParams | IAnimateVisualElementEventParams
    | IShowHideVideoElementParams | IControlVideoParams
    | IShowHideStatusUIElementParams | IUpdateStatusUIElementParams
    | IShowHideChoiceGroupParams
    | IWaitEventParams
    | ISetVariableParams
    | IRunCustomScriptParams
    | IScreenEffectParams // << ปรับปรุงตามโจทย์
    | ITransitionEffectParams
    | IApplyCharacterStatusEventParams | IRemoveCharacterStatusEventParams
    | IApplySceneEffectEventParams | IRemoveSceneEffectEventParams
    | ITriggerHotspotEventParams | IEnableHotspotEventParams
    | ICameraZoomEventParams | ICameraPanEventParams | ICameraRotateEventParams | ICameraShakeEventParams | ICameraFocusOnTargetEventParams | ICameraResetEventParams // << เพิ่ม Camera Params ใหม่
    | { [key: string]: any };
  notes?: string;
  waitForCompletion?: boolean;
}
const TimelineEventSchema = new Schema<ITimelineEvent>({
  eventId: { type: String, required: [true, "Timeline Event ID is required"] },
  startTimeMs: { type: Number, required: true, min: 0 },
  durationMs: { type: Number, min: 0 },
  eventType: { type: String, enum: Object.values(TimelineEventType), required: true },
  targetInstanceId: { type: String, trim: true },
  parameters: { type: Schema.Types.Mixed, required: true },
  notes: { type: String, trim: true, maxlength: [500, "Timeline event notes are too long"] },
  waitForCompletion: { type: Boolean, default: true },
}, { _id: false });


/**
 * @interface ITimelineTrack
 * @description Track ใน Timeline สำหรับจัดกลุ่ม Events
 */
export interface ITimelineTrack {
  trackId: string; trackName: string; trackType?: string;
  events: Types.DocumentArray<ITimelineEvent>;
  isMuted?: boolean; isLocked?: boolean; targetLayerId?: string;
}
const TimelineTrackSchema = new Schema<ITimelineTrack>({
  trackId: { type: String, required: [true, "Timeline Track ID is required"] },
  trackName: { type: String, required: [true, "Timeline Track name is required"], trim: true, maxlength: [100, "Track name is too long"] },
  trackType: { type: String, trim: true, maxlength: [50, "Track type is too long"] },
  events: [TimelineEventSchema],
  isMuted: { type: Boolean, default: false },
  isLocked: { type: Boolean, default: false },
  targetLayerId: { type: String, trim: true},
}, { _id: false });


/**
 * @interface ISceneVariable
 * @description ตัวแปรที่ใช้ได้เฉพาะภายในฉากนี้
 */
export interface ISceneVariable {
  name: string; value: any; description?: string;
  dataType?: "string" | "number" | "boolean" | "object" | "array";
  isReadOnlyForPlayer?: boolean;
}
const SceneVariableSchema = new Schema<ISceneVariable>({
  name: { type: String, required: [true, "Scene variable name is required"], trim: true, maxlength: [100, "Variable name is too long"] },
  value: { type: Schema.Types.Mixed, required: true },
  description: { type: String, trim: true, maxlength: [255, "Variable description is too long"] },
  dataType: { type: String, enum: ["string", "number", "boolean", "object", "array"]},
  isReadOnlyForPlayer: { type: Boolean, default: false },
}, { _id: false });


/**
 * @interface IStatusUIElement
 * @description องค์ประกอบ UI สำหรับแสดงสถานะต่างๆ
 */
export interface IStatusUIElement {
  instanceId: string; uiType: StatusUIType; dataSourceVariablePath: string;
  transform: ITransform; stylePresetId?: string; isVisible?: boolean; layerId?: string;
  maxValueSourcePath?: string; gaugeColor?: string; gaugeBackgroundColor?: string;
  iconSize?: number; iconSpacing?: number; maxIconsToShow?: number;
  prefixText?: string; suffixText?: string; numberFormatString?: string;
  customHtmlTemplateId?: Types.ObjectId;
  visibilityCondition?: string | IConditionLogic;
}
const StatusUIElementSchema = new Schema<IStatusUIElement>({
  instanceId: { type: String, required: [true, "Instance ID is required for status UI element"] },
  uiType: { type: String, enum: Object.values(StatusUIType), required: true },
  dataSourceVariablePath: { type: String, required: [true, "Data source variable path is required"], trim: true },
  transform: { type: TransformSchema, default: () => ({}) },
  stylePresetId: { type: String, trim: true },
  isVisible: { type: Boolean, default: true },
  layerId: { type: String, trim: true },
  maxValueSourcePath: { type: String, trim: true },
  gaugeColor: { type: String, trim: true, maxlength: 50 },
  gaugeBackgroundColor: { type: String, trim: true, maxlength: 50 },
  iconSize: { type: Number, min: 1 },
  iconSpacing: { type: Number, min: 0 },
  maxIconsToShow: { type: Number, min: 1 },
  prefixText: { type: String, trim: true, maxlength: 100 },
  suffixText: { type: String, trim: true, maxlength: 100 },
  numberFormatString: { type: String, trim: true, maxlength: 50 },
  customHtmlTemplateId: { type: Schema.Types.ObjectId },
  visibilityCondition: { type: ConditionLogicSchema },
}, { _id: false });


// Camera Control Interfaces (ใหม่)
/**
 * @interface ICameraTransform
 * @description กำหนด Transform ของกล้อง
 */
export interface ICameraTransform {
    /** @description ตำแหน่งของกล้อง {x, y} ใน Scene coordinates */
    position: { x: number; y: number };
    /** @description ระดับการซูม, e.g., 1 = 100%, 2 = 200% */
    zoom: number;
    /** @description การหมุนของกล้องเป็นองศา */
    rotation: number; // degrees
}
const CameraTransformSchema = new Schema<ICameraTransform>({
    position: {
        x: { type: Number, required: true, default: 0 },
        y: { type: Number, required: true, default: 0 },
        _id: false,
    },
    zoom: { type: Number, required: true, default: 1, min: [0.01, "Zoom level must be positive"] },
    rotation: { type: Number, required: true, default: 0 },
}, { _id: false });

/**
 * @interface ISceneCamera
 * @description การตั้งค่ากล้องสำหรับฉาก
 */
export interface ISceneCamera {
    /** @description Transform เริ่มต้นของกล้องเมื่อเข้าฉาก */
    initialTransform: ICameraTransform;
    /** @description (Optional) ID ของ Character Instance ที่กล้องจะติดตาม */
    followTarget?: string; // characterInstanceId
    // อาจมี field อื่นๆ เช่น camera boundaries, lerp speed for following, etc.
}
const SceneCameraSchema = new Schema<ISceneCamera>({
    initialTransform: { type: CameraTransformSchema, required: true, default: () => ({ position: {x:0, y:0}, zoom: 1, rotation: 0 }) },
    followTarget: { type: String, trim: true },
}, { _id: false });


/**
 * @interface ISceneTransition
 * @description การตั้งค่า Transition เมื่อออกจากฉากนี้ไปยังฉากถัดไป (ปรับปรุงตามโจทย์)
 */
export interface ISceneTransition {
    /** @description ประเภทของ Transition (e.g., "fade", "wipe_left") */
    type: SceneTransitionType;
    /** @description ระยะเวลาของ Transition (หน่วยเป็นวินาที) */
    durationSeconds?: number;
    /** @description (Optional) พารามิเตอร์เพิ่มเติมสำหรับ Transition ที่ซับซ้อน
     * เช่น สำหรับ "wipe": { wipeDirection?: "left_to_right" | "top_to_bottom", wipeShape?: "circle" | "star" }
     * เช่น สำหรับ "zoom_in": { targetElementInstanceId?: string, zoomFactor?: number } (ซูมเข้าหา element ก่อนเปลี่ยนฉาก)
     */
    parameters?: any; // อาจเป็น object ที่มีโครงสร้างตามประเภท transition
}
const SceneTransitionSchema = new Schema<ISceneTransition>({
    type: { type: String, enum: Object.values(SceneTransitionType), default: SceneTransitionType.NONE },
    durationSeconds: { type: Number, min: 0, default: 0.5, comment: "ระยะเวลาการเปลี่ยนฉาก (วินาที)" },
    parameters: { type: Schema.Types.Mixed, comment: "พารามิเตอร์เพิ่มเติมสำหรับ transition ที่ซับซ้อน" },
}, { _id: false });

// SECTION: อินเทอร์เฟซสำหรับฉากจบ (Ending)
/**
 * @interface ISceneEnding
 * @description ข้อมูลสำหรับฉากจบ (Ending)
 */
export interface ISceneEnding {
  endingType: "TRUE" | "GOOD" | "NORMAL" | "BAD" | "SECRET" | "ALTERNATE" | "JOKE";
  title: string;
  description: string;
  imageUrl?: string;
  endingId: string;
}

const SceneEndingSchema = new Schema<ISceneEnding>(
  {
    endingType: { 
      type: String, 
      enum: ["TRUE", "GOOD", "NORMAL", "BAD", "SECRET" , "ALTERNATE", "JOKE"], 
      required: true 
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: false },
    endingId: { type: String, required: true, unique: true },
  },
  { _id: false, timestamps: false }
);

export enum EndingType {
  TRUE = "TRUE",
  GOOD = "GOOD",
  NORMAL = "NORMAL",
  BAD = "BAD",
  SECRET = "SECRET",
  ALTERNATE = "ALTERNATE",
  JOKE = "JOKE",
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Scene (IScene Document Interface)
// ==================================================================================================
/**
 * @interface IScene
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารฉากใน Collection "scenes"
 */
export interface IScene extends Document {
  _id: Types.ObjectId; novelId: Types.ObjectId; episodeId: Types.ObjectId; sceneOrder: number;
  /** @description (ใหม่) Node ID สำหรับการอ้างอิงจาก Choice/Script (ควร unique ภายใน Novel) */
  nodeId?: string;
  title?: string; background: IBackgroundSetting;
  version: number;
  layers: Types.DocumentArray<ISceneLayer>;
  characters: Types.DocumentArray<ICharacterInScene>;
  textContents: Types.DocumentArray<ITextContent>;
  images: Types.DocumentArray<IVisualElement>;
  videos: Types.DocumentArray<IVideoElement>;
  audios: Types.DocumentArray<IAudioElement>;
  choiceGroupsAvailable: Types.DocumentArray<IChoiceGroupInScene>;
  /** @description (ใหม่) ID ของ Choices ที่พร้อมให้เลือกในฉากนี้ */
  choiceIds: Types.ObjectId[];
  interactiveHotspots: Types.DocumentArray<IInteractiveHotspot>;
  statusUIElements: Types.DocumentArray<IStatusUIElement>;
  activeSceneEffects: Types.DocumentArray<ISceneEffectInstance>;
  timelineTracks: Types.DocumentArray<ITimelineTrack>;
  /** @description (ใหม่) การตั้งค่ากล้องสำหรับฉากนี้ */
  camera?: ISceneCamera; // << เพิ่มใหม่
  defaultNextSceneId?: Types.ObjectId; previousSceneId?: Types.ObjectId;
  /** @description (ปรับปรุง) การตั้งค่า Transition เมื่อออกจากฉากนี้ */
  sceneTransitionOut?: ISceneTransition; // << เปลี่ยนชื่อและ type จากเดิม
  autoAdvanceDelayMs?: number;
  sceneVariables: Types.DocumentArray<ISceneVariable>;
  onLoadScriptContent?: string;
  onExitScriptContent?: string;
  editorNotes?: string; thumbnailUrl?: string;
  authorDefinedEmotionTags?: string[];
  sceneTags?: string[];
  entryConditions?: Types.DocumentArray<IConditionLogic>;
  estimatedComplexity?: "low" | "medium" | "high" | "very_high";
  criticalAssets?: { mediaId: Types.ObjectId, mediaSourceType: "Media" | "OfficialMedia" }[];
  createdAt: Date; updatedAt: Date;
  estimatedTimelineDurationMs?: number;

  // ฟิลด์สำหรับฉากจบ (Ending)
  ending?: ISceneEnding; // หากมีข้อมูลใน field นี้ หมายความว่าฉากนี้คือฉากจบ
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Scene (SceneSchema)
// ==================================================================================================
const SceneSchema = new Schema<IScene>(
  {
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", required: [true, "Novel ID is required"], index: true },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode", required: [true, "Episode ID is required"], index: true },
    sceneOrder: { type: Number, required: [true, "Scene order is required"], min: [0, "Scene order must be non-negative"] },
    nodeId: { 
      type: String, 
      trim: true,
      sparse: true, // Allows multiple docs without this field, but if it exists, the index applies.
    },
    title: { type: String, trim: true, maxlength: [255, "Scene title is too long"] },
    background: { type: BackgroundSettingSchema, required: [true, "Background settings are required"] },
    version: { 
      type: Number,
      required: [true, "Scene version is required"],
      default: 1,
      min: [1, "Scene version must be at least 1"],
      comment: "Version number of this scene document, incremented on each significant change.",
    },
    layers: { type: [SceneLayerSchema], default: () => ([{ layerId: "default_layer", layerName: "Default Layer", zIndex: 0, blendingMode: "normal" }])},
    characters: [CharacterInSceneSchema],
    textContents: [TextContentSchema],
    images: [VisualElementSchema],
    videos: [VideoElementSchema],
    audios: [AudioElementSchema],
    choiceGroupsAvailable: [ChoiceGroupInSceneSchema],
    choiceIds: { type: [Schema.Types.ObjectId], ref: 'Choice', default: [] }, // อ้างอิงตัวเลือกโดยตรง
    interactiveHotspots: [InteractiveHotspotSchema],
    statusUIElements: [StatusUIElementSchema],
    activeSceneEffects: [SceneEffectInstanceSchema],
    timelineTracks: { type: [TimelineTrackSchema], default: () => ([{ trackId: "main_track", trackName: "Main Track", events: [] }]) },
    camera: { type: SceneCameraSchema, default: () => ({ initialTransform: { position: {x:0, y:0}, zoom: 1, rotation: 0 } }) }, // << เพิ่มใหม่พร้อม default
    defaultNextSceneId: { type: Schema.Types.ObjectId, ref: "Scene", default: null },
    previousSceneId: { type: Schema.Types.ObjectId, ref: "Scene", default: null },
    sceneTransitionOut: { type: SceneTransitionSchema, default: () => ({ type: SceneTransitionType.NONE, durationSeconds: 0.5 }) }, // << ปรับปรุง
    autoAdvanceDelayMs: { type: Number, min: 0, default: 0 },
    sceneVariables: [SceneVariableSchema],
    onLoadScriptContent: { type: String, trim: false, maxlength: [150000, "OnLoadScript content is too long"] },
    onExitScriptContent: { type: String, trim: false, maxlength: [150000, "OnExitScript content is too long"] },
    editorNotes: { type: String, trim: true, maxlength: [10000, "Editor notes are too long"] },
    thumbnailUrl: {
        type: String, trim: true, maxlength: [2048, "Thumbnail URL is too long"],
        validate: {
            validator: (v: string) => !v || /^https?:\/\/|^\//.test(v) || /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/.test(v),
            message: (props: any) => `${props.value} is not a valid thumbnail URL format!`
        }
    },
    authorDefinedEmotionTags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Emotion tag is too long"] }],
    sceneTags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Scene tag is too long"] }],
    entryConditions: [ConditionLogicSchema],
    estimatedComplexity: { type: String, enum: ["low", "medium", "high", "very_high"], default: "medium" },
    criticalAssets: [{
        _id: false,
        mediaId: { type: Schema.Types.ObjectId, required: true, refPath: "criticalAssetsMediaSourceType" },
        mediaSourceType: { type: String, enum: ["Media", "OfficialMedia"], required: true, alias: "criticalAssetsMediaSourceType" },
    }],
    // ฟิลด์สำหรับฉากจบ
    ending: { type: SceneEndingSchema, required: false },
  },
  {
    timestamps: true,
    toObject: { virtuals: true, aliases: true },
    toJSON: { virtuals: true, aliases: true },
    collection: "scenes",
  }
);

// ==================================================================================================
// SECTION: Indexes, Virtuals, Middleware (คงเดิมจากโค้ดก่อนหน้า และปรับปรุงตามความเหมาะสม)
// ==================================================================================================
SceneSchema.index({ episodeId: 1, sceneOrder: 1 }, { unique: true, name: "idx_episode_scene_order_unique" });
SceneSchema.index({ novelId: 1, episodeId: 1, sceneOrder: 1 }, { name: "idx_novel_episode_scene_sort" });
SceneSchema.index({ novelId: 1, authorDefinedEmotionTags: 1 }, { name: "idx_novel_emotion_tags" });
SceneSchema.index({ novelId: 1, sceneTags: 1 }, { name: "idx_novel_scene_tags" });
SceneSchema.index({ title: "text", "textContents.content": "text", editorNotes: "text" }, { name: "idx_scene_text_search", default_language: "none" });
SceneSchema.index({ novelId: 1, "entryConditions.variableName": 1 }, { name: "idx_scene_entry_conditions_var", sparse: true });

// เพิ่ม composite index เพื่อให้ nodeId unique ภายใน novel เดียวกัน
SceneSchema.index({ novelId: 1, nodeId: 1 }, { unique: true, sparse: true });

SceneSchema.virtual("estimatedTimelineDurationMs").get(function (this: IScene): number {
  if (!this.timelineTracks || this.timelineTracks.length === 0) return 0;
  let maxEndTime = 0;
  this.timelineTracks.forEach(track => {
    if (track.events && track.events.length > 0) {
      track.events.forEach(event => {
        const eventEffectiveDuration = event.durationMs || 0;
        const endTime = event.startTimeMs + eventEffectiveDuration;
        if (endTime > maxEndTime) maxEndTime = endTime;
      });
    }
  });
  return maxEndTime;
});

SceneSchema.pre<IScene>("save", function (next: (err?: mongoose.Error) => void) {
  const idSet = new Set<string>();
  let error: mongoose.Error | null = null;

  const checkUniqueIdInScope = (id: string | undefined, idName: string, scopeName: string, parentPathForError: string): boolean => {
    if (!id) return true;
    const uniqueKeyInScope = `${scopeName}[${idName}=${id}]`;
    if (idSet.has(uniqueKeyInScope)) {
      error = new mongoose.Error.ValidatorError({ message: `Duplicate ID "${id}" for property "${idName}" within scope "${scopeName}" at "${parentPathForError}". IDs must be unique.` });
      return false;
    }
    idSet.add(uniqueKeyInScope);
    return true;
  };

  const collectionsToValidate: Array<{ data: any[] | undefined, idField: string, collectionScopeName: string }> = [
    { data: this.layers, idField: "layerId", collectionScopeName: "scene_layers" },
    { data: this.characters, idField: "instanceId", collectionScopeName: "scene_characters" },
    { data: this.textContents, idField: "instanceId", collectionScopeName: "scene_textContents" },
    { data: this.images, idField: "instanceId", collectionScopeName: "scene_images" },
    { data: this.videos, idField: "instanceId", collectionScopeName: "scene_videos" },
    { data: this.audios, idField: "instanceId", collectionScopeName: "scene_audios" },
    { data: this.choiceGroupsAvailable, idField: "instanceId", collectionScopeName: "scene_choiceGroupsAvailable" },
    { data: this.interactiveHotspots, idField: "hotspotId", collectionScopeName: "scene_interactiveHotspots" },
    { data: this.statusUIElements, idField: "instanceId", collectionScopeName: "scene_statusUIElements"},
    { data: this.activeSceneEffects, idField: "instanceId", collectionScopeName: "scene_activeSceneEffects"},
    { data: this.timelineTracks, idField: "trackId", collectionScopeName: "scene_timelineTracks" },
  ];

  for (const collection of collectionsToValidate) {
    if (collection.data) {
      for (const item of collection.data) {
        if (item && typeof item === 'object' && item.hasOwnProperty(collection.idField)) {
          if (!checkUniqueIdInScope(item[collection.idField], collection.idField, collection.collectionScopeName, `scene.${collection.collectionScopeName}`)) {
            return next(error!);
          }
        }
      }
    }
  }

  if (this.sceneVariables && this.sceneVariables.length > 0) {
    const sceneVarNames = new Set<string>();
    for (const variable of this.sceneVariables) {
      if (sceneVarNames.has(variable.name)) {
        error = new mongoose.Error.ValidatorError({ message: `Duplicate sceneVariable name "${variable.name}" found.`});
        return next(error);
      }
      sceneVarNames.add(variable.name);
    }
  }
  
  if (this.timelineTracks) {
    for (const track of this.timelineTracks) {
      if (track.events && track.events.length > 0) {
        const eventIdsInTrack = new Set<string>();
        for (const event of track.events) {
          if (eventIdsInTrack.has(event.eventId)) {
            error = new mongoose.Error.ValidatorError({ message: `Duplicate eventId "${event.eventId}" in track "${track.trackName}".`});
            return next(error);
          }
          eventIdsInTrack.add(event.eventId);
        }
      }
    }
  }

  if (this.layers && this.layers.length > 0) {
    const zIndexSet = new Set<number>();
    for (const layer of this.layers) {
        if (layer.zIndex === undefined) {
            error = new mongoose.Error.ValidatorError({ message: `Layer "${layer.layerName}" is missing zIndex.`});
            return next(error);
        }
        if (zIndexSet.has(layer.zIndex)) {
            error = new mongoose.Error.ValidatorError({ message: `Duplicate zIndex ${layer.zIndex} for layer "${layer.layerName}".`});
            return next(error);
        }
        zIndexSet.add(layer.zIndex);
    }
  }

  // ตรวจสอบ loopEndPointMs > loopStartPointMs สำหรับ Audio Elements
  if (this.audios) {
    for (const audio of this.audios) {
        if (audio.loop && audio.loopStartPointMs !== undefined && audio.loopEndPointMs !== undefined) {
            if (audio.loopEndPointMs <= audio.loopStartPointMs) {
                error = new mongoose.Error.ValidatorError({ message: `Audio instance "${audio.instanceId}": loopEndPointMs (${audio.loopEndPointMs}) must be greater than loopStartPointMs (${audio.loopStartPointMs}).` });
                return next(error);
            }
        }
    }
  }

  next();
});

async function updateParentTimestamps(doc: IScene | null, actionType: 'save' | 'delete') {
  if (!doc || !doc.episodeId || !doc.novelId) {
    return;
  }
  try {
    const EpisodeModel = mongoose.models.Episode || mongoose.model("Episode");
    const NovelModel = mongoose.models.Novel || mongoose.model("Novel");
    
    const now = new Date();
    const updateData = { $set: { lastContentUpdatedAt: now, updatedAt: now } };

    await EpisodeModel.findByIdAndUpdate(doc.episodeId, updateData);
    await NovelModel.findByIdAndUpdate(doc.novelId, updateData);
  } catch (err) {
    const castedError = err as Error;
    console.error(`[SceneMiddlewareError - ${actionType}] Failed to update parent timestamps for scene ${doc._id}:`, castedError.message, castedError.stack);
  }
}

SceneSchema.post<IScene>("save", async function (doc: IScene, next: () => void) {
  await updateParentTimestamps(doc, 'save');
  next();
});

SceneSchema.post<mongoose.Query<IScene | null, IScene>>("findOneAndUpdate", async function (result: IScene | null, next: () => void) {
  if (result) {
    await updateParentTimestamps(result, 'save');
  }
  next();
});

SceneSchema.post<mongoose.Query<IScene | null, IScene>>("findOneAndDelete", async function (doc: IScene | null, next: () => void) {
  await updateParentTimestamps(doc, 'delete');
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const SceneModel = (mongoose.models.Scene as mongoose.Model<IScene>) || mongoose.model<IScene>("Scene", SceneSchema);

export default SceneModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Instance ID & Other IDs**: การ generate ID และการ validate uniqueness ยังคงสำคัญ
// 2.  **`refPath` Aliases**: การใช้ `alias` ช่วยจัดการ refPath ที่ซับซ้อน
// 3.  **Timeline Event Parameters (`ITimelineEvent.parameters`)**: การสร้าง interfaces เฉพาะสำหรับ `parameters` ของแต่ละ `TimelineEventType` (ดังที่ได้ทำเพิ่มเติม) ช่วยเพิ่ม type safety และความชัดเจน.
// 4.  **Conditional Logic (`IConditionLogic`)**: `ConditionLogicSchema` ได้รับการปรับปรุง. Runtime ต้องมี parser/evaluator.
// 5.  **Scripting Engine Integration**: `onLoadScriptContent`, `onExitScriptContent`, `CUSTOM_SCRIPT`, `RUN_CUSTOM_SCRIPT` ต้องการ scripting engine ที่ปลอดภัย.
// 6.  **Choice System**: `IChoiceGroupInScene.choiceGroupId` อ้างอิง `Choice` model.
// 7.  **Performance**: ฉากที่ซับซ้อนต้องการการจัดการ performance ที่ดี. Asset preloading (`criticalAssets`), efficient event processing.
// 8.  **Versioning & Collaboration**: อยู่นอกขอบเขต Model นี้โดยตรง.
// 9.  **Accessibility (A11y)**: `altText` เป็นจุดเริ่มต้น.
// 10. **Psychological Impact & Analytics**: `authorDefinedEmotionTags` และ `sceneTags` มีประโยชน์.
// 11. **Hotspot Shapes & Interactivity**: `IInteractiveHotspot` ได้เพิ่ม `shapeType` และ `shapeData`.
// 12. **Status System (`IStatusEffect`, `IStatusUIElement`)**: สามารถขยายได้อีก.
// 13. **Modularity และ External Models**: การเชื่อมต่อกับ Models ภายนอกผ่าน Service Layer.
// 14. **Error Handling & Logging**: ควรมีระบบ logging ที่ดี.
// 15. **Unique zIndex for Layers**: Middleware ตรวจสอบ zIndex ที่ไม่ซ้ำกัน.
// 16. **Camera Control**: เพิ่ม `camera: ISceneCamera` และ Timeline Events ที่เกี่ยวข้องกับการควบคุมกล้อง.
// 17. **Screen Effects**: เพิ่ม `ScreenEffectType` enum และปรับปรุง `IScreenEffectParams` ให้รองรับ `durationSeconds` และ `color` ตามโจทย์.
// 18. **Scene Transitions**: `SceneTransitionType` enum ได้รับการขยาย และ `ISceneTransition` (ใน `sceneTransitionOut`) เพิ่ม `durationSeconds` และ `parameters`.
// 19. **Audio Control**: `IAudioElement` ได้รับการเพิ่ม field `volume`, `pan`, `pitch`, `fadeInSeconds`, `fadeOutSeconds`, `loopStartPointMs`, `loopEndPointMs`.
//     Timeline Events ใหม่ (`ADJUST_AUDIO_VOLUME`, `FADE_AUDIO_VOLUME`, `SET_AUDIO_PITCH`, `SET_AUDIO_PAN`) และ Parameter Interfaces ที่เกี่ยวข้องได้ถูกเพิ่มเข้าไปใน `TimelineEventType` และ `ITimelineEvent.parameters`.
// 20. **หมายเหตุการอัปเดตโค้ด**: โค้ดนี้ได้รับการอัปเดตให้สอดคล้องกับคำแนะนำของผู้ใช้ โดยยังคงรักษาโครงสร้างและความสามารถเดิมของ `Scene.ts` ไว้ให้มากที่สุด
//     พร้อมทั้งเพิ่มความคิดเห็นภาษาไทยตามสไตล์เดิมของโค้ดใน repo. การปรับปรุง "SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม" จะรวมถึงการเปลี่ยนแปลงเหล่านี้ด้วย.
// 21. **@typescript-eslint/no-empty-object-type**: แก้ไข error โดยเปลี่ยน empty interfaces ที่ extend `ITimelineEventParametersBase` ให้เป็น type aliases เพื่อความถูกต้องและสะอาดของโค้ด.
// ==================================================================================================