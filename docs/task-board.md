# Ping 專案 - 開發追蹤板

> **專案進度追蹤**: 使用看板方式管理 MVP 開發

---

## 📊 看板欄位

```
[待規格化] → [待測試] → [開發中] → [審查中] → [已完成]
```

---

## 🔧 技術棧總覽

### Backend
- **Runtime**: Bun 1.3.5+ (NOT Node.js)
- **Framework**: Hono
- **GraphQL**: GraphQL Yoga
- **WebSocket**: Socket.io
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Auth**: Better Auth (OAuth: Google, GitHub, Apple)

### Frontend (Web)
- **Framework**: TanStack Start (with TanStack Router + TanStack Query)
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **State**: TanStack Store
- **GraphQL**: Apollo Client
- **Test**: Vitest

### Frontend (Mobile)
- **Framework**: React Native 0.81 + Expo 54
- **Navigation**: Expo Router
- **Styling**: NativeWind (Tailwind for RN) - **必須使用**
- **State**: TanStack Store (共享)
- **GraphQL**: Apollo Client (共享)

### Shared Code (`/shared/`)
- Types, GraphQL operations, TanStack Store stores, Hooks, Utils
- **策略**: 優先建立共享程式碼，Web 和 Mobile 共用邏輯

---

## 🎯 MVP 功能清單

### 階段 1: 核心基礎設施 (Week 1-2)
**目標**: 建立開發基礎，完成第一個端到端功能（OAuth 登入）

#### 1.1 專案架構與設定
- [x] **專案初始化** ✅
  - Agent: All
  - 任務: 建立 monorepo 結構、設定 TypeScript、Bun、pnpm
  - 狀態: 已完成
  - 優先度: P0 (Critical)

- [x] **Better Auth 整合（Feature 1.0.1 Subtask 3）** ✅
  - Agent: Architect → Backend → Architect (Review)
  - 任務: OAuth 設定 (Google, GitHub, Apple)、Session 管理、Middleware
  - 狀態: ✅ 完成（2026-01-05）
  - 優先度: P0
  - 依賴: 專案初始化 ✅、Prisma Schema ✅、Redis ✅
  - TDD 文件: `/docs/architecture/Feature-1.0.1-Subtask-3-TDD-Tests.md` ✅

- [x] **資料庫 Schema 建立（Feature 1.0.1 Subtask 1）** ✅
  - Agent: Architect (設計) → Backend (實作)
  - 任務: Prisma schema、migrations、seed data
  - 狀態: ✅ 完成（2026-01-05）
  - 優先度: P0
  - 依賴: Better Auth 整合 ✅
  - 包含: User, Session, Account, Verification, Friendship, Conversation, ConversationParticipant, Message, MessageStatus

#### 1.2 GraphQL 基礎
- [x] **GraphQL Server 設定（Feature 1.0.1 Subtask 4）** ✅
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: GraphQL Yoga 設定、Context、Error handling
  - 狀態: ✅ 完成（2026-01-07）
  - 優先度: P0
  - 依賴: Better Auth 整合 ✅
  - 測試案例: 8 個整合測試全部通過 ✅

- [x] **基本 Schema 定義（Feature 1.0.1 Subtask 4）** ✅
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: User type、Query (me)、Mutation、Subscription
  - 狀態: ✅ 完成（2026-01-07）
  - 優先度: P0
  - 依賴: GraphQL Server 設定 ✅

#### 1.3 WebSocket 基礎
- [x] **Socket.io 設定（Feature 1.0.1 Subtask 5）** ✅
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: Socket.io server、認證、事件架構
  - 狀態: ✅ 完成（2026-01-07）
  - 優先度: P0
  - 依賴: Better Auth 整合 ✅
  - 測試案例: 8 個整合測試全部通過 ✅

- [x] **Redis 整合（Feature 1.0.1 Subtask 2）** ✅
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: Redis client、快取策略、Pub/Sub
  - 狀態: ✅ 完成（2026-01-04）
  - 優先度: P0
  - 依賴: Socket.io 設定 ✅
  - Commit: PR #3 已合併

---

### 階段 2: 認證與用戶系統 (Week 2-3)
**注意**: 前端（Web + Mobile）與後端並行開發

#### 2.1 認證流程（已包含在 Feature 1.1.1）
- [x] **OAuth 登入流程（Feature 1.1.1）** ✅
  - Agent: Architect → Backend → Full-Stack Frontend
  - 任務: Google/GitHub/Apple OAuth callback、錯誤處理
  - 狀態: ✅ 完成（2026-02-03）
  - 優先度: P0
  - 依賴: Better Auth 整合 ✅
  - 測試案例: 79/79 測試通過（OAuth Login: 13, Auth Middleware: 16, Better Auth: 5, Web Infrastructure: 46）
  - **包含**: Server-Side Auth Middleware + Web 登入頁面 + 路由保護
  - **PR**: #23 - https://github.com/davelin18yufan/ping/pull/23
  - **Commits**: 8 個（+1728/-619 行）
  - **關鍵實作**:
    - `frontend/src/middleware/auth.middleware.server.ts` - SSR middleware
    - `frontend/src/routes/__root.tsx` - SoundWaveLoader 路由切換動畫
    - `frontend/src/routes/auth/index.tsx` - OAuth 登入頁面
    - `frontend/src/routes/index.tsx` - 首頁（需登入）
    - `frontend/tests/integration/oauth-login.spec.tsx` - OAuth 測試
    - `frontend/tests/integration/auth-middleware-server.spec.ts` - Middleware 測試

- [x] **Session 管理** ✅ 完成（2026-02-24）
  - Agent: Backend Developer
  - 任務: Session 列表查詢、多裝置登出、revokeSession / revokeAllSessions
  - 狀態: ✅ 完成 — 8/8 後端整合測試通過
  - 優先度: P0
  - 依賴: OAuth 登入流程 ✅
  - 實作檔案:
    - `backend/src/graphql/resolvers/sessions.ts`
    - `backend/tests/integration/sessions.spec.ts`（8 tests）
    - `docs/architecture/Feature-1.1.2-TDD-Tests.md`（TDD 規格）
  - 測試案例: 8（TC-B-01 至 TC-B-08）

- [ ] **Magic Link (可選)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: Email 發送、連結驗證、過期處理
  - 狀態: 待規格化
  - 優先度: P2 (Nice to have)
  - 依賴: Better Auth 整合

#### 2.2 用戶資料管理
- [x] **查詢用戶資料 (me query)** ✅
  - Agent: Backend Developer
  - 任務: 取得當前登入用戶完整資料（含 `isOnline`、`statusMessage`、`aestheticMode`）
  - 狀態: ✅ 完成（Feature 1.2.2，2026-02-28）
  - 優先度: P0
  - 依賴: Session 管理 ✅
  - 測試案例: 14（TC-U-01 至 TC-U-14）
  - 實作: `backend/src/graphql/resolvers/user.ts`

- [x] **更新個人資料 (updateProfile)** ✅
  - Agent: Backend Developer
  - 任務: 更新 name（1-50 字）、image URL、statusMessage（0-80 字）、aestheticMode（ornate|minimal）含欄位驗證
  - 狀態: ✅ 完成（Feature 1.2.2，2026-02-28）
  - 優先度: P1
  - 依賴: 查詢用戶資料 ✅
  - 測試案例: 含於 TC-U-01~TC-U-14 整合測試
  - 實作: `backend/src/graphql/resolvers/user.ts`、`AestheticMode` enum migration

