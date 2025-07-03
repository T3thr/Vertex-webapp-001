// types/game.ts

// Basic Types
export type Position = {
    x: number;
    y: number;
  };
  
  export type Size = {
    width: number;
    height: number;
  };
  
  export type Color = string;
  
  // Asset Types
  export type AssetType = 'background' | 'character';
  
  export type AssetFilters = {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    sepia?: number;
    grayscale?: number;
  };
  
  export type AssetTransition = {
    enter: 'none' | 'fade' | 'slide' | 'zoom';
    exit: 'none' | 'fade' | 'slide' | 'zoom';
    duration: number;
    delay?: number;
    easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  };
  
  export type AssetProps = {
    posX: number;
    posY: number;
    scale: number;
    rotation: number;
    opacity: number;
    visible: boolean;
    flip: boolean;
    filters: AssetFilters;
    transitions: AssetTransition;
  };
  
  // Text and Dialogue Types
  export type TextAlignment = 'left' | 'center' | 'right';
  
  export type TextStyle = {
    size: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    alignment: TextAlignment;
    color: Color;
    shadow: boolean;
    bold: boolean;
    italic: boolean;
    typewriterSpeed: number;
  };
  
  // Audio Types
  export type AudioAsset = {
    bgm: string | null;
    sfx: string | null;
    volume: number;
    fadeIn: number;
    fadeOut: number;
  };
  
  export type Choice = {
    text: string;
    nextSceneId: string;
  };
  
  // Scene Types
  export type Scene = {
    id: string; 
    name: string;
    background?: string; 
    character?: string; 
    dialogue?: string; 
    characterName?: string;
    backgroundProps?: {
      visible: boolean;
      transform: {
        x: number;
        y: number;
        scale: number;
        rotation: number;
      };
    };
    characterProps?: {
      visible: boolean;
      transform: {
        x: number;
        y: number;
        scale: number;
        rotation: number;
      };
    };
    textProps?: TextStyle;
    audio?: AudioAsset;
    choices?: Choice[];
  };
  
  // Project Types
  export type Project = {
    id: string;
    title: string;
    author: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    currentScene: number;
    scenes: Scene[];
    viewCount: number;
    imageUrl: string;
  };
  
  // State Management Types
  export type ProjectStore = {
    currentScene: number;
    scenes: Scene[];
    setCurrentScene: (sceneId: number) => void;
    updateScene: (sceneId: number, updates: Partial<Scene>) => void;
    addScene: () => void;
    duplicateScene: (sceneId: number) => void;
    deleteScene: (sceneId: number) => void;
    updateAsset: (sceneId: number, assetType: AssetType, assetData: string | null) => void;
    updateAssetProps: (sceneId: number, assetType: AssetType, props: Partial<AssetProps>) => void;
  };
  
  export interface EndingSummary {
    title: string;
    text: string;
    image?: string; // Optional image for the summary
  }
  
  export interface GameScene {
    id: string;
    name: string;
    dialogue: string;
    nextScene?:string;
    choices?: Array<{
      text: string;
      nextSceneId: string;
    }>;
    ending?: EndingSummary;
    background?: string;
    characters?: Array<{
      src: string; // Image source for the character
      name?: string; // Character name
      props: {
        visible: boolean;
        transform: {
          x: number;
          y: number;
          scale: number;
          rotation: number;
        };
      };
    }>;
    characterName?: string;
    backgroundProps?: {
      visible: boolean;
      transform: {
        x: number;
        y: number;
        scale: number;
        rotation: number;
      };
    };
    characterProps?: {
      visible: boolean;
      transform: {
        x: number;
        y: number;
        scale: number;
        rotation: number;
      };
    };
    textProps?: {
      size: string;
      alignment?: 'left' | 'center' | 'right';
      color?: string;
      shadow?: boolean;
      bold?: boolean;
      italic?: boolean;
      typewriterSpeed?: number;
    };
      audio?: AudioAsset;
  }
  
  export interface GameEpisode {
    id: string;
    title: string;
    description: string;
    sceneIds: string[];
  }
  
  export interface GameStory {
    episodes: GameEpisode[];
    scenes: GameScene[];
  }
  
  export type CanvasStore = {
    zoom: number;
    isPlaying: boolean;
    isPreviewMode: boolean;
    showGrid: boolean;
    selectedAsset: AssetType | null;
    setZoom: (zoom: number) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setIsPreviewMode: (isPreviewMode: boolean) => void;
    setShowGrid: (showGrid: boolean) => void;
    setSelectedAsset: (asset: AssetType | null) => void;
  };
  
  // UI State Types
  export type UIState = {
    showLeftPanel: boolean;
    showRightPanel: boolean;
    uploadProgress: number;
    showUploadDialog: boolean;
    showExportDialog: boolean;
    isDraggingAsset: boolean;
  };
  
  // Editor State Types
  export type DialogueState = {
    text: string;
    characterName: string;
    typewriterSpeed: number;
    alignment: TextAlignment;
    styles: {
      bold: boolean;
      italic: boolean;
      underline: boolean;
      fontSize: number;
      color: Color;
    };
  };
  
  export type TransformState = {
    position: Position;
    scale: number;
    rotation: number;
    opacity: number;
    visible: boolean;
    flip: boolean;
  };
  
  export type EffectsState = {
    filters: AssetFilters;
    animation: {
      entrance: AssetTransition['enter'];
      duration: number;
      delay: number;
      easing: AssetTransition['easing'];
    };
  };
  
  // History Management Types
  export type HistoryState<T> = {
    past: T[];
    present: T;
    future: T[];
  };
  
  export type HistoryActions<T> = {
    push: (state: T) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  };
  
  // Export/Import Types
  export type ProjectExport = {
    version: string;
    project: Project;
    metadata: {
      createdAt: string;
      lastModified: string;
      exportedAt: string;
    };
  };