// src/backend/models/Scene.ts
// โมเดลฉากใน Visual Novel (Scene Model) - หัวใจหลักของ Visual Novel Editor แพลตฟอร์ม NovelMaze
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
 * - `GO_TO_SCENE`: ไปยังฉาก (Scene ID) ที่กำหนด (parameters: { sceneId: Types.ObjectId })
 * - `SET_VARIABLE`: ตั้งค่าตัวแปร (parameters: ISetVariableParams)
 * - `UPDATE_RELATIONSHIP`: อัปเดตค่าความสัมพันธ์ (parameters: { characterId1: Types.ObjectId, characterId2: Types.ObjectId, changeAmount: number, relationshipType?: string })
 * - `UNLOCK_ACHIEVEMENT`: ปลดล็อก Achievement (parameters: { achievementId: string })
 * - `PLAY_SOUND`: เล่นเสียง (parameters: IPlayAudioParams)
 * - `SHOW_MEDIA_ELEMENT`: แสดง VisualElement หรือ VideoElement (parameters: { instanceId: string })
 * - `HIDE_MEDIA_ELEMENT`: ซ่อน VisualElement หรือ VideoElement (parameters: { instanceId: string })
 * - `ADD_ITEM_TO_INVENTORY`: เพิ่มไอเทมเข้าช่องเก็บของ (parameters: { itemId: Types.ObjectId (ref: 'Item'), quantity: number, targetInventoryOwnerId?: Types.ObjectId (ref: 'Character' or 'PlayerProfile'), inventoryType?: string })
 * - `REMOVE_ITEM_FROM_INVENTORY`: นำไอเทมออกจากช่องเก็บของ (parameters: { itemId: Types.ObjectId (ref: 'Item'), quantity: number, targetInventoryOwnerId?: Types.ObjectId, inventoryType?: string })
 * - `USE_ITEM`: ใช้ไอเทม (parameters: { itemId: Types.ObjectId (ref: 'Item'), targetCharacterInstanceId?: string, effectParameters?: any })
 * - `CUSTOM_SCRIPT`: รันสคริปต์ (parameters: { scriptId?: string, scriptContent?: string, contextParameters?: any })
 * - `END_NOVEL_BRANCH`: จบเนื้อเรื่องในแขนงนั้นๆ
 * - `CONDITIONAL_ACTION`: การกระทำที่มีเงื่อนไข (parameters: { condition: IConditionLogic, trueActions: IConfigurableAction[], falseActions?: IConfigurableAction[] })
 * - `START_QUEST`: เริ่มเควส (parameters: { questId: string })
 * - `UPDATE_QUEST_PROGRESS`: อัปเดตความคืบหน้าเควส (parameters: { questId: string, objectiveKey?: string, progressUpdate: any })
 * - `APPLY_STATUS_EFFECT`: ใช้สถานะเอฟเฟกต์ (parameters: { targetCharacterInstanceId: string, effectToApply: IStatusEffect })
 * - `REMOVE_STATUS_EFFECT`: ลบสถานะเอฟเฟกต์ (parameters: { targetCharacterInstanceId: string, effectName: string })
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
  FADE_AUDIO_VOLUME = "fade_audio_volume",

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
  TRANSITION_EFFECT = "transition_effect", // เอฟเฟกต์การเปลี่ยนภาพ/องค์ประกอบ *ภายใน* ฉาก
  APPLY_SCENE_EFFECT = "apply_scene_effect", // เอฟเฟกต์ที่ส่งผลต่อบรรยากาศทั้งฉาก เช่น หมอก, ฝน
  REMOVE_SCENE_EFFECT = "remove_scene_effect",
  TRIGGER_HOTSPOT = "trigger_hotspot", // จำลองการคลิก hotspot โดย event
  ENABLE_HOTSPOT = "enable_hotspot", // เปิด/ปิดการใช้งาน hotspot
}

/**
 * @enum {string} SceneTransitionType
 * @description ประเภทของการเปลี่ยนฉาก (Transition) เมื่อจะไปยังฉากถัดไป
 * - `none`: ไม่มีการเปลี่ยนฉากแบบพิเศษ (ตัดภาพไปเลย - hard cut)
 * - `fade`: ค่อยๆ จางภาพ (fade out ฉากปัจจุบัน, fade in ฉากใหม่)
 * - `slide_left`: ฉากใหม่เลื่อนมาจากทางขวา (ฉากปัจจุบันเลื่อนไปทางซ้าย)
 * - `slide_right`: ฉากใหม่เลื่อนมาจากทางซ้าย
 * - `slide_up`: ฉากใหม่เลื่อนมาจากข้างล่าง
 * - `slide_down`: ฉากใหม่เลื่อนมาจากข้างบน
 * - `wipe`: กวาดภาพ (มีหลายรูปแบบย่อย เช่น wipe_left, wipe_diagonal)
 * - `dissolve`: ภาพค่อยๆ ละลายเปลี่ยนเป็นฉากใหม่
 * - `zoom_in_out`: ซูมเข้าภาพปัจจุบันแล้วซูมออกจากภาพใหม่
 * - `custom`: กำหนดเองผ่าน script หรือ animation ที่ซับซ้อน (ระบุใน transitionCustomName)
 */
export enum SceneTransitionType {
  NONE = "none", FADE = "fade", SLIDE_LEFT = "slide_left", SLIDE_RIGHT = "slide_right",
  SLIDE_UP = "slide_up", SLIDE_DOWN = "slide_down", WIPE = "wipe", DISSOLVE = "dissolve",
  ZOOM_IN_OUT = "zoom_in_out", CUSTOM = "custom",
}

/**
 * @enum {string} StatusEffectType
 * @description ประเภทของ Status Effect
 * - `BUFF`: เพิ่มค่า stat ชั่วคราว
 * - `DEBUFF`: ลดค่า stat ชั่วคราว
 * - `DAMAGE_OVER_TIME`: สร้างความเสียหายต่อเนื่อง (เช่น พิษ, ไฟไหม้)
 * - `HEAL_OVER_TIME`: ฟื้นฟูต่อเนื่อง
 * - `STUN`: ทำให้หยุดการกระทำ
 * - `SILENCE`: ห้ามใช้สกิล/เวทมนตร์
 * - `MODIFIER`: เปลี่ยนแปลงพฤติกรรมหรือค่าอื่นๆ ที่ไม่ใช่ stat โดยตรง
 * - `CUSTOM`: กำหนดเองผ่าน script หรือ logic เฉพาะ
 */
export enum StatusEffectType {
  BUFF = "buff", DEBUFF = "debuff", DAMAGE_OVER_TIME = "damage_over_time",
  HEAL_OVER_TIME = "heal_over_time", STUN = "stun", SILENCE = "silence",
  MODIFIER = "modifier", CUSTOM = "custom",
}