- [ ] **上傳頭像 (uploadAvatar)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 圖片上傳、壓縮、儲存
  - 狀態: 待規格化（Feature 1.4.3，往後移）
  - 優先度: P2（依賴圖片上傳基礎設施）
  - 依賴: updateProfile ✅、Feature 1.4.3（圖片上傳）
  - 測試案例: 10

- [x] **搜尋用戶 (searchUsers)** ✅
  - Agent: Backend Developer
  - 任務: 依 displayName/email 搜尋
  - 狀態: ✅ 完成（Feature 1.2.1 Backend，2026-02-24）
  - 優先度: P1
  - 依賴: 查詢用戶資料
  - 測試案例: 7（包含在 Feature 1.2.1 TC-B-01~TC-B-14 中）
  - 實作: `backend/src/graphql/resolvers/friends.ts`（`searchUsers` resolver）

---

### 階段 2.5: UI/UX 設計改版 (Week 3-4)
**注意**: 此階段專注於前端視覺與使用者體驗優化，與後端功能開發並行

#### 2.5 UI/UX 大改版
- [x] **Feature 1.2.0 - UI/UX 大改版 + Session 認證整合** ✅
  - Agent: Architect → Full-Stack Frontend Developer → Architect (Review)
  - 任務: 配色系統改革、字型系統優化、動畫系統升級、雙模式系統、CSS 架構重組、Session 認證整合、AppHeader Capsule Morphing
  - 狀態: ✅ 完成（2026-02-16，5/5 Stage，175/175 tests）
  - 優先度: P0
  - 依賴: Feature 1.0.4（Design System 基礎）✅、Feature 1.1.1（OAuth 登入）✅
  - 測試規格: `/docs/architecture/Feature-1.2.0-TDD-Tests.md`
  - 主分支: `feature/1.2.0-ui-ux-redesign`
  - **階段分解**:
    1. **Stage 1 - Design Tokens + 配色確認**（✅ 完成）
       - ✅ 更新 `/shared/design-tokens/colors.ts`
       - ✅ 新配色系統確認（Dark Mode: Noctis Obscuro、Light Mode: Kyoto Whisper）
    2. **Stage 2 - CSS 架構重組 + Design Tokens CSS 擴展**（✅ 完成 - 2026-02-14）
       - ✅ Branch: `feature/1.2.0-stage-4-css-architecture`
       - ✅ shared/design-tokens CSS 格式：colors.css, animations.css, effects.css, spacing.css
       - ✅ shared/design-tokens TypeScript：animations.ts, borders.ts, effects.ts, z-index.ts
       - ✅ frontend/src/styles/ 重組：themes/, animations/, base/, utilities/, components/
       - ✅ 測試套件：aesthetic-mode-toggle.spec.tsx + aesthetic-mode-context.spec.tsx
       - ✅ pnpm 10.29.3 + frontend 依賴更新
    3. **Stage 3 - 雙模式系統 + 元件升級**（✅ 完成 - 2026-02-14）
       - ✅ 建立華麗模式（Glamorous）與簡潔模式（Minimal）切換系統
       - ✅ 升級 Button, Input, Card, Avatar 元件（新配色與動畫）
       - ✅ 升級 SoundWaveLoader（增強視覺效果，支援雙模式切換）
    4. **Stage 4 - Session 認證整合**（✅ 完成 - 2026-02-16）
       - ✅ 整合 Better Auth session 管理
       - ✅ 實作 session 驗證與更新
       - ✅ 實作登出流程（useNavigate 導航）
    5. **Stage 5 - Capsule Morphing AppHeader**（✅ 完成 - 2026-02-16）
       - ✅ AppHeader 三態實作（minimal / default / expanded）
       - ✅ uiStore（@tanstack/store）：headerExpanded + isViewTransitioning
       - ✅ View Transition 狀態保護（cursorInHeaderRef guard）
       - ✅ app-header.spec.tsx（12 tests）+ uiStore.spec.ts（6 tests）
  - **產出**:
    - ✅ 新配色系統（28+ tokens）
    - ✅ CSS 架構重組（themes/, animations/, base/, utilities/, components/）
    - ✅ Design Tokens CSS 格式擴展（4 CSS + 4 TS）
    - ✅ Feature 1.2.0 測試套件（175 tests 通過）
    - ✅ 動畫系統（View Transition API + Framer Motion）
    - ✅ 雙模式切換系統（Glamorous / Minimal）
    - ✅ SoundWaveLoader 升級版
    - ✅ Session 認證整合（登出、session 更新）
    - ✅ AppHeader Capsule Morphing（三態、uiStore）

---

### 階段 3: 好友系統 (Week 3-4)

#### 3.1 好友邀請
- [ ] **發送好友邀請 (sendFriendRequest)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 建立邀請、驗證、通知
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 用戶資料管理、WebSocket
  - 測試案例: 17
  - 範例: 已有完整範例 (EXAMPLE_WALKTHROUGH.md)

- [ ] **接受好友邀請 (acceptFriendRequest)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 更新狀態、雙向通知
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 發送好友邀請
  - 測試案例: 12

- [ ] **拒絕好友邀請 (rejectFriendRequest)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 更新狀態、通知
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 發送好友邀請
  - 測試案例: 10

#### 3.2 好友管理
- [ ] **查詢好友列表 (friends query)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 取得 ACCEPTED 狀態的好友、在線狀態
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 接受好友邀請
  - 測試案例: 8

- [ ] **查詢待處理邀請 (pendingFriendRequests)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 取得收到的 PENDING 邀請
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 發送好友邀請
  - 測試案例: 6

- [ ] **查詢已發送邀請 (sentFriendRequests)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 取得自己發出的 PENDING 邀請
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: 發送好友邀請
  - 測試案例: 5

- [x] **移除好友 (removeFriend)** ✅
  - Agent: Backend Developer
  - 任務: 刪除 ACCEPTED 好友關係（不建立黑名單），任一方皆可執行
  - 狀態: ✅ 完成（2026-03-01）
  - 優先度: P1
  - 依賴: 查詢好友列表 ✅
  - 測試案例: 4（TC-B-15 至 TC-B-18：success、NOT_FOUND、FORBIDDEN、CONFLICT）
  - 實作: `backend/src/graphql/resolvers/friends.ts`（`removeFriend` resolver）

---

### 階段 4: 一對一聊天 (Week 4-5)

#### 4.1 對話管理
- [ ] **建立或取得對話 (getOrCreateConversation)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 一對一對話建立、去重
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 好友系統
  - 測試案例: 10

- [ ] **查詢對話列表 (conversations)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 取得用戶所有對話、排序、未讀計數
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 建立或取得對話
  - 測試案例: 8

- [ ] **查詢單一對話 (conversation)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 取得對話詳細資料
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 建立或取得對話
  - 測試案例: 5

- [ ] **刪除對話 (deleteConversation)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 軟刪除對話（實際是退出）
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: 查詢對話列表
  - 測試案例: 7

#### 4.2 訊息管理
- [ ] **發送文字訊息 (sendMessage)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 建立訊息、即時推送、狀態更新
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 建立或取得對話、WebSocket
  - 測試案例: 15

- [ ] **發送圖片訊息 (sendImageMessage)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 上傳圖片、建立訊息、推送
  - 狀態: 待規格化（Feature 1.4.3，往後移）
  - 優先度: P2（讓位給即時反應/貼圖/主題）
  - 依賴: 發送文字訊息、Feature 1.4.2（圖片上傳）
  - 測試案例: 12

