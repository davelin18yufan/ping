# MULTI_AGENT_PLAN.md - 多 Agent 協作計畫面板

> 由 `Architect agent` 負責維護
> 這是團隊的「日常進度看板」，每天更新。所有 agent 都應先讀這份文件，了解當前狀態與優先級。

---

## 一、Feature 優先級列表（MVP Phase 1）

feature 狀態（🔲 待開始 → ⏳ 進行中 → ✅ 完成）

### Phase 1.0：基礎設施（已完成）

| Feature | 名稱 | 完成日期 | 測試數 | 核心產出 |
|---------|------|---------|--------|---------|
| 1.0.1 | Backend 基礎設施 | 2026-01-07 | 27 | Prisma schema, Redis, Better Auth, GraphQL Yoga, Socket.io |
| 1.0.2 | Frontend (Web) 基礎設施 | 2026-01-20 | 46 | TanStack Store, Apollo Client, Socket.io client, Better Auth client |
| 1.0.3 | Mobile 基礎設施 | 2026-01-24 | 97 | NativeWind, Jest, TanStack Store, Apollo, Socket.io, Better Auth Expo |
| 1.0.4 | Design System | 2026-01-26 | - | Design Tokens (28 colors/OKLCH), Primitive + Web + Mobile UI components |

> Sprint 1 (100% 完成)。Sprint 1 分工略。

---

### Phase 1.1：認證系統（已完成）

| Feature | 名稱 | 完成日期 | 測試數 | 核心產出 |
|---------|------|---------|--------|---------|
| 1.1.1 | OAuth Google/GitHub 登入 (Web) | 2026-02-03 | 79 | Server-Side Auth Middleware, OAuth 登入頁, 路由保護, SoundWaveLoader |
| 1.1.2 | Session 管理 | 2026-02-24 | 8 | `sessions` query, `revokeSession` / `revokeAllSessions` mutations |

**1.1.2 GraphQL API**：
```graphql
type SessionInfo { id, userAgent, ipAddress, createdAt, expiresAt, isCurrent }
sessions: [SessionInfo!]!
revokeSession(sessionId: ID!): Boolean!
revokeAllSessions: Boolean!
```

> Sprint 2 (100% 完成)。Sprint 2 分工略。

---

### Phase 1.2：UI/UX 設計改版（已完成）

| Feature | 名稱 | 完成日期 | 測試數 | 核心產出 |
|---------|------|---------|--------|---------|
| 1.2.0 | UI/UX 大改版 + Session 認證整合 | 2026-02-16 | 175 | 雙模式系統 (Glamorous/Minimal), CSS 架構重組, Capsule Morphing AppHeader, uiStore |
| 1.2.1 | 搜尋與加好友 | 2026-02-23 | 128 backend + 175 frontend | Friends GraphQL resolvers, DataLoader, Friends Page + Sonar Ping 動畫 |

**1.2.1 GraphQL API**：
```graphql
searchUsers(query: String!): [User!]!       # bidirectional blacklist filter
friends: [User!]!
pendingFriendRequests: [FriendRequest!]!
sentFriendRequests: [FriendRequest!]!
sendFriendRequest(userId: ID!): FriendRequest!  # + blacklist guard + user existence check
acceptFriendRequest(requestId: ID!): Friendship!  # + party membership guard (security fix)
rejectFriendRequest(requestId: ID!): Boolean!     # + party membership guard (security fix)
cancelFriendRequest(requestId: ID!): Boolean!
removeFriend(friendshipId: ID!): Boolean!    # new — soft removal, no blacklist entry
```

> Sprint 3 + Sprint 4 (100% 完成)。分工略。

---

### Phase 1.3：聊天系統

#### ✅ Feature 1.3.1 - 對話管理、群組聊天室、黑名單

| 欄位 | 內容 |
|------|------|
| **狀態** | ✅ Backend ✅ 完成 → Frontend ✅ 完成（Web）|
| **優先級** | P0 |
| **負責** | Backend ✅ / Frontend Web ✅ |
| **依賴** | Feature 1.2.1（好友系統，已合併 PR #32）|
| **SDD 參考** | `docs/architecture/Feature-1.3.1-SDD.md`（v2.0.0）|
| **分支** | `feature/1.3.1-frontend-web` |
| **實際完成日期（Backend）** | 2026-02-25 |
| **實際完成日期（Frontend Web）** | 2026-03-03 |

