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
- **Framework**: Next.js 16 App Router
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **State**: Zustand
- **GraphQL**: Apollo Client

### Frontend (Mobile)
- **Framework**: React Native 0.81 + Expo 54
- **Navigation**: Expo Router
- **Styling**: NativeWind (Tailwind for RN) - **必須使用**
- **State**: Zustand (共享)
- **GraphQL**: Apollo Client (共享)

### Shared Code (`/shared/`)
- Types, GraphQL operations, Zustand stores, Hooks, Utils
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
  - 產出: backend/, frontend/, mobile/, shared/ 結構

- [ ] **Better Auth 整合（Feature 1.1.1）**
  - Agent: Architect → Backend → Full-Stack Frontend → Architect (Review)
  - 任務: OAuth 設定 (Google, GitHub, Apple)、Session 管理
  - 狀態: 設計階段 → RED 測試（測試規格已完成）
  - 優先度: P0
  - 依賴: 專案初始化 ✅
  - TDD 文件: `/docs/architecture/Feature-1.1.1-TDD-Tests.md` ✅
  - 測試案例: Backend 7+, Frontend 6+, Mobile 6+

- [ ] **資料庫 Schema 建立**
  - Agent: Architect (設計) → Backend (實作)
  - 任務: Prisma schema、migrations、seed data
  - 狀態: 待開始（與 Feature 1.1.1 並行）
  - 優先度: P0
  - 依賴: Better Auth 整合（Better Auth 會自動建立 User/Session/Account tables）
  - 包含: User, Friendship, Conversation, ConversationParticipant, Message, MessageStatus

#### 1.2 GraphQL 基礎
- [ ] **GraphQL Server 設定**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: GraphQL Yoga 設定、Context、Error handling
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: Better Auth 整合

- [ ] **基本 Schema 定義**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: User、Friendship、Conversation、Message types
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: GraphQL Server 設定

#### 1.3 WebSocket 基礎
- [ ] **Socket.io 設定**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: Socket.io server、認證、事件架構
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: Better Auth 整合

- [ ] **Redis 整合**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: Redis client、快取策略、Pub/Sub
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: Socket.io 設定

---

### 階段 2: 認證與用戶系統 (Week 2-3)
**注意**: 前端（Web + Mobile）與後端並行開發

#### 2.1 認證流程（已包含在 Feature 1.1.1）
- [ ] **OAuth 登入流程（Feature 1.1.1）**
  - Agent: Architect → Backend → Full-Stack Frontend
  - 任務: Google/GitHub/Apple OAuth callback、錯誤處理
  - 狀態: RED 測試（測試規格已完成，待實作）
  - 優先度: P0
  - 依賴: Better Auth 整合
  - 測試案例: Backend 7+, Frontend 6+, Mobile 6+
  - **包含**: Backend GraphQL mutation + Web 登入頁面 + Mobile 登入畫面

- [ ] **Session 管理**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: Session 建立、驗證、登出
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: OAuth 登入流程
  - 測試案例: 10

- [ ] **Magic Link (可選)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: Email 發送、連結驗證、過期處理
  - 狀態: 待規格化
  - 優先度: P2 (Nice to have)
  - 依賴: Better Auth 整合

#### 2.2 用戶資料管理
- [ ] **查詢用戶資料 (me query)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 取得當前用戶資料
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: Session 管理
  - 測試案例: 5

- [ ] **更新個人資料 (updateProfile)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 更新 displayName、驗證
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: 查詢用戶資料
  - 測試案例: 8

- [ ] **上傳頭像 (uploadAvatar)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 圖片上傳、壓縮、儲存
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: 更新個人資料
  - 測試案例: 10

- [ ] **搜尋用戶 (searchUsers)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 依 displayName/email 搜尋
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: 查詢用戶資料
  - 測試案例: 7

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

- [ ] **移除好友 (removeFriend)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 刪除好友關係、通知
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: 查詢好友列表
  - 測試案例: 8

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
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 發送文字訊息、uploadAvatar
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
- [ ] **在線狀態追蹤**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: Redis 追蹤、心跳機制、離線偵測
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: Redis 整合、WebSocket
  - 測試案例: 12

