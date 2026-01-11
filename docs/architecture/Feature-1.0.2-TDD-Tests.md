# Feature 1.0.2: Frontend (Web) 基礎設施設定 - TDD 測試規格

## 一、Feature 概述

**目標**：建立 Web 前端的核心基礎設施，包括狀態管理（TanStack Store）、GraphQL 客戶端（Apollo Client）、即時通訊（Socket.io Client）、以及認證系統（Better Auth Client）。

**技術棧**：
- TanStack Start（React 19 框架）
- TanStack Store（狀態管理）
- Apollo Client（GraphQL 客戶端）
- Socket.io Client（即時通訊）
- Better Auth React（認證）

**測試目標**：
- 確保所有基礎設施正確初始化
- 驗證與 Backend API 的連接
- 確保錯誤處理機制正常運作
- 達到 >80% 測試覆蓋率

---

## 二、TanStack Store 測試案例（5+ 測試）

### 測試檔案位置
- `/frontend/tests/unit/stores/chatStore.spec.ts`
- `/frontend/tests/unit/stores/socketStore.spec.ts`

### 2.1 chatStore 測試案例

#### Test 1: 建立 chatStore 並初始化狀態
**描述**：驗證 chatStore 建立時的初始狀態正確

**測試步驟**：
```typescript
import { chatStore } from '@/stores/chatStore';

test('chatStore should initialize with default values', () => {
  const state = chatStore.state;

  expect(state.currentConversationId).toBeNull();
  expect(state.draftMessages).toEqual({});
  expect(state.isTyping).toEqual({});
});
```

**期望結果**：
- `currentConversationId` 為 `null`
- `draftMessages` 為空物件 `{}`
- `isTyping` 為空物件 `{}`

---

#### Test 2: 更新當前對話 ID
**描述**：驗證設定當前對話 ID 的功能

**測試步驟**：
```typescript
test('should update current conversation ID', () => {
  const conversationId = 'conv-123';

  chatStore.setState((state) => ({
    ...state,
    currentConversationId: conversationId,
  }));

  expect(chatStore.state.currentConversationId).toBe(conversationId);
});
```

**期望結果**：
- `currentConversationId` 更新為 `'conv-123'`

---

#### Test 3: 儲存草稿訊息
**描述**：驗證草稿訊息的儲存與讀取

**測試步驟**：
```typescript
test('should store draft message for conversation', () => {
  const conversationId = 'conv-123';
  const draftMessage = 'Hello, this is a draft';

  chatStore.setState((state) => ({
    ...state,
    draftMessages: {
      ...state.draftMessages,
      [conversationId]: draftMessage,
    },
  }));

  expect(chatStore.state.draftMessages[conversationId]).toBe(draftMessage);
});
```

**期望結果**：
- `draftMessages['conv-123']` 為 `'Hello, this is a draft'`

---

#### Test 4: 清空草稿訊息
**描述**：驗證清空特定對話的草稿訊息

**測試步驟**：
```typescript
test('should clear draft message for conversation', () => {
  const conversationId = 'conv-123';

  // First, set a draft
  chatStore.setState((state) => ({
    ...state,
    draftMessages: { [conversationId]: 'Draft message' },
  }));

  // Then, clear it
  chatStore.setState((state) => {
    const { [conversationId]: _, ...rest } = state.draftMessages;
    return { ...state, draftMessages: rest };
  });

  expect(chatStore.state.draftMessages[conversationId]).toBeUndefined();
});
```

**期望結果**：
- `draftMessages['conv-123']` 為 `undefined`

---

### 2.2 socketStore 測試案例

#### Test 5: 建立 socketStore 並初始化狀態
**描述**：驗證 socketStore 建立時的初始狀態正確

**測試步驟**：
```typescript
import { socketStore } from '@/stores/socketStore';

test('socketStore should initialize with default values', () => {
  const state = socketStore.state;

  expect(state.isConnected).toBe(false);
  expect(state.connectionError).toBeNull();
});
```

