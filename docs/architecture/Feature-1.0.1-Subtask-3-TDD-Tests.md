# Feature 1.0.1 Subtask 3: Better Auth 整合 - TDD 測試規格

## 一、測試目標概述

本測試規格定義 Better Auth 整合的完整測試案例，確保：

1. Better Auth client 正確初始化並連接 Prisma adapter
2. OAuth providers（Google, GitHub, Apple）配置正確
3. Session 建立、驗證、過期處理機制正常運作
4. Middleware 正確驗證 session 並注入 userId 到 GraphQL context
5. 錯誤情況（缺少環境變數、資料庫連線失敗）的 graceful handling

---

## 二、測試檔案位置

**主要測試檔案**：`/backend/tests/integration/better-auth.spec.ts`

**輔助測試檔案**：
- `/backend/tests/integration/auth-middleware.spec.ts` - 測試 middleware 功能
- `/backend/tests/unit/auth-client.spec.ts` - 測試 client 初始化

---

## 三、實作檔案位置

**核心實作檔案**：
1. `/backend/src/lib/auth.ts` - Better Auth client 初始化與配置
2. `/backend/src/middleware.ts` - Session 驗證 middleware
3. `/backend/.env.example` - 環境變數範本（已存在，需確認完整性）

---

## 四、環境變數需求

### 4.1 必要環境變數

以下環境變數必須在 `.env.example` 中定義（已完成）：

```bash
# Better Auth Core Configuration
BETTER_AUTH_SECRET="your-secret-key-here-replace-in-production"
BETTER_AUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Apple OAuth (optional for MVP)
APPLE_CLIENT_ID="your-apple-client-id"
APPLE_TEAM_ID="your-apple-team-id"
APPLE_KEY_ID="your-apple-key-id"
APPLE_PRIVATE_KEY="your-apple-private-key"

# Database (Prisma)
DATABASE_URL="postgresql://postgres:your-password-here@localhost:5432/ping_dev"
```

### 4.2 測試環境變數

測試時使用的 mock 環境變數（定義於 test setup）：

```typescript
// /backend/tests/setup.ts
process.env.BETTER_AUTH_SECRET = "test-secret-key-at-least-32-characters-long";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
process.env.GITHUB_CLIENT_ID = "test-github-client-id";
process.env.GITHUB_CLIENT_SECRET = "test-github-client-secret";
```

---

## 五、Backend 整合測試案例（7+ 個）

### 測試檔案：`/backend/tests/integration/better-auth.spec.ts`

---

### Test Case 1: Better Auth Client 初始化成功

**測試名稱**：`should initialize Better Auth client successfully`

**測試目的**：確保 Better Auth client 可以正確初始化，並連接 Prisma adapter

**前置條件**：
- 所有必要環境變數已設定
- PostgreSQL database 正常運行
- Prisma client 已初始化

**測試步驟**：
```typescript
import { authClient } from '@/lib/auth';
import { describe, it, expect } from 'bun:test';

describe('Better Auth Integration', () => {
  it('should initialize Better Auth client successfully', async () => {
    // Act: 嘗試取得 client instance
    const client = authClient;

    // Assert: Client 應該存在且包含必要的方法
    expect(client).toBeDefined();
    expect(client.handler).toBeDefined(); // Better Auth handler
    expect(client.$fetch).toBeDefined(); // Internal fetch method
  });
});
```

**期望輸出**：
- `authClient` 物件存在
- 包含 `handler` 方法（處理 Better Auth API routes）
- 包含 `$fetch` 方法（內部 API 調用）

**錯誤情況**：N/A（初始化失敗會在 import 階段拋出錯誤）

---

### Test Case 2: Prisma Adapter 連接正確

**測試名稱**：`should connect Prisma adapter correctly`

**測試目的**：確保 Better Auth 使用 Prisma adapter 並能正確讀寫 User、Session、Account tables

**前置條件**：
- Better Auth client 已初始化
- Database 已運行且執行過 migrations

