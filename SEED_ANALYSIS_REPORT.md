# การวิเคราะห์และรายงานการ Seed ข้อมูลนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"

## 📋 ภาพรวม

นิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999" เป็นนิยายสยองขวัญจิตวิทยาที่มีโครงสร้างแบบ **Multiple Endings** โดยปัจจุบันมีเพียง **Episode 1** เท่านั้น

## 🏗️ โครงสร้างข้อมูล

### 📚 Novel (นิยาย)
- **Title**: เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999
- **Slug**: เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999
- **Ending Type**: `MULTIPLE_ENDINGS`
- **Status**: `PUBLISHED`
- **Total Episodes**: 1 (ปัจจุบัน)
- **Content Type**: `INTERACTIVE_FICTION`

### 📖 Episode 1: บทที่ 1: ย้ายเข้า
- **Episode Order**: 1
- **Access Type**: `FREE`
- **Status**: `PUBLISHED`
- **Scenes Count**: 29 scenes
- **First Scene ID**: `scene_arrival`

## 🎬 Scenes Structure (29 Scenes)

### Phase 1: การแนะนำ (Scenes 1-6)
1. **scene_arrival** - การมาถึงบ้าน
2. **scene_key_exchange** - รับกุญแจจากนายหน้า
3. **scene_nira_thoughts** - ความคิดของนิรา
4. **scene_agent_warning** - คำเตือนลึกลับ
5. **scene_enter_house** - เข้าบ้าน
6. **scene_first_choice** - การตัดสินใจแรก (3 choices)

### Phase 2: การสำรวจ (Scenes 7-13)
7. **scene_explore_downstairs_1** - สำรวจชั้นล่าง
8. **scene_found_box** - กล่องไม้เก่า
9. **scene_found_tape** - เทปลึกลับ
10. **scene_tape_choice** - การตัดสินใจกับเทป (3 choices)
11. **scene_listen_tape_1** - เสียงจากเทป
12. **scene_secret_door** - ประตูลับ
13. **scene_secret_door_choice** - การตัดสินใจกับประตูลับ (3 choices)

### Phase 3: Endings (Scenes 14-29)

#### Branch 1: เปิดประตูลับ (Scenes 14-16)
14. **scene_enter_basement_1** - ห้องใต้ดิน
15. **scene_basement_encounter** - เผชิญหน้า
16. **scene_bad_ending_1** - BAD ENDING: เสียงสุดท้าย

#### Branch 2: ส่งรูป (Scenes 17-19)
17. **scene_send_photo_1** - คำเตือนจากเพื่อน
18. **scene_other_doors** - ประตูบานอื่น
19. **scene_bad_ending_2** - BAD ENDING: เสียงที่ถูกเลือก

#### Branch 3: ล็อกประตู (Scenes 20-29)
20. **scene_lock_door_1** - ผนึกประตู
21. **scene_vigil** - เฝ้าระวัง
22. **scene_lock_door_choice** - ทางเลือกต่อไป (3 choices)

##### Sub-branch 3.1: เสริมประตู (Scenes 23-24)
23. **scene_reinforce_door_1** - เสริมความแข็งแกร่ง
24. **scene_bad_ending_3** - BAD ENDING: มืออีกข้าง

##### Sub-branch 3.2: ติดกล้อง (Scenes 25-26)
25. **scene_setup_camera_1** - ติดตั้งกล้อง
26. **scene_bad_ending_4** - BAD ENDING: ถึงตาเธอ

##### Sub-branch 3.3: ทำลายล้าง (Scenes 27-28)
27. **scene_destroy_door_1** - ทำลายล้าง
28. **scene_bad_ending_5** - TRUE ENDING: รอยยิ้มสุดท้าย

#### Final Scene (Scene 29)
29. **scene_end_of_prologue** - จบบทที่ 1 (สำหรับ multiple endings)

## 🎭 Characters (ตัวละคร)

### ตัวละครหลัก
- **Nira** - ตัวละครหลัก ผู้หญิงที่ย้ายเข้าบ้านใหม่
- **Agent** - นายหน้าอสังหาริมทรัพย์

## 🎯 Choices (ตัวเลือก)

### การตัดสินใจแรก (Scene 6)
- **CHOICE_EXPLORE** - สำรวจบ้าน
- **CHOICE_CLEAN** - ทำความสะอาด
- **CHOICE_CALL** - โทรหาเพื่อน

### การตัดสินใจกับเทป (Scene 10)
- **CHOICE_LISTEN_NOW** - ฟังทันที
- **CHOICE_LISTEN_LATER** - ฟังทีหลัง
- **CHOICE_BURN_TAPE** - เผาเทป

### การตัดสินใจกับประตูลับ (Scene 13)
- **CHOICE_OPEN_SECRET_DOOR** - เปิดประตูลับ
- **CHOICE_TAKE_PHOTO** - ถ่ายรูปส่งเพื่อน
- **CHOICE_LOCK_DOOR** - ล็อกประตู

