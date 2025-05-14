// src/models/Scene.ts
// โมเดลฉาก (Scene Model) - หัวใจหลักของ Visual Novel Editor จัดการองค์ประกอบทั้งหมดในหนึ่งหน้าจอ/เหตุการณ์
// ออกแบบใหม่เพื่อรองรับ Visual Novel Editor ระดับโปร, Media Asset Management, Game Mechanics, และ Multi-language
// อัปเดตล่าสุด: ผสานแนวคิดจาก Photoshop/Premiere, เพิ่ม Timeline, Layers, i18n, Accessibility, และ Editor Metadata

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
// สมมติว่า IChoice, IChoiceCondition ถูก export จาก Choice.ts หรือนิยามไว้ที่นี่ถ้าเหมาะสม
// import { IChoice } from "./Choice"; 

// ----- Interfaces ย่อยสำหรับองค์ประกอบต่างๆในฉาก -----

// ประเภทของฉาก (Scene Type)
export type SceneType = 
  | "standard"        // ฉากมาตรฐาน มีครบทุกองค์ประกอบ
  | "dialogue_only"   // เน้นบทสนทนา อาจมีพื้นหลังเรียบง่าย
  | "cg_display"      // แสดงภาพ CG เต็มจอ อาจมีบทพูดเล็กน้อย
  | "video_cutscene"  // เล่นไฟล์วิดีโอเป็นหลัก
  | "interactive_map" // ฉากแผนที่ให้ผู้เล่นเลือกจุดหมาย
  | "minigame"        // ฉากสำหรับมินิเกม (อาจมี logic แยก)
  | "ending_scene"    // ฉากจบพิเศษ (อาจมี UI หรือ flow ที่ต่างออกไป)
  | "title_screen"    // ฉากหน้าจอไตเติ้ล
  | "credits_scene";  // ฉากแสดงเครดิต

// การตั้งค่าการแปลงรูปทรง (Transform Configuration)
export interface ITransformConfig {
  x?: number | string; // ตำแหน่งแกน X (px, %, หรือ "center", "left", "right") เช่น 100, "50%", "calc(100% - 50px)"
  y?: number | string; // ตำแหน่งแกน Y (px, %, หรือ "center", "top", "bottom")
  width?: number | string; // ความกว้าง (px, %, "auto", "inherit")
  height?: number | string; // ความสูง (px, %, "auto", "inherit")
  scaleX?: number; // อัตราส่วนแกน X (เช่น 1 = 100%, 0.5 = 50%)
  scaleY?: number; // อัตราส่วนแกน Y
  rotation?: number; // การหมุน (องศา)
  skewX?: number; // การบิดเบี้ยวแกน X (องศา)
  skewY?: number; // การบิดเบี้ยวแกน Y
  originX?: number | string; // จุดหมุนแกน X (0-1 หรือ "left", "center", "right")
  originY?: number | string; // จุดหมุนแกน Y (0-1 หรือ "top", "center", "bottom")
  // คอมเมนต์: ใช้สำหรับจัดวางและปรับขนาดองค์ประกอบต่างๆ ในฉากอย่างละเอียด
}

// การตั้งค่าฟิลเตอร์ภาพ (Image Filter Configuration)
export interface IFilterConfig {
  blur?: string; // เช่น "5px"
  brightness?: string; // เช่น "150%" หรือ "1.5"
  contrast?: string; // เช่น "200%" หรือ "2"
  grayscale?: string; // เช่น "100%" หรือ "1"
  hueRotate?: string; // เช่น "90deg"
  invert?: string; // เช่น "100%" หรือ "1"
  opacity?: string; // เช่น "50%" หรือ "0.5" (มักใช้กับ element โดยตรง แต่ใส่ไว้เผื่อ filter chain)
  saturate?: string; // เช่น "200%" หรือ "2"
  sepia?: string; // เช่น "100%" หรือ "1"
  dropShadow?: { offsetX: string; offsetY: string; blurRadius: string; color: string };
  colorBalance?: { shadows?: { r: number; g: number; b: number }; midtones?: { r: number; g: number; b: number }; highlights?: { r: number; g: number; b: number }; preserveLuminosity?: boolean };
  levels?: { inputMin?: number; inputMax?: number; gamma?: number; outputMin?: number; outputMax?: number };
  // คอมเมนต์: ใช้สำหรับปรับแต่งลักษณะภาพและวิดีโอให้ได้โทนสีและอารมณ์ตามต้องการ
}

