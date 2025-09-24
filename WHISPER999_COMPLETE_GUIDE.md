# 🌟 The Whisper of 999 - Complete Seed Guide

คู่มือสมบูรณ์สำหรับการ seed ข้อมูลนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999" ลงในฐานข้อมูล

## 📁 ไฟล์ที่ถูกสร้าง

### 🔧 Core Files
| ไฟล์ | วัตถุประสงค์ | สถานะ |
|------|-------------|--------|
| `src/backend/lib/mongodb-script.js` | MongoDB connection utility | ✅ พร้อมใช้ |
| `scripts/seed-whisper-999.js` | **Main seed script** | ✅ พร้อมใช้ |
| `scripts/seed-whisper-999-extended.js` | Extended seed with endings & story map | ✅ พร้อมใช้ |
| `scripts/validate-whisper-999.js` | Data validation script | ✅ พร้อมใช้ |

### 📚 Documentation
| ไฟล์ | วัตถุประสงค์ | สถานะ |
|------|-------------|--------|
| `WHISPER999_SEED_README.md` | Basic usage guide | ✅ พร้อมใช้ |
| `scripts/README-SEED-SCRIPTS.md` | Complete technical guide | ✅ พร้อมใช้ |
| `WHISPER999_COMPLETE_GUIDE.md` | **This file** - Complete overview | ✅ พร้อมใช้ |

### 📦 Package.json Scripts
```json
{
  "seed:whisper999": "node scripts/seed-whisper-999.js",
  "seed:whisper999:extended": "node scripts/seed-whisper-999-extended.js", 
  "validate:whisper999": "node scripts/validate-whisper-999.js"
}
```

## 🚀 Quick Start

### Step 1: เตรียมสภาพแวดล้อม
```bash
# ตรวจสอบ .env file
echo "MONGODB_URI=mongodb://localhost:27017/your-database" >> .env
echo "AUTHOR_USERNAME=whisper_author" >> .env

# ตรวจสอบ dependencies
npm install
```

### Step 2: เลือกเวอร์ชัน seed script

#### 🟢 สำหรับการทดสอบพื้นฐาน
```bash
npm run seed:whisper999
```

#### 🟡 สำหรับการทดสอบครบถ้วน
```bash
npm run seed:whisper999:extended
```

### Step 3: ตรวจสอบผลลัพธ์
```bash
npm run validate:whisper999
```

## 📊 ข้อมูลที่จะถูกสร้าง

### 👤 Author (ผู้แต่ง)
```javascript
{
  username: "whisper_author",
  email: "whisper_author@example.com", 
  role: "WRITER",
  profile: {
    displayName: "ผู้เขียนนิยายสยองขวัญ",
    penName: "นักเขียนลึกลับ",
    bio: "นักเขียนนิยายสยองขวัญและจิตวิทยา..."
  }
}
```

### 📂 Categories (หมวดหมู่)
- **LANGUAGE**: ภาษาไทย
- **GENRE**: สยองขวัญ  
- **SUB_GENRE**: จิตวิทยา, ปริศนา
- **MOOD_AND_TONE**: ลึกลับ, น่ากลัว
- **AGE_RATING**: 18+

