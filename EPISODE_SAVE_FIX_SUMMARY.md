# Episode Save Fix Summary - การแก้ไขระบบบันทึก Episode

**วันที่:** 2025-10-03  
**ปัญหา:** ไม่สามารถบันทึก nodes/edges ไปยัง Episode ได้ เกิด Error ขณะ Save

---

## 🐛 ปัญหาที่พบ

### 1. ไม่มี API Endpoint สำหรับบันทึก Episode-specific StoryMap
```
Error: Save failed: 404
API URL: /api/novels/[slug]/episodes/[episodeId]/storymap/save
```

**สาเหตุ:** SingleUserEventManager พยายามเรียก API endpoint ที่ยังไม่มีอยู่

### 2. Start Node มี UI เหมือน Scene Node
- Start node ควรมีรูปร่างและสีที่แตกต่างชัดเจน
- ไม่ควรสับสนกับ Scene node ทั่วไป

### 3. Nodes/Edges ไม่ persist ไปยัง Episode's StoryMap
- ข้อมูลที่บันทึกไม่ถูกเก็บใน Episode-specific StoryMap
- หลัง refresh หน้าเว็บ nodes/edges จะหาย

---

## ✅ การแก้ไขที่ทำ

### 1. สร้าง Episode-Specific Save API ✅

**ไฟล์:** `src/app/api/novels/[slug]/episodes/[episodeId]/storymap/save/route.ts`

#### Features:
- ✅ รองรับ POST request สำหรับบันทึก StoryMap
- ✅ ตรวจสอบสิทธิ์ผู้ใช้ (Author/Co-Author)
- ✅ ทำความสะอาดข้อมูล nodes, edges, storyVariables
- ✅ จัดการ duplicate variable IDs อัตโนมัติ
- ✅ สร้าง StoryMap ใหม่หากยังไม่มี
- ✅ อัปเดต version control สำหรับ conflict resolution

#### API Response Format:
```typescript
{
  success: true,
  message: 'StoryMap saved successfully',
  storyMap: {
    _id: string,
    version: number,
    nodes: IStoryMapNode[],
    edges: IStoryMapEdge[],
    storyVariables: IStoryVariableDefinition[],
    updatedAt: Date
  },
  episode: {
    _id: string,
    title: string,
    episodeOrder: number,
    status: string
  },
  newVersion: number,
  version: number
}
```

#### Error Handling:
- 🔥 **Duplicate Variable IDs:** Auto-fix และ retry
- 🔥 **Validation Errors:** ทำความสะอาดข้อมูลก่อนบันทึก
- 🔥 **Permission Errors:** ตรวจสอบสิทธิ์ผู้ใช้

### 2. แก้ไข Start Node Design ✅

**ไฟล์:** `src/app/api/novels/[slug]/episodes/blueprint/route.ts`

#### Changes:
```typescript
// ❌ Before: Start node เหมือน Scene node
{
  nodeType: StoryMapNodeType.START_NODE,
  title: 'จุดเริ่มต้น',
  position: { x: 400, y: 300 },
  editorVisuals: {
    color: '#10B981',
    icon: 'play-circle',
    orientation: 'horizontal',
    borderRadius: 12
  }
}

// ✅ After: Start node มี identity ที่ชัดเจน
{
  nodeType: StoryMapNodeType.START_NODE,
  title: 'START',
  position: { x: 400, y: 100 }, // ด้านบนของ canvas
  editorVisuals: {
    color: '#10B981', // Emerald green
    icon: 'play',
    orientation: 'vertical',
    borderRadius: 999, // วงกลมเต็ม
    borderStyle: 'solid',
    gradient: {
      from: '#10B981',
      to: '#059669',
      direction: 'vertical'
    }
  }
}
```

