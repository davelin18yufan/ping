# Feature 1.1.1：Google OAuth 登入 - TDD 測試框架

> 這份文件展示「第一個 feature」的完整 TDD 流程。QA Agent 應按照以下結構撰寫測試，Backend / Frontend / Mobile Agent 據此實作。

---

## 一、Feature 概述

**需求**：用戶可透過 Google OAuth 登入應用
- 支援平台：Web (Next.js)、Mobile (React Native)
- 後端處理：驗證 Google code、建立 session、回傳用戶資訊
- 期望流程：
  1. 用戶點擊「Google 登入」按鈕
  2. 系統開啟 Google OAuth 授權頁面
  3. 用戶授權後，系統收到 code
  4. 後端驗證 code，建立 session
  5. 用戶重導回主應用，自動登入成功

---

## 二、Backend 測試 (RED Phase)

### 測試檔案位置
`/backend/tests/integration/auth-oauth.spec.ts`

### 測試代碼

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHonoApp } from '../setup';  // 假設有 setup helper
import { PrismaClient } from '@prisma/client';
import { redis } from '../../src/lib/redis';

describe('Google OAuth Authentication', () => {
  let app;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = createHonoApp();
    prisma = new PrismaClient();
    // 清空測試資料庫
    await prisma.user.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.flushdb();
  });

  describe('POST /graphql - authenticateWithGoogle mutation', () => {
    // Test 1: 成功驗證有效的 Google code
    it('[RED] should exchange valid Google OAuth code for session', async () => {
      const googleCode = 'valid_google_code_xyz123';
      
      const response = await app.request(
        new Request('http://localhost:3000/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation AuthenticateWithGoogle($code: String!) {
                authenticateWithGoogle(code: $code) {
                  user {
                    id
                    email
                    displayName
                    avatarUrl
                  }
                  success
                  message
                }
              }
            `,
            variables: { code: googleCode },
          }),
        })
      );

      const json = await response.json();

      // [RED] 期望後端能成功驗證並回傳用戶資訊
      expect(response.status).toBe(200);
      expect(json.data.authenticateWithGoogle).toBeDefined();
      expect(json.data.authenticateWithGoogle.user).toBeDefined();
      expect(json.data.authenticateWithGoogle.user.email).toBe('test@example.com');
      expect(json.data.authenticateWithGoogle.success).toBe(true);

      // [RED] 期望後端設置了 session cookie
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('better_auth.session_token');
      expect(setCookie).toContain('Secure');
      expect(setCookie).toContain('HttpOnly');
    });

    // Test 2: 無效的 code 應回傳 401
    it('[RED] should return 401 for invalid Google code', async () => {
      const invalidCode = 'invalid_code_12345';

      const response = await app.request(
        new Request('http://localhost:3000/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation AuthenticateWithGoogle($code: String!) {
                authenticateWithGoogle(code: $code) {
                  success
                  message
                }
              }
            `,
            variables: { code: invalidCode },
          }),
        })
      );

      const json = await response.json();

      // [RED] 期望 GraphQL 錯誤或 extensions.statusCode = 401
      expect(json.errors || json.data.authenticateWithGoogle.success).toBe(false);
      if (json.errors) {
        expect(json.errors[0].extensions.statusCode).toBe(401);
        expect(json.errors[0].extensions.code).toContain('INVALID_OAUTH_CODE');
      }
    });

    // Test 3: 重複登入同一 Google 帳號應回傳相同用戶
    it('[RED] should return same user for repeated OAuth login', async () => {
      const googleCode = 'same_google_code_abc';

      // 第一次登入
      const response1 = await app.request(
        new Request('http://localhost:3000/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation { authenticateWithGoogle(code: "${googleCode}") { user { id email } } }
            `,
          }),
        })
      );
      const json1 = await response1.json();
      const userId1 = json1.data.authenticateWithGoogle.user.id;

      // 第二次登入
      const response2 = await app.request(
        new Request('http://localhost:3000/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation { authenticateWithGoogle(code: "${googleCode}") { user { id email } } }
            `,
          }),
        })
      );
      const json2 = await response2.json();
      const userId2 = json2.data.authenticateWithGoogle.user.id;

      // [RED] 期望回傳相同用戶 ID
      expect(userId1).toBe(userId2);
    });

    // Test 4: 驗證 session 正確儲存在資料庫
    it('[RED] should create valid session in database', async () => {
      const googleCode = 'session_test_code_123';

      const response = await app.request(
        new Request('http://localhost:3000/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation { authenticateWithGoogle(code: "${googleCode}") { user { id } } }`,
          }),
        })
      );

      const json = await response.json();
      const userId = json.data.authenticateWithGoogle.user.id;

      // [RED] 驗證 DB 中有正確的 session 紀錄
      const sessions = await prisma.session.findMany({ where: { userId } });
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].expiresAt).toBeGreaterThan(new Date());
    });

    // Test 5: 空 code 應回傳 400 Bad Request
    it('[RED] should return 400 for missing code', async () => {
      const response = await app.request(
        new Request('http://localhost:3000/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation { authenticateWithGoogle(code: "") { success } }`,
          }),
        })
      );

      const json = await response.json();
      expect(json.errors || json.data.authenticateWithGoogle.success).toBe(false);
      if (json.errors) {
        expect(json.errors[0].extensions.statusCode).toBe(400);
      }
    });
  });

  describe('GET /api/auth/callback/google - OAuth callback endpoint', () => {
    // Test 6: 處理 OAuth callback (可選，若由 Better Auth 內部處理)
    it('[RED] should handle Google OAuth callback and set session', async () => {
      const code = 'callback_test_code';
      const state = 'state_token_xyz';

      const response = await app.request(
        new Request(
          `http://localhost:3000/api/auth/callback/google?code=${code}&state=${state}`,
          { method: 'GET' }
        )
      );

      // [RED] 期望重導或回傳 200，帶 session cookie
      expect([200, 302]).toContain(response.status);
      if (response.status === 302) {
        const location = response.headers.get('location');
        expect(location).toContain('/'); // 重導回主頁
      }
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
    });
  });

  describe('Helper tests for token verification', () => {
    // Test 7: Session cookie 應該在後續請求中有效
    it('[RED] should use session cookie for authenticated requests', async () => {
      const googleCode = 'auth_test_code_456';

      // 第一次：登入取得 cookie
      const loginResponse = await app.request(
        new Request('http://localhost:3000/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation { authenticateWithGoogle(code: "${googleCode}") { user { id } } }`,
          }),
        })
      );

      const setCookie = loginResponse.headers.get('set-cookie');

      // 第二次：帶 cookie 查詢當前用戶
      const meResponse = await app.request(
        new Request('http://localhost:3000/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': setCookie.split(';')[0], // 取 cookie 部分
          },
          body: JSON.stringify({
            query: `query { me { id email } }`,
          }),
        })
      );

      const meJson = await meResponse.json();

      // [RED] 期望 `me` query 正確回傳當前用戶
      expect(meJson.data.me).toBeDefined();
      expect(meJson.data.me.email).toBeTruthy();
    });
  });
});
```

---

## 三、Frontend (Web) 測試 (RED Phase)

### 測試檔案位置
`/frontend/tests/integration/oauth-flow.spec.tsx`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../../src/app/auth/page';
import { useAuthClient } from '@better-auth/react'; // Mock

// Mock Better Auth
vi.mock('@better-auth/react', () => ({
  useAuthClient: vi.fn(),
  useSession: vi.fn(),
}));

describe('Frontend - Google OAuth Login Flow', () => {
  let mockSignIn;

  beforeEach(() => {
    // Mock signIn.social
    mockSignIn = {
      social: vi.fn().mockResolvedValue({
        user: { id: '123', email: 'test@example.com', displayName: 'Test User' },
        success: true,
      }),
    };

    vi.mocked(useAuthClient).mockReturnValue({
      signIn: mockSignIn,
      signOut: vi.fn(),
      // ... other methods
    } as any);
  });

  describe('LoginForm component', () => {
    // Test 1: 點擊 Google 按鈕應觸發 OAuth
    it('[RED] should call signIn.social("google") when Google button clicked', async () => {
      render(<LoginPage />);

      const googleButton = screen.getByRole('button', { name: /google/i });
      
      // [RED] 點擊按鈕
      fireEvent.click(googleButton);

      // [RED] 期望呼叫 signIn.social with google provider
      await waitFor(() => {
        expect(mockSignIn.social).toHaveBeenCalledWith({
          provider: 'google',
        });
      });
    });

    // Test 2: 登入成功後應導航到聊天頁面
    it('[RED] should navigate to /chat after successful login', async () => {
      const mockRouter = { push: vi.fn() };
      vi.mock('next/router', () => ({ useRouter: () => mockRouter }));

      render(<LoginPage />);

      const googleButton = screen.getByRole('button', { name: /google/i });
      fireEvent.click(googleButton);

      // [RED] 期望導航到聊天頁面
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/chat');
      });
    });

    // Test 3: 登入失敗應顯示錯誤訊息
    it('[RED] should display error message on login failure', async () => {
      mockSignIn.social.mockRejectedValueOnce(
        new Error('Invalid OAuth code')
      );

      render(<LoginPage />);

      const googleButton = screen.getByRole('button', { name: /google/i });
      fireEvent.click(googleButton);

      // [RED] 期望顯示錯誤訊息
      const errorMsg = await screen.findByText(/登入失敗/i);
      expect(errorMsg).toBeInTheDocument();
    });

    // Test 4: 登入過程中應顯示 loading 狀態
    it('[RED] should show loading state during OAuth', async () => {
      mockSignIn.social.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<LoginPage />);

      const googleButton = screen.getByRole('button', { name: /google/i });
      fireEvent.click(googleButton);

      // [RED] 期望按鈕處於 disabled 且顯示 loading
      expect(googleButton).toBeDisabled();
      expect(screen.getByText(/登入中/i)).toBeInTheDocument();
    });

    // Test 5: 應渲染所有 OAuth 選項（Google、GitHub、Apple）
    it('[RED] should render all OAuth provider buttons', () => {
      render(<LoginPage />);

      const googleBtn = screen.getByRole('button', { name: /google/i });
      const githubBtn = screen.getByRole('button', { name: /github/i });
      const appleBtn = screen.getByRole('button', { name: /apple/i });

      // [RED] 期望三個按鈕都存在
      expect(googleBtn).toBeInTheDocument();
      expect(githubBtn).toBeInTheDocument();
      expect(appleBtn).toBeInTheDocument();
    });
  });

  describe('Session persistence', () => {
    // Test 6: 登入後刷新頁面應保持登入狀態
    it('[RED] should persist session after page refresh', async () => {
      // 模擬 cookie 已存在
      vi.mocked(useAuthClient).mockReturnValue({
        signIn: mockSignIn,
        // ... getSession 應回傳有效的 session
      } as any);

      const { rerender } = render(<LoginPage />);

      // 刷新（重新 render）
      rerender(<LoginPage />);

      // [RED] 期望不再顯示登入表單，直接進入應用
      expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    });
  });
});
```