/**
 * @enum {string} StatusUIType
 * @description ประเภทของ UI ที่ใช้แสดงสถานะ
 * - `GAUGE_BAR`: แถบพลัง, HP, MP (แสดงค่าปัจจุบันเทียบกับค่าสูงสุด)
 * - `NUMERIC_DISPLAY`: แสดงตัวเลข เช่น ค่าเงิน, คะแนน, จำนวนไอเทม
 * - `ICON_LIST`: รายการไอคอนแสดงสถานะ (เช่น buff/debuff icons)
 * - `TEXT_LABEL`: ป้ายข้อความแสดงสถานะ หรือข้อมูลที่ไม่ใช่ตัวเลขตรงๆ
 * - `RADIAL_GAUGE`: เกจวงกลม
 * - `CUSTOM_HTML`: แสดงผลด้วย HTML ที่กำหนดเอง (ต้องระมัดระวังด้านความปลอดภัย)
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
 * @property {number} [positionX] - ตำแหน่งแกน X (หน่วยเป็น % ของพื้นที่ฉาก หรือ pixel, ขึ้นกับการออกแบบ Editor)
 * @property {number} [positionY] - ตำแหน่งแกน Y
 * @property {number} [scaleX] - อัตราส่วนการขยายแกน X (1 คือขนาดปกติ)
 * @property {number} [scaleY] - อัตราส่วนการขยายแกน Y
 * @property {number} [rotation] - องศาการหมุน (0-360)
 * @property {number} [opacity] - ความโปร่งใส (0 คือโปร่งใสสมบูรณ์, 1 คือทึบแสง)
 * @property {number} [zIndex] - ลำดับการซ้อนทับขององค์ประกอบ (ค่ามากจะแสดงอยู่ด้านบน)
 * @property {"left" | "center" | "right"} [anchorPointX] - จุดอ้างอิงแนวนอน ("center" โดยทั่วไป)
 * @property {"top" | "center" | "bottom"} [anchorPointY] - จุดอ้างอิงแนวตั้ง ("center" โดยทั่วไป)
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
 * @property {"color" | "image" | "video"} type - ประเภทของพื้นหลัง
 * @property {string} value - ค่าของพื้นหลัง (รหัสสี HEX, Media ID, หรือ URL)
 * @property {boolean} [isOfficialMedia] - ระบุว่า Media ที่ใช้ใน `value` (ถ้าเป็น ID) มาจากคลัง OfficialMedia หรือไม่ (ถ้า `type` เป็น "image" หรือ "video")
 * @property {string} [blurEffect] - ระดับการเบลอ (เช่น "5px")
 * @property {string} [colorOverlay] - สีที่ซ้อนทับ (เช่น "rgba(0,0,0,0.5)")
 * @property {"cover" | "contain" | "tile" | "stretch"} [fitMode] - วิธีการปรับขนาด (สำหรับ image/video)
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
 * @description โครงสร้างสำหรับเงื่อนไขที่ซับซ้อน (สามารถพัฒนาเป็น expression tree หรือ query language)
 * ใช้สำหรับตรวจสอบเงื่อนไขต่างๆ ในเกม เช่น การแสดงผล Choice, การทำงานของ Hotspot, หรือการทำงานของ Event/Action
 * @property {"variable_check" | "inventory_check" | "status_effect_check" | "script_check" | "compound_logic"} type - ประเภทของเงื่อนไข
 * @property {string} [variableName] - (สำหรับ variable_check) ชื่อตัวแปรที่จะตรวจสอบ
 * @property {VariableScope} [scope] - (สำหรับ variable_check) ขอบเขตของตัวแปร
 * @property {string} [characterInstanceIdForVar] - (สำหรับ variable_check และ scope=CHARACTER_STATUS) Instance ID ของตัวละคร
 * @property {Types.ObjectId} [characterIdForVar] - (สำหรับ variable_check และ scope=CHARACTER_STATUS) Character ID หลัก (อาจใช้กรณีไม่มี instanceId)
 * @property {"==" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "not_contains" | "has_flag" | "missing_flag"} [comparisonOperator] - (สำหรับ variable_check) ตัวดำเนินการเปรียบเทียบ
 * @property {any} [expectedValue] - (สำหรับ variable_check) ค่าที่คาดหวัง
 * @property {Types.ObjectId} [itemId] - (สำหรับ inventory_check) ID ของไอเทม (ref: 'Item')
 * @property {number} [quantityRequired] - (สำหรับ inventory_check) จำนวนที่ต้องการ (default: 1)
 * @property {string} [inventoryOwnerInstanceId] - (สำหรับ inventory_check) Instance ID ของเจ้าของ Inventory (เช่น characterInstanceId) หรือ "player"
 * @property {string} [targetCharacterInstanceIdForStatus] - (สำหรับ status_effect_check) Instance ID ของตัวละครเป้าหมาย
 * @property {string} [statusEffectName] - (สำหรับ status_effect_check) ชื่อของ Status Effect
 * @property {boolean} [hasStatusEffect] - (สำหรับ status_effect_check) true = ตรวจสอบว่ามี, false = ตรวจสอบว่าไม่มี
 * @property {string} [scriptIdToCheck] - (สำหรับ script_check) ID ของ Script ที่จะ return true/false
 * @property {string} [scriptContentToCheck] - (สำหรับ script_check) เนื้อหา Script ที่จะ return true/false
 * @property {"AND" | "OR" | "NOT"} [logicalOperator] - (สำหรับ compound_logic) ตัวดำเนินการทางตรรกะ
 * @property {IConditionLogic[]} [subConditions] - (สำหรับ compound_logic) รายการเงื่อนไขย่อย
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
  subConditions?: IConditionLogic[]; // Array of IConditionLogic
}
const ConditionLogicSchema = new Schema<IConditionLogic>({
  type: { type: String, enum: ["variable_check", "inventory_check", "status_effect_check", "script_check", "compound_logic"], required: true },
  variableName: { type: String, trim: true },
  scope: { type: String, enum: Object.values(VariableScope) },
  characterInstanceIdForVar: { type: String, trim: true },
  characterIdForVar: { type: Schema.Types.ObjectId, ref: 'Character' },
  comparisonOperator: { type: String, enum: ["==", "!=", ">", "<", ">=", "<=", "contains", "not_contains", "has_flag", "missing_flag"] },
  expectedValue: { type: Schema.Types.Mixed },
  itemId: { type: Schema.Types.ObjectId, ref: 'Item' }, // อ้างอิง Item Model
  quantityRequired: { type: Number, default: 1 },
  inventoryOwnerInstanceId: { type: String, trim: true }, // "player" หรือ characterInstanceId
  targetCharacterInstanceIdForStatus: { type: String, trim: true },
  statusEffectName: { type: String, trim: true },
  hasStatusEffect: { type: Boolean },
  scriptIdToCheck: { type: String, trim: true },
  scriptContentToCheck: { type: String, trim: true },
  logicalOperator: { type: String, enum: ["AND", "OR", "NOT"] },
}, { _id: false });
// การสร้าง subConditions: ConditionLogicSchema.add({ subConditions: [ConditionLogicSchema] }) เพื่อ recursive reference
(ConditionLogicSchema as any).add({ subConditions: [ConditionLogicSchema] });


/**
 * @interface IStatusEffect
 * @description ข้อมูล Status Effect ที่สามารถนำไปใช้กับตัวละครหรือองค์ประกอบอื่นๆ
 * @property {string} effectName - ชื่อเฉพาะของ effect (unique ภายในนิยามของเกม, เช่น "Poison_lvl1")
 * @property {StatusEffectType} type - ประเภทของ effect (BUFF, DEBUFF, etc.)
 * @property {string} [description] - คำอธิบายสำหรับ Editor หรือ Player
 * @property {Types.ObjectId} [iconMediaId] - Media ID ของไอคอนแสดงผล (ref: 'Media' หรือ 'OfficialMedia')
 * @property {"Media" | "OfficialMedia"} [iconMediaSourceType] - แหล่งที่มาของ iconMediaId
 * @property {number} [durationMs] - ระยะเวลาของ effect (0 หรือ undefined หมายถึงถาวรหรือควบคุมโดยปัจจัยอื่น)
 * @property {number} [magnitude] - ความรุนแรง/ค่าของ effect (เช่น +10 ATK, 5 damage)
 * @property {number} [tickIntervalMs] - (สำหรับ DoT/HoT) ความถี่ในการทำงาน (ms)
 * @property {{ statName: string; changeValue: string | number; isPercentage?: boolean; }[]} [affectedStats] - รายการ stat ที่ได้รับผลกระทบและค่าการเปลี่ยนแปลง
 * @property {string} [customLogicScriptId] - ID ของ Script สำหรับ logic ที่ซับซ้อน
 * @property {Types.DocumentArray<IConditionLogic>} [applicationConditions] - เงื่อนไขที่ต้องเป็นจริงเพื่อให้ effect นี้ทำงาน (เช่น "ถ้า HP < 25%")
 * @property {boolean} [stackable] - ซ้อนทับกันได้หรือไม่ (default: false)
 * @property {number} [maxStacks] - จำนวน stack สูงสุด (ถ้า stackable, default: 1)
 * @property {string} [visualEffectOnCharacter] - ชื่อหรือ ID ของ visual effect ที่จะแสดงบนตัวละคร (เช่น particle effect)
 * @property {string} [soundEffectOnApply] - Media ID ของเสียงเมื่อ effect เริ่มทำงาน
 * @property {string} [soundEffectOnTick] - Media ID ของเสียงเมื่อ effect ทำงานแต่ละ tick
 * @property {string} [soundEffectOnExpire] - Media ID ของเสียงเมื่อ effect หมดอายุ
 */
export interface IStatusEffect {
  effectName: string; type: StatusEffectType; description?: string;
  iconMediaId?: Types.ObjectId; iconMediaSourceType?: "Media" | "OfficialMedia";
  durationMs?: number; magnitude?: number; tickIntervalMs?: number;
  affectedStats?: { statName: string; changeValue: string | number; isPercentage?: boolean; }[];
  customLogicScriptId?: string;
  applicationConditions?: Types.DocumentArray<IConditionLogic>; // แก้ไขให้เป็น DocumentArray
  stackable?: boolean; maxStacks?: number;
  visualEffectOnCharacter?: string;
  soundEffectOnApply?: string; // ควรเป็น Media ID
  soundEffectOnTick?: string;  // ควรเป็น Media ID
  soundEffectOnExpire?: string; // ควรเป็น Media ID
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
  applicationConditions: [ConditionLogicSchema], // ใช้ ConditionLogicSchema ที่กำหนดไว้
  stackable: { type: Boolean, default: false },
  maxStacks: { type: Number, min: 1, default: 1 },
  visualEffectOnCharacter: { type: String, trim: true },
  soundEffectOnApply: { type: String, trim: true }, // หรือ Types.ObjectId ref 'Media'
  soundEffectOnTick: { type: String, trim: true },   // หรือ Types.ObjectId ref 'Media'
  soundEffectOnExpire: { type: String, trim: true }, // หรือ Types.ObjectId ref 'Media'
}, { _id: false });

/**
 * @interface ICharacterInScene
 * @description การตั้งค่าตัวละครที่ปรากฏในฉาก
 * @property {string} instanceId - ID เฉพาะของ instance ตัวละครนี้ในฉาก (ผู้เขียนกำหนด, unique ภายใน scene.characters)
 * @property {Types.ObjectId} characterId - ID ของตัวละครหลัก (ref: 'Character')
 * @property {string} [expressionId] - ID หรือชื่อของการแสดงออกทางสีหน้า/ท่าทาง (อ้างอิงจาก `Character.expressions` หรือเป็น key ที่ runtime จะ map ไปยัง Media)
 * หากเป็น Media ID โดยตรง ควรพิจารณาเพิ่ม `expressionMediaSourceType`
 * @property {ITransform} [transform] - ตำแหน่ง, ขนาด, การหมุน, ความโปร่งใสของตัวละคร
 * @property {boolean} [isVisible] - ตัวละครนี้กำลังแสดงอยู่ในฉากหรือไม่ (default: true)
 * @property {string} [enterAnimation] - ชื่อ/ID ของอนิเมชันตอนปรากฏตัว
 * @property {string} [exitAnimation] - ชื่อ/ID ของอนิเมชันตอนหายไป
 * @property {string} [layerId] - ID ของ Layer ที่ตัวละครนี้สังกัด (ref: 'ISceneLayer.layerId')
 * @property {Types.DocumentArray<IStatusEffect>} [currentStatusEffects] - สถานะ (buff/debuff) ที่ตัวละครนี้ได้รับในปัจจุบัน
 * @property {Types.DocumentArray<ISceneVariable>} [characterSpecificVariables] - (Optional) ตัวแปรเฉพาะของ instance ตัวละครนี้ (เช่น ค่า HP ปัจจุบันของศัตรูตัวนี้)
 */
export interface ICharacterInScene {
  instanceId: string; characterId: Types.ObjectId; expressionId?: string;
  transform?: ITransform; isVisible?: boolean;
  enterAnimation?: string; exitAnimation?: string; layerId?: string;
  currentStatusEffects?: Types.DocumentArray<IStatusEffect>;
  // characterSpecificVariables?: Types.DocumentArray<ISceneVariable>; // ยังคง comment ไว้ตามโค้ดเดิม
}
const CharacterInSceneSchema = new Schema<ICharacterInScene>({
  instanceId: { type: String, required: [true, "Instance ID is required for character in scene"] },
  characterId: { type: Schema.Types.ObjectId, ref: "Character", required: [true, "กรุณาระบุ ID ของตัวละคร (Character ID is required)"] },
  expressionId: { type: String, trim: true }, // ควรมีกลไก mapping expressionId ไปยัง Media ใน Character model หรือ runtime
  transform: { type: TransformSchema, default: () => ({}) },
  isVisible: { type: Boolean, default: true },
  enterAnimation: { type: String, trim: true, maxlength: [100, "Enter animation name is too long"] },
  exitAnimation: { type: String, trim: true, maxlength: [100, "Exit animation name is too long"] },
  layerId: { type: String, trim: true },
  currentStatusEffects: [StatusEffectSchema],
  // characterSpecificVariables: [SceneVariableSchema], // ยังคง comment ไว้
}, { _id: false });