**期望結果**：
- `isConnected` 為 `false`
- `connectionError` 為 `null`

---

#### Test 6: 更新連線狀態
**描述**：驗證 Socket 連線狀態的更新

**測試步驟**：
```typescript
test('should update connection status', () => {
  socketStore.setState((state) => ({
    ...state,
    isConnected: true,
  }));

  expect(socketStore.state.isConnected).toBe(true);
});
```

**期望結果**：
- `isConnected` 更新為 `true`

---

#### Test 7: 設定連線錯誤
**描述**：驗證連線錯誤訊息的儲存

**測試步驟**：
```typescript
test('should store connection error', () => {
  const errorMessage = 'Connection timeout';

  socketStore.setState((state) => ({
    ...state,
    isConnected: false,
    connectionError: errorMessage,
  }));

  expect(socketStore.state.isConnected).toBe(false);
  expect(socketStore.state.connectionError).toBe(errorMessage);
});
```

**期望結果**：
- `isConnected` 為 `false`
- `connectionError` 為 `'Connection timeout'`

---

## 三、Apollo Client 測試案例（5+ 測試）

### 測試檔案位置
- `/frontend/tests/integration/apollo-client.spec.tsx`

### 3.1 Apollo Client 初始化測試

#### Test 1: Apollo Client 正確初始化
**描述**：驗證 Apollo Client 建立時的配置正確

**測試步驟**：
```typescript
import { createApolloClient } from '@/lib/apollo';

test('should create Apollo Client with correct configuration', () => {
  const client = createApolloClient();

  expect(client).toBeDefined();
  expect(client.link).toBeDefined();
  expect(client.cache).toBeDefined();
});
```

**期望結果**：
- Apollo Client 實例建立成功
- `link` 和 `cache` 都已定義

---

#### Test 2: HTTP Link 配置正確的 endpoint
**描述**：驗證 HTTP Link 指向正確的 GraphQL endpoint

**測試步驟**：
```typescript
test('should configure HTTP link with correct endpoint', () => {
  const client = createApolloClient();
  const httpLink = client.link;

  // Inspect link configuration (implementation-specific)
  expect(httpLink.options.uri).toBe('http://localhost:3000/graphql');
});
```

**期望結果**：
- HTTP Link URI 為 `http://localhost:3000/graphql`

---

#### Test 3: 包含認證憑證（credentials: 'include'）
**描述**：驗證 Apollo Client 發送請求時包含 cookies（Better Auth session）

**測試步驟**：
```typescript
test('should include credentials in requests', () => {
  const client = createApolloClient();
  const httpLink = client.link;

  expect(httpLink.options.credentials).toBe('include');
});
```

**期望結果**：
- `credentials` 設定為 `'include'`

---

### 3.2 GraphQL Query 測試

#### Test 4: 執行簡單 Query（Mock Backend）
**描述**：驗證 Apollo Client 可以執行 GraphQL Query

**測試步驟**：
```typescript
import { ApolloProvider } from '@apollo/client';
import { render, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { ME_QUERY } from '@/graphql/queries/user';

const mocks = [
  {
    request: { query: ME_QUERY },
    result: {
      data: {
        me: { id: '1', email: 'test@example.com', displayName: 'Test User' },
      },
    },
  },
];

test('should execute GraphQL query successfully', async () => {
  const TestComponent = () => {
    const { data, loading } = useQuery(ME_QUERY);
    if (loading) return <div>Loading...</div>;
    return <div>{data.me.displayName}</div>;
  };

  const { getByText } = render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <TestComponent />
    </MockedProvider>
  );

  await waitFor(() => {
    expect(getByText('Test User')).toBeInTheDocument();
  });
});
```

**期望結果**：
- Query 成功執行
- 顯示 `'Test User'`

---

#### Test 5: 處理 GraphQL Error
**描述**：驗證 Apollo Client 正確處理 GraphQL 錯誤

