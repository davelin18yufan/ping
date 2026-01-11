# MULTI_AGENT_PLAN.md - 多 Agent 協作計畫面板

> 由 `Architect agent` 負責維護
> 這是團隊的「日常進度看板」，每天更新。所有 agent 都應先讀這份文件，了解當前狀態與優先級。

---

## 一、Feature 優先級列表（MVP Phase 1）

### Phase 1.0：基礎設施完整初始化（Week 1）

#### ✅ Feature 1.0.1 - Backend 基礎設施設定

| 欄位 | 內容 |
|------|------|
| **狀態** | ✅ 完成（5/5 子任務完成 - 100%） |
| **優先級** | P0（Critical - 阻止所有功能） |
| **負責** | Architect + Backend |
| **SDD 參考** | backend.md、database.md |
| **實際完成日期** | 2026-01-07 |

**子任務分解**：
1. **Prisma 初始化與 Schema 設計**（Backend）- 2 小時 ✅
   - ✅ 建立 `/backend/prisma/schema.prisma`
   - ✅ 定義 Better Auth 所需 tables（User, Session, Account, Verification）
   - ✅ 定義業務 tables（Friendship, Conversation, ConversationParticipant, Message, MessageStatus）
   - ✅ 執行初始 migration：`bun prisma migrate dev --name init`
   - ✅ 建立 seed data（測試用戶）
   - ✅ **Commit**: `f6f3c62 [chore] improve Prisma scripts and architect agent config`
   - ✅ **PR #1 & #2**: Merged to main

2. **Redis 設定**（Backend）- 1 小時 ✅
   - ✅ 建立 `/backend/src/lib/redis.ts`（193 行，包含完整 helper functions）
   - ✅ 設定 Redis client 連線（retry strategy, event handlers）
   - ✅ 建立測試工具 `/backend/test-redis.ts`（6 個測試案例全部通過）
   - ✅ 文件化使用方式（online status, unread count, socket mapping, typing indicators）
   - ✅ **Commit**: `efb992e [feat] setup Redis client with comprehensive helper functions`
   - ✅ **PR #3**: Merged to main (2025-01-04)

3. **基礎建設及Better Auth 整合**（Backend）- 2 小時 ✅
   - ✅ 測試規格文件已完成：`/docs/architecture/Feature-1.0.1-Subtask-3-TDD-Tests.md`
   - ✅ 建立基礎設定檔 `tsconfig`, `oxlint`, `oxfmt`
     - `.oxlintrc.json` - 嚴謹的 linting 規則（correctness: error, suspicious: warn）
     - `.oxfmtrc.json` - 格式化規則（100 char, 2 space, semicolons）
     - `tsconfig.json` - 完整的 TypeScript 配置（ES2024, strict mode, Bun 專用）
   - ✅ 建立 CI/CD（GitHub Actions workflow）
     - `.github/workflows/backend-ci.yml` - Lint + Format + Type Check jobs
     - `package.json` - 新增 CI scripts（type-check, prisma:generate, prisma:migrate:deploy）
     - `backend/README.md` - 完整的 CI/CD 使用文檔
   - ✅ 建立 `/backend/src/lib/auth.ts`（OAuth providers 配置完成）
   - ✅ 設定 OAuth providers（Google, GitHub, Apple）環境變數範本
   - ✅ 整合 Prisma adapter（已整合並通過測試）
   - ✅ 建立 auth middleware (`/backend/src/middleware.ts`)（session 驗證完成）
   - ✅ 測試 session 驗證流程（11 個測試案例全部通過 ✅）
   - ✅ 測試框架設定（Bun test + fixtures + setup）
   - ✅ 測試覆蓋率：86.20% 函數 / 90.88% 行（超過 80% 目標）
   - **🔔 Commit Checkpoint 1**: `b8a7eeb [refactor] improve Prisma initialization with factory pattern`（已提交）
   - **🔔 Commit Checkpoint 2**: `eb197e1 [feat] integrate Better Auth with OAuth providers and add comprehensive tests`（已提交）
   - **完成時間**: 2026-01-05
   - **狀態**: ✅ 完成（GREEN Phase - 測試全通過，REFACTOR - 程式碼優化完成）