- [ ] **查詢訊息歷史 (messages)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 游標分頁、時間排序
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 發送文字訊息
  - 測試案例: 10

- [ ] **標記訊息已讀 (markMessagesAsRead)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 批量更新狀態、推送更新
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 發送文字訊息
  - 測試案例: 8

---

### 階段 5: 即時功能 (Week 5-6)

#### 5.1 在線狀態
- [x] **在線狀態追蹤** ✅
  - Agent: Backend Developer
  - 任務: Redis 追蹤、心跳機制、離線偵測
  - 狀態: ✅ 完成（Feature 1.4.1，2026-02-28）
  - 優先度: P0
  - 依賴: Redis 整合、WebSocket
  - 測試案例: 12（TC-9~TC-20，socket.spec.ts 20/20）
  - 實作:
    - `backend/src/socket/handlers/connection.ts`（TTL presence、heartbeat、user:away）
    - `backend/src/graphql/resolvers/user.ts`（`isOnline` field resolver）
    - `backend/src/graphql/schema.ts`（`User.isOnline: Boolean!`）

- [x] **在線狀態廣播 (presence:changed)** ✅
  - Agent: Backend Developer
  - 任務: WebSocket 事件、廣播管理
  - 狀態: ✅ 完成（Feature 1.4.1，2026-02-28）
  - 優先度: P0
  - 依賴: 在線狀態追蹤
  - 測試案例: 包含於 TC-9~TC-20（connect/disconnect/away broadcast、no-duplicate multi-socket）
  - 實作: `broadcastPresence()` helper，向所有共同對話 room 廣播 `presence:changed { userId, isOnline }`

#### 5.2 輸入提示
- [x] **輸入狀態追蹤 (typing:start / typing:stop)** ✅
  - Agent: Backend Developer
  - 任務: Redis TTL 8s per-user key（`typing:{convId}:{userId}`）；`socket.rooms.has()` 授權取代 DB 查詢；連線時推送初始 typing 狀態
  - 狀態: ✅ 完成（Feature 1.2.2，2026-02-28）
  - 優先度: P1
  - 依賴: WebSocket ✅
  - 測試案例: 10（TC-T-01~TC-T-10，包含 TTL idempotency、concurrent typists、sender 不收自身 echo）
  - 實作: `backend/src/socket/handlers/typing.ts`、`backend/src/lib/redis.ts`

- [x] **輸入提示廣播 (typing:update)** ✅
  - Agent: Backend Developer
  - 任務: 向對話 room 廣播 `typing:update { userId, conversationId, isTyping }`；`user:away` 原子清除 typing key + 廣播 isTyping:false；防止虛假廣播（`clearTypingIndicatorIfExists` DEL 回傳值）
  - 狀態: ✅ 完成（Feature 1.2.2，2026-02-28）
  - 優先度: P1
  - 依賴: 輸入狀態追蹤 ✅
  - 測試案例: 包含於 TC-T-01~TC-T-10
  - 實作: `backend/src/socket/handlers/connection.ts`（user:away 清除）、`typing.ts`（start/stop 廣播）

#### 5.3 即時反應、貼圖、聊天室主題（Feature 1.4.2）
- [ ] **即時反應 (addReaction / removeReaction)**
  - Agent: Architect → Backend + Frontend + Mobile
  - 任務: `MessageReaction` model（messageId, userId, emoji）、`addReaction` / `removeReaction` mutation、`reaction:updated` Socket.io 廣播
  - 狀態: 待規格化（等 Feature 1.3.1 Frontend 完成後）
  - 優先度: P1
  - 依賴: 發送文字訊息、WebSocket
  - 測試案例: 待 TDD 設計

- [ ] **貼圖系統 (stickers / sendSticker)** — 仿 Yahoo 即時通嗆聲娃娃
  - Agent: Architect → Backend + Frontend + Mobile
  - 任務: `StickerPack`、`Sticker` models（動態 GIF/APNG）、`stickerPacks` query、`sendSticker` mutation（message type = STICKER）、Sticker Picker UI
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: 即時反應（架構共用）
  - 測試案例: 待 TDD 設計

- [ ] **聊天室主題/背景 (chatTheme)**
  - Agent: Architect → Backend + Frontend + Mobile
  - 任務: per-conversation 或 global 主題偏好（與 aestheticMode 整合）、`updateChatTheme` mutation、主題選擇器 UI（預設主題 + 自訂背景）
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: Feature 1.2.2 updateProfile（aestheticMode 基礎）✅
  - 測試案例: 待 TDD 設計

#### 5.4 對話最愛/書籤（Feature 1.4.3）
- [ ] **對話最愛 (favoriteConversation / unfavoriteConversation)**
  - Agent: Architect → Backend + Frontend + Mobile
  - 任務: `ConversationParticipant` 加入 `isFavorited: Boolean` 欄位（migration）、`favoriteConversation` / `unfavoriteConversation` mutation、對話列表 Filter 星號按鈕 + 最愛 filter chip
  - 狀態: 待規格化（Phase 3+，現有 pinned 暫代最愛功能）
  - 優先度: P2
  - 依賴: Feature 1.3.1（對話管理）✅
  - 備注: 目前 UI 以「釘選 (pinnedAt)」暫時代替最愛概念；本 feature 建立獨立語義（pinned = 置頂，favorited = 書籤）
  - 測試案例: 待 TDD 設計

#### 5.5 訊息狀態同步
- [ ] **訊息狀態更新 (messageStatusUpdated)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: SENT → DELIVERED → READ 同步
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 發送文字訊息、WebSocket
  - 測試案例: 9

---

### 階段 6: 前端開發 (與後端並行，Week 2-8)
**重要**: 前端開發與後端並行，不是等後端完成才開始

#### 6.1 TanStack Start Web 端
- [x] **Web 前端基礎設施（Feature 1.0.2）** ✅
  - Agent: Full-Stack Frontend
  - 任務: Vitest、TanStack Store、Apollo Client、Socket.io client、Better Auth client
  - 狀態: ✅ 完成（2026-01-20）
  - 優先度: P0

- [x] **登入頁面（包含在 Feature 1.1.1）** ✅
  - Agent: Full-Stack Frontend
  - 任務: OAuth 按鈕、Better Auth client 整合、錯誤處理
  - 狀態: ✅ 完成（2026-02-03）
  - 優先度: P0
  - 依賴: 專案架構設定 ✅
  - 檔案: `/frontend/src/routes/auth/index.tsx`（OAuth 登入頁面）
  - 測試: `/frontend/tests/integration/oauth-login.spec.tsx`（13 測試通過）
  - 額外實作: Server-Side Auth Middleware（requireAuthServer, requireGuestServer, optionalAuthServer）
  - PR: #23 - https://github.com/davelin18yufan/ping/pull/23

- [ ] **對話列表頁面**
  - Agent: Architect → Fullstack Frontend Developer → Architect (Review)
  - 任務: 對話列表、未讀徽章、即時更新
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 登入頁面

- [ ] **聊天室頁面**
  - Agent: Architect → Fullstack Frontend Developer → Architect (Review)
  - 任務: 訊息顯示、發送、無限滾動
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 對話列表頁面

