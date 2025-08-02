# ระบบ Multiple Endings ใน VisualNovelContent Component

## 🎭 ภาพรวม

ระบบ Multiple Endings ถูกออกแบบมาเพื่อรองรับนิยายที่มีฉากจบหลายแบบใน episode เดียวกัน โดยจะแสดง ending screen ทันทีเมื่อผู้เล่นเข้าถึง scene ที่มี `ending` field กำหนดไว้

## 🔧 การทำงาน

### 1. การตรวจสอบ Ending Scene

**VisualNovelContent Component** จะตรวจสอบ ending field ใน 2 จุด:

#### A. เมื่อเข้าสู่ Scene ใหม่
```typescript
useEffect(() => {
  const scene = episodeData?.scenes?.find(s => s._id === currentSceneId) ?? null;
  if (scene) {
    // ... scene setup logic ...
    
    // 🎭 MULTIPLE ENDINGS: ตรวจสอบ ending field ทันทีเมื่อเข้าสู่ scene
    if (scene.ending) {
      const novelMeta = episodeData?.novelMeta || novel;
      
      if (novelMeta.endingType === 'multiple_endings') {
        // สำหรับ MULTIPLE_ENDINGS: แสดง ending screen ทันที
        console.log(`🎊 Showing MULTIPLE_ENDINGS ending: "${scene.ending.title}"`);
        onEpisodeEnd(scene.ending);
        return; // หยุดการเล่นทันที
      }
      // ... other ending type checks ...
    }
  }
}, [currentSceneId, episodeData, ...]);
```

#### B. เมื่อกด Advance (handleAdvance)
```typescript
const handleAdvance = useCallback(() => {
  // ... text completion logic ...
  
  if (currentScene.ending) {
    // 🎭 MULTIPLE ENDINGS: ตรวจสอบ ending field ใน scene ปัจจุบัน
    console.log(`🎭 Ending scene detected in handleAdvance: "${currentScene.ending.title}"`);
    
    if (novelMeta.endingType === 'multiple_endings') {
      // สำหรับ MULTIPLE_ENDINGS: แสดง ending screen ทันที
      console.log(`🎊 Showing MULTIPLE_ENDINGS ending: "${currentScene.ending.title}"`);
      onEpisodeEnd(currentScene.ending);
      return; // หยุดการเล่นทันที
    }
    // ... other ending type checks ...
  }
}, [isTyping, textIndex, currentScene, ...]);
```

### 2. การจัดการ Novel Types

#### Multiple Endings (`multiple_endings`)
- **พฤติกรรม**: แสดง ending screen ทันทีเมื่อถึง scene ที่มี ending field
- **การหยุด**: หยุดการเล่นทันทีหลังจากแสดง ending
- **การต่อเนื่อง**: ไม่มีการเล่นฉากใดๆ หลังจาก ending

#### Single Ending (`single_ending`)
- **พฤติกรรม**: แสดง ending เฉพาะตอนสุดท้ายของ episode สุดท้าย
- **การหยุด**: หยุดการเล่นเมื่อถึงฉากสุดท้ายของตอนสุดท้าย
- **การต่อเนื่อง**: เล่นต่อเนื่องโดยไม่มีฉากจบมาคั่น

## 📚 TheWhisperOf999 Novel Structure

### Ending Scenes ใน Episode 1

| Scene Order | Node ID | Title | Ending Type | Description |
|-------------|---------|-------|-------------|-------------|
| 16 | `scene_bad_ending_1` | เสียงสุดท้าย | BAD | นิรากลายเป็นเสียงในเทปอันต่อไป |
| 19 | `scene_bad_ending_2` | เสียงที่ถูกเลือก | BAD | นิราหายตัวไปอย่างลึกลับ |
| 24 | `scene_bad_ending_3` | มืออีกข้าง | BAD | สิ่งลี้ลับได้เข้ามาอยู่ในตัวเธอ |
| 26 | `scene_bad_ending_4` | ถึงตาเธอ | BAD | การสังเกตการณ์จากระยะไกลไม่ได้ผล |
| 28 | `scene_bad_ending_5` | รอยยิ้มสุดท้าย | TRUE | ปลดปล่อยวิญญาณเด็กสาว |
| 29 | `scene_end_of_prologue` | จบบทที่ 1 | NORMAL | จบตอนแรกของเรื่อง |

### Scene Flow