4. **GraphQL Yoga 設定**（Backend）- 1.5 小時 ✅
   - ✅ 建立 `/backend/src/graphql/schema.ts`（完整 GraphQL Schema）
   - ✅ 建立 `/backend/src/graphql/context.ts`（Context builder）
   - ✅ 建立 `/backend/src/graphql/resolvers/user.ts`（`me` Query resolver）
   - ✅ 設定 GraphQL Yoga server（CORS、GraphiQL、session middleware）
   - ✅ 整合 auth middleware（從 cookie 注入 userId）
   - ✅ 建立 8 個整合測試（認證、DB 查詢、錯誤處理、introspection）
   - ✅ **Commit**: `13efc71 [feat] setup GraphQL Yoga with auth middleware`

5. **Socket.io 設定**（Backend）- 1.5 小時 ✅
   - ✅ 建立 `/backend/src/socket/index.ts`（Socket.io server with Bun Engine）
   - ✅ 建立 `/backend/src/socket/middleware.ts`（Socket 認證中間件）
   - ✅ 建立 `/backend/src/socket/handlers/connection.ts`（Connection/Disconnect handlers）
   - ✅ 設定 Socket.io server with auth（handshake 驗證）
   - ✅ 建立基礎 connection/disconnect handlers（Redis 同步、在線狀態管理）
   - ✅ 建立 8 個整合測試（認證、多裝置、Redis cleanup）
   - ✅ **Commit**: `c74b7cd [feat] setup Socket.io server with Bun Engine and authentication`

**當前狀況**：
- ✅ Bun + Hono 基礎 server 已建立
- ✅ Prisma Schema 已完成（PR #1, #2 已合併）
- ✅ Redis 配置已完成（PR #3 已合併）
- ✅ 基礎建設完成 100%（Linter/Formatter/CI/CD 已配置）
- ✅ Better Auth 整合完成（測試規格已完成，實作已通過 11 個測試）
  - Commits: `b8a7eeb` (Prisma 重構) + `eb197e1` (Better Auth 整合)
  - 測試覆蓋率：86.20% 函數 / 90.88% 行
  - OAuth Providers: Google, GitHub, Apple 已配置
  - Session Middleware: 已實作並通過驗證
- ✅ GraphQL Yoga 設定完成（8 個測試全部通過）
- ✅ Socket.io 設定完成（8 個測試全部通過）
- **產出**：完整可運行的 backend 基礎設施（已完成 100%）
- **完成度**: 100% (5/5 subtasks)
- **測試結果**：27/27 測試全部通過 ✅（11 Better Auth + 8 GraphQL + 8 Socket.io）

---

#### 🔲 Feature 1.0.2 - Frontend (Web) 基礎設施設定

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 待開始 |
| **優先級** | P0 |
| **負責** | Full-Stack Frontend |
| **SDD 參考** | frontend.md |
| **依賴** | Feature 1.0.1（需要 GraphQL endpoint） |
| **預期完成日期** | 2025-01-02 |

**子任務分解**：
1. **TanStack Store 設定**（1.5 小時）
   - 安裝 `@tanstack/react-store`
   - 建立 `/frontend/src/stores/authStore.ts`（認證狀態）
   - 建立 `/frontend/src/stores/chatStore.ts`（聊天狀態）
   - 建立 shared stores 在 `/shared/stores/`（Web + Mobile 共享）
   - 設定 TypeScript 類型定義

2. **Apollo Client 設定**（2 小時）
   - 建立 `/frontend/src/lib/apollo.ts`
   - 設定 HTTP link + WebSocket link（for subscriptions）
   - 配置 InMemoryCache
   - 整合 Better Auth session（credentials: 'include'）
   - 建立 Apollo Provider 在 root route (`__root.tsx`)

3. **Socket.io Client 設定**（1 小時）
   - 建立 `/frontend/src/lib/socket.ts`
   - 設定 Socket.io client with auth
   - 建立 useSocket hook

4. **Better Auth Client 設定**（1 小時）
   - 安裝 `@better-auth/react`
   - 建立 Better Auth provider
   - 測試 OAuth 流程（僅前端部分）

