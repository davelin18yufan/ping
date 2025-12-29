# Ping - 即時通訊應用 Claude Code 工作指南

## 一、專案簡介
- **專案名稱**：Ping（Yahoo 即時通訊應用復刻）
- **目標**：現代技術棧、Web + Mobile 雙平台、強調即時性與安全性
- **技術選型**：
  - **Frontend (Web)**：Next.js App Router + TypeScript + Zustand + Apollo Client
  - **Frontend (Mobile)**：React Native 0.8+ (Expo) + Zustand + Apollo Client + @better-auth/expo
  - **Backend**：Node.js 24+ + Hono + GraphQL Yoga + Socket.io + Better Auth
  - **Database**：PostgreSQL + Prisma ORM
  - **Cache**：Redis（在線狀態、未讀計數、Socket 映射）
  - **Authentication**：Better Auth（OAuth 社交登入 + Magic Link 備援）

---

## 二、專案結構與目錄邊界

```
ping/
├── docs/
│   ├── architecture/
│   │   ├── overview.md           # SDD 系統設計總覽
│   │   ├── backend.md            # 後端規格書
│   │   ├── frontend.md           # Web 前端規格書
│   │   ├── mobile.md             # Mobile 前端規格書
│   │   └── database.md           # 資料庫與快取規格書
│   └── MULTI_AGENT_PLAN.md       # 多 Agent 協作計畫面板（每日更新）
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
├── frontend/                     # Frontend Agent 專區
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
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
│   │   ├── stores/               # Zustand stores（與 Mobile 共享）
│   │   ├── types/                # TypeScript 類型（與 Mobile 共享）
│   │   └── styles/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/                       # Mobile Agent 專區
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
│   │   ├── stores/               # Zustand（與 frontend 共享）
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
└── MULTI_AGENT_PLAN.md           # 多 Agent 協作面板
```

---

## 三、Agent 分工與職責

### Architect Agent
- **目標**：維護 SDD、高階設計、定義 API contract / DB schema
- **操作範圍**：
  - `/docs/architecture/**`（只動 SDD 文件，不寫實作）
  - `/MULTI_AGENT_PLAN.md`（定義 feature 和分解 ticket）
- **輸出物**：
  - 新增 / 修改 SDD 文件
  - 更新 `MULTI_AGENT_PLAN.md` 的 feature 狀態
  - 與各子 agent 溝通設計變更

### Backend Agent
- **目標**：後端 API、商業邏輯、資料庫存取、即時通訊
- **操作範圍**：
  - `/backend/**`（除了 tests）
  - `/backend/tests/unit/**` 和 `/backend/tests/integration/**`
  - `/backend/prisma/migrations/**`
- **禁止修改**：其他子系統的程式碼
- **輸出物**：
  - Resolvers、Services、Middleware、Socket handlers
  - 單元 / 整合測試（TDD 驅動）
  - Prisma migrations

### Frontend Agent (Web)
- **目標**：Web UI、路由、狀態、與 Backend API 整合
- **操作範圍**：
  - `/frontend/**`（除了 tests）
  - `/frontend/tests/**`
  - `/shared/**`（與 Mobile 共享部分）
- **禁止修改**：backend、mobile 專有程式碼
- **輸出物**：
  - Next.js 頁面、元件、hooks
  - 單元 / 整合 / E2E 測試

### Mobile Agent
- **目標**：React Native 應用、原生體驗、Expo 整合
- **操作範圍**：
  - `/mobile/**`（除了 tests）
  - `/mobile/tests/**`
  - `/shared/**`（與 Frontend 共享部分）
- **禁止修改**：backend、frontend 專有程式碼
- **輸出物**：
  - Screens、Navigation、原生 UI
  - Jest 單元 / Detox E2E 測試

### QA / Test Agent
- **目標**：測試驅動 TDD、確保品質、整合測試
- **操作範圍**：
  - `/backend/tests/**`、`/frontend/tests/**`、`/mobile/tests/**`
  - 先寫測試，後由相應 agent 實作
  - 監督 CI/CD 結果
- **輸出物**：
  - 單元、整合、E2E 測試檔案（RED phase）
  - Test fixture 與 helper
  - CI/CD 配置

---

## 四、TDD + SDD 工作流程（日常流程）

### 1. Architect 的設計階段
1. 收到新需求 (e.g., "支援 Google OAuth 登入")
2. 在 Architect 的 context 中：
   - 更新 /docs/architecture/backend.md （認證部分）
   - 更新 /docs/architecture/frontend.md (Web UI 部分)
   - 更新 /docs/architecture/mobile.md (Mobile UI 部分)
3. 在 MULTI_AGENT_PLAN.md 中新增 feature：
   - Feature 名稱、狀態（設計中）
   - 涉及子系統（Backend、Frontend、Mobile、DB）
   - 預期 Resolvers / Components / Tables
4. 發送設計文件給各子 agent 開始評估

