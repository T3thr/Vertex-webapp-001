# Blueprint Tab - การแก้ไขปัญหาสำคัญ 3 ประการ

## 📋 สรุปปัญหาและการแก้ไข

### 1. ❌ ปัญหา: Error ขณะบันทึก StoryMap
**ปัญหา:** เมื่อเพิ่ม start node และ scene node แล้วกดบันทึก เกิด error:
```
Error: [SingleUserEventManager] ❌ Server error details: {}
```

**สาเหตุ:** การแปลง `nodeType` จาก ReactFlow format ไปเป็น MongoDB format ไม่ถูกต้อง
- ReactFlow เก็บ `nodeType` ใน `node.data.nodeType`
- แต่ตอนบันทึกดึงจาก `node.type` หรือ `node.nodeType` แทน ทำให้ส่งค่าผิด

**การแก้ไข:** ✅ 
- แก้ไข `SingleUserEventManager.ts` ฟังก์ชัน `saveManual()` 
- ดึง `nodeType` จาก `node.data.nodeType` เป็นตัวเลือกแรก
- เพิ่มข้อมูลเพิ่มเติมเช่น `notesForAuthor`, `authorDefinedEmotionTags`, `editorVisuals` ให้ครบถ้วน

```typescript:src/app/novels/[slug]/overview/components/tabs/SingleUserEventManager.ts
// ทำความสะอาดข้อมูล nodes ให้ตรงกับ IStoryMapNode interface
const cleanedNodes = nodes.map(node => {
  // 🔥 CRITICAL FIX: Extract nodeType properly from node.data.nodeType (ReactFlow format)
  const nodeType = node.data?.nodeType || node.nodeType || node.type || 'scene_node';
  
  return {
    nodeId: node.id || node.nodeId,
    nodeType: nodeType,
    title: node.data?.title || node.title || 'Untitled Node',
    position: { 
      x: Math.round(node.position?.x || 0), 
      y: Math.round(node.position?.y || 0)
    },
    nodeSpecificData: node.data?.nodeSpecificData || {},
    notesForAuthor: node.data?.notesForAuthor || '',
    authorDefinedEmotionTags: node.data?.authorDefinedEmotionTags || [],
    editorVisuals: {
      color: node.data?.editorVisuals?.color || node.data?.color || '#3b82f6',
      orientation: node.data?.editorVisuals?.orientation || node.data?.orientation || 'vertical',
      icon: node.data?.editorVisuals?.icon || 'circle',
      borderStyle: node.data?.editorVisuals?.borderStyle || 'solid'
    }
  };
});
```

**ผลลัพธ์:** สามารถบันทึก start node และ scene node ได้สำเร็จ ไม่มี error

---

### 2. 🎨 ปัญหา: START_NODE และ SCENE_NODE ดูไม่แตกต่างกัน
**ปัญหา:** START_NODE ควรมี UI ที่แตกต่างจาก SCENE_NODE อย่างชัดเจน

**การแก้ไข:** ✅ START_NODE มีลักษณะพิเศษดังนี้:

**UI ของ START_NODE:**
- 🟢 **สีเขียว Emerald** (`#22c55e`) แทนสีฟ้า
- ⭕ **รูปร่างวงกลมเต็ม** (`rounded-full`) แทนสี่เหลี่ยมมุมมน
- ✨ **มีไอคอน Crown สีทอง** ที่มุมบนขวา เพื่อเน้นว่าเป็นจุดเริ่มต้น
- 🎯 **มี Handle เพียงด้านล่าง** (output only) ไม่รับ input จากโหนดอื่น
- 💎 **Gradient สีเขียว** `from-emerald-400 via-emerald-500 to-emerald-600`
- 🌟 **Shadow Effect** เป็นสีเขียวแทนสีฟ้า

```typescript:src/app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx
case StoryMapNodeType.START_NODE: return {
  gradient: 'from-emerald-400 via-emerald-500 to-emerald-600',
  shadow: 'shadow-emerald-500/30 shadow-lg',
  glow: 'shadow-emerald-400/60 shadow-xl',
  ring: 'ring-emerald-300',
  shape: 'rounded-full',
  handles: getHandlesForOrientation({ top: false, bottom: true, left: false, right: false }),
  sparkle: false,
  isSpecial: true
};
```

**ผลลัพธ์:** START_NODE มี UI ที่โดดเด่นและแตกต่างจาก SCENE_NODE อย่างชัดเจน

---

