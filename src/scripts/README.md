# Scripts Directory

โฟลเดอร์นี้เก็บ scripts ต่างๆ สำหรับการจัดการข้อมูลและการตั้งค่าระบบ

## การใช้งาน Seeding Scripts

### 1. Categories Seeding

สร้างหมวดหมู่พื้นฐานในระบบ (Themes, Languages, Age Ratings, Content Warnings, Art Styles, Interactivity Levels)

```bash
# ใช้ npm
npm run seed:categories

# ใช้ bun (แนะนำ)
bun run bun:seed:categories

# หรือรันโดยตรง
bun run src/scripts/seed-categories.ts
```

Script นี้จะสร้าง:
- **Themes**: ทั่วไป, โรแมนซ์, แฟนตาซี, ไซไฟ, ระทึกขวัญ, ลึกลับ, ผจญภัย, ดราม่า, ตลก, สยองขวัญ
- **Languages**: ไทย, English, 日本語, 한국어, 中文
- **Age Ratings**: ทุกวัย, 13+, 16+, 18+
- **Content Warnings**: ความรุนแรง, เนื้อหาผู้ใหญ่, ภาษาหยาบคาย, เนื้อหาที่อาจกระทบจิตใจ
- **Art Styles**: อนิเมะ, เรียลิสติก, การ์ตูน, พิกเซล
- **Interactivity Levels**: Kinetic Novel, Visual Novel, Interactive Fiction

### 2. การใช้งานหลังจาก Seeding

หลังจากรัน seeding แล้ว:

1. **สร้างนิยายใหม่**: ไปที่ Dashboard และคลิก "สร้างนิยายใหม่"
2. **เลือกหมวดหมู่**: ระบบจะโหลดหมวดหมู่จาก database มาให้เลือก
3. **กรอกข้อมูล**: ระบุชื่อเรื่อง (Slug จะถูกสร้างอัตโนมัติ), นามปากกา, เรื่องย่อ
4. **เลือกการตั้งค่า**: เลือกประเภทเนื้อหา, รูปแบบการจบ, ภาษา, เรทติ้ง

### 3. การตรวจสอบ Categories ที่สร้างแล้ว

```bash
# เข้าไปใน MongoDB shell หรือใช้ MongoDB Compass
# ดู collection "categories"
```

หรือใช้ API endpoint:
```
GET /api/categories?type=theme
GET /api/categories?type=language  
GET /api/categories?type=age_rating
```

## หมายเหตุ

- Categories ที่สร้างจาก script จะมี `isSystemDefined: true`
- หากรัน script ซ้ำ จะลบ categories เก่าที่เป็น system defined และสร้างใหม่
- Categories ที่ผู้ใช้สร้างเอง (`isSystemDefined: false`) จะไม่ถูกลบ

## การแก้ไขปัญหา

### ปัญหา: ไม่มีหมวดหมู่ให้เลือกใน CreateNovelModal

**วิธีแก้**: รัน categories seeding script

```bash
bun run bun:seed:categories
```

### ปัญหา: Error "กรุณาระบุ Slug (Slug is required)"

**วิธีแก้**: ระบุชื่อเรื่องก่อน Slug จะถูกสร้างอัตโนมัติ หรือกรอก Slug เอง

### ปัญหา: "Slug นี้ถูกใช้แล้ว"

**วิธีแก้**: เปลี่ยน Slug เป็นชื่ือื่นที่ไม่ซ้ำกัน
