# Feature 1.3.1 — 對話管理、群組聊天室、黑名單 SDD

> **文件版本**：2.0.0（已確認，覆蓋 1.0.0 草稿）
> **建立日期**：2026-02-24
> **負責 Agent**：Architect
> **狀態**：✅ 已確認（2026-02-24 用戶確認）

---

## 一、User Flow 規格

### A-1. 對話列表頁

```
進入 Chats 頁面
    │
    ▼
對話列表以 stagger 動畫依序淡入滑入（每條間隔 50ms，400ms ease-out）
    │
    ├─► 列表排序：置頂（pinnedAt ASC）→ 其餘依最新訊息時間降序
    │
    ├─► 每筆對話顯示：
    │       ├─ 對話頭像（1-on-1: 對方頭像 / 群組: 群組頭像）
    │       ├─ 名稱（1-on-1: 對方姓名 / 群組: 群組名稱）
    │       ├─ 最後訊息預覽（截斷至 30 字）
    │       ├─ 未讀計數紅點（unreadCount > 0 時顯示）
    │       ├─ 時間戳（智慧格式：今天顯示時間，昨天顯示「昨天」，更早顯示日期）
    │       └─ 置頂標示（pinnedAt != null 時顯示圖釘圖示）
    │
    └─► 長按對話 → 操作選單：
            ├─ 置頂 / 取消置頂
            ├─ 標為已讀
            └─ 離開群組（群組對話）
```

### A-2. 發起 1-on-1 私訊

```
[Friends 頁面] → 好友卡片「訊息」按鈕
    │
    ▼
mutation getOrCreateConversation(userId: ID!)
    │
    ├─► 已有對話 → 直接跳轉（冪等）
    └─► 新建對話 → 跳轉至空聊天室
                        │
                        ▼
                   顯示對方頭像 + 名稱
                   「開始你們的第一條訊息吧」提示
                   房間進入特效：fade-in + 對方頭像光環脈衝（400ms）
```

### A-3. 建立群組

```
[Chats 頁面] → 「+ 新對話」→「建立群組」
    │
    ▼
選擇成員（僅顯示 ACCEPTED 好友，不含自己）
    - 搜尋框過濾
    - 勾選成員（至少選 1 人）
    │
    ▼
設定群組
    - 群組名稱（必填）
    │
    ▼
mutation createGroupConversation(name: String!, userIds: [ID!]!)
    │
    ▼
自動進入群組聊天室
    - 系統訊息：「[你] 建立了群組，[成員A] 已加入」
    - 儀式動畫：金色粒子爆散特效（800ms spring 彈簧曲線）
```

### A-4. 群組內非好友標示

```
群組成員頭像角落：
    ├─ 是好友 → 正常頭像
    └─ 非好友 → 頭像右下角顯示「陌生人」圖示

點擊非好友頭像
    ▼
彈出個人資料卡片
    - 名稱、頭像
    - 「加好友」按鈕（可發送好友邀請）
```

### A-5. 群組成員管理

#### A-5.1 邀請成員

```
[群組 Header → 成員圖示 → 「邀請成員」]
    │
    ▼
選擇被邀請者（僅顯示邀請者本人的好友，已在群組內的排除）
    │
    ▼
mutation inviteToGroup(conversationId: ID!, userId: ID!)
    │
    ├─► 權限檢查：onlyOwnerCanInvite=true 且非 OWNER → FORBIDDEN
    ├─► 好友關係檢查：被邀請者必須是邀請者的好友
    └─► 成功 → 系統訊息 + 成員加入儀式動畫（頭像從左滑入 + 光環）
```

#### A-5.2 踢除成員

```
[群組資訊 → 成員列表 → 長按成員 → 「移除成員」]
    ├─► 僅有權限者可見此選項（預設：僅 OWNER）
    │
    ▼
確認 Dialog：「確定要移除 [成員名] 嗎？」
    │
    ▼
mutation removeFromGroup(conversationId: ID!, userId: ID!)
    │
    ├─► 不能踢除 OWNER
    ├─► onlyOwnerCanKick=true 且非 OWNER → FORBIDDEN
    └─► 成功：
            - 系統訊息：「[你] 將 [成員A] 移出群組」
            - 被踢者 Toast：「你已被移出此群組」
            - 被踢者離開 Socket room
            - 被踢成員可被重新邀請（無限制）
```

#### A-5.3 主動離群