### 2. QA 的紅燈測試階段（RED）
1. 讀 SDD 與 MULTI_AGENT_PLAN.md
2. 寫測試檔案到對應的 /tests/ 資料夾：
   - /backend/tests/integration/auth.spec.ts
     - 測試 `authenticateWithGoogle` mutation
     - 期望：正確建立 session、寫入 Better Auth tables、回傳 user
   - /frontend/tests/integration/login.spec.tsx
     - 測試 LoginScreen 點擊 Google 按鈕後流程
   - /mobile/tests/integration/login.e2e.ts
     - 測試 OAuth deep link 回應
3. 執行測試 → 確認全部 FAIL ❌
4. 更新 MULTI_AGENT_PLAN.md 狀態為「寫測試中」
5. 通知相應 agent 測試已準備好

### 3. 對應 Agent 的綠燈實作階段（GREEN）
Backend Agent 的視角：
1. 讀 SDD 與測試檔案
2. 實作 resolver / service / middleware：
   - schema.ts：定義 mutation authenticateWithGoogle
   - resolvers/auth.ts：實作 resolver
   - services/auth.ts：內部邏輯（呼叫 Better Auth）
   - middleware.ts：確保 session cookie 驗證
3. 執行 tests → 逐個變綠 ✅
4. 若發現 SDD 不足或有誤，回通知 Architect

Frontend Agent 的視角（類似）：
1. 讀 SDD 與測試
2. 實作 components / pages：
   - components/auth/LoginForm.tsx
   - app/auth/page.tsx
   - lib/auth.ts（調用 Better Auth client）
3. 執行測試 → 綠燈
4. 確保與 GraphQL 的整合正確

Mobile Agent：類似流程，Expo 適配版本

### 4. Refactor 階段（REFACTOR）
所有測試綠燈後：
1. 檢查重複程式碼
2. 改進命名、架構
3. 抽取 shared hooks / types
4. 確保測試仍綠燈
5. 更新 MULTI_AGENT_PLAN.md 狀態為「Done」
6. 合併 branch

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

### commit message
- 以[flag] message 為主體撰寫
- 以英文撰寫，確保精準明確

---

## 六、測試指令

### Backend
```bash
cd backend

# 全部測試
pnpm test

# 單個檔案
pnpm test -- auth.spec.ts

# Watch mode
pnpm test -- --watch
```

### Frontend
```bash
cd frontend

pnpm test

pnpm test -- --watch
```

### Mobile
```bash
cd mobile

pnpm test

# E2E (Detox)
pnpm run test:e2e
```

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

---

## 八、重要檔案與起點

### 立即查看
1. `/docs/architecture/overview.md` - SDD 總覽
2. `/docs/architecture/backend.md` - 後端設計
3. `/MULTI_AGENT_PLAN.md` - 當前任務面板

### 技術文檔
- Hono：https://hono.dev
- GraphQL Yoga：https://the-guild.dev/graphql/yoga-server
- Better Auth：https://better-auth.com
- Socket.io：https://socket.io/docs
- Prisma：https://www.prisma.io/docs
- Apollo Client：https://www.apollographql.com/docs/react

---

## 九、常見 Q&A

**Q：多個 agent 同時工作時如何避免衝突？**
A：靠 `/docs/architecture` 與 `MULTI_AGENT_PLAN.md` 的同步。每個 agent 只在自己的目錄邊界內操作，git branch 按功能分開。

**Q：發現 SDD 設計不合理怎麼辦？**
A：不要自作聰明修改，立即通知 Architect Agent，由 Architect 決定是否改設計。保持同步很重要。

**Q：測試還沒寫就發現需要改 Schema 怎麼辦？**
A：停止實作，回通知 QA Agent 更新測試，再由 Architect 確認 SDD，最後再實作。TDD 的順序很重要。

**Q：怎麼知道目前的進度？**
A：看 `MULTI_AGENT_PLAN.md` 的狀態欄，每天更新。

---

## 十、快速開始指令

```bash
# 全部環境初始化
pnpm install  # 在 backend、frontend、mobile 各執行一次

# 啟動開發伺服器（建議三個 terminal 分開執行）
cd backend && pnpm run dev      # 監聽 http://localhost:3000
cd frontend && pnpm run dev     # 監聽 http://localhost:3001
cd mobile && pnpm start         # Expo Go

# 執行所有測試
cd backend && pnpm test
cd frontend && pnpm test
cd mobile && pnpm test

# 執行特定 feature 的測試
pnpm test -- --testNamePattern="Google OAuth"
```

---

## 語言
- 對話總是用繁體中文回覆、唯有專有技術名詞以英文呈現（例如 P-value）
- 程式碼內容（包括 string）以及註解總是以英文撰寫
- 

**最後提醒**：這份指南是團隊約定，每位 agent 都應遵循。有任何疑問，優先問 Architect，保持設計一致性。祝編碼愉快！ 🚀