**產出**：Web 前端可連接 Backend API + TanStack Store 狀態管理就緒

---

#### 🔲 Feature 1.0.3 - Mobile 基礎設施設定

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 待開始 |
| **優先級** | P0 |
| **負責** | Full-Stack Frontend |
| **SDD 參考** | mobile.md |
| **依賴** | Feature 1.0.1（需要 GraphQL endpoint） |
| **預期完成日期** | 2025-01-03 |

**子任務分解**：
1. **NativeWind 設定**（1 小時）
   - 安裝 `nativewind` 和相關依賴
   - 配置 `tailwind.config.js`
   - 設定 `babel.config.js`
   - 測試 Tailwind classes 運作正常

2. **Apollo Client 設定（Expo 適配）**（1.5 小時）
   - 建立 `/mobile/src/lib/apollo.ts`
   - 設定 HTTP link（Expo 環境）
   - 配置 InMemoryCache
   - 整合 Better Auth session

3. **Socket.io Client 設定**（1 小時）
   - 建立 `/mobile/src/lib/socket.ts`
   - 設定 Socket.io client（Expo 環境）
   - 建立 useSocket hook

4. **Better Auth Expo 設定**（1.5 小時）
   - 安裝 `@better-auth/expo`
   - 配置 Deep Linking (`app.config.ts`)
   - 設定 OAuth redirect URIs
   - 建立 Better Auth provider

**產出**：Mobile 前端可連接 Backend API + NativeWind 正常運作

---

#### 🔲 Feature 1.0.4 - 測試框架設定

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 待開始 |
| **優先級** | P0 |
| **負責** | Architect + Backend + Full-Stack Frontend |
| **預期完成日期** | 2025-01-03 |

**子任務分解**：
1. **Backend 測試框架**（Backend）- 1.5 小時
   - 設定 Bun test（內建測試）
   - 建立測試 helpers (`/backend/tests/setup.ts`)
   - 建立測試 database 配置
   - 範例測試：測試 Prisma 連線

2. **Frontend 測試框架**（Full-Stack Frontend）- 1.5 小時
   - 設定 Vitest + React Testing Library
   - 建立測試 setup
   - 範例測試：測試 Apollo provider

3. **Mobile 測試框架**（Full-Stack Frontend）- 2 小時
   - 設定 Jest + React Native Testing Library
   - 設定 Detox E2E（基礎配置）
   - 範例測試：測試基本渲染

**產出**：所有三個平台測試框架就緒，可開始 TDD

---

### Phase 1.1：認證系統（Week 1-2）

#### 🔴 Feature 1.1.1 - OAuth Google 登入（Backend + Frontend + Mobile）

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 待開始（等待 Phase 1.0 完成） |
| **優先級** | P0（阻止其他功能） |
| **負責** | Architect + Backend + Full-Stack Frontend |
| **SDD 參考** | backend.md §III、frontend.md §II、mobile.md §III |
| **依賴** | Feature 1.0.1, 1.0.2, 1.0.3, 1.0.4 |
| **預期完成日期** | 2025-01-06 |

**子任務分解（3 Agents 配置）：**

1. **Architect Agent：撰寫測試規格 (RED)** - 預計 2 小時
   - 產出：`/docs/architecture/Feature-1.1.1-TDD-Tests.md` ✅ 已完成
   - 內容包括：
     - Backend 測試規格（7+ 測試案例）
       - 檔案位置：`/backend/tests/integration/auth-oauth.spec.ts`
       - 涵蓋：成功驗證、無效 code、重複登入、session 儲存、空 code
     - Frontend (Web) 測試規格（6+ 測試案例）
       - 檔案位置：`/frontend/tests/integration/oauth-flow.spec.tsx`
       - 涵蓋：按鈕點擊、導航、錯誤處理、loading 狀態、多 OAuth provider
     - Frontend (Mobile) E2E 測試規格（6+ 測試案例）
       - 檔案位置：`/mobile/tests/e2e/oauth-flow.e2e.ts`
       - 涵蓋：按鈕顯示、瀏覽器開啟、deep link callback、錯誤處理
   - Fixtures 與 mocks 定義