```
[群組聊天室 → ⋮ → 「離開群組」]
    │
    ├─► 情境 A：一般 MEMBER
    │       → 系統訊息 → 離群 → 返回對話列表
    │
    ├─► 情境 B：OWNER（有其他成員）
    │       → 彈出「選擇繼承人」對話框（成員列表）
    │       → 必須主動選擇繼承人
    │       → mutation leaveGroup(conversationId, successorUserId)
    │       → 系統訊息：「[你] 離開了群組，[成員A] 成為新群主」
    │
    └─► 情境 C：OWNER（最後一人）
            → 提示「離開後群組將解散」
            → mutation leaveGroup(conversationId)（不需繼承人）
            → 群組刪除
```

### A-6. 群組設定

```
[群組 Header → ⋮ → 「群組設定」]
    │
    ▼
群組設定頁
    - 群組名稱（可編輯）
    - 權限開關：
        ☐ 僅群主可邀請成員（onlyOwnerCanInvite）
        ☑ 僅群主可踢除成員（onlyOwnerCanKick，預設開啟）
        ☐ 僅群主可修改設定（onlyOwnerCanEdit）

    ⚠️ 若 onlyOwnerCanEdit=true：非群主看到唯讀模式
    │
    ▼
mutation updateGroupSettings(conversationId, name?, settings?)
    → 設定變更後顯示系統訊息
```

### A-7. 黑名單

```
封鎖入口一：個人資料卡片 → 「封鎖用戶」
封鎖入口二：對話室 Header → ⋮ → 「封鎖」

mutation blockUser(userId: ID!)
    ├─► 建立 Blacklist 記錄
    └─► 若有好友關係 → 同時解除好友關係
        （靜默刪除：對方不知道被封鎖）

黑名單管理：設定頁 → 封鎖名單
    → 列表顯示所有已封鎖的用戶
    → mutation unblockUser(userId) 解除封鎖

黑名單效果（A 封鎖 B）：
    - B 無法向 A 發送好友邀請
    - B 無法邀請 A 加入群組
    - 現有共同群組保留（雙方仍在群組中）
    - B 不知道被封鎖
    - A 可以在設定頁查看封鎖名單並解除
```

---

## 二、儀式感設計規格

| 時機 | 動畫描述 | 動畫規格 |
|------|---------|---------|
| 進入對話室 | 訊息列表從下方依序 stagger 淡入 | 每條間隔 50ms，400ms ease-out |
| 發送訊息 | 紙飛機從輸入框飛出 + 訊息泡泡 pop 出現 | 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55) |
| 接收訊息 | 泡泡從下方滑入 + 輕微彈跳 + 光環脈衝 2 次 | 400ms，receive-message-slide |
| 打字指示器 | 三點波浪呼吸動畫 | 1.4s loop，typing-wave |
| 群組建立 | 金色粒子爆散 | 800ms，spring 彈簧曲線 |
| 成員加入 | 頭像從左滑入 + 光環出現 | 400ms ease-out |
| 被踢出/離群 | 頭像向右滑出 + 淡出 | 300ms ease-in |

---

## 三、後端資料模型（Prisma Schema 變更）

### 3.1 新增 Enum

```prisma
enum ParticipantRole {
  OWNER
  MEMBER
}
```

### 3.2 修改 Conversation

```prisma
model Conversation {
  id                 String           @id @default(uuid())
  type               ConversationType @default(ONE_TO_ONE)
  name               String?                          // 群組名稱（ONE_TO_ONE 為 null）
  pinnedAt           DateTime?                        // 置頂時間（null = 未置頂）
  onlyOwnerCanInvite Boolean          @default(false) // 僅群主可邀請
  onlyOwnerCanKick   Boolean          @default(true)  // 僅群主可踢人
  onlyOwnerCanEdit   Boolean          @default(false) // 僅群主可改設定
  createdAt          DateTime         @default(now())

  participants ConversationParticipant[]
  messages     Message[]
}
```

### 3.3 修改 ConversationParticipant

```prisma
model ConversationParticipant {
  id             String          @id @default(uuid())
  conversationId String
  userId         String
  role           ParticipantRole @default(MEMBER)  // 新增：角色
  joinedAt       DateTime        @default(now())
  lastReadAt     DateTime?
  ...
}
```

### 3.4 新增 Blacklist