**Backend 已完成（22 個整合測試 TC-B-01 ~ TC-B-22，77/77 全部通過）**：

1. ✅ Prisma Migration：`ParticipantRole`、`pinnedAt`、群組設定、`Blacklist` model
2. ✅ GraphQL Schema：17 個新 Mutation / Query，雙向游標 `MessagePage`
3. ✅ DataLoaders：`participants`、`lastMessage`、`friendshipStatus`（viewer-bound）
4. ✅ Resolvers（`conversations.ts`）：16 個 resolver，含 Socket.io 廣播
5. ✅ Socket.io：`joinConversationRooms`、`sync:required` 重連補漏事件
6. ✅ 後端改善：集中型別（`types.ts`）、共享工具（`resolvers/utils.ts`）、統一錯誤代碼 `UNAUTHENTICATED`、雙向游標分頁

**Frontend Web 已完成（63 個 Vitest 測試 TC-F-01 ~ TC-F-30，238/238 全部通過）**：

1. ✅ 對話列表頁（`/chats` route + stagger 動畫 + breathing sidebar）
2. ✅ 對話室頁面（`/chats/$conversationId` + virtua VList + dual-cursor pagination）
3. ✅ Socket.io 整合（`useSocket` singleton + `message:new`、`presence:changed`、`typing:update`、`sync:required`）
4. ✅ 群組管理 UI（`GroupCreateModal` + `GroupInfoPanel` kick/leave/successor flow）
5. ✅ Hooks：`useHeartbeat`、`useConversations`、`useMessages`、`useTyping`
6. ✅ Animation：Steel Frost Resonance（`sidebar-breathe`、`eq-bar-scale`、`waveform-slide`、`ping-ripple`、`paper-plane-fly`）
7. 🔲 Mobile（React Native + NativeWind）版本 → 下一個 sprint

---

#### 🔲 Feature 1.3.2 - 即時訊息狀態（DELIVERED / READ）

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 待評估（Socket.io 即時推送已在 1.3.1 實作，本 Feature 聚焦於已讀/已送達確認機制）|
| **優先級** | P1 |
| **負責** | Backend + QA |
| **依賴** | Feature 1.3.1 Frontend 完成後 |
| **SDD 參考** | Feature-1.3.1-SDD.md §六 |
| **預期完成日期** | 待重新評估 |

---

#### ⏳ Feature 1.3.3 - 訊息氣泡操作（Message Bubble Actions）

| 欄位 | 內容 |
|------|------|
| **狀態** | ⏳ 進行中（Backend ✅ + Frontend Web ✅，Mobile 🔲 待開始）|
| **優先級** | P0（Feature 1.4.2 Emoji Reactions 的前置條件）|
| **負責** | Backend ✅ / Frontend Web ✅ / Mobile 🔲 |
| **依賴** | Feature 1.3.1 ✅（對話與訊息端到端已通）|
| **分支** | `feature/1.3.3-message-actions` |
| **SDD 參考** | `docs/architecture/Feature-1.3.3-SDD.md`（待建立）|
| **測試規格** | `docs/architecture/Feature-1.3.3-TDD-Tests.md` ✅ |
| **Backend 完成日期** | 2026-03-29 |
| **Frontend Web 完成日期** | 2026-03-30 |

**功能描述**：每條訊息氣泡支援的完整操作系統：Reply（含 inline 引用）、Copy、Forward、Multi-select、Pin（Sonic Wave 動畫）、Delete（從我這裡移除 / 為彼此收回）。

