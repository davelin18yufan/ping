# MULTI_AGENT_PLAN.md - 多 Agent 協作計畫面板

> 這是團隊的「日常進度看板」，每天更新。所有 agent 都應先讀這份文件，了解當前狀態與優先級。

---

## 一、Feature 優先級列表（MVP Phase 1）

### Phase 1.1：認證系統（Week 1-2）

#### ✅ Feature 1.1.1 - OAuth Google 登入（Backend + Frontend + Mobile）

| 欄位 | 內容 |
|------|------|
| **狀態** | 🔴 待開始 |
| **優先級** | P0（阻止其他功能） |
| **負責** | Backend + Frontend + Mobile + QA |
| **SDD 參考** | backend.md §III、frontend.md §II、mobile.md §III |
| **預期完成日期** | 2025-01-05 |

**子任務分解：**

1. **QA Agent：寫測試 (RED)** - 預計 2 小時
   - 檔案：`/backend/tests/integration/auth-oauth.spec.ts`
   - 測試：
     ```typescript
     describe('Google OAuth Authentication', () => {
       it('should exchange Google auth code for session', async () => {
         // POST /graphql
         // mutation { authenticateWithGoogle(code: "google_code_123") { user { id, email } } }
         // 期望：201, user 物件帶 email
       });

       it('should return 401 for invalid code', async () => {
         // 期望：401 InvalidOAuthCode
       });
     });
     ```
   - 檔案：`/frontend/tests/integration/oauth-flow.spec.tsx`
   - 測試：
     ```typescript
     it('should call signIn.social when Google button clicked', async () => {
       // render LoginScreen
       // fireEvent.press(googleButton)
       // expect(mockAuthClient.signIn.social).toHaveBeenCalledWith({ provider: 'google' })
     });
     ```
   - 檔案：`/mobile/tests/e2e/oauth-flow.e2e.ts`
   - 測試：Detox deep link handling

2. **Backend Agent：實作 (GREEN)** - 預計 4 小時
   - Resolver：`/backend/src/graphql/resolvers/auth.ts` - `authenticateWithGoogle` mutation
   - Service：`/backend/src/services/auth.ts` - OAuth 驗證邏輯
   - Middleware：Better Auth 設定在 `/backend/src/middleware.ts`
   - 執行測試直到綠燈

3. **Frontend Agent：實作 (GREEN)** - 預計 3 小時
   - Component：`/frontend/src/components/auth/LoginForm.tsx`
   - Page：`/frontend/src/app/auth/page.tsx`
   - 調用 Better Auth client
   - 執行測試直到綠燈

4. **Mobile Agent：實作 (GREEN)** - 預計 3 小時
   - Screen：`/mobile/src/screens/auth/LoginScreen.tsx`
   - Deep link 配置：`/mobile/app.config.ts`
   - 執行測試直到綠燈

5. **Refactor** - 預計 1 小時
   - 抽取共享 hooks（如 `useOAuthLogin`）到 `/shared/hooks/`
   - 確保測試仍綠燈
   - 更新狀態為 ✅ Done

**當前狀況：**
- 設計文件：✅ 完成（overview.md、backend.md 已定義）
- 測試文件：⏳ 待 QA Agent 撰寫
- 實作：⏳ 等待測試完成
- 預期完成：2025-01-05

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
完成 Feature 1.1.1（Google OAuth 登入）的所有層級實作。

### 開發分工

| Agent | 分配任務 | 預計時間 | 狀態 |
|-------|---------|---------|------|
| **Architect** | 檢視 SDD 完整性，準備答疑 | 0.5 小時 | ✅ |
| **QA** | 撰寫 auth-oauth.spec.ts 與 oauth-flow.spec.tsx | 2 小時 | ⏳ |
| **Backend** | 實作 resolver + service | 4 小時 | ⏳ |
| **Frontend** | 實作 LoginForm + page | 3 小時 | ⏳ |
| **Mobile** | 實作 LoginScreen + deep link | 3 小時 | ⏳ |
| **All** | Refactor + merge | 1 小時 | ⏳ |

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
- **不共享**：UI 元件（Web 用 Next.js，Mobile 用 React Native）

---

## 四、每週檢查清單

### 每日（Daily）
- [ ] Architect 檢視 MULTI_AGENT_PLAN.md，確認優先級
- [ ] 各 agent 讀取計畫，確認自己的任務與依賴
- [ ] 測試執行結果回報在對應 feature 旁

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
| Better Auth OAuth 流程複雜性 | 認證層可能遇冷 | QA 提早寫測試，確保邊界條件 |
| Web + Mobile Socket.io 不同步 | 實時通訊不可靠 | 優先完成 Feature 1.3.2，充分測試 |
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

**最後更新**：2025-12-29  
**下次計畫更新**：2025-12-30 09:00

---

## Appendix：Feature 狀態圖示說明

- 🔴 **待開始**：未動工，等待上一個 feature 完成或設計確認
- ⏳ **進行中**：已分派任務，agent 正在執行（紅-綠-重構）
- 🟡 **測試中**：實作完成，等待 QA / CI/CD 驗收
- ✅ **完成**：所有層級實作 + 測試 + merge，可進行下一個 feature
- 🔲 **設計中**：Architect 正在設計，未拆解子任務
- ⚠️ **已暫停**：被其他 feature blocker，或需要重新設計
