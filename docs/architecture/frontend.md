# 即時通訊應用 MVP 版本 - 前端規格書 (Ping)

## 一、技術棧總覽（前端部分）

**Web**
- TanStack Start (with TanStack Router + TanStack Query)
- 狀態管理: TanStack Store
- GraphQL 客戶端: Apollo Client
- WebSocket: Socket.io-client
- 認證: Better Auth Client
- 測試框架: Vitest
- UI 框架: Tailwind CSS + shadcn/ui

**Mobile**
- React Native 0.8+
- 狀態管理: TanStack Store（與 Web 共享）
- GraphQL 客戶端: Apollo Client
- WebSocket: Socket.io-client
- UI 組件與邏輯盡量與 Web 共享
- 認證: Better Auth Client（React Native 相容）

## 二、Web 端規格 (TanStack Start + PWA)

### 專案結構
- routes/ 下分 auth 與 main 路由（TanStack Router 檔案路由）
- components/ 分類 ui、chat、friends、layout
- lib/ 包含 apollo、socket、utils
- graphql/ 包含 queries、mutations、subscriptions、fragments
- stores/、hooks/、types/ 與 Mobile 共享

### Better Auth Client 配置
- 使用 Better Auth 提供的 React hooks：useSession、useUser、signIn、signOut
- 登入頁面顯示 OAuth 按鈕（Google、GitHub 等）
- 可選顯示 Magic Link 輸入框
- Session 自動同步，無需手動處理 JWT refresh

**實際實作細節（Feature 1.0.2）**：
- 檔案：
  - `/frontend/src/lib/auth-client.ts`（React client）
  - `/frontend/src/lib/auth.ts`（Server config）
  - `/frontend/src/middleware/auth.ts`（Auth middleware）
- Better Auth Client 配置：
  - baseURL: `http://localhost:3000`
  - React hooks 整合（useSession, useUser）
- OAuth Providers 支援：
  - Google OAuth
  - GitHub OAuth
  - Apple OAuth（待實作）
- MSW (Mock Service Worker) 整合：
  - OAuth callback mocking
  - Session validation mocking
  - 支援測試環境 OAuth 流程
- 測試覆蓋：5 個整合測試
  - OAuth 流程測試
  - Session 管理測試
  - Error handling 測試

### Apollo Client 配置需求
- 認證 Header：從 Better Auth session 自動取得 access token（若需要）附加
- Token 過期自動處理由 Better Auth 負責

**實際實作細節（Feature 1.0.2）**：
- 檔案：`/frontend/src/lib/apollo.ts`
- HTTP Link 配置：
  - URI: `http://localhost:3000/graphql`
  - credentials: 'include'（自動帶入 session cookie）
- Error Link：統一錯誤處理機制
  - Network errors: 記錄並顯示通知
  - GraphQL errors: 提取錯誤訊息並處理
- InMemoryCache 配置：
  - 預設 cache policy
  - 支援 type policies（未來擴展）
- 測試覆蓋：19 個整合測試
  - 基本查詢測試
  - 錯誤處理測試（network、GraphQL errors）
  - Cache 行為測試

### Socket.io Client 配置需求
- 手動控制連線、重連策略
- 認證與事件監聽清單
- 連線狀態管理與 UI 指示
- 連線時使用 Better Auth 提供的 session cookie 自動認證

**實際實作細節（Feature 1.0.2）**：
- 檔案：`/frontend/src/lib/socket.ts`
- Socket.io Client 配置：
  - URI: `http://localhost:3000`
  - autoConnect: false（手動控制連線）
  - withCredentials: true（自動帶入 session cookie）
- 自動重連策略：
  - 最大重試次數：5 次
  - 重試間隔：指數退避（exponential backoff）
  - 重連延遲：1000ms, 2000ms, 4000ms, 8000ms, 16000ms
- 連線事件處理：
  - connect: 連線成功記錄
  - disconnect: 斷線記錄與自動重連
  - connect_error: 連線錯誤處理
- 測試覆蓋：15 個整合測試
  - 基本連線/斷線測試
  - 自動重連測試
  - 事件監聽測試
  - 錯誤處理測試

### 頁面路由與認證守衛
- 公開路由：/login
- 受保護路由：/、/conversations/:id、/friends、/friends/requests、/profile
- 自動重導向邏輯

