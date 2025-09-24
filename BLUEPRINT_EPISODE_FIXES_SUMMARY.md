# Blueprint Tab Episode Management Fixes - Summary

## เอกสารสรุปการแก้ไขตามคำร้องเรียนของลูกค้า

**วันที่:** 2025-10-03  
**ผู้ดำเนินการ:** AI Assistant  
**ไฟล์ที่แก้ไข:**
1. `src/app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx`
2. `src/app/api/novels/[slug]/episodes/blueprint/route.ts`

---

## 📋 คำร้องเรียนจากลูกค้า

### 1. Tutorial Overlay ไม่ถูกต้อง
**ปัญหา:** เมื่อเข้าหน้า overview ของนิยายที่มีตอนอยู่แล้ว พบว่าใน floating toolbar ขึ้นว่า "Select Episode" แต่ยังไม่มี tutorial บอกให้เลือกตอน

**การแก้ไข:**
- เพิ่ม tutorial ใหม่สองแบบ:
  1. **Tutorial แบบที่ 1 (tutorialStep = 0):** แสดงเมื่อนิยายไม่มีตอน - บอกให้สร้างตอนแรก
  2. **Tutorial แบบที่ 2 (tutorialStep = 1):** แสดงเมื่อนิยายมีตอนแล้วแต่ยังไม่ได้เลือก - บอกให้เลือกตอนก่อนจะเพิ่ม nodes/edges

**โค้ดที่แก้:**
```typescript
// Updated tutorial logic
useEffect(() => {
  // Show "Select Episode" tutorial when novel has episodes but none selected
  if (episodes.length > 0 && !currentEpisodeId && !showTutorial) {
    setShowTutorial(true);
    setTutorialStep(1);
  } 
  // Show "Create Episode" tutorial when no episodes exist
  else if (episodes.length === 0 && !showTutorial) {
    setShowTutorial(true);
    setTutorialStep(0);
  } 
  // Hide tutorial when episode is selected
  else if (currentEpisodeId && showTutorial) {
    setShowTutorial(false);
  }
}, [episodes.length, currentEpisodeId, showTutorial]);
```

---

### 2. รูปแบบ Slug ไม่รองรับภาษาไทย
**ปัญหา:** การแสดง episode ใน dropdown ไม่ตรงกับรูปแบบ slug ที่ใช้ในหน้าอ่าน (read page)

**การแก้ไข:**
- เปลี่ยนรูปแบบการแสดง episode ใน dropdown จาก `"Ep {episodeOrder}: {title}"` เป็น `"{episodeOrder}-{slug}"` เพื่อให้ตรงกับรูปแบบ URL ในหน้าอ่าน
- อัปเดตทั้ง desktop และ mobile versions

**โค้ดที่แก้:**
```typescript
// Desktop version
<SelectTrigger className="w-56 h-8 text-xs bg-background/50">
  <SelectValue placeholder={episodes.length > 0 ? "เลือกตอน" : "ยังไม่มีตอน"} />
</SelectTrigger>
<SelectContent>
  {episodes.map((episode) => (
    <SelectItem key={episode._id} value={episode._id} className="text-xs">
      <div className="flex items-center gap-2">
        <BookOpen className="w-3 h-3" />
        <span className="truncate">{episode.episodeOrder}-{episode.slug || episode.title}</span>
      </div>
    </SelectItem>
  ))}
</SelectContent>

// Mobile version - same pattern with different width (w-40)
```

**ผลลัพธ์:** รูปแบบการแสดงใน dropdown จะเป็น:
- `"1-การมาถึงย่านเก่า"` (episode 1)
- `"2-พบกับอาจารย์"` (episode 2)
- เหมือนกับ URL ที่ใช้ในหน้าอ่าน: `/read/[novelSlug]/1-การมาถึงย่านเก่า`

---

### 3. API การเพิ่มตอนไม่รองรับภาษาไทย
**ปัญหา:** ฟังก์ชัน `generateSlug()` ใน Blueprint API ใช้วิธีการแบบเดิมที่ไม่รองรับภาษาไทย

**การแก้ไข:**
- อัปเดตฟังก์ชัน `generateSlug()` ให้ใช้รูปแบบเดียวกับ Episode model's pre-save hook
- รองรับการ normalize Unicode (NFC) และเก็บสระ/วรรณยุกต์ภาษาไทย