**設計決策**：
- Web：Hover → 角落圖示叢集（靜止 opacity 0.15 → hover 1）。右鍵 → 完整 glass context menu。
- Mobile：長按 → 底部 glass action sheet。向右滑動 → 快速回覆。
- Reply 顯示：氣泡內 inline 引用區塊（依引用訊息發送者視角著色左側 border + 發送者姓名 + 截斷內容）。
- Pin UI：氣泡角落間歇性 Sonic Wave 動畫（複用 sonic-wave keyframes）+ 可收合頂部 glass banner。
- Delete Modal：「從我這裡移除」/ 「為彼此收回」（品牌語氣）。
- Multi-select：發光環 + scale(0.97)（非 checkbox overlay）。
- Reply 引用 border 顏色 = 被引用訊息發送者視角：自己的訊息用 `--primary`，對方的訊息用 `--muted-foreground`。

**Backend Schema 異動**：

```prisma
model Message {
  // 新增欄位
  replyToId  String?   @map("reply_to_id")
  pinnedAt   DateTime? @map("pinned_at")
  deletedAt  DateTime? @map("deleted_at")

  // 新增自我關聯
  replyTo  Message?  @relation("MessageReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies  Message[] @relation("MessageReplies")
}

model Conversation {
  // 新增欄位
  pinnedMessageId String?  @map("pinned_message_id")
  pinnedMessage   Message? @relation("ConversationPinnedMessage", fields: [pinnedMessageId], references: [id], onDelete: SetNull)
}
```

**新增 GraphQL API**：

```graphql
enum DeleteMessageScope {
  OWN       # Remove only from sender's view
  EVERYONE  # Retract for all participants
}

type Mutation {
  replyToMessage(conversationId: ID!, content: String!, replyToMessageId: ID!): Message!
  pinMessage(messageId: ID!): Message!
  unpinMessage(messageId: ID!): Message!
  deleteMessage(messageId: ID!, scope: DeleteMessageScope!): Boolean!
  forwardMessage(messageId: ID!, targetConversationId: ID!): Message!
}
```

**新增前端檔案（Web）**：
- `MessageBubbleWrapper.tsx` — hover/right-click 事件層
- `MessageContextMenu.tsx` — glass context menu（cursor-positioned）
- `ReplyQuoteBlock.tsx` — inline 引用區塊（含 sender + 截斷內容）
- `PinnedMessageBanner.tsx` — 頂部可收合 glass banner
- `DeleteMessageModal.tsx` — 刪除確認 modal（兩個選項）
- `ForwardPickerModal.tsx` — 轉發目標對話選擇器
- `chatActionsStore.ts` — multi-select 狀態 + context menu 位置
- `message-actions.css` — hover 動畫、sonic wave pin indicator

**新增前端檔案（Mobile）**：
- `MessageBubbleWrapper.native.tsx` — long-press / swipe 手勢層
- `MessageActionSheet.tsx` — 底部 glass action sheet（6 個操作）

**修改現有檔案**：
- `MessageBubble.tsx` — 接受 replyTo、pinnedAt、deletedAt props
- `MessageList.tsx` — 整合 PinnedMessageBanner、multi-select 狀態
- `MessageInput.tsx` — 顯示 reply 預覽條、forward 模式切換
- `ChatRoom.tsx` — 整合 chatActionsStore、ForwardPickerModal
- `chatStore.ts` — 新增 pinnedMessage 欄位

**子任務分解**：

| # | 子任務 | 負責 | 預估工時 | 狀態 |
|---|--------|------|---------|------|
| 1 | Architect：建立 TDD 規格文件 | Architect | 2h | ✅ 完成 |
| 2 | Backend：Prisma migration（replyToId, pinnedAt, deletedAt, pinnedMessageId）| Backend | 1h | ✅ 完成 |
| 3 | Backend：實作 5 個新 GraphQL mutations | Backend | 4h | ✅ 完成 |
| 4 | Backend：Socket.io 廣播（message:pinned, message:deleted, message:forwarded）| Backend | 2h | ✅ 完成 |
| 5 | Frontend Web：MessageBubbleWrapper + MessageContextMenu | Frontend | 3h | ✅ 完成 |
| 6 | Frontend Web：ReplyQuoteBlock + PinnedMessageBanner | Frontend | 2h | ✅ 完成 |
| 7 | Frontend Web：DeleteMessageModal + ForwardPickerModal | Frontend | 2h | ✅ 完成 |
| 8 | Frontend Web：chatActionsStore + multi-select mode | Frontend | 2h | ✅ 完成 |
| 9 | Mobile：MessageBubbleWrapper.native + MessageActionSheet | Frontend | 3h | 🔲 待開始 |
| 10 | All：重構與測試覆蓋率確認 | All | 1h | ✅ 完成（297/297 tests passing）|