// โหมดการผสมสี (Blend Mode)
export type BlendMode = 
  | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten"
  | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference"
  | "exclusion" | "hue" | "saturation" | "color" | "luminosity";
// คอมเมนต์: กำหนดวิธีที่สีของ layer ปัจจุบันจะผสมกับ layer ข้างใต้

// การตั้งค่า Masking
export interface IMaskingConfig {
  type: "image_mask" | "vector_mask" | "gradient_mask";
  sourceValue: string; // URL ภาพ mask, SVG path data, หรือ ID ของ Media/OfficialMedia
  isOfficialMediaMask?: boolean;
  invert?: boolean;
  channel?: "luminance" | "alpha";
  gradientType?: "linear" | "radial";
  gradientColors?: Array<{ color: string; position: number }>;
  gradientAngle?: number;
  // คอมเมนต์: ใช้สำหรับซ่อนหรือแสดงบางส่วนขององค์ประกอบอย่างละเอียด
}

// การตั้งค่า Keyframe สำหรับ Animation
export interface IAnimationKeyframe {
  time: number; // เวลา (0-1 สำหรับ % ของ duration, หรือ ms)
  transform?: Partial<ITransformConfig>;
  opacity?: number;
  filters?: Partial<IFilterConfig>;
  // สามารถเพิ่ม property อื่นๆ ที่ต้องการ animate ได้ เช่น volume, playbackRate สำหรับ audio/video
  customProperties?: Record<string, string | number>; // สำหรับ animate CSS custom properties หรืออื่นๆ
  // คอมเมนต์: กำหนดสถานะของ property ต่างๆ ณ จุดเวลาที่กำหนด
}

// การตั้งค่า Animation ทั่วไป
export interface IAnimationConfig {
  id: string; // ID ของ animation สำหรับอ้างอิงใน editor หรือ timeline
  name?: string; // ชื่อ animation
  type: "predefined" | "keyframes";
  predefinedName?: string; // ชื่อ animation ที่มีในระบบ (เช่น "fadeIn", "bounce")
  keyframes?: IAnimationKeyframe[];
  duration: number; // ระยะเวลา (ms)
  delay?: number; // หน่วงเวลาก่อนเริ่ม (ms)
  easing?: string; // ฟังก์ชัน Easing (เช่น "linear", "ease-in-out", "cubic-bezier(0.1,0.7,1.0,0.1)")
  iterations?: number | "infinite"; // จำนวนครั้งที่เล่น
  direction?: "normal" | "reverse" | "alternate" | "alternate-reverse";
  fillMode?: "none" | "forwards" | "backwards" | "both";
  // คอมเมนต์: ควบคุมการเคลื่อนไหวและเอฟเฟกต์ขององค์ประกอบต่างๆ
}

// การตั้งค่าพื้นหลัง (Background Configuration)
export interface ISceneBackground {
  type: "color" | "image" | "video" | "gradient";
  value: string; // รหัสสี, URL, ID ของ Media/OfficialMedia, หรือนิยาม gradient
  isOfficialMedia?: boolean;
  gradientDetails?: { // สำหรับ type: "gradient"
    gradientType: "linear" | "radial";
    colors: Array<{ color: string; position: number }>; // [{ color: "#FF0000", position: 0 }, { color: "#0000FF", position: 1 }]
    angle?: number; // สำหรับ linear gradient (deg)
    shape?: "ellipse" | "circle"; // สำหรับ radial gradient
    extentKeyword?: "closest-side" | "closest-corner" | "farthest-side" | "farthest-corner"; // สำหรับ radial
  };
  imageSettings?: { transform?: ITransformConfig; filters?: IFilterConfig; parallax?: { xFactor: number; yFactor: number }; overlayColor?: string; animation?: IAnimationConfig; masking?: IMaskingConfig };
  videoSettings?: { autoplay?: boolean; loop?: boolean; volume?: number; startTime?: number; filters?: IFilterConfig; transform?: ITransformConfig; playbackRate?: number; masking?: IMaskingConfig };
  // คอมเมนต์: กำหนดภาพรวมบรรยากาศของฉาก
}