### 3. 🔄 ปัญหา: การเลือกตอนและการแก้ไขหายไปเมื่อเปลี่ยน Tab
**ปัญหา:** 
- เมื่อเลือก Episode ใน Blueprint Tab แล้วไปที่ Director Tab
- กลับมายัง Blueprint Tab ทำให้การเลือก Episode รีเซ็ต
- การแก้ไข node ที่ยังไม่ได้เซฟหายหมด
- หน้าจอ Blueprint มักจะขาวเปล่า ต้องเพิ่ม node ใหม่หรือกด undo/redo เพื่อให้แสดง node

**สาเหตุ:** 
- ไม่ได้ใช้ URL persistence สำหรับ episode selection
- Tab Component ทำ unmount/remount เมื่อเปลี่ยน tab
- State และ ReactFlow nodes หายไปเมื่อ component ถูก unmount

**การแก้ไข:** ✅ 

#### 3.1 เพิ่ม URL-based Episode Selection
```typescript:src/app/novels/[slug]/overview/components/NovelEditor.tsx
// 🔥 NEW: Sync episode selection to URL and event manager
const handleEpisodeSelect = useCallback((episodeId: string | null) => {
  setSelectedEpisodeId(episodeId)
  
  // Update URL without page reload
  const currentParams = new URLSearchParams(searchParams.toString())
  if (episodeId) {
    currentParams.set('episode', episodeId)
  } else {
    currentParams.delete('episode')
  }
  
  const newUrl = `${window.location.pathname}?${currentParams.toString()}`
  router.replace(newUrl, { scroll: false })
  
  // Update event manager config
  eventManager.updateConfig({ selectedEpisodeId: episodeId })
  
  console.log('[NovelEditor] 🎯 Episode selected:', episodeId)
}, [router, searchParams, eventManager])
```

#### 3.2 ใช้ `forceMount` และ `hidden` แทน conditional rendering
```typescript:src/app/novels/[slug]/overview/components/NovelEditor.tsx
{/* เปลี่ยนจาก conditional rendering เป็น forceMount */}
<TabsContent 
  value="blueprint" 
  className="h-full m-0 p-0" 
  forceMount={true} 
  hidden={activeTab !== 'blueprint'}
>
  <BlueprintTab ... />
</TabsContent>

<TabsContent 
  value="director" 
  className="h-full m-0 p-0" 
  forceMount={true} 
  hidden={activeTab !== 'director'}
>
  <DirectorTab ... />
</TabsContent>

<TabsContent 
  value="summary" 
  className="h-full m-0 p-0" 
  forceMount={true} 
  hidden={activeTab !== 'summary'}
>
  <SummaryTab ... />
</TabsContent>
```

**ผลลัพธ์:**
- ✅ Episode selection ถูกเก็บใน URL (`?episode=xxx`)
- ✅ เมื่อเปลี่ยน tab แล้วกลับมา episode selection ยังคงอยู่
- ✅ การแก้ไข node ที่ยังไม่ได้เซฟไม่หายไป
- ✅ ไม่มีปัญหา node disappear/flickering เพราะ component ไม่ unmount
- ✅ EventManager state ถูกอัปเดตตาม episode selection

---

## 🎯 สรุป

### ไฟล์ที่แก้ไข
1. `src/app/novels/[slug]/overview/components/tabs/SingleUserEventManager.ts`
   - แก้การดึง `nodeType` จาก ReactFlow format
   - เพิ่มข้อมูล `notesForAuthor`, `authorDefinedEmotionTags`, `editorVisuals`

2. `src/app/novels/[slug]/overview/components/NovelEditor.tsx`
   - เพิ่ม `handleEpisodeSelect` พร้อม URL sync และ EventManager update
   - เปลี่ยนจาก conditional rendering เป็น `forceMount` + `hidden`
   - ส่ง `onEpisodeSelect` ไปยัง BlueprintTab

3. `src/app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx`
   - START_NODE มี UI ที่แตกต่างจาก SCENE_NODE อย่างชัดเจน
   - มีการเรียก `onEpisodeSelect` callback เมื่อเลือก episode

### ผลลัพธ์
- ✅ บันทึก StoryMap ได้สำเร็จไม่มี error
- ✅ START_NODE มี UI สีเขียววงกลมพร้อม crown icon ชัดเจน
- ✅ Episode selection persist ข้าม tab ผ่าน URL
- ✅ การแก้ไขไม่หายเมื่อเปลี่ยน tab
- ✅ ไม่มีปัญหา node disappear/flickering

### UX ที่ดีขึ้น
- 🔗 **URL Sharing**: สามารถแชร์ URL พร้อม episode ที่เลือกได้
- 💾 **State Preservation**: ไม่มีการสูญเสีย state เมื่อเปลี่ยน tab
- 🎨 **Visual Clarity**: START_NODE โดดเด่นชัดเจน
- ⚡ **Performance**: ไม่ต้อง remount component ทุกครั้งที่เปลี่ยน tab