---

### Phase 1.4：即時功能補完（調整後順序）

> **調整說明（2026-02-28，更新）**：
> 後端補完（Feature 1.2.2）已於 2026-02-28 完成，包含 `me` query、`updateProfile`、typing indicators、Socket.io 型別化、Auth spec 整併。
> 功能執行順序：① ~~後端補完~~ ✅ → ② Feature 1.3.1 Frontend → ③ Feature 1.4.2（反應/貼圖/主題）→ ④ Feature 1.4.3 圖片上傳。

#### ✅ Feature 1.4.1 - 心跳機制 & 在線狀態

| 欄位 | 內容 |
|------|------|
| **狀態** | ✅ 完成（2026-02-28） |
| **優先級** | P0 |
| **負責** | Backend Developer |
| **分支** | `feature/1.2.1-backend` |
| **實際完成日期** | 2026-02-28 |

**完成內容（20/20 socket tests，TC-9~TC-20）**：
- ✅ TTL-based presence：`setUserOnline(userId, 35)` 35s TTL，客戶端每 30s 心跳刷新
- ✅ `heartbeat` socket handler：刷新 `user:online:{id}` TTL
- ✅ `user:away` handler：立即刪除 key + 廣播 `presence:changed { isOnline: false }`
- ✅ `broadcastPresence` helper：向用戶所在所有對話 room 廣播 `presence:changed`
- ✅ connect/disconnect 事件：自動廣播，多 socket 時不重複廣播
- ✅ GraphQL `User.isOnline: Boolean!` field resolver（讀 Redis TTL key）
- ✅ `searchUsers` 回傳 `isOnline` 狀態

**Commits**：`cc0af5b`, `756251f`, `53bfc29`, `4d9a6ce`

---

#### ✅ Feature 1.2.2 - 後端補完（P0）— 完成（2026-03-01）

| 欄位 | 內容 |
|------|------|
| **狀態** | ✅ 完成（2026-03-01，PR #36 已合併，續補 PR 開放中） |
| **優先級** | P0 |
| **負責** | Backend Developer |
| **分支** | `feature/1.2.2-backend` → PR #36（已合併）+ 新 PR |
| **實際完成日期** | 2026-03-01 |

**完成內容（128/128 tests 全部通過）**：