**โค้ดที่แก้ (route.ts):**
```typescript
// 🎯 Thai-friendly slug generation matching Episode model's pre-save hook
function generateSlug(title: string): string {
  if (!title) return `episode-${new Types.ObjectId().toHexString().slice(-8)}`;

  const slug = title
    .toString()
    .normalize('NFC') // รวมพยัญชนะกับสระ/วรรณยุกต์ให้เป็นอักขระเดียว
    .toLowerCase()
    .replace(/\s+/g, '-') // แทนที่ช่องว่างด้วยขีดกลาง
    .replace(/[^\p{L}\p{N}\p{M}-]+/gu, '') // เก็บตัวอักษร, ตัวเลข, เครื่องหมาย (สระ/วรรณยุกต์), และขีดกลาง
    .replace(/--+/g, '-') // ยุบขีดกลางซ้ำ
    .replace(/^-+/, '') // ลบขีดกลางหน้าสุด
    .replace(/-+$/, ''); // ลบขีดกลางท้ายสุด

  if (!slug) {
    return `episode-${new Types.ObjectId().toHexString().slice(-8)}`;
  }

  return slug.substring(0, 280); // จำกัดความยาว
}
```

**ตัวอย่างการทำงาน:**
- Input: `"การมาถึงย่านเก่า"`
- Output: `"การมาถึงย่านเก่า"` (เก็บสระและวรรณยุกต์ไว้)
- ไม่ใช่: `"กรมถงยนเก"` (เสียสระ)

---

### 4. Node และ Edge ไม่แสดงผลตามตอนที่ถูกต้อง
**ปัญหา:** เมื่อแก้ไข nodes/edges ไปซักพัก จะหายไป เพราะไม่ได้ persist ไปยัง StoryMap ของตอนที่ถูกต้อง

**การแก้ไข:**

#### 4.1 เพิ่ม `episodeId` tag ให้กับ nodes และ edges
```typescript
// Tag nodes with episodeId
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

// Tag edges with episodeId
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
  // ... rest of edge config
}));
```

#### 4.2 อัปเดตฟังก์ชัน `loadStoryMapForEpisode()`
- เพิ่ม logging เพื่อ debug
- จัดการกรณี 404 (ตอนใหม่ที่ยังไม่มี storymap)
- แสดงชื่อตอนที่โหลดสำเร็จ

```typescript
console.log(`🔍 Fetching StoryMap for Episode ID: ${episodeId}`);
const response = await fetch(`/api/novels/${novel.slug}/episodes/${episodeId}/storymap`);

if (response.ok) {
  // ... load and display nodes/edges
  console.log(`✅ โหลด StoryMap สำหรับ Episode ${episodeId} สำเร็จ:`, {
    nodes: reactFlowNodes.length,
    edges: reactFlowEdges.length,
    episodeTitle: episodeStoryMap.episode?.title
  });
} else if (response.status === 404) {
  // ตอนใหม่ที่ยังไม่มี storymap - แสดง canvas เปล่า
  setNodes([]);
  setEdges([]);
  setCurrentEpisodeStoryMap({ nodes: [], edges: [], storyVariables: [], version: 1 });
}
```

#### 4.3 ลบการ auto-select episode แรก
```typescript
// 🎯 PROFESSIONAL: Don't auto-select any episode - require manual selection
useEffect(() => {
  // Clear selection when no episodes exist
  if (episodeList.length === 0 && currentEpisodeId) {
    setCurrentEpisodeId(null);
    setSelectedEpisodeFromBlueprint(null);
    loadStoryMapForEpisode(null);
  }
  // ❌ REMOVED: Auto-selection of first episode
  // User must manually select episode to edit
}, [episodeList, currentEpisodeId, loadStoryMapForEpisode]);
```

---

## 🔄 การทำงานหลังการแก้ไข

### Flow การใช้งานใหม่:

1. **เมื่อเปิดหน้า Overview:**
   - ถ้าไม่มีตอน → แสดง tutorial "สร้างตอนแรก"
   - ถ้ามีตอนแต่ยังไม่เลือก → แสดง tutorial "เลือกตอนเพื่อเริ่มแก้ไข"
   - ถ้าเลือกตอนแล้ว → ซ่อน tutorial และแสดง canvas

2. **เมื่อเลือกตอน:**
   - โหลด StoryMap เฉพาะของตอนนั้นจาก API: `/api/novels/[slug]/episodes/[episodeId]/storymap`
   - แสดง nodes และ edges ที่ถูกต้องของตอนนั้น
   - Tag nodes/edges ด้วย episodeId เพื่อ persist ได้ถูกต้อง

3. **เมื่อสร้างตอนใหม่:**
   - ใช้ slug generation ที่รองรับภาษาไทย
   - สร้าง StoryMap เปล่าสำหรับตอนนั้นโดยอัตโนมัติ
   - Auto-select ตอนที่สร้างใหม่