/**
 * @interface ITextContent
 * @description การตั้งค่าข้อความที่แสดงในฉาก (เช่น บทสนทนา, คำบรรยาย)
 * @property {string} instanceId - ID เฉพาะของ instance ข้อความนี้ในฉาก (unique ภายใน scene.textContents)
 * @property {TextContentType} type - ประเภทของข้อความ (dialogue, narration, etc.)
 * @property {Types.ObjectId} [characterId] - ID ของตัวละครที่พูด (ถ้าเป็น dialogue, ref: 'Character')
 * @property {string} [speakerDisplayName] - ชื่อผู้พูดที่จะแสดง (อาจไม่ตรงกับชื่อตัวละคร, เช่น "???")
 * @property {string} content - เนื้อหาข้อความ (รองรับ Markdown, BBCode, หรือ HTML subset)
 * @property {string} [fontFamily] - ชื่อฟอนต์ (ถ้า override default)
 * @property {number} [fontSize] - ขนาดฟอนต์ (ถ้า override default)
 * @property {string} [color] - สีข้อความ (HEX, RGB, RGBA)
 * @property {"left" | "center" | "right" | "justify"} [textAlign] - การจัดเรียงข้อความ
 * @property {ITransform} [transform] - ตำแหน่งและขนาดของกล่องข้อความ
 * @property {Types.ObjectId} [voiceOverMediaId] - ID ของไฟล์เสียงพากย์ (ref: 'Media' หรือ 'OfficialMedia')
 * @property {"Media" | "OfficialMedia"} [voiceOverMediaSourceType] - แหล่งที่มาของ voiceOverMediaId
 * @property {number} [displaySpeed] - ความเร็วในการแสดงข้อความ (char per sec, 0 = ทันที)
 * @property {string} [textStylePresetId] - ID ของ preset สไตล์ข้อความ
 * @property {string} [layerId] - ID ของ Layer ที่ข้อความนี้สังกัด
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
 * @property {string} instanceId - ID เฉพาะของ instance องค์ประกอบนี้ (unique ภายใน scene.images)
 * @property {Types.ObjectId} mediaId - ID ของ Media (รูปภาพ) (ref: 'Media' หรือ 'OfficialMedia')
 * @property {"Media" | "OfficialMedia"} mediaSourceType - แหล่งที่มาของ mediaId
 * @property {ITransform} [transform] - ตำแหน่ง, ขนาด, การหมุน, ความโปร่งใส
 * @property {boolean} [isVisible] - องค์ประกอบนี้กำลังแสดงอยู่หรือไม่ (default: true)
 * @property {string} [altText] - คำอธิบายรูปภาพสำหรับ accessibility
 * @property {string} [onClickActionScript] - Script ที่จะทำงานเมื่อคลิก (อาจเปลี่ยนเป็น IConfigurableAction ในอนาคต)
 * @property {string} [hoverEffect] - ชื่อเอฟเฟกต์เมื่อ hover
 * @property {string} [layerId] - ID ของ Layer ที่องค์ประกอบนี้สังกัด
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
  onClickActionScript: { type: String, trim: true, maxlength: [1000, "onClickAction script is too long"] }, // เปลี่ยนจาก onClickAction
  hoverEffect: {type: String, trim: true, maxlength: [100, "Hover effect name is too long"]},
  layerId: { type: String, trim: true },
}, { _id: false });

/**
 * @interface IVideoElement
 * @description การตั้งค่าวิดีโอในฉาก
 * @property {string} instanceId - ID เฉพาะของ instance วิดีโอนี้ (unique ภายใน scene.videos)
 * @property {Types.ObjectId} mediaId - ID ของ Media (ไฟล์วิดีโอ) (ref: 'Media' หรือ 'OfficialMedia')
 * @property {"Media" | "OfficialMedia"} mediaSourceType - แหล่งที่มาของ mediaId
 * @property {ITransform} [transform] - ตำแหน่งและขนาดของพื้นที่แสดงผลวิดีโอ
 * @property {boolean} [autoplay] - เล่นอัตโนมัติเมื่อฉากโหลด/event trigger (default: false)
 * @property {boolean} [loop] - เล่นซ้ำวนลูปหรือไม่ (default: false)
 * @property {boolean} [controls] - แสดงแถบควบคุมวิดีโอของ browser/player (default: false)
 * @property {number} [volume] - ระดับเสียงเริ่มต้น (0.0-1.0, default: 1.0)
 * @property {boolean} [isMuted] - ปิดเสียงวิดีโอเริ่มต้นหรือไม่ (default: false)
 * @property {boolean} [isVisible] - วิดีโอนี้กำลังแสดงอยู่หรือไม่ (default: true)
 * @property {string} [onEndedActionScript] - Script ที่จะเกิดเมื่อวิดีโอเล่นจบ
 * @property {string} [layerId] - ID ของ Layer ที่วิดีโอนี้สังกัด
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
  onEndedActionScript: { type: String, trim: true, maxlength: [1000, "onEndedAction script is too long"]}, // เปลี่ยนจาก onEndedAction
  layerId: { type: String, trim: true },
}, { _id: false });

/**
 * @interface IAudioElement
 * @description การตั้งค่าเสียงในฉาก (SFX, BGM, Voice Over ที่ไม่ได้ผูกกับ TextContent โดยตรง)
 * @property {string} instanceId - ID เฉพาะของ instance เสียงนี้ (unique ภายใน scene.audios)
 * @property {"audio_effect" | "background_music" | "voice_over"} type - ประเภทของเสียง
 * @property {Types.ObjectId} mediaId - ID ของ Media (ไฟล์เสียง) (ref: 'Media' หรือ 'OfficialMedia')
 * @property {"Media" | "OfficialMedia"} mediaSourceType - แหล่งที่มาของ mediaId
 * @property {number} [volume] - ระดับเสียง (0.0-1.0, default: 1.0)
 * @property {boolean} [loop] - เล่นซ้ำวนลูปหรือไม่ (default: false)
 * @property {boolean} [autoplayOnLoad] - เล่นอัตโนมัติเมื่อฉากโหลด (default: false)
 * @property {number} [fadeInDurationMs] - ระยะเวลา fade in (ms)
 * @property {number} [fadeOutDurationMs] - ระยะเวลา fade out (ms)
 * @property {string} [audioChannel] - ช่องทางเสียง (เช่น "sfx", "music", "voice" เพื่อควบคุม volume แยกส่วน)
 */
export interface IAudioElement {
  instanceId: string; type: "audio_effect" | "background_music" | "voice_over";
  mediaId: Types.ObjectId; mediaSourceType: "Media" | "OfficialMedia";
  volume?: number; loop?: boolean; autoplayOnLoad?: boolean;
  fadeInDurationMs?: number; fadeOutDurationMs?: number; audioChannel?: string;
}
const AudioElementSchema = new Schema<IAudioElement>({
  instanceId: { type: String, required: [true, "Instance ID is required for audio element"] },
  type: { type: String, enum: ["audio_effect", "background_music", "voice_over"], required: true },
  mediaId: { type: Schema.Types.ObjectId, required: [true, "Media ID is required for audio element"], refPath: "audioElementMediaSourceType" },
  mediaSourceType: { type: String, enum: ["Media", "OfficialMedia"], required: true, alias: "audioElementMediaSourceType" },
  volume: { type: Number, min: 0, max: 1, default: 1 },
  loop: { type: Boolean, default: false },
  autoplayOnLoad: { type: Boolean, default: false },
  fadeInDurationMs: { type: Number, min: 0, default: 0 },
  fadeOutDurationMs: { type: Number, min: 0, default: 0 },
  audioChannel: { type: String, trim: true, maxlength: [50, "Audio channel name is too long"] },
}, { _id: false });


/**
 * @interface IChoiceDetail (Interface Definition)
 * @description รายละเอียดของแต่ละตัวเลือกภายใน Choice Group.
 * Interface นี้มีไว้เพื่อกำหนดโครงสร้างของ Choice ที่ Model "Choice" (ซึ่ง `choiceGroupId` อ้างอิงถึง) ควรจะมี.
 * ไม่ได้หมายความว่า IChoiceDetail จะถูก embed โดยตรงใน IChoiceGroupInScene เสมอไป (เว้นแต่จะมีการออกแบบเช่นนั้นในอนาคต).
 * @property {string} choiceId - ID เฉพาะของตัวเลือกนี้ (unique ภายใน ChoiceGroup)
 * @property {string} choiceText - ข้อความที่แสดงบนตัวเลือก
 * @property {Types.DocumentArray<IConfigurableAction>} actions - ชุดของการกระทำที่จะเกิดขึ้นเมื่อเลือกตัวเลือกนี้
 * @property {string | IConditionLogic} [conditionToDisplay] - เงื่อนไข (string หรือ IConditionLogic) ที่ต้องเป็นจริงเพื่อให้ตัวเลือกนี้แสดงผล
 * @property {string} [tooltip] - ข้อความอธิบายเพิ่มเติมเมื่อ hover
 * @property {boolean} [isLockedInitially] - ตัวเลือกนี้ถูกล็อคในตอนแรกหรือไม่
 * @property {string} [unlockHint] - คำใบ้ถ้าถูกล็อค
 * @property {boolean} [isDefault] - ตัวเลือกนี้เป็น default หรือไม่ (หากมีระบบ auto-choice หรือ timeout)
 */
export interface IChoiceDetail {
    choiceId: string;
    choiceText: string;
    actions: Types.DocumentArray<IConfigurableAction>;
    conditionToDisplay?: string | IConditionLogic;
    tooltip?: string;
    isLockedInitially?: boolean;
    unlockHint?: string;
    isDefault?: boolean;
}
// const ChoiceDetailSchema = new Schema<IChoiceDetail>({...}); // สามารถสร้าง Schema นี้ถ้าต้องการ embed หรือใช้ใน Model "Choice"


/**
 * @interface IChoiceGroupInScene
 * @description การอ้างอิงกลุ่มตัวเลือก (Choice Group) ที่จะแสดงในฉากนี้
 * @property {string} instanceId - ID เฉพาะของ instance กลุ่มตัวเลือกนี้ในฉาก (unique ภายใน scene.choiceGroupsAvailable)
 * @property {Types.ObjectId} choiceGroupId - ID ของกลุ่มตัวเลือกหลัก (ref: 'Choice' model, ซึ่งคาดว่า Choice model จะมี array ของ IChoiceDetail)
 * @property {ITransform} [transform] - ตำแหน่งและขนาดของพื้นที่แสดงผลกลุ่มตัวเลือก
 * @property {boolean} [isModal] - แสดงเป็น modal dialog หรือไม่ (default: true)
 * @property {string | IConditionLogic} [displayCondition] - เงื่อนไข (string หรือ IConditionLogic) ที่ต้องเป็นจริงเพื่อให้กลุ่มตัวเลือกนี้แสดง
 * @property {string} [layerId] - ID ของ Layer ที่กลุ่มตัวเลือกนี้สังกัด
 * @property {string} [choiceGroupLayout] - (Optional) ชื่อ layout ที่กำหนดไว้สำหรับกลุ่มตัวเลือกนี้ (เช่น "horizontal_buttons", "vertical_list")
 */