// การแสดงผลตัวละคร (Character Display Configuration)
export interface ICharacterDisplay {
  id: string; // ID ของ instance ตัวละครในฉากนี้ (สำหรับ editor)
  characterId: Types.ObjectId; // อ้างอิง Character model
  assetKey?: string; // Key ของชุด asset (เช่น "school_uniform")
  expressionKey: string; // Key ของการแสดงสีหน้า (เช่น "happy")
  positionPreset?: string; // ตำแหน่งที่ตั้งไว้ล่วงหน้า (เช่น "left", "center")
  transform: ITransformConfig;
  opacity?: number;
  filters?: IFilterConfig;
  blendMode?: BlendMode;
  masking?: IMaskingConfig;
  zIndex?: number; // (จะถูกจัดการโดย Layer System เป็นหลัก)
  enterAnimationId?: string; // ID ของ AnimationConfig ที่ใช้ตอนปรากฏตัว
  exitAnimationId?: string; // ID ของ AnimationConfig ที่ใช้ตอนหายไป
  idleAnimationId?: string; // ID ของ AnimationConfig ที่ใช้ขณะยืนเฉยๆ
  isSpeaking?: boolean; // ตัวละครนี้กำลังพูดหรือไม่ (สำหรับเน้น)
  speakingEffect?: { // เอฟเฟกต์ขณะพูด
    type: "mouth_flap" | "bounce" | "glow" | "custom_animation";
    animationId?: string; // ID ของ AnimationConfig (ถ้า type = "custom_animation")
    intensity?: number; // ความแรงของเอฟเฟกต์ (0-1)
  };
  // คอมเมนต์: ควบคุมการแสดงผลของตัวละครแต่ละตัวในฉาก
}

// องค์ประกอบรูปภาพ (Image Element Configuration)
export interface IImageElement {
  id: string; // ID ของ instance รูปภาพในฉากนี้
  sourceValue: string; // URL รูปภาพ หรือ ID ของ Media/OfficialMedia
  isOfficialMedia?: boolean;
  transform: ITransformConfig;
  opacity?: number;
  filters?: IFilterConfig;
  blendMode?: BlendMode;
  masking?: IMaskingConfig;
  zIndex?: number;
  animations?: string[]; // IDs ของ AnimationConfig ที่จะเล่น
  clickable?: { actionType: "trigger_choice" | "go_to_scene" | "run_script" | "show_tooltip" | "play_animation" | "toggle_layer_visibility" | "increment_variable"; actionValue: string; condition?: string; };
  tooltip?: string; // ข้อความเมื่อ hover
  altText?: string; // ข้อความอธิบายรูปภาพ (i18n, accessibility)
  // คอมเมนต์: ใช้สำหรับแสดงภาพประกอบ, CG, ไอเทม, หรือเอฟเฟกต์ภาพต่างๆ
}

// องค์ประกอบวิดีโอ (Video Element Configuration)
export interface IVideoElement {
  id: string; // ID ของ instance วิดีโอในฉากนี้
  sourceValue: string; // URL วิดีโอ หรือ ID ของ Media/OfficialMedia
  isOfficialMedia?: boolean;
  transform: ITransformConfig;
  opacity?: number;
  filters?: IFilterConfig;
  blendMode?: BlendMode;
  masking?: IMaskingConfig;
  zIndex?: number;
  autoplay?: boolean;
  loop?: boolean;
  showControls?: boolean;
  volume?: number;
  startTime?: number;
  playbackRate?: number;
  animations?: string[]; // IDs ของ AnimationConfig
  onEnded?: { actionType: "go_to_scene" | "run_script" | "show_choices" | "play_next_video_in_sequence"; actionValue?: string };
  // คอมเมนต์: ใช้สำหรับเล่นวิดีโอสั้นๆ, คัทซีน, หรือเอฟเฟกต์วิดีโอ
}

