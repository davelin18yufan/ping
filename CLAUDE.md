# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Ping - 即時通訊應用 Claude Code 工作指南

## 一、專案簡介
- **專案名稱**：Ping（Yahoo 即時通訊應用復刻）
- **目標**：現代技術棧、Web + Mobile 雙平台、強調即時性與安全性
- **技術選型**：
  - **Frontend (Web)**：TanStack Start + React 19 + TypeScript + Tailwind CSS 4
  - **Frontend (Mobile)**：React Native 0.81 (Expo 54) + Expo Router + TypeScript + **NativeWind**
  - **Backend**：Bun 1.3.5+ + Hono + GraphQL Yoga + Socket.io + Better Auth
  - **Database**：PostgreSQL + Prisma ORM
  - **Cache**：Redis（在線狀態、未讀計數、Socket 映射）
  - **Authentication**：Better Auth（OAuth 社交登入 + Magic Link 備援）

**重要提醒**：
- Mobile 開發**必須使用 NativeWind**（Tailwind CSS for React Native），不使用 `StyleSheet.create`
- Web 和 Mobile 使用相同的 Tailwind class names，提高程式碼共享度
- 開發要遵循經典的 git flow，不要互相汙染影響

---

## 二、總體工作流程（循環）

**這是 Ping 專案的核心開發循環，所有 agents 必須遵循**：

```
1. Architect 確認需求
   ↓
2. 建立/更新 MULTI_AGENT_PLAN.md
   ↓
3. 撰寫測試規格文件（Feature-X.X.X-TDD-Tests.md）
   ↓
4. 建立功能分支（feature/X.X.X-feature-name）
   ↓
5. 分配給 Backend Developer / Fullstack Frontend Developer 開發
   ↓
6. Developer 在分支上實作並通過測試
   ↓
7. 執行測試檢查（確保全部通過 ✅）
   ↓
8. Developer 提交 Pull Request
   ↓
9. Architect Review PR（檢查規格符合度、測試覆蓋率、程式碼品質）
   ↓
10. Review 通過 → Architect Merge PR
    ↓
11. Architect 更新 task-board.md（標記完成）
    ↓
12. 刪除功能分支
    ↓
13. 回到步驟 1（下一個功能）
```

### 各階段詳細說明

#### 步驟 1：Architect 確認需求
- 閱讀 `/docs/task-board.md` 確認當前優先級
- 理解功能需求與業務邏輯
- 更新 SDD 文件（`/docs/architecture/*.md`）

#### 步驟 2：建立/更新 MULTI_AGENT_PLAN.md
- 定義 Feature 編號（例如：Feature 1.1.1）
- 列出涉及的子系統（Backend、Frontend Web、Mobile、DB）
- 明確預期的 Resolvers / Components / Tables
- 設定優先度與依賴關係

#### 步驟 3：撰寫測試規格文件
- 建立 `Feature-X.X.X-TDD-Tests.md`
- 定義 Backend 測試案例（7+ 個）
- 定義 Frontend (Web) 測試案例（6+ 個）
- 定義 Frontend (Mobile) 測試案例（6+ 個）
- 包含：期望輸入/輸出、錯誤碼、邊界情況

#### 步驟 4：分配給開發者
- Backend Developer：實作 `/backend/**`
- Fullstack Frontend Developer：實作 `/frontend/**`（Web）+ `/mobile/**`（Mobile）
- 開發者遵循 TDD：先跑測試（紅燈）→ 實作（綠燈）→ 重構

#### 步驟 5：執行測試檢查
- Backend：`cd backend && bun test`
- Frontend：`cd frontend && pnpm test`
- Mobile：`cd mobile && pnpm test`
- **必須全部通過 ✅**，否則返回步驟 4

#### 步驟 6：更新 task-board.md
- Architect 確認所有測試通過
- 更新 `/docs/task-board.md` 對應功能狀態為「已完成 ✅」
- 更新進度統計
- 記錄完成時間

#### 步驟 7：循環
- 回到步驟 1，開始下一個功能
- 持續迭代直到 MVP 完成

### 重要原則
- ✅ **所有功能必須有測試規格才能開發**
- ✅ **所有測試必須通過才能標記完成**
- ✅ **task-board.md 是唯一的進度來源**
- ✅ **MULTI_AGENT_PLAN.md 管理當前 sprint 的 features**
- ✅ **每個 feature 完成後立即更新文件**

---

## 三、專案結構與目錄邊界