### 📖 Novel (นิยาย)
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
    followersCount: 1234
  }
}
```

### 👥 Characters (ตัวละคร)
1. **นิรา** - main_protagonist
   - Age: 25
   - Description: หญิงสาวที่เพิ่งย้ายเข้ามาในบ้านหลังใหม่
   - Color: #A78BFA
   - Expressions: normal, scared, curious

2. **นายหน้า** - supporting_character  
   - Age: 45
   - Description: นายหน้าอสังหาริมทรัพย์ที่ดูมีลับลมคมใน
   - Color: #71717A
   - Expressions: normal

### 🎯 Choices (ตัวเลือก)
| Code | Text | Type | Action |
|------|------|------|--------|
| CHOICE_EXPLORE | เดินสำรวจบ้านชั้นล่างทันที | Major | GO_TO_NODE |
| CHOICE_CLEAN | ทำความสะอาดห้องนั่งเล่นและเปิดผ้าม่าน | Major | END_BRANCH |
| CHOICE_CALL | โทรหาเพื่อนเพื่อเล่าเรื่องบ้านใหม่ | Major | END_BRANCH |
| CHOICE_LISTEN_NOW | กดฟังเทปทันที | Minor | GO_TO_NODE |
| CHOICE_LISTEN_LATER | รอให้ถึงตีสาม แล้วฟังตามที่เขียน | Minor | END_BRANCH |
| CHOICE_BURN_TAPE | เผาเทปทิ้งทันที | Minor | END_BRANCH |
| CHOICE_OPEN_SECRET_DOOR | เปิดประตูลับและลงไปทันที | Minor | GO_TO_NODE |
| CHOICE_TAKE_PHOTO | ถ่ายรูปส่งให้เพื่อนก่อนเปิด | Minor | GO_TO_NODE |
| CHOICE_LOCK_DOOR | ปิดมันไว้แล้วล็อกด้วยตู้เย็นทับ | Minor | GO_TO_NODE |

### 📚 Episode
- **Title**: บทที่ 1: ย้ายเข้า
- **Slug**: chapter-1-moving-in
- **Status**: PUBLISHED
- **Access Type**: PAID_UNLOCK
- **Price**: 10 coins
- **Stats**: 45,231 views, 12,456 unique viewers

### 🎬 Scenes (ฉาก)

#### Basic Version (10 scenes)
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

#### Extended Version (เพิ่มเติม)
- Multiple ending scenes
- Bad endings: เสียงสุดท้าย, เสียงที่ถูกเลือก, มืออีกข้าง, ถึงตาเธอ
- True ending: รอยยิ้มสุดท้าย
- Normal endings: วันแรกที่แสนสงบ, เริ่มต้นอย่างอุ่นใจ

### 📊 Story Map (Extended Only)
- **Nodes**: START_NODE, SCENE_NODE, CHOICE_NODE, ENDING_NODE
- **Edges**: เชื่อมต่อ nodes พร้อม visual properties
- **Variables**: karma, has_explored_basement, tape_listened
- **Layout**: Horizontal flow with tier-based positioning

## 🔍 การตรวจสอบและ Validation

### ตรวจสอบอัตโนมัติ
```bash
npm run validate:whisper999
```

### ตรวจสอบด้วยตนเอง

#### ผ่าน MongoDB
```javascript
// เชื่อมต่อ MongoDB
use your-database

// ตรวจสอบนิยาย
db.novels.findOne({slug: "whisper-from-apartment-999"})

// นับจำนวนข้อมูล
db.scenes.countDocuments({novelId: ObjectId("...")})
db.choices.countDocuments({novelId: ObjectId("...")})
db.characters.countDocuments({novelId: ObjectId("...")})
```

#### ผ่านเว็บไซต์
1. เข้าหน้าค้นหานิยาย: `/search/novels`
2. ค้นหา: "เสียงกระซิบ" หรือ "999"
3. ตรวจสอบการแสดงผลของนิยาย
4. คลิกเข้าไปอ่านและทดสอบตัวเลือก

## ⚠️ การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

#### 1. MongoDB Connection Error
```
❌ MONGODB_URI is not defined in your .env file.
```
**แก้ไข**:
```bash
echo "MONGODB_URI=mongodb://localhost:27017/your-database" >> .env
```

#### 2. Duplicate Key Error  
```
E11000 duplicate key error collection: novels index: slug_1
```
**แก้ไข**: นิยายมีอยู่แล้ว script จะข้ามการสร้างอัตโนมัติ

#### 3. Model Import Error
```
Cannot find module '../src/backend/models/Novel'
```
**แก้ไข**: ตรวจสอบ path และ build TypeScript models

#### 4. Permission Error
```
MongoServerError: not authorized on database
```
**แก้ไข**: ตรวจสอบ MongoDB user permissions

### Debug Commands
```bash
# เปิด verbose logging
DEBUG=* npm run seed:whisper999

# ตรวจสอบ MongoDB logs
tail -f /var/log/mongodb/mongod.log

# ตรวจสอบ Node.js version
node --version

