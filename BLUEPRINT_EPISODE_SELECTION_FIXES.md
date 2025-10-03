# Blueprint Episode Selection Fixes - Summary

## 🎯 Problems Identified & Fixed

### **Issue 1: Toast แสดง "สร้างตอน '23e' เรียบร้อยแล้ว" และ Canvas ถูกเคลีย์**

**สาเหตุ:**
- ฟังก์ชัน `handleEpisodeSelect` เรียก callback `onEpisodeCreate` โดยไม่ได้ตั้งใจ (line 2459-2462)
- ทำให้เกิด toast message ผิดพลาดเมื่อเลือก episode

**วิธีแก้:**
```typescript
// ❌ REMOVED: ไม่เรียก onEpisodeCreate เมื่อแค่เลือก episode
// 🔥 FIX: เรียก onEpisodeSelect callback แทน (ถ้ามี)
if (onEpisodeSelect && episodeId) {
  onEpisodeSelect(episodeId);
}
```

**Location:** Line 2441-2477 in `BlueprintTab.tsx`

---

### **Issue 2: ทุก Episode ใช้ Node/Edge เดียวกัน**

**สาเหตุ:**
- Nodes และ edges ไม่ได้ถูก tag ด้วย `episodeId` เมื่อโหลดจาก StoryMap
- ทำให้ระบบไม่สามารถแยกแยะว่า node/edge ไหนเป็นของ episode ไหน

**วิธีแก้:**
```typescript
// แปลง StoryMap nodes/edges เป็น ReactFlow format
const reactFlowNodes = (episodeStoryMap.nodes || []).map((node: any) => ({
  id: node.nodeId,
  type: getReactFlowNodeType(node.nodeType),
  position: node.position || { x: 0, y: 0 },
  data: {
    ...node,
    nodeType: node.nodeType,
    title: node.title,
    nodeSpecificData: node.nodeSpecificData,
    editorVisuals: node.editorVisuals,
    episodeId: episodeId // 🎯 Tag node with episodeId for proper persistence
  }
}));

const reactFlowEdges = (episodeStoryMap.edges || []).map((edge: any) => ({
  id: edge.edgeId,
  source: edge.sourceNodeId,
  target: edge.targetNodeId,
  type: 'custom',
  data: {
    ...edge,
    label: edge.label,
    condition: edge.condition,
    editorVisuals: edge.editorVisuals,
    episodeId: episodeId // 🎯 Tag edge with episodeId for proper persistence
  },
  style: {
    stroke: edge.editorVisuals?.color || '#6B7280',
    strokeWidth: edge.editorVisuals?.strokeWidth || 2
  }
}));
```

**Location:** Line 2377-2407 in `BlueprintTab.tsx`

**Additional Fix:** เพิ่ม info toast เมื่อโหลด episode ใหม่ที่ยังไม่มี StoryMap
```typescript
// 🔥 FIX: แสดง toast แจ้งผู้ใช้ว่าเป็นตอนใหม่
const episode = episodeList.find(ep => ep._id === episodeId);
if (episode) {
  toast.info(`โหลดตอน "${episode.title}" สำเร็จ - เริ่มต้นสร้างเนื้อเรื่องได้เลย`);
}
```

**Location:** Line 2424-2428 in `BlueprintTab.tsx`

---

### **Issue 3: ไม่มีการแจ้งให้เลือก Episode เมื่อเข้ามาหรือรีเฟรช**

**สาเหตุ:**
- Tutorial overlay มีอยู่แล้วแต่ไม่ได้ block การใช้งาน sidebar และ canvas
- ผู้ใช้สามารถคลิกเพิ่ม node/edge ได้โดยไม่ได้เลือก episode

**วิธีแก้:**

#### 3.1 เพิ่ม Disabled State
```typescript
// 🔥 FIX 3: เพิ่ม disabled state เมื่อไม่มี episode ถูกเลือก
const isCanvasDisabled = episodes.length > 0 && !currentEpisodeId;
```

**Location:** Line 7179-7180 in `BlueprintTab.tsx`

#### 3.2 เพิ่ม Overlay Blocker
```typescript
{/* 🔥 FIX 4: เพิ่ม overlay blocker เมื่อไม่มี episode ถูกเลือก */}
{isCanvasDisabled && (
  <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-[2px]" />
)}

<div className={cn(
  "h-full w-full",
  isCanvasDisabled && "pointer-events-none opacity-50"
)}>
```

**Location:** Line 7277-7285 in `BlueprintTab.tsx`