**測試步驟**：
```typescript
const errorMocks = [
  {
    request: { query: ME_QUERY },
    error: new Error('Unauthorized'),
  },
];

test('should handle GraphQL error', async () => {
  const TestComponent = () => {
    const { error } = useQuery(ME_QUERY);
    if (error) return <div>Error: {error.message}</div>;
    return <div>Success</div>;
  };

  const { getByText } = render(
    <MockedProvider mocks={errorMocks} addTypename={false}>
      <TestComponent />
    </MockedProvider>
  );

  await waitFor(() => {
    expect(getByText(/Unauthorized/i)).toBeInTheDocument();
  });
});
```

**期望結果**：
- 顯示錯誤訊息 `'Error: Unauthorized'`

---

#### Test 6: InMemoryCache 正確儲存資料
**描述**：驗證 Apollo Client Cache 正確儲存查詢結果

**測試步驟**：
```typescript
test('should cache query results', async () => {
  const client = createApolloClient();

  await client.query({
    query: ME_QUERY,
  });

  const cachedData = client.readQuery({ query: ME_QUERY });
  expect(cachedData).toBeDefined();
});
```

**期望結果**：
- Cache 中有查詢結果

---

## 四、Socket.io Client 測試案例（5+ 測試）

### 測試檔案位置
- `/frontend/tests/integration/socket-client.spec.ts`

### 4.1 Socket.io Client 初始化測試

#### Test 1: Socket.io Client 正確建立
**描述**：驗證 Socket.io Client 建立時的配置正確

**測試步驟**：
```typescript
import { createSocketClient } from '@/lib/socket';

test('should create Socket.io client with correct configuration', () => {
  const socket = createSocketClient();

  expect(socket).toBeDefined();
  expect(socket.io.uri).toBe('http://localhost:3000');
});
```

**期望結果**：
- Socket client 實例建立成功
- URI 為 `http://localhost:3000`

---

#### Test 2: 包含認證 token（auth handshake）
**描述**：驗證 Socket.io Client 在連線時發送認證資訊

**測試步驟**：
```typescript
test('should include auth in handshake', () => {
  const socket = createSocketClient();

  // Mock session token
  const mockToken = 'session-token-123';

  expect(socket.auth).toBeDefined();
  // Verify auth is sent in handshake (implementation-specific)
});
```

**期望結果**：
- `socket.auth` 已定義
- Handshake 包含認證資訊

---

### 4.2 Socket.io 連線測試

#### Test 3: 成功連線到 Socket server
**描述**：驗證 Socket.io Client 可以連線到 Backend