export interface IChoiceGroupInScene {
  instanceId: string; choiceGroupId: Types.ObjectId;
  transform?: ITransform; isModal?: boolean;
  displayCondition?: string | IConditionLogic; // ใช้ IConditionLogicSchema
  layerId?: string;
  choiceGroupLayout?: string;
}
const ChoiceGroupInSceneSchema = new Schema<IChoiceGroupInScene>({
  instanceId: { type: String, required: [true, "Instance ID is required for choice group in scene"] },
  choiceGroupId: { type: Schema.Types.ObjectId, ref: "Choice", required: [true, "Choice Group ID (referencing a Choice document) is required"] },
  transform: { type: TransformSchema, default: () => ({}) },
  isModal: { type: Boolean, default: true },
  displayCondition: { type: ConditionLogicSchema }, // เปลี่ยนเป็น ConditionLogicSchema โดยตรง
  layerId: { type: String, trim: true },
  choiceGroupLayout: { type: String, trim: true },
}, { _id: false });

/**
 * @interface IConfigurableAction
 * @description โครงสร้าง Action ที่สามารถกำหนดค่าได้ (ใช้สำหรับ Hotspot, Choice, Event Parameters)
 * @property {ChoiceActionType} actionType - ประเภทของ Action
 * @property {any} actionParameters - พารามิเตอร์สำหรับ Action (โครงสร้างขึ้นอยู่กับ `actionType`)
 * @property {number} [delayMs] - หน่วงเวลาก่อน Action นี้ทำงาน (ms)
 * @property {string | IConditionLogic} [conditionToExecute] - เงื่อนไข (string หรือ IConditionLogic) ที่ต้องเป็นจริงเพื่อให้ Action นี้ทำงาน
 */
export interface IConfigurableAction {
  actionType: ChoiceActionType;
  actionParameters: any;
  delayMs?: number;
  conditionToExecute?: string | IConditionLogic; // ใช้ IConditionLogicSchema
}
const ConfigurableActionSchema = new Schema<IConfigurableAction>({
  actionType: { type: String, enum: Object.values(ChoiceActionType), required: true },
  actionParameters: { type: Schema.Types.Mixed, required: true },
  delayMs: { type: Number, min: 0, default: 0 },
  conditionToExecute: { type: ConditionLogicSchema }, // เปลี่ยนเป็น ConditionLogicSchema โดยตรง
}, { _id: false });

/**
 * @interface IInteractiveHotspot
 * @description พื้นที่ (รูปทรงต่างๆ) ที่ผู้เล่นสามารถคลิกได้บนฉาก เพื่อให้เกิด action บางอย่าง
 * @property {string} hotspotId - ID เฉพาะของ hotspot นี้ (unique ภายใน scene.interactiveHotspots)
 * @property {ITransform} transform - กำหนดพื้นที่, ขนาด, และตำแหน่งของ hotspot (โดยทั่วไปคือ bounding box)
 * @property {"rectangle" | "circle" | "polygon"} [shapeType] - ประเภทรูปร่างของ hotspot (default: "rectangle" ถ้าไม่ระบุ)
 * @property {any} [shapeData] - ข้อมูลเพิ่มเติมสำหรับรูปร่าง (เช่น [{x,y},...] สำหรับ polygon, {radius} สำหรับ circle)
 * @property {string} [tooltip] - ข้อความที่จะแสดงเมื่อผู้ใช้ hover เมาส์เหนือ hotspot
 * @property {Types.DocumentArray<IConfigurableAction>} actions - ชุดของ actions ที่จะทำงานเมื่อคลิก hotspot
 * @property {boolean} [isVisibleDebug] - Hotspot นี้มองเห็นกรอบ debug ใน Editor หรือไม่ (default: false)
 * @property {boolean} [isActive] - Hotspot นี้คลิกได้หรือไม่ (default: true)
 * @property {string | IConditionLogic} [activationCondition] - เงื่อนไขที่ต้องเป็นจริงเพื่อให้ hotspot นี้ active/clickable
 * @property {boolean} [consumeClick] - เมื่อคลิกแล้ว hotspot นี้จะใช้งานไม่ได้อีกหรือไม่ (default: false)
 * @property {string} [layerId] - ID ของ Layer ที่ hotspot นี้สังกัด
 * @property {number} [maxClicks] - จำนวนครั้งที่คลิกได้ (0 = ไม่จำกัด, default: 0)
 * @property {Types.DocumentArray<IConfigurableAction>} [hoverEnterActions] - Actions ที่จะทำงานเมื่อผู้ใช้ hover เมาส์เข้าสู่พื้นที่ hotspot
 * @property {Types.DocumentArray<IConfigurableAction>} [hoverExitActions] - Actions ที่จะทำงานเมื่อผู้ใช้ hover เมาส์ออกจากพื้นที่ hotspot
 * @property {string} [cursorStyle] - CSS cursor style เมื่อ hover (เช่น "pointer", "help", "url(...)")
 */
export interface IInteractiveHotspot {
  hotspotId: string; transform: ITransform;
  shapeType?: "rectangle" | "circle" | "polygon";
  shapeData?: any;
  tooltip?: string;
  actions: Types.DocumentArray<IConfigurableAction>;
  isVisibleDebug?: boolean; isActive?: boolean;
  activationCondition?: string | IConditionLogic; // ใช้ IConditionLogicSchema
  consumeClick?: boolean; layerId?: string; maxClicks?: number;
  hoverEnterActions?: Types.DocumentArray<IConfigurableAction>;
  hoverExitActions?: Types.DocumentArray<IConfigurableAction>;
  cursorStyle?: string;
}
const InteractiveHotspotSchema = new Schema<IInteractiveHotspot>({
  hotspotId: { type: String, required: [true, "Hotspot ID is required"] },
  transform: { type: TransformSchema, required: [true, "Transform is required for hotspot to define its area"] },
  shapeType: { type: String, enum: ["rectangle", "circle", "polygon"], default: "rectangle" }, // เพิ่ม shapeType
  shapeData: { type: Schema.Types.Mixed }, // เพิ่ม shapeData
  tooltip: { type: String, trim: true, maxlength: [255, "Tooltip for hotspot is too long"] },
  actions: [ConfigurableActionSchema],
  isVisibleDebug: { type: Boolean, default: false }, // เปลี่ยนชื่อจาก isVisible
  isActive: { type: Boolean, default: true },
  activationCondition: { type: ConditionLogicSchema }, // เปลี่ยนเป็น ConditionLogicSchema โดยตรง
  consumeClick: { type: Boolean, default: false },
  layerId: { type: String, trim: true },
  maxClicks: { type: Number, min:0, default:0 },
  hoverEnterActions: [ConfigurableActionSchema],
  hoverExitActions: [ConfigurableActionSchema],
  cursorStyle: { type: String, trim: true },
}, { _id: false });

/**
 * @interface ISceneLayer
 * @description การจัดการ Layer ภายในฉาก เพื่อควบคุมลำดับการแสดงผลและคุณสมบัติของกลุ่มองค์ประกอบ
 * @property {string} layerId - ID เฉพาะของ Layer นี้ (unique ภายใน scene.layers)
 * @property {string} layerName - ชื่อที่ผู้ใช้อ่านได้ของ Layer (สำหรับ Editor)
 * @property {number} zIndex - ลำดับการซ้อนทับของ Layer นี้ (ค่ามากจะแสดงอยู่ด้านบนสุด, unique ภายใน scene.layers)
 * @property {boolean} [isVisible] - Layer นี้และองค์ประกอบทั้งหมดใน Layer นี้จะแสดงผลหรือไม่ (default: true)
 * @property {boolean} [isLocked] - Layer นี้ถูกล็อกการแก้ไขใน Editor หรือไม่ (default: false)
 * @property {number} [opacity] - ความโปร่งใสของทั้ง Layer (0.0-1.0, default: 1.0)
 * @property {"normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity"} [blendingMode] - (Optional) Blending mode ของ Layer (คล้าย Photoshop)
 * @property {Types.DocumentArray<ISceneEffectInstance>} [layerEffects] - (Optional) เอฟเฟกต์ที่ใช้กับทั้ง Layer นี้โดยเฉพาะ
 */
export interface ISceneLayer {
  layerId: string; layerName: string; zIndex: number;
  isVisible?: boolean; isLocked?: boolean; opacity?: number;
  blendingMode?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity";
  // layerEffects?: Types.DocumentArray<ISceneEffectInstance>; // ยังไม่เพิ่ม Schema โดยตรง รอการใช้งานจริง
}
const SceneLayerSchema = new Schema<ISceneLayer>({
  layerId: { type: String, required: [true, "Layer ID is required"] },
  layerName: { type: String, required: [true, "Layer name is required"], trim: true, maxlength: [100, "Layer name is too long"] },
  zIndex: { type: Number, required: [true, "zIndex is required for layer ordering"] }, // ควร unique ภายใน scene
  isVisible: { type: Boolean, default: true },
  isLocked: { type: Boolean, default: false }, // For editor use
  opacity: { type: Number, min: 0, max: 1, default: 1 },
  blendingMode: { type: String, enum: ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], default: "normal" }, // เพิ่ม blendingMode
}, { _id: false });


// SECTION: Specific Timeline Event Parameter Interfaces

/** @interface ITimelineEventParametersBase - Base for all event parameters. */
export interface ITimelineEventParametersBase {
    transitionDurationMs?: number; // Common for many visual changes
    easingFunction?: "linear" | "easeInQuad" | "easeOutQuad" | "easeInOutQuad" | "easeInCubic" | "easeOutCubic" | "easeInOutCubic" | "easeInQuart" | "easeOutQuart" | "easeInOutQuart" | "easeInQuint" | "easeOutQuint" | "easeInOutQuint" | string; // Common easing functions
}