```prisma
model Blacklist {
  id        String   @id @default(uuid())
  blockerId String
  blockedId String
  createdAt DateTime @default(now())

  blocker User @relation("BlacklistBlocker", fields: [blockerId], references: [id], onDelete: Cascade)
  blocked User @relation("BlacklistBlocked", fields: [blockedId], references: [id], onDelete: Cascade)

  @@unique([blockerId, blockedId])
  @@index([blockerId])
}
```

### 3.5 User Model 新增 Relations

```prisma
model User {
  ...
  blacklistAsBlocker Blacklist[] @relation("BlacklistBlocker")
  blacklistAsBlocked Blacklist[] @relation("BlacklistBlocked")
}
```

---

## 四、GraphQL API Contract

```graphql
enum ConversationType    { ONE_TO_ONE GROUP }
enum MessageType         { TEXT IMAGE }
enum MessageStatusType   { SENT DELIVERED READ }
enum ParticipantRole     { OWNER MEMBER }

type GroupSettings {
  onlyOwnerCanInvite: Boolean!
  onlyOwnerCanKick:   Boolean!
  onlyOwnerCanEdit:   Boolean!
}

type ConversationParticipant {
  user:     User!
  role:     ParticipantRole!
  isFriend: Boolean!      # viewer-dependent computed field
  joinedAt: String!
}

type Conversation {
  id:           ID!
  type:         ConversationType!
  name:         String            # null for ONE_TO_ONE
  participants: [ConversationParticipant!]!
  lastMessage:  Message
  unreadCount:  Int!
  pinnedAt:     String            # null if not pinned
  settings:     GroupSettings     # null for ONE_TO_ONE
  createdAt:    String!
}

type Message {
  id:             ID!
  conversationId: ID!
  sender:         User!
  content:        String
  messageType:    MessageType!
  imageUrl:       String
  createdAt:      String!
  status:         MessageStatusType!
}

type MessagePage {
  messages:   [Message!]!
  nextCursor: String    # 向上翻頁（載入更舊訊息）：指向結果集最舊的訊息
  prevCursor: String    # 向下補漏（重連後補齊）：指向結果集最新的訊息
}

input GroupSettingsInput {
  onlyOwnerCanInvite: Boolean
  onlyOwnerCanKick:   Boolean
  onlyOwnerCanEdit:   Boolean
}

extend type Query {
  conversations: [Conversation!]!
  conversation(id: ID!): Conversation
  # cursor/before: 載入更舊訊息（scroll up）；after: 補齊重連後漏失的訊息
  messages(conversationId: ID!, cursor: String, before: String, after: String, limit: Int): MessagePage!
  blacklist: [User!]!
}

extend type Mutation {
  # 1-on-1
  getOrCreateConversation(userId: ID!): Conversation!

  # Group
  createGroupConversation(name: String!, userIds: [ID!]!): Conversation!
  inviteToGroup(conversationId: ID!, userId: ID!): Conversation!
  removeFromGroup(conversationId: ID!, userId: ID!): Boolean!
  leaveGroup(conversationId: ID!, successorUserId: ID): Boolean!
  updateGroupSettings(conversationId: ID!, name: String, settings: GroupSettingsInput): Conversation!

  # Conversation actions
  pinConversation(conversationId: ID!): Boolean!
  unpinConversation(conversationId: ID!): Boolean!

  # Messages
  sendMessage(conversationId: ID!, content: String!): Message!
  markMessagesAsRead(conversationId: ID!): Boolean!

  # Blacklist
  blockUser(userId: ID!): Boolean!
  unblockUser(userId: ID!): Boolean!
}
```

---

## 五、業務規則（後端授權矩陣）

### 5.1 好友門禁

| 操作 | 條件 |
|------|------|
| getOrCreateConversation | 目標用戶必須與當前用戶是 ACCEPTED 好友 |
| createGroupConversation | userIds 中每個成員必須是 Creator 的好友 |
| inviteToGroup | 被邀請者必須是邀請者本人的好友 |

### 5.2 群組操作授權矩陣

| 操作 | 預設授權 | onlyOwner 設定後 |
|------|---------|----------------|
| inviteToGroup | 所有 MEMBER | 僅 OWNER |
| removeFromGroup | 僅 OWNER | 僅 OWNER（onlyOwnerCanKick=true 預設）|
| updateGroupSettings | 僅 OWNER | 僅 OWNER（onlyOwnerCanEdit=true 後）|
| leaveGroup | 所有 MEMBER / OWNER | 無限制 |

### 5.3 群主離群規則

