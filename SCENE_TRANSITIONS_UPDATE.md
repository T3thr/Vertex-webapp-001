# Scene Transitions Implementation

## การเพิ่มตัวเลือก Transition สำหรับการเปลี่ยน Scene

### 🎯 เป้าหมาย
เพิ่มความหลากหลายของ animation transition ระหว่างการเปลี่ยน scene โดยมีตัวเลือก `none` ที่ไม่มีการ animation เพื่อดีต่อ UX/UI เมื่อ background ไม่เปลี่ยน

### 📋 การเปลี่ยนแปลง

#### 1. **TheWhisperOf999.ts** - เพิ่ม Transition Settings
- ✅ เพิ่ม `sceneTransitionOut` ในทุก scene object
- ✅ ใช้ `type: 'none'` เมื่อ background ของ scene ถัดไปเดียวกัน
- ✅ ใช้ `type: 'fade'` เมื่อ background เปลี่ยน
- ✅ กำหนด `durationSeconds` ที่เหมาะสมสำหรับแต่ละ transition

#### 2. **VisualNovelContent.tsx** - อัปเดต Animation Logic
- ✅ เพิ่ม type definition สำหรับ `sceneTransitionOut`
- ✅ เพิ่ม state `previousScene` เพื่อเก็บข้อมูล scene ก่อนหน้า
- ✅ อัปเดต background animation ให้รองรับ transition types:
  - `none`: ไม่มี animation (opacity ยังคงเป็น 1)
  - `fade`: fade in/out effect
  - `slide_left/right/up/down`: slide effects
  - `zoom_in/out`: scale effects

### 🎨 Transition Types ที่รองรับ

1. **`none`** - ไม่มี animation (0 วินาที)
   - ใช้เมื่อ background เดียวกัน
   - เพื่อ UX ที่ไม่กระพริบ

2. **`fade`** - Fade in/out effect (0.6-1.2 วินาที)
   - ใช้เมื่อเปลี่ยน background
   - Dramatic effect สำหรับ ending scenes

3. **อื่นๆ** - Slide, Zoom effects (พร้อมใช้งาน)
   - สามารถขยายเพิ่มได้ในอนาคต

### 📊 สถิติการใช้งานใน TheWhisperOf999

- **Total Scenes**: 29 scenes
- **None Transitions**: 15 scenes (51.7%)
- **Fade Transitions**: 14 scenes (48.3%)

### 🔧 Implementation Details

#### Scene Transition Flow:
```
Previous Scene -> [sceneTransitionOut] -> Current Scene
```

#### Updated Logic (v2):
```typescript
// ตรวจสอบ transition type จาก previous scene
if (transitionType === 'none') {
  setShouldTransition(false); // ไม่มี animation เลย
} else {
  setShouldTransition(true);   // ใช้ smooth transition
}
```

#### Background Rendering:
- **shouldTransition = true**: ใช้ AnimatePresence + motion.div
- **shouldTransition = false**: ใช้ static div (ไม่กระพริบ)

#### Animation Properties:
- **None**: Static background, ไม่มี animation
- **Fade**: Smooth fade in/out effect
- **Duration**: ปรับตาม sceneTransitionOut.durationSeconds

### 🚀 Benefits

1. **Perfect UX for 'none'**: ไม่มีการกระพริบหรือเปลี่ยนแปลงใดๆ ให้รู้สึกเป็นฉากเดียวยาว
2. **Smooth 'fade'**: Fade transition ที่นุ่มนวล เพื่อแจ้งให้ผู้อ่านรู้ว่าเนื้อเรื่องเปลี่ยนพื้นหลังแล้ว
3. **True to Name**: Transition ทำงานตามชื่อของมันอย่างแท้จริง
4. **Performance**: Static rendering สำหรับ 'none' ประหยัดทรัพยากร
5. **Extensible**: พร้อมขยายเพิ่ม transition types อื่นๆ

### 🔮 Future Enhancements

1. **Wipe Effects**: Left, Right, Up, Down
2. **Dissolve Effects**: More complex transitions
3. **Custom Parameters**: ปรับแต่ง transition ได้มากขึ้น
4. **Scene-Specific Timing**: ปรับเวลาตาม content

### 📝 Code Examples

#### Scene Definition with Transition:
```typescript
{
  sceneOrder: 1,
  nodeId: 'scene_arrival',
  background: { type: 'image', value: '/images/bg1.png' },
  sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Same background
  textContents: [...]
},
{
  sceneOrder: 2,  
  background: { type: 'image', value: '/images/bg2.png' },
  sceneTransitionOut: { type: 'fade', durationSeconds: 0.6 }, // Different background
  textContents: [...]
}
```

#### Animation Implementation:
```typescript
initial={{
  opacity: previousScene?.sceneTransitionOut?.type === 'none' ? 1 : 0,
}}
transition={{ 
  duration: previousScene?.sceneTransitionOut?.type === 'none' 
    ? 0 
    : (previousScene?.sceneTransitionOut?.durationSeconds ?? 0.6)
}}
```

---

**สร้างเมื่อ**: วันที่สร้างเอกสาร  
**อัปเดตล่าสุด**: วันที่อัปเดตล่าสุด  
**Status**: ✅ พร้อมใช้งาน