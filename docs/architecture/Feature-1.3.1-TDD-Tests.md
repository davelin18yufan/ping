# Feature 1.3.1 — 對話管理、群組聊天室、黑名單 TDD 測試規格

> **版本**：1.0.0
> **建立日期**：2026-02-24
> **測試階段**：RED Phase（測試先行）
> **測試數量**：22 個整合測試

---

## 一、測試環境設定

- **Runtime**: Bun 1.3.5+
- **Framework**: `bun:test`
- **Database**: PostgreSQL (Test DB)
- **Fixtures**: `@tests/fixtures/prisma`, `@tests/fixtures/graphql`

---

## 二、測試案例清單

### TC-B-01: getOrCreateConversation 與好友建立 1-on-1

**目的**: 驗證可以與 ACCEPTED 好友建立一對一對話

**前置條件**:
- Alice 與 Bob 是 ACCEPTED 好友
- 兩人之間無現有對話

**操作**:
```graphql
mutation {
  getOrCreateConversation(userId: "user-bob") {
    id
    type
    participants { user { id } role }
  }
}
```

**期望結果**:
- `errors` 為 undefined
- `type` = "ONE_TO_ONE"
- `participants` 包含 Alice 和 Bob（都是 MEMBER role）
- 回傳新建立的 conversation id

---

### TC-B-02: getOrCreateConversation 冪等（回傳現有對話）

**目的**: 驗證重複呼叫回傳相同的對話（不建立重複）

**前置條件**:
- Alice 與 Bob 是 ACCEPTED 好友
- 兩人之間已有一個 ONE_TO_ONE 對話

**操作**:
- 第一次呼叫 `getOrCreateConversation(userId: "user-bob")`
- 第二次呼叫相同 mutation

**期望結果**:
- 兩次回傳的 `id` 相同
- DB 中不存在兩個 Alice-Bob 的 ONE_TO_ONE 對話

---

### TC-B-03: getOrCreateConversation 非好友 FORBIDDEN

**目的**: 驗證非好友之間無法建立 1-on-1 對話

**前置條件**:
- Alice 與 Carol 無好友關係

**操作**:
```graphql
mutation {
  getOrCreateConversation(userId: "user-carol") { id }
}
```

**期望結果**:
- `errors[0].extensions.code` = "FORBIDDEN"

---

### TC-B-04: createGroupConversation 成功（Creator=OWNER）

**目的**: 驗證 Creator 為 OWNER role，其他成員為 MEMBER

**前置條件**:
- Alice 是 Bob 和 Carol 的好友

**操作**:
```graphql
mutation {
  createGroupConversation(name: "Test Group", userIds: ["user-bob", "user-carol"]) {
    id
    type
    name
    participants { user { id } role }
  }
}
```

**期望結果**:
- `type` = "GROUP"
- `name` = "Test Group"
- Alice（Creator）的 `role` = "OWNER"
- Bob 和 Carol 的 `role` = "MEMBER"
- 共 3 個 participants

---

### TC-B-05: createGroupConversation 含非好友 FORBIDDEN

**目的**: 驗證 userIds 中包含非好友時拒絕建立

**前置條件**:
- Alice 是 Bob 的好友
- Alice 不是 Dave 的好友

**操作**:
```graphql
mutation {
  createGroupConversation(name: "Bad Group", userIds: ["user-bob", "user-dave"]) { id }
}
```

**期望結果**:
- `errors[0].extensions.code` = "FORBIDDEN"

---

### TC-B-06: inviteToGroup 成員邀請自己好友（非 Creator 好友可加入）

**目的**: 驗證任意成員可邀請自己的好友（不需是其他人的好友）

**前置條件**:
- 群組 G 由 Alice（OWNER）和 Bob（MEMBER）組成
- Bob 是 Dave 的好友
- Dave 不是 Alice 的好友

**操作**（以 Bob 的 session）:
```graphql
mutation {
  inviteToGroup(conversationId: "group-id", userId: "user-dave") {
    participants { user { id } }
  }
}
```

**期望結果**:
- Dave 成功加入群組（participants 中出現）
- Dave 的 role = "MEMBER"

---

### TC-B-07: inviteToGroup 邀請非自己好友 FORBIDDEN

**目的**: 驗證只能邀請自己的好友

**前置條件**:
- 群組 G 中 Bob（MEMBER）想邀請 Eve
- Bob 不是 Eve 的好友

**操作**（以 Bob 的 session）:
```graphql
mutation {
  inviteToGroup(conversationId: "group-id", userId: "user-eve") { id }
}
```

**期望結果**:
- `errors[0].extensions.code` = "FORBIDDEN"

---

### TC-B-08: inviteToGroup onlyOwnerCanInvite=true 非 OWNER FORBIDDEN

**目的**: 驗證群組設定 onlyOwnerCanInvite=true 時，非 OWNER 無法邀請

**前置條件**:
- 群組 G 設定 `onlyOwnerCanInvite = true`
- Bob（MEMBER）是 Dave 的好友，嘗試邀請

