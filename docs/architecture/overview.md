# 即時通訊應用 MVP 版本 - 系統設計總覽 (SDD Overview)

## 一、專案簡介與目標

**專案名稱**：Ping（Yahoo即時通訊應用復刻）

**目標**：
- 使用現代技術棧（2025 年最新生態）復刻經典即時通功能
- 支援 Web 與 Mobile 雙平台，共享最多邏輯
- 強調即時性、安全性、易擴展性與開發體驗
- MVP 階段聚焦：OAuth 社交登入、一對一聊天、好友系統、圖片訊息、在線狀態、輸入提示

**核心原則**：
- 前後端分離，但共享 TypeScript 類型與 GraphQL Schema
- 認證統一使用 Better Auth（OAuth 為主，Magic Link 備援）
- 即時通訊以 Socket.io 為主，輔以 Redis Pub/Sub 支援未來水平擴展
- 資料持久化使用 Prisma + PostgreSQL

## 二、高階系統架構（文字描述）

```
[Web Client (Next.js)]     \
                            >-- HTTPS / WSS --> [Load Balancer (optional)]
[Mobile Client (React Native)] /

                              |
                              v

                          [Backend Server (Hono + Bun 1.3.5)]
                          - Better Auth Handler (/api/auth/*)
                          - GraphQL Yoga (/graphql)
                          - Socket.io (/socket.io)
                          - File Upload REST (/api/upload)

                              |
                              | (Prisma ORM)
                              v

                        [Database (PostgreSQL)]
                        - Better Auth Tables (User, Session, Account 等)
                        - Business Tables (Friendship, Conversation, Message 等)

                              |
                              | (Pub/Sub + Cache)
                              v

                            [Redis]
                            - 在線狀態、未讀計數、Socket 映射、輸入狀態
                            - Rate limiting（Better Auth 可選用）

外部服務：
- OAuth Providers (Google, GitHub, Apple 等)
- 檔案儲存（開發本地，生產 S3 / Azure Blob）
- Mobile 推送（Expo + FCM）
```

**資料流向簡述**：
1. **認證**：Client → Better Auth Handler → OAuth Provider → 建立 Session (cookie) → Client 取得 session
2. **資料查詢/變更**：Client → GraphQL (帶 session cookie) → Backend Context 取得 user → Prisma 操作 DB → 回傳
3. **即時通訊**：Client → Socket.io (帶 session cookie 驗證) → 加入房間 → 發送/接收事件 → Redis 輔助廣播（未來多實例）
4. **檔案上傳**：Client → REST Upload → Backend 處理壓縮 → 儲存至本地/S3 → 回傳 URL → 發送圖片訊息
5. **推送通知**（Mobile）：Backend 可擴展上傳 FCM token → 新訊息時觸發 Expo Notifications

## 三、各層邊界與職責劃分

### 3.1 Web Frontend (Next.js App Router)
- 職責：UI 渲染、路由、狀態管理、GraphQL 查詢、Socket.io 即時更新
- 邊界：所有請求帶 Better Auth session cookie，無直接操作 DB
- 共享：GraphQL types、Zustand stores、Custom hooks 與 Mobile 共享
- 特殊：Server Components 可直接呼叫 Backend API（內部）

### 3.2 Mobile Frontend (React Native + Expo)
- 職責：原生體驗、推送通知、圖片選擇/壓縮、深層連結 OAuth callback
- 邊界：同 Web，使用相同 Apollo + Socket.io client，認證用 @better-auth/expo
- 特殊：背景/前景切換時管理 Socket 連線、expo-secure-store 儲存 session

### 3.3 Backend (Hono on Bun)
- 職責：
  - Better Auth 整合（OAuth + Session 管理）
  - GraphQL Yoga Resolver（業務邏輯）
  - Socket.io 事件處理（即時推送、在線狀態）
  - 檔案上傳與圖片處理
  - Middleware：認證、錯誤處理、rate limiting
- 邊界：Stateless 設計，所有狀態依賴 DB + Redis，易水平擴展

### 3.4 Database Layer (Prisma + PostgreSQL)
- 職責：持久化儲存用戶、好友、對話、訊息、訊息狀態
- 邊界：僅 Backend 存取，索引與唯一約束確保資料一致性
- Better Auth 自動生成表格，與業務表格共用 User ID

### 3.5 Cache & Real-time Layer (Redis)
- 職責：暫存熱資料（在線、未讀、輸入狀態）、Socket 映射
- 邊界：非持久化，TTL 機制，未來支援多 Backend 實例 Pub/Sub 廣播

## 四、跨層交互與安全邊界

- **認證統一**：Better Auth 負責所有 session 建立/驗證，前後端皆依賴 cookie（HttpOnly + Secure）
- **即時同步**：Socket.io 直接推送，GraphQL Subscription 作為備援（MVP 以 Socket 為主）
- **離線支援**：Client 端 Apollo Cache + local state，網路恢復自動重連
- **安全考慮**：
  - 全站 HTTPS/WSS
  - Better Auth 內建 CSRF、rate limiting
  - 檔案上傳白名單 + 大小限制 + 壓縮去 EXIF
  - Prisma 防止 SQL Injection

## 五、非功能性考量（高階）

- **可擴展性**：Backend Stateless + Redis Pub/Sub → 易加多實例
- **效能**：GraphQL 批次 + Socket.io 低延遲 + Redis 快取
- **可用性**：99% 目標、自動重連、友善錯誤處理
- **部署**：Docker 容器化、CI/CD、獨立環境（dev/staging/prod）

## 六、未來擴展方向（Post-MVP）

- 多實例 Socket.io Adapter (Redis Adapter)
- 群組聊天、訊息搜尋、端到端加密
- 完整推送通知（包含好友邀請）
- 監控（Prometheus + Grafana）、日誌集中

這份 SDD Overview 作為整個專案的高階藍圖，詳細實作請參考其他規格檔：
- backend.md
- frontend.md（Web）
- mobile.md（Mobile）
- database.md