**測試步驟**：
```typescript
it('should connect Prisma adapter correctly', async () => {
  // Arrange: 準備測試用戶資料
  const testEmail = 'test-adapter@example.com';

  // Act: 使用 Better Auth 建立用戶（透過內部 API）
  const result = await authClient.$fetch('/api/auth/user/create', {
    method: 'POST',
    body: {
      email: testEmail,
      name: 'Test User',
    },
  });

  // Assert: 檢查用戶是否正確寫入資料庫
  const user = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  expect(user).toBeDefined();
  expect(user?.email).toBe(testEmail);
  expect(user?.name).toBe('Test User');

  // Cleanup
  await prisma.user.delete({ where: { email: testEmail } });
});
```

**期望輸出**：
- User 成功寫入 PostgreSQL
- 可透過 Prisma 查詢到該用戶
- User 資料欄位正確（email, name, createdAt, updatedAt）

**錯誤情況**：
- **500 Internal Server Error**：Prisma adapter 連接失敗
- Database connection error：PostgreSQL 未運行

---

### Test Case 3: OAuth Providers 配置正確（Google）

**測試名稱**：`should configure Google OAuth provider correctly`

**測試目的**：確保 Google OAuth provider 已正確配置，包含 client ID、secret、redirect URI

**前置條件**：
- `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 環境變數已設定
- Better Auth client 已初始化

**測試步驟**：
```typescript
it('should configure Google OAuth provider correctly', async () => {
  // Act: 取得 Better Auth 的 provider 配置
  const config = authClient.options.socialProviders;

  // Assert: 確認 Google provider 存在且配置正確
  const googleProvider = config?.find((p: any) => p.id === 'google');

  expect(googleProvider).toBeDefined();
  expect(googleProvider?.clientId).toBe(process.env.GOOGLE_CLIENT_ID);
  expect(googleProvider?.clientSecret).toBe(process.env.GOOGLE_CLIENT_SECRET);
  expect(googleProvider?.callbackURL).toContain('/api/auth/callback/google');
});
```

**期望輸出**：
- Google provider 配置存在
- Client ID 和 Secret 正確對應環境變數
- Callback URL 格式正確：`http://localhost:3000/api/auth/callback/google`

**錯誤情況**：
- **400 Bad Request**：缺少 `GOOGLE_CLIENT_ID` 或 `GOOGLE_CLIENT_SECRET`

---

### Test Case 4: OAuth Providers 配置正確（GitHub）

**測試名稱**：`should configure GitHub OAuth provider correctly`

**測試目的**：確保 GitHub OAuth provider 已正確配置

**前置條件**：
- `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` 環境變數已設定

**測試步驟**：
```typescript
it('should configure GitHub OAuth provider correctly', async () => {
  // Act: 取得 Better Auth 的 provider 配置
  const config = authClient.options.socialProviders;

  // Assert: 確認 GitHub provider 存在且配置正確
  const githubProvider = config?.find((p: any) => p.id === 'github');

  expect(githubProvider).toBeDefined();
  expect(githubProvider?.clientId).toBe(process.env.GITHUB_CLIENT_ID);
  expect(githubProvider?.clientSecret).toBe(process.env.GITHUB_CLIENT_SECRET);
  expect(githubProvider?.callbackURL).toContain('/api/auth/callback/github');
});
```

**期望輸出**：
- GitHub provider 配置存在
- Callback URL 格式正確：`http://localhost:3000/api/auth/callback/github`

**錯誤情況**：
- **400 Bad Request**：缺少 GitHub credentials

---

### Test Case 5: Session 建立與驗證流程

**測試名稱**：`should create and validate session successfully`

**測試目的**：確保 Better Auth 可以正確建立 session 並驗證 session token

**前置條件**：
- Better Auth client 已初始化
- 測試用戶已存在於資料庫

**測試步驟**：
```typescript
it('should create and validate session successfully', async () => {
  // Arrange: 建立測試用戶
  const testUser = await prisma.user.create({
    data: {
      email: 'test-session@example.com',
      name: 'Session Test User',
      emailVerified: new Date(),
    },
  });

  // Act 1: 使用 Better Auth 建立 session
  const session = await authClient.$fetch('/api/auth/session/create', {
    method: 'POST',
    body: {
      userId: testUser.id,
      expiresIn: 60 * 60 * 24 * 7, // 7 days
    },
  });

  // Assert 1: Session 應成功建立
  expect(session).toBeDefined();
  expect(session.sessionToken).toBeDefined();
  expect(session.userId).toBe(testUser.id);

  // Act 2: 驗證 session token
  const validatedSession = await authClient.$fetch('/api/auth/session/verify', {
    method: 'POST',
    body: {
      sessionToken: session.sessionToken,
    },
  });

  // Assert 2: Session 驗證成功
  expect(validatedSession).toBeDefined();
  expect(validatedSession.userId).toBe(testUser.id);
  expect(validatedSession.user.email).toBe('test-session@example.com');

  // Cleanup
  await prisma.session.deleteMany({ where: { userId: testUser.id } });
  await prisma.user.delete({ where: { id: testUser.id } });
});
```

