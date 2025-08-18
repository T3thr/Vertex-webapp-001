# 🚀 Unified Save System - ระบบการบันทึกแบบรวมศูนย์

## 📋 ภาพรวม

ระบบการบันทึกใหม่ได้รับการออกแบบให้มีประสิทธิภาพระดับ **Canva** และ **Premiere Pro** โดยแก้ไขปัญหาหลักของระบบเดิม:

### ✅ ปัญหาที่แก้ไขแล้ว

1. **Version Conflicts** - ไม่ต้อง refresh หน้าอีกต่อไป
2. **Multiple Save Systems** - รวมเป็นระบบเดียว
3. **Race Conditions** - จัดการ auto-save และ manual save อย่างปลอดภัย
4. **Poor User Feedback** - มี visual indicators ที่ชัดเจน

---

## 🏗️ สถาปัตยกรรมใหม่

### 1. **UnifiedSaveManager** (`SaveManager.ts`)
```typescript
// Single Entry Point สำหรับทุกการบันทึก
const saveManager = createSaveManager({
  novelSlug: 'my-novel',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 30000
});

// บันทึกแบบ immediate สำหรับ critical operations
await saveManager.saveOperation({
  type: 'DELETE_NODE',
  data: { nodeId: 'node-123' }
});

// บันทึกแบบ manual
await saveManager.saveManual(storyMapData);
```

### 2. **Intelligent Conflict Resolution** (`route.ts`)
```typescript
// แทนที่จะส่ง 409 Error ให้ทำ merge อัตโนมัติ
if (clientVersion < serverVersion) {
  const mergedData = await performIntelligentMerge(localData, serverData);
  // บันทึกและส่งกลับข้อมูลที่ merge แล้ว
  return { storyMap: mergedData, merged: true };
}
```

### 3. **Visual Feedback System** (`SaveStatusIndicator.tsx`)
```tsx
// แสดงสถานะแบบ real-time
<SaveStatusIndicator 
  saveState={saveState} 
  size="md"
  showDetails={true}
/>
```

---

## 🔄 Hybrid Auto-Save Strategy

### Immediate Operations (บันทึกทันที)
- `DELETE_NODE` - ลบโหนด
- `DELETE_EDGE` - ลบการเชื่อมต่อ  
- `ADD_NODE` - เพิ่มโหนด
- `ADD_EDGE` - เพิ่มการเชื่อมต่อ

### Debounced Operations (บันทึกแบบ debounce)
- `MOVE_NODE` - ย้ายโหนด
- `UPDATE_NODE` - แก้ไขโหนด
- `UPDATE_CANVAS` - อัปเดตผืนผ้าใบ

### Manual Operations (บันทึกด้วยตนเอง)
- `BATCH_UPDATE` - อัปเดตหลายรายการ

---

## 🧠 Intelligent Merge Algorithm

### กลยุทธ์การรวมข้อมูล