/** @description Parameters for SHOW_CHARACTER / HIDE_CHARACTER events */
export interface IShowHideCharacterEventParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to characterInstanceId
    // For SHOW_CHARACTER
    targetTransform?: ITransform; // Optional: Override initial transform from ICharacterInScene
    expressionId?: string;      // Optional: Override initial expression
    entryAnimation?: string;    // Optional: Override entry animation
    // For HIDE_CHARACTER
    exitAnimation?: string;     // Optional: Override exit animation
}

/** @description Parameters for CHANGE_CHARACTER_EXPRESSION event */
export interface IChangeCharacterExpressionEventParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to characterInstanceId
    newExpressionId: string; // The new expression ID (key from Character.expressions or mapped by runtime)
}

/** @description Parameters for MOVE_CHARACTER event */
export interface IMoveCharacterEventParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to characterInstanceId
    newTransform: ITransform; // The target transform state
    // transitionDurationMs and easingFunction are inherited from ITimelineEventParametersBase
}

/** @description Parameters for CHARACTER_ANIMATION event */
export interface ICharacterAnimationEventParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to characterInstanceId
    animationName: string; // Name of the animation to play (e.g., "wave", "jump", "customSpriteAnimation")
    loop?: boolean; // Whether the animation should loop
    iterations?: number; // Number of times to play if not looping (0 or undefined for infinite if loop=true)
}

/** @description Parameters for SHOW_TEXT_BLOCK / HIDE_TEXT_BLOCK events */
export interface IShowHideTextBlockEventParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to textContentInstanceId
    // For SHOW_TEXT_BLOCK
    // content?: string; // Optionally override content if text block is dynamically generated by event
    // speakerDisplayName?: string; // Optionally override speaker
    // voiceOverMediaId?: Types.ObjectId; // Optionally override voice over
    // voiceOverMediaSourceType?: "Media" | "OfficialMedia";
}

/** @description Parameters for UPDATE_TEXT_BLOCK event */
export interface IUpdateTextBlockEventParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to textContentInstanceId
    newContent?: string; // New text content to display
    newSpeakerDisplayName?: string; // Change speaker name
    newColor?: string; // Change text color
    typewriterEffectSpeed?: number; // Apply or change typewriter speed (chars/sec, 0 for instant)
}

/** @description Parameters for PLAY_AUDIO / STOP_AUDIO / FADE_AUDIO_VOLUME events */
export interface IPlayAudioParams extends ITimelineEventParametersBase {
    // targetInstanceId (optional) refers to IAudioElement.instanceId defined in scene.audios
    // If not provided, or if overriding, specify mediaId.
    audioInstanceId?: string;
    mediaId?: Types.ObjectId; // ref: 'Media' or 'OfficialMedia'
    mediaSourceType?: "Media" | "OfficialMedia";
    loop?: boolean;
    volume?: number; // 0.0 to 1.0
    channel?: string; // e.g., "sfx", "bgm", "voice"
    fadeInDurationMs?: number; // For PLAY_AUDIO
    startTimeInAudioMs?: number; // Start playing from a specific point in the audio file
}
export interface IStopAudioParams extends ITimelineEventParametersBase {
    // targetInstanceId (optional) refers to IAudioElement.instanceId or use audioChannel or mediaId
    audioInstanceId?: string;
    mediaId?: Types.ObjectId; // ref: 'Media' or 'OfficialMedia' (if stopping specific media not tied to an instance)
    channel?: string;
    fadeOutDurationMs?: number;
}
export interface IFadeAudioVolumeParams extends ITimelineEventParametersBase {
    // targetInstanceId (optional) refers to IAudioElement.instanceId or use audioChannel or mediaId
    audioInstanceId?: string;
    mediaId?: Types.ObjectId;
    channel?: string;
    targetVolume: number; // 0.0 to 1.0
    // durationMs is inherited from ITimelineEventParametersBase and indicates fade duration
}

/** @description Parameters for CHANGE_BACKGROUND event */
export interface IChangeBackgroundEventParams extends ITimelineEventParametersBase {
    newBackground: IBackgroundSetting; // The complete new background setting
    // transitionDurationMs and easingFunction for the background change itself
}

/** @description Parameters for SHOW_VISUAL_ELEMENT / HIDE_VISUAL_ELEMENT events */
export interface IShowHideVisualElementParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to visualElementInstanceId
}

/** @description Parameters for ANIMATE_VISUAL_ELEMENT event */
export interface IAnimateVisualElementEventParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to visualElementInstanceId
    animationName?: string; // Predefined animation name
    targetTransform?: ITransform; // Animate towards this transform state
    // transitionDurationMs and easingFunction for the animation
    loop?: boolean;
    iterations?: number;
}

/** @description Parameters for SHOW_VIDEO_ELEMENT / HIDE_VIDEO_ELEMENT events */
export interface IShowHideVideoElementParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to videoElementInstanceId
}

/** @description Parameters for CONTROL_VIDEO event */
export interface IControlVideoParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to videoElementInstanceId
    controlType: "play" | "pause" | "stop" | "seek" | "set_volume" | "mute" | "unmute";
    seekTimeMs?: number; // For "seek"
    volumeLevel?: number; // For "set_volume" (0.0-1.0)
}

/** @description Parameters for SHOW_STATUS_UI_ELEMENT / HIDE_STATUS_UI_ELEMENT events */
export interface IShowHideStatusUIElementParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to statusUIElementInstanceId
}

/** @description Parameters for UPDATE_STATUS_UI_ELEMENT event */
export interface IUpdateStatusUIElementParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to statusUIElementInstanceId
    newValue?: any; // New value for the data source (runtime updates based on this)
    overrideText?: string; // For text-based UI elements, directly set text
    // animationType?: string; // Animation for the update (e.g., "flash", "highlight")
}

/** @description Parameters for SHOW_CHOICE_GROUP / HIDE_CHOICE_GROUP events */
export interface IShowHideChoiceGroupParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to choiceGroupInstanceId
}

/** @description Parameters for WAIT event */
export interface IWaitEventParams extends ITimelineEventParametersBase {
    // durationMs is directly on ITimelineEvent for WAIT
}

/** @description Parameters for SET_VARIABLE event */
export interface ISetVariableParams extends ITimelineEventParametersBase {
  variableName: string;
  value: any; // The new value or expression (e.g., "+=1", "-=10", "true")
  scope: VariableScope;
  characterInstanceId?: string; // If scope is CHARACTER_STATUS
  // novelIdForGlobal?: Types.ObjectId; // If scope is NOVEL_GLOBAL and needs explicit novel targeting (rare)
}

/** @description Parameters for RUN_CUSTOM_SCRIPT event */
export interface IRunCustomScriptParams extends ITimelineEventParametersBase {
    scriptId?: string; // ID of a predefined script
    scriptContent?: string; // Actual script content
    contextParameters?: { [key: string]: any }; // Parameters to pass to the script
}

/** @description Parameters for SCREEN_EFFECT event */
export interface IScreenEffectParams extends ITimelineEventParametersBase {
    effectType: "shake" | "flash" | "blur" | "grayscale" | "sepia" | "invert" | "custom_shader";
    intensity?: number; // 0.0 to 1.0, or specific units for shake (pixels)
    durationMs?: number; // Duration of the effect (overrides ITimelineEvent.durationMs if needed for the effect itself)
    color?: string; // For flash effect
    shaderId?: string; // For custom_shader
    shaderParameters?: { [key: string]: any };
}

/** @description Parameters for TRANSITION_EFFECT (intra-scene element transition) */
export interface ITransitionEffectParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent is the element being transitioned (e.g. image, character)
    // This is different from SceneTransitionType which is for scene-to-scene.
    // This implies an animation or transform change on an element, covered by MOVE_CHARACTER or ANIMATE_VISUAL_ELEMENT.
    // If this is for a general "filter" transition on an element, it's more like a temporary shader/effect.
    // For now, assume this is covered by other animation/move events. If it's a specific visual transition like a "wipe" on an image,
    // it might need more detailed parameters.
    transitionName: string; // e.g. "pixel_dissolve_in", "blur_out"
}

/** @description Parameters for APPLY_CHARACTER_STATUS event */
export interface IApplyCharacterStatusEventParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to characterInstanceId
    statusEffectToApply: IStatusEffect; // The full status effect definition or a reference ID to a predefined one
}
/** @description Parameters for REMOVE_CHARACTER_STATUS event */
export interface IRemoveCharacterStatusEventParams extends ITimelineEventParametersBase {
    // targetInstanceId from ITimelineEvent refers to characterInstanceId
    statusEffectName: string; // Name of the status effect to remove
}

/** @description Parameters for APPLY_SCENE_EFFECT event */
export interface IApplySceneEffectEventParams extends ITimelineEventParametersBase {
    // targetInstanceId can be used if the effect is tied to a specific ISceneEffectInstance.instanceId
    // Otherwise, parameters define the effect.
    effectInstance: ISceneEffectInstance; // Definition of the scene effect to apply or update
}
/** @description Parameters for REMOVE_SCENE_EFFECT event */
export interface IRemoveSceneEffectEventParams extends ITimelineEventParametersBase {
    // targetInstanceId refers to ISceneEffectInstance.instanceId to remove
}

/** @description Parameters for TRIGGER_HOTSPOT event */
export interface ITriggerHotspotEventParams extends ITimelineEventParametersBase {
    // targetInstanceId refers to hotspotId
}

/** @description Parameters for ENABLE_HOTSPOT event */
export interface IEnableHotspotEventParams extends ITimelineEventParametersBase {
    // targetInstanceId refers to hotspotId
    shouldBeEnabled: boolean;
}


/**
 * @interface ITimelineEvent
 * @description เหตุการณ์ (Event) ที่เกิดขึ้นใน Timeline ของฉาก เพื่อควบคุมการแสดงผลและ logic ต่างๆ
 * @property {string} eventId - ID เฉพาะของ Event นี้ (unique ภายใน Track หรือ Scene)
 * @property {number} startTimeMs - เวลาเริ่มต้นของ Event (นับจากเริ่ม Track, หน่วยเป็น ms)
 * @property {number} [durationMs] - ระยะเวลาของ Event (ถ้ามี, เช่น animation, wait, text display time)
 * @property {TimelineEventType} eventType - ประเภทของ Event
 * @property {string} [targetInstanceId] - ID ของ instance องค์ประกอบที่เป็นเป้าหมายของ Event (เช่น character.instanceId, textContent.instanceId, etc.)
 * @property {any} parameters - พารามิเตอร์เพิ่มเติมสำหรับ Event (โครงสร้างขึ้นอยู่กับ `eventType`, ควรใช้ Specific Interface ที่ define ไว้)
 * @property {string} [notes] - หมายเหตุสำหรับ Event นี้ใน Editor (ไม่แสดงผลในเกม)
 * @property {boolean} [waitForCompletion] - (สำหรับ events ที่มี duration) Timeline จะหยุดรอให้ event นี้จบก่อนไป event ถัดไปหรือไม่ (default: true สำหรับส่วนใหญ่)
 */