// การตั้งค่าพื้นที่แสดงข้อความ (Text Area/Dialogue Box Configuration)
export interface ITextAreaConfig {
  id: string; // ID ของ instance พื้นที่ข้อความ
  stylePreset?: string; // รูปแบบที่ตั้งไว้ล่วงหน้า
  fontFamily?: string;
  fontSize?: string;
  fontColor?: string;
  fontWeight?: string;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  padding?: { top: string; right: string; bottom: string; left: string };
  margin?: { top: string; right: string; bottom: string; left: string };
  backgroundColor?: string;
  backgroundImage?: string; // URL หรือ Media ID
  backgroundSlice?: { top: number; right: number; bottom: number; left: number; fillCenter?: boolean };
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  boxShadow?: string;
  textShadow?: string;
  transform: ITransformConfig;
  opacity?: number;
  zIndex?: number;
  animations?: string[]; // IDs ของ AnimationConfig
  // คอมเมนต์: กำหนดสไตล์และการจัดวางของกล่องข้อความ
}

// เนื้อหาข้อความ (Text Content Configuration)
export interface ITextContent {
  id: string; // ID ของ instance เนื้อหาข้อความ
  textAreaId: string; // ID ของ ITextAreaConfig ที่จะแสดงข้อความนี้
  characterId?: Types.ObjectId; // ID ตัวละครที่พูด (ถ้ามี, อ้างอิง Character model)
  speakerDisplayName?: string; // ชื่อผู้พูดที่แสดง (อาจ override จาก Character model, รองรับ i18n)
  text: string; // เนื้อหาข้อความ (รองรับ Markdown หรือ BBCode, และ i18n)
  voiceOverId?: Types.ObjectId; // ID ของไฟล์เสียงพากย์ (อ้างอิง Media/OfficialMedia)
  typewriterEffect?: { // เอฟเฟกต์พิมพ์ดีด
    speedCharsPerSecond: number; // ความเร็ว (ตัวอักษรต่อวินาที)
    soundEffectId?: Types.ObjectId; // ID เสียงประกอบการพิมพ์ (อ้างอิง Media/OfficialMedia)
    skipEnabled?: boolean; // อนุญาตให้ผู้เล่นกดข้ามได้หรือไม่
  };
  autoAdvance?: { // ไปต่ออัตโนมัติ
    delaySeconds: number; // หน่วงเวลาก่อนไปต่อ (วินาที)
    condition?: string; // เงื่อนไข (เช่น "!player.has_unread_notifications")
  };
  displayCondition?: string; // เงื่อนไขที่ข้อความนี้จะปรากฏ
  // คอมเมนต์: จัดการเนื้อหาบทสนทนา, คำบรรยาย, และการพากย์เสียง
}

// การตั้งค่าเสียง (Audio Configuration - BGM, SFX)
export interface IAudioElement {
  id: string; // ID ของ instance เสียง
  sourceValue: string; // URL เสียง หรือ ID ของ Media/OfficialMedia
  isOfficialMedia?: boolean;
  type: "bgm" | "sfx" | "ambience"; // ประเภทเสียง
  autoplay?: boolean;
  loop?: boolean;
  volume?: number; // 0-1
  fadeInDuration?: number; // ms
  fadeOutDuration?: number; // ms
  playbackRate?: number;
  startTime?: number; // วินาที
  spatialConfig?: { // สำหรับเสียง 3D (ถ้ามี)
    x: number; y: number; z: number;
    pan?: number; // -1 (ซ้าย) ถึง 1 (ขวา)
    maxDistance?: number;
    rolloffFactor?: number;
  };
  playCondition?: string; // เงื่อนไขในการเล่นเสียงนี้
  // คอมเมนต์: จัดการเพลงประกอบ, เสียงเอฟเฟกต์, และเสียงบรรยากาศ
}

