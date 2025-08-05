# Story Canvas - Visual Novel Authoring Tool

## 🎨 Overview

**Story Canvas** is a comprehensive visual novel authoring tool built with Next.js 14, TypeScript, and MongoDB. It provides a dual-mode editing experience that combines story planning with scene creation in an intuitive, professional-grade interface.

## 🏗️ Architecture

The Story Canvas consists of two main editing environments:

### 1. **Blueprint Room** - Story Structure Editor
- **Interactive Node-Graph Editor** using React Flow
- **Drag & Drop Interface** for story elements
- **Real-time Story Map Visualization**
- **Node Types:**
  - 🏁 Start Node - Story beginning
  - 🎬 Scene Node - Individual scenes with WYSIWYG preview
  - 🔀 Choice Node - Player decision points
  - 💎 Branch Node - Conditional logic
  - 🏆 Ending Node - Story conclusions
  - 💭 Comment Node - Author notes
  - 🧮 Variable Modifier Node - Story state management

### 2. **Director's Stage** - Scene Content Editor
- **WYSIWYG Scene Canvas** with real-time preview
- **4-Panel Layout:**
  - **Asset Panel (Left):** Characters, media library, UI elements
  - **Main Canvas (Center):** Interactive scene preview
  - **Properties Panel (Right):** Element properties and scene settings
  - **Timeline Panel (Bottom):** Animation and event sequencing

## 🔧 Technical Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components:** React with Framer Motion animations
- **Node Editor:** @xyflow/react (React Flow)
- **Backend:** MongoDB with Mongoose ODM
- **Authentication:** NextAuth.js
- **Styling:** Tailwind CSS with custom design system

## 📁 Project Structure

```
src/app/novels/[slug]/overview/
├── components/
│   ├── StoryCanvas.tsx              # Main canvas controller
│   └── canvas/
│       ├── BlueprintRoom.tsx        # Story map editor
│       ├── DirectorsStage.tsx       # Scene editor
│       ├── ModeToggle.tsx           # Mode switching UI
│       ├── CanvasToolbar.tsx        # Canvas controls
│       ├── blueprint/               # Blueprint Room components
│       │   ├── NodePalette.tsx      # Draggable node library
│       │   └── InspectorPanel.tsx   # Node property editor
│       ├── nodes/                   # Custom node types
│       │   ├── StartNode.tsx
│       │   ├── SceneNode.tsx
│       │   ├── ChoiceNode.tsx
│       │   ├── BranchNode.tsx
│       │   ├── EndingNode.tsx
│       │   ├── CommentNode.tsx
│       │   └── VariableModifierNode.tsx
│       └── directors/               # Director's Stage components
│           ├── SceneCanvas.tsx      # WYSIWYG scene editor
│           ├── AssetPanel.tsx       # Asset management
│           ├── PropertiesPanel.tsx  # Element properties
│           ├── TimelinePanel.tsx    # Animation timeline
│           └── SceneSelector.tsx    # Scene navigation
└── page.tsx                         # Server component entry point
```

## 🗄️ Database Models

The system leverages existing Mongoose models:

- **Novel.ts** - Novel metadata and settings
- **StoryMap.ts** - Node-graph story structure
- **Scene.ts** - Individual scene content and timeline
- **Episode.ts** - Story chapters/episodes
- **Character.ts** - Character definitions and expressions
- **Choice.ts** - Player decision options
- **Media.ts** - User-uploaded assets
- **OfficialMedia.ts** - System asset library

## 🔄 API Endpoints

```typescript
// Story Map Management
GET    /api/novels/[novelId]/storymap
PUT    /api/novels/[novelId]/storymap
POST   /api/novels/[novelId]/storymap

// Scene Management
GET    /api/novels/[novelId]/scenes
POST   /api/novels/[novelId]/scenes
GET    /api/novels/[novelId]/scenes/[sceneId]
PUT    /api/novels/[novelId]/scenes/[sceneId]
DELETE /api/novels/[novelId]/scenes/[sceneId]
```