### 主要 UI 組件規格
- Login 頁面：顯示社交登入按鈕 + Magic Link 選項
- ChatList、ChatRoom、MessageItem
- FriendList、FriendRequestList、UserSearch
- ProfileSettings：更新 displayName、avatar
- 各組件功能、資料來源、即時更新機制詳細要求

### 狀態管理 (TanStack Store)
- Auth Store(使用 Better Auth 的 useSession / useUser)
- Chat Store、Socket Store 狀態與動作定義

**實際實作細節（Feature 1.0.2）**：
- 檔案：
  - `/frontend/src/stores/chatStore.ts`（聊天狀態管理）
  - `/frontend/src/stores/socketStore.ts`（Socket 連線狀態）
- Chat Store 狀態：
  - currentConversationId: string | null（當前對話 ID）
  - draftMessages: Map<conversationId, draftMessage>（草稿訊息）
- Chat Store 動作：
  - setCurrentConversation(id)：設定當前對話
  - setDraftMessage(conversationId, message)：儲存草稿
  - clearDraftMessage(conversationId)：清除草稿
- Socket Store 狀態：
  - isConnected: boolean（連線狀態）
  - connectionError: string | null（連線錯誤訊息）
- Socket Store 動作：
  - setConnected(connected)：更新連線狀態
  - setConnectionError(error)：設定連線錯誤
- 測試覆蓋：7 個整合測試
  - Store 建立與初始狀態測試
  - 狀態更新測試
  - 訂閱與通知測試

### 響應式設計與佈局規則
- 斷點定義與 mobile/tablet/desktop 不同佈局

### 測試框架（Feature 1.0.2 實作）
**Vitest 配置**：
- 檔案：`/frontend/vitest.config.ts`
- 測試框架：Vitest + @testing-library/react
- 測試環境：jsdom（模擬瀏覽器環境）
- Coverage 配置：
  - Provider: v8
  - Thresholds:
    - lines: 80%
    - statements: 80%
    - functions: 75%（彈性調整）
    - branches: 50%（彈性調整）
  - Exclude: node_modules, tests, coverage, dist

**MSW (Mock Service Worker) 配置**：
- 檔案：
  - `/frontend/tests/mocks/handlers.ts`（API handlers）
  - `/frontend/tests/mocks/server.ts`（MSW server）
  - `/frontend/tests/setup.ts`（全域測試設定）
- Mock APIs：
  - GraphQL queries/mutations
  - OAuth callback endpoints
  - Session validation endpoints
- 測試覆蓋：46 個整合測試
  - TanStack Store：7 個測試
  - Apollo Client：19 個測試
  - Socket.io Client：15 個測試
  - Better Auth Client：5 個測試

### 效能優化、錯誤處理與通知
- 圖片優化、程式碼分割、快取策略
- 錯誤邊界、Toast 通知、Loading 狀態處理

**實際實作細節（Feature 1.0.2）**：
- Apollo Client errorLink：統一錯誤處理與記錄
- Socket.io 自動重連：指數退避策略（5 attempts）
- 測試覆蓋率保證：>80% lines, >75% functions
- TypeScript strict mode：100% 類型安全

## 三、Mobile 端規格 (React Native)

- 認證方式同 Web，使用 Better Auth React Native 相容 hooks
- LoginScreen：顯示 OAuth 按鈕（使用 WebView 或深層連結）
- Magic Link：輸入 email 後跳轉郵件 App
- 其餘畫面規格不變
- 推送通知、離線支援等需求不變

## 四、共享邏輯規格

### GraphQL Queries、Mutations、Subscriptions 名稱與功能
- 列出所有共享 Query、Mutation、Subscription 名稱與主要回傳欄位

### Custom Hooks
- useAuth(用 Better Auth 提供的 signIn("google") / signIn("github") / signOut() 等)
- useSocket、useMessages、useFriends、useTypingIndicator 功能與回傳值

### 工具函數
- 時間格式化、訊息預覽、表單驗證、圖片壓縮、縮圖生成

## 五、非功能性需求（前端相關）

- 頁面與 App 載入時間
- 相容性瀏覽器與作業系統版本
- 離線支援與自動重連
- 測試需求（組件、整合、E2E）