// การตั้งค่าตัวเลือก (Choice Configuration)
// (อาจจะอ้างอิง IChoice จาก Choice.ts หรือ StoryMap.ts โดยตรง หรือมีโครงสร้างย่อยที่นี่)
export interface ISceneChoice {
  id: string; // ID ของชุดตัวเลือกนี้ในฉาก
  // choiceGroupId?: Types.ObjectId; // อ้างอิง ChoiceGroup model (ถ้ามี)
  choices: Array<{
    text: string; // ข้อความตัวเลือก (รองรับ i18n)
    targetSceneId?: Types.ObjectId; // ID ฉากต่อไปถ้าเลือก (อ้างอิง Scene model)
    targetStoryMapNodeId?: string; // หรือ ID ของ Node ใน StoryMap
    actionScript?: string; // Script ที่จะรันเมื่อเลือก
    condition?: string; // เงื่อนไขที่ตัวเลือกนี้จะปรากฏ
    tooltip?: string; // (รองรับ i18n)
    stylePreset?: string; // สไตล์ปุ่มตัวเลือก
    // ... other properties from IChoice
  }>;
  layout?: "vertical" | "horizontal" | "grid";
  position?: ITransformConfig; // ตำแหน่งของกลุ่มตัวเลือก
  displayCondition?: string; // เงื่อนไขที่ชุดตัวเลือกนี้จะปรากฏ
  timeoutSeconds?: number; // เวลาจำกัดในการเลือก (วินาที)
  timeoutAction?: { targetSceneId?: Types.ObjectId; targetStoryMapNodeId?: string; actionScript?: string }; // Action เมื่อหมดเวลา
  // คอมเมนต์: จัดการการนำเสนอตัวเลือกให้ผู้เล่น
}

// องค์ประกอบ UI ทั่วไป (UI Element Configuration - Buttons, Sliders, Input Fields for minigames)
export interface IUIElement {
  id: string;
  elementType: "button" | "slider" | "input_text" | "checkbox" | "image_button" | "progress_bar";
  transform: ITransformConfig;
  stylePreset?: string; // เช่น "primary_button", "settings_slider"
  // Properties เฉพาะตาม elementType
  buttonText?: string; // (สำหรับ button, รองรับ i18n)
  buttonIconUrl?: string; // (สำหรับ button, image_button)
  sliderRange?: { min: number; max: number; step: number; initialValue?: number };
  inputPlaceholder?: string; // (สำหรับ input_text, รองรับ i18n)
  checkboxIsChecked?: boolean;
  progressBarValue?: number; // 0-100
  progressBarMaxValue?: number; // default 100
  onClickAction?: { actionType: string; actionValue: string; condition?: string };
  onChangeAction?: { actionType: string; actionValueVariable: string }; // (สำหรับ slider, input, checkbox - เก็บค่าในตัวแปร)
  displayCondition?: string;
  animations?: string[];
  zIndex?: number;
  // คอมเมนต์: สำหรับสร้างองค์ประกอบ UI ที่โต้ตอบได้ในฉาก (เช่น ในมินิเกม, หรือ UI พิเศษ)
}