| 情境 | 行為 |
|------|------|
| OWNER 離群 + 有其他成員 | 必須提供 successorUserId，否則 BAD_REQUEST |
| OWNER 離群 + 唯一成員 | 不需 successorUserId，直接解散群組 |
| MEMBER 離群 | 直接離群，不需 successorUserId |

### 5.4 黑名單規則

| 行為 | 移除好友 | 加入黑名單 |
|------|---------|-----------|
| 解除好友關係 | ✅ | ✅（隱含） |
| 對方可發邀請 | ✅ | ❌ |
| 對方可邀請進群 | ✅ | ❌ |
| 現有共同群組 | 保留 | 保留 |
| 對方知道被封鎖 | ❌ | ❌ |

---

## 六、Socket.io 事件規格

### 6.1 Server → Client 事件

| 事件 | 觸發時機 | Payload |
|------|---------|---------|
| `authenticated` | 連線成功後立即發送 | `{ userId, socketId, timestamp }` |
| `message:new` | `sendMessage` mutation 成功後，廣播至對話 Room | `{ message: Message, conversationId: string }` |
| `participant:changed` | `inviteToGroup` / `removeFromGroup` / `leaveGroup` 後 | `{ conversationId: string, action: 'joined' \| 'left' \| 'removed', userId: string }` |
| `sync:required` | **重連且 Connection State Recovery 失敗時** | `{ conversationIds: string[] }` |

### 6.2 `sync:required` 事件說明

Socket.io v4 有 Connection State Recovery（2 分鐘緩衝）：伺服器短暫快取離線期間的事件，重連時自動重播。若超過 2 分鐘（或快取滿），`socket.recovered === false`，伺服器發出 `sync:required`。

**前端處理流程**：

```
socket.on('sync:required', ({ conversationIds }) => {
    // 對每個 conversationId 用 after cursor 補齊漏失訊息
    for (const conversationId of conversationIds) {
        const lastKnownCursor = getLastKnownCursor(conversationId)  // 從本地狀態取最後一條訊息的 cursor
        if (lastKnownCursor) {
            // TanStack Query: refetch with after cursor
            queryClient.invalidateQueries(['messages', conversationId])
            // 或直接呼叫 messages(conversationId, after: lastKnownCursor)
        } else {
            // 首次載入，正常走 initial fetch
            queryClient.invalidateQueries(['messages', conversationId])
        }
    }
})
```

### 6.3 連線時 Room Join

```
用戶連線 Socket.io
    ▼
查詢 DB：此用戶的所有 ConversationParticipant
    ▼
socket.join(conversationId) for each conversation → 回傳 roomIds[]
    ▼
emit 'authenticated' 給用戶端
    ▼
若 socket.recovered === false 且 roomIds 非空
    → emit 'sync:required' ({ conversationIds: roomIds })
    ▼
此後 sendMessage 時：io.to(conversationId).emit('message:new', ...)
```

---

## 七、錯誤碼對照表

| 情境 | 錯誤碼 | HTTP 等效 | 錯誤訊息 |
|------|-------|----------|---------|
| 未登入（無 session / session 過期） | `UNAUTHENTICATED` | 401 | `"Not authenticated"` |
| 有登入但無權限（非成員、非 OWNER） | `FORBIDDEN` | 403 | `"Not a participant..."` / `"Only the group owner..."` |
| 資源不存在 | `NOT_FOUND` | 404 | `"... not found"` |
| 業務邏輯錯誤（非好友、踢 OWNER 等） | `BAD_REQUEST` | 400 | 各自描述 |
| 對 ONE_TO_ONE 呼叫群組操作 | `BAD_REQUEST` | 400 | `"Cannot ... non-group conversation"` |

> **命名澄清**：HTTP 401 歷史上誤稱 "Unauthorized"，GraphQL 社群已標準化為 `UNAUTHENTICATED`（未認證）。
> `FORBIDDEN` 才是有登入但無**授權**的正確代碼。前端應依 `extensions.code` 判斷，而非訊息字串。

---

## 八、前端實作注意事項

> ⚠️ 本節由 Backend Agent 整理，供 Frontend Agent 實作 feature/1.3.1-frontend 時參考。

### 8.1 訊息分頁：雙向游標（Sliding Window）

`messages` query 支援兩個方向：

```
方向               參數                  結果排序    用途
────────────────────────────────────────────────────────────────
向上翻頁（舊訊息）  before: String        DESC       無限向上滾動
向下補漏（新訊息）  after: String         ASC        重連 / 快速跳到最新
初次載入           （無 cursor）          DESC       進入對話室
```

