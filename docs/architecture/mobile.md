# 即時通訊應用 MVP 版本 - React Native Mobile App 規格書 (Ping)

## 一、技術棧總覽（Mobile App）

- Framework: React Native 0.8+（建議使用 Expo managed workflow，便於快速開發與部署）
- 狀態管理: TanStack Store（全局狀態，如聊天未讀、輸入狀態）
- GraphQL 客戶端: Apollo Client
- WebSocket: Socket.io-client
- 認證: Better Auth Client（使用 @better-auth/react + @better-auth/expo 插件）
- 安全儲存: expo-secure-store（儲存 session / token）
- 推送通知: Firebase Cloud Messaging (FCM) 整合 Expo Notifications
- UI 組件: React Native 原生組件 + Tailwind-rn 或 NativeWind（與 Web 風格統一）
- 圖片處理: expo-image-picker、expo-image-manipulator
- 深層連結: Expo Linking（處理 OAuth callback）

## 二、專案結構

```
src/
├── screens/              # 主要畫面
│   ├── auth/
│   │   ├── LoginScreen.tsx          # OAuth 登入主畫面
│   │   └── MagicLinkScreen.tsx      # 可選 Magic Link 備援
│   ├── chat/
│   │   ├── ConversationListScreen.tsx
│   │   └── ChatRoomScreen.tsx
│   ├── friends/
│   │   ├── FriendListScreen.tsx
│   │   ├── FriendRequestScreen.tsx
│   │   └── UserSearchScreen.tsx
│   └── profile/
│       └── ProfileScreen.tsx
├── components/           # 共用組件
│   ├── chat/             # MessageItem、TypingIndicator 等
│   ├── friends/          # FriendItem、RequestItem 等
│   ├── common/           # LoadingSpinner、Toast、Avatar 等
│   └── layout/           # Header、BottomTab 等
├── navigation/           # Expo Router 或 React Navigation 設定
│   ├── AppNavigator.tsx
│   ├── AuthNavigator.tsx
│   └── MainNavigator.tsx
├── lib/                  # 工具庫
│   ├── apollo/           # Apollo Client 設定（包含 Better Auth token 自動注入）
│   ├── socket/           # Socket.io 設定與連線管理
│   ├── auth/             # Better Auth client 初始化
│   └── utils/            # 時間格式化、圖片壓縮等
├── graphql/              # GraphQL queries/mutations/subscriptions（與 Web 共享）
├── stores/               # TanStack Store stores（auth 可簡化為 Better Auth hooks）
├── hooks/                # Custom hooks（與 Web 共享，如 useMessages、useFriends）
└── types/                # TypeScript 類型（與 Web 共享）
```

## 三、認證規格（Better Auth + Expo）

- 使用 Better Auth client 搭配 @better-auth/expo 插件
- 初始化方式：
  - 使用 expo-secure-store 安全儲存 session / cookie
  - 配置 deep link scheme（app.json 中定義）
  - OAuth 流程：點擊按鈕 → 開啟系統瀏覽器 → 完成登入 → deep link 回 App → 自動建立 session
- 支援 Providers：Google、GitHub、Apple（iOS 必備）、Facebook 等
- 可選 Magic Link：輸入 email → 發送驗證連結 → 點擊連結回 App 登入
- Hooks 使用：
  - useSession / useUser：取得當前用戶與登入狀態
  - signIn.social({ provider: "google" })：觸發 OAuth
  - signOut()：登出並清除 session
- 首次登入自動註冊（OAuth 提供 email / name / avatar）

## 四、Apollo Client 配置

- 端點同後端 GraphQL
- 認證：從 Better Auth session 自動取得 token 注入 Authorization Header
- 離線支援：啟用 Apollo Cache + 離線佇列
- 網路狀態偵測：使用 @react-native-community/netinfo

## 五、Socket.io Client 配置

- 連線時使用 Better Auth session cookie 自動認證
- App 背景/前景切換：背景時斷線，前景時自動重連
- 網路切換時重連機制

## 六、導航結構（建議使用 Expo Router 或 React Navigation Tab）

- Root：Stack Navigator
  - Auth Stack：LoginScreen（OAuth 按鈕）
  - Main Tab Navigator：
    - Conversations Tab（ConversationList → ChatRoom）
    - Friends Tab（FriendList → FriendRequest / UserSearch）
    - Profile Tab（ProfileScreen）

## 七、推送通知規格（Expo Notifications + FCM）

- 首次啟動請求通知權限
- 取得 device token 上傳至後端（可擴展存到 User 模型）
- 通知類型：新訊息、好友邀請
- 前景：應用內 Toast
- 背景/關閉：系統通知，點擊導航到對應對話

## 八、主要畫面規格

**LoginScreen**
- 顯示 App Logo
- 多個 OAuth 按鈕（Google、GitHub、Apple 等）
- 可選 Magic Link 輸入框
- 載入狀態與錯誤提示

**ConversationListScreen**
- FlatList 顯示對話列表
- 項目：頭像、名稱、最後訊息預覽、時間、未讀徽章、在線狀態
- 下拉刷新 + 即時更新（Subscription）
- 空狀態提示

**ChatRoomScreen**
- 反向 FlatList 顯示訊息
- 無限向上滾動載入歷史
- 訊息泡泡（左右對齊、狀態圖示）
- 輸入框 + 發送按鈕 + 圖片上傳按鈕
- 顯示對方輸入中提示
- 自動滾動到底部 + 鍵盤避讓

**FriendListScreen / FriendRequestScreen / UserSearchScreen**
- FlatList 顯示列表
- 支援搜尋、接受/拒絕/刪除操作
- 即時在線狀態更新

**ProfileScreen**
- 顯示頭像、名稱、email
- 編輯名稱、上傳頭像
- 登出按鈕

## 九、圖片處理與顯示

- 上傳：expo-image-picker 選擇 + expo-image-manipulator 壓縮後上傳
- 顯示：expo-image（支援快取、佔位、漸進載入）
- 限制同後端：5MB、自動壓縮

## 十、平台特定需求

**iOS（最低 iOS 13）**
- Info.plist 配置相機、相簿、通知權限
- Apple Sign In 必備（App Store 審核要求）

**Android（最低 API 26）**
- AndroidManifest 配置權限
- FCM google-services.json

## 十一、效能與離線支援

- FlatList 優化：getItemLayout、windowSize、keyExtractor
- 離線快取：最近對話與訊息（Apollo Cache）
- 離線時顯示狀態，網路恢復自動同步

## 十二、非功能性需求

- App 啟動時間 < 3s
- 離線操作佇列與自動重連
- Bundle 大小目標 < 30MB（使用 Hermes 引擎）
- 測試：Jest + Detox E2E

## 十三、部署與開發建議

- 使用 Expo EAS Build 進行 iOS/Android 建置
- 開發時 Expo Go 快速預覽
- 深層連結測試：expo-dev-client 自訂建置
