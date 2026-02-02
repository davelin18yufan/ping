# Authentication Middleware 使用指南

本專案提供兩種 authentication guards：

1. **Client-Side Guards** (`auth.middleware.ts`) - **已棄用**
2. **Server-Side Guards** (`auth.middleware.server.ts`) - **推薦使用**

---

## Server-Side Guards (推薦)

### 為什麼使用 Server-Side Guards？

- **真正的 SSR 支援**：使用 `auth.api.getSession()` 在伺服器端驗證 session
- **無 hydration 問題**：不會有 client-side/server-side 不一致的問題
- **無閃爍問題**：在 HTML 送到 client 之前就完成驗證
- **更安全**：session 檢查在伺服器端完成，無法被 client 繞過

### 可用的 Guards

#### 1. `requireAuthServer()` - 需要登入

用於需要使用者登入才能訪問的頁面。

```typescript
// /frontend/src/routes/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'
import { requireAuthServer } from '@/middleware/auth.middleware.server'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireAuthServer,
  component: DashboardPage,
})

function DashboardPage() {
  const { session } = Route.useRouteContext()
  // session.user 保證存在

  return (
    <div>
      <h1>Welcome, {session.user.name}!</h1>
    </div>
  )
}
```

**行為**：

- 已登入：允許訪問，回傳 session 資料
- 未登入：重導向到 `/auth?redirect=/dashboard`

---

#### 2. `requireGuestServer()` - 需要訪客（未登入）

用於只允許未登入使用者訪問的頁面（例如登入頁）。

```typescript
// /frontend/src/routes/auth/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { requireGuestServer } from '@/middleware/auth.middleware.server'

export const Route = createFileRoute('/auth/')({
  beforeLoad: requireGuestServer,
  component: LoginPage,
})

function LoginPage() {
  return (
    <div>
      <h1>Sign In</h1>
      {/* OAuth buttons */}
    </div>
  )
}
```

**行為**：

- 未登入：允許訪問
- 已登入：重導向到 `/`

---

#### 3. `optionalAuthServer()` - 可選驗證

用於對登入和未登入使用者都開放的頁面，但需要知道使用者登入狀態。

```typescript
// /frontend/src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { optionalAuthServer } from '@/middleware/auth.middleware.server'

export const Route = createFileRoute('/')({
  beforeLoad: optionalAuthServer,
  component: HomePage,
})

function HomePage() {
  const { session } = Route.useRouteContext()

  if (session?.user) {
    return <AuthenticatedView user={session.user} />
  }

  return <GuestView />
}
```

**行為**：

- 已登入：回傳 session 資料
- 未登入：回傳 `null`
- **不會重導向**

---

## 技術細節

### Server-Side Session 驗證流程

```typescript
// 1. 取得 request headers (包含 cookies)
const headers = getRequestHeaders()

// 2. 使用 Better Auth API 驗證 session
const session = await auth.api.getSession({ headers })

// 3. 根據驗證結果決定行為
if (!session?.user) {
    throw redirect({ to: "/auth" })
}

// 4. 回傳 session 資料給 route context
return { session }
```

### Better Auth 配置

確保 `/frontend/src/lib/auth.ts` 包含正確配置：

```typescript
import { betterAuth } from "better-auth"
import { tanstackStartCookies } from "better-auth/tanstack-start"

export const auth = betterAuth({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",

    // IMPORTANT: 必須是最後一個 plugin
    plugins: [tanstackStartCookies()],
})
```

---

## Client-Side Guards (已棄用)

**不建議使用**，因為：

- 使用 client SDK 的 `getSession()`，可能造成 SSR hydration 不一致
- 無法保證在伺服器端執行
- 可能有閃爍問題（先顯示內容再重導向）

如果你的程式碼還在使用 `requireAuth` / `requireGuest` / `optionalAuth`，請遷移到新的 server-side guards。

---

## 遷移指南

### Before (Client-Side)

```typescript
import { requireAuth } from "@/middleware/auth.middleware"

export const Route = createFileRoute("/dashboard")({
    beforeLoad: requireAuth,
    component: DashboardPage,
})
```

### After (Server-Side)

```typescript
import { requireAuthServer } from "@/middleware/auth.middleware.server"

export const Route = createFileRoute("/dashboard")({
    beforeLoad: requireAuthServer,
    component: DashboardPage,
})
```

**改動**：

1. 匯入改為 `auth.middleware.server`
2. 函數名稱加上 `Server` 後綴
3. 行為完全相同，但在伺服器端執行

---

## 測試

Server-side guards 的測試位於：

- `/frontend/tests/integration/auth-middleware-server.spec.ts`

執行測試：

```bash
cd frontend
pnpm test auth-middleware-server.spec.ts
```

---

## 常見問題

### Q: 為什麼需要兩套 middleware？

**A**: 歷史遺留問題。舊的 client-side guards 可能有 SSR 問題，新的 server-side guards 才是正確做法。

### Q: 可以在 API routes 使用嗎？

**A**: 可以，但建議在 API routes 直接使用 `auth.api.getSession({ headers })`，不需要透過這些 guards。

### Q: 效能如何？

**A**: Server-side guards 在每次 route navigation 時執行一次 session 檢查。Better Auth 使用 cookie-based session，檢查速度很快（< 5ms）。

---

## 參考資料

- [Better Auth - TanStack Start Integration](https://www.better-auth.com/docs/integrations/tanstack)
- [TanStack Router - Authentication Guide](https://tanstack.com/router/latest/docs/framework/react/guide/authentication)
- [Better Auth - Server API](https://www.better-auth.com/docs/concepts/server-api)