**cursor 格式**：`"${ISO8601 timestamp}_${messageId}"`（例：`"2026-02-24T12:00:00.000Z_abc-123"`）

**`prevCursor` vs `nextCursor`**：

```
初始載入回傳：
  messages: [msg10, msg9, msg8, ...]  ← DESC（最新在前）
  nextCursor: "cursor-of-msg1"         ← 繼續向上翻（更舊的）
  prevCursor: "cursor-of-msg10"        ← 用於 after 查詢（補漏基準點）

after 查詢回傳：
  messages: [msg11, msg12, msg13, ...] ← ASC（最舊在前，供追加）
  nextCursor: null
  prevCursor: "cursor-of-msg13"        ← 新的 after 基準點
```

**TanStack Query `useInfiniteQuery` 建議設定**：

```typescript
useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam }) => fetchMessages(conversationId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,  // 向上翻頁
    getPreviousPageParam: (firstPage) => firstPage.prevCursor ?? undefined, // 補漏
    initialPageParam: undefined,
})

// 重連補漏：
queryClient.fetchInfiniteQuery({
    queryKey: ['messages', conversationId],
    initialPageParam: { after: lastKnownPrevCursor },
})
```

### 8.2 Socket.io 連線生命週期

```typescript
const socket = io(SERVER_URL, {
    // 啟用 Connection State Recovery（2 分鐘緩衝）
    retries: 3,
    ackTimeout: 10000,
})

socket.on('authenticated', ({ userId, socketId }) => {
    // 連線成功，可以開始 subscribe 事件
})

socket.on('sync:required', ({ conversationIds }) => {
    // 重連後發現有漏失訊息
    // 用 prevCursor（本地快取最後一條訊息的 cursor）呼叫 after 查詢
    conversationIds.forEach(id => syncMissedMessages(id))
})

socket.on('message:new', ({ message, conversationId }) => {
    // 即時新訊息：追加到該對話的訊息列表尾端（ASC 排列）
    // 同時更新 prevCursor 為此訊息的 cursor
    appendMessage(conversationId, message)
})

socket.on('participant:changed', ({ conversationId, action, userId }) => {
    // 群組成員變動：重新載入參與者列表
    // action: 'joined' | 'left' | 'removed'
    invalidateParticipants(conversationId)
})
```

### 8.3 `isFriend` 欄位注意事項

`ConversationParticipant.isFriend` 是 **viewer-dependent** 的計算欄位：
- 回傳值為「當前登入用戶與該成員是否為好友」
- Apollo Client cache key 需包含 viewer userId，否則跨帳號快取會污染
- 建議在 `InMemoryCache` 的 type policies 中設定：

```typescript
typePolicies: {
    ConversationParticipant: {
        keyFields: ['userId', 'conversationId'],
    },
}
```

### 8.4 錯誤處理標準

前端統一依 `extensions.code` 判斷行為，**不依賴訊息字串**（訊息可能本地化）：

```typescript
function handleGraphQLError(error: GraphQLError) {
    switch (error.extensions?.code) {
        case 'UNAUTHENTICATED':  // 未登入或 session 過期
            redirectToLogin()
            break
        case 'FORBIDDEN':        // 有登入但無權限（例如嘗試踢 OWNER）
            showPermissionToast()
            break
        case 'NOT_FOUND':
            showNotFoundToast()
            break
        case 'BAD_REQUEST':      // 業務邏輯錯誤（message 有說明原因）
            showErrorToast(error.message)
            break
    }
}
```

### 8.5 unreadCount 計算說明

`Conversation.unreadCount` 由後端根據 `lastReadAt` 計算：
- 計算公式：該對話中 `createdAt > lastReadAt` 且 `senderId ≠ currentUserId` 的訊息數量
- 前端呼叫 `markMessagesAsRead` mutation 後，重新 fetch `conversations` query 以刷新計數
- **不建議前端自行維護 unreadCount 狀態**，直接依賴 GraphQL query 的回傳值

---

## 九、技術決策紀錄

> 由 Backend Agent 於 2026-02-25 完成後端改善時補充。

### 9.1 型別集中管理（`src/graphql/types.ts`）

**決策**：將 `UserRecord`, `ParticipantRecord`, `MessageRecord`, `ConversationParent`, `FriendRequestParent`, `FriendshipParent` 集中至 `src/graphql/types.ts`，而非散落在 loaders.ts 和各 resolver 檔案中。