| 子任務 | 說明 | 狀態 |
|--------|------|------|
| `me` query | 回傳當前登入使用者完整資料（含 `isOnline`、`statusMessage`、`aestheticMode`），14 個整合測試 TC-U-01~TC-U-14 | ✅ 完成 |
| `updateProfile` mutation | 更新 name（1-50 字）、image URL、statusMessage（0-80 字）、aestheticMode（ornate\|minimal）含驗證 | ✅ 完成 |
| `AestheticMode` Prisma enum + migration | `ornate \| minimal`，migration file `20260228000000_add_user_statusmessage_aestheticmode` | ✅ 完成 |
| typing indicators | `typing:start` / `typing:stop` socket events + Redis TTL 8s，10 個整合測試 TC-T-01~TC-T-10 | ✅ 完成 |
| Socket.io 型別化 | `ClientToServerEvents` / `ServerToClientEvents` interfaces，全端 type-safe events | ✅ 完成 |
| `socket.rooms.has()` 授權 | 以 Socket.io room membership 取代 DB participant 查詢，O(1) 授權 | ✅ 完成 |
| `clearTypingIndicatorIfExists` | 原子性 Redis DEL 模式，避免多餘 isTyping:false 廣播 | ✅ 完成 |
| 初始 typing 狀態推送 | 新連線 socket 加入 room 後立即取得現有 typing users | ✅ 完成 |
| `user:away` typing 清除 | away 時原子清除所有 room 的 typing key + 廣播 | ✅ 完成 |
| Auth spec 整併 | `auth.spec.ts`（12 tests TC-A-01~TC-A-12）取代 `auth-oauth.spec.ts` + `better-auth.spec.ts` | ✅ 完成 |
| `markMessagesAsRead` | ✅ 已在 Feature 1.3.1 完成（雙向 cursor 分頁，無需重複） | ✅（1.3.1）|
| `removeFriend` mutation | 移除 ACCEPTED 好友關係，任一方可執行，不建立黑名單。TC-B-15~18 | ✅ 完成（2026-03-01）|
| `searchUsers` 黑名單過濾 | 雙向過濾：我封鎖的人 + 封鎖我的人均不出現在搜尋結果。TC-B-19~20 | ✅ 完成（2026-03-01）|
| `acceptFriendRequest` 安全修復 | 加入 party membership 守衛，防止第三方接受他人好友請求（FORBIDDEN）。TC-B-21 | ✅ 完成（2026-03-01）|
| `rejectFriendRequest` 安全修復 | 同上，防止第三方拒絕。TC-B-22 | ✅ 完成（2026-03-01）|
| `sendFriendRequest` 守衛擴充 | 使用者存在性（NOT_FOUND）+ 雙向黑名單守衛（FORBIDDEN）。TC-B-23~25 | ✅ 完成（2026-03-01）|
| 測試覆蓋補齊 | TC-B-26~34：cancelFriendRequest 收件方、NOT_FOUND×3、sentFriendRequests 正向、userId2 視角、邊界條件、UNAUTHENTICATED | ✅ 完成（2026-03-01）|
| `requireFriendshipParty()` 重構 | 抽取至 `utils.ts`，3 個 resolver 呼叫點收斂為一行 | ✅ 完成（2026-03-01）|

**Commits**：PR #36（`feature/1.2.2-backend`，已合併）+ `06e3c25`（新 PR）

---

#### 🔲 Feature 1.4.2 - 即時反應、貼圖、聊天室主題

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 待開始（等 Feature 1.3.1 Frontend 完成後才開始）|
| **優先級** | P1 |
| **負責** | Backend + Frontend + Mobile |
| **依賴** | Feature 1.3.1 Frontend ✅ |
| **SDD 參考** | 待 Architect 設計（`Feature-1.4.2-SDD.md`）|
| **預期完成日期** | 待重新評估 |

**子功能分解**：

**A. 即時反應（Emoji Reactions）**
- Architect 設計 `MessageReaction` Prisma model（messageId, userId, emoji）
- Backend：`addReaction` / `removeReaction` mutation + `reaction:updated` Socket.io 廣播
- Frontend：訊息泡泡 reaction strip UI、長按/hover 選擇 emoji panel
- Mobile：ReactionPicker（Pressable long press trigger）

**B. 貼圖系統（Sticker，仿 Yahoo 即時通嗆聲娃娃）**
- Architect 設計貼圖資產管理（`StickerPack`、`Sticker` models，動態 GIF/APNG）
- Backend：`stickerPacks` query、`sendSticker` mutation（message type = STICKER）
- Frontend：Sticker Picker UI（分頁包 + 搜尋）、內嵌動畫顯示
- Mobile：同 Web，使用 `react-native-fast-image` 支援 GIF

**C. 聊天室主題與背景（Chat Themes）**
- Architect 設計：per-conversation 或 global 用戶偏好（儲存於 `User.chatTheme` 或 `Conversation.theme`）
- Backend：`updateChatTheme` mutation（選擇預設主題或自訂背景色/漸層）
- Frontend：主題選擇器 UI（與現有 aestheticMode 整合）
- Mobile：同 Web

**開始前必須**：
- 建立測試規格文件 `Feature-1.4.2-TDD-Tests.md`
- Architect 設計 `MessageReaction`、`StickerPack` Schema

---

