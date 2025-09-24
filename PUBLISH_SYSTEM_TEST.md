# ระบบ Publish นิยาย - คู่มือทดสอบ

## ระบบที่ปรับปรุงแล้ว

### 1. API Endpoints ที่ปรับปรุง

#### `/api/novels/[slug]/publish`
- **POST**: เผยแพร่นิยาย (สถานะเปลี่ยนจาก draft → published)
- **PATCH**: อัปเดตสถานะและ access level

#### `/api/novels` (ปรับปรุงใหม่)
- รองรับ filter parameters: `trending`, `published`, `promoted`, `completed`
- รองรับ pagination: `page`, `limit`
- รองรับ novel type filter: `novelType`

#### `/api/revalidate` (ใหม่)
- POST/GET: revalidate หน้า homepage เมื่อมีการเผยแพร่นิยายใหม่

### 2. SummaryTab ที่ปรับปรุง

#### ฟีเจอร์หลัก:
- ✅ Publish นิยายจาก draft → published
- ✅ อัปเดตสถานะ (published, unpublished, archived, scheduled)
- ✅ อัปเดต access level (public, private, unlisted, etc.)
- ✅ ตรวจสอบข้อมูลที่จำเป็นก่อน publish
- ✅ Auto-revalidate homepage เมื่อมีการเปลี่ยนแปลงสถานะ

### 3. Novel Model ที่ปรับปรุง
- เพิ่ม `unpublishedAt` field สำหรับติดตาม unpublish history

## วิธีทดสอบ

### Step 1: เตรียมข้อมูล
1. สร้างนิยายใหม่ (สถานะ draft)
2. เพิ่มตอน (episode) อย่างน้อย 1 ตอนและเผยแพร่
3. เพิ่มข้อมูลที่จำเป็น:
   - ชื่อเรื่อง
   - เรื่องย่อ
   - รูปปก

### Step 2: ทดสอบ Publish
1. ไปที่ Summary Tab ของนิยาย
2. ไปที่แท็บ "Publish"
3. ตรวจสอบ Publication Requirements:
   - ✅ Novel Title
   - ✅ Synopsis  
   - ✅ Cover Image
   - ✅ Published Episodes (>0)
4. คลิก "Publish Novel"
5. ตรวจสอบว่า:
   - สถานะเปลี่ยนเป็น "published"
   - แสดง toast success message
   - Homepage ได้รับการ revalidate

### Step 3: ทดสอบการแสดงผลใน Homepage
1. ไปที่หน้า Homepage (`/`)
2. ตรวจสอบว่านิยายที่เผยแพร่แสดงใน:
   - Section "อัปเดตล่าสุด" (published filter)
   - Section "ผลงานยอดนิยม" (หากมี trending score)

### Step 4: ทดสอบ Status Changes
1. กลับไปที่ Summary Tab → Publish
2. ทดสอบเปลี่ยนสถานะ:
   - Published → Unpublished
   - Unpublished → Published
   - Published → Archived
3. ตรวจสอบว่าการเปลี่ยนแปลงสะท้อนใน Homepage

### Step 5: ทดสอบ Access Level
1. ทดสอบเปลี่ยน Access Level:
   - Public → Private (ไม่แสดงใน Homepage)
   - Private → Public (แสดงใน Homepage)
   - Public → Unlisted (ยังแสดงใน Homepage)

## API Testing (Optional)

### ทดสอบด้วย curl หรือ Postman

```bash
# ทดสอบ fetch novels with filter
curl "http://localhost:3000/api/novels?filter=published&limit=5"

# ทดสอบ publish novel
curl -X POST "http://localhost:3000/api/novels/[slug]/publish" \
  -H "Content-Type: application/json" \
  -d '{"accessLevel": "public"}'

# ทดสอบ update status
curl -X PATCH "http://localhost:3000/api/novels/[slug]/publish" \
  -H "Content-Type: application/json" \
  -d '{"status": "unpublished"}'

# ทดสอบ revalidate
curl -X POST "http://localhost:3000/api/revalidate?path=/"
```

## Expected Results

### เมื่อ Publish สำเร็จ:
1. ✅ Novel status = "published"
2. ✅ publishedAt timestamp ถูกตั้งค่า
3. ✅ accessLevel = "public" (หาก private → public)
4. ✅ แสดงใน Homepage sections ที่เกี่ยวข้อง
5. ✅ Toast notification แสดง success message

### เมื่อ Unpublish:
1. ✅ Novel status = "unpublished" 
2. ✅ unpublishedAt timestamp ถูกตั้งค่า
3. ✅ ไม่แสดงใน Homepage (เฉพาะ published novels)

### เมื่อเปลี่ยน Access Level:
1. ✅ Private novels ไม่แสดงใน Homepage
2. ✅ Public/Unlisted novels แสดงใน Homepage

## Troubleshooting

### หากนิยายไม่แสดงใน Homepage:
1. ตรวจสอบ status = "published"
2. ตรวจสอบ accessLevel = "public" หรือ "unlisted"
3. ตรวจสอบ isDeleted = false
4. ลอง revalidate manual: `/api/revalidate?path=/`

### หาก Publish ไม่สำเร็จ:
1. ตรวจสอบ authentication (NextAuth session)
2. ตรวจสอบ novel ownership (author field)
3. ตรวจสอบ published episodes > 0
4. ตรวจสอบข้อมูลที่จำเป็น (title, synopsis, cover)

### หาก Homepage ไม่อัปเดต:
1. ลองรีเฟรช browser (Ctrl+F5)
2. ตรวจสอบ ISR cache (revalidate: 60 seconds)
3. ตรวจสอบ console logs สำหรับ errors
4. ลอง manual revalidate ผ่าน API

## Performance Notes

- Homepage ใช้ ISR (Incremental Static Regeneration) revalidate ทุก 60 วินาที
- API calls มี timeout 8 วินาที
- Cache ถูกจัดการผ่าน CacheManager และ Redis
- Parallel fetching สำหรับ sections ต่างๆ

## Security Notes

- ทุก API endpoints ต้อง authentication ผ่าน NextAuth
- เฉพาะ author ของนิยายเท่านั้นที่สามารถ publish/unpublish ได้
- Revalidate API ต้อง authentication เพื่อป้องกัน abuse