- [ ] **在線狀態廣播 (userOnlineStatusChanged)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: WebSocket 事件、訂閱管理
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 在線狀態追蹤
  - 測試案例: 8

#### 5.2 輸入提示
- [ ] **輸入狀態追蹤 (typing_start/stop)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: Redis TTL、去抖動
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: WebSocket
  - 測試案例: 10

- [ ] **輸入提示廣播 (typingStatusChanged)**
  - Agent: Architect → Backend Developer → Architect (Review)
  - 任務: 對話內廣播、防濫用
  - 狀態: 待規格化
  - 優先度: P1
  - 依賴: 輸入狀態追蹤
  - 測試案例: 7

#### 5.3 訊息狀態同步
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

#### 6.1 Next.js Web 端
- [x] **專案架構設定** ✅
  - Agent: All
  - 任務: Next.js 16、Tailwind CSS 4、Apollo Client、Socket.io client
  - 狀態: 已完成
  - 優先度: P0
  - 產出: `/frontend/` 基礎結構

- [ ] **登入頁面（包含在 Feature 1.1.1）**
  - Agent: Full-Stack Frontend
  - 任務: OAuth 按鈕、Better Auth client 整合、錯誤處理
  - 狀態: RED 測試（測試規格已完成，待實作）
  - 優先度: P0
  - 依賴: 專案架構設定 ✅
  - 檔案: `/frontend/src/app/auth/page.tsx`, `/frontend/src/components/auth/LoginForm.tsx`
  - 測試: `/frontend/tests/integration/oauth-flow.spec.tsx`

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

- [ ] **好友管理頁面**
  - Agent: Architect → Fullstack Frontend Developer → Architect (Review)
  - 任務: 好友列表、邀請管理、搜尋
  - 狀態: 待規格化
  - 優先度: P0
  - 依賴: 登入頁面

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

- [ ] **登入畫面（包含在 Feature 1.1.1）**
  - Agent: Full-Stack Frontend
  - 任務: OAuth 按鈕、Deep linking、Better Auth Expo 整合
  - 狀態: RED 測試（測試規格已完成，待實作）
  - 優先度: P0
  - 依賴: 專案架構設定 ✅
  - 檔案: `/mobile/src/screens/auth/LoginScreen.tsx`, `/mobile/app.config.ts`
  - 測試: `/mobile/tests/e2e/oauth-flow.e2e.ts`

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
總功能數: 48
已完成: 4 (專案初始化、Web 架構、Mobile 架構、Backend 基礎建設)
進行中: 1 (Feature 1.0.1 - Backend 基礎設施，50% 完成)
待開始: 43
完成率: 8.33%
```

### 階段進度
```
階段 1 (基礎設施): 4/8   (50.0%) - 專案架構完成、Backend 基礎建設完成
  ✅ 專案初始化
  ✅ Prisma Schema 設計
  ✅ Redis 配置
  ✅ Backend 基礎建設（Linter/Formatter/CI/CD）
  ⏳ Better Auth 整合（測試規格已完成，待實作）
  🔲 GraphQL Yoga 設定
  🔲 Socket.io 設定
  🔲 測試框架設定
階段 2 (認證用戶):  0/7   (0%)    - 依賴階段 1 完成
階段 3 (好友系統):  0/8   (0%)    - 依賴階段 2 完成
階段 4 (一對一聊天): 0/8   (0%)    - 依賴階段 3 完成
階段 5 (即時功能):  0/7   (0%)    - 依賴階段 4 完成
階段 6 (前端開發):  2/9   (22.2%) - Web 和 Mobile 架構已完成
```

### 當前 Sprint 狀態（Feature 1.1.1）
```
TDD 階段: RED 測試（測試規格已完成）
- ✅ 設計階段: SDD 更新完成
- ✅ RED 測試: 測試規格文件已撰寫
- ⏳ GREEN 實作: Backend Agent 待開始
- ⏳ GREEN 實作: Full-Stack Frontend Agent 待開始
- ⏳ REFACTOR: 待完成
- ⏳ Code Review: 待完成