```
ping/
├── docs/
│   ├── architecture/
│   │   ├── overview.md           # SDD 系統設計總覽
│   │   ├── backend.md            # 後端規格書
│   │   ├── frontend.md           # Web 前端規格書
│   │   ├── mobile.md             # Mobile 前端規格書
│   │   └── database.md           # 資料庫與快取規格書
│   └── task-board.md             # 總進度（每日更新）
│
├── backend/                      # Backend Agent 專區
│   ├── src/
│   │   ├── index.ts              # 應用入口、Hono server 設定
│   │   ├── middleware.ts         # Better Auth middleware、認證、錯誤處理
│   │   ├── graphql/
│   │   │   ├── schema.ts         # GraphQL Schema 定義
│   │   │   └── resolvers/        # Resolvers (users, friends, conversations, messages)
│   │   ├── socket/
│   │   │   ├── index.ts          # Socket.io 初始化
│   │   │   └── handlers/         # 事件處理器
│   │   ├── services/             # 業務邏輯（不含 GraphQL）
│   │   ├── lib/
│   │   │   ├── redis.ts          # Redis 連線與操作
│   │   │   ├── prisma.ts         # Prisma Client 初始化
│   │   │   ├── auth.ts           # Better Auth 設定
│   │   │   └── upload.ts         # 檔案上傳處理
│   │   └── types.ts              # TypeScript 類型定義
│   ├── tests/
│   │   ├── unit/                 # 單元測試
│   │   ├── integration/          # 整合測試
│   │   └── fixtures/             # 測試固件
│   ├── prisma/
│   │   ├── schema.prisma         # Prisma Schema
│   │   └── migrations/           # 資料庫遷移
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                     # Fullstack Frontend Agent 專區（Web）
│   ├── src/
│   │   ├── routes/               # TanStack Start Routes
│   │   │   ├── __root.tsx
│   │   │   ├── index.tsx
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   ├── friends/
│   │   │   └── profile/
│   │   ├── components/           # React 元件（與 Mobile 共享）
│   │   │   ├── chat/
│   │   │   ├── friends/
│   │   │   ├── common/
│   │   │   └── layout/
│   │   ├── hooks/                # Custom hooks（與 Mobile 共享）
│   │   ├── lib/
│   │   │   ├── apollo.ts         # Apollo Client 設定
│   │   │   ├── socket.ts         # Socket.io 設定
│   │   │   └── utils.ts
│   │   ├── graphql/              # GraphQL 查詢/變更/訂閱（與 Mobile 共享）
│   │   ├── stores/               # TanStack Store stores（與 Mobile 共享）
│   │   ├── types/                # TypeScript 類型（與 Mobile 共享）
│   │   └── styles/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/                       # Fullstack Frontend Agent 專區（Mobile）
│   ├── app.json
│   ├── app.config.ts
│   ├── src/
│   │   ├── screens/              # 主要畫面（與 frontend 不共享）
│   │   ├── components/           # React Native 元件（與 frontend 共享邏輯）
│   │   ├── hooks/                # Custom hooks（與 frontend 共享）
│   │   ├── lib/
│   │   │   ├── apollo.ts         # Apollo Client（Expo 適配）
│   │   │   ├── socket.ts         # Socket.io（Expo 適配）
│   │   │   ├── auth.ts           # Better Auth Expo 初始化
│   │   │   └── utils.ts
│   │   ├── navigation/           # Expo Router / React Navigation
│   │   ├── graphql/              # GraphQL（與 frontend 共享）
│   │   ├── stores/               # TanStack Store（與 frontend 共享）
│   │   ├── types/                # TypeScript（與 frontend 共享）
│   │   └── App.tsx
│   ├── tests/
│   │   ├── unit/
│   │   └── e2e/                  # Detox E2E
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                       # 共享程式碼（可選，存放 Web + Mobile 共享部分）
│   ├── types/
│   ├── graphql/
│   ├── hooks/
│   ├── utils/
│   └── package.json
│
├── infra/                        # 基礎設施相關（Docker、部署腳本）
│   ├── Dockerfile.backend
│   ├── docker-compose.yml
│   └── k8s/                      # Kubernetes 配置（未來擴展）
│
└── MULTI_AGENT_PLAN.md           # 多 Agent 協作面板(每日更新)
```

---

## 三、Agent 分工與職責