#### Visual Differences:
| Feature | Start Node | Scene Node |
|---------|-----------|------------|
| **Shape** | วงกลม (rounded-full) | สี่เหลี่ยมโค้ง (rounded-xl) |
| **Color** | Emerald (#10B981) | Blue (#3B82F6) |
| **Position** | ด้านบนของ canvas | ตามลำดับเรื่อง |
| **Handles** | เฉพาะ bottom | top + bottom |
| **Icon** | Play | Square |

### 3. แก้ไข GET API สำหรับ Episode StoryMap ✅

**ไฟล์:** `src/app/api/novels/[slug]/episodes/[episodeId]/storymap/route.ts`

#### Changes:
- ✅ คืนค่า empty structure หาก StoryMap ยังไม่มี (แทนที่จะเป็น error)
- ✅ รองรับการสร้าง StoryMap ใหม่อัตโนมัติ
- ✅ เพิ่ม logging สำหรับ debugging

---

## 🔄 Flow การทำงานใหม่

### 1. เมื่อสร้าง Episode ใหม่:
```
1. User กดสร้างตอน
   ↓
2. Blueprint API สร้าง Episode + StoryMap เปล่า
   ↓
3. StoryMap มี Start Node เดียว
   ↓
4. User สามารถเพิ่ม Scene Nodes ได้
```

### 2. เมื่อเลือก Episode และแก้ไข:
```
1. User เลือกตอนจาก dropdown
   ↓
2. BlueprintTab โหลด StoryMap จาก:
   GET /api/novels/[slug]/episodes/[episodeId]/storymap
   ↓
3. แสดง nodes/edges ของตอนนั้น
   ↓
4. User แก้ไข (เพิ่ม/ลบ nodes/edges)
   ↓
5. กด Save
   ↓
6. SingleUserEventManager บันทึกไปยัง:
   POST /api/novels/[slug]/episodes/[episodeId]/storymap/save
   ↓
7. API ทำความสะอาดข้อมูล
   ↓
8. บันทึกลง MongoDB
   ↓
9. คืนค่า success พร้อม version ใหม่
```

### 3. Data Cleaning Pipeline:
```typescript
// 🔥 Variables Cleaning
storyVariables
  .filter(v => v && v.variableName) // ลบตัวแปรที่ไม่มีชื่อ
  .filter(v => v.variableId !== null) // ลบ null IDs
  .map(v => ({
    variableId: uniqueId, // Generate unique ID
    variableName: v.variableName,
    dataType: v.dataType || 'string',
    // ... rest of fields
  }))
  .filter((v, idx, arr) => 
    arr.findIndex(x => x.variableId === v.variableId) === idx
  ) // Remove duplicates

// 🔥 Nodes Cleaning
nodes.map(node => ({
  nodeId: node.id || node.nodeId,
  nodeType: node.type || node.data?.nodeType,
  title: node.data?.title || 'Untitled',
  position: { 
    x: Math.round(node.position?.x || 0), 
    y: Math.round(node.position?.y || 0)
  },
  nodeSpecificData: node.data?.nodeSpecificData || {},
  editorVisuals: { /* cleaned visuals */ }
}))

// 🔥 Edges Cleaning
edges.map(edge => ({
  edgeId: edge.id || edge.edgeId,
  sourceNodeId: edge.source,
  targetNodeId: edge.target,
  label: edge.label || '',
  editorVisuals: { /* cleaned visuals */ }
}))
```

---

## 🎯 สิ่งที่ได้รับการแก้ไข

### ✅ Save Functionality
- [x] สามารถบันทึก nodes/edges ไปยัง Episode-specific StoryMap ได้
- [x] Auto-fix duplicate variable IDs
- [x] Version control สำหรับ conflict detection
- [x] Proper error handling และ logging

### ✅ Start Node Identity
- [x] รูปร่างวงกลมแทนสี่เหลี่ยม
- [x] สี Emerald (#10B981) แทน Blue
- [x] ตำแหน่งด้านบนของ canvas
- [x] Title เป็น "START" แทน "จุดเริ่มต้น"

### ✅ Data Persistence
- [x] Nodes บันทึกใน `StoryMap.nodes[]`
- [x] Edges บันทึกใน `StoryMap.edges[]`
- [x] StoryVariables บันทึกใน `StoryMap.storyVariables[]`
- [x] เชื่อมโยงกับ Episode ผ่าน `StoryMap.episodeId`

---

## 🧪 การทดสอบที่แนะนำ

### Test Case 1: Save New Episode
1. สร้าง Episode ใหม่
2. เพิ่ม Scene Node 2-3 nodes
3. เพิ่ม Edges เชื่อมโยง nodes
4. กด Save
5. ✅ ควรบันทึกสำเร็จ
6. Refresh หน้า
7. ✅ Nodes/Edges ควรยังอยู่

### Test Case 2: Edit Existing Episode
1. เลือก Episode ที่มี nodes อยู่แล้ว
2. แก้ไข nodes (เคลื่อนที่/เปลี่ยนชื่อ)
3. เพิ่ม nodes ใหม่
4. ลบ nodes เก่า
5. กด Save
6. ✅ ควรบันทึกสำเร็จ
7. เปลี่ยนไปตอนอื่น แล้วกลับมา
8. ✅ การเปลี่ยนแปลงควรยังคงอยู่

### Test Case 3: Multiple Episodes
1. สร้าง Episode A → เพิ่ม nodes → Save
2. สร้าง Episode B → เพิ่ม nodes → Save
3. เปลี่ยนไป Episode A
4. ✅ ควรเห็น nodes ของ Episode A
5. เปลี่ยนไป Episode B
6. ✅ ควรเห็น nodes ของ Episode B
7. Nodes ไม่ควรปะปนกัน

### Test Case 4: Start Node Appearance
1. สร้าง Episode ใหม่
2. ✅ Start node ควรเป็นวงกลมสีเขียว
3. ✅ Start node ควรอยู่ด้านบนของ canvas
4. เพิ่ม Scene node
5. ✅ Scene node ควรเป็นสี่เหลี่ยมสีน้ำเงิน
6. ✅ รูปร่างควรแตกต่างชัดเจน

---

## 📊 Database Schema

### StoryMap Collection:
```typescript
{
  _id: ObjectId,
  novelId: ObjectId, // Reference to Novel
  episodeId: ObjectId, // 🎯 Reference to Episode
  title: string,
  version: number,
  nodes: [
    {
      nodeId: string, // UUID
      nodeType: 'start_node' | 'scene_node' | ...,
      title: string,
      position: { x: number, y: number },
      nodeSpecificData: object,
      editorVisuals: {
        color: string,
        icon: string,
        orientation: 'vertical' | 'horizontal',
        borderRadius: number,
        borderStyle: string,
        gradient: object
      }
    }
  ],
  edges: [
    {
      edgeId: string,
      sourceNodeId: string,
      targetNodeId: string,
      label: string,
      editorVisuals: object
    }
  ],
  storyVariables: [
    {
      variableId: string, // Unique within StoryMap
      variableName: string,
      dataType: string,
      initialValue: any
    }
  ],
  startNodeId: string,
  lastModifiedByUserId: ObjectId,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔐 Security & Validation

### ✅ Authorization:
- ตรวจสอบว่าผู้ใช้เป็น Author หรือ Co-Author
- ตรวจสอบว่า Episode เป็นของ Novel ที่ถูกต้อง

### ✅ Data Validation:
- ทำความสะอาด node IDs, edge IDs
- ป้องกัน duplicate variable IDs
- Validate nodeType ตาม StoryMapNodeType enum
- Round position coordinates เป็นจำนวนเต็ม

### ✅ Error Recovery:
- Auto-fix duplicate variable IDs
- Retry logic สำหรับ MongoDB errors
- Graceful fallback สำหรับ invalid data

---

## 🚀 Performance Optimization

### ✅ API Efficiency:
- ใช้ `.lean()` สำหรับ read-only queries
- Select เฉพาะ fields ที่จำเป็น
- Index บน `novelId`, `episodeId`, `isActive`

### ✅ Data Cleaning:
- Filter invalid data ก่อนบันทึก
- Generate unique IDs แบบ batch
- Use Set สำหรับ duplicate detection (O(1) lookup)

---

## 📝 Migration Notes

### ไม่มี Breaking Changes:
- Novel-level StoryMaps ยังคงทำงานได้ปกติ
- Episode-specific StoryMaps เป็น feature ใหม่
- API เดิมไม่ได้รับผลกระทบ

### Backward Compatibility:
- Episodes เก่าที่ไม่มี StoryMap → สร้างใหม่อัตโนมัติ
- Nodes/Edges เก่า → ทำงานได้ปกติ
- UI components → รองรับทั้งแบบเก่าและใหม่

---

## 🎉 Summary

### ปัญหาที่แก้ไข:
1. ✅ สร้าง API endpoint สำหรับบันทึก Episode-specific StoryMap
2. ✅ แก้ไข Start Node ให้มี UI ที่แตกต่างชัดเจน
3. ✅ ทำให้ Nodes/Edges persist ไปยัง Episode's StoryMap ได้
4. ✅ จัดการ duplicate variable IDs อัตโนมัติ

### ผลลัพธ์:
- 🎯 ผู้ใช้สามารถบันทึกการแก้ไข Episode ได้สำเร็จ
- 🎯 Nodes/Edges ไม่หายหลัง refresh
- 🎯 แต่ละ Episode มี canvas แยกต่างหาก
- 🎯 Start Node มีรูปลักษณ์ที่ชัดเจนและแตกต่าง

---

**Status:** ✅ **COMPLETED**  
**Testing:** 🧪 Ready for QA Testing