**期望輸出**：
- Session 成功建立，包含 `sessionToken` 和 `userId`
- Session token 可成功驗證，回傳完整 user 物件
- Session 正確寫入 PostgreSQL `Session` table

**錯誤情況**：
- **401 Unauthorized**：Invalid session token
- **404 Not Found**：User 不存在

---

### Test Case 6: Session 過期處理

**測試名稱**：`should reject expired session`

**測試目的**：確保過期的 session token 無法通過驗證

**前置條件**：
- Better Auth client 已初始化
- 測試用戶已存在

**測試步驟**：
```typescript
it('should reject expired session', async () => {
  // Arrange: 建立測試用戶與已過期的 session
  const testUser = await prisma.user.create({
    data: {
      email: 'test-expired@example.com',
      name: 'Expired Session User',
      emailVerified: new Date(),
    },
  });

  const expiredSession = await prisma.session.create({
    data: {
      userId: testUser.id,
      sessionToken: 'expired-token-12345',
      expires: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    },
  });

  // Act: 嘗試驗證過期的 session
  const result = await authClient.$fetch('/api/auth/session/verify', {
    method: 'POST',
    body: {
      sessionToken: expiredSession.sessionToken,
    },
  }).catch((error) => error);

  // Assert: 應拋出 401 錯誤
  expect(result).toBeDefined();
  expect(result.status).toBe(401);
  expect(result.message).toContain('expired');

  // Cleanup
  await prisma.session.delete({ where: { id: expiredSession.id } });
  await prisma.user.delete({ where: { id: testUser.id } });
});
```

**期望輸出**：
- 過期的 session token 驗證失敗
- 回傳 **401 Unauthorized** 錯誤
- 錯誤訊息包含 "expired" 關鍵字

**錯誤情況**：
- **401 Unauthorized**：Session expired

---

### Test Case 7: 無效 Session Token 處理

**測試名稱**：`should reject invalid session token`

**測試目的**：確保無效的 session token（不存在於資料庫）無法通過驗證

**前置條件**：
- Better Auth client 已初始化

**測試步驟**：
```typescript
it('should reject invalid session token', async () => {
  // Arrange: 準備一個不存在的 session token
  const invalidToken = 'non-existent-token-99999';

  // Act: 嘗試驗證無效的 session
  const result = await authClient.$fetch('/api/auth/session/verify', {
    method: 'POST',
    body: {
      sessionToken: invalidToken,
    },
  }).catch((error) => error);

  // Assert: 應拋出 401 錯誤
  expect(result).toBeDefined();
  expect(result.status).toBe(401);
  expect(result.message).toContain('invalid');
});
```

**期望輸出**：
- 無效的 session token 驗證失敗
- 回傳 **401 Unauthorized** 錯誤
- 錯誤訊息包含 "invalid" 關鍵字

**錯誤情況**：
- **401 Unauthorized**：Invalid session token

---

### Test Case 8: Middleware 注入 userId 到 GraphQL Context

**測試名稱**：`should inject userId into GraphQL context from session cookie`

**測試目的**：確保 auth middleware 可以從 cookie 中讀取 session token，驗證後注入 userId 到 context

**前置條件**：
- Better Auth client 已初始化
- Middleware 已實作
- 測試用戶與 session 已建立

**測試檔案位置**：`/backend/tests/integration/auth-middleware.spec.ts`