### Architect Agent
- **目標**：維護 SDD、高階設計、定義 API contract、**測試規格設計（TDD Red Phase）**、多 agent 協調
- **操作範圍**：
  - `/docs/architecture/**`（只動 SDD 文件，不寫實作）
  - `/MULTI_AGENT_PLAN.md`（定義 feature 和分解 ticket）
  - 測試規格文件（如 `Feature-X.X.X-TDD-Tests.md`）
  - 監督 CI/CD 結果
- **輸出物**：
  - 新增 / 修改 SDD 文件
  - 測試規格文件（RED phase）：定義測試案例、期望輸入輸出、錯誤碼、邊界情況
  - 更新 `MULTI_AGENT_PLAN.md` 的 feature 狀態
  - 與各子 agent 溝通設計變更
  - PR 審查與設計符合性檢查
  - CI/CD 配置
  - 完成一個大 feature 更新 `task-board.md` 狀態

### Backend Developer
- **目標**：後端 API、商業邏輯、資料庫存取、即時通訊（**TDD Green Phase 實作**）
- **操作範圍**：
  - `/backend/**`（包括 src、prisma、tests）
  - `/backend/tests/unit/**` 和 `/backend/tests/integration/**`
  - `/backend/prisma/migrations/**`
- **禁止修改**：`/frontend/**`、`/mobile/**`、`/docs/**`（需與其他 agent 協調）
- **輸出物**：
  - Resolvers、Services、Middleware、Socket handlers
  - Prisma schema 與 migrations
  - 單元 / 整合測試實作（讓測試從紅燈變綠燈）
  - Better Auth 配置

### Fullstack Frontend Developer
- **目標**：**Web（TanStack Start）+ Mobile（React Native/Expo）雙平台前端**、共享程式碼抽取（**TDD Green Phase 實作**）
- **操作範圍**：
  - `/frontend/**`（Web 前端，包括 src、tests）
  - `/mobile/**`（Mobile 前端，包括 src、tests）
  - `/shared/**`（Web + Mobile 共享程式碼：types、graphql、stores、hooks、utils）
- **禁止修改**：`/backend/**`、`/docs/**`（需與其他 agent 協調）
- **輸出物**：
  - **Web**：TanStack Start 路由、元件、Apollo Client、Socket.io 整合
  - **Mobile**：React Native 畫面、Expo Router、NativeWind 樣式、深度連結
  - **共享**：TypeScript 類型、GraphQL 操作、TanStack Store stores、自訂 hooks
  - 單元 / 整合 / E2E 測試實作（讓測試從紅燈變綠燈）
  - Better Auth 整合（Web 與 Mobile）

---

## 四、TDD + SDD 工作流程（日常流程）

### 階段 1：設計與測試規格（RED Phase - Architect）
**Architect Agent 負責**：
1. **收到新需求**（例如："支援 Google OAuth 登入"）
2. **設計 SDD**：
   - 更新 `/docs/architecture/backend.md`（認證部分）
   - 更新 `/docs/architecture/frontend.md`（Web UI 部分）
   - 更新 `/docs/architecture/mobile.md`（Mobile UI 部分）
   - 更新 `/docs/architecture/database.md`（資料庫 schema）
3. **撰寫測試規格文件**（例如 `Feature-1.1.1-TDD-Tests.md`）：
   - **Backend 測試案例**：
     - 測試檔案位置：`/backend/tests/integration/auth.spec.ts`
     - 測試案例：`authenticateWithGoogle` mutation
     - 期望結果：正確建立 session、寫入 Better Auth tables、回傳 user
     - 錯誤情況：401, 400, 500 等
   - **Frontend (Web) 測試案例**：
     - 測試檔案位置：`/frontend/tests/integration/login.spec.tsx`
     - 測試案例：LoginForm 點擊 Google 按鈕後流程
     - 期望結果：導向認證頁面、處理 callback、儲存 session
   - **Frontend (Mobile) 測試案例**：
     - 測試檔案位置：`/mobile/tests/e2e/login.e2e.ts`
     - 測試案例：OAuth deep link 回應
     - 期望結果：處理 deep link、驗證 session、導向主畫面
4. **更新 MULTI_AGENT_PLAN.md**：
   - 新增 feature、狀態（設計中）
   - 涉及子系統（Backend、Frontend Web、Mobile、DB）
   - 預期 Resolvers / Components / Tables
5. **通知 Backend 與 Fullstack Frontend Agents**：設計完成，可開始實作

