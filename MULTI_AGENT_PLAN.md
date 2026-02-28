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
| 1.2.1 | 搜尋與加好友 | 2026-02-23 | 69 backend + 175 frontend | Friends GraphQL resolvers, DataLoader, Friends Page + Sonar Ping 動畫 |

**1.2.1 GraphQL API**：
```graphql
searchUsers(query: String!): [User!]!
friends: [User!]!
pendingFriendRequests: [FriendRequest!]!
sentFriendRequests: [FriendRequest!]!
sendFriendRequest(userId: ID!): FriendRequest!
acceptFriendRequest(requestId: ID!): Friendship!
rejectFriendRequest(requestId: ID!): Boolean!
cancelFriendRequest(requestId: ID!): Boolean!
```

> Sprint 3 + Sprint 4 (100% 完成)。分工略。

---

### Phase 1.3：聊天系統

#### ⏳ Feature 1.3.1 - 對話管理、群組聊天室、黑名單

| 欄位 | 內容 |
|------|------|
| **狀態** | ⏳ Backend ✅ 完成 → Frontend 🔲 待開始 |
| **優先級** | P0 |
| **負責** | Backend（已完成）→ Fullstack Frontend Developer（下一步）|
| **依賴** | Feature 1.2.1（好友系統，已合併 PR #32）|
| **SDD 參考** | `docs/architecture/Feature-1.3.1-SDD.md`（v2.0.0）|
| **分支** | Backend: `feature/1.2.1-backend` ✅ 待 PR |
| **實際完成日期（Backend）** | 2026-02-25 |

**Backend 已完成（22 個整合測試 TC-B-01 ~ TC-B-22，77/77 全部通過）**：

1. ✅ Prisma Migration：`ParticipantRole`、`pinnedAt`、群組設定、`Blacklist` model
2. ✅ GraphQL Schema：17 個新 Mutation / Query，雙向游標 `MessagePage`
3. ✅ DataLoaders：`participants`、`lastMessage`、`friendshipStatus`（viewer-bound）
4. ✅ Resolvers（`conversations.ts`）：16 個 resolver，含 Socket.io 廣播
5. ✅ Socket.io：`joinConversationRooms`、`sync:required` 重連補漏事件
6. ✅ 後端改善：集中型別（`types.ts`）、共享工具（`resolvers/utils.ts`）、統一錯誤代碼 `UNAUTHENTICATED`、雙向游標分頁

**Frontend 待開始子任務**：

> ⚠️ 開始前必須先讀 `docs/architecture/Feature-1.3.1-SDD.md` 第八節「前端實作注意事項」

1. 🔲 對話列表頁（`conversations` query + stagger 動畫）
2. 🔲 對話室頁面（`messages` query + 雙向 `useInfiniteQuery` sliding window）
3. 🔲 Socket.io 整合（`message:new`、`participant:changed`、`sync:required`）
4. 🔲 群組管理 UI（邀請 / 踢除 / 離群 / 設定）
5. 🔲 黑名單管理（封鎖 / 解除封鎖）
6. 🔲 Mobile（React Native + NativeWind）版本

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

### Phase 1.4：即時功能補完（調整後順序）

> **調整說明（2026-02-28）**：
> 後端 `feature/1.2.1-backend` 分支尚有數個 P0 功能待補完（`me` query、`updateProfile` 等），須在前端開始 Feature 1.3.1 之前先行完成。
> 功能執行順序為：① 後端補完 → ② Feature 1.3.1 Frontend → ③ Feature 1.4.2 圖片上傳。

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

#### 🔲 [優先] 後端補完（P0）— 待 PR 合併後立即開始

> 分支：從 `main` 開新分支（待命名），或在 `feature/1.2.1-backend` 合併後的 main 上建立。

| 子任務 | 說明 | 狀態 |
|--------|------|------|
| `me` query | 回傳當前登入使用者完整資料（含 `isOnline`） | 🔲 待開始 |
| `updateProfile` mutation | 更新 displayName、avatarUrl、bio | 🔲 待開始 |
| typing indicator | `typing:start` / `typing:stop` socket events + Redis TTL 防抖 | 🔲 待開始 |
| `markMessagesAsRead` mutation | 批次更新 MessageStatus → READ，廣播 `message:read` | 🔲 待開始 |