// การตั้งค่า Layer (Layer Configuration)
export interface ISceneLayer {
  id: string; // ID ของ Layer (เช่น "background_layer", "characters_layer", "ui_layer")
  name: string; // ชื่อ Layer สำหรับ Editor
  zIndex: number; // ลำดับการซ้อน (ค่ามากอยู่บน)
  isVisible?: boolean; // แสดง/ซ่อน Layer (default true)
  opacity?: number; // ความโปร่งใสของทั้ง Layer (0-1, default 1)
  blendMode?: BlendMode; // Blend mode ของทั้ง Layer
  masking?: IMaskingConfig; // Mask ของทั้ง Layer
  transform?: ITransformConfig; // Transform ของทั้ง Layer (เช่น parallax scrolling สำหรับ layer)
  // Element IDs ที่อยู่ใน Layer นี้ (ไม่จำเป็นถ้า element มี zIndex ของตัวเองและจัดการใน client)
  // elementIds?: string[]; 
  // คอมเมนต์: จัดการลำดับการซ้อนและความโปร่งใสของกลุ่มองค์ประกอบ
}

// การตั้งค่า Timeline และ Event (Timeline Configuration)
export interface ITimelineEvent {
  id: string; // ID ของ Event
  startTime: number; // เวลาเริ่ม (ms, นับจากเริ่มฉาก หรือเริ่ม timeline track นี้)
  duration?: number; // ระยะเวลา (ms, ถ้ามี)
  targetElementId: string; // ID ขององค์ประกอบในฉาก (Image, Character, Text, Audio, Video, Layer, etc.)
  action: "play_animation" | "set_property" | "trigger_script" | "show_element" | "hide_element" | "play_audio" | "pause_audio" | "stop_audio" | "change_text";
  animationId?: string; // (ถ้า action = "play_animation") ID ของ AnimationConfig
  propertyChanges?: { [key: string]: any }; // (ถ้า action = "set_property") เช่น { "opacity": 0.5, "transform.x": 100 }
  scriptName?: string; // (ถ้า action = "trigger_script")
  scriptParams?: any[];
  newTextContentId?: string; // (ถ้า action = "change_text") ID ของ ITextContent ใหม่
  // คอมเมนต์: กำหนดเหตุการณ์ต่างๆ ที่จะเกิดขึ้นตามเวลาในฉาก
}

export interface ITimelineTrack {
  id: string; // ID ของ Track
  name?: string; // ชื่อ Track (เช่น "Character Animations", "SFX Track")
  targetType?: "character" | "image" | "audio" | "ui" | "general"; // ประเภทของ element ที่ track นี้มักจะควบคุม
  events: ITimelineEvent[];
  // คอมเมนต์: จัดกลุ่ม Events ใน Timeline เพื่อความเป็นระเบียบ
}

// ----- Interface หลักสำหรับเอกสารฉาก (Scene Document) -----
export interface IScene extends Document {
  _id: Types.ObjectId;
  novelId: Types.ObjectId; // อ้างอิง Novel model
  episodeId?: Types.ObjectId; // อ้างอิง Episode model (ถ้าฉากนี้เป็นส่วนหนึ่งของตอน)
  sceneName: string; // ชื่อฉาก (สำหรับ editor และอ้างอิงภายใน)
  sceneTitle?: string; // ชื่อฉากที่แสดงให้ผู้เล่นเห็น (รองรับ i18n)
  sceneType?: SceneType; // ประเภทของฉาก
  
  // องค์ประกอบหลักของฉาก
  background?: ISceneBackground;
  characters?: ICharacterDisplay[];
  images?: IImageElement[];
  videos?: IVideoElement[];
  textAreas?: ITextAreaConfig[];
  textContents?: ITextContent[]; // เนื้อหาข้อความที่จะแสดงใน textAreas (อาจมีหลายชุดต่อฉาก)
  audios?: IAudioElement[];
  choices?: ISceneChoice[]; // ชุดตัวเลือกในฉาก
  uiElements?: IUIElement[]; // องค์ประกอบ UI เพิ่มเติม
  
  // ระบบ Layer และ Timeline
  layers?: ISceneLayer[]; // การจัดการ Layer (เรียงตาม zIndex)
  timelineTracks?: ITimelineTrack[]; // Timeline สำหรับควบคุม events และ animations
  globalAnimations?: IAnimationConfig[]; // Animations ที่สามารถใช้ร่วมกันได้ในหลาย elements