**操作**（以 Bob 的 session）:
```graphql
mutation {
  inviteToGroup(conversationId: "group-id", userId: "user-dave") { id }
}
```

**期望結果**:
- `errors[0].extensions.code` = "FORBIDDEN"

---

### TC-B-09: removeFromGroup OWNER 踢出成員成功

**目的**: 驗證 OWNER 可以踢出 MEMBER

**前置條件**:
- 群組 G 由 Alice（OWNER）、Bob（MEMBER）、Carol（MEMBER）組成

**操作**（以 Alice 的 session）:
```graphql
mutation {
  removeFromGroup(conversationId: "group-id", userId: "user-bob")
}
```

**期望結果**:
- 回傳 `true`
- Bob 不再是群組 participants

---

### TC-B-10: removeFromGroup 被踢成員可重新邀請

**目的**: 驗證被踢出的成員可以被重新邀請加入

**前置條件**:
- Bob 已被從群組 G 踢出
- Alice 是 Bob 的好友

**操作**（以 Alice 的 session）:
```graphql
mutation {
  inviteToGroup(conversationId: "group-id", userId: "user-bob") {
    participants { user { id } }
  }
}
```

**期望結果**:
- Bob 成功重新加入群組

---

### TC-B-11: removeFromGroup onlyOwnerCanKick=true 非 OWNER FORBIDDEN

**目的**: 驗證預設設定下非 OWNER 無法踢人

**前置條件**:
- 群組 G 設定 `onlyOwnerCanKick = true`（預設）
- Bob（MEMBER）嘗試踢出 Carol

**操作**（以 Bob 的 session）:
```graphql
mutation {
  removeFromGroup(conversationId: "group-id", userId: "user-carol")
}
```

**期望結果**:
- `errors[0].extensions.code` = "FORBIDDEN"

---

### TC-B-12: leaveGroup 群主選擇繼承人後離群

**目的**: 驗證群主必須指定繼承人才能離群（當有其他成員時）

**前置條件**:
- 群組 G 由 Alice（OWNER）和 Bob（MEMBER）組成

**操作**（以 Alice 的 session）:
```graphql
mutation {
  leaveGroup(conversationId: "group-id", successorUserId: "user-bob")
}
```

**期望結果**:
- 回傳 `true`
- Alice 不再是 participants
- Bob 的 role 更新為 "OWNER"

---

### TC-B-13: leaveGroup 群主不提供 successorUserId 回傳 BAD_REQUEST

**目的**: 驗證群主有其他成員時必須提供繼承人

**前置條件**:
- 群組 G 由 Alice（OWNER）和 Bob（MEMBER）組成

**操作**（以 Alice 的 session）:
```graphql
mutation {
  leaveGroup(conversationId: "group-id")
}
```

**期望結果**:
- `errors[0].extensions.code` = "BAD_REQUEST"

---

### TC-B-14: leaveGroup 群主為最後一人解散群組

**目的**: 驗證群主是唯一成員時可直接離群並解散群組

**前置條件**:
- 群組 G 只有 Alice（OWNER）一個成員

**操作**（以 Alice 的 session）:
```graphql
mutation {
  leaveGroup(conversationId: "group-id")
}
```

**期望結果**:
- 回傳 `true`
- Conversation 不再存在於 DB

---

### TC-B-15: updateGroupSettings 更新群名與設定

**目的**: 驗證 OWNER 可以更新群組名稱和設定

**前置條件**:
- 群組 G 由 Alice（OWNER）管理

**操作**（以 Alice 的 session）:
```graphql
mutation {
  updateGroupSettings(
    conversationId: "group-id"
    name: "New Group Name"
    settings: { onlyOwnerCanInvite: true, onlyOwnerCanKick: true, onlyOwnerCanEdit: true }
  ) {
    name
    settings { onlyOwnerCanInvite onlyOwnerCanKick onlyOwnerCanEdit }
  }
}
```

**期望結果**:
- `name` = "New Group Name"
- `settings.onlyOwnerCanInvite` = true
- `settings.onlyOwnerCanKick` = true
- `settings.onlyOwnerCanEdit` = true

---

### TC-B-16: pinConversation / unpinConversation 切換置頂

**目的**: 驗證置頂和取消置頂功能

**前置條件**:
- Alice 有一個對話 C（pinnedAt = null）

**操作 1**（以 Alice 的 session）:
```graphql
mutation { pinConversation(conversationId: "conv-id") }
```

**期望結果 1**: 回傳 `true`，DB 中 `pinnedAt` 不為 null

**操作 2**（unpinConversation）:
```graphql
mutation { unpinConversation(conversationId: "conv-id") }
```

**期望結果 2**: 回傳 `true`，DB 中 `pinnedAt` = null

---

### TC-B-17: conversations 排序：置頂在前，其餘依最新訊息時間

**目的**: 驗證對話列表排序邏輯

