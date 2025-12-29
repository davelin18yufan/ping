# 即時通訊應用 MVP 版本 - 前端規格書 (Ping)

## 一、技術棧總覽（前端部分）

**Web**
- Next.js 16+ (App Router)
- 狀態管理: Zustand
- GraphQL 客戶端: Apollo Client
- WebSocket: Socket.io-client
- 認證: Better Auth Client
- UI 框架: Tailwind CSS + shadcn/ui

**Mobile**
- React Native 0.8+
- 狀態管理: Zustand（與 Web 共享）
- GraphQL 客戶端: Apollo Client
- WebSocket: Socket.io-client
- UI 組件與邏輯盡量與 Web 共享
- 認證: Better Auth Client（React Native 相容）

## 二、Web 端規格 (Next.js + PWA)

### 專案結構
- app/ 下分 auth 與 main 群組路由
- components/ 分類 ui、chat、friends、layout
- lib/ 包含 apollo、socket、utils
- graphql/ 包含 queries、mutations、subscriptions、fragments
- stores/、hooks/、types/ 與 Mobile 共享

### Better Auth Client 配置
- 使用 Better Auth 提供的 React hooks：useSession、useUser、signIn、signOut
- 登入頁面顯示 OAuth 按鈕（Google、GitHub 等）
- 可選顯示 Magic Link 輸入框
- Session 自動同步，無需手動處理 JWT refresh

### Apollo Client 配置需求
- 認證 Header：從 Better Auth session 自動取得 access token（若需要）附加
- Token 過期自動處理由 Better Auth 負責

### Socket.io Client 配置需求
- 手動控制連線、重連策略
- 認證與事件監聽清單
- 連線狀態管理與 UI 指示
- 連線時使用 Better Auth 提供的 session cookie 自動認證

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

### 狀態管理 (Zustand)
- Auth Store(使用 Better Auth 的 useSession / useUser)
- Chat Store、Socket Store 狀態與動作定義

### 響應式設計與佈局規則
- 斷點定義與 mobile/tablet/desktop 不同佈局

### 效能優化、錯誤處理與通知
- 圖片優化、程式碼分割、快取策略
- 錯誤邊界、Toast 通知、Loading 狀態處理

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