- [x] **好友管理頁面 / 搜尋與加好友（Feature 1.2.1 — Frontend Web）** ✅
  - Agent: Full-Stack Frontend Developer
  - 任務: 好友列表、邀請管理、搜尋頁面視覺重設計、接入真實 GraphQL query options
  - 狀態: ✅ 完成（2026-02-23，175/175 tests 通過）
  - 優先度: P0
  - 依賴: Feature 1.2.0 ✅
  - Branch: `feature/1.2.1-friend-search`
  - TDD 文件: `/docs/Feature-1.2.1-TDD-Tests.md`
  - **關鍵實作**:
    - `frontend/src/routes/friends/index.tsx` — 移除 dummy data，接入 TanStack Query options，啟用 `requireAuthServer` + loader，Sonar Ping 動畫
    - `frontend/src/components/friends/UserCard.tsx` — 整合 `useAestheticMode`，`UserStatusAvatar` 取代 avatar letter fallback
    - `frontend/src/components/shared/UserStatusAvatar.tsx` — 新增 `showWaveRings` prop
    - `frontend/src/styles/components/friends.css` — Sonar ring 改為圓形（160px），Light/Dark 雙模式配色
    - `frontend/src/styles/base/overrides.css` — `scrollbar-gutter: stable` + 自訂捲軸
    - `frontend/tests/integration/friends-page.spec.tsx` — 11 tests（per-test query cache seeding）
  - Commits: `d5290e7`, `58e915a`

- [x] **好友系統 GraphQL Resolvers（Feature 1.2.1 — Backend）** ✅
  - Agent: Backend Developer
  - 任務: searchUsers、sendFriendRequest、acceptFriendRequest、rejectFriendRequest、cancelFriendRequest、friends、pendingFriendRequests、sentFriendRequests
  - 狀態: ✅ 完成（2026-02-24，55/55 後端測試通過）
  - 優先度: P0
  - 依賴: Feature 1.2.0 ✅
  - TDD 文件: `/docs/Feature-1.2.1-TDD-Tests.md`
  - **關鍵實作**:
    - `backend/src/graphql/resolvers/friends.ts` — 8 個 Resolvers，DataLoader 模式（N+1 防護）
    - `backend/src/graphql/loaders.ts` — DataLoader per-request 建立，批次 User 查詢
    - `backend/src/graphql/schema.ts` — FriendRequest, Friendship, FriendshipStatus types
    - `backend/tests/integration/friends.spec.ts` — 14 整合測試（TC-B-01 至 TC-B-14）
  - **安全改善**:
    - `@escape.tech/graphql-armor-max-depth` — Query depth 限制（MAX_DEPTH=7）
    - `@graphql-yoga/plugin-disable-introspection` — 生產環境停用 Introspection
  - Branch: `feature/1.2.1-friend-search`

- [ ] **個人資料頁面**
  - Agent: Architect → Fullstack Frontend Developer → Architect (Review)
  - 任務: 資料顯示、編輯、頭像上傳
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: 登入頁面

#### 6.2 React Native Mobile 端
- [x] **專案架構設定 (Expo)** ✅
  - Agent: All
  - 任務: Expo 54、NativeWind、Apollo、Socket、Better Auth
  - 狀態: 已完成
  - 優先度: P0（與 Web 同等重要）
  - 產出: `/mobile/` 基礎結構
  - **注意**: 必須使用 NativeWind，不使用 StyleSheet.create

- [x] **Mobile 基礎設施設定（Feature 1.0.3）** ✅
  - Agent: Full-Stack Frontend
  - 任務: NativeWind、Jest、TanStack Store、Apollo、Socket.io、Better Auth
  - 狀態: ✅ 完成（2026-01-24）
  - 優先度: P0
  - 依賴: 專案架構設定 ✅
  - PR: #14 - https://github.com/davelin18yufan/ping/pull/14 (MERGED)

