# Comments API Usage Examples

## API Endpoints

### 1. GET /api/comments - List Comments
```bash
# Get comments for a novel
GET /api/comments?targetId=507f1f77bcf86cd799439011&targetType=NOVEL&page=1&limit=20&sort=new

# Get replies to a specific comment
GET /api/comments?targetId=507f1f77bcf86cd799439011&targetType=COMMENT&parentCommentId=507f1f77bcf86cd799439012&page=1&limit=10
```

### 2. POST /api/comments - Create Comment
```bash
POST /api/comments
Content-Type: application/json
{
  "targetId": "507f1f77bcf86cd799439011",
  "targetType": "NOVEL",
  "content": "This is a great novel!",
  "context": {
    "novelId": "507f1f77bcf86cd799439011"
  }
}
```

### 3. GET /api/comments/[id] - Get Single Comment
```bash
GET /api/comments/507f1f77bcf86cd799439013
```

### 4. PUT /api/comments/[id] - Update Comment
```bash
PUT /api/comments/507f1f77bcf86cd799439013
Content-Type: application/json
{
  "content": "Updated comment content"
}
```

### 5. PUT /api/comments/[id] - Pin/Unpin Comment (Moderators only)
```bash
PUT /api/comments/507f1f77bcf86cd799439013
Content-Type: application/json
{
  "action": "pin"
}
```

### 6. DELETE /api/comments/[id] - Delete Comment
```bash
DELETE /api/comments/507f1f77bcf86cd799439013
Content-Type: application/json
{
  "reason": "Inappropriate content"
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "comment": {
    "_id": "507f1f77bcf86cd799439013",
    "userId": {
      "_id": "507f1f77bcf86cd799439014",
      "username": "john_doe",
      "avatarUrl": "https://example.com/avatar.jpg",
      "primaryPenName": "John Doe",
      "roles": ["Reader"]
    },
    "targetId": "507f1f77bcf86cd799439011",
    "targetType": "NOVEL",
    "content": "This is a great novel!",
    "status": "visible",
    "likesCount": 5,
    "repliesCount": 2,
    "isPinned": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### List Response
```json
{
  "success": true,
  "total": 150,
  "page": 1,
  "limit": 20,
  "comments": [
    // ... array of comment objects
  ]
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Comment Types

- `NOVEL` - Comment on a novel
- `EPISODE` - Comment on an episode
- `BOARD` - Comment on a board/forum post
- `COMMENT` - Reply to another comment

## Features

✅ **Complete CRUD Operations**
- Create, read, update, delete comments
- Nested replies support
- User authentication required

✅ **Moderation Features**
- Pin/unpin comments (moderators only)
- Soft delete with reason
- Status management

✅ **Performance Optimized**
- Redis caching support (with fallback)
- Pagination support
- Efficient database queries

✅ **Security**
- User authentication
- Permission checks
- Input validation

✅ **No Redis Dependency**
- Mock Redis implementation
- Works without Redis installation
- Automatic fallback to in-memory storage