#### 🔲 Feature 1.4.3 - 圖片上傳與發送

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 待開始（往後移，等 Feature 1.4.2 完成後才開始）|
| **優先級** | P2（已往後移）|
| **負責** | Backend + Frontend + Mobile |
| **依賴** | Feature 1.4.2 ✅ |
| **SDD 參考** | backend.md §VI、database.md |
| **預期完成日期** | 待重新評估 |

**子任務（待分解）**：
- Architect 設計上傳 API 規格（S3 / local storage 策略）
- 建立測試規格文件 `Feature-1.4.3-TDD-Tests.md`
- Backend：上傳 endpoint、message type 擴充、file metadata 儲存
- Frontend Web：圖片選取 + 預覽 + 發送 UI
- Mobile：`expo-image-picker` 整合
- 壓縮策略（行動網路考量）

---

## 二、當前衝刺（Sprint 5）

### 衝刺目標
- **Sprint 1~4（已完成）**：Phase 1.0 基礎設施、OAuth 登入、UI/UX 改版、好友系統 + 聊天後端
- **Sprint 5（進行中）**：後端補完（me/updateProfile/typing/markRead）→ Feature 1.3.1 Frontend

### 當前各 Agent 狀態

#### Architect Agent
- **下一步**：
  1. Review & merge 新 PR（`feature/1.2.2-backend`）→ main（128/128 tests）
  2. 分配 Feature 1.3.1 Frontend 給 Fullstack Frontend Developer
  3. 持續更新 task-board.md

#### Backend Developer
- **已完成（2026-03-01）**：
  - ✅ `removeFriend` mutation（Stage 3 好友系統 8/8 = 100%）
  - ✅ `searchUsers` 雙向黑名單過濾
  - ✅ `acceptFriendRequest` / `rejectFriendRequest` 第三方安全漏洞修復
  - ✅ `sendFriendRequest` 守衛擴充（使用者存在性 + 黑名單）
  - ✅ 測試覆蓋從 20 → 34 cases（TC-B-21~B-34）
  - ✅ `requireFriendshipParty()` 重構至 utils.ts
- **下一個 Backend 任務**：等待 Architect 指派（uploadAvatar P1、或 1.3.2 訊息狀態同步）

#### Fullstack Frontend Developer
- **下一步**：
  1. 等待 Architect 確認新 PR 合併
  2. 讀取 `docs/architecture/Feature-1.3.1-SDD.md` 第八節「前端實作注意事項」
  3. 開始 Feature 1.3.1 Frontend（對話列表 + 聊天室頁面）
  4. 實作 Socket.io 即時整合（`message:new`、`presence:changed`、`typing:update`、`sync:required`）

---

## 三、重要決議與設計細節

### 3.1 認證流程
- OAuth 為主（Google、GitHub、Apple），Magic Link 為備援
- Better Auth 作為統一認證層
- Session 儲存在 HTTP-only Secure Cookie
- GraphQL Middleware 從 cookie 注入 userId 到 context

### 3.2 GraphQL vs Socket.io 劃分
- GraphQL：查詢、修改、初始資料（訊息歷史、好友列表）
- Socket.io：實時推送（新訊息、在線狀態、輸入提示）
- GraphQL Subscription：MVP 暫不使用（Socket.io 完全覆蓋）

### 3.3 資料庫層級
- PostgreSQL（生產）+ 本地開發用 Postgres 容器
- Prisma 作為唯一 ORM
- Better Auth tables 與業務 tables 共存

### 3.4 Web vs Mobile 共享策略
- 共享：`/shared/graphql/`、`/shared/hooks/`、`/shared/types/`、`/shared/utils/`
- 不共享：UI 元件（Web 用 React DOM，Mobile 用 React Native）

---

## 四、每週檢查清單

### 每日
- [ ] Architect 檢視 MULTI_AGENT_PLAN.md，確認優先級
- [ ] 各 agent 讀取計畫，確認自己的任務與依賴
- [ ] 更新 feature 狀態（🔲 待開始 → ⏳ 進行中 → ✅ 完成）
- [ ] 每完成一個子任務，提醒使用者 commit

### 每週五
- [ ] 審視本週完成情況，更新狀態
- [ ] 檢查是否有 blocker，escalate 給 Architect
- [ ] 計畫下週工作