## 🎯 Key Features

### Blueprint Room Features
- **Interactive Story Mapping** with drag-and-drop nodes
- **Visual Story Flow** with connecting edges
- **Node Property Editing** with context-sensitive panels
- **Story Variable Management** with type checking
- **Mini-map Navigation** for large story maps
- **Auto-save** with version control

### Director's Stage Features
- **WYSIWYG Scene Editor** with real-time preview
- **Character Positioning** with transform controls
- **Text Content Management** with speaker assignment
- **Media Asset Integration** from user and official libraries
- **Timeline-based Animation** with event sequencing
- **Layer Management** with visibility and locking
- **Camera Controls** with zoom, pan, and focus

### Shared Features
- **Seamless Mode Switching** between Blueprint and Director modes
- **Unified Asset Management** across both editing modes
- **Real-time Collaboration** support (planned)
- **Auto-save** with conflict resolution
- **Responsive Design** with mobile support
- **Dark/Light Theme** support
- **Accessibility** compliance

## 🎨 Design System

The interface uses a consistent design language:

- **Colors:** Tailwind CSS palette with custom semantic colors
- **Typography:** Inter font family with careful hierarchy
- **Spacing:** 4px grid system for consistent layouts
- **Components:** Reusable UI components with variants
- **Animations:** Smooth transitions using Framer Motion
- **Icons:** Lucide React icon library

## 🚀 Getting Started

1. **Prerequisites:**
   ```bash
   Node.js 18+ 
   MongoDB database
   ```

2. **Installation:**
   ```bash
   npm install @xyflow/react framer-motion lucide-react
   ```

3. **Environment Setup:**
   ```env
   MONGODB_URI=your_mongodb_connection_string
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```

## 🎮 Usage Guide

### Creating a New Story Map
1. Navigate to your novel's overview page
2. Click "Create Story Map" if none exists
3. Start with the default Start Node
4. Drag new nodes from the Node Palette
5. Connect nodes by dragging from output handles to input handles

### Editing Scenes
1. Click "Edit Scene" on any Scene Node in Blueprint Room
2. Automatically switches to Director's Stage mode
3. Use Asset Panel to add characters, media, and UI elements
4. Adjust properties in the Properties Panel
5. Create animations using the Timeline Panel

### Scene Elements
- **Characters:** Drag from Character tab, set expressions and positions
- **Text:** Add dialogue and narration with speaker assignment
- **Media:** Images, audio, and video from your media library
- **UI Elements:** Status bars, choice buttons, and custom interfaces

## 🎭 Advanced Features

### Timeline Animation System
- **Multi-track Timeline** for complex scene choreography
- **Event Types:** Character movement, text display, audio playback, camera controls
- **Keyframe Animation** with easing functions
- **Real-time Preview** with playback controls

### Story Variables
- **Type-safe Variables** with validation
- **Global and Local Scope** management
- **Conditional Logic** in Branch Nodes
- **Player Choice Integration** with variable modification

### Asset Management
- **Media Library** with search and filtering
- **Character Expression System** with multiple poses
- **Official Asset Integration** for backgrounds and effects
- **Drag-and-drop** asset placement

## 🔮 Future Enhancements

- **Collaborative Editing** with real-time synchronization
- **Version Control** with branching and merging
- **Export System** for various visual novel engines
- **Plugin Architecture** for custom node types
- **Advanced Animation** with motion paths and physics
- **Voice Acting Integration** with lip-sync support
- **Localization Support** for multiple languages
- **Performance Analytics** for story engagement metrics

## 🤝 Contributing

This is a comprehensive visual novel authoring tool designed to provide professional-grade story creation capabilities while maintaining ease of use for creators of all skill levels.

## 📄 License

This project is part of the DivWy visual novel platform and follows the project's licensing terms.

---

**Built with ❤️ for visual novel creators**