---

## 四、Mobile (React Native) 測試 (RED Phase)

### 測試檔案位置
`/mobile/tests/e2e/oauth-flow.e2e.ts`

```typescript
import { device, element, by, expect as detoxExpect } from 'detox';

describe('Mobile - Google OAuth Login E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      // 模擬 OAuth callback URL
      launchArgs: { detoxPrintBusyIdleResources: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('LoginScreen OAuth flow', () => {
    // Test 1: 應顯示 Google 登入按鈕
    it('[RED] should render Google login button', async () => {
      await detoxExpect(
        element(by.id('google-login-button'))
      ).toBeVisible();
    });

    // Test 2: 點擊 Google 按鈕應開啟瀏覽器
    it('[RED] should open browser when Google button pressed', async () => {
      await element(by.id('google-login-button')).multiTap();

      // [RED] 期望系統瀏覽器開啟（Expo linking）
      // 注：E2E 測試中難以真實測試瀏覽器跳轉，可用 mock
      await detoxExpect(
        element(by.text(/授權/i).or(by.text(/consent/i)))
      ).toBeVisible();
    });

    // Test 3: OAuth callback 後應自動建立 session
    it('[RED] should establish session after OAuth callback', async () => {
      // 模擬 deep link callback
      await device.simulateUniversalLink({
        scheme: 'com.ping.app',
        path: '/auth/callback?code=test_code_123&state=state_token',
      });

      // [RED] 期望自動導航到聊天頁面
      await waitFor(
        () => detoxExpect(element(by.id('conversations-list'))).toBeVisible(),
        { timeout: 5000 }
      );
    });

    // Test 4: 登入失敗應顯示 Toast 錯誤訊息
    it('[RED] should show error toast on failed OAuth', async () => {
      // 模擬失敗的 callback
      await device.simulateUniversalLink({
        scheme: 'com.ping.app',
        path: '/auth/callback?error=access_denied',
      });

      // [RED] 期望顯示錯誤 toast
      await detoxExpect(
        element(by.text(/登入失敗|登入已取消/i))
      ).toBeVisible();
    });

    // Test 5: 應支援 iOS Apple Sign In
    it('[RED] should render Apple Sign In button on iOS', async () => {
      if (device.getPlatform() === 'ios') {
        await detoxExpect(
          element(by.id('apple-login-button'))
        ).toBeVisible();
      }
    });
  });

  describe('Session security', () => {
    // Test 6: Session token 應儲存在 secure storage
    it('[RED] should store session securely after login', async () => {
      // 模擬成功登入
      await device.simulateUniversalLink({
        scheme: 'com.ping.app',
        path: '/auth/callback?code=test_code_secure&state=state_secure',
      });

      // [RED] 驗證 expo-secure-store 已儲存 token
      // (實際驗證需要整合測試或 native module 掛鉤)
      await waitFor(
        () => detoxExpect(element(by.id('conversations-list'))).toBeVisible(),
        { timeout: 5000 }
      );
    });
  });
});
```

---

## 五、執行 TDD 的步驟（給各 Agent）

### Phase 1: RED（寫測試，預期 FAIL ❌）
1. QA Agent 在上述三個檔案位置撰寫測試
2. 各 agent 執行測試，確認全部 FAIL
   ```bash
   cd backend && npm test -- auth-oauth.spec.ts
   cd frontend && npm test -- oauth-flow.spec.tsx
   cd mobile && npm run test:e2e -- oauth-flow.e2e.ts
   ```

### Phase 2: GREEN（實作，讓測試通過 ✅）
1. Backend Agent：實作 resolver、service、middleware
2. Frontend Agent：實作 LoginPage、LoginForm、hooks
3. Mobile Agent：實作 LoginScreen、deep link 處理
4. 各自執行測試直到綠燈

### Phase 3: REFACTOR（改進，保持綠燈）
1. 提取共享 hooks（`useOAuthLogin`）
2. 整理程式碼結構
3. 確保所有測試仍綠燈
4. Merge 到 main

---

## 六、Mock 與 Fixtures

### Backend Mock（假設 Better Auth 存在）
```typescript
// tests/fixtures/oauth-mocks.ts
export const mockGoogleOAuthResponse = {
  code: 'valid_google_code_xyz123',
  state: 'state_token_xyz',
};

export const mockGoogleUserInfo = {
  sub: 'google_user_123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
};
```

### Frontend Mock（Better Auth client）
```typescript
// tests/mocks/better-auth-mock.ts
export const createMockAuthClient = () => ({
  signIn: {
    social: vi.fn(),
  },
  signOut: vi.fn(),
  getSession: vi.fn(),
});
```

---

## 七、檢查清單

測試完成後，確認以下項目：

- [ ] **Backend 測試**：7 個測試全部綠燈 ✅
- [ ] **Frontend 測試**：6 個測試全部綠燈 ✅
- [ ] **Mobile 測試**：6 個 E2E 測試全部綠燈 ✅
- [ ] **整合測試**：前後端協作、session 正確流轉
- [ ] **覆蓋率**：>80%（可用 `npm test -- --coverage`）
- [ ] **沒有 TODO**：所有測試對應實作完整
- [ ] **更新 MULTI_AGENT_PLAN.md**：Feature 1.1.1 標記為「Done」

---

**注意**：此文件只是框架範本。實際測試可能需要根據你的環境（測試框架、mock 庫等）調整。

歡迎各 agent 提出改進建議！🚀