**完成標準**：
- 以上 4 項均有整合測試（TDD Green Phase）
- TypeScript 0 errors, Linter 0 warnings
- PR 建立並通知 Architect review

---

#### 🔲 Feature 1.4.2 - 圖片上傳與發送

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 待開始（等 Feature 1.3.1 Frontend 完成後才開始）|
| **優先級** | P1（已往後移）|
| **負責** | Backend + Frontend + Mobile |
| **依賴** | Feature 1.3.1 Frontend ✅ |
| **SDD 參考** | backend.md §VI、database.md |
| **預期完成日期** | 待重新評估 |

**子任務（待分解）**：
- Architect 設計上傳 API 規格（S3 / local storage 策略）
- 建立測試規格文件 `Feature-1.4.2-TDD-Tests.md`
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
  1. Review & merge `feature/1.2.1-backend` → main（Backend: Feature 1.1.2 + 1.2.1 + 1.3.1 + 1.4.1，89/89 tests）
  2. 建立後端補完任務的測試規格（me query、updateProfile、typing indicator、markMessagesAsRead）
  3. 待後端補完 PR 合併後，分配 Feature 1.3.1 Frontend 給 Fullstack Frontend Developer
  4. 持續更新 task-board.md

#### Backend Developer
- **下一步**：
  1. 等待 Architect merge `feature/1.2.1-backend`
  2. 新分支：實作 `me` query + `updateProfile` mutation（含整合測試）
  3. 實作 typing indicator（`typing:start` / `typing:stop` socket events）
  4. 實作 `markMessagesAsRead` mutation
  5. 提交 PR，等待 Architect review

#### Fullstack Frontend Developer
- **下一步**：
  1. 等待 Architect 確認後端補完 PR 合併
  2. 讀取 `docs/architecture/Feature-1.3.1-SDD.md` 第八節
  3. 開始 Feature 1.3.1 Frontend（對話列表 + 聊天室頁面）
  4. 實作 Socket.io 即時整合（`message:new`、`presence:changed`、`sync:required`）

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
| 圖片壓縮效能 | 行動網路卡頓 | Feature 1.4.2 前進行 PoC 測試 |

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
| 1.2 UI/UX + 好友 | 2/2 ✅ | 244+ |
| 1.3 聊天系統 | Backend ✅ / Frontend 🔲 | 22 (backend) |
| 1.4 即時功能 | 1/3 ✅ (1.4.1 完成) | 20 |
| **Backend 總計** | **89/89 tests** | **feature/1.2.1-backend 待 merge** |

---

**最後更新**：2026-02-28
**當前 Sprint**：Sprint 5（後端 PR 待合併 → 後端補完 → Feature 1.3.1 Frontend）
**最新進展**：Feature 1.4.1 心跳機制 & 在線狀態完成（2026-02-28）。`feature/1.2.1-backend` 含 Feature 1.1.2 + 1.2.1 + 1.3.1 + 1.4.1 所有後端實作，89/89 tests 全部通過，等待 Architect merge。

**下一步優先順序**：
1. Architect merge `feature/1.2.1-backend` → main
2. Backend 補完（me query、updateProfile、typing indicators、markMessagesAsRead）
3. Feature 1.3.1 Frontend（對話列表 + 聊天室）
4. Feature 1.4.2 圖片上傳（等 1.3.1 Frontend 完成後才開始）

---

## Appendix：Feature 狀態圖示說明

- 🔲 **待開始**：未動工，等待上一個 feature 完成或設計確認
- ⏳ **進行中**：已分派任務，agent 正在執行（紅-綠-重構）
- 🟡 **測試中**：實作完成，等待 QA / CI/CD 驗收
- ✅ **完成**：所有層級實作 + 測試 + merge，可進行下一個 feature
- 🔲 **設計中**：Architect 正在設計，未拆解子任務
- ⚠️ **已暫停**：被其他 feature blocker，或需要重新設計