**測試步驟**：
```typescript
import { io } from 'socket.io-client';
import { Server } from 'socket.io';

test('should connect to Socket.io server', (done) => {
  // Mock server
  const httpServer = createServer();
  const ioServer = new Server(httpServer);

  httpServer.listen(() => {
    const port = httpServer.address().port;
    const clientSocket = io(`http://localhost:${port}`);

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      clientSocket.close();
      ioServer.close();
      done();
    });
  });
});
```

**期望結果**：
- `clientSocket.connected` 為 `true`

---

#### Test 4: 處理連線失敗
**描述**：驗證 Socket.io Client 正確處理連線錯誤

**測試步驟**：
```typescript
test('should handle connection error', (done) => {
  const socket = io('http://localhost:9999', {
    timeout: 1000,
    reconnection: false,
  });

  socket.on('connect_error', (error) => {
    expect(error).toBeDefined();
    socket.close();
    done();
  });
});
```

**期望結果**：
- 觸發 `connect_error` 事件
- `error` 已定義

---

### 4.3 Socket.io 事件測試

#### Test 5: 接收伺服器事件
**描述**：驗證 Socket.io Client 可以接收伺服器發送的事件

**測試步驟**：
```typescript
test('should receive server events', (done) => {
  const httpServer = createServer();
  const ioServer = new Server(httpServer);

  httpServer.listen(() => {
    const port = httpServer.address().port;
    const clientSocket = io(`http://localhost:${port}`);

    ioServer.on('connection', (socket) => {
      socket.emit('test_event', { message: 'Hello from server' });
    });

    clientSocket.on('test_event', (data) => {
      expect(data.message).toBe('Hello from server');
      clientSocket.close();
      ioServer.close();
      done();
    });
  });
});
```

**期望結果**：
- 接收到 `test_event` 事件
- `data.message` 為 `'Hello from server'`

---

#### Test 6: 發送事件到伺服器
**描述**：驗證 Socket.io Client 可以發送事件到伺服器

**測試步驟**：
```typescript
test('should send events to server', (done) => {
  const httpServer = createServer();
  const ioServer = new Server(httpServer);

  httpServer.listen(() => {
    const port = httpServer.address().port;
    const clientSocket = io(`http://localhost:${port}`);

    ioServer.on('connection', (socket) => {
      socket.on('client_event', (data) => {
        expect(data.message).toBe('Hello from client');
        clientSocket.close();
        ioServer.close();
        done();
      });
    });

    clientSocket.on('connect', () => {
      clientSocket.emit('client_event', { message: 'Hello from client' });
    });
  });
});
```

**期望結果**：
- 伺服器接收到 `client_event` 事件
- `data.message` 為 `'Hello from client'`

---

## 五、Better Auth Client 測試案例（4+ 測試）

### 測試檔案位置
- `/frontend/tests/integration/better-auth.spec.tsx`

### 5.1 Better Auth Client 初始化測試

#### Test 1: Better Auth Client 正確建立
**描述**：驗證 Better Auth Client 建立時的配置正確

**測試步驟**：
```typescript
import { createAuthClient } from '@/lib/auth';

test('should create Better Auth client with correct configuration', () => {
  const authClient = createAuthClient();

  expect(authClient).toBeDefined();
  expect(authClient.baseURL).toBe('http://localhost:3000');
});
```

**期望結果**：
- Better Auth Client 實例建立成功
- `baseURL` 為 `http://localhost:3000`

---

### 5.2 Better Auth Hooks 測試

#### Test 2: useSession hook 正確讀取 session
**描述**：驗證 `useSession` hook 可以讀取使用者 session

**測試步驟**：
```typescript
import { useSession } from '@better-auth/react';
import { render } from '@testing-library/react';
import { AuthProvider } from '@/lib/auth';

test('should read user session with useSession hook', async () => {
  const TestComponent = () => {
    const { data: session, isPending } = useSession();

    if (isPending) return <div>Loading...</div>;
    if (session) return <div>Logged in: {session.user.email}</div>;
    return <div>Not logged in</div>;
  };

  // Mock session API response
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          user: { id: '1', email: 'test@example.com' },
          session: { token: 'session-token' },
        }),
    })
  );

  const { getByText } = render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );

  await waitFor(() => {
    expect(getByText(/Logged in: test@example.com/i)).toBeInTheDocument();
  });
});
```

**期望結果**：
- 顯示 `'Logged in: test@example.com'`

---

#### Test 3: useSession hook 處理未登入狀態
**描述**：驗證 `useSession` hook 在未登入時的行為

**測試步驟**：
```typescript
test('should handle not logged in state', async () => {
  const TestComponent = () => {
    const { data: session, isPending } = useSession();

    if (isPending) return <div>Loading...</div>;
    if (session) return <div>Logged in</div>;
    return <div>Not logged in</div>;
  };

  // Mock no session
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ user: null, session: null }),
    })
  );

  const { getByText } = render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );

  await waitFor(() => {
    expect(getByText('Not logged in')).toBeInTheDocument();
  });
});
```

**期望結果**：
- 顯示 `'Not logged in'`

---

### 5.3 OAuth 流程測試（前端部分）

#### Test 4: OAuth 按鈕點擊觸發導向
**描述**：驗證點擊 OAuth 按鈕會導向 OAuth provider