export interface ITimelineEvent {
  eventId: string; startTimeMs: number; durationMs?: number;
  eventType: TimelineEventType; targetInstanceId?: string;
  parameters: // Union of all specific event parameter types
    | IShowHideCharacterEventParams | IChangeCharacterExpressionEventParams | IMoveCharacterEventParams | ICharacterAnimationEventParams
    | IShowHideTextBlockEventParams | IUpdateTextBlockEventParams
    | IPlayAudioParams | IStopAudioParams | IFadeAudioVolumeParams
    | IChangeBackgroundEventParams
    | IShowHideVisualElementParams | IAnimateVisualElementEventParams
    | IShowHideVideoElementParams | IControlVideoParams
    | IShowHideStatusUIElementParams | IUpdateStatusUIElementParams
    | IShowHideChoiceGroupParams
    | IWaitEventParams // Typically empty, duration is on ITimelineEvent
    | ISetVariableParams
    | IRunCustomScriptParams
    | IScreenEffectParams
    | ITransitionEffectParams // Consider if this is distinct enough
    | IApplyCharacterStatusEventParams | IRemoveCharacterStatusEventParams
    | IApplySceneEffectEventParams | IRemoveSceneEffectEventParams
    | ITriggerHotspotEventParams | IEnableHotspotEventParams
    | { [key: string]: any }; // Fallback for non-typed or custom event types
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
 * @description Track ใน Timeline สำหรับจัดกลุ่ม Events (เช่น Track สำหรับตัวละคร A, Track สำหรับ BGM)
 * @property {string} trackId - ID เฉพาะของ Track นี้ (unique ภายใน scene.timelineTracks)
 * @property {string} trackName - ชื่อของ Track (สำหรับ Editor)
 * @property {string} [trackType] - ประเภทของ Track (เช่น "character_animation", "audio", "screen_effects", "general_logic")
 * @property {Types.DocumentArray<ITimelineEvent>} events - รายการ Events ใน Track นี้ (ควรเรียงตาม startTimeMs)
 * @property {boolean} [isMuted] - Track นี้ถูกปิดเสียง/ปิดการทำงานชั่วคราวหรือไม่ (สำหรับ Editor หรือ debug)
 * @property {boolean} [isLocked] - Track นี้ถูกล็อกการแก้ไขใน Editor หรือไม่
 * @property {string} [targetLayerId] - (Optional) ถ้า Track นี้ควบคุมองค์ประกอบใน Layer ที่เฉพาะเจาะจง
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
 * @description ตัวแปรที่ใช้ได้เฉพาะภายในฉากนี้ (Local Scope Variables)
 * @property {string} name - ชื่อตัวแปร (ต้อง unique ภายใน scene.sceneVariables array)
 * @property {any} value - ค่าเริ่มต้นของตัวแปร (สามารถเป็น string, number, boolean, object, array)
 * @property {string} [description] - คำอธิบายตัวแปร (สำหรับ Editor)
 * @property {"string" | "number" | "boolean" | "object" | "array"} [dataType] - (Optional) ประเภทข้อมูลของตัวแปร (เพื่อช่วย Editor)
 * @property {boolean} [isReadOnlyForPlayer] - (Optional) ผู้เล่นไม่สามารถแก้ไขค่านี้ได้โดยตรงผ่าน UI ทั่วไป (แต่ script อาจแก้ไขได้)
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
 * @description องค์ประกอบ UI สำหรับแสดงสถานะต่างๆ เช่น HP bar, ค่าเงิน, ไอคอน buff/debuff
 * @property {string} instanceId - ID เฉพาะของ UI element นี้ในฉาก (unique ภายใน scene.statusUIElements)
 * @property {StatusUIType} uiType - ประเภทของ UI (gauge, number, icon list, etc.)
 * @property {string} dataSourceVariablePath - Path ไปยังตัวแปรที่จะแสดงผล (เช่น "sceneVariables.playerHP", "storyState.karma", "characters['char_instance_id'].currentStatusEffects")
 * @property {ITransform} transform - ตำแหน่ง, ขนาด, และการจัดเรียงของ UI element
 * @property {string} [stylePresetId] - ID ของ preset สไตล์ที่กำหนดไว้ล่วงหน้า (จาก Theme หรือ Global UI Styles)
 * @property {boolean} [isVisible] - UI element นี้กำลังแสดงอยู่หรือไม่ (default: true)
 * @property {string} [layerId] - ID ของ Layer ที่ UI element นี้สังกัด (ref: 'ISceneLayer.layerId')
 * @property {string} [maxValueSourcePath] - (สำหรับ GAUGE_BAR) Path ไปยังตัวแปรค่าสูงสุด (ถ้ามี, เช่น "sceneVariables.playerMaxHP")
 * @property {string} [gaugeColor] - (สำหรับ GAUGE_BAR) สีของแถบเกจ
 * @property {string} [gaugeBackgroundColor] - (สำหรับ GAUGE_BAR) สีพื้นหลังของแถบเกจ
 * @property {number} [iconSize] - (สำหรับ ICON_LIST) ขนาดไอคอน (px)
 * @property {number} [iconSpacing] - (สำหรับ ICON_LIST) ระยะห่างระหว่างไอคอน (px)
 * @property {number} [maxIconsToShow] - (สำหรับ ICON_LIST) จำนวนไอคอนสูงสุดที่จะแสดง
 * @property {string} [prefixText] - (สำหรับ NUMERIC_DISPLAY, TEXT_LABEL) ข้อความนำหน้า
 * @property {string} [suffixText] - (สำหรับ NUMERIC_DISPLAY, TEXT_LABEL) ข้อความต่อท้าย
 * @property {string} [numberFormatString] - (สำหรับ NUMERIC_DISPLAY) รูปแบบการแสดงผลตัวเลข (เช่น "N0", "#,##0.00")
 * @property {Types.ObjectId} [customHtmlTemplateId] - (สำหรับ CUSTOM_HTML) ID ของ template HTML ที่กำหนดไว้ (อาจเก็บใน model อื่น)
 * @property {string | IConditionLogic} [visibilityCondition] - (Optional) เงื่อนไขเพิ่มเติมในการแสดง/ซ่อน UI นอกเหนือจาก isVisible
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
  prefixText: { type: String, trim: true, maxlength: 100 }, // เปลี่ยนจาก prefix
  suffixText: { type: String, trim: true, maxlength: 100 }, // เปลี่ยนจาก suffix
  numberFormatString: { type: String, trim: true, maxlength: 50 }, // เปลี่ยนจาก formatString
  customHtmlTemplateId: { type: Schema.Types.ObjectId }, // อาจ ref ไปยัง model อื่น
  visibilityCondition: { type: ConditionLogicSchema },
}, { _id: false });

/**
 * @interface ISceneEffectInstance
 * @description Instance ของเอฟเฟกต์ที่ใช้กับทั้งฉาก เช่น หมอก, ฝน, ฟิลเตอร์สีพิเศษ
 * @property {string} instanceId - ID ของ instance effect นี้ (unique ภายใน scene.activeSceneEffects)
 * @property {"fog" | "rain" | "snow" | "color_filter" | "post_process_shader" | "custom_overlay" | string} effectType - ประเภทของเอฟเฟกต์ (อนุญาต string เผื่อ custom type)
 * @property {any} parameters - พารามิเตอร์เฉพาะของ effectType
 * @property {number} [startTimeMsOffset] - (Optional) Delay ก่อน effect นี้เริ่มทำงาน (นับจาก event ที่ trigger หรือตอนโหลดฉาก)
 * @property {number} [durationMs] - (Optional) ระยะเวลาของ effect (0 หรือ undefined หมายถึงควบคุมโดยปัจจัยอื่น หรือจนกว่าจะถูกลบ)
 * @property {string} [targetLayerId] - (Optional) ID ของ Layer ที่ effect นี้จะแสดงผลอยู่ (ถ้าไม่ระบุ อาจหมายถึง global หรือ فوق Layer ทั้งหมด)
 * @property {number} [zIndexInSceneEffects] - (Optional) ลำดับการซ้อนทับของ Scene Effect ด้วยกันเอง (ถ้ามีหลาย Scene Effect พร้อมกัน)
 */
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
    effectType: { type: String, required: true }, // Allow custom string for extensibility
    parameters: { type: Schema.Types.Mixed },
    startTimeMsOffset: { type: Number, min: 0, default:0 },
    durationMs: { type: Number, min: 0 },
    targetLayerId: { type: String, trim: true },
    zIndexInSceneEffects: { type: Number, default: 0 },
}, { _id: false });

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Scene (IScene Document Interface)
// ==================================================================================================