**測試步驟**：
```typescript
import { createMiddleware } from '@/middleware';
import { describe, it, expect } from 'bun:test';

describe('Auth Middleware', () => {
  it('should inject userId into GraphQL context from session cookie', async () => {
    // Arrange: 建立測試用戶與 session
    const testUser = await prisma.user.create({
      data: {
        email: 'test-middleware@example.com',
        name: 'Middleware Test User',
        emailVerified: new Date(),
      },
    });

    const session = await prisma.session.create({
      data: {
        userId: testUser.id,
        sessionToken: 'test-session-token-12345',
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
      },
    });

    // Act: 模擬 HTTP request with session cookie
    const mockRequest = {
      headers: {
        cookie: `better-auth.session_token=${session.sessionToken}`,
      },
    };

    const context = await createMiddleware(mockRequest);

    // Assert: context 應包含 userId
    expect(context).toBeDefined();
    expect(context.userId).toBe(testUser.id);
    expect(context.user).toBeDefined();
    expect(context.user.email).toBe('test-middleware@example.com');

    // Cleanup
    await prisma.session.delete({ where: { id: session.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  });
});
```

**期望輸出**：
- Middleware 成功從 cookie 讀取 session token
- Session 驗證成功，取得 userId
- Context 包含 `userId` 和完整 `user` 物件
- GraphQL resolvers 可以使用 `context.userId` 和 `context.user`

**錯誤情況**：
- **401 Unauthorized**：Missing or invalid session cookie
- **403 Forbidden**：Session expired

---

### Test Case 9: Middleware 處理缺少 Session Cookie

**測試名稱**：`should handle missing session cookie gracefully`

**測試目的**：確保 middleware 在缺少 session cookie 時不拋出錯誤，而是注入 `userId: null`

**前置條件**：
- Middleware 已實作

**測試步驟**：
```typescript
it('should handle missing session cookie gracefully', async () => {
  // Arrange: 模擬沒有 session cookie 的 request
  const mockRequest = {
    headers: {},
  };

  // Act: 執行 middleware
  const context = await createMiddleware(mockRequest);

  // Assert: context 應包含 null userId（允許匿名訪問）
  expect(context).toBeDefined();
  expect(context.userId).toBeNull();
  expect(context.user).toBeNull();
});
```

**期望輸出**：
- Middleware 不拋出錯誤
- Context 包含 `userId: null` 和 `user: null`
- GraphQL resolvers 可以決定是否允許匿名訪問

**錯誤情況**：N/A（匿名訪問應允許）

---

### Test Case 10: 錯誤處理 - 缺少環境變數

**測試名稱**：`should throw error if BETTER_AUTH_SECRET is missing`

**測試目的**：確保在缺少必要環境變數時，Better Auth 初始化失敗並拋出明確錯誤

**前置條件**：N/A

**測試步驟**：
```typescript
it('should throw error if BETTER_AUTH_SECRET is missing', async () => {
  // Arrange: 暫時移除環境變數
  const originalSecret = process.env.BETTER_AUTH_SECRET;
  delete process.env.BETTER_AUTH_SECRET;

  // Act & Assert: 嘗試初始化 Better Auth，應拋出錯誤
  expect(() => {
    require('@/lib/auth'); // Re-import to trigger initialization
  }).toThrow(/BETTER_AUTH_SECRET/);

  // Cleanup: 恢復環境變數
  process.env.BETTER_AUTH_SECRET = originalSecret;
});
```

**期望輸出**：
- 初始化失敗
- 拋出明確錯誤訊息：`Missing required environment variable: BETTER_AUTH_SECRET`

**錯誤情況**：
- **500 Internal Server Error**：Missing environment variables

---

### Test Case 11: 錯誤處理 - 資料庫連線失敗

**測試名稱**：`should handle database connection failure gracefully`

**測試目的**：確保當 Prisma 無法連接資料庫時，Better Auth 拋出明確錯誤

**前置條件**：
- PostgreSQL 停止運行（模擬連線失敗）

**測試步驟**：
```typescript
it('should handle database connection failure gracefully', async () => {
  // Arrange: Mock Prisma client 拋出連線錯誤
  const mockPrisma = {
    user: {
      findUnique: jest.fn().mockRejectedValue(new Error('Database connection failed')),
    },
  };

  // Act: 嘗試使用 Better Auth 查詢用戶
  const result = await authClient.$fetch('/api/auth/session/verify', {
    method: 'POST',
    body: {
      sessionToken: 'test-token',
    },
  }).catch((error) => error);

  // Assert: 應拋出 500 錯誤
  expect(result).toBeDefined();
  expect(result.status).toBe(500);
  expect(result.message).toContain('Database connection failed');
});
```

**期望輸出**：
- 回傳 **500 Internal Server Error**
- 錯誤訊息包含 "Database connection failed"

**錯誤情況**：
- **500 Internal Server Error**：Database connection failed

---

## 六、Fixtures 與 Mocks

### 6.1 測試用戶 Fixtures

定義於 `/backend/tests/fixtures/users.ts`：

```typescript
export const testUsers = {
  validUser: {
    id: 'test-user-id-1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: new Date(),
    image: 'https://example.com/avatar.jpg',
  },
  unverifiedUser: {
    id: 'test-user-id-2',
    email: 'unverified@example.com',
    name: 'Unverified User',
    emailVerified: null,
  },
};
```

### 6.2 Mock Session Data

定義於 `/backend/tests/fixtures/sessions.ts`：

```typescript
export const testSessions = {
  validSession: {
    id: 'test-session-id-1',
    sessionToken: 'valid-session-token-12345',
    userId: 'test-user-id-1',
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
  },
  expiredSession: {
    id: 'test-session-id-2',
    sessionToken: 'expired-session-token-12345',
    userId: 'test-user-id-1',
    expires: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
  },
};
```

### 6.3 Mock OAuth Responses

定義於 `/backend/tests/fixtures/oauth.ts`：

```typescript
export const mockOAuthResponses = {
  google: {
    access_token: 'mock-google-access-token',
    id_token: 'mock-google-id-token',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'openid email profile',
    user: {
      id: 'google-user-id-123',
      email: 'user@gmail.com',
      name: 'Google User',
      picture: 'https://lh3.googleusercontent.com/a/default-user',
    },
  },
  github: {
    access_token: 'mock-github-access-token',
    token_type: 'bearer',
    scope: 'read:user user:email',
    user: {
      id: 12345678,
      login: 'githubuser',
      email: 'user@github.com',
      name: 'GitHub User',
      avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
    },
  },
};
```

---

## 七、實作規格（供 Backend Agent 參考）

### 7.1 `/backend/src/lib/auth.ts` - Better Auth Client

**最小可行實作（Minimal Viable Implementation）**：

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

// Validate environment variables
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("Missing required environment variable: BETTER_AUTH_SECRET");
}

if (!process.env.BETTER_AUTH_URL) {
  throw new Error("Missing required environment variable: BETTER_AUTH_URL");
}

export const authClient = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID || "",
      clientSecret: process.env.APPLE_CLIENT_SECRET || "",
      enabled: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET),
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  advanced: {
    cookiePrefix: "better-auth",
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

export type AuthClient = typeof authClient;
```

### 7.2 `/backend/src/middleware.ts` - Session 驗證 Middleware

**最小可行實作**：

```typescript
import { authClient } from "./lib/auth";
import type { Context } from "hono";

export interface AuthContext {
  userId: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  } | null;
}

export async function createAuthMiddleware(c: Context): Promise<AuthContext> {
  try {
    // Extract session token from cookie
    const cookieHeader = c.req.header("cookie");
    if (!cookieHeader) {
      return { userId: null, user: null };
    }

    // Parse session token from cookie
    const sessionToken = parseCookie(cookieHeader, "better-auth.session_token");
    if (!sessionToken) {
      return { userId: null, user: null };
    }

    // Verify session using Better Auth
    const session = await authClient.$fetch("/api/auth/session/verify", {
      method: "POST",
      body: { sessionToken },
    });

    if (!session || !session.user) {
      return { userId: null, user: null };
    }

    // Return user context
    return {
      userId: session.user.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      },
    };
  } catch (error) {
    console.error("Auth middleware error:", error);
    return { userId: null, user: null };
  }
}

// Helper function to parse cookie
function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}
```

---

## 八、測試覆蓋率要求

**最低覆蓋率**：80%

**必須覆蓋的路徑**：
1. ✅ Better Auth client 初始化
2. ✅ Prisma adapter 連接
3. ✅ OAuth providers 配置（Google, GitHub, Apple）
4. ✅ Session 建立流程
5. ✅ Session 驗證流程
6. ✅ Session 過期處理
7. ✅ 無效 session token 處理
8. ✅ Middleware 注入 userId
9. ✅ Middleware 處理缺少 cookie
10. ✅ 錯誤處理（缺少環境變數）
11. ✅ 錯誤處理（資料庫連線失敗）

**覆蓋率統計工具**：Bun 內建測試覆蓋率（`bun test --coverage`）

---

## 九、測試執行指令

```bash
# 執行所有 Better Auth 整合測試
cd backend
bun test tests/integration/better-auth.spec.ts

# 執行 middleware 測試
bun test tests/integration/auth-middleware.spec.ts

# 執行所有測試並顯示覆蓋率
bun test --coverage

# Watch mode（開發時使用）
bun test --watch tests/integration/better-auth.spec.ts
```

---

## 十、成功標準（Definition of Done）

完成 Subtask 3 時，必須滿足以下條件：

- [ ] 所有 11 個測試案例全部通過 ✅
- [ ] 測試覆蓋率 ≥ 80%
- [ ] `/backend/src/lib/auth.ts` 完整實作並通過測試
- [ ] `/backend/src/middleware.ts` 完整實作並通過測試
- [ ] 環境變數範本 `.env.example` 包含所有必要變數（已完成）
- [ ] 可以成功建立 session 並從 cookie 驗證
- [ ] 可以處理過期和無效的 session
- [ ] 錯誤處理機制完善（缺少環境變數、資料庫連線失敗）
- [ ] **Code Review 通過**（Architect 審查）
- [ ] **Commit 完成**：`[feat] integrate Better Auth with OAuth providers`

---

## 十一、依賴關係

**上游依賴（必須先完成）**：
- ✅ Subtask 1: Prisma Schema（已完成）
- ✅ Subtask 2: Redis Configuration（已完成）

**下游依賴（等待本 subtask 完成）**：
- ⏳ Subtask 4: GraphQL Yoga 設定（需要 auth middleware）
- ⏳ Subtask 5: Socket.io 設定（需要 session 驗證）
- ⏳ Feature 1.1.1: OAuth Google 登入（需要 Better Auth client）

---

## 十二、參考資料

**Better Auth 官方文檔**：
- Prisma Adapter: https://better-auth.com/docs/adapters/prisma
- Social Providers: https://better-auth.com/docs/providers/oauth
- Session Management: https://better-auth.com/docs/concepts/session

**Bun 測試文檔**：
- Testing Guide: https://bun.sh/docs/test/writing

**Prisma 文檔**：
- Client API: https://www.prisma.io/docs/concepts/components/prisma-client

---

## 十三、Notes for Backend Agent

**重要提醒**：

1. **不要使用 NextAuth / Auth.js**：本專案使用 Better Auth（官方推薦用於現代全端應用）
2. **Session 儲存機制**：使用 HTTP-only Secure Cookie，不使用 JWT
3. **Prisma Adapter 版本**：確保使用 `@better-auth/prisma-adapter`（不是 `@auth/prisma-adapter`）
4. **環境變數驗證**：在 `/backend/src/lib/auth.ts` 初始化時驗證所有必要環境變數
5. **錯誤處理**：所有錯誤應包含明確的錯誤訊息和錯誤碼
6. **測試優先**：先確保測試可以執行（紅燈），再實作（綠燈），最後重構
7. **Cookie Parsing**：Hono 提供 `c.req.cookie()` 方法，可直接使用而不需手動 parse

**建議開發順序**：
1. 先實作 `/backend/src/lib/auth.ts`（Better Auth client）
2. 執行 Test Case 1-7（client 與 session 相關測試）
3. 再實作 `/backend/src/middleware.ts`
4. 執行 Test Case 8-9（middleware 相關測試）
5. 最後測試錯誤處理（Test Case 10-11）
6. 執行完整測試套件確保全部通過
7. 檢查測試覆蓋率（≥ 80%）
8. 提交 PR 等待 Architect Review

---

**文檔版本**：v1.0
**建立日期**：2025-01-04
**負責 Agent**：Architect Agent
**實作 Agent**：Backend Developer
**預期完成日期**：2025-01-05