**前置條件**:
- Alice 有三個對話：C1（有訊息，最早）、C2（有訊息，最新）、C3（置頂）

**操作**:
```graphql
query {
  conversations { id pinnedAt }
}
```

**期望結果**:
- C3（置頂）排在第一
- C2（最新訊息）排在第二
- C1（較早訊息）排在第三

---

### TC-B-18: conversation(id) participants 含 isFriend 標示

**目的**: 驗證 ConversationParticipant.isFriend 是 viewer-dependent 的計算欄位

**前置條件**:
- 群組 G 有 Alice（OWNER）、Bob（Alice 的好友）、Dave（非 Alice 的好友）

**操作**（以 Alice 的 session）:
```graphql
query {
  conversation(id: "group-id") {
    participants { user { id } isFriend }
  }
}
```

**期望結果**:
- Bob 的 `isFriend` = true
- Dave 的 `isFriend` = false
- Alice 自己的 `isFriend` = false（不是自己的好友）

---

### TC-B-19: sendMessage 成功建立訊息

**目的**: 驗證可以在對話中發送訊息

**前置條件**:
- Alice 是群組 G 的成員

**操作**（以 Alice 的 session）:
```graphql
mutation {
  sendMessage(conversationId: "group-id", content: "Hello!") {
    id
    content
    messageType
    sender { id }
    createdAt
    status
  }
}
```

**期望結果**:
- `content` = "Hello!"
- `messageType` = "TEXT"
- `sender.id` = Alice 的 id
- `status` = "SENT"
- `createdAt` 非空

---

### TC-B-20: messages cursor-based 分頁（含 nextCursor）

**目的**: 驗證 cursor-based 分頁正確返回訊息和 nextCursor

**前置條件**:
- 對話 C 中有 25 條訊息（按時間排序）

**操作 1**（第一頁，limit=20）:
```graphql
query {
  messages(conversationId: "conv-id", limit: 20) {
    messages { id createdAt }
    nextCursor
  }
}
```

**期望結果 1**:
- `messages` 包含 20 條（最新的 20 條）
- `nextCursor` 非 null

**操作 2**（第二頁）:
```graphql
query {
  messages(conversationId: "conv-id", cursor: "<nextCursor>", limit: 20) {
    messages { id }
    nextCursor
  }
}
```

**期望結果 2**:
- `messages` 包含剩餘 5 條
- `nextCursor` = null（沒有更多）

---

### TC-B-21: blockUser 封鎖用戶 + 自動解除好友關係

**目的**: 驗證封鎖功能同時解除好友關係

**前置條件**:
- Alice 和 Bob 是 ACCEPTED 好友

**操作**（以 Alice 的 session）:
```graphql
mutation { blockUser(userId: "user-bob") }
```

**期望結果**:
- 回傳 `true`
- DB 中存在 Blacklist 記錄（blockerId=Alice, blockedId=Bob）
- Alice-Bob 的 Friendship 記錄不再是 ACCEPTED 狀態（或已刪除）

**驗證 blacklist query**:
```graphql
query { blacklist { id name } }
```
- 回傳 Bob 的資料

---

### TC-B-22: 所有操作未登入 UNAUTHENTICATED

**目的**: 驗證所有需要認證的操作在未登入時回傳 UNAUTHENTICATED

**操作**（不帶 session token）:
```graphql
query { conversations { id } }
mutation { getOrCreateConversation(userId: "any") { id } }
```

**期望結果**:
- `errors[0].extensions.code` = "UNAUTHENTICATED"
- HTTP status 暗示 401

---

## 三、測試資料模型

```
用戶:
  user-alice  (Alice Chen)   ← 主要測試用戶
  user-bob    (Bob Wang)     ← Alice 的好友
  user-carol  (Carol Lin)    ← Alice 的好友
  user-dave   (Dave Huang)   ← Bob 的好友，非 Alice 的好友
  user-eve    (Eve Liu)      ← 無好友關係

好友關係:
  Alice ↔ Bob    (ACCEPTED)
  Alice ↔ Carol  (ACCEPTED)
  Bob   ↔ Dave   (ACCEPTED)
```

---

## 四、測試覆蓋矩陣

| Resolver | 測試案例 |
|----------|---------|
| getOrCreateConversation | TC-B-01, TC-B-02, TC-B-03 |
| createGroupConversation | TC-B-04, TC-B-05 |
| inviteToGroup | TC-B-06, TC-B-07, TC-B-08 |
| removeFromGroup | TC-B-09, TC-B-10, TC-B-11 |
| leaveGroup | TC-B-12, TC-B-13, TC-B-14 |
| updateGroupSettings | TC-B-15 |
| pinConversation/unpinConversation | TC-B-16 |
| conversations (sorting) | TC-B-17 |
| conversation (isFriend) | TC-B-18 |
| sendMessage | TC-B-19 |
| messages (pagination) | TC-B-20 |
| blockUser + blacklist | TC-B-21 |
| UNAUTHENTICATED guard | TC-B-22 |