### 階段 2：後端實作（GREEN Phase - Backend Developer）
**Backend Developer 負責**：
1. **讀取設計文件與測試規格**：
   - 閱讀 SDD（`backend.md`、`database.md`）
   - 閱讀測試規格（`Feature-X.X.X-TDD-Tests.md`）
2. **實作後端功能**（TDD 驅動）：
   - 先執行測試 → 確認 FAIL ❌（紅燈）
   - 實作 Prisma schema：`/backend/prisma/schema.prisma`
   - 實作 GraphQL schema：`/backend/src/graphql/schema.ts`
   - 實作 Resolvers：`/backend/src/graphql/resolvers/auth.ts`
   - 實作 Services：`/backend/src/services/authService.ts`
   - 實作 Middleware：`/backend/src/middleware.ts`
   - 實作 Better Auth 配置：`/backend/src/lib/auth.ts`
3. **執行測試 → 逐步變綠 ✅**（綠燈）
4. **若發現設計問題**：通知 Architect Agent 調整 SDD
5. **完成子任務後**：詢問使用者是否 commit

### 階段 3：前端實作（GREEN Phase - Fullstack Frontend Developer）
**Fullstack Frontend Developer 負責**（**Web + Mobile 雙平台**）：
1. **讀取設計文件與測試規格**：
   - 閱讀 SDD（`frontend.md`、`mobile.md`）
   - 閱讀測試規格（`Feature-X.X.X-TDD-Tests.md`）
2. **優先抽取共享程式碼**（Shared-First 策略）：
   - 定義 TypeScript 類型：`/shared/types/`
   - 撰寫 GraphQL 操作：`/shared/graphql/`
   - 建立 TanStack Store stores：`/shared/stores/authStore.ts`
   - 實作自訂 hooks：`/shared/hooks/useOAuth.ts`
3. **實作 Web 前端**（TDD 驅動）：
   - 先執行測試 → 確認 FAIL ❌（紅燈）
   - 實作路由：`/frontend/src/routes/auth/index.tsx`
   - 實作元件：`/frontend/src/components/auth/LoginForm.tsx`
   - 實作 Apollo Client：`/frontend/src/lib/apollo.ts`
   - 實作 Better Auth 整合：`/frontend/src/lib/auth.ts`
   - 執行測試 → 變綠 ✅
4. **實作 Mobile 前端**（TDD 驅動）：
   - 先執行測試 → 確認 FAIL ❌（紅燈）
   - 實作畫面：`/mobile/src/screens/auth/LoginScreen.tsx`
   - 實作 Navigation：`/mobile/src/navigation/`
   - 實作 Deep Link 配置：`/mobile/app.config.ts`
   - 實作 Better Auth Expo：`/mobile/src/lib/auth.ts`
   - 使用 **NativeWind** 樣式（與 Web 一致的 Tailwind class names）
   - 執行測試 → 變綠 ✅
5. **確保 Web + Mobile 共享邏輯**：避免重複程式碼
6. **完成子任務後**：詢問使用者是否 commit

### 階段 4：重構與審查（REFACTOR Phase - All Agents）
**所有測試綠燈後**：
1. **Backend Developer**：
   - 檢查後端重複程式碼
   - 改進命名、架構
   - 優化資料庫查詢
   - 確保測試仍綠燈
2. **Fullstack Frontend Developer**：
   - 檢查 Web + Mobile 是否有更多可共享程式碼
   - 抽取共享 hooks / types / utilities 到 `/shared/`
   - 優化元件效能（React.memo、useMemo）
   - 確保測試仍綠燈
3. **Architect Agent**：
   - PR 審查：檢查設計符合性
   - 檢查目錄邊界是否遵守
   - 檢查測試覆蓋率（>80%）
   - 更新 `MULTI_AGENT_PLAN.md` 狀態為「Done」
   - 更新 `/docs/task-board.md` 對應功能為「已完成 ✅」
4. **合併 branch**：所有 agent 確認無誤後合併

### 協作溝通原則
- **Backend ↔ Fullstack Frontend**：API contract 需一致（GraphQL schema、Socket.io events）
- **Architect ↔ All Agents**：設計變更需通知所有相關 agents
- **Commit 頻率**：每完成子任務後詢問使用者是否 commit（小步提交）

---

## 五、Git 與分支策略

### 分支命名
```
feature/[功能名稱]-[agent]

例如：
- feature/google-oauth-backend
- feature/google-oauth-frontend
- feature/google-oauth-mobile
```

