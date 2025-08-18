// Frontend-safe type definitions (no backend model imports)

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
  ADJUST_AUDIO_VOLUME = "adjust_audio_volume",
  FADE_AUDIO_VOLUME = "fade_audio_volume",
  SET_AUDIO_PITCH = "set_audio_pitch",
  SET_AUDIO_PAN = "set_audio_pan",

  // Background Control
  CHANGE_BACKGROUND = "change_background",

  // Visual Element Control
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

  // Camera Control
  CAMERA_ZOOM = "camera_zoom",
  CAMERA_PAN = "camera_pan",
  CAMERA_ROTATE = "camera_rotate",
  CAMERA_SHAKE = "camera_shake",
  CAMERA_FOCUS_ON_TARGET = "camera_focus_on_target",
  CAMERA_RESET = "camera_reset",
  END_NOVEL = "end_novel",
}

export interface TimelineEvent {
  eventId: string;
  startTimeMs: number;
  durationMs?: number;
  eventType: TimelineEventType;
  targetInstanceId?: string;
  parameters: Record<string, any>;
  notes?: string;
  waitForCompletion?: boolean;
}

export interface TimelineTrack {
  trackId: string;
  trackName: string;
  trackType?: string;
  events: TimelineEvent[];
  isMuted?: boolean;
  isLocked?: boolean;
  targetLayerId?: string;
}

/**
 * Represents the client-side, serialized version of a Scene object.
 * Mongoose ObjectIds are converted to strings.
 * Certain fields might be optional if they are not always present.
 */
export interface SerializedScene {
  _id: string;
  novelId: string;
  episodeId: string;
  sceneOrder: number;
  nodeId?: string;
  title?: string;
  background: {
    type: "color" | "image" | "video";
    value: string;
    isOfficialMedia?: boolean;
    blurEffect?: string;
    colorOverlay?: string;
    fitMode?: "cover" | "contain" | "tile" | "stretch";
  };
  version: number;
  characters: any[];
  textContents: any[];
  images: any[];
  videos: any[];
  audios: any[];
  choiceGroupsAvailable: any[];
  choiceIds: string[];
  interactiveHotspots: any[];
  statusUIElements: any[];
  activeSceneEffects: any[];
  timelineTracks?: TimelineTrack[];
  camera?: {
    initialTransform: {
      position: { x: number; y: number };
      zoom: number;
      rotation: number;
    };
    followTarget?: string;
  };
  defaultNextSceneId?: string;
  previousSceneId?: string;
  sceneTransitionOut?: {
    type: string;
    durationSeconds?: number;
    parameters?: any;
  };
  autoAdvanceDelayMs?: number;
  sceneVariables: any[];
  onLoadScriptContent?: string;
  onExitScriptContent?: string;
  editorNotes?: string;
  thumbnailUrl?: string;
  authorDefinedEmotionTags?: string[];
  sceneTags?: string[];
  entryConditions?: any[];
  estimatedComplexity?: "low" | "medium" | "high" | "very_high";
  criticalAssets?: { mediaId: string; mediaSourceType: "Media" | "OfficialMedia" }[];
  createdAt: string;
  updatedAt: string;
  estimatedTimelineDurationMs?: number;
  ending?: {
    endingType: "TRUE" | "GOOD" | "NORMAL" | "BAD" | "SECRET" | "ALTERNATE" | "JOKE";
    title: string;
    description: string;
    imageUrl?: string;
    endingId: string;
  };
}

/**
 * Represents the structure of an ending event, derived from timeline events.
 */
export type EndingInfo = {
  type: 'BAD' | 'NORMAL' | 'GOOD' | 'TRUE' | 'SECRET' | 'SPECIAL';
  title: string;
  description: string;
};