2. **Backend Agent：實作後端 (GREEN)** - 預計 5 小時
   - Resolver：`/backend/src/graphql/resolvers/auth.ts` - `authenticateWithGoogle` mutation
   - Service：`/backend/src/services/auth.ts` - OAuth 驗證邏輯
   - Middleware：Better Auth 設定在 `/backend/src/middleware.ts`
   - 執行測試直到綠燈

3. **Full-Stack Frontend Agent：實作前端 (GREEN)** - 預計 7 小時
   - **Web 實作**（3 小時）：
     - Component：`/frontend/src/components/auth/LoginForm.tsx`
     - Route：`/frontend/src/routes/auth/index.tsx`
     - Better Auth client 整合
     - 執行 Web 測試直到綠燈
   - **Mobile 實作**（3 小時）：
     - Screen：`/mobile/src/screens/auth/LoginScreen.tsx`
     - Deep link 配置：`/mobile/app.config.ts`
     - Better Auth Expo 整合
     - 執行 Mobile E2E 測試直到綠燈
   - **共享程式碼抽取**（1 小時）：
     - 抽取共享 types：`/shared/types/auth.ts`
     - 抽取共享 hooks（如有）：`/shared/hooks/useOAuth.ts`
     - 確保所有測試仍綠燈

4. **All Agents：Refactor & Review** - 預計 1 小時
   - Architect：Code review 所有 PR
   - Backend + Frontend：Refactor 重複程式碼
   - 確保所有測試綠燈
   - 更新 `MULTI_AGENT_PLAN.md` 狀態為 ✅ Done

**當前狀況（3 Agents 配置）：**
- 設計文件：✅ 完成（overview.md、backend.md、frontend.md、mobile.md 已定義）
- 測試規格：✅ 完成（Feature-1.1.1-TDD-Tests.md 已撰寫）
- Backend 實作：⏳ 待 Backend Agent 開始
- Frontend 實作：⏳ 待 Full-Stack Frontend Agent 開始
- 預期完成：2025-01-05

**Agent 配置說明**：
- **3 Agents 模式**：Architect (兼測試規格設計) + Backend + Full-Stack Frontend
- 優勢：協調成本低、Web/Mobile 共享程式碼更統一、適合 MVP 快速迭代
- Full-Stack Frontend Agent 負責 Web + Mobile 雙平台開發，優先建立共享邏輯

**備註：** 此 feature 是後續所有功能的基礎，務必確保 100% 測試覆蓋。

---

#### 🔲 Feature 1.1.2 - Magic Link 登入（後備方案）

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 設計中 |
| **優先級** | P1（可後延至 Phase 1.2） |
| **負責** | Architect + Backend + QA |
| **SDD 參考** | backend.md §III（Magic Link 部分） |
| **預期完成日期** | 2025-01-10 |

**子任務：** 待 Architect 完成設計，預期包括：
- 發送驗證郵件 mutation
- 郵件點擊驗證邏輯
- Session 自動建立

---

### Phase 1.2：好友系統（Week 2-3）

#### 🔲 Feature 1.2.1 - 搜尋與加好友

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 待開始 |
| **優先級** | P0 |
| **負責** | Backend + Frontend + Mobile + QA |
| **依賴** | Feature 1.1.1（認證） |
| **SDD 參考** | backend.md §IV (searchUsers query)、frontend.md、mobile.md |
| **預期完成日期** | 2025-01-12 |

**待分解子任務...**

---

### Phase 1.3：聊天系統（Week 3-4）

#### 🔲 Feature 1.3.1 - 建立對話並發送訊息

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 待開始 |
| **優先級** | P0 |
| **負責** | Backend + Frontend + Mobile + QA |
| **依賴** | Feature 1.2.1（好友） |
| **SDD 參考** | backend.md §IV、§V、database.md |
| **預期完成日期** | 2025-01-19 |

**待分解子任務...**

---

#### 🔲 Feature 1.3.2 - 即時訊息更新（Socket.io）

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 待開始 |
| **優先級** | P0 |
| **負責** | Backend + QA |
| **依賴** | Feature 1.3.1 |
| **SDD 參考** | backend.md §V、database.md |
| **預期完成日期** | 2025-01-22 |

