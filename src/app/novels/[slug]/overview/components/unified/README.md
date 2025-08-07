# Unified Storytelling Environment

## 🏛️ ภาพรวม

Unified Storytelling Environment เป็นเครื่องมือแต่งนิยายแบบครบวงจรที่ผสาน "The Blueprint Room" และ "The Director's Stage" เข้าด้วยกัน ให้ผู้ใช้สามารถสร้าง Visual Novel ได้อย่างลื่นไหลและมีประสิทธิภาพ

## 🎯 เป้าหมาย

- **ยกระดับ Blueprint Room** → **Narrative Command Center** พร้อม Analytics และ Emotional Journey Map
- **ผสาน Director's Stage** → **Living Canvas** พร้อม Interactive Preview และ Timeline Inspector  
- **Mobile-First Design** สำหรับการใช้งานบนมือถือที่เป็นมิตร
- **Real-time Feedback** ทั้งในเชิงภาพและข้อมูล

## 🏗️ สถาปัตยกรรม

### 1. UnifiedStorytellingEnvironment (หลัก)
- **ไฟล์**: `UnifiedStorytellingEnvironment.tsx`
- **หน้าที่**: จัดการ State และ Layout หลักของระบบ
- **คุณสมบัติ**:
  - Responsive Design (Desktop/Mobile)
  - Mode Switching (Blueprint/Director/Unified)
  - Auto-save functionality
  - Keyboard shortcuts

### 2. Narrative Command Center
- **ไฟล์**: `narrative/NarrativeCommandCenter.tsx`
- **หน้าที่**: จัดการ Story Map พร้อม Analytics
- **คุณสมบัติ**:
  - Interactive Story Map
  - Analytics Overlay (Reader insights)
  - Emotional Journey Map
  - Node filtering และ search

#### 2.1 Analytics Components
- **AnalyticsOverlay**: แสดงข้อมูลสถิติผู้อ่าน
- **EmotionalJourneyMap**: แสดงแผนที่อารมณ์ของเรื่อง
- **ReaderInsightsPanel**: แสดงข้อมูลเชิงลึกของผู้อ่าน

### 3. Living Canvas
- **ไฟล์**: `canvas/LivingCanvas.tsx`
- **หน้าที่**: จัดการ Scene Editor และ Preview
- **คุณสมบัติ**:
  - Scene Editor พร้อม Layer Management
  - Interactive Preview Mode
  - Timeline Controller
  - Asset Library

#### 3.1 Canvas Components
- **SceneEditor**: แก้ไข Scene elements
- **InteractivePreviewCanvas**: Preview แบบ Interactive
- **TimelineController**: จัดการ Timeline events
- **LayerManager**: จัดการ Layers
- **AssetLibrary**: คลังสื่อ
- **PropertiesInspector**: แก้ไข Properties

### 4. Mobile Adaptive Interface
- **ไฟล์**: `mobile/MobileAdaptiveInterface.tsx`
- **หน้าที่**: Interface สำหรับมือถือ
- **คุณสมบัติ**:
  - Focus Mode (ทำงานทีละอย่าง)
  - Bottom Sheet สำหรับ Tools
  - Touch-friendly controls
  - Floating Action Button

#### 4.1 Mobile Components
- **MobileBottomSheet**: Panel ด้านล่างสำหรับ Tools
- **MobileStoryMapView**: Story Map แบบ Mobile
- **MobileCanvasEditor**: Canvas Editor แบบ Mobile
- **MobileTimelineView**: Timeline แบบ Mobile

## 🚀 การใช้งาน

### Desktop Mode
```tsx
<UnifiedStorytellingEnvironment
  novel={novelData}
  episodes={episodesData}
  storyMap={storyMapData}
  characters={charactersData}
  scenes={scenesData}
  userMedia={userMediaData}
  officialMedia={officialMediaData}
  initialMode="unified"
  selectedSceneId={undefined}
/>
```

### คีย์บอร์ดชอร์ตคัต
- `Ctrl/Cmd + S`: บันทึก
- `Ctrl/Cmd + 1-3`: สลับ Mode
- `Space`: เล่น/หยุด Preview
- `Esc`: ออกจาก Play Mode
- `Ctrl/Cmd + G`: แสดง/ซ่อน Grid

## 📱 Mobile Features

### Focus Modes
1. **Story Map**: แสดง Nodes แบบ List หรือ Timeline
2. **Canvas**: แก้ไข Scene elements
3. **Timeline**: จัดการ Timeline events
4. **Analytics**: ดูข้อมูลสถิติ

### Gestures
- **Tap**: เลือก Element
- **Long Press**: แสดง Context Menu
- **Pinch**: Zoom In/Out
- **Pan**: เลื่อน Canvas
- **Swipe**: สลับ Tab

## 🎨 Design System

### Colors (ตาม globals.css)
- `bg-background`: พื้นหลังหลัก
- `bg-card`: พื้นหลัง Card
- `text-foreground`: ข้อความหลัก
- `text-muted-foreground`: ข้อความรอง
- `border-border`: เส้นขอบ

### Animations
- **Framer Motion**: สำหรับ Transitions
- **Smooth Transitions**: 0.3s duration
- **Hover Effects**: Scale และ Color changes
- **Loading States**: Skeleton และ Spinners

## 🔧 การพัฒนา

### เพิ่ม Component ใหม่
1. สร้างไฟล์ใน folder ที่เหมาะสม
2. ใช้ TypeScript interfaces
3. ทำตาม Design System
4. เพิ่ม Props validation
5. เขียน JSDoc comments

### การทดสอบ
```bash
# ตรวจสอบ Type errors
npm run type-check

# ตรวจสอบ Linting
npm run lint

# รันในโหมด Development
npm run dev
```

## 📊 Analytics Integration

### ข้อมูลที่ติดตาม
- **Reader Behavior**: Drop-off points, Choice selections
- **Engagement Metrics**: Reading time, Completion rates
- **Emotional Impact**: Impact scores, Emotion tags
- **Performance**: Load times, Error rates

### Mock Data Structure
```typescript
interface AnalyticsData {
  totalReaders: number;
  completionRate: number;
  dropOffPoints: DropOffPoint[];
  choiceDistribution: ChoiceSelection[];
  endingReachRates: EndingRate[];
  emotionalImpactScores: EmotionalImpact[];
}
```

## 🔮 Future Enhancements

### Phase 2
- [ ] Real-time Collaboration
- [ ] Advanced Analytics Dashboard
- [ ] AI-powered Story Suggestions
- [ ] Voice Control สำหรับ Mobile

### Phase 3
- [ ] VR/AR Preview Mode
- [ ] Advanced Animation System
- [ ] Multi-language Support
- [ ] Plugin System

## 🤝 Contributing

1. ปฏิบัติตาม Code Style ที่กำหนด
2. เขียน TypeScript อย่างเข้มงวด
3. ใช้ Tailwind CSS classes
4. ทดสอบบน Desktop และ Mobile
5. เขียน Documentation ที่ชัดเจน

## 📝 License

ระบบนี้เป็นส่วนหนึ่งของ DivWy Novel Editor Platform