# ตรวจสอบ dependencies
npm list mongoose bcryptjs uuid
```

## 🛠️ การปรับแต่ง

### เปลี่ยนข้อมูลผู้แต่ง
แก้ไขใน `findOrCreateAuthor()`:
```javascript
const author = new UserModel({
  username: 'your-custom-username',
  email: 'your-email@example.com',
  profile: {
    displayName: 'Your Display Name',
    penName: 'Your Pen Name',
    // ...
  }
});
```

### เพิ่มฉากใหม่
แก้ไขใน `createScenes()`:
```javascript
const newScene = {
  novelId,
  episodeId,
  sceneOrder: 11,
  nodeId: 'scene_custom',
  title: 'ฉากใหม่ของคุณ',
  background: { 
    type: 'image', 
    value: '/images/background/your-bg.png',
    isOfficialMedia: true,
    fitMode: 'cover'
  },
  textContents: [{
    instanceId: 'narration_custom',
    type: 'narration',
    content: 'เนื้อหาฉากใหม่ของคุณ...'
  }]
};
```

### เปลี่ยนสถิติ
แก้ไขใน novel creation:
```javascript
stats: {
  viewsCount: 1000000,      // เปลี่ยนจำนวนผู้อ่าน
  likesCount: 50000,        // เปลี่ยนจำนวนไลค์
  averageRating: 5.0,       // เปลี่ยนคะแนนเฉลี่ย
  followersCount: 10000     // เปลี่ยนจำนวนผู้ติดตาม
}
```

## 🌍 การใช้งานใน Environments ต่างๆ

### Development
```bash
export NODE_ENV=development
export MONGODB_URI="mongodb://localhost:27017/dev-database"
npm run seed:whisper999
```

### Staging  
```bash
export NODE_ENV=staging
export MONGODB_URI="mongodb://staging-server:27017/staging-db"
npm run seed:whisper999:extended
```

### Production
```bash
export NODE_ENV=production
export MONGODB_URI="mongodb://prod-server:27017/production-db"

# ใช้ extended version สำหรับข้อมูลครบถ้วน
npm run seed:whisper999:extended

# ตรวจสอบผลลัพธ์
npm run validate:whisper999
```

## 📈 Performance Tips

### สำหรับฐานข้อมูลขนาดใหญ่
```javascript
// เพิ่ม indexes สำหรับ performance
db.novels.createIndex({ "slug": 1 })
db.novels.createIndex({ "author": 1 })
db.scenes.createIndex({ "novelId": 1, "sceneOrder": 1 })
db.choices.createIndex({ "novelId": 1 })
```

### Batch Operations
```javascript
// ใช้ insertMany แทน insert หลายครั้ง
await SceneModel.insertMany(scenes);
await ChoiceModel.insertMany(choices);
```

## 🔒 Security Considerations

### Production Environment
- ใช้ strong passwords สำหรับ MongoDB
- ตั้งค่า network restrictions
- ใช้ SSL/TLS connections
- Regular backups

### Environment Variables
```bash
# ไม่ควรใส่ในโค้ด
MONGODB_URI="mongodb://username:password@server:27017/database?ssl=true"
AUTHOR_USERNAME="secure_username"
```

## 📝 Best Practices

1. **ทดสอบก่อนใช้งานจริง**: ใช้ development database ก่อน
2. **Backup ข้อมูล**: สำรองข้อมูลก่อนรัน script
3. **ตรวจสอบผลลัพธ์**: ใช้ validation script
4. **Log monitoring**: ดู logs เพื่อตรวจสอบ errors
5. **Clean up**: ลบข้อมูลทดสอบเมื่อเสร็จ

## 🎯 Next Steps

หลังจาก seed ข้อมูลเสร็จแล้ว:

1. **ทดสอบ UI**: ตรวจสอบการแสดงผลในเว็บไซต์
2. **ทดสอบ Interactive Features**: ทดสอบการทำงานของตัวเลือก
3. **Performance Testing**: ทดสอบความเร็วการโหลด
4. **User Experience**: ทดสอบ user flow ทั้งหมด

## 🆘 Support

หากพบปัญหาหรือต้องการความช่วยเหลือ:

1. ตรวจสอบ logs ใน console
2. รัน validation script
3. ตรวจสอบ environment variables
4. ดู documentation ใน README files

---

**สร้างโดย**: AI Assistant  
**วันที่**: 2024  
**เวอร์ชัน**: 1.0  
**สถานะ**: ✅ พร้อมใช้งาน