### Merge 前檢查清單
- [ ] 所有相關測試綠燈
- [ ] 沒有 console.log / TODO（完整實作）
- [ ] 程式碼符合目錄邊界
- [ ] 更新 MULTI_AGENT_PLAN.md
- [ ] CI/CD 通過
- [ ] (可選) Architect 檢視過設計變更

### Commit Message 格式
- 以 `[flag] message` 為主體撰寫
- 以英文撰寫，確保精準明確
- Flag 類型：
  - `[feat]` - 新功能
  - `[fix]` - Bug 修復
  - `[test]` - 新增或修改測試
  - `[refactor]` - 重構程式碼（不改變功能）
  - `[style]` - 樣式調整（格式化、CSS、UI）
  - `[docs]` - 文件更新
  - `[chore]` - 建置工具、依賴更新、設定檔
  - `[perf]` - 效能優化
  - `[review]` - Code review 相關

**範例**：
```bash
[feat] implement Google OAuth login mutation
[fix] correct session validation in auth middleware
[test] add integration tests for OAuth flow
[refactor] extract shared auth logic to service layer
[style] setup NativeWind for Mobile styling
[docs] update Feature-1.1.1-TDD-Tests.md with edge cases
[chore] setup Prisma schema and initial migration
```

### Commit 頻率與時機
**重要原則**：小步提交，頻繁 commit

**建議 commit 時機**：
1. ✅ 完成一個子任務後（例如：Prisma schema 設計完成）
2. ✅ 所有測試通過後（GREEN phase）
3. ✅ 重構完成後（REFACTOR phase）
4. ✅ 修復一個 bug 後
5. ✅ 新增一個完整的測試檔案後
6. ✅ 切換到不同功能前
7. ✅ 每日工作結束前

**每次 commit 前檢查**：
- [ ] 程式碼可以正常執行
- [ ] 相關測試通過
- [ ] 沒有 `console.log` 或除錯用程式碼
- [ ] 沒有 TODO/FIXME（或已建立對應 issue）
- [ ] Commit message 清楚描述變更內容

### Agent 提醒機制
**所有 Agent 在完成子任務後都應該**：
1. 總結完成的工作
2. 列出變更的檔案
3. 確認無誤之後跑 `linter` `formatter`才能 commit
3. 建議 commit message
4. **詢問使用者是否要 commit**

**提示範例**：
> "✅ Prisma schema 設計完成。所有 Better Auth 和業務 tables 已定義。
>
> Would you like to commit these changes?
>
> Suggested commit message: `[chore] setup Prisma schema with Better Auth integration`
>
> Files changed:
> - `/backend/prisma/schema.prisma`
> - `/backend/prisma/migrations/20250101000000_init/migration.sql`"

---

## 七、編碼規範與重要約定

### TypeScript + Naming
- 檔名：camelCase (utils.ts、authService.ts)
- 類型名稱：PascalCase (User、AuthResponse)
- 變數：camelCase
- 常數：CONSTANT_CASE

### 結構化錯誤處理
```typescript
// ✅ 好
try {
  const result = await authenticateWithGoogle(code);
  return result;
} catch (error) {
  logger.error('OAuth failed', { code, error });
  throw new AuthError('Invalid OAuth code', 401);
}

// ❌ 不好
try {
  // ...
} catch (e) {
  console.log('error');
  throw e;
}
```

### GraphQL 命名
- Query：單數或複數名詞，例如 `me`、`user`、`users`
- Mutation：動詞 + 名詞，例如 `sendFriendRequest`、`markMessagesAsRead`
- Subscription：過去分詞或 `on*` 前綴，例如 `messageReceived`

### 禁止事項
- ❌ 直接 console.log（使用結構化 logger）
- ❌ 跨目錄邊界修改（Backend Agent 不碰 Frontend 檔案）
- ❌ TODO / FIXME（完整實作後再提交）
- ❌ 未驗證的外部 API 調用
- ❌ 在業務邏輯層面做 UI 邏輯

### Linter & Formatter
- 前後端都使用 `Oxclint`, `Oxfmt` ，並且統一風格,可以細微個別設定
- 全部區塊分開設定以利將來拆分

---

## 七-1、開發環境配置

### Git Bash (MINGW64) 環境注意事項

**問題**：在 Git Bash 中執行 `npm` 或 `pnpm` 命令時，可能會遇到無輸出問題。

**原因**：在 Git Bash (MINGW64) 環境下，npm 和 pnpm 的 shell script 版本在非互動模式下不會輸出到 stdout。

