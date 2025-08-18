# ตัวอย่างการใช้งาน API ระบบให้คะแนนและรีวิว

เอกสารนี้แสดงตัวอย่างการใช้งาน API สำหรับระบบให้คะแนนและรีวิวในแอปพลิเคชัน

## 1. ดึงรายการการให้คะแนนและรีวิว

### Request

```http
GET /api/ratings?targetId=6507f8d72d3b2e1f5c9a1b3e&targetType=Novel&page=1&limit=20&sort=newest
```

### Query Parameters

- `targetId` (required): ID ของเป้าหมายที่ต้องการดูการให้คะแนนและรีวิว
- `targetType` (required): ประเภทของเป้าหมาย (Novel, Episode, etc.)
- `page`: หน้าที่ต้องการดู (เริ่มต้นที่ 1)
- `limit`: จำนวนรายการต่อหน้า (สูงสุด 100)
- `sort`: การเรียงลำดับ (newest, oldest, highest, lowest, helpful)
- `userId`: กรองตาม ID ของผู้ใช้
- `novelIdContext`: กรองตาม ID ของนิยายที่เกี่ยวข้อง
- `minScore`: กรองตามคะแนนต่ำสุด
- `maxScore`: กรองตามคะแนนสูงสุด
- `containsSpoilers`: กรองรีวิวที่มีสปอยล์ (true/false)
- `hasReview`: กรองเฉพาะที่มีเนื้อหารีวิว (true) หรือไม่มี (false)

### Response

```json
{
  "success": true,
  "total": 42,
  "page": 1,
  "limit": 20,
  "ratings": [
    {
      "_id": "6507f8d72d3b2e1f5c9a1b3f",
      "userId": {
        "_id": "6507f8d72d3b2e1f5c9a1b3d",
        "username": "reader123",
        "avatarUrl": "/images/avatars/default.jpg",
        "primaryPenName": "นักอ่านตัวยง",
        "roles": ["Reader"]
      },
      "targetId": "6507f8d72d3b2e1f5c9a1b3e",
      "targetType": "Novel",
      "overallScore": 4,
      "scoreDetails": [
        { "aspect": "story", "score": 4 },
        { "aspect": "characters", "score": 5 },
        { "aspect": "writing_style", "score": 3 }
      ],
      "reviewTitle": "นิยายที่น่าประทับใจ",
      "reviewContent": "เนื้อเรื่องสนุกมาก ตัวละครมีมิติ แต่บางช่วงเนื้อเรื่องช้าไปหน่อย",
      "containsSpoilers": false,
      "helpfulVotesCount": 12,
      "unhelpfulVotesCount": 2,
      "status": "visible",
      "isEdited": false,
      "createdAt": "2023-09-18T10:30:00.000Z",
      "updatedAt": "2023-09-18T10:30:00.000Z"
    },
    // ... รายการอื่นๆ
  ],
  "stats": {
    "averageScore": 4.2,
    "count": 42,
    "distribution": {
      "1": 2,
      "2": 3,
      "3": 8,
      "4": 15,
      "5": 14
    },
    "aspectAverages": {
      "story": 4.3,
      "characters": 4.5,
      "writing_style": 3.8
    }
  }
}
```

## 2. สร้างการให้คะแนนและรีวิวใหม่

### Request

```http
POST /api/ratings
Content-Type: application/json

{
  "targetId": "6507f8d72d3b2e1f5c9a1b3e",
  "targetType": "Novel",
  "overallScore": 4,
  "scoreDetails": [
    { "aspect": "story", "score": 4 },
    { "aspect": "characters", "score": 5 },
    { "aspect": "writing_style", "score": 3 }
  ],
  "reviewTitle": "นิยายที่น่าประทับใจ",
  "reviewContent": "เนื้อเรื่องสนุกมาก ตัวละครมีมิติ แต่บางช่วงเนื้อเรื่องช้าไปหน่อย",
  "containsSpoilers": false,
  "novelIdContext": "6507f8d72d3b2e1f5c9a1b3e"
}
```

### Response