  // การตั้งค่าเริ่มต้นของฉาก
  defaultCamera?: { // การตั้งค่ากล้องเริ่มต้น (ถ้ามีระบบกล้อง)
    position?: { x: number; y: number; z?: number };
    zoom?: number;
    rotation?: number;
  };
  entryTransition?: { // Transition ตอนเข้าฉาก
    type: "fade" | "slide" | "iris" | "custom_animation";
    duration: number; // ms
    color?: string; // (สำหรับ fade)
    direction?: "left" | "right" | "top" | "bottom"; // (สำหรับ slide)
    animationId?: string; // (สำหรับ custom_animation)
  };
  exitTransition?: { // Transition ตอนออกจากฉาก (ถ้าไม่ถูก override โดย choice/event)
    type: "fade" | "slide" | "iris" | "custom_animation";
    duration: number; // ms
    color?: string;
    direction?: "left" | "right" | "top" | "bottom";
    animationId?: string;
  };
  
  // การเชื่อมโยงกับ StoryMap (ถ้าใช้)
  storyMapNodeId?: string; // ID ของ Node ใน StoryMap ที่ฉากนี้แสดงผล
  
  // การตั้งค่าการเล่น
  skippable?: boolean; // ผู้เล่นสามารถข้ามฉากนี้ได้หรือไม่ (default true)
  autoPlayNextScene?: boolean; // เล่นฉากต่อไปอัตโนมัติหรือไม่ (ถ้าไม่มี choice หรือ event หยุด)
  nextSceneId?: Types.ObjectId; // ID ฉากต่อไป (ถ้า autoPlayNextScene = true และไม่มีการแตกแขนง)
  
  // Metadata สำหรับ Editor
  editorNotes?: string; // โน้ตสำหรับผู้เขียน
  thumbnailUrl?: string; // URL ภาพตัวอย่างฉาก (สำหรับ editor)
  tags?: string[]; // แท็กสำหรับจัดหมวดหมู่ฉากใน editor
  version: number; // เวอร์ชันของข้อมูลฉาก
  
  // Internationalization (i18n) - สำหรับข้อความที่ไม่ได้อยู่ใน sub-objects ที่มี i18n ของตัวเอง
  // เช่น sceneTitle อาจเก็บเป็น object { en: "Title", th: "ชื่อเรื่อง" } หรือใช้ระบบ i18n แยก
  // แต่ส่วนใหญ่ text จะอยู่ใน ITextContent, IImageElement.altText, ISceneChoice.choices.text ซึ่งควรจัดการ i18n ที่นั่น

  // Accessibility
  audioDescriptionTrackId?: Types.ObjectId; // ID ของ Media/OfficialMedia สำหรับเสียงบรรยายภาพ
  enableScreenReaderCompatibility?: boolean; // ตั้งค่าให้ UI elements ในฉากนี้เป็นมิตรกับ screen reader

  // Game Logic Integration
  onSceneStartScript?: string; // Script ที่จะรันเมื่อเริ่มฉาก
  onSceneEndScript?: string; // Script ที่จะรันเมื่อจบฉาก
  requiredFlags?: string[]; // Flags ที่ต้องเป็น true ฉากนี้ถึงจะเล่นได้ (จาก StoryMap.gameMechanicsConfig.globalFlags)
  variablesToSetOnStart?: Record<string, any>; // ตัวแปรที่จะตั้งค่าเมื่อเริ่มฉาก