**理由**：Resolver 層和 Loader 層共用相同的資料形狀。集中後避免同一型別在多處定義或產生漂移（drift），讓新增 resolver 的開發者只需查閱一個檔案即可理解所有資料結構。

### 9.2 共享 Resolver 工具（`src/graphql/resolvers/utils.ts`）

**決策**：將 `requireAuth`, `toISO`, `normalizeFriendshipIds`, `getParticipant` 提取至共享的 utils.ts。

**理由**：`requireAuth` 原本在 `conversations.ts` 定義，`toISO` / `normalizeFriendshipIds` 在 `friends.ts` 定義，但它們都是跨 resolver 通用的工具。若各自定義，日後修改（例如調整錯誤訊息格式）需要逐個檔案修改，容易漏改。

**特別注意**：`getParticipant` 刻意使用直接 DB 查詢而非 DataLoader，原因是此函式用於**授權檢查**，需要即時最新狀態，不能使用可能已過期的 Loader 快取。

### 9.3 移除 `isAuthenticated` 欄位（`GraphQLContext`）

**決策**：從 `GraphQLContext` 中移除 `isAuthenticated: boolean`，改用 `userId !== null` 作為認證判斷依據。

**理由**：`isAuthenticated` 是 `userId !== null` 的衍生狀態（derived state），維護兩個表達相同資訊的欄位違反 Single Source of Truth 原則。兩者同時存在時，未來若有 middleware 變更可能造成不一致（`isAuthenticated=true` 但 `userId=null`）。

**`sessionId` 保留原因**：`sessionId` 有獨立的業務語義——被 `sessions` resolver 用來辨識「哪個 session 是當前請求的 session」，防止用戶意外撤銷自己的活動 session。這不是衍生狀態，無法從其他欄位推導。

### 9.4 統一認證錯誤代碼（`UNAUTHENTICATED`）

**決策**：所有未登入情境一律回傳 code `UNAUTHENTICATED` + message `"Not authenticated"`，取代舊的 `UNAUTHORIZED` + `"Unauthorized: You must be logged in"`。

**理由**：HTTP 401 歷史上誤稱 "Unauthorized"，但語義是「未認證」（unauthenticated）。`UNAUTHORIZED` 在語義上更接近「有身份但無授權」（即 HTTP 403 的情境）。GraphQL Apollo Server 社群已標準化：`UNAUTHENTICATED` = 未登入，`FORBIDDEN` = 無權限。統一後前端可以只依賴 `extensions.code` 做路由決策。

### 9.5 雙向游標分頁設計

**決策**：`messages` query 新增 `after: String` 參數和 `prevCursor` 回傳欄位，保留 `cursor`/`before` 向後相容。

**理由**：純粹 `before` 游標只能支援「無限向上滾動」（載入更舊的訊息）。但 Socket.io 重連後需要補齊漏失的新訊息，這需要 `after` 游標（向前，載入更新的訊息）。前端 `useInfiniteQuery` 可以同時持有兩個方向的 cursor，實現 Sliding Window 模式。

**cursor 格式**：`${ISO8601}_${UUID}` 組合，利用 `createdAt + id` 的複合排序保證在高並發（同一毫秒多條訊息）情況下的穩定性和唯一性。

### 9.6 Socket.io `sync:required` 事件

**決策**：新增 `sync:required` 事件，在 `socket.recovered === false` 時發送。

**理由**：Socket.io v4 的 Connection State Recovery 快取最長 2 分鐘。超過後伺服器無法重播事件，但**不通知**客戶端有訊息遺失。`sync:required` 填補這個通知缺口，讓客戶端知道哪些對話需要重新同步，而不是依靠客戶端輪詢。

### 9.7 `friendshipStatusLoader` 查詢形狀優化（Prisma 7.4.0）

**決策**：將 `friendshipStatusLoader` 的 `WHERE` 條件從「可變長度 OR array」改為「固定兩條件 + IN array」。

**理由**：Prisma 7.4.0 引入了 LRU Query Compilation Cache（預設容量 500）。此快取以 query **結構形狀**（shape）作為 key。若 OR 陣列長度不固定（1人查詢 vs 10人批次查詢生成不同形狀），每次都產生 cache miss，完全無法受益。改為固定的兩個 `IN` 子句後，無論批次大小，query 形狀始終相同，LRU 命中率接近 100%。