**待分解子任務...**

---

### Phase 1.4：圖片與文件（Week 4）

#### 🔲 Feature 1.4.1 - 圖片上傳與發送

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔲 待開始 |
| **優先級** | P1 |
| **負責** | Backend + Frontend + Mobile + QA |
| **依賴** | Feature 1.3.1 |
| **SDD 參考** | backend.md §VI、database.md |
| **預期完成日期** | 2025-01-26 |

**待分解子任務...**

---

## 二、當前衝刺（Sprint）

### 衝刺目標
**Week 1 (2025-01-01 ~ 2025-01-03)**: 完成 Phase 1.0 基礎設施完整初始化

### 開發分工（3 Agents 配置）

#### Sprint 1: Phase 1.0 基礎設施初始化

| Agent | 分配任務 | 預計時間 | 狀態 |
|-------|---------|---------|------|
| **Architect** | 1. ✅ 檢視並完善 Prisma schema 設計<br>2. ✅ 審查 Better Auth 整合方案<br>3. ⏳ 準備 GraphQL Yoga 測試規格 | 2 小時 | ⏳ 70% 完成 |
| **Backend** | **Feature 1.0.1**: <br>1. ✅ Prisma schema + migrations<br>2. ✅ Redis 設定<br>3. ✅ Better Auth 整合（11 測試通過）<br>4. ⏳ GraphQL Yoga 設定（下一步）<br>5. ⏳ Socket.io 設定（下一步）<br>**Feature 1.0.4 (Backend)**: ✅ 測試框架已設定 | 9.5 小時 | ⏳ 70% 完成 |
| **Full-Stack Frontend** | **Feature 1.0.2**: Web 基礎設施（Apollo + Socket.io + Better Auth）<br>**Feature 1.0.3**: Mobile 基礎設施（NativeWind + Apollo + Socket.io + Better Auth）<br>**Feature 1.0.4 (Frontend)**: 測試框架 | 11 小時 | 🔴 待開始 |

**總計**：約 22.5 小時（約 3 個工作日）

**完成標準**：
- ✅ Backend 可啟動並連接 PostgreSQL + Redis
- ✅ GraphQL endpoint 可訪問（`http://localhost:3000/graphql`）
- ✅ Socket.io 可連接（`ws://localhost:3000`）
- ✅ Web 可連接 GraphQL 並執行簡單 query
- ✅ Mobile 可連接 GraphQL 並執行簡單 query
- ✅ NativeWind 在 Mobile 正常運作
- ✅ 測試框架在三個平台都可運行

---

#### Sprint 2: Feature 1.1.1 OAuth 登入（計畫於 2025-01-04 開始）

| Agent | 分配任務 | 預計時間 | 狀態 |
|-------|---------|---------|------|
| **Architect** | 1. 檢視測試規格完整性<br>2. 答疑與 code review | 2 小時 | 🔲 |
| **Backend** | 1. 讀取測試規格<br>2. 實作 resolver + service<br>3. 通過所有後端測試 | 5 小時 | 🔲 |
| **Full-Stack Frontend** | 1. 讀取測試規格<br>2. 實作 Web + Mobile OAuth UI<br>3. 抽取共享程式碼<br>4. 通過所有測試 | 7 小時 | 🔲 |
| **All** | Refactor + code review + merge | 1 小時 | 🔲 |

**總計**：約 15 小時（約 2 個工作日）

---

## 三、重要決議與設計細節

### 3.1 認證流程確認
- ✅ OAuth 為主（Google、GitHub、Apple）
- ✅ Magic Link 為備援
- ✅ Better Auth 作為統一認證層
- ✅ Session 儲存在 HTTP-only Secure Cookie
- ✅ GraphQL Middleware 從 cookie 注入 userId 到 context

### 3.2 GraphQL vs Socket.io 劃分
- GraphQL：查詢、修改、初始資料（訊息歷史、好友列表）
- Socket.io：實時推送（新訊息、在線狀態、輸入提示）
- GraphQL Subscription：暫未使用（MVP 由 Socket.io 完全覆蓋）