---

## 五、已知風險與 Mitigation

| 風險 | 影響 | Mitigation |
|------|------|-----------|
| 後端補完延遲 | 前端 1.3.1 無法開始 | 後端先行合併 PR，補完功能單獨分支快速迭代 |
| NativeWind 設定問題 | Mobile UI 無法正常顯示 | Feature 1.0.3 已驗證，持續維護 |
| Better Auth + Prisma 整合問題 | 認證層崩潰 | 已完整測試，session middleware 穩定 |
| Web + Mobile Socket.io 不同步 | 實時通訊不可靠 | Feature 1.3.1 前端整合須嚴格測試 |
| 圖片壓縮效能 | 行動網路卡頓 | Feature 1.4.3 前進行 PoC 測試 |

---

## 六、溝通管道

- **Architect 答疑**：設計疑問找 Architect
- **跨層協調**：更新 MULTI_AGENT_PLAN.md，其他 agent 會看到
- **Git 衝突**：優先按照目錄邊界避免，若衝突找 Architect 仲裁

---

## 七、快速連結

| 資源 | 連結 |
|------|------|
| 系統設計總覽 | `/docs/architecture/overview.md` |
| 後端規格 | `/docs/architecture/backend.md` |
| Web 規格 | `/docs/architecture/frontend.md` |
| Mobile 規格 | `/docs/architecture/mobile.md` |
| 資料庫規格 | `/docs/architecture/database.md` |
| 對話系統 SDD | `/docs/architecture/Feature-1.3.1-SDD.md` |
| Claude Code 工作指南 | `/CLAUDE.md` |
| 進度看板 | `/docs/task-board.md` |

---

## 八、整體進度統計

| Phase | 完成度 | 測試通過數 |
|-------|--------|-----------|
| 1.0 基礎設施 | 4/4 ✅ | 170+ |
| 1.1 認證系統 | 2/2 ✅ | 87 |
| 1.2 UI/UX + 好友 | 2/2 ✅ | 303+ (128 backend + 175 frontend) |
| 1.3 聊天系統 | 1.3.1 ✅ / 1.3.3 ⏳ | 22 backend + 238 frontend (1.3.1) |
| 1.4 即時功能 | 2/3 ✅ (1.4.1 + 1.2.2 完成) | 20 + 19 |
| **Backend 總計** | **128/128 tests** | **PR #36 已合併** |

---

**最後更新**：2026-03-27
**當前 Sprint**：Sprint 5（Feature 1.3.1 Frontend Web ✅ → Feature 1.3.3 訊息氣泡操作 ⏳ 進行中）
**最新進展**：Feature 1.3.1 Frontend Web 完成（63 個 Vitest 測試，238/238 全通過）。Feature 1.3.3 TDD 規格已建立（`docs/architecture/Feature-1.3.3-TDD-Tests.md`），分支 `feature/1.3.3-message-actions` 已建立，等待 Backend + Frontend 開始實作。

**下一步優先順序**：
1. Feature 1.3.3 Backend：Prisma migration + 5 個 GraphQL mutations（replyToMessage, pinMessage, unpinMessage, deleteMessage, forwardMessage）
2. Feature 1.3.3 Frontend Web：MessageBubbleWrapper + MessageContextMenu + ReplyQuoteBlock + PinnedMessageBanner + Delete/Forward modals
3. Feature 1.3.3 Mobile：MessageBubbleWrapper.native + MessageActionSheet
4. Feature 1.3.3 完成後 → Feature 1.4.2（Emoji Reactions）可以開始

---

## Appendix：Feature 狀態圖示說明

- 🔲 **待開始**：未動工，等待上一個 feature 完成或設計確認
- ⏳ **進行中**：已分派任務，agent 正在執行（紅-綠-重構）
- 🟡 **測試中**：實作完成，等待 QA / CI/CD 驗收
- ✅ **完成**：所有層級實作 + 測試 + merge，可進行下一個 feature
- 🔲 **設計中**：Architect 正在設計，未拆解子任務
- ⚠️ **已暫停**：被其他 feature blocker，或需要重新設計