1. **Nodes**: รวมตาม ID, ใช้ตำแหน่งจาก local (user's view)
2. **Edges**: รวมตาม ID, ใช้เนื้อหาจาก version ใหม่กว่า
3. **Story Variables**: Deep merge แบบ additive
4. **Editor Metadata**: ใช้จาก local (user's current view)

```typescript
function mergeNodesByStrategy(localNodes, serverNodes) {
  // 1. เพิ่ม server nodes (base)
  // 2. Merge กับ local nodes (ทับด้วย local data)
  // 3. ใช้ตำแหน่งจาก local
  return mergedNodes;
}
```

---

## 📊 Save State Management

### UnifiedSaveState Interface
```typescript
interface UnifiedSaveState {
  status: 'idle' | 'saving' | 'conflict' | 'error';
  isSaving: boolean;
  lastSaved: Date | null;
  localVersion: number;
  serverVersion: number;
  pendingOperations: SaveOperation[];
  hasUnsavedChanges: boolean;
  lastError?: string;
}
```

### Status Indicators
- 🟢 **idle** - พร้อมใช้งาน, บันทึกเรียบร้อย
- 🔵 **saving** - กำลังบันทึก...
- 🟡 **conflict** - กำลังรวมข้อมูล...
- 🔴 **error** - บันทึกไม่สำเร็จ, กำลังลองใหม่...

---

## 🔧 การใช้งาน

### 1. ใน NovelEditor
```tsx
// สร้าง SaveManager
const [saveManager] = useState(() => createSaveManager({
  novelSlug: novel.slug,
  autoSaveEnabled: isAutoSaveEnabled,
  autoSaveIntervalMs: autoSaveIntervalSec * 1000
}));

// แสดงสถานะการบันทึก
<SaveStatusIndicator saveState={saveState} />

// ปุ่มบันทึกด้วยตนเอง
<Button onClick={handleManualSave} disabled={!saveState.hasUnsavedChanges}>
  บันทึก
</Button>
```

### 2. ใน BlueprintTab (ในอนาคต)
```tsx
// รับ SaveManager เป็น prop
interface BlueprintTabProps {
  saveManager: UnifiedSaveManager;
  // ... props อื่นๆ
}

// ใช้ SaveManager แทนระบบเก่า
const handleNodeAdd = async (nodeData) => {
  await saveManager.saveOperation({
    type: 'ADD_NODE',
    data: nodeData
  });
};
```

---

## 🎯 ประโยชน์ที่ได้รับ

### 1. **User Experience ที่ดีขึ้น**
- ✅ ไม่ต้อง refresh หน้าเมื่อเกิด conflict
- ✅ แสดงสถานะการบันทึกแบบ real-time
- ✅ รวมการเปลี่ยนแปลงอัตโนมัติ
- ✅ ป้องกันการสูญหายของข้อมูล

### 2. **Developer Experience ที่ดีขึ้น**
- ✅ Single Entry Point - ง่ายต่อการใช้งาน
- ✅ Type Safety - TypeScript support เต็มรูปแบบ
- ✅ Error Handling - จัดการ error อย่างครอบคลุม
- ✅ Extensible - ขยายได้ง่าย

### 3. **Performance ที่ดีขึ้น**
- ✅ Hybrid Strategy - บันทึกเฉพาะที่จำเป็น
- ✅ Debouncing - ลด network requests
- ✅ Optimistic Updates - UI ตอบสนองเร็ว
- ✅ Background Processing - ไม่บล็อก UI

---

## 🔮 แผนการพัฒนาต่อ

### Phase 1 (เสร็จสิ้น) ✅
- [x] สร้าง UnifiedSaveManager
- [x] ปรับปรุง API conflict handling
- [x] เพิ่ม SaveStatusIndicator
- [x] รวมเข้ากับ NovelEditor
- [x] รวมเข้ากับ BlueprintTab Command System
- [x] ซิงค์กับ Undo/Redo System
- [x] แก้ไข Dirty State Detection

### Phase 2 (ถัดไป)
- [ ] รวมเข้ากับ SummaryTab และ DirectorTab
- [ ] เพิ่ม Offline Support
- [ ] ปรับปรุง Merge Algorithm
- [ ] เพิ่ม Real-time Collaboration

### Phase 3 (อนาคต)
- [ ] Advanced Conflict Resolution UI
- [ ] Performance Monitoring
- [ ] A/B Testing Framework
- [ ] Analytics Integration

---

## 🔧 การแก้ไขปัญหาล่าสุด (Latest Fixes)

### ✅ ปัญหาที่แก้ไขแล้ว

#### 1. **การตรวจจับการเปลี่ยนแปลงไม่ทำงาน (Dirty State Detection)**
**ปัญหา:** เมื่อลาก node ใน canvas ปุ่ม save ไม่เปิดใช้งาน

**สาเหตุ:** SaveManager ไม่ได้ integrate กับระบบ Command History ใน BlueprintTab

**แก้ไข:**
```typescript
// ใน executeCommand function
if (saveManager) {
  await saveManager.saveOperation({
    type: command.type as any,
    data: { /* command data */ },
    strategy: 'immediate' | 'debounced'
  });
}
```

#### 2. **Auto-save Errors และ Race Conditions**
**ปัญหา:** Auto-save ทำงานพร้อมกับ manual save ทำให้เกิด error

**แก้ไข:**
- ใช้ Single Entry Point ผ่าน SaveManager
- Debouncing สำหรับ frequent operations
- Sequential processing สำหรับ pending operations

#### 3. **Undo/Redo ไม่ sync กับ Save State**
**ปัญหา:** หลัง undo/redo dirty state ไม่อัปเดต

**แก้ไข:**
```typescript
// ใน undo function
if (saveManager) {
  if (hasMoreCommands) {
    saveManager.saveOperation({
      type: 'UPDATE_NODE',
      data: { undoOperation: true },
      strategy: 'debounced'
    });
  }
}
```

### 🎯 การทำงานปัจจุบัน

1. **Command Execution** → SaveManager → API
2. **Manual Save** → SaveManager.saveManual() → API  
3. **Auto-save** → SaveManager (debounced) → API
4. **Undo/Redo** → SaveManager (update state) → API

---

## 📝 Notes สำหรับ Developer

### การ Migration จากระบบเก่า
1. ระบบเก่ายังทำงานได้ปกติ (Backward Compatible)
2. ค่อยๆ migrate component ทีละตัว
3. ทดสอบ thoroughly ก่อน production

### Best Practices
1. ใช้ SaveManager เป็น Single Source of Truth
2. อย่าจัดการ save state ด้วยตนเอง
3. ใช้ SaveStatusIndicator สำหรับ feedback
4. ทดสอบ conflict scenarios

### Debugging
```typescript
// เปิด debug logs
console.log('[SaveManager] Current state:', saveManager.getState());

// ดู pending operations
console.log('[SaveManager] Pending:', saveState.pendingOperations);
```

---

## 🤝 Contributing

หากต้องการปรับปรุงระบบ Save:

1. อ่านเอกสารนี้ให้เข้าใจ
2. ทดสอบกับ test cases ที่มีอยู่
3. เพิ่ม unit tests สำหรับ feature ใหม่
4. อัปเดตเอกสารนี้ตามการเปลี่ยนแปลง

**Happy Coding! 🎉**
