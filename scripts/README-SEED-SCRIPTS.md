# Seed Scripts สำหรับ The Whisper of 999

ไดเรกทอรีนี้มี seed scripts สำหรับลงข้อมูลนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999" ลงในฐานข้อมูล

## ไฟล์ในไดเรกทอรี

### 1. `mongodb-script.js`
ไฟล์ utility สำหรับเชื่อมต่อ MongoDB ในสคริปต์ CommonJS
- รองรับการเชื่อมต่อแบบ singleton
- จัดการ environment variables
- Error handling สำหรับการเชื่อมต่อ

### 2. `seed-whisper-999.js` 
**Seed script หลัก** - เวอร์ชันพื้นฐานที่มีฟีเจอร์ครบถ้วน

**สิ่งที่จะถูกสร้าง:**
- ✅ ผู้แต่ง (Author) พร้อม profile สมบูรณ์
- ✅ หมวดหมู่ (Categories) ทุกประเภทที่จำเป็น
- ✅ นิยายพร้อมข้อมูล metadata ครบถ้วน
- ✅ ตัวละคร (Characters) - นิรา และนายหน้า
- ✅ ตัวเลือก (Choices) - 9 ตัวเลือกหลัก
- ✅ Episode 1 พร้อมการตั้งค่า
- ✅ ฉาก (Scenes) - 10 ฉากหลัก
- ✅ การเชื่อมต่อระหว่างฉาก

**การใช้งาน:**
```bash
npm run seed:whisper999
```

### 3. `seed-whisper-999-extended.js`
**Seed script ขยาย** - เวอร์ชันที่มี ending scenes และ story map

**ฟีเจอร์เพิ่มเติม:**
- ✅ Ending scenes ทั้งหมด (BAD, TRUE, NORMAL endings)
- ✅ Story Map พร้อม nodes และ edges
- ✅ Story variables สำหรับ interactive fiction
- ✅ Visual layout สำหรับ story editor
- ✅ Multiple branching paths

**การใช้งาน:**
```bash
npm run seed:whisper999:extended
```

## การเลือกใช้ Script

### ใช้ `seed-whisper-999.js` เมื่อ:
- 🎯 ต้องการทดสอบระบบพื้นฐาน
- 🎯 Development environment
- 🎯 ต้องการข้อมูลเบื้องต้นเพื่อทดสอบ UI
- 🎯 ประหยัดเวลาและทรัพยากร

### ใช้ `seed-whisper-999-extended.js` เมื่อ:
- 🎯 ต้องการทดสอบ story editor
- 🎯 ต้องการ ending system ครบถ้วน
- 🎯 Demo หรือ production environment
- 🎯 ต้องการข้อมูลสมบูรณ์สำหรับ testing

## ข้อกำหนดเบื้องต้น

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/your-database
AUTHOR_USERNAME=whisper_author  # (ไม่บังคับ)
```

### Dependencies
Scripts ใช้ packages ที่มีอยู่ใน project แล้ว:
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `uuid` - Unique ID generation
- `dotenv` - Environment variables

## ข้อมูลที่ถูกสร้าง

### ผู้แต่ง (Author)
```javascript
{
  username: "whisper_author",
  email: "whisper_author@example.com",
  role: "WRITER",
  profile: {
    displayName: "ผู้เขียนนิยายสยองขวัญ",
    penName: "นักเขียนลึกลับ",
    bio: "นักเขียนนิยายสยองขวัญและจิตวิทยา...",
    // ... และอื่นๆ
  }
}
```

### หมวดหมู่ (Categories)
- **LANGUAGE**: ภาษาไทย
- **GENRE**: สยองขวัญ
- **SUB_GENRE**: จิตวิทยา, ปริศนา
- **MOOD_AND_TONE**: ลึกลับ, น่ากลัว
- **AGE_RATING**: 18+

### นิยาย (Novel)
```javascript
{
  title: "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999",
  slug: "whisper-from-apartment-999",
  status: "PUBLISHED",
  endingType: "MULTIPLE_ENDINGS",
  stats: {
    viewsCount: 852345,
    likesCount: 14876,
    averageRating: 4.85,
    // ...
  }
}
```

### ตัวละคร (Characters)
1. **นิรา** - main_protagonist
   - colorTheme: '#A78BFA'
   - expressions: normal, scared, curious

2. **นายหน้า** - supporting_character
   - colorTheme: '#71717A'
   - expressions: normal

### ตัวเลือก (Choices)
| Choice Code | Description |
|-------------|-------------|
| CHOICE_EXPLORE | เดินสำรวจบ้านชั้นล่างทันที |
| CHOICE_CLEAN | ทำความสะอาดห้องนั่งเล่น |
| CHOICE_CALL | โทรหาเพื่อน |
| CHOICE_LISTEN_NOW | กดฟังเทปทันที |
| CHOICE_LISTEN_LATER | รอให้ถึงตีสาม |
| CHOICE_BURN_TAPE | เผาเทปทิ้งทันที |
| CHOICE_OPEN_SECRET_DOOR | เปิดประตูลับ |
| CHOICE_TAKE_PHOTO | ถ่ายรูปส่งเพื่อน |
| CHOICE_LOCK_DOOR | ล็อกด้วยตู้เย็นทับ |

### ฉาก (Scenes)
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

*Extended version มีฉากเพิ่มเติมรวมถึง ending scenes*

## การตรวจสอบผลลัพธ์

### ผ่าน MongoDB
```javascript
// เชื่อมต่อ MongoDB
use your-database