預計完成: 2025-01-05 (約 2 個工作日，15 小時)
```

### 測試覆蓋目標
```
Backend Unit Tests: 目標 >80%
Backend Integration Tests: 目標 100% API endpoints
Frontend Component Tests: 目標 >70%
E2E Tests: 目標涵蓋主要流程
```

---

## 🎯 本週目標 (Week 1)

### 本週聚焦: 階段 1 - 核心基礎設施

**目標**:
- [x] 完成專案架構設定 ✅
- [x] 完成資料庫 Schema ✅
- [x] 完成 Backend 基礎建設（Linter/Formatter/CI/CD）✅
- [ ] 完成 Better Auth 整合
- [ ] 完成 GraphQL Server 基礎

**關鍵里程碑**:
- ✅ Day 1-2: 專案初始化、Prisma Schema（已完成）
- ✅ Day 3-4: Redis 配置、Backend 基礎建設（已完成）
- ⏳ Day 5: Better Auth 整合、GraphQL Server（進行中）

**預期產出**:
- 可運行的後端伺服器
- 基本的 OAuth 登入流程
- 完整的測試框架與 CI/CD pipeline

---

## 📋 當前任務分配

### Architect Agent
**當前任務**: 完成 Feature 1.1.1 的設計與測試規格（已完成 ✅），準備下一個功能的規格設計
**進度**: Feature 1.1.1 測試規格已完成
**下一步**: 監督 Backend 和 Frontend 實作，準備 Feature 1.2 規格

### Backend Developer
**當前任務**: 完成 Backend 基礎建設（Linter/Formatter/CI/CD），準備 Better Auth 整合
**進度**:
  - ✅ Oxlint 配置完成（嚴謹的 linting 規則）
  - ✅ Oxfmt 配置完成（統一格式化標準）
  - ✅ TypeScript 配置完成（ES2024, strict mode）
  - ✅ GitHub Actions CI/CD 配置完成（Lint + Format + Type Check jobs）
  - ✅ Backend README 完整文檔更新
  - ⏳ 準備 commit CI/CD 配置
  - ⏳ 下一步：Better Auth 整合實作（Feature 1.0.1 子任務 3）
**預計開始**: Better Auth 實作即將開始（測試規格已就緒）
**負責範圍**: `/backend/**`（Prisma schema、GraphQL resolvers、Better Auth 配置、CI/CD）

### Fullstack Frontend Developer
**當前任務**: 等待開始 Feature 1.1.1 實作（GREEN Phase）
**進度**: 待命，測試規格已就緒
**預計開始**: 可與 Backend 並行開始
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

## 📝 每日站會記錄

### 2026-01-05
**參與者**: Architect Agent, Backend Developer
**決議**:
1. 完成 Backend 基礎建設（Linter/Formatter/CI/CD）
2. 統一程式碼品質標準（Oxlint + Oxfmt）
3. 建立完整的 CI/CD pipeline（GitHub Actions）

**產出**:
- `.github/workflows/backend-ci.yml` - CI/CD workflow（Lint + Format + Type Check）
- `backend/.oxlintrc.json` - Linting 規則
- `backend/.oxfmtrc.json` - 格式化規則
- `backend/tsconfig.json` - TypeScript 完整配置
- `backend/README.md` - CI/CD 完整文檔

**行動項目**:
- [x] Backend Developer 完成 Oxlint 配置 ✅
- [x] Backend Developer 完成 Oxfmt 配置 ✅
- [x] Backend Developer 完成 TypeScript 配置 ✅
- [x] Backend Developer 完成 GitHub Actions workflow ✅
- [x] Backend Developer 更新 Backend README ✅
- [ ] Backend Developer commit CI/CD 配置
- [ ] Backend Developer 開始 Better Auth 整合實作

### 2025-12-29
**參與者**: 所有 Agent
**決議**:
1. 確認使用 SDD + TDD 開發方法
2. 建立 Agent 協作流程文件
3. 下週開始階段 1 開發

**行動項目**:
- [x] 所有 Agent 閱讀協作流程文件 ✅
- [x] Architect Agent 完成 Feature 1.1.1 規格設計與測試規格 ✅
- [x] Backend Developer 完成 Prisma Schema ✅
- [x] Backend Developer 完成 Redis 配置 ✅
- [x] Backend Developer 完成 Backend 基礎建設 ✅

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
**最後更新**: 2026-01-05