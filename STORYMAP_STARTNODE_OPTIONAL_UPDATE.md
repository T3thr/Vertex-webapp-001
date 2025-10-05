# StoryMap Model Update - Start Node เป็น Optional

## สรุปการเปลี่ยนแปลง

อัพเดท StoryMap model เพื่อรองรับมาตรฐานใหม่ที่ไม่บังคับให้ต้องมี Start Node ทันทีเมื่อสร้าง Episode

## ไฟล์ที่แก้ไข

### `src/backend/models/StoryMap.ts`

#### 1. อัพเดท Schema - startNodeId Field

**Before**:
```typescript
startNodeId: { 
  type: String, 
  required: [true, "กรุณาระบุ Node เริ่มต้น (Start Node ID is required)"], 
  trim: true,
  validate: {
    validator: function(this: any, value: string) {
      if (!value) return false; // ❌ ไม่อนุญาตให้เป็น null
      // ...
    }
  }
},
```

**After**:
```typescript
startNodeId: { 
  type: String, 
  required: false, // ✅ NEW STANDARD: Allow null
  default: null,
  trim: true,
  validate: {
    validator: function(this: any, value: string) {
      if (!value) return true; // ✅ อนุญาตให้เป็น null หรือ empty
      
      // If nodes array is empty but startNodeId is provided, allow it
      if (!this.nodes || this.nodes.length === 0) {
        return true;
      }
      
      // Verify that the startNodeId exists in the nodes array (if provided)
      const nodeExists = this.nodes.some((node: any) => node.nodeId === value);
      return nodeExists;
    },
    message: 'Start Node ID must exist in the nodes array'
  }
},
```

#### 2. อัพเดท Interface - IStoryMap

**Before**:
```typescript
export interface IStoryMap extends Document {
  // ...
  startNodeId: string;
  // ...
}
```

**After**:
```typescript
export interface IStoryMap extends Document {
  // ...
  startNodeId: string | null; // ✅ NEW STANDARD: Allow null
  // ...
}
```

#### 3. อัพเดท JSDoc Comment

**Before**:
```typescript
* @property {string} startNodeId - ID ของโหนดที่เป็นจุดเริ่มต้นของเนื้อเรื่องใน StoryMap นี้
```

**After**:
```typescript
* @property {string | null} startNodeId - ID ของโหนดที่เป็นจุดเริ่มต้นของเนื้อเรื่องใน StoryMap นี้ (✅ NEW: Can be null - not required immediately)
```

#### 4. อัพเดท Pre-Save Validation Middleware

**Before**:
```typescript
// 3. ตรวจสอบว่า startNodeId มีอยู่จริงใน Nodes
if (this.isModified("startNodeId") || this.isModified("nodes")) {
  if (this.startNodeId && this.nodes && !this.nodes.some(node => node.nodeId === this.startNodeId)) {
    return next(new Error(`Start Node ID '${this.startNodeId}' ไม่พบในรายการ Nodes ของ StoryMap นี้`));
  }
}
```

**After**:
```typescript
// 3. ตรวจสอบว่า startNodeId มีอยู่จริงใน Nodes (ถ้ามีการระบุ)
// ✅ NEW STANDARD: Allow null startNodeId
if (this.isModified("startNodeId") || this.isModified("nodes")) {
  // Only validate if startNodeId is provided (not null/empty)
  if (this.startNodeId && this.nodes && this.nodes.length > 0 && !this.nodes.some(node => node.nodeId === this.startNodeId)) {
    return next(new Error(`Start Node ID '${this.startNodeId}' ไม่พบในรายการ Nodes ของ StoryMap นี้`));
  }
}
```

## ผลกระทบ

### ✅ สิ่งที่ทำได้แล้ว

1. **สร้าง Episode โดยไม่มี Start Node**: API สามารถสร้าง Episode พร้อม StoryMap ที่มี `nodes: []` และ `startNodeId: null` ได้สำเร็จ
2. **Validation ยืดหยุ่นขึ้น**: ระบบจะ validate `startNodeId` เฉพาะเมื่อมีการระบุค่า ไม่บังคับให้มีทันที
3. **รองรับการเพิ่ม Start Node ภายหลัง**: ผู้ใช้สามารถสร้าง Start Node ได้ตอนไหนก็ได้หลังจากสร้าง Episode แล้ว

### ⚠️ สิ่งที่ต้องระวัง

1. **Frontend Code**: Code ที่อ้างอิง `storyMap.startNodeId` ต้องตรวจสอบว่าเป็น `null` หรือไม่ก่อนใช้งาน
2. **Game Runtime**: ระบบ runtime ที่เล่น Visual Novel ต้องจัดการกรณีที่ไม่มี Start Node (แสดง error message หรือ warning)
3. **Validation ใน Frontend**: ก่อน publish Episode ควรตรวจสอบว่ามี Start Node แล้วหรือยัง

## การทดสอบ

### Test Case 1: สร้าง Episode ใหม่โดยไม่มี Start Node
```javascript
const newStoryMap = {
  novelId: novelId,
  episodeId: episodeId,
  title: "ตอนที่ 1",
  version: 1,
  nodes: [],           // ✅ Empty array
  edges: [],
  storyVariables: [],
  startNodeId: null,   // ✅ Null value
  isActive: true
};

// Should save successfully without validation errors
await storyMap.save();
```

### Test Case 2: เพิ่ม Start Node ภายหลัง
```javascript
const startNode = {
  nodeId: `start_${Date.now()}`,
  nodeType: 'start_node',
  title: 'จุดเริ่มต้น',
  position: { x: 250, y: 100 },
  // ...
};

storyMap.nodes.push(startNode);
storyMap.startNodeId = startNode.nodeId;

// Should save successfully with validation passing
await storyMap.save();
```

### Test Case 3: startNodeId อ้างอิง Node ที่ไม่มีอยู่
```javascript
storyMap.startNodeId = 'non_existent_node_id';

// Should fail validation
await storyMap.save(); // ❌ Error: Start Node ID must exist in the nodes array
```

## เชื่อมโยงกับการเปลี่ยนแปลงอื่นๆ

การอัพเดทนี้สอดคล้องกับ:

1. **Episode Creation API** (`src/app/api/novels/[slug]/episodes/route.ts`):
   - ✅ สร้าง Episode โดยไม่มี Start Node อัตโนมัติ
   - ✅ ส่ง `startNodeId: null` ใน StoryMap

2. **Blueprint Tab Tutorial** (`src/app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx`):
   - ✅ แสดง SELECT EPISODE TUTORIAL เมื่อยังไม่ได้เลือก Episode
   - ✅ Canvas ว่างเปล่า ไม่มี Start Node อัตโนมัติ

3. **URL Persistence**:
   - ✅ Episode selection จะถูกเก็บใน URL
   - ✅ Refresh หน้าจะ restore Episode selection กลับมา

## สรุป

การอัพเดทนี้ทำให้ StoryMap model มีความยืดหยุ่นมากขึ้น โดย:
- ✅ ไม่บังคับให้มี Start Node ทันทีเมื่อสร้าง Episode
- ✅ ให้ผู้ใช้มีอิสระในการออกแบบโครงเรื่อง
- ✅ ลด clutter บน Canvas เมื่อเริ่มต้น
- ✅ Validation ที่ชาญฉลาดขึ้น - ตรวจสอบเฉพาะเมื่อจำเป็น

## วันที่อัพเดท
October 5, 2025