// ตรวจสอบนิยาย
db.novels.findOne({slug: "whisper-from-apartment-999"})

// ตรวจสอบจำนวนฉาก
db.scenes.countDocuments({novelId: ObjectId("...")})

// ตรวจสอบตัวเลือก
db.choices.find({novelId: ObjectId("...")}).count()
```

### ผ่านเว็บไซต์
1. เข้าหน้าค้นหานิยาย
2. ค้นหา "เสียงกระซิบ" หรือ "999"
3. คลิกเข้าไปอ่านนิยาย
4. ทดสอบการทำงานของตัวเลือก

## การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **MongoDB Connection Error**
   ```
   ❌ MONGODB_URI is not defined
   ```
   **แก้ไข**: เพิ่ม MONGODB_URI ในไฟล์ `.env`

2. **Duplicate Key Error**
   ```
   E11000 duplicate key error
   ```
   **แก้ไข**: นิยายมีอยู่แล้ว script จะข้ามการสร้าง

3. **Model Import Error**
   ```
   Cannot find module
   ```
   **แก้ไข**: ตรวจสอบ path และ dependencies

4. **Permission Error**
   ```
   MongoServerError: not authorized
   ```
   **แก้ไข**: ตรวจสอบ MongoDB credentials

### การ Debug

เปิด verbose logging:
```bash
DEBUG=* npm run seed:whisper999
```

ดู MongoDB logs:
```bash
tail -f /var/log/mongodb/mongod.log
```

## การปรับแต่ง

### เปลี่ยนข้อมูลผู้แต่ง
แก้ไขใน function `findOrCreateAuthor()`:
```javascript
const author = new UserModel({
  username: 'your-username',
  email: 'your-email@example.com',
  // ...
});
```

### เพิ่มฉากใหม่
แก้ไข array `scenes` ใน function `createScenes()`:
```javascript
const scenes = [
  // ฉากเดิม...
  {
    novelId,
    episodeId,
    sceneOrder: 11,
    nodeId: 'your_new_scene',
    title: 'ฉากใหม่ของคุณ',
    // ...
  }
];
```

### เปลี่ยนสถิติ
แก้ไขใน novel creation:
```javascript
stats: {
  viewsCount: 1000000,
  likesCount: 50000,
  averageRating: 5.0,
  // ...
}
```

## Best Practices

1. **ทดสอบก่อน**: ใช้ development database ก่อน
2. **Backup**: สำรองข้อมูลก่อนรัน script
3. **Environment**: ใช้ environment variables
4. **Logging**: ดู logs เพื่อตรวจสอบความถูกต้อง
5. **Cleanup**: ลบข้อมูลทดสอบเมื่อเสร็จ

## การใช้งานใน Production

```bash
# ตั้งค่า environment
export NODE_ENV=production
export MONGODB_URI="mongodb://prod-server:27017/production-db"

# รัน seed script
npm run seed:whisper999:extended

# ตรวจสอบผลลัพธ์
npm run verify:data
```

---

สำหรับข้อมูลเพิ่มเติม ดู `WHISPER999_SEED_README.md`