### 3.3 資料庫層級
- PostgreSQL（生產）+ 本地開發用 SQLite 或小 Postgres 容器
- Prisma 作為唯一 ORM
- Better Auth tables 與業務 tables 共存
- 版本控制：schema.prisma + migrations/

### 3.4 Web vs Mobile 共享策略
- `/shared/graphql/` - GraphQL 查詢定義
- `/shared/hooks/` - useMessages、useFriends 等
- `/shared/types/` - TypeScript 類型
- `/shared/utils/` - 日期、格式化工具
- **不共享**：UI 元件（Web 用 TanStack Start / React，Mobile 用 React Native）

---

## 四、每週檢查清單

### 每日（Daily）
- [ ] Architect 檢視 MULTI_AGENT_PLAN.md，確認優先級
- [ ] 各 agent 讀取計畫，確認自己的任務與依賴
- [ ] 測試執行結果回報在對應 feature 旁
- [ ] 更新 feature 狀態（🔴 待開始 → ⏳ 進行中 → ✅ 完成）
- [ ] **每完成一個子任務，提醒使用者 commit**

### 每週五（Weekly Sync）
- [ ] 審視本週完成情況，更新狀態
- [ ] 檢查是否有 blocker，escalate 給 Architect
- [ ] 計畫下週工作

### 每兩週（Milestone）
- [ ] 執行一次完整 E2E 測試（跨層級）
- [ ] 審視是否需要調整設計或優先級
- [ ] 準備 demo 或 staging 部署

---

## 五、已知風險與 Mitigation

| 風險 | 影響 | Mitigation |
|------|------|-----------|
| **Phase 1.0 基礎設施配置錯誤** | 後續所有功能受阻 | Architect 仔細審查每個設定，建立驗證清單，每個 Feature 完成後測試 |
| **NativeWind 設定問題** | Mobile UI 無法正常顯示 | Feature 1.0.3 優先測試 NativeWind，確保 Tailwind classes 正常運作 |
| **Better Auth + Prisma 整合問題** | 認證層崩潰 | Feature 1.0.1 建立最小化測試，確認 session 正確儲存到 DB |
| Better Auth OAuth 流程複雜性 | 認證層可能遇冷 | 先完成 Feature 1.0.1 確保 Better Auth 基礎正確 |
| Web + Mobile Socket.io 不同步 | 實時通訊不可靠 | Feature 1.0.1 完成後立即測試 Socket.io 連線 |
| PostgreSQL 初期設定錯誤 | 資料一致性 | Architect 預先驗證 schema.prisma，Prisma migration dry-run |
| 圖片壓縮效能 | 行動網路卡頓 | Feature 1.4.1 前進行 PoC 測試 |

---

## 六、溝通管道

- **Architect 答疑**：設計疑問找 Architect
- **測試疑問**：找 QA Agent
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
| Claude Code 工作指南 | `/CLAUDE.md` |
| 本計畫 | `/MULTI_AGENT_PLAN.md` |

---

**最後更新**：2026-01-07 10:00
**下次計畫更新**：2026-01-08 09:00
**當前 Sprint**：Sprint 1 - Phase 1.0 基礎設施初始化（87.5% 完成）
**最新進展**：Feature 1.0.1 (Backend 基礎設施) 完成 ✅
  - Commits: `b8a7eeb` + `eb197e1` + `d4553d3` + `13efc71` + `c74b7cd`
  - 測試結果：27/27 測試全部通過（100%）
    - Better Auth：11/11 ✅
    - GraphQL Yoga：8/8 ✅
    - Socket.io：8/8 ✅
  - TypeScript 編譯：無錯誤 ✅
  - Lint/Format：通過 ✅

---

## Appendix：Feature 狀態圖示說明

- 🔴 **待開始**：未動工，等待上一個 feature 完成或設計確認
- ⏳ **進行中**：已分派任務，agent 正在執行（紅-綠-重構）
- 🟡 **測試中**：實作完成，等待 QA / CI/CD 驗收
- ✅ **完成**：所有層級實作 + 測試 + merge，可進行下一個 feature
- 🔲 **設計中**：Architect 正在設計，未拆解子任務
- ⚠️ **已暫停**：被其他 feature blocker，或需要重新設計