4. **เมื่อแก้ไข nodes/edges:**
   - บันทึกไปยัง StoryMap ของตอนที่เลือกอยู่
   - ใช้ episodeId จาก node/edge data เพื่อ save ไปที่ถูกต้อง

---

## 🎯 มาตรฐานที่ใช้

### 1. Episode Slug Format (ตาม Episode.ts model)
- ใช้ Unicode normalization (NFC)
- เก็บตัวอักษรภาษาไทยพร้อมสระและวรรณยุกต์
- Pattern: `\p{L}\p{N}\p{M}` (Letters, Numbers, Marks)
- ความยาวสูงสุด: 280 characters
- Fallback: `episode-{randomId}` เมื่อไม่สามารถสร้าง slug ได้

### 2. Episode Display Format (ตาม read page)
- Format: `{episodeOrder}-{slug}`
- ตัวอย่าง: `"1-การมาถึงย่านเก่า"`, `"2-พบกับอาจารย์"`
- ตรงกับ URL pattern ในหน้าอ่าน

### 3. StoryMap Storage (ตาม StoryMap.ts model)
- แต่ละ Episode มี StoryMap แยกต่างหาก
- เก็บใน field: `StoryMap.episodeId`
- API endpoint: `/api/novels/[slug]/episodes/[episodeId]/storymap`

---

## ✅ การทดสอบที่แนะนำ

### Test Case 1: Tutorial Display
- [ ] เปิด novel ที่ไม่มีตอน → ควรเห็น tutorial "สร้างตอนแรก"
- [ ] เปิด novel ที่มีตอนแต่ไม่เลือก → ควรเห็น tutorial "เลือกตอน"
- [ ] เลือกตอน → tutorial ควรหาย

### Test Case 2: Thai Episode Name
- [ ] สร้างตอนชื่อ "การผจญภัย" → slug ควรเป็น "การผจญภัย" (ไม่สูญเสียสระ)
- [ ] Dropdown ควรแสดง "1-การผจญภัย"
- [ ] URL หน้าอ่านควรเป็น `/read/[novel]/1-การผจญภัย`

### Test Case 3: Node/Edge Persistence
- [ ] เลือกตอน A → เพิ่ม node → เปลี่ยนไปตอน B → กลับมาตอน A
- [ ] Node ที่เพิ่มไว้ควรยังอยู่
- [ ] เลือกตอน A → เพิ่ม node → Refresh หน้า → เลือกตอน A อีกครั้ง
- [ ] Node ควรโหลดมาได้

### Test Case 4: Empty Episode
- [ ] สร้างตอนใหม่ → เลือกทันที → ควรเห็น canvas เปล่า (ไม่ error)
- [ ] เพิ่ม nodes ได้ปกติ

---

## 📚 ไฟล์ที่เกี่ยวข้อง

### Backend Models
- `src/backend/models/Episode.ts` - Episode schema with Thai-friendly slug
- `src/backend/models/StoryMap.ts` - StoryMap schema with episodeId field

### API Routes
- `src/app/api/novels/[slug]/episodes/blueprint/route.ts` - Episode CRUD for Blueprint
- `src/app/api/novels/[slug]/episodes/[episodeId]/storymap/route.ts` - Episode-specific StoryMap API

### Frontend Components
- `src/app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx` - Main Blueprint editor
- `src/app/read/[novelSlug]/[episodeSlug]/page.tsx` - Read page (reference for slug format)

---

## 🔍 Breaking Changes

**ไม่มี Breaking Changes** - การแก้ไขนี้เป็น backward compatible:
- Slug generation ใหม่จะทำงานกับตอนใหม่
- ตอนเก่าที่มี slug อยู่แล้วจะยังใช้งานได้
- Tutorial ใหม่จะแสดงเฉพาะเมื่อจำเป็น
- การโหลด StoryMap จะจัดการกรณี 404 อย่างถูกต้อง

---

## 📝 หมายเหตุ

1. การเปลี่ยนแปลงนี้แก้ไขปัญหาตามคำร้องเรียนทั้ง 4 ข้อ
2. ทุกการเปลี่ยนแปลงเป็นไปตามมาตรฐานของ codebase
3. ใช้รูปแบบ slug เดียวกันกับ Episode model และหน้าอ่าน
4. เพิ่ม logging เพื่อให้ debug ง่ายขึ้น
5. จัดการ edge cases เช่น 404, empty episodes อย่างเหมาะสม

---

**สถานะ:** ✅ แก้ไขเสร็จสมบูรณ์  
**Linter Errors:** ไม่มี (มีเฉพาะ warnings เกี่ยวกับ inline styles ที่มีอยู่แล้วก่อนหน้านี้)