  // Soft delete
  isDeleted?: boolean;
  deletedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ----- Schema หลักสำหรับ Scene -----
const SceneSchema = new Schema<IScene>(
  {
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", required: true, index: true },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode", index: true },
    sceneName: { type: String, required: true, trim: true },
    sceneTitle: { type: String, trim: true }, // ควรจัดการ i18n
    sceneType: { type: String, enum: ["standard", "dialogue_only", "cg_display", "video_cutscene", "interactive_map", "minigame", "ending_scene", "title_screen", "credits_scene"], default: "standard" },
    
    background: { type: Object }, // ISceneBackground
    characters: { type: [Object], default: [] }, // ICharacterDisplay[]
    images: { type: [Object], default: [] }, // IImageElement[]
    videos: { type: [Object], default: [] }, // IVideoElement[]
    textAreas: { type: [Object], default: [] }, // ITextAreaConfig[]
    textContents: { type: [Object], default: [] }, // ITextContent[]
    audios: { type: [Object], default: [] }, // IAudioElement[]
    choices: { type: [Object], default: [] }, // ISceneChoice[]
    uiElements: { type: [Object], default: [] }, // IUIElement[]

    layers: { type: [Object], default: [] }, // ISceneLayer[]
    timelineTracks: { type: [Object], default: [] }, // ITimelineTrack[]
    globalAnimations: { type: [Object], default: [] }, // IAnimationConfig[]

    defaultCamera: { type: Object },
    entryTransition: { type: Object },
    exitTransition: { type: Object },

    storyMapNodeId: { type: String, trim: true, index: true },

    skippable: { type: Boolean, default: true },
    autoPlayNextScene: { type: Boolean, default: false },
    nextSceneId: { type: Schema.Types.ObjectId, ref: "Scene" },

    editorNotes: { type: String, trim: true },
    thumbnailUrl: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    version: { type: Number, default: 1, min: 1 },

    audioDescriptionTrackId: { type: Schema.Types.ObjectId, refPath: "audioDescriptionTrackModel" },
    audioDescriptionTrackModel: { type: String, enum: ["Media", "OfficialMedia"] },
    enableScreenReaderCompatibility: { type: Boolean, default: false },

    onSceneStartScript: { type: String, trim: true },
    onSceneEndScript: { type: String, trim: true },
    requiredFlags: [{ type: String, trim: true }],
    variablesToSetOnStart: { type: Schema.Types.Mixed },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
    // เนื่องจาก sub-objects มี ID ของตัวเอง (string) และไม่ได้เป็น Mongoose subdocuments เต็มรูปแบบ
    // การ query และ update จะทำผ่าน dot notation บน array of plain objects
  }
);

// ----- Indexes -----
SceneSchema.index({ novelId: 1, episodeId: 1 });
SceneSchema.index({ sceneName: 1 });
SceneSchema.index({ tags: 1 });

// ----- Middleware -----
SceneSchema.pre("save", async function (next) {
  if (this.isModified() && !this.isNew) {
    this.version = (this.version || 0) + 1;
  }
  // TODO: อาจจะต้องมีการ validate IDs ภายใน scene elements (เช่น animationId, textAreaId) ว่ามีอยู่จริงใน scene นี้
  next();
});

// ----- Model Export -----
const SceneModel = (models.Scene as mongoose.Model<IScene>) || model<IScene>("Scene", SceneSchema);

export default SceneModel;

// หมายเหตุการเปลี่ยนแปลงสำคัญ:
// 1.  ใช้ Plain Objects สำหรับ arrays ของ elements (characters, images, etc.) เพื่อความยืดหยุ่นในการใช้ custom string IDs.
// 2.  เพิ่ม ISceneLayer และ ITimelineTrack, ITimelineEvent สำหรับการจัดการที่ซับซ้อนเหมือนโปรแกรมตัดต่อ.
// 3.  เพิ่ม globalAnimations สำหรับ animations ที่ใช้ซ้ำได้.
// 4.  ขยาย ICharacterDisplay, IImageElement, IVideoElement, IAudioElement, ITextAreaConfig, ITextContent ให้ละเอียดขึ้นมาก.
// 5.  เพิ่ม IUIElement สำหรับองค์ประกอบ UI ทั่วไป.
// 6.  เพิ่ม SceneType, Transitions, Camera settings.
// 7.  รวม i18n และ accessibility considerations.
// 8.  เพิ่ม Game Logic Integration fields (scripts, flags, variables).
// 9.  คอมเมนต์ภาษาไทยถูกเพิ่มและปรับปรุงให้ละเอียดขึ้น.