**解決方案**：使用 `cmd.exe //C` 執行命令以獲得正確輸出。

**範例**：
```bash
# ❌ 在 Git Bash 可能無輸出
pnpm install
npm install

# ✅ 正確做法（確保有輸出）
cmd.exe //C "pnpm install"
cmd.exe //C "npm install"
cmd.exe //C "pnpm add package-name"
cmd.exe //C "npm run build"
```

**適用範圍**：
- 所有 `npm` 命令
- 所有 `pnpm` 命令
- 需要查看輸出的場景（安裝、建置、測試等）

**注意**：
- 此問題僅影響 Git Bash 環境
- 在 Windows CMD、PowerShell 或 Linux/macOS 終端機中可直接使用 `npm`/`pnpm`
- Claude Code 在 Git Bash 環境下執行 Bash 工具時應使用此方式

---

## 八、重要檔案與起點

### 立即查看
1. `/docs/architecture/overview.md` - SDD 總覽
2. `/docs/task-board` - 總計畫板
3. `/MULTI_AGENT_PLAN.md` - 當前任務面板

### 技術文檔
- Bun：https://bun.sh/docs
- Hono：https://hono.dev/docs/
- GraphQL Yoga：https://the-guild.dev/graphql/yoga-server
- Better Auth：https://better-auth.com
- Socket.io：https://socket.io/docs
- Prisma：https://www.prisma.io/docs
- TanStack Start：https://tanstack.com/start/latest
- TanStack Router: https://tanstack.com/router/latest
- Tanstack Query: https://tanstack.com/query/latest
- Expo：https://docs.expo.dev
- React Native：https://reactnative.dev/docs
- Nativewind: https://www.nativewind.dev/docs
- Tailwind: https://tailwindcss.com/docs/installation
- Oxlint: https://oxc.rs/docs/guide/usage/linter.html
- Oxfmt: https://oxc.rs/docs/guide/usage/formatter.html
- apollo: https://www.apollographql.com/docs/react/get-started

---

## 九、常見 Q&A

**Q：多個 agent 同時工作時如何避免衝突？**
A：靠 `/docs/architecture` 與 `MULTI_AGENT_PLAN.md` 的同步。每個 agent 只在自己的目錄邊界內操作，git branch 按功能分開。

**Q：發現 SDD 設計不合理怎麼辦？**
A：不要自作聰明修改，立即通知 Architect Agent，由 Architect 決定是否改設計。保持同步很重要。

**Q：測試規格還沒寫就發現需要改 Schema 怎麼辦？**
A：停止實作，立即通知 Architect Agent 更新測試規格與 SDD。TDD 的順序很重要：先設計 → 寫測試規格 → 實作。

**Q：怎麼知道目前的進度？**
A：看 `MULTI_AGENT_PLAN.md` 的狀態欄，每天更新。

---

## 十一、關鍵架構決策

### Runtime 選擇
- **Backend 使用 Bun**：比 Node.js 更快的啟動與執行速度，內建 TypeScript 支援，無需額外編譯
- **前端使用 pnpm**：節省磁碟空間，更快的安裝速度，嚴格的依賴管理

### 認證策略
- **完全採用 Better Auth + OAuth**：不使用傳統 email/password，簡化安全性管理
- 支援 Google、GitHub、Apple OAuth，備援使用 Magic Link
- Session 管理基於 secure cookie，避免 JWT 的複雜性

### 即時通訊架構
- **GraphQL + Socket.io 混合模式**：
  - GraphQL：處理查詢與變更（CRUD 操作）
  - Socket.io：處理即時事件（訊息、在線狀態、打字指示器）
- Redis 用於在線狀態快取與 Socket.io 的 Pub/Sub

### 共享程式碼策略
- Web 與 Mobile 可共享：`types/`、`graphql/`、`stores/`、`hooks/`
- 不可共享：UI 元件（Web 用 React DOM，Mobile 用 React Native）
- 使用 `/shared/` 目錄（可選）或直接在各子專案內管理

---

## 語言與溝通規範
- 對話總是用繁體中文回覆、唯有專有技術名詞以英文呈現（例如 GraphQL、Socket.io）
- 程式碼內容（包括 string）以及註解總是以英文撰寫

---

**最後提醒**：這份指南是團隊約定，每位 agent 都應遵循。有任何疑問，優先問 Architect，保持設計一致性。祝編碼愉快！ 🚀
