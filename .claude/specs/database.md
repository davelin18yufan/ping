# 即時通訊應用 MVP 版本 - 資料庫與快取規格書 (Ping)

## 一、資料庫 Schema (Prisma)

### 模型定義

### Better Auth 所需模型（由 @better-auth/prisma-adapter 自動生成）
- User（Better Auth 版）：id、email（unique）、emailVerified、name（displayName）、image（avatarUrl）
- Account：儲存 OAuth provider 資訊（provider、providerAccountId 等）
- Session：session 資料
- VerificationToken：Magic Link 使用

**User**
- 欄位：id (UUID PK)、email (Unique)、displayName、avatarUrl (Nullable)、createdAt、updatedAt
- 關係：sentMessages、messageStatuses、friendshipsUser1、friendshipsUser2、conversations

**Friendship**
- 欄位：id (UUID PK)、userId1、userId2、status (Enum)、requestedBy、createdAt、updatedAt
- 限制：Unique [userId1, userId2]
- 索引：[userId1, status]、[userId2, status]
- 關係：user1、user2、requester

**Conversation**
- 欄位：id (UUID PK)、type (Enum)、createdAt
- 關係：participants、messages

**ConversationParticipant**
- 欄位：id (UUID PK)、conversationId、userId、joinedAt、lastReadAt (Nullable)
- 限制：Unique [conversationId, userId]
- 索引：[userId]
- 關係：conversation、user

**Message**
- 欄位：id (UUID PK)、conversationId、senderId、content (Nullable)、messageType (Enum)、imageUrl (Nullable)、createdAt
- 索引：[conversationId, createdAt DESC]
- 關係：conversation、sender、statuses

**MessageStatus**
- 欄位：id (UUID PK)、messageId、userId、status (Enum)、updatedAt
- 限制：Unique [messageId, userId]
- 索引：[messageId]
- 關係：message、user

### Enum 定義
- FriendshipStatus：PENDING、ACCEPTED、REJECTED
- ConversationType：ONE_TO_ONE、GROUP
- MessageType：TEXT、IMAGE
- MessageStatusType：SENT、DELIVERED、READ

## 二、Redis 快取規格

### 快取鍵結構
- 在線狀態：online:user:{userId} → "1" (TTL 300s)
- 未讀計數：unread:{userId}:{conversationId} → 數字 (無 TTL)
- Socket 連線映射：connection:{userId} → socketId (無 TTL)
- 輸入狀態：typing:{conversationId}:{userId} → "1" (TTL 5s)

### 快取操作規格
- 用戶上線/離線：SET/DEL online key 並 PUBLISH user:online/offline
- 未讀計數：INCR、GET、DEL
- Socket 連線：SET、GET、DEL
- 黑名單與輸入狀態操作
- Rate limiting 可交由 Better Auth 內建功能（支援 Redis adapter）

## 三、資料庫相關非功能需求

- 索引設計目的：加速好友查詢、訊息歷史排序、參與者查詢
- 唯一約束目的：避免重複好友關係、重複參與者、重複訊息狀態
- 建議未來擴展：主從複製、慢查詢監控、分區（當資料量成長時)