**測試步驟**：
```typescript
import { signIn } from '@better-auth/react/client';

test('should redirect to OAuth provider on button click', async () => {
  const { getByRole } = render(
    <button onClick={() => signIn.social({ provider: 'google' })}>
      Login with Google
    </button>
  );

  const button = getByRole('button', { name: /Login with Google/i });

  // Mock window.location.href
  delete window.location;
  window.location = { href: '' };

  fireEvent.click(button);

  await waitFor(() => {
    expect(window.location.href).toContain('google.com');
  });
});
```

**期望結果**：
- `window.location.href` 包含 `'google.com'`（OAuth 導向）

---

#### Test 5: OAuth callback 處理
**描述**：驗證 OAuth callback 正確處理並儲存 session

**測試步驟**：
```typescript
test('should handle OAuth callback and store session', async () => {
  // Mock URL with OAuth callback params
  window.history.pushState({}, '', '?code=oauth-code-123&state=state-abc');

  // Mock fetch to return session
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          user: { id: '1', email: 'oauth@example.com' },
          session: { token: 'oauth-session-token' },
        }),
    })
  );

  const TestComponent = () => {
    const { data: session } = useSession();
    if (session) return <div>OAuth Success: {session.user.email}</div>;
    return <div>Processing...</div>;
  };

  const { getByText } = render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );

  await waitFor(() => {
    expect(getByText(/OAuth Success: oauth@example.com/i)).toBeInTheDocument();
  });
});
```

**期望結果**：
- 顯示 `'OAuth Success: oauth@example.com'`

---

## 六、測試環境設定要求

### 6.1 測試框架
- **單元測試**：Vitest
- **React 測試**：React Testing Library
- **Mock 工具**：`@apollo/client/testing`（Apollo）、`socket.io-client`（Socket.io mock server）

### 6.2 環境變數
建立 `/frontend/.env.test`：
```bash
VITE_API_URL=http://localhost:3000
VITE_GRAPHQL_ENDPOINT=http://localhost:3000/graphql
VITE_SOCKET_URL=http://localhost:3000
```

### 6.3 測試指令
```bash
cd frontend
pnpm test                    # 執行所有測試
pnpm test:watch              # Watch mode
pnpm test:coverage           # 測試覆蓋率報告
```

---

## 七、期望的錯誤處理

### 7.1 Apollo Client 錯誤處理
- **401 Unauthorized**：清除 session，導向登入頁
- **403 Forbidden**：顯示無權限訊息
- **500 Internal Server Error**：顯示通用錯誤訊息
- **Network Error**：顯示網路連線錯誤

### 7.2 Socket.io Client 錯誤處理
- **connect_error**：更新 `socketStore.connectionError`，嘗試重連
- **disconnect**：更新 `socketStore.isConnected = false`
- **reconnect_failed**：顯示錯誤通知，停止重連

### 7.3 Better Auth 錯誤處理
- **Session expired**：清除 session，導向登入頁
- **OAuth error**：顯示 OAuth 錯誤訊息（如 `error` query param）
- **Network error**：顯示網路連線錯誤

---

## 八、測試覆蓋率目標

- **整體覆蓋率**：>80%
- **關鍵路徑**：100%（Apollo Client 初始化、Socket.io 連線、Better Auth session）
- **錯誤處理**：100%（所有 error handlers 都需測試）

---

## 九、完成標準

- ✅ 所有 19+ 測試案例通過
- ✅ 測試覆蓋率 >80%
- ✅ TanStack Store 正確管理狀態
- ✅ Apollo Client 可以執行 GraphQL Query
- ✅ Socket.io Client 可以連線並收發事件
- ✅ Better Auth 可以讀取 session

---

**文件版本**：v1.0
**建立日期**：2026-01-11
**負責人**：Architect Agent
**下一步**：Full-Stack Frontend Agent 實作並通過所有測試（GREEN Phase）