/**
 * @interface IScene
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารฉากใน Collection "scenes_v2" ซึ่งเป็นหัวใจของ Visual Novel Editor
 * ประกอบด้วยข้อมูลทั้งหมดที่จำเป็นในการ render และควบคุมปฏิสัมพันธ์ภายในฉากหนึ่งๆ.
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสารฉาก
 * @property {Types.ObjectId} novelId - ID ของนิยายแม่ (ref: 'Novel')
 * @property {Types.ObjectId} episodeId - ID ของตอนที่ฉากนี้เป็นส่วนหนึ่ง (ref: 'Episode')
 * @property {number} sceneOrder - ลำดับของฉากภายในตอน (unique ภายใน episodeId)
 * @property {string} [title] - ชื่อหรือคำอธิบายสั้นๆ ของฉาก (สำหรับ Editor)
 * @property {IBackgroundSetting} background - การตั้งค่าพื้นหลังหลักของฉาก
 * @property {Types.DocumentArray<ISceneLayer>} layers - การจัดการ Layer ภายในฉาก
 * @property {Types.DocumentArray<ICharacterInScene>} characters - รายการตัวละคร (instances) ที่สามารถปรากฏในฉากนี้
 * @property {Types.DocumentArray<ITextContent>} textContents - รายการข้อความ (dialogue, narration instances)
 * @property {Types.DocumentArray<IVisualElement>} images - รายการรูปภาพ (CG, icons, overlays)
 * @property {Types.DocumentArray<IVideoElement>} videos - รายการวิดีโอ
 * @property {Types.DocumentArray<IAudioElement>} audios - รายการเสียง (SFX, BGM instances ที่ pre-define)
 * @property {Types.DocumentArray<IChoiceGroupInScene>} choiceGroupsAvailable - กลุ่มตัวเลือก (instances) ที่สามารถแสดงในฉากนี้
 * @property {Types.DocumentArray<IInteractiveHotspot>} interactiveHotspots - พื้นที่ (hotspots) ที่ผู้เล่นสามารถคลิกได้
 * @property {Types.DocumentArray<IStatusUIElement>} statusUIElements - UI Elements สำหรับแสดงสถานะต่างๆ
 * @property {Types.DocumentArray<ISceneEffectInstance>} activeSceneEffects - เอฟเฟกต์ที่ส่งผลต่อทั้งฉาก (เช่น หมอก, ฝน)
 * @property {Types.DocumentArray<ITimelineTrack>} timelineTracks - Timeline และ Tracks สำหรับควบคุมเหตุการณ์ต่างๆ ในฉาก
 * @property {Types.ObjectId} [defaultNextSceneId] - ID ของฉากถัดไปตามปกติ (ref: 'Scene')
 * @property {Types.ObjectId} [previousSceneId] - ID ของฉากก่อนหน้า (ref: 'Scene')
 * @property {SceneTransitionType} [transitionToNextSceneType] - ประเภท animation การเปลี่ยนไปฉากถัดไป
 * @property {number} [transitionToNextSceneDurationMs] - ระยะเวลาของ transition (ms)
 * @property {string} [transitionToNextSceneCustomName] - (ถ้า type="custom") ชื่อของ custom transition
 * @property {number} [autoAdvanceDelayMs] - ระยะเวลา (ms) ก่อนจะไปยังฉากถัดไปโดยอัตโนมัติ (0 = ไม่อัตโนมัติ)
 * @property {Types.DocumentArray<ISceneVariable>} sceneVariables - ตัวแปรที่ใช้ได้เฉพาะภายในฉากนี้ (local scope)
 * @property {string} [onLoadScriptContent] - Script ที่จะรันเมื่อฉากเริ่มโหลด (เก็บเนื้อหา script โดยตรง)
 * @property {string} [onExitScriptContent] - Script ที่จะรันเมื่อออกจากฉาก (เก็บเนื้อหา script โดยตรง)
 * @property {string} [editorNotes] - หมายเหตุสำหรับผู้เขียน/ทีมงาน (ไม่แสดงผลในเกม)
 * @property {string} [thumbnailUrl] - URL รูปภาพตัวอย่างของฉาก (สำหรับ Editor)
 * @property {string[]} [authorDefinedEmotionTags] - แท็กอารมณ์ที่ผู้เขียนกำหนด (เช่น "ตลก", "เศร้า")
 * @property {string[]} [sceneTags] - Tags ทั่วไปสำหรับจัดหมวดหมู่ หรือค้นหา
 * @property {Types.DocumentArray<IConditionLogic>} [entryConditions] - (Optional) เงื่อนไขที่ต้องเป็นจริงทั้งหมดเพื่อให้สามารถเข้าสู่ฉากนี้ได้
 * @property {"low" | "medium" | "high" | "very_high"} [estimatedComplexity] - ระดับความซับซ้อนของฉาก (ช่วยในการจัดการทรัพยากร)
 * @property {{ mediaId: Types.ObjectId, mediaSourceType: "Media" | "OfficialMedia" }[]} [criticalAssets] - ทรัพยากรที่ควรโหลดล่วงหน้าเป็นพิเศษ
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตล่าสุด (Mongoose `timestamps`)
 * @property {number} [estimatedTimelineDurationMs] - (Virtual) ระยะเวลารวมของ Timeline โดยประมาณ
 */
export interface IScene extends Document {
  _id: Types.ObjectId; novelId: Types.ObjectId; episodeId: Types.ObjectId; sceneOrder: number;
  title?: string; background: IBackgroundSetting;
  layers: Types.DocumentArray<ISceneLayer>;
  characters: Types.DocumentArray<ICharacterInScene>;
  textContents: Types.DocumentArray<ITextContent>;
  images: Types.DocumentArray<IVisualElement>;
  videos: Types.DocumentArray<IVideoElement>;
  audios: Types.DocumentArray<IAudioElement>;
  choiceGroupsAvailable: Types.DocumentArray<IChoiceGroupInScene>;
  interactiveHotspots: Types.DocumentArray<IInteractiveHotspot>;
  statusUIElements: Types.DocumentArray<IStatusUIElement>;
  activeSceneEffects: Types.DocumentArray<ISceneEffectInstance>;
  timelineTracks: Types.DocumentArray<ITimelineTrack>;
  defaultNextSceneId?: Types.ObjectId; previousSceneId?: Types.ObjectId;
  transitionToNextSceneType?: SceneTransitionType;
  transitionToNextSceneDurationMs?: number;
  transitionToNextSceneCustomName?: string;
  autoAdvanceDelayMs?: number;
  sceneVariables: Types.DocumentArray<ISceneVariable>;
  onLoadScriptContent?: string; // เปลี่ยนจาก onLoadScript
  onExitScriptContent?: string; // เปลี่ยนจาก onExitScript
  editorNotes?: string; thumbnailUrl?: string;
  authorDefinedEmotionTags?: string[];
  sceneTags?: string[];
  entryConditions?: Types.DocumentArray<IConditionLogic>;
  estimatedComplexity?: "low" | "medium" | "high" | "very_high";
  criticalAssets?: { mediaId: Types.ObjectId, mediaSourceType: "Media" | "OfficialMedia" }[];
  createdAt: Date; updatedAt: Date;
  estimatedTimelineDurationMs?: number;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Scene (SceneSchema)
// ==================================================================================================
const SceneSchema = new Schema<IScene>(
  {
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", required: [true, "Novel ID is required"], index: true },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode", required: [true, "Episode ID is required"], index: true },
    sceneOrder: { type: Number, required: [true, "Scene order is required"], min: [0, "Scene order must be non-negative"] },
    title: { type: String, trim: true, maxlength: [255, "Scene title is too long"] },
    background: { type: BackgroundSettingSchema, required: [true, "Background settings are required"] },
    layers: { type: [SceneLayerSchema], default: () => ([{ layerId: "default_layer", layerName: "Default Layer", zIndex: 0, blendingMode: "normal" }])},
    characters: [CharacterInSceneSchema],
    textContents: [TextContentSchema],
    images: [VisualElementSchema],
    videos: [VideoElementSchema],
    audios: [AudioElementSchema],
    choiceGroupsAvailable: [ChoiceGroupInSceneSchema],
    interactiveHotspots: [InteractiveHotspotSchema],
    statusUIElements: [StatusUIElementSchema],
    activeSceneEffects: [SceneEffectInstanceSchema],
    timelineTracks: { type: [TimelineTrackSchema], default: () => ([{ trackId: "main_track", trackName: "Main Track", events: [] }]) },
    defaultNextSceneId: { type: Schema.Types.ObjectId, ref: "Scene", default: null },
    previousSceneId: { type: Schema.Types.ObjectId, ref: "Scene", default: null },
    transitionToNextSceneType: { type: String, enum: Object.values(SceneTransitionType), default: SceneTransitionType.NONE },
    transitionToNextSceneDurationMs: { type: Number, min: 0, default: 300 },
    transitionToNextSceneCustomName: { type: String, trim: true, maxlength: 100 },
    autoAdvanceDelayMs: { type: Number, min: 0, default: 0 },
    sceneVariables: [SceneVariableSchema],
    onLoadScriptContent: { type: String, trim: false, maxlength: [150000, "OnLoadScript content is too long"] }, // trim:false เผื่อเว้นวรรคสำคัญใน script
    onExitScriptContent: { type: String, trim: false, maxlength: [150000, "OnExitScript content is too long"] }, // trim:false
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
  },
  {
    timestamps: true,
    toObject: { virtuals: true, aliases: true },
    toJSON: { virtuals: true, aliases: true },
    collection: "scenes_v2", // ชื่อ collection ที่ชัดเจน
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================
SceneSchema.index({ episodeId: 1, sceneOrder: 1 }, { unique: true, name: "idx_episode_scene_order_unique_v2" });
SceneSchema.index({ novelId: 1, episodeId: 1, sceneOrder: 1 }, { name: "idx_novel_episode_scene_sort_v2" });
SceneSchema.index({ novelId: 1, authorDefinedEmotionTags: 1 }, { name: "idx_novel_emotion_tags_v2" });
SceneSchema.index({ novelId: 1, sceneTags: 1 }, { name: "idx_novel_scene_tags_v2" });
SceneSchema.index({ title: "text", "textContents.content": "text", editorNotes: "text" }, { name: "idx_scene_text_search_v2", default_language: "none" }); // เพิ่ม editorNotes ใน text index
SceneSchema.index({ novelId: 1, "entryConditions.variableName": 1 }, { name: "idx_scene_entry_conditions_var_v2", sparse: true }); // Index สำหรับ query ฉากตามเงื่อนไข (ถ้ามีการใช้บ่อย)

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================
SceneSchema.virtual("estimatedTimelineDurationMs").get(function (this: IScene): number {
  if (!this.timelineTracks || this.timelineTracks.length === 0) return 0;
  let maxEndTime = 0;
  this.timelineTracks.forEach(track => {
    if (track.events && track.events.length > 0) {
      track.events.forEach(event => {
        const eventEffectiveDuration = event.durationMs || 0; // บาง event อาจไม่มี duration แต่มีผลทันที
        const endTime = event.startTimeMs + eventEffectiveDuration;
        if (endTime > maxEndTime) maxEndTime = endTime;
      });
    }
  });
  return maxEndTime;
});

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

SceneSchema.pre<IScene>("save", function (next: (err?: mongoose.Error) => void) {
  const idSet = new Set<string>();
  let error: mongoose.Error | null = null;

  const checkUniqueIdInScope = (id: string | undefined, idName: string, scopeName: string, parentPathForError: string): boolean => {
    if (!id) return true; // ID ที่เป็น optional และไม่ได้ระบุ จะไม่ถูกตรวจสอบ
    const uniqueKeyInScope = `${scopeName}[${idName}=${id}]`;
    if (idSet.has(uniqueKeyInScope)) {
      error = new mongoose.Error(`Duplicate ID "${id}" for property "${idName}" within scope "${scopeName}" at "${parentPathForError}". IDs must be unique within their respective collections/scopes in the scene (novel: ${this.novelId}, episode: ${this.episodeId}, order: ${this.sceneOrder}).`);
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
            return next(error!); // error will not be null here
          }
        }
      }
    }
  }