```
Scene 1-6: การแนะนำ → Scene 6: การตัดสินใจแรก (3 choices)
├─ CHOICE_EXPLORE → Scene 7-16: สำรวจ → BAD ENDING 1
├─ CHOICE_CLEAN → NORMAL ENDING (choice-based)
└─ CHOICE_CALL → NORMAL ENDING (choice-based)

Scene 10: การตัดสินใจกับเทป (3 choices)
├─ CHOICE_LISTEN_NOW → Scene 11-16: ฟังเทป → BAD ENDING 1
├─ CHOICE_LISTEN_LATER → NORMAL ENDING (choice-based)
└─ CHOICE_BURN_TAPE → BAD ENDING (choice-based)

Scene 13: การตัดสินใจกับประตูลับ (3 choices)
├─ CHOICE_OPEN_SECRET_DOOR → Scene 14-16: เปิดประตู → BAD ENDING 1
├─ CHOICE_TAKE_PHOTO → Scene 17-19: ส่งรูป → BAD ENDING 2
└─ CHOICE_LOCK_DOOR → Scene 20-29: ล็อกประตู → Multiple Endings

Scene 22: ทางเลือกต่อไป (3 choices)
├─ CHOICE_REINFORCE_DOOR → Scene 23-24: เสริมประตู → BAD ENDING 3
├─ CHOICE_SETUP_CAMERA → Scene 25-26: ติดกล้อง → BAD ENDING 4
└─ CHOICE_DESTROY_DOOR → Scene 27-28: ทำลายล้าง → TRUE ENDING
```

## 🎯 การทำงานร่วมกับ VisualNovelContent

### 1. Ending Detection
```typescript
// ตรวจสอบ ending field ใน scene
if (scene.ending) {
  console.log(`🎭 Ending scene detected: "${scene.ending.title}"`);
  
  if (novelMeta.endingType === 'multiple_endings') {
    onEpisodeEnd(scene.ending);
    return; // หยุดการเล่นทันที
  }
}
```

### 2. Episode End Handling
```typescript
// เรียกใช้ onEpisodeEnd callback
onEpisodeEnd: (ending?: ISceneEnding) => void;

// ตัวอย่างการใช้งาน
if (ending) {
  // แสดง ending screen
  showEndingScreen(ending);
} else {
  // จบ episode โดยไม่แสดง ending
  endEpisode();
}
```

### 3. Choice-based Endings
```typescript
// การจัดการ ending จาก choice actions
const endBranchAction = choice.actions.find((a: IChoiceAction) => a.type === 'end_novel_branch');

if (endBranchAction) {
  const endingData = {
    endingType: endBranchAction.parameters.endingType || 'NORMAL',
    title: endBranchAction.parameters.endingTitle || 'จบ',
    description: endBranchAction.parameters.outcomeDescription || 'เรื่องจบลงแล้ว',
    endingId: endBranchAction.parameters.endingNodeId || 'ending',
  };
  
  onEpisodeEnd(endingData);
}
```

## 🔄 การพัฒนาต่อ

### สำหรับ Episode 2+ (อนาคต)
1. เพิ่ม `totalEpisodesCount` ใน Novel
2. สร้าง Episode ใหม่ใน `createWhisper999Novel`
3. เพิ่ม scenes สำหรับ Episode ใหม่
4. อัปเดต `nextEpisodeId` และ `previousEpisodeId`

### การปรับปรุงเพิ่มเติม
- เพิ่ม Background Music สำหรับ ending scenes
- เพิ่ม Voice Over สำหรับ ending narration
- เพิ่ม Character Animations ใน ending scenes
- เพิ่ม Special Effects สำหรับ dramatic endings

## 📊 สถิติการใช้งาน

### Ending Distribution
- **BAD Endings**: 4 ฉาก (57%)
- **TRUE Ending**: 1 ฉาก (14%)
- **NORMAL Endings**: 2 ฉาก (29%)

### Scene Distribution
- **Total Scenes**: 29 scenes
- **Ending Scenes**: 6 scenes (21%)
- **Choice Scenes**: 4 scenes (14%)
- **Narrative Scenes**: 19 scenes (65%)

## 🎮 การทดสอบ

### การ Seed ข้อมูล
```bash
npm run seed:novel-1
```

### การเข้าถึงนิยาย
- **URL**: `/read/เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999/chapter-1-moving-in`
- **Episode**: Episode 1 (ฟรี)
- **Scenes**: 29 scenes ใน Episode 1

### การทดสอบ Ending Scenes
1. เล่นจนถึง Scene 16 (BAD ENDING 1)
2. เล่นจนถึง Scene 19 (BAD ENDING 2)
3. เล่นจนถึง Scene 24 (BAD ENDING 3)
4. เล่นจนถึง Scene 26 (BAD ENDING 4)
5. เล่นจนถึง Scene 28 (TRUE ENDING)
6. เล่นจนถึง Scene 29 (NORMAL ENDING)

---

**หมายเหตุ**: ระบบ Multiple Endings นี้ถูกออกแบบมาเพื่อให้ผู้เล่นสามารถเลือกเส้นทางที่แตกต่างกันและได้รับ ending ที่แตกต่างกันตามการตัดสินใจของพวกเขา 