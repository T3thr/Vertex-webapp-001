# The Whisper of 999 - Seed Script

ไฟล์นี้สำหรับ seed ข้อมูลนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999" ลงในฐานข้อมูล

## การใช้งาน

### 1. การรัน Seed Script

```bash
# รัน seed script สำหรับ The Whisper of 999
npm run seed:whisper999

# หรือรันโดยตรง
node scripts/seed-whisper-999.js
```

### 2. ข้อมูลที่จะถูกสร้าง

Script นี้จะสร้างข้อมูลต่อไปนี้:

#### ผู้แต่ง (Author)
- **Username**: `whisper_author` (หรือตาม `AUTHOR_USERNAME` ใน .env)
- **Email**: `whisper_author@example.com`
- **Role**: `WRITER`
- **Profile**: ข้อมูลโปรไฟล์พื้นฐานสำหรับนักเขียนสยองขวัญ

#### หมวดหมู่ (Categories)
- **ภาษาไทย** (LANGUAGE)
- **สยองขวัญ** (GENRE) 
- **จิตวิทยา** (SUB_GENRE)
- **ปริศนา** (SUB_GENRE)
- **ลึกลับ** (MOOD_AND_TONE)
- **น่ากลัว** (MOOD_AND_TONE)
- **18+** (AGE_RATING)

#### นิยาย (Novel)
- **ชื่อ**: "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"
- **Slug**: "whisper-from-apartment-999"
- **ประเภท**: Interactive Fiction
- **สถานะ**: Published
- **จำนวน Episode**: 1

#### ตัวละคร (Characters)
1. **นิรา** - ตัวเอกหญิง (main_protagonist)
2. **นายหน้า** - ตัวประกอบ (supporting_character)

#### ตัวเลือก (Choices)
- `CHOICE_EXPLORE` - เดินสำรวจบ้านชั้นล่างทันที
- `CHOICE_CLEAN` - ทำความสะอาดห้องนั่งเล่นและเปิดผ้าม่าน
- `CHOICE_CALL` - โทรหาเพื่อนเพื่อเล่าเรื่องบ้านใหม่
- `CHOICE_LISTEN_NOW` - กดฟังเทปทันที
- `CHOICE_LISTEN_LATER` - รอให้ถึงตีสาม แล้วฟังตามที่เขียน
- `CHOICE_BURN_TAPE` - เผาเทปทิ้งทันที
- และอื่นๆ

#### Episode
- **บทที่ 1**: "ย้ายเข้า"
- **Slug**: "chapter-1-moving-in"
- **ราคา**: 10 coins
- **สถานะ**: Published

#### ฉาก (Scenes)
10 ฉากหลักสำหรับ Episode 1:
1. การมาถึง
2. รับกุญแจ
3. ความคิดของนิรา
4. คำเตือน
5. เข้าบ้าน
6. การตัดสินใจแรก
7. สำรวจชั้นล่าง
8. กล่องไม้เก่า
9. เทปลึกลับ
10. การตัดสินใจกับเทป

### 3. ข้อกำหนดเบื้องต้น

#### Environment Variables
ตรวจสอบให้แน่ใจว่ามีตัวแปรต่อไปนี้ในไฟล์ `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/your-database
AUTHOR_USERNAME=whisper_author  # (ไม่บังคับ - มีค่าเริ่มต้น)
```

#### Dependencies
Script ใช้ packages ต่อไปนี้:
- `mongoose` - สำหรับเชื่อมต่อฐานข้อมูล MongoDB
- `bcryptjs` - สำหรับเข้ารหัสรหัสผ่าน
- `uuid` - สำหรับสร้าง unique IDs
- `dotenv` - สำหรับอ่าน environment variables

### 4. ข้อมูลสำคัญ

#### สถิติเริ่มต้น
นิยายจะถูกสร้างพร้อมสถิติเริ่มต้นที่น่าประทับใจ:
- Views: 852,345
- Likes: 14,876
- Rating: 4.85/5.0
- Followers: 1,234

#### การตั้งค่าการเงิน
- ราคา Episode: 10 coins
- โปรโมชั่น: ลด 50% (5 coins) เป็นเวลา 7 วัน
- รองรับการบริจาค

### 5. การตรวจสอบ

หลังจากรัน seed script แล้ว คุณสามารถตรวจสอบได้โดย:

1. **ตรวจสอบในฐานข้อมูล**:
   ```bash
   # เชื่อมต่อ MongoDB และตรวจสอบ
   use your-database
   db.novels.findOne({slug: "whisper-from-apartment-999"})
   ```

2. **ตรวจสอบผ่านเว็บไซต์**:
   - เข้าไปที่หน้าค้นหานิยาย
   - ค้นหา "เสียงกระซิบ" หรือ "999"
   - ตรวจสอบว่านิยายปรากฏในผลการค้นหา

### 6. การแก้ไขปัญหา

#### ข้อผิดพลาดทั่วไป

1. **MongoDB Connection Error**:
   ```
   ❌ MONGODB_URI is not defined in your .env file.
   ```
   **แก้ไข**: ตรวจสอบไฟล์ `.env` และเพิ่ม `MONGODB_URI`

2. **Duplicate Key Error**:
   ```
   E11000 duplicate key error
   ```
   **แก้ไข**: นิยายมีอยู่แล้ว script จะข้ามการสร้างอัตโนมัติ

3. **Model Import Error**:
   ```
   Cannot find module
   ```
   **แก้ไข**: ตรวจสอบ path ของ Models และ dependencies

### 7. การปรับแต่ง

คุณสามารถปรับแต่ง seed script ได้โดย:

1. **เปลี่ยนข้อมูลผู้แต่ง**: แก้ไขใน `findOrCreateAuthor()`
2. **เพิ่มฉาก**: แก้ไข array `scenes` ใน `createScenes()`
3. **เปลี่ยนสถิติ**: แก้ไข `stats` object ใน `createWhisper999Novel()`
4. **เพิ่มตัวเลือก**: แก้ไข array `choices` ใน `createChoices()`

### 8. หมายเหตุ

- Script จะตรวจสอบว่ามีนิยายอยู่แล้วหรือไม่ ถ้ามีจะไม่สร้างซ้ำ
- หมวดหมู่จะถูกสร้างหรือใช้ที่มีอยู่แล้ว
- การเชื่อมต่อฐานข้อมูลจะถูกปิดอัตโนมัติเมื่อเสร็จสิ้น
- Script รองรับทั้ง development และ production environments

---

สำหรับข้อมูลเพิ่มเติมหรือการแก้ไขปัญหา กรุณาตรวจสอบ logs ที่แสดงระหว่างการรัน script