  if (this.sceneVariables && this.sceneVariables.length > 0) {
    const sceneVarNames = new Set<string>();
    for (const variable of this.sceneVariables) {
      if (sceneVarNames.has(variable.name)) {
        error = new mongoose.Error(`Duplicate sceneVariable name "${variable.name}" found. Variable names must be unique within the scene.`);
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
            error = new mongoose.Error(`Duplicate eventId "${event.eventId}" found in track "${track.trackName}" (ID: ${track.trackId}). Event IDs must be unique within their track.`);
            return next(error);
          }
          eventIdsInTrack.add(event.eventId);
        }
      }
    }
  }

  // ตรวจสอบ zIndex unique ใน layers (สำคัญมากสำหรับการ render ที่ถูกต้อง)
  if (this.layers && this.layers.length > 0) {
    const zIndexSet = new Set<number>();
    for (const layer of this.layers) {
        if (layer.zIndex === undefined) { // zIndex is required in SceneLayerSchema
            error = new mongoose.Error(`Layer "${layer.layerName}" (ID: ${layer.layerId}) is missing zIndex.`);
            return next(error);
        }
        if (zIndexSet.has(layer.zIndex)) {
            error = new mongoose.Error(`Duplicate zIndex ${layer.zIndex} found for layer "${layer.layerName}" (ID: ${layer.layerId}). Layer zIndexes must be unique within the scene.`);
            return next(error);
        }
        zIndexSet.add(layer.zIndex);
    }
  }


  if (error) { // Should have been caught by returns above, but as a final check
    return next(error);
  }
  next();
});

async function updateParentTimestamps(doc: IScene | null, actionType: 'save' | 'delete') {
  if (!doc || !doc.episodeId || !doc.novelId) {
    return;
  }
  try {
    // ใช้ Mongoose.model() เพื่อเข้าถึง Model ที่อาจจะยังไม่ได้ import โดยตรง ป้องกัน circular dependency
    // และเพื่อให้แน่ใจว่าใช้ Model ที่ Mongoose รู้จักในขณะนั้น
    const EpisodeModel = mongoose.models.Episode || mongoose.model("Episode");
    const NovelModel = mongoose.models.Novel || mongoose.model("Novel");
    
    const now = new Date();
    const updateData = { $set: { lastContentUpdatedAt: now, updatedAt: now } };

    await EpisodeModel.findByIdAndUpdate(doc.episodeId, updateData);
    await NovelModel.findByIdAndUpdate(doc.novelId, updateData);

    // console.log(`[SceneMiddleware - ${actionType}] Updated parent timestamps for scene ${doc._id}`);
    // ที่นี่สามารถเพิ่ม logic อื่นๆ เช่น การ trigger re-calculation ของ word count หรือข้อมูลสรุปอื่นๆ ของ Episode/Novel
  } catch (err) {
    const castedError = err as Error;
    console.error(`[SceneMiddlewareError - ${actionType}] Failed to update parent timestamps for scene ${doc._id}:`, castedError.message, castedError.stack);
    // ใน production ควรมีระบบ logging ที่ดีกว่านี้
  }
}

SceneSchema.post<IScene>("save", async function (doc: IScene, next: () => void) {
  await updateParentTimestamps(doc, 'save');
  next();
});

SceneSchema.post<mongoose.Query<IScene | null, IScene>>("findOneAndUpdate", async function (result: IScene | null, next: () => void) {
  // 'this' คือ Query object. 'result' คือ document ที่ถูกอัปเดต (ถ้า query option new:true) หรือ document ก่อนอัปเดต
  // เพื่อให้ได้ document ที่อัปเดตแล้วเสมอ (ถ้ามีการแก้ไข)
  if (result) {
    // หากไม่ได้ใช้ { new: true } ใน query อาจจะต้อง fetch document ใหม่อีกครั้งเพื่อให้ได้ข้อมูลล่าสุด
    // แต่โดยทั่วไปถ้ามีการ update, 'result' (เมื่อ new:true) จะเป็น document ที่อัปเดตแล้ว
    await updateParentTimestamps(result, 'save');
  }
  next();
});

SceneSchema.post<mongoose.Query<IScene | null, IScene>>("findOneAndDelete", async function (doc: IScene | null, next: () => void) {
  // 'doc' คือ document ที่ถูกลบ (หรือ null ถ้าไม่พบ)
  await updateParentTimestamps(doc, 'delete');
  next();
});


// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const SceneModel = (mongoose.models.Scene as mongoose.Model<IScene>) || mongoose.model<IScene>("Scene", SceneSchema);

export default SceneModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements) - อ้างอิงและปรับปรุงจากเดิม
// ==================================================================================================
// 1.  **Instance ID & Other IDs**: การ generate ID (UUID v4 แนะนำ) และการ validate uniqueness ควรทำอย่างเข้มงวดทั้ง client-side (Editor) และ server-side (middleware). Middleware ปัจจุบันตรวจสอบ uniqueness ภายใน Scene.
// 2.  **`refPath` Aliases**: การใช้ `alias` ใน schema field ที่มี `refPath` ช่วยจัดการกรณีที่ subdocument schema เดียวกันถูกใช้ในหลาย path และต้องการ `refPath` ที่ต่างกัน.
// 3.  **Timeline Event Parameters (`ITimelineEvent.parameters`)**: การสร้าง interfaces เฉพาะสำหรับ `parameters` ของแต่ละ `TimelineEventType` (ดังที่ได้ทำเพิ่มเติม) ช่วยเพิ่ม type safety และความชัดเจน. ควรทำต่อให้ครบถ้วนสำหรับ event type ที่ซับซ้อนหรือใช้บ่อย.
// 4.  **Conditional Logic (`IConditionLogic`)**: `ConditionLogicSchema` ที่เพิ่มเข้ามาช่วย validate โครงสร้างพื้นฐาน. การพัฒนาระบบเงื่อนไขนี้ให้เป็น expression tree editor หรือ DSL จะเป็น feature ที่ทรงพลัง. Runtime ต้องมี parser/evaluator สำหรับเงื่อนไขเหล่านี้.
// 5.  **Scripting Engine Integration**: `onLoadScriptContent`, `onExitScriptContent`, `CUSTOM_SCRIPT`, `RUN_CUSTOM_SCRIPT` ต้องการ scripting engine ที่ปลอดภัย (sandboxed) และมี API ที่ชัดเจน. API ควรอนุญาตให้เข้าถึง/แก้ไข `sceneVariables`, `StoryState` (global), `Inventory`, `CharacterStatus` ฯลฯ.
// 6.  **Choice System**: `IChoiceGroupInScene.choiceGroupId` อ้างอิง `Choice` model. `Choice` model ควรอบอุ้ม array ของ `IChoiceDetail` (หรือโครงสร้างที่คล้ายกัน). การปรับแต่ง UI ของ Choice (style, animation, เสียง) สามารถทำผ่าน properties ใน `Choice` model หรือ `IChoiceGroupInScene`.
// 7.  **Performance**: ฉากที่ซับซ้อนต้องการการจัดการ performance ที่ดี.
//     * **Editor**: Virtualization, lazy loading, selective rendering.
//     * **Runtime**: Asset preloading (`criticalAssets`), efficient event processing, optimized rendering. `estimatedComplexity` ช่วยในการตัดสินใจ.
// 8.  **Versioning & Collaboration**: สำหรับ Editor, การทำ version control (snapshots) และ real-time collaboration (CRDTs) เป็น features ขั้นสูงที่สำคัญ. (อยู่นอกขอบเขต Model นี้โดยตรง)
// 9.  **Accessibility (A11y)**: `altText` ใน `IVisualElement` เป็นจุดเริ่มต้นที่ดี. พิจารณา keyboard navigation, ARIA attributes, และการปรับขนาด font/contrast สำหรับ UI ทั้งหมด.
// 10. **Psychological Impact & Analytics**: `authorDefinedEmotionTags` และ `sceneTags` มีประโยชน์. สามารถใช้ AI/NLP วิเคราะห์เนื้อหา `textContents` เพื่อแนะนำ tags หรือประเมินโทน. Analytics ของ player choices, item usage, status changes ช่วยในการปรับปรุงเกม.
// 11. **Hotspot Shapes & Interactivity**: `IInteractiveHotspot` ได้เพิ่ม `shapeType` และ `shapeData` เพื่อรองรับรูปร่างที่ซับซ้อน. `hoverEnterActions`, `hoverExitActions`, และ `cursorStyle` เพิ่มมิติการโต้ตอบ.
// 12. **Status System (`IStatusEffect`, `IStatusUIElement`)**: ระบบนี้สามารถขยายให้รองรับ status ที่มีเงื่อนไขการ trigger ที่ซับซ้อน, การ dispel, stack modifiers, หรือ synergy ระหว่าง status ต่างๆ.
// 13. **Modularity และ External Models**: `SceneModel` นี้ออกแบบมาเพื่อเชื่อมต่อกับ Models ภายนอก (`Novel`, `Episode`, `Character`, `Media`, `Choice`, `Item`, `StoryState`, `Quest` etc.) ผ่าน Service Layer. การออกแบบ Models เหล่านั้นให้ดีเป็นสิ่งสำคัญ.
// 14. **Error Handling & Logging**: Middleware มีการจัดการ error พื้นฐาน. ใน production, ควรมีระบบ logging และ error reporting ที่ละเอียดและมีประสิทธิภาพ (เช่น Sentry, Winston).
// 15. **Real-time Collaboration**: (ซ้ำกับ #8) หากเป็น Editor บนเว็บ, CRDTs หรือ Operational Transforms มีประโยชน์.
// 16. **Extensibility**: การออกแบบ field ที่เป็น `string` สำหรับ type (เช่น `ISceneEffectInstance.effectType`) หรือ `Schema.Types.Mixed` สำหรับ parameters ช่วยให้สามารถเพิ่ม custom types/logics ได้ง่ายขึ้นในอนาคต. อาจพิจารณาระบบ plugin สำหรับ Editor/Runtime.
// 17. **Unique zIndex for Layers**: Middleware ได้เพิ่มการตรวจสอบ zIndex ที่ไม่ซ้ำกันสำหรับ layers เพื่อป้องกันปัญหาการ render.
// 18. **Ref Consistency**: ตรวจสอบว่า `ref` ใน Schema ถูกต้องและตรงกับชื่อ Model ที่จะใช้ (เช่น `ref: "Novel"`, `ref: "Character"`, `ref: "Media"`, `ref: "OfficialMedia"`, `ref: "Choice"`, `ref: "Item"`).
// ==================================================================================================