```json
{
  "success": true,
  "rating": {
    "_id": "6507f8d72d3b2e1f5c9a1b3f",
    "userId": {
      "_id": "6507f8d72d3b2e1f5c9a1b3d",
      "username": "reader123",
      "avatarUrl": "/images/avatars/default.jpg",
      "primaryPenName": "นักอ่านตัวยง",
      "roles": ["Reader"]
    },
    "targetId": "6507f8d72d3b2e1f5c9a1b3e",
    "targetType": "Novel",
    "overallScore": 4,
    "scoreDetails": [
      { "aspect": "story", "score": 4 },
      { "aspect": "characters", "score": 5 },
      { "aspect": "writing_style", "score": 3 }
    ],
    "reviewTitle": "นิยายที่น่าประทับใจ",
    "reviewContent": "เนื้อเรื่องสนุกมาก ตัวละครมีมิติ แต่บางช่วงเนื้อเรื่องช้าไปหน่อย",
    "containsSpoilers": false,
    "helpfulVotesCount": 0,
    "unhelpfulVotesCount": 0,
    "status": "visible",
    "createdAt": "2023-09-18T10:30:00.000Z",
    "updatedAt": "2023-09-18T10:30:00.000Z"
  }
}
```

## 3. ดึงข้อมูลการให้คะแนนและรีวิวตาม ID

### Request

```http
GET /api/ratings/6507f8d72d3b2e1f5c9a1b3f
```

### Response

```json
{
  "success": true,
  "rating": {
    "_id": "6507f8d72d3b2e1f5c9a1b3f",
    "userId": {
      "_id": "6507f8d72d3b2e1f5c9a1b3d",
      "username": "reader123",
      "avatarUrl": "/images/avatars/default.jpg",
      "primaryPenName": "นักอ่านตัวยง",
      "roles": ["Reader"]
    },
    "targetId": "6507f8d72d3b2e1f5c9a1b3e",
    "targetType": "Novel",
    "overallScore": 4,
    "scoreDetails": [
      { "aspect": "story", "score": 4 },
      { "aspect": "characters", "score": 5 },
      { "aspect": "writing_style", "score": 3 }
    ],
    "reviewTitle": "นิยายที่น่าประทับใจ",
    "reviewContent": "เนื้อเรื่องสนุกมาก ตัวละครมีมิติ แต่บางช่วงเนื้อเรื่องช้าไปหน่อย",
    "containsSpoilers": false,
    "helpfulVotesCount": 12,
    "unhelpfulVotesCount": 2,
    "status": "visible",
    "isEdited": false,
    "createdAt": "2023-09-18T10:30:00.000Z",
    "updatedAt": "2023-09-18T10:30:00.000Z"
  }
}
```

## 4. อัปเดตการให้คะแนนและรีวิว

### Request

```http
PUT /api/ratings/6507f8d72d3b2e1f5c9a1b3f
Content-Type: application/json

{
  "overallScore": 5,
  "scoreDetails": [
    { "aspect": "story", "score": 5 },
    { "aspect": "characters", "score": 5 },
    { "aspect": "writing_style", "score": 4 }
  ],
  "reviewTitle": "นิยายที่น่าประทับใจมาก",
  "reviewContent": "หลังจากอ่านซ้ำอีกครั้ง ผมพบว่าเนื้อเรื่องสนุกมากขึ้น ตัวละครมีมิติและน่าติดตาม",
  "containsSpoilers": false
}
```

### Response

```json
{
  "success": true,
  "rating": {
    "_id": "6507f8d72d3b2e1f5c9a1b3f",
    "userId": {
      "_id": "6507f8d72d3b2e1f5c9a1b3d",
      "username": "reader123",
      "avatarUrl": "/images/avatars/default.jpg",
      "primaryPenName": "นักอ่านตัวยง",
      "roles": ["Reader"]
    },
    "targetId": "6507f8d72d3b2e1f5c9a1b3e",
    "targetType": "Novel",
    "overallScore": 5,
    "scoreDetails": [
      { "aspect": "story", "score": 5 },
      { "aspect": "characters", "score": 5 },
      { "aspect": "writing_style", "score": 4 }
    ],
    "reviewTitle": "นิยายที่น่าประทับใจมาก",
    "reviewContent": "หลังจากอ่านซ้ำอีกครั้ง ผมพบว่าเนื้อเรื่องสนุกมากขึ้น ตัวละครมีมิติและน่าติดตาม",
    "containsSpoilers": false,
    "helpfulVotesCount": 12,
    "unhelpfulVotesCount": 2,
    "status": "visible",
    "isEdited": true,
    "lastEditedAt": "2023-09-20T15:45:00.000Z",
    "createdAt": "2023-09-18T10:30:00.000Z",
    "updatedAt": "2023-09-20T15:45:00.000Z"
  }
}
```

## 5. ลบการให้คะแนนและรีวิว

### Request

```http
DELETE /api/ratings/6507f8d72d3b2e1f5c9a1b3f
Content-Type: application/json

{
  "reason": "ไม่ต้องการแสดงความคิดเห็นนี้อีกต่อไป"
}
```

### Response

```json
{
  "success": true,
  "rating": {
    "_id": "6507f8d72d3b2e1f5c9a1b3f",
    "userId": {
      "_id": "6507f8d72d3b2e1f5c9a1b3d",
      "username": "reader123",
      "avatarUrl": "/images/avatars/default.jpg",
      "primaryPenName": "นักอ่านตัวยง",
      "roles": ["Reader"]
    },
    "targetId": "6507f8d72d3b2e1f5c9a1b3e",
    "targetType": "Novel",
    "status": "deleted_by_user",
    "statusReason": "ไม่ต้องการแสดงความคิดเห็นนี้อีกต่อไป",
    "deletedAt": "2023-09-22T09:15:00.000Z",
    "createdAt": "2023-09-18T10:30:00.000Z",
    "updatedAt": "2023-09-22T09:15:00.000Z"
  }
}
```

## 6. โหวตว่ารีวิวมีประโยชน์หรือไม่

### Request

```http
POST /api/ratings/6507f8d72d3b2e1f5c9a1b3f/vote
Content-Type: application/json

{
  "isHelpful": true
}
```

### Response

```json
{
  "success": true,
  "rating": {
    "_id": "6507f8d72d3b2e1f5c9a1b3f",
    "helpfulVotesCount": 13,
    "unhelpfulVotesCount": 2,
    // ... ข้อมูลอื่นๆ
  }
}
```

## 7. ดึงสถิติการให้คะแนนสำหรับเป้าหมายที่ระบุ

### Request

```http
GET /api/ratings/statistics?targetId=6507f8d72d3b2e1f5c9a1b3e&targetType=Novel
```

### Response

```json
{
  "success": true,
  "stats": {
    "averageScore": 4.2,
    "count": 42,
    "reviewsCount": 35,
    "distribution": {
      "1": 2,
      "2": 3,
      "3": 8,
      "4": 15,
      "5": 14
    },
    "aspectAverages": {
      "story": 4.3,
      "characters": 4.5,
      "writing_style": 3.8
    }
  }
}
```

## 8. ดึงข้อมูลการให้คะแนนและรีวิวของผู้ใช้สำหรับเป้าหมายที่ระบุ

### Request

```http
GET /api/ratings/user?targetId=6507f8d72d3b2e1f5c9a1b3e&targetType=Novel
```

### Response

```json
{
  "success": true,
  "rating": {
    "_id": "6507f8d72d3b2e1f5c9a1b3f",
    "userId": {
      "_id": "6507f8d72d3b2e1f5c9a1b3d",
      "username": "reader123",
      "avatarUrl": "/images/avatars/default.jpg",
      "primaryPenName": "นักอ่านตัวยง",
      "roles": ["Reader"]
    },
    "targetId": "6507f8d72d3b2e1f5c9a1b3e",
    "targetType": "Novel",
    "overallScore": 4,
    // ... ข้อมูลอื่นๆ
  },
  "hasRated": true
}
```

หรือถ้าผู้ใช้ยังไม่เคยให้คะแนน:

```json
{
  "success": true,
  "rating": null,
  "hasRated": false
}
```