#### 6.3 Design System 設定（Web + Mobile 共享）
- [x] **Design System 基礎設定（Feature 1.0.4）** ✅
  - Agent: Full-Stack Frontend
  - 任務: Design Tokens、Tailwind 整合、共享 UI 元件庫
  - 狀態: ✅ 完成（2026-01-26）
  - 優先度: P0
  - 依賴: Feature 1.0.2 ✅, Feature 1.0.3 ✅（需要 Tailwind 和 NativeWind 配置完成）
  - 實際完成日期: 2026-01-26
  - Branch: feature/1.0.4-design-system
  - 子任務分解:
    1. ✅ **設計 Token 定義**（2 小時）
       - ✅ 建立 `/shared/design-tokens/` 目錄結構
       - ✅ 定義顏色系統（colors.ts）：28 個 color tokens (OKLCH 色彩空間，Dark/Light mode)
       - ✅ 定義間距系統（spacing.ts）：16 級間距（0-px, 1-0.25rem, ..., 96-24rem）
       - ✅ 定義字型系統（typography.ts）：Font families, sizes, line heights, weights
       - ✅ 定義陰影與圓角（shadows.ts, radius.ts）：8 級陰影，7 級圓角
       - ✅ OKLCH to RGB conversion utility（culori 整合，React Native compatible）
    2. ✅ **Tailwind 配置整合**（1.5 小時）
       - ✅ 更新 `/frontend/tailwind.config.ts`（Web - Tailwind v4 CSS-based）
       - ✅ 更新 `/mobile/tailwind.config.ts`（Mobile - Tailwind v3 with NativeWind v4）
       - ✅ 匯入 design tokens 到 Tailwind theme
       - ✅ 確保 Web 和 Mobile 使用相同的 design tokens
       - ✅ TypeScript path aliases 配置（@shared/design-tokens）
    3. ✅ **共享元件基礎**（2 小時）
       - ✅ 建立 `/shared/components/primitives/`（headless logic）：
         - Button primitive (states, event handling)
         - Input primitive (validation, formatting)
         - Card primitive (hover/press states)
         - Avatar primitive (image loading, fallback, online status)
       - ✅ 建立 `/frontend/src/components/ui/`（Web UI）：
         - button.tsx（CVA variants: primary/secondary/ghost/danger, sizes: sm/md/lg）
         - input.tsx（variants: default/error, error handling, icons support）
         - card.tsx（variants: default/elevated/bordered, sub-components）
         - avatar.tsx（sizes: sm/md/lg/xl, online status badge, AvatarGroup）
       - ✅ 建立 `/mobile/src/components/ui/`（Mobile UI）：
         - button.tsx（NativeWind styles with same API）
         - input.tsx（keyboard handling, returnKeyType）
         - card.tsx（Pressable with touch feedback）
         - avatar.tsx（React Native Image with online status）
    4. ✅ **文件設定**（1.5 小時）
       - ✅ 撰寫 Design System 使用文檔（`/docs/design-system.md`）
       - ✅ 建立設計哲學文檔（`/docs/design-philosophy.md`）：
         - 三大核心原則（儀式優先、輕盈即時、關係空間）
         - Visual language (Modern Dark Elegance)
         - Color system (Dark: #1E1F22, Light: #FAF9F8)
         - Accessibility (WCAG AAA)
       - ✅ 更新 `/CLAUDE.md`（Frontend UI/UX design guidelines）

#### 6.4 功能頁面開發
- [ ] **登入畫面（包含在 Feature 1.1.1）**
  - Agent: Full-Stack Frontend
  - 任務: OAuth 按鈕、Deep linking、Better Auth Expo 整合
  - 狀態: 待規格化（後續階段）
  - 優先度: P1
  - 依賴: Mobile 基礎設施設定 ✅、Web 登入頁面 ✅
  - 檔案: `/mobile/src/screens/auth/LoginScreen.tsx`, `/mobile/app.config.ts`
  - 測試: `/mobile/tests/e2e/oauth-flow.e2e.ts`
  - 備註: Feature 1.1.1 專注於 Web 端實作，Mobile 端將在後續階段開發

- [ ] **對話列表畫面**
  - Agent: Architect → Fullstack Frontend Developer → Architect (Review)
  - 任務: FlatList、下拉刷新
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: 登入畫面

- [ ] **聊天室畫面**
  - Agent: Architect → Fullstack Frontend Developer → Architect (Review)
  - 任務: 反向列表、鍵盤處理
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: 對話列表畫面

- [ ] **好友管理畫面**
  - Agent: Architect → Fullstack Frontend Developer → Architect (Review)
  - 任務: 同 Web 功能
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: 登入畫面

---

## 📈 進度統計

### 整體進度
```
總功能數: 53
已完成: 25 (專案初始化、Web/Mobile 架構、Backend 基礎建設、Better Auth、Prisma Schema、GraphQL Yoga、Socket.io、Redis、Web 前端基礎設施、Mobile 前端基礎設施、Design System、OAuth 登入流程、Session 管理、UI/UX 大改版、好友管理頁面 Frontend Web、好友系統 Backend、對話管理/群組/黑名單 Backend、在線狀態追蹤、在線狀態廣播、查詢用戶資料(me)、更新個人資料(updateProfile)、輸入狀態追蹤、輸入提示廣播、移除好友(removeFriend)、對話列表+聊天室 Frontend Web)
進行中: 0
待開始: 28（新增：即時反應、貼圖/嗆聲娃娃、聊天室主題）
完成率: 47.17%（25/53）

🎉 Phase 1.0 基礎設施初始化完整完成！(4/4 features - 100%)
🎉 Phase 1.1 認證系統（Web + Session 管理）完成！(Feature 1.1.1 + 1.1.2)
🎉 Phase 1.2 UI/UX 改版完成！(Feature 1.2.0 - 5/5 Stage，175/175 tests - 2026-02-16)
🎉 Feature 1.2.1 完成！(Frontend Web + Backend 好友系統 - 69 backend tests - 2026-02-24)
🎉 Feature 1.3.1 Backend 完成！(對話管理、群組聊天室、黑名單 - 22/22 tests - 2026-02-25)
🎉 Feature 1.4.1 Backend 完成！(心跳機制 & 在線狀態 - 20/20 socket tests - 2026-02-28)
🎉 Feature 1.2.2 Backend 完成！(me query + updateProfile + typing indicators + Socket.io 型別化 - 108/108 tests - 2026-02-28)
🎉 removeFriend mutation 補完！(Stage 3 好友系統 8/8 100% - 112/112 tests - 2026-03-01)
🎉 Feature 1.3.1 Frontend Web 完成！(對話列表+聊天室+群組管理+Socket.io real-time - 63 tests, 238/238 - 2026-03-03)
```

### 階段進度
```
🎉 階段 1 (基礎設施): 9/9 (100%) ✅ - Phase 1.0 完整完成！
  ✅ 專案初始化
  ✅ Prisma Schema 設計
  ✅ Redis 配置
  ✅ Backend 基礎建設（Linter/Formatter/CI/CD）
  ✅ Better Auth 整合（11 測試通過，86.20% 覆蓋率）
  ✅ GraphQL Yoga 設定（8 測試通過）
  ✅ Socket.io 設定（8 測試通過）
  ✅ Web 前端基礎設施（Feature 1.0.2 - 100% 完成）
    ✅ Vitest 測試框架（46 測試通過，覆蓋率 >80%）
    ✅ TanStack Store（7 測試通過）
    ✅ Apollo Client（19 測試通過）
    ✅ Socket.io Client（15 測試通過）
    ✅ Better Auth Client（5 測試通過）
  ✅ Mobile 基礎設施（Feature 1.0.3 - 100% 完成）
    ✅ NativeWind 與測試環境（3 測試通過）
    ✅ 程式碼品質工具（ESLint + Prettier + TypeScript strict）
    ✅ TanStack Store（21 測試通過，100% 覆蓋率）
    ✅ Apollo Client 設定（17 測試通過）
    ✅ Socket.io Client 設定（43 測試通過）
    ✅ Better Auth Expo 設定（13 測試通過）
    ✅ 整合測試與驗證（97/97 測試通過，79.81% 核心覆蓋率）
  ✅ Design System 設定（Feature 1.0.4 - 100% 完成）
    ✅ 28 個 Design Tokens（OKLCH 色彩空間，Dark/Light mode）
    ✅ OKLCH to RGB conversion utility（React Native compatible）
    ✅ 4 個 Primitive Components（Button, Input, Card, Avatar）
    ✅ 4 個 Web UI Components（Button, Input, Card, Avatar）
    ✅ 4 個 Mobile UI Components（Button, Input, Card, Avatar）
    ✅ 2 個設計文檔（design-system.md, design-philosophy.md）

Phase 1.0 成就解鎖 🏆:
  ✅ 穩定的 Backend 基礎（Bun + Hono + GraphQL + Socket.io + Better Auth）
  ✅ 完整的 Web 前端（TanStack Start + React 19 + Apollo + Socket.io）
  ✅ 完整的 Mobile 前端（Expo 54 + React Native + NativeWind + Apollo）
  ✅ 統一的 Design System（Web + Mobile 共享 tokens 與元件）
  ✅ 170/170 測試全部通過（Backend: 27, Web: 46, Mobile: 97）
  ✅ TypeScript 0 errors, Linter 0 warnings, Formatter 100% formatted

階段 2 (認證用戶):  5/7   (71.43%) - 🚀 進行中
  ✅ OAuth 登入流程（Feature 1.1.1 - Web - 2026-02-03）
  ✅ Session 管理（Feature 1.1.2 - Backend - 8/8 tests - 2026-02-24）
  🔲 Magic Link (可選)
  ✅ 查詢用戶資料（me query - Feature 1.2.2 - 14/14 tests - 2026-02-28）
  ✅ 更新個人資料（updateProfile - Feature 1.2.2 - 2026-02-28）
  🔲 上傳頭像（Feature 1.4.2）
  ✅ 搜尋用戶（searchUsers - Feature 1.2.1 Backend - 2026-02-24）
階段 2.5 (UI/UX 改版): 1/1   (100%) ✅ - Feature 1.2.0 完整完成（2026-02-16）
  ✅ Feature 1.2.0 - UI/UX 大改版 + Session 認證整合（5/5 Stage，175/175 tests）
階段 3 (好友系統):  8/8   (100%) ✅ - Feature 1.2.1 Backend + removeFriend 全部完成（2026-03-01）
  ✅ 發送好友邀請 (sendFriendRequest)
  ✅ 接受好友邀請 (acceptFriendRequest)
  ✅ 拒絕好友邀請 (rejectFriendRequest)
  ✅ 取消好友邀請 (cancelFriendRequest)
  ✅ 查詢好友列表 (friends)
  ✅ 查詢待處理邀請 (pendingFriendRequests)
  ✅ 查詢已發送邀請 (sentFriendRequests)
  ✅ 移除好友 (removeFriend) - 完成（2026-03-01）
階段 4 (對話/群組/黑名單): 8/8 (100%) ✅ - Feature 1.3.1 Backend 完成（2026-02-25）
  ✅ getOrCreateConversation（好友才能建立 1-on-1）
  ✅ createGroupConversation（creator=OWNER，好友限制）
  ✅ inviteToGroup / removeFromGroup（onlyOwnerCanInvite/Kick 設定）
  ✅ leaveGroup（繼承人選擇 / 最後一人解散）
  ✅ updateGroupSettings（群名 + 權限三開關）
  ✅ pinConversation / unpinConversation
  ✅ sendMessage + markMessagesAsRead（雙向 cursor 分頁）
  ✅ blockUser / unblockUser（黑名單 + 自動解除好友）
階段 5 (即時功能):  6/7   (85.71%) - Feature 1.4.1 + 1.2.2 完成
  ✅ Socket.io conversation room join + message:new broadcast（Feature 1.3.1）
  ✅ sync:required 重連補漏事件（非恢復連線時）
  ✅ 在線狀態追蹤（Redis TTL heartbeat，Feature 1.4.1 - 2026-02-28）
  ✅ 在線狀態廣播（presence:changed，Feature 1.4.1 - 2026-02-28）
  ✅ 輸入狀態追蹤（typing:start/stop + Redis TTL 8s，Feature 1.2.2 - 2026-02-28）
  ✅ 輸入提示廣播（typing:update，Feature 1.2.2 - 2026-02-28）
  🔲 訊息狀態同步 (SENT → DELIVERED → READ)
階段 6 (前端開發):  9/10 (90%) - Web 基礎設施 + Design System + OAuth 登入 + 好友頁面 + 聊天系統完成
  ✅ Web 架構設定
  ✅ Web 前端基礎設施（Feature 1.0.2）
  ✅ Mobile 架構設定
  ✅ Mobile 基礎設施（Feature 1.0.3）
  ✅ Design System 設定（Feature 1.0.4 - 2026-01-26 完成）
  ✅ 登入頁面（Web）（Feature 1.1.1 - 2026-02-03 完成）
  ✅ 好友管理頁面（Web）（Feature 1.2.1 - 2026-02-23 完成）
  ✅ 對話列表頁面（Web）（Feature 1.3.1 Frontend - 2026-03-03 完成）
  ✅ 聊天室頁面（Web）（Feature 1.3.1 Frontend - 2026-03-03 完成）
  🔲 登入畫面（Mobile）（後續階段）
```

### 當前 Sprint 狀態

#### Feature 1.0.1 - Backend 基礎設施 ✅
TDD 階段: ✅ 完成（100%）
- ✅ Subtask 1: Prisma 初始化與 Schema 設計（已完成）
- ✅ Subtask 2: Redis 設定（已完成）
- ✅ Subtask 3: Better Auth 整合（已完成 - 2026-01-05）
  - 測試規格文件已撰寫 ✅
  - Backend 實作完成 ✅
  - 11 個整合測試全部通過 ✅
  - 測試覆蓋率：86.20% 函數 / 90.88% 行 ✅
  - Code Review 完成 ✅
  - Commits: `b8a7eeb` + `eb197e1` ✅
- ✅ Subtask 4: GraphQL Yoga 設定（已完成 - 2026-01-07）
  - 8 個整合測試全部通過 ✅
  - Commit: `13efc71` ✅
- ✅ Subtask 5: Socket.io 設定（已完成 - 2026-01-07）
  - 8 個整合測試全部通過 ✅
  - Commit: `c74b7cd` ✅

實際完成: 2026-01-07

#### Feature 1.0.2 - Web 前端基礎設施 ✅
TDD 階段: ✅ 完成（100%）
- ✅ Subtask 1: Vitest 測試框架配置（已完成 - 2h）
  - vitest.config.ts 配置（coverage thresholds）✅
  - tests/setup.ts 全域測試設定 ✅
  - MSW (Mock Service Worker) 設定 ✅
- ✅ Subtask 2: TanStack Store 設定（已完成 - 1.5h）
  - chatStore.ts（聊天狀態管理）✅
  - socketStore.ts（Socket 連線狀態）✅
  - 7 個測試全部通過 ✅
- ✅ Subtask 3: Apollo Client 設定（已完成 - 2h）
  - apollo.ts（含 errorLink 錯誤處理）✅
  - GraphQL queries（6 個查詢操作）✅
  - 19 個測試全部通過 ✅
- ✅ Subtask 4: Socket.io Client 設定（已完成 - 1h）
  - socket.ts（含自動重連策略）✅
  - 15 個測試全部通過 ✅
- ✅ Subtask 5: Better Auth Client 設定（已完成 - 1h）
  - auth-client.ts（React client）✅
  - auth.ts（Server config）✅
  - middleware/auth.ts（Auth middleware）✅
  - MSW OAuth mocking ✅
  - 5 個測試全部通過 ✅
- ✅ Subtask 6: 整合測試與驗證（已完成 - 1.5h）
  - 46/46 測試全部通過 ✅
  - 測試覆蓋率達標 ✅
  - TypeScript/Lint/Format/Build 全部通過 ✅

實際完成: 2026-01-20

#### Feature 1.0.3 - Mobile 基礎設施 ✅
TDD 階段: ✅ 完成（100% 完成 - 7/7 子任務）
- ✅ Subtask 1: NativeWind 與測試環境設定（已完成 - 1.5h）
  - NativeWind 4.2.1 + Tailwind CSS v3 ✅
  - Jest 30.2.0 + jest-expo 54.0.16 ✅
  - @testing-library/react-native 13.3.3 ✅
  - 3 個 NativeWind 測試通過 ✅
- ✅ Subtask 2: 程式碼品質工具設定（已完成 - 1h）
  - ESLint 9 flat config with expo integration ✅
  - Prettier 3.8.1 with Tailwind CSS plugin ✅
  - TypeScript 5.9 strict mode ✅
  - check script（typecheck + lint + format:check + test）✅
  - Path Aliases 修復 ✅
- ✅ Subtask 3: TanStack Store 設定（已完成 - 1h）
  - chatStore.ts（對話與草稿訊息管理）✅
  - socketStore.ts（Socket 連線狀態管理）✅
  - 21 個測試全部通過（9 chatStore + 8 socketStore + 4 integration）✅
  - 100% store 測試覆蓋率 ✅
  - API 與 Web 前端一致 ✅
- ✅ Subtask 4: Apollo Client 設定（Expo 適配）（已完成 - 1.5h）
  - apollo.ts（Apollo Client with Expo adaptation）✅
  - useApolloClient.ts（React hook）✅
  - 17 個測試全部通過（8 Apollo Client + 9 useApolloClient hook）✅
- ✅ Subtask 5: Socket.io Client 設定（已完成 - 1h）
  - socket.ts（Socket.io Client with auto-reconnect）✅
  - useSocket.ts（useSocket, useConversationSocket, useTypingIndicator hooks）✅
  - 43 個測試全部通過（23 Socket.io Client + 20 useSocket hooks）✅
- ✅ Subtask 6: Better Auth Expo 設定（OAuth + Deep Linking）（已完成 - 1.5h）
  - auth.ts（Better Auth Expo client）✅
  - useAuth.ts（useAuth, useSignIn, useSignOut hooks）✅
  - app/auth/login.tsx（Login screen with OAuth buttons）✅
  - app/auth/callback.tsx（OAuth callback handler）✅
  - app.config.ts（Deep Linking config）✅
  - 13 個測試全部通過（6 Better Auth Client + 7 useAuth hook）✅
- ✅ Subtask 7: 整合測試與驗證（已完成 - 1h）

實際完成: 2026-01-24

#### Feature 1.0.4 - Design System 設定 ✅
TDD 階段: ✅ 完成（100% 完成 - 4/4 子任務）
- ✅ Subtask 1: 設計 Token 定義（已完成 - 2h）
  - `/shared/design-tokens/` 目錄結構建立 ✅
  - colors.ts（28 個 color tokens，OKLCH 色彩空間，Dark/Light mode）✅
  - spacing.ts（16 級間距：0-px, 1-0.25rem, ..., 96-24rem）✅
  - typography.ts（Font families, sizes, line heights, weights）✅
  - shadows.ts（8 級陰影：sm-2xl, inner）✅
  - radius.ts（7 級圓角：none-full）✅
  - OKLCH to RGB conversion utility（culori 整合）✅
- ✅ Subtask 2: Tailwind 配置整合（已完成 - 1.5h）
  - `/frontend/tailwind.config.ts`（Web - Tailwind v4 CSS-based）✅
  - `/mobile/tailwind.config.ts`（Mobile - Tailwind v3 with NativeWind v4）✅
  - 匯入 design tokens 到 Tailwind theme ✅
  - 確保 Web 和 Mobile 使用相同的 design tokens ✅
  - TypeScript path aliases 配置（@shared/design-tokens）✅
  - 自動 OKLCH to RGB conversion for React Native ✅
- ✅ Subtask 3: 共享元件基礎（已完成 - 2h）
  - `/shared/components/primitives/`（headless logic）✅
    - button/（Button primitive with states and event handling）✅
    - input/（Input primitive with validation and formatting）✅
    - card/（Card primitive with hover/press states）✅
    - avatar/（Avatar primitive with image loading, fallback, online status）✅
  - `/frontend/src/components/ui/`（Web UI 實作）✅
    - button.tsx（CVA variants: primary/secondary/ghost/danger, sizes: sm/md/lg）✅
    - input.tsx（variants: default/error, error handling, icons support）✅
    - card.tsx（variants: default/elevated/bordered, sub-components: Header, Title, Description, Content, Footer）✅
    - avatar.tsx（sizes: sm/md/lg/xl, online status badge, AvatarGroup）✅
  - `/mobile/src/components/ui/`（Mobile UI 實作）✅
    - button.tsx（NativeWind styles with same API as Web）✅
    - input.tsx（keyboard handling, returnKeyType）✅
    - card.tsx（Pressable with touch feedback）✅
    - avatar.tsx（React Native Image with online status）✅
- ✅ Subtask 4: 文件設定（已完成 - 1.5h）
  - `/docs/design-system.md`（Design System 使用指南）✅
  - `/docs/design-philosophy.md`（設計哲學與核心原則）✅
    - 三大核心原則（儀式優先、輕盈即時、關係空間）✅
    - Visual language (Modern Dark Elegance) ✅
    - Color system (Dark: #1E1F22, Light: #FAF9F8) ✅
    - Typography, Spacing, Shadows, Animation principles ✅
    - Component priority (Phase 1-3) ✅
    - Accessibility (WCAG AAA) ✅
  - `/CLAUDE.md`（Frontend UI/UX design guidelines）✅

實際完成: 2026-01-26

### 測試覆蓋目標
```
Backend Unit Tests: 目標 >80%
Backend Integration Tests: 目標 100% API endpoints
Frontend Component Tests: 目標 >70%
E2E Tests: 目標涵蓋主要流程
```

---

## 🎯 Phase 1.0 完成總結與下一步

### 🎉 Phase 1.0 - 基礎設施初始化完整完成！

**已完成目標**:
- [x] 完成專案架構設定 ✅
- [x] 完成資料庫 Schema ✅
- [x] 完成 Backend 基礎建設（Linter/Formatter/CI/CD）✅
- [x] 完成 Better Auth 整合 ✅
- [x] 完成 GraphQL Server 基礎 ✅
- [x] 完成 Socket.io Server 基礎 ✅
- [x] 完成 Web 前端基礎設施（TanStack Store + Apollo + Socket.io + Better Auth）✅
- [x] 完成 Mobile 基礎設施（NativeWind + Jest + Apollo + Socket.io + Better Auth）✅
- [x] 完成 Design System 設定（Design Tokens + UI 元件庫 + 設計文檔）✅

**關鍵里程碑達成**:
- ✅ Day 1-2: 專案初始化、Prisma Schema（已完成）
- ✅ Day 3-4: Redis 配置、Backend 基礎建設（已完成）
- ✅ Day 5: Better Auth 整合（已完成 - 11 測試通過，86.20% 覆蓋率）
- ✅ Day 6-7: GraphQL Yoga 設定、Socket.io 設定（已完成 - 27/27 測試通過）
- ✅ Day 8-14: Web 前端基礎設施（已完成 - 46/46 測試通過，覆蓋率 >80%）
- ✅ Day 15-21: Mobile 基礎設施（已完成 - 97/97 測試通過，79.81% 核心覆蓋率）
- ✅ Day 22-26: Design System 設定（已完成 - 28 tokens, 12 components, 2 design docs）

**實際產出**:
- ✅ 穩定的 Backend 基礎（Bun + Hono + GraphQL + Socket.io + Better Auth）
  - 27/27 測試全部通過
  - PostgreSQL + Prisma ORM
  - Redis cache & Pub/Sub
- ✅ 完整的 Web 前端（TanStack Start + React 19）
  - 46/46 測試全部通過
  - Apollo Client + Socket.io Client
  - Better Auth Client + MSW mocking
  - 測試覆蓋率 >80%
- ✅ 完整的 Mobile 前端（Expo 54 + React Native 0.81）
  - 97/97 測試全部通過
  - NativeWind 4.2.1（Tailwind for RN）
  - Apollo Client + Socket.io Client
  - Better Auth Expo + Deep Linking
  - 測試覆蓋率 79.81%
- ✅ 統一的 Design System
  - 28 個 Design Tokens（OKLCH 色彩空間）
  - 4 個 Primitive Components（headless logic）
  - 4 個 Web UI Components + 4 個 Mobile UI Components
  - 2 個設計文檔（design-system.md, design-philosophy.md）
  - CLAUDE.md Frontend UI/UX 設計規範

### 下一步：Phase 1.1 - 認證系統

**下週目標（Week 4-5）**:
- [ ] Feature 1.1.1: OAuth Google 登入（Backend + Web + Mobile）
  - Backend: `authenticateWithGoogle` mutation
  - Web: LoginForm + OAuth 按鈕
  - Mobile: LoginScreen + Deep Linking
  - 預計時間: 2-3 個工作日（約 15 小時）

**準備工作**:
1. ✅ 測試規格已完成（`/docs/architecture/Feature-1.1.1-TDD-Tests.md`）
2. 🔲 建立新 branch：`feature/1.1.1-oauth-google-login`
3. 🔲 Backend Agent 實作 OAuth mutation（5 小時）
4. 🔲 Full-Stack Frontend Agent 實作 Web + Mobile UI（7 小時）
5. 🔲 Refactor & Review（1 小時）

---

## 📋 當前任務分配

### Architect Agent
**當前狀態**: 🎉 Phase 1.0 完整完成！準備 Phase 1.1 規劃
**已完成工作**:
  - ✅ Feature 1.0.1 審查通過（Backend 基礎設施 - 27/27 測試）
  - ✅ Feature 1.0.2 審查通過（Web 前端基礎設施 - 46/46 測試）
  - ✅ Feature 1.0.3 審查通過（Mobile 基礎設施 - 97/97 測試）
  - ✅ Feature 1.0.4 審查通過（Design System - 28 tokens + 12 components）
  - ✅ Phase 1.0 總測試通過：170/170（100%）
  - ✅ 專案文件已更新同步（MULTI_AGENT_PLAN.md, task-board.md）
**下一步任務**:
  - 🔲 建立 Feature 1.1.1 branch（feature/1.1.1-oauth-google-login）
  - 🔲 通知 Backend Agent 與 Full-Stack Frontend Agent 開始 Feature 1.1.1
  - 🔲 Code review Feature 1.1.1 實作
  - 🔲 審查 Feature 1.0.4 Pull Request（準備 merge）

### Backend Developer
**當前狀態**: ✅ Phase 1.0 Backend 基礎設施完成，等待下一階段任務
**已完成工作**:
  - ✅ Feature 1.0.1: Backend 基礎設施（100% 完成）
    - Prisma Schema + migrations
    - Redis 配置
    - Better Auth 整合（11 測試通過，86.20% 覆蓋率）
    - GraphQL Yoga 設定（8 測試通過）
    - Socket.io 設定（8 測試通過）
    - 測試結果：27/27 通過（100%）
    - TypeScript 0 errors, Linter 0 warnings
**完成日期**: 2026-01-07
**下一步任務**:
  - 🔲 Feature 1.1.1: OAuth Google 登入（Backend 部分）
    - 實作 `authenticateWithGoogle` mutation
    - 實作 OAuth 驗證邏輯（Service layer）
    - 整合 Better Auth（已配置）
    - 執行後端測試直到綠燈（7+ 測試）
    - 預計時間：5 小時
**負責範圍**: `/backend/**`

### Fullstack Frontend Developer
**當前狀態**: 🎉 Phase 1.0 Frontend 基礎設施 + Design System 完成！
**已完成工作**:
  - ✅ Feature 1.0.2: Web 前端基礎設施（46 測試通過）
    - Vitest 測試框架配置
    - TanStack Store 設定（chatStore + socketStore）
    - Apollo Client 設定（含 errorLink）
    - Socket.io Client 設定（含自動重連）
    - Better Auth Client 整合（含 MSW mocking）
    - 測試覆蓋率達標（>80% lines, >75% functions）
    - PR #10 已合併
  - ✅ Feature 1.0.3: Mobile 基礎設施（97 測試通過）
    - NativeWind 4.2.1 + Jest 30.2.0
    - 程式碼品質工具（ESLint + Prettier + TypeScript strict）
    - TanStack Store（21 測試，100% 覆蓋率）
    - Apollo Client + Socket.io Client（60 測試）
    - Better Auth Expo + Deep Linking（13 測試）
    - 測試覆蓋率 79.81%
    - PR #14 已合併
  - ✅ Feature 1.0.4: Design System 設定（2026-01-26 完成）
    - 28 個 Design Tokens（OKLCH 色彩空間，Dark/Light mode）
    - OKLCH to RGB conversion utility（React Native compatible）
    - 4 個 Primitive Components（Button, Input, Card, Avatar）
    - 4 個 Web UI Components + 4 個 Mobile UI Components
    - 2 個設計文檔（design-system.md, design-philosophy.md）
    - CLAUDE.md Frontend UI/UX 設計規範更新
    - TypeScript 0 errors, Linter 0 warnings, Formatter 100%
    - Branch: feature/1.0.4-design-system（待 PR）
**完成日期**: 2026-01-26
**下一步任務**:
  - 🔲 提交 Feature 1.0.4 Pull Request（準備 merge）
  - 🔲 Feature 1.1.1: OAuth 登入流程（Web + Mobile）
    - **Web 實作**（3 小時）：
      - LoginForm.tsx（OAuth 按鈕）
      - auth/index.tsx（路由）
      - Better Auth client 整合
    - **Mobile 實作**（3 小時）：
      - LoginScreen.tsx（OAuth 按鈕）
      - Deep link 配置
      - Better Auth Expo 整合
    - **共享程式碼抽取**（1 小時）：
      - 抽取共享 types（auth.ts）
      - 抽取共享 hooks（useOAuth.ts）
    - 預計時間：7 小時
**負責範圍**: `/frontend/**`（Web）、`/mobile/**`（Mobile）、`/shared/**`（共享程式碼）

---

## 🚨 風險與問題

### 當前風險
- [ ] **技術風險**: Better Auth 與 Prisma 整合可能有坑
  - 緩解: 先建立 POC 驗證
- [ ] **時程風險**: 8 週完成 MVP 時程緊湊
  - 緩解: 嚴格遵循 TDD，避免返工

### 已知問題
無

### 需要決策
- [ ] 檔案儲存方案：本地 vs S3 (開發階段)
- [ ] Mobile 推送通知：現在實作 vs 後期加入

---

## 📚 相關文件

- [Agent 協作流程](AGENT_WORKFLOW.md)
- [快速開始指南](QUICK_START.md)
- [完整實作範例](EXAMPLE_WALKTHROUGH.md)
- [後端規格](backend.md)
- [前端規格](frontend.md)
- [Mobile 規格](mobile.md)
- [資料庫規格](database.md)

---

**更新頻率**: 每日更新
**維護者**: All Agents
**最後更新**: 2026-03-01
**最新變更**:
  - ✅ **removeFriend mutation 補完（2026-03-01）— 好友系統 8/8 100%**
    - Branch: `feature/1.2.2-backend`
    - `removeFriend(friendshipId: ID!): Boolean!` mutation 新增至 schema
    - Resolver 實作：身份驗證、ownership 驗證、ACCEPTED 狀態檢查、Friendship 刪除
    - 4 個整合測試（TC-B-15~B-18）：success、NOT_FOUND(404)、FORBIDDEN(403)、CONFLICT(409)
    - 112/112 後端測試全部通過，Linter 0 warnings
    - 設計邊界：removeFriend 不建立黑名單（blockUser 才建立），僅解除 ACCEPTED 關係
  - ✅ **Feature 1.2.2 Backend 完成（2026-02-28）— 後端補完**
    - Branch: `feature/1.2.2-backend` → PR #36
    - `me` query：回傳完整用戶資料（isOnline、statusMessage、aestheticMode），14 tests TC-U-01~U-14
    - `updateProfile` mutation：name/image/statusMessage/aestheticMode 欄位驗證
    - `AestheticMode` Prisma enum + migration（ornate | minimal）
    - typing indicators：`typing:start` / `typing:stop` + Redis TTL 8s，10 tests TC-T-01~T-10
    - Socket.io 型別化：`ClientToServerEvents` / `ServerToClientEvents` interfaces
    - `socket.rooms.has()` 授權：O(1) 取代 DB participant 查詢
    - `clearTypingIndicatorIfExists`：原子性 DEL 避免虛假廣播
    - 連線時推送現有 typing 狀態；`user:away` 清除 typing + 廣播
    - Auth spec 整併：`auth.spec.ts` 12 tests（TC-A-01~A-12）取代兩個舊檔
    - 108/108 tests 全部通過
  - 📊 **進度更新**：
    - 階段 1 (基礎設施)：100% 完成 ✅
    - 階段 2 (認證用戶)：71.43% 完成（5/7 - OAuth + Session + searchUsers + me query + updateProfile）
    - 階段 2.5 (UI/UX 改版)：100% 完成 ✅
    - 階段 3 (好友系統)：87.5% 完成（7/8）
    - 階段 4 (對話/群組/黑名單)：100% 完成 ✅（Backend）
    - 階段 5 (即時功能)：85.71% 完成（6/7）
    - 階段 6 (前端開發)：70% 完成（7/10）
    - 整體完成率：46.00%（23/50 features 完成）
  - 🚀 **下一步**：
    - Architect merge PR #36 `feature/1.2.2-backend` → `main`
    - Feature 1.3.1 Frontend（對話列表 + 聊天室）← 前端主線