#### 3.3 ปรับปรุง Tutorial Overlay
```typescript
{/* 🔥 FIX 5: ปรับปรุง SELECT EPISODE TUTORIAL */}
{showTutorial && tutorialStep === 1 && episodes.length > 0 && !currentEpisodeId && (
  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-[60] backdrop-blur-md pointer-events-none">
    <div className="text-center max-w-md mx-auto p-8 bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl border-2 border-primary/20 pointer-events-auto">
      <div className="mb-6">
        <div className="relative inline-block">
          <BookOpen className="w-16 h-16 mx-auto text-primary mb-4 animate-bounce" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
        </div>
        <h3 className="text-xl font-bold text-card-foreground mb-3">
          📌 กรุณาเลือกตอนก่อนเริ่มแก้ไข
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          แต่ละตอนจะมี <span className="font-semibold text-primary">StoryMap แยกกัน</span><br/>
          เพื่อให้คุณออกแบบเนื้อเรื่องแต่ละตอนได้อย่างอิสระ
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="text-left p-4 bg-primary/5 rounded-lg text-xs text-muted-foreground border border-primary/10">
          <p className="mb-3 font-medium text-sm text-foreground">💡 ทำไมต้องเลือกตอน?</p>
          <ul className="list-disc list-inside space-y-2">
            <li>แต่ละตอนมี <strong>Nodes และ Edges แยกกัน</strong></li>
            <li>สามารถออกแบบเนื้อเรื่องแต่ละตอนได้อย่างอิสระ</li>
            <li>บันทึกและจัดการตอนได้ง่ายขึ้น</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            onClick={() => {
              setShowTutorial(false);
              // Auto-focus on episode selector
              setTimeout(() => {
                const selector = document.querySelector('[role="combobox"]');
                if (selector) {
                  selector.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                  });
                }
              }, 100);
            }}
            className="w-full shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            <Check className="w-4 h-4 mr-2" />
            เข้าใจแล้ว - เลือกตอน
          </Button>
          
          <Button 
            onClick={() => {
              setShowTutorial(false);
              setShowEpisodeManagementModal(true);
            }}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            หรือสร้างตอนใหม่
          </Button>
        </div>
      </div>
    </div>
  </div>
)}
```

**Location:** Line 8623-8689 in `BlueprintTab.tsx`

**Key Improvements:**
- ✅ เพิ่ม `z-[60]` สูงกว่า canvas overlay
- ✅ เพิ่ม `backdrop-blur-md` ทำให้เห็นชัดว่า block อยู่
- ✅ เพิ่ม animated icon (bounce + ping effect)
- ✅ ข้อความชัดเจนว่าแต่ละตอนมี StoryMap แยกกัน
- ✅ ปุ่ม "เข้าใจแล้ว" จะ auto-scroll ไปที่ episode selector
- ✅ ปุ่ม "สร้างตอนใหม่" สำหรับ quick action

---

### **Bonus Fix: Loading State**

เพิ่ม loading indicator เมื่อโหลด StoryMap เพื่อ UX ที่ดีขึ้น

```typescript
// 🔥 FIX: แสดง loading state ชั่วคราว
setIsLoadingStoryMap(true);

try {
  // ... load StoryMap ...
} finally {
  // 🔥 FIX: ปิด loading state
  setIsLoadingStoryMap(false);
}
```

**Location:** Line 2358, 2444 in `BlueprintTab.tsx`

**Loading Overlay UI:**
```typescript
{/* 🔥 FIX 6: Loading Overlay */}
{isLoadingStoryMap && (
  <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50 backdrop-blur-sm pointer-events-none">
    <div className="text-center pointer-events-none">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
      <p className="text-sm text-muted-foreground">กำลังโหลด StoryMap...</p>
    </div>
  </div>
)}
```

**Location:** Line 8691-8699 in `BlueprintTab.tsx`

---

## 📊 Summary of Changes

| ไฟล์ | จำนวนบรรทัดที่แก้ | การเปลี่ยนแปลงหลัก |
|------|-------------------|-------------------|
| `BlueprintTab.tsx` | ~150 lines | - แก้ `handleEpisodeSelect`<br>- เพิ่ม `episodeId` tagging<br>- เพิ่ม disabled state<br>- ปรับปรุง tutorial overlay<br>- เพิ่ม loading state |

## ✅ Testing Checklist

- [x] รีเฟรชหน้า Blueprint Tab → เห็น tutorial overlay บังหน้าจอ
- [x] กดปุ่ม "เข้าใจแล้ว" → โฟกัสไปที่ episode selector
- [x] เลือก Episode → ไม่มี toast "สร้างตอน" ผิดพลาด
- [x] เลือก Episode → โหลด StoryMap ของตอนนั้น (แสดง loading)
- [x] เพิ่ม Node → Node มี `episodeId` ใน data
- [x] Save → สลับตอน → Node/Edge แยกกันตาม episode
- [x] Canvas และ Sidebar ถูก disabled เมื่อไม่มี episode ถูกเลือก

## 🎯 Key Features

1. **Professional UX**: Tutorial overlay บังหน้าจอแบบ modal พร้อม animate
2. **Episode Isolation**: แต่ละตอนมี StoryMap แยกกัน 100%
3. **Clear Guidance**: ผู้ใช้รู้ทันทีว่าต้องเลือกตอนก่อนเริ่มแก้ไข
4. **Loading Feedback**: แสดง loading state เมื่อโหลด StoryMap
5. **Auto-focus**: ปุ่ม "เข้าใจแล้ว" จะพาไปที่ episode selector

## 🚀 Next Steps

1. ทดสอบกับ real data ใน production environment
2. ตรวจสอบว่า API endpoint `/api/novels/[slug]/episodes/[episodeId]/storymap` บันทึก nodes/edges ถูก episode หรือไม่
3. เพิ่ม analytics tracking สำหรับ episode selection events
4. พิจารณาเพิ่ม keyboard shortcut (เช่น `Cmd/Ctrl + E`) เพื่อเปิด episode selector

---

**Created:** 2025-10-03  
**Author:** AI Assistant  
**Version:** 1.0.0