### ทางเลือกต่อไป (Scene 22)
- **CHOICE_REINFORCE_DOOR** - เสริมประตู
- **CHOICE_SETUP_CAMERA** - ติดกล้อง
- **CHOICE_DESTROY_DOOR** - ทำลายล้าง

## 🏁 Endings (ฉากจบ)

### BAD Endings (4 ฉาก)
1. **bad_ending_1** - เสียงสุดท้าย (จากเปิดประตูลับ)
2. **bad_ending_2** - เสียงที่ถูกเลือก (จากส่งรูป)
3. **bad_ending_3** - มืออีกข้าง (จากเสริมประตู)
4. **bad_ending_4** - ถึงตาเธอ (จากติดกล้อง)

### TRUE Ending (1 ฉาก)
5. **true_ending** - รอยยิ้มสุดท้าย (จากทำลายล้าง)

## 🔗 Scene Transitions

### การเชื่อมต่อฉาก
- **Linear Flow**: Scenes 1-6 เชื่อมต่อแบบเส้นตรง
- **Branching**: Scene 6 แยกเป็น 3 branches
- **Choice-based**: แต่ละ branch มี choices ที่นำไปสู่ endings ต่างๆ
- **Ending Scenes**: ทุก ending scene มี `ending` object ที่กำหนดประเภทและรายละเอียด

## 📊 Story Variables

### ตัวแปรเรื่องราว
- **karma**: ค่ากรรมของตัวละครหลัก (0-100)
- **has_explored_basement**: เช็คว่าเข้าไปในห้องใต้ดินแล้วหรือยัง
- **tape_listened**: เช็คว่าฟังเทปแล้วหรือยัง

## 🎮 Gameplay Features

### Multiple Endings System
- **5 Endings**: 4 BAD + 1 TRUE
- **Choice-driven**: การตัดสินใจกำหนดชะตากรรม
- **Branching Narrative**: เรื่องราวแยกเป็นหลายเส้นทาง

### Visual Novel Elements
- **Background Images**: ใช้ภาพพื้นหลังที่แตกต่างกัน
- **Character Sprites**: ตัวละครแสดงในฉากต่างๆ
- **Text Content**: บทสนทนาและบรรยาย
- **Scene Transitions**: การเปลี่ยนฉากแบบ fade

## 🚀 การใช้งาน

### การ Seed ข้อมูล
```bash
# รัน script seeding
npm run seed:novel-1

# หรือรันโดยตรง
npx ts-node src/scripts/seed-novel-1.ts
```

### การเข้าถึง
- **URL**: `/read/เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999/chapter-1-moving-in`
- **Episode**: Episode 1 (ฟรี)
- **Scenes**: 29 scenes ใน Episode 1

## 📈 สถิติ

### Novel Stats
- **Views**: 852,345
- **Likes**: 14,876
- **Comments**: 1,045
- **Followers**: 1,234
- **Average Rating**: 4.85/5

### Episode Stats
- **Scenes**: 29
- **Estimated Reading Time**: 75 minutes
- **Total Words**: 15,000

## 🔧 Technical Details

### Database Models Used
- **NovelModel**: ข้อมูลนิยาย
- **EpisodeModel**: ข้อมูลตอน
- **SceneModel**: ข้อมูลฉาก
- **CharacterModel**: ข้อมูลตัวละคร
- **ChoiceModel**: ข้อมูลตัวเลือก
- **StoryMapModel**: ข้อมูลแผนที่เรื่องราว

### File Structure
```
src/
├── data/
│   └── TheWhisperOf999.ts          # ข้อมูลนิยาย
├── scripts/
│   └── seed-novel-1.ts             # Script seeding
└── backend/models/
    ├── Novel.ts                     # Model นิยาย
    ├── Episode.ts                   # Model ตอน
    ├── Scene.ts                     # Model ฉาก
    ├── Character.ts                 # Model ตัวละคร
    ├── Choice.ts                    # Model ตัวเลือก
    └── StoryMap.ts                  # Model แผนที่เรื่องราว
```

## 🎯 การพัฒนาต่อ

### Episode 2+ (อนาคต)
- เพิ่ม `totalEpisodesCount` ใน Novel
- สร้าง Episode ใหม่ใน `createWhisper999Novel`
- เพิ่ม scenes สำหรับ Episode ใหม่
- อัปเดต `nextEpisodeId` และ `previousEpisodeId`

### การปรับปรุง
- เพิ่ม Background Music
- เพิ่ม Voice Over
- เพิ่ม Character Animations
- เพิ่ม Special Effects

---

**หมายเหตุ**: นิยายนี้เป็นตัวอย่างการใช้งานระบบ Visual Novel ที่สมบูรณ์แบบ โดยมีการจัดการ scenes, choices, endings และ story flow ที่ซับซ้อน