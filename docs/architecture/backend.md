# 即時通訊應用 MVP 版本 - 後端規格書 (Ping)

## 一、技術棧總覽（後端部分）

- Runtime: Node.js 24+
- Web框架: Hono
- GraphQL Server: GraphQL Yoga
- ORM: Prisma
- 即時通訊: Socket.io
- 快取: Redis
- 認證: Better Auth（OAuth 社交登入為主）

## 二、通訊協議（後端相關）

- GraphQL API：端點 `/graphql`，使用 HTTP POST，支援批次查詢
- WebSocket (Socket.io)：端點 `/socket.io`，負責即時訊息、在線狀態、訊息狀態更新
- REST API（輔助）：檔案上傳 `POST /api/upload`、健康檢查 `GET /health`
- Better Auth API：端點 `/api/auth/*`，處理 OAuth 登入、session 管理、callback

## 三、認證與授權規格（Better Auth）

- 主要登入方式：OAuth 社交登入（Google、GitHub 等），用戶以信箱快速註冊/登入
- 可選備援：Magic Link（無密碼郵件驗證連結）
- 完全移除傳統 email/password 註冊與 bcrypt 雜湊
- Session 管理：Better Auth 內建，使用 secure cookie 儲存 session
- Database Adapter：@better-auth/prisma-adapter，直接與既有 Prisma Client 整合
- OAuth Providers：至少支援 Google、GitHub（需申請 client ID/secret）
- Rate limiting 與 CSRF 保護：Better Auth 內建，無需額外實作
- 登出：清除 session cookie
- GraphQL 認證中介層：使用 Better Auth middleware 從 cookie 取得 user，注入 context.userId
- Token 黑名單：無需手動維護，Better Auth 內建安全機制

## 四、GraphQL Schema 定義

### 核心類型
- User、Friendship、Conversation、ConversationParticipant、Message
- 列舉：FriendshipStatus、ConversationType、MessageType、MessageStatusType
- 分頁相關：PageInfo、MessageConnection、MessageEdge
- 自訂 Scalar：DateTime、Upload

### Query
- 認證：me（從 session 取得當前用戶）
- 用戶：searchUsers、user
- 好友：friends、pendingFriendRequests、sentFriendRequests
- 對話：conversations、conversation、messages（支援游標分頁）

### Mutation
- 認證：由 Better Auth 處理
- 用戶：updateProfile、uploadAvatar
- 好友：sendFriendRequest、acceptFriendRequest、rejectFriendRequest、removeFriend
- 對話與訊息：getOrCreateConversation、sendMessage、sendImageMessage、markMessagesAsRead、deleteConversation

### Subscription
- messageReceived
- messageStatusUpdated
- userOnlineStatusChanged
- typingStatusChanged

## 五、Socket.io 事件規格

### 客戶端發送事件
- connection（驗證 session cookie 或傳入 access token）
- disconnect
- join_conversation、leave_conversation
- send_message
- message_delivered、message_read
- typing_start、typing_stop

### 伺服器發送事件
- receive_message
- message_status_updated
- user_online、user_offline
- typing_indicator
- error
- authenticated

## 六、檔案上傳規格

- 端點：POST /api/upload
- 限制：僅允許 jpeg、png、gif、webp，最大 5MB
- 檔名規則：{timestamp}-{uuid}.{extension}
- 圖片處理：壓縮至 85% 品質、最大 1920px、去除 EXIF、生成 200x200 縮圖
- 儲存位置：開發本地，生產 S3 或 Azure Blob

## 七、錯誤處理規格

- 錯誤碼分類：401、403、400、404、409、500
- GraphQL 錯誤格式：包含 extensions.code 與 statusCode

## 八、效能與監控規格

- API 回應時間指標（P50/P95/P99）
- GraphQL 複雜度限制
- 資料庫與 WebSocket 延遲要求
- 監控項目：系統資源、應用指標、資料庫、Redis

## 九、日誌規格

- 等級：ERROR、WARN、INFO、DEBUG
- 必要與可選欄位定義

## 十、非功能性需求（後端相關）

- 效能：回應時間、並發量
- 安全：依賴 Better Auth 的 OAuth 流程與 cookie 防護
- 可用性：正常運行時間、錯誤處理、離線支援、相容性
- 可擴展性：水平擴展、Redis Pub/Sub、資料庫讀寫分離
- 測試：單元、整合、E2E 測試覆蓋率要求