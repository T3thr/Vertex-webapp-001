# Blueprint Tab Save System Documentation

## ภาพรวมระบบ

ระบบ save/auto-save ใน Blueprint Tab ได้รับการปรับปรุงให้มีความเสถียรและสอดคล้องกันในระดับเดียวกับ Canva และ Premiere Pro โดยมีคุณสมบัติหลักดังนี้:

### 1. ระบบ Save แบบ Unified

- **UnifiedSaveManager**: จัดการการบันทึกข้อมูลแบบรวมศูนย์
- **Auto-save**: บันทึกอัตโนมัติทุก 15-30 วินาที (ปิดใช้งานโดยค่าเริ่มต้น)
- **Manual Save**: บันทึกด้วยตนเองผ่านปุ่มในหน้า overview
- **Dirty State Detection**: ตรวจจับการเปลี่ยนแปลงอัตโนมัติ

### 2. การจัดการ API

```typescript
// API Routes ที่รองรับ
PUT /api/novels/[slug]/storymap          // Full update
PATCH /api/novels/[slug]/storymap/patch  // Incremental update (สำหรับ auto-save)
```

### 3. Multiple Selection System

#### การเปิดใช้งาน Multi-Select Mode
1. คลิกปุ่ม "Multi-Select" ใน floating toolbar
2. คลิกเลือก nodes หลายตัว
3. กด Enter หรือคลิก "Confirm Selection" ใน confirmation bar

#### คุณสมบัติ
- **Visual Selection**: แสดงการเลือกด้วยสีพื้นหลัง
- **Confirmation Bar**: แสดงเพียงอันเดียวเพื่อป้องกันความสับสน
- **Batch Operations**: ดำเนินการกับหลาย nodes พร้อมกัน

### 4. การป้องกัน Infinite Loops

```typescript
// ใช้ isInitialLoad flag เพื่อป้องกัน localStorage loops
const [isInitialLoad, setIsInitialLoad] = useState(true);

useEffect(() => {
  if (!isInitialLoad) {
    localStorage.setItem('key', value);
  }
}, [value, isInitialLoad]);
```

## การใช้งาน

### การตั้งค่า Auto-save

1. คลิกปุ่ม Settings (⚙️) ในแถบ header
2. เปิดใช้งาน "Auto-save" (ค่าเริ่มต้น: ปิด)
3. เลือกความถี่: 15 หรือ 30 วินาที
4. การตั้งค่าจะถูกบันทึกใน UserSettings

### การบันทึกด้วยตนเอง

- ปุ่ม "บันทึก" จะ **disable** เมื่อไม่มีการเปลี่ยนแปลง
- ปุ่มจะเปลี่ยนสีเป็นสีน้ำเงินเมื่อมีการเปลี่ยนแปลงที่ต้องบันทึก
- รองรับ keyboard shortcut: `Ctrl+S` (Windows) / `Cmd+S` (Mac)

### Multiple Selection

1. **เปิดโหมด**: คลิก "Multi-Select" หรือกด `M`
2. **เลือก nodes**: คลิก nodes ที่ต้องการ (จะมีสีพื้นหลัง)
3. **ยืนยัน**: กด `Enter` หรือคลิก "Confirm Selection"
4. **ยกเลิก**: กด `Escape` หรือคลิก "Cancel"

## การแก้ไขปัญหา

### ปัญหา "Internal Server Error"

**สาเหตุ**: ข้อมูลที่ส่งไป API ไม่ถูกต้อง

**การแก้ไข**:
- ตรวจสอบ data validation ใน `formatDataForAPI()`
- ตรวจสอบ mongoose models ใน `/backend/models/`
- ดู error logs ใน browser console

### ปัญหา Multiple Selection ไม่ทำงาน

**การตรวจสอบ**:
1. ตรวจสอบว่าโหมด multi-select เปิดอยู่
2. ดู confirmation bar ที่ด้านล่างหน้าจอ
3. ตรวจสอบ console สำหรับ error messages

### ปัญหา Infinite Loops

**อาการ**: หน้าจอค้าง, React แสดง error "Maximum update depth exceeded"

**การแก้ไข**:
- ตรวจสอบ useEffect dependencies
- ใช้ `isInitialLoad` flag สำหรับ localStorage operations
- หลีกเลี่ยงการ setState ใน render cycle

## โครงสร้างไฟล์

```
src/app/novels/[slug]/overview/components/
├── NovelEditor.tsx              # หน้าหลัก + header controls
└── tabs/
    ├── BlueprintTab.tsx         # Blueprint canvas + multiple selection
    ├── SaveManager.ts           # ระบบ save/auto-save
    ├── SaveStatusIndicator.tsx  # แสดงสถานะการบันทึก
    └── BlueprintTab.test.tsx    # ไฟล์ทดสอบ
```

## API Integration

### StoryMap Model Fields

```typescript
interface IStoryMap {
  nodes: IStoryMapNode[];           // Node data
  edges: IStoryMapEdge[];           // Connection data  
  storyVariables: IStoryVariableDefinition[];
  version: number;                  // Version control
  etag?: string;                    // Optimistic concurrency
  pendingCommands?: Array<{...}>;   // Command history
}
```

### Save Request Format

```typescript
{
  nodes: IStoryMapNode[],
  edges: IStoryMapEdge[],
  storyVariables: IStoryVariableDefinition[],
  version: number,
  etag?: string
}
```

## Performance Optimizations

1. **Debounced Auto-save**: รวม operations ที่เกิดใกล้กันเป็น batch
2. **Optimistic Updates**: อัปเดต UI ทันทีก่อนส่ง API
3. **Version Control**: ป้องกัน conflicts ด้วย ETag
4. **Error Recovery**: ระบบ retry อัตโนมัติสำหรับ network errors

## Testing

รันไฟล์ทดสอบ:
```bash
npm test BlueprintTab.test.tsx
```

ทดสอบครอบคลุม:
- Multiple selection functionality
- Save system error handling  
- Infinite loops prevention
- localStorage state management

## การ Deploy

1. ตรวจสอบ environment variables สำหรับ database connection
2. รัน linting: `npm run lint`
3. รัน tests: `npm test`
4. Build: `npm run build`

---

**หมายเหตุ**: ระบบนี้ได้รับการออกแบบให้ทำงานเสถียรและสอดคล้องกันในระดับ professional tools โดยป้องกันปัญหา common issues เช่น data loss, UI freezing, และ server errors
