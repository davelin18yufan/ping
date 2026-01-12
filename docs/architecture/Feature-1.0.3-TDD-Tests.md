# Feature 1.0.3: Mobile 基礎設施設定 - TDD 測試規格

## 一、Feature 概述

**目標**：建立 Mobile 前端的核心基礎設施，包括 UI 樣式系統（NativeWind）、狀態管理（TanStack Store）、GraphQL 客戶端（Apollo Client for Expo）、即時通訊（Socket.io Client for Expo）、以及認證系統（Better Auth Expo）。

**技術棧**：
- React Native 0.81 + Expo 54
- NativeWind（Tailwind CSS for React Native）
- TanStack Store（狀態管理，與 Web 共享邏輯）
- Apollo Client（GraphQL 客戶端，Expo 適配）
- Socket.io Client（即時通訊，Expo 適配）
- Better Auth Expo（認證，支援 Deep Linking）

**測試目標**：
- 確保 NativeWind 正確渲染 Tailwind classes
- 驗證 TanStack Store 在 React Native 環境下正常運作
- 確保 Apollo Client 和 Socket.io Client 在 Expo 環境正常連線
- 驗證 Better Auth Expo 的 OAuth 流程（包含 Deep Linking）
- 達到 >80% 測試覆蓋率

---

## 二、NativeWind 測試案例（3+ 測試）

### 測試檔案位置
- `/mobile/tests/unit/nativewind.spec.tsx`

### 2.1 NativeWind 基礎測試

#### Test 1: Tailwind classes 正確應用到 View
**描述**：驗證 NativeWind 可以正確渲染 Tailwind classes

**測試步驟**：
```typescript
import { View, Text } from 'react-native';
import { render } from '@testing-library/react-native';

test('should apply Tailwind classes to View', () => {
  const { getByTestId } = render(
    <View testID="test-view" className="bg-blue-500 p-4">
      <Text>Test</Text>
    </View>
  );

  const view = getByTestId('test-view');

  // Verify styles are applied (implementation-specific)
  expect(view.props.style).toMatchObject({
    backgroundColor: expect.any(String), // Should be blue
    padding: expect.any(Number), // Should be 16 (p-4)
  });
});
```

**期望結果**：
- View 的 `style` 包含 `backgroundColor` 和 `padding`
- Tailwind classes 成功轉換為 React Native styles

---

#### Test 2: Tailwind classes 正確應用到 Text
**描述**：驗證 NativeWind 可以正確渲染文字樣式

**測試步驟**：
```typescript
test('should apply Tailwind classes to Text', () => {
  const { getByTestId } = render(
    <Text testID="test-text" className="text-lg font-bold text-gray-800">
      Hello World
    </Text>
  );

  const text = getByTestId('test-text');

  expect(text.props.style).toMatchObject({
    fontSize: expect.any(Number), // text-lg
    fontWeight: expect.any(String), // font-bold
    color: expect.any(String), // text-gray-800
  });
});
```

**期望結果**：
- Text 的 `style` 包含 `fontSize`、`fontWeight`、`color`

---

#### Test 3: 複雜的 Tailwind classes（flex, shadow, rounded）
**描述**：驗證 NativeWind 可以處理複雜的 Tailwind classes

**測試步驟**：
```typescript
test('should apply complex Tailwind classes', () => {
  const { getByTestId } = render(
    <View testID="card" className="flex flex-row items-center justify-between bg-white rounded-lg shadow-md p-4">
      <Text>Card Content</Text>
    </View>
  );

  const card = getByTestId('card');

  expect(card.props.style).toMatchObject({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: expect.any(String),
    borderRadius: expect.any(Number),
    padding: expect.any(Number),
    // Shadow properties (platform-specific)
  });
});
```

**期望結果**：
- View 的 `style` 包含所有 flex、layout、shadow、padding 屬性

---

## 三、TanStack Store 測試案例（與 Web 相同邏輯，5+ 測試）

### 測試檔案位置
- `/mobile/tests/unit/stores/chatStore.spec.ts`
- `/mobile/tests/unit/stores/socketStore.spec.ts`

**注意**：這些測試案例與 Web 完全相同（Feature 1.0.2），因為 TanStack Store 的邏輯是共享的。以下僅列出測試標題，詳細內容參考 Feature 1.0.2 測試規格。

### 3.1 chatStore 測試案例（與 Web 相同）

#### Test 1: 建立 chatStore 並初始化狀態
- 驗證初始狀態：`currentConversationId`, `draftMessages`, `isTyping`

#### Test 2: 更新當前對話 ID
- 驗證 `setState` 更新 `currentConversationId`

#### Test 3: 儲存草稿訊息
- 驗證草稿訊息儲存到 `draftMessages`

#### Test 4: 清空草稿訊息
- 驗證清空特定對話的草稿訊息

### 3.2 socketStore 測試案例（與 Web 相同）

#### Test 5: 建立 socketStore 並初始化狀態
- 驗證初始狀態：`isConnected`, `connectionError`

#### Test 6: 更新連線狀態
- 驗證 `setState` 更新 `isConnected`

#### Test 7: 設定連線錯誤
- 驗證連線錯誤訊息儲存

**額外測試（React Native 專用）**：

#### Test 8: Store 在 React Native 環境下正常運作
**描述**：驗證 TanStack Store 在 React Native 環境下可以訂閱狀態變更

**測試步驟**：
```typescript
import { useStore } from '@tanstack/react-store';
import { chatStore } from '@/stores/chatStore';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

test('should subscribe to store changes in React Native', async () => {
  const TestComponent = () => {
    const conversationId = useStore(chatStore, (state) => state.currentConversationId);
    return <Text testID="conversation-id">{conversationId || 'None'}</Text>;
  };

  const { getByTestId } = render(<TestComponent />);

  expect(getByTestId('conversation-id').props.children).toBe('None');

  // Update store
  chatStore.setState((state) => ({ ...state, currentConversationId: 'conv-123' }));

  await waitFor(() => {
    expect(getByTestId('conversation-id').props.children).toBe('conv-123');
  });
});
```

**期望結果**：
- 初始顯示 `'None'`
- 更新後顯示 `'conv-123'`

---

## 四、Apollo Client 測試案例（Expo 環境，5+ 測試）

### 測試檔案位置
- `/mobile/tests/integration/apollo-client.spec.tsx`

### 4.1 Apollo Client 初始化測試（Expo 適配）

#### Test 1: Apollo Client 正確初始化（Expo 環境）
**描述**：驗證 Apollo Client 在 Expo 環境建立時的配置正確

**測試步驟**：
```typescript
import { createApolloClient } from '@/lib/apollo';

test('should create Apollo Client in Expo environment', () => {
  const client = createApolloClient();

  expect(client).toBeDefined();
  expect(client.link).toBeDefined();
  expect(client.cache).toBeDefined();
});
```

**期望結果**：
- Apollo Client 實例建立成功

---

#### Test 2: HTTP Link 配置正確的 endpoint（使用實體裝置 IP）
**描述**：驗證 HTTP Link 在 Expo 環境使用正確的 endpoint（可能是實體裝置 IP）

**測試步驟**：
```typescript
test('should configure HTTP link with correct endpoint for Expo', () => {
  const client = createApolloClient();
  const httpLink = client.link;

  // In Expo, endpoint might be device IP instead of localhost
  expect(httpLink.options.uri).toMatch(/http:\/\/(localhost|192\.168\.\d+\.\d+|10\.0\.\d+\.\d+):3000\/graphql/);
});
```

**期望結果**：
- HTTP Link URI 匹配 Expo 環境的 endpoint（localhost 或實體裝置 IP）

---

#### Test 3: 包含認證憑證（credentials: 'include'）
**描述**：驗證 Apollo Client 在 Expo 環境正確處理認證

**測試步驟**：
```typescript
test('should include credentials in requests (Expo)', () => {
  const client = createApolloClient();
  const httpLink = client.link;

  expect(httpLink.options.credentials).toBe('include');
});
```

**期望結果**：
- `credentials` 設定為 `'include'`

---

### 4.2 GraphQL Query 測試（與 Web 類似）

#### Test 4: 執行簡單 Query（Mock Backend）
**描述**：驗證 Apollo Client 可以執行 GraphQL Query

**測試步驟**：
```typescript
import { useQuery } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
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

test('should execute GraphQL query in React Native', async () => {
  const TestComponent = () => {
    const { data, loading } = useQuery(ME_QUERY);
    if (loading) return <Text>Loading...</Text>;
    return <Text testID="user-name">{data.me.displayName}</Text>;
  };

  const { getByTestId } = render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <TestComponent />
    </MockedProvider>
  );

  await waitFor(() => {
    expect(getByTestId('user-name').props.children).toBe('Test User');
  });
});
```

**期望結果**：
- 顯示 `'Test User'`

---

#### Test 5: 處理 GraphQL Error（React Native）
**描述**：驗證 Apollo Client 在 React Native 環境正確處理錯誤

**測試步驟**：
```typescript
const errorMocks = [
  {
    request: { query: ME_QUERY },
    error: new Error('Unauthorized'),
  },
];

test('should handle GraphQL error in React Native', async () => {
  const TestComponent = () => {
    const { error } = useQuery(ME_QUERY);
    if (error) return <Text testID="error-message">Error: {error.message}</Text>;
    return <Text>Success</Text>;
  };

  const { getByTestId } = render(
    <MockedProvider mocks={errorMocks} addTypename={false}>
      <TestComponent />
    </MockedProvider>
  );

  await waitFor(() => {
    expect(getByTestId('error-message').props.children).toContain('Unauthorized');
  });
});
```

**期望結果**：
- 顯示 `'Error: Unauthorized'`

---

## 五、Socket.io Client 測試案例（Expo 環境，5+ 測試）

### 測試檔案位置
- `/mobile/tests/integration/socket-client.spec.ts`

### 5.1 Socket.io Client 初始化測試（Expo 適配）

#### Test 1: Socket.io Client 正確建立（Expo 環境）
**描述**：驗證 Socket.io Client 在 Expo 環境建立成功

**測試步驟**：
```typescript
import { createSocketClient } from '@/lib/socket';

test('should create Socket.io client in Expo environment', () => {
  const socket = createSocketClient();

  expect(socket).toBeDefined();
  // In Expo, URI might be device IP
  expect(socket.io.uri).toMatch(/http:\/\/(localhost|192\.168\.\d+\.\d+|10\.0\.\d+\.\d+):3000/);
});
```

**期望結果**：
- Socket client 實例建立成功
- URI 匹配 Expo 環境的 endpoint

---

#### Test 2: 包含認證 token（auth handshake）
**描述**：驗證 Socket.io Client 在 Expo 環境發送認證資訊

**測試步驟**：
```typescript
test('should include auth in handshake (Expo)', () => {
  const socket = createSocketClient();

  expect(socket.auth).toBeDefined();
  // Verify auth contains session token (implementation-specific)
});
```

**期望結果**：
- `socket.auth` 已定義

---

### 5.2 Socket.io 連線測試（與 Web 類似）

#### Test 3: 成功連線到 Socket server
**描述**：驗證 Socket.io Client 可以連線到 Backend

**期望結果**：
- `clientSocket.connected` 為 `true`

#### Test 4: 處理連線失敗
**描述**：驗證 Socket.io Client 正確處理連線錯誤

**期望結果**：
- 觸發 `connect_error` 事件

### 5.3 Socket.io 事件測試

#### Test 5: 接收伺服器事件
**描述**：驗證 Socket.io Client 可以接收伺服器發送的事件

**期望結果**：
- 接收到事件並正確處理

#### Test 6: 發送事件到伺服器
**描述**：驗證 Socket.io Client 可以發送事件到伺服器

**期望結果**：
- 伺服器接收到事件

**注意**：這些測試案例與 Feature 1.0.2（Web）基本相同，只需確保在 React Native 環境下正常運作。

---

## 六、Better Auth Expo 測試案例（包含 Deep Linking，6+ 測試）

### 測試檔案位置
- `/mobile/tests/e2e/better-auth.e2e.ts`（使用 Detox）
- `/mobile/tests/integration/better-auth.spec.tsx`

### 6.1 Better Auth Client 初始化測試

#### Test 1: Better Auth Expo Client 正確建立
**描述**：驗證 Better Auth Expo Client 建立時的配置正確

**測試步驟**：
```typescript
import { createAuthClient } from '@/lib/auth';

test('should create Better Auth Expo client', () => {
  const authClient = createAuthClient();

  expect(authClient).toBeDefined();
  expect(authClient.baseURL).toMatch(/http:\/\/(localhost|192\.168\.\d+\.\d+|10\.0\.\d+\.\d+):3000/);
});
```

**期望結果**：
- Better Auth Expo Client 實例建立成功
- `baseURL` 匹配 Expo 環境

---

### 6.2 Session 管理測試

#### Test 2: useSession hook 正確讀取 session（Expo Secure Store）
**描述**：驗證 `useSession` hook 可以從 Expo Secure Store 讀取 session

**測試步驟**：
```typescript
import { useSession } from '@better-auth/expo';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider } from '@/lib/auth';
import * as SecureStore from 'expo-secure-store';

test('should read user session from Expo Secure Store', async () => {
  // Mock SecureStore
  SecureStore.getItemAsync = jest.fn(() =>
    Promise.resolve(JSON.stringify({ user: { id: '1', email: 'test@example.com' } }))
  );

  const TestComponent = () => {
    const { data: session, isPending } = useSession();

    if (isPending) return <Text>Loading...</Text>;
    if (session) return <Text testID="user-email">{session.user.email}</Text>;
    return <Text>Not logged in</Text>;
  };

  const { getByTestId } = render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );

  await waitFor(() => {
    expect(getByTestId('user-email').props.children).toBe('test@example.com');
  });
});
```

**期望結果**：
- 顯示 `'test@example.com'`
- Session 從 Expo Secure Store 正確讀取

---

#### Test 3: useSession hook 處理未登入狀態
**描述**：驗證 `useSession` hook 在未登入時的行為

**測試步驟**：
```typescript
test('should handle not logged in state (Expo)', async () => {
  SecureStore.getItemAsync = jest.fn(() => Promise.resolve(null));

  const TestComponent = () => {
    const { data: session, isPending } = useSession();

    if (isPending) return <Text>Loading...</Text>;
    if (session) return <Text>Logged in</Text>;
    return <Text testID="status">Not logged in</Text>;
  };

  const { getByTestId } = render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );

  await waitFor(() => {
    expect(getByTestId('status').props.children).toBe('Not logged in');
  });
});
```

**期望結果**：
- 顯示 `'Not logged in'`

---

### 6.3 OAuth Deep Linking 測試（E2E with Detox）

#### Test 4: OAuth 按鈕點擊打開瀏覽器
**描述**：驗證點擊 OAuth 按鈕會打開外部瀏覽器

**測試步驟（Detox）**：
```typescript
describe('OAuth Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should open browser on OAuth button click', async () => {
    await element(by.id('google-oauth-button')).tap();

    // Verify browser opens (platform-specific)
    // On iOS: Safari, On Android: Chrome
  });
});
```

**期望結果**：
- 點擊按鈕後，外部瀏覽器打開
- URL 包含 OAuth provider 網址

---

#### Test 5: 處理 OAuth Deep Link callback
**描述**：驗證應用可以處理 OAuth Deep Link callback

**測試步驟（Detox）**：
```typescript
it('should handle OAuth deep link callback', async () => {
  // Simulate deep link callback
  await device.openURL({
    url: 'pingapp://auth/callback?code=oauth-code-123&state=state-abc',
  });

  // Wait for session to be stored
  await waitFor(element(by.id('home-screen')))
    .toBeVisible()
    .withTimeout(5000);

  // Verify user is logged in
  await expect(element(by.id('user-profile'))).toBeVisible();
});
```

**期望結果**：
- Deep Link 正確處理
- 應用導向到主畫面（Home Screen）
- 使用者 session 已儲存

---

#### Test 6: 處理 OAuth 錯誤（error query param）
**描述**：驗證應用可以處理 OAuth 錯誤 callback

**測試步驟（Detox）**：
```typescript
it('should handle OAuth error callback', async () => {
  // Simulate OAuth error deep link
  await device.openURL({
    url: 'pingapp://auth/callback?error=access_denied&error_description=User+cancelled',
  });

  // Wait for error message to appear
  await waitFor(element(by.id('error-message')))
    .toBeVisible()
    .withTimeout(3000);

  // Verify error message is displayed
  await expect(element(by.text('User cancelled'))).toBeVisible();
});
```

**期望結果**：
- 顯示錯誤訊息 `'User cancelled'`
- 應用保持在登入畫面

---

### 6.4 Deep Link 配置測試

#### Test 7: Deep Link scheme 正確配置（app.config.ts）
**描述**：驗證 `app.config.ts` 中 Deep Link scheme 配置正確

**測試步驟**：
```typescript
import appConfig from '../app.config';

test('should configure deep link scheme correctly', () => {
  expect(appConfig.expo.scheme).toBe('pingapp');
  expect(appConfig.expo.android?.intentFilters).toBeDefined();
  expect(appConfig.expo.ios?.associatedDomains).toBeDefined();
});
```

**期望結果**：
- `scheme` 為 `'pingapp'`
- Android 和 iOS 的 Deep Link 配置都已定義

---

## 七、測試環境設定要求

### 7.1 測試框架
- **單元測試**：Jest + React Native Testing Library
- **E2E 測試**：Detox（iOS 和 Android）
- **Mock 工具**：
  - `@apollo/client/testing`（Apollo）
  - `expo-secure-store`（Mock）
  - `react-native-testing-library`（React Native 元件）

### 7.2 環境變數
建立 `/mobile/.env.test`：
```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:3000/graphql
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
```

**注意**：在實體裝置測試時，需將 `localhost` 改為電腦的區域網路 IP（如 `192.168.1.100`）。

### 7.3 測試指令
```bash
cd mobile

# 單元測試
pnpm test                    # 執行所有測試
pnpm test:watch              # Watch mode
pnpm test:coverage           # 測試覆蓋率報告

# E2E 測試（Detox）
pnpm run test:e2e:ios        # iOS E2E 測試
pnpm run test:e2e:android    # Android E2E 測試
```

### 7.4 Detox 設定
建立 `/mobile/.detoxrc.js`：
```javascript
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'tests/e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Ping.app',
      build: 'xcodebuild -workspace ios/Ping.xcworkspace -scheme Ping -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [3000],
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
```

---

## 八、期望的錯誤處理

### 8.1 Apollo Client 錯誤處理（與 Web 相同）
- **401 Unauthorized**：清除 Secure Store session，導向登入畫面
- **403 Forbidden**：顯示無權限訊息
- **500 Internal Server Error**：顯示通用錯誤訊息
- **Network Error**：顯示網路連線錯誤（Toast 或 Alert）

### 8.2 Socket.io Client 錯誤處理（與 Web 相同）
- **connect_error**：更新 `socketStore.connectionError`，嘗試重連
- **disconnect**：更新 `socketStore.isConnected = false`
- **reconnect_failed**：顯示錯誤通知（Toast），停止重連

### 8.3 Better Auth Expo 錯誤處理
- **Session expired**：清除 Secure Store，導向登入畫面
- **OAuth error**：解析 Deep Link 的 `error` query param，顯示錯誤訊息
- **Deep Link parse error**：記錄錯誤，顯示通用訊息
- **Network error**：顯示網路連線錯誤（Alert）

### 8.4 NativeWind 錯誤處理
- **Invalid Tailwind class**：開發時顯示警告（僅 DEV 環境）
- **Missing tailwind.config.js**：應用啟動失敗，顯示錯誤訊息

---

## 九、測試覆蓋率目標

- **整體覆蓋率**：>80%
- **關鍵路徑**：100%（Apollo Client 初始化、Socket.io 連線、Better Auth session、Deep Linking）
- **錯誤處理**：100%（所有 error handlers 都需測試）
- **E2E 關鍵流程**：100%（OAuth Deep Link callback）

---

## 十、完成標準

- ✅ 所有 25+ 測試案例通過（單元測試 + E2E 測試）
- ✅ 測試覆蓋率 >80%
- ✅ NativeWind 正確渲染 Tailwind classes
- ✅ TanStack Store 在 React Native 環境正常運作
- ✅ Apollo Client 可以執行 GraphQL Query（Expo 環境）
- ✅ Socket.io Client 可以連線並收發事件（Expo 環境）
- ✅ Better Auth Expo 可以讀取 session（Expo Secure Store）
- ✅ OAuth Deep Link callback 正確處理（E2E 測試通過）

---

## 十一、與 Web 前端的共享策略

### 11.1 完全共享（邏輯層）
以下部分 Mobile 與 Web 完全共享：
- **TanStack Store**：`chatStore.ts`、`socketStore.ts`（狀態邏輯）
- **GraphQL Operations**：`/shared/graphql/queries/`, `/shared/graphql/mutations/`
- **TypeScript Types**：`/shared/types/`
- **Utility Functions**：`/shared/utils/`（日期格式化、驗證）

### 11.2 平台專用（UI 層）
以下部分 Mobile 與 Web 分開實作：
- **UI Components**：Web 用 React DOM，Mobile 用 React Native
- **Apollo Client 初始化**：Web 用 `window.location`，Mobile 用 Expo 環境變數
- **Socket.io Client 初始化**：Web 用 `localhost`，Mobile 用實體裝置 IP
- **Better Auth Client**：Web 用 `@better-auth/react`，Mobile 用 `@better-auth/expo`

### 11.3 未來抽取計畫
當 Mobile 和 Web 的 Store 邏輯穩定後，建議抽取到 `/shared/stores/`：
```bash
# 目前結構
/frontend/src/stores/chatStore.ts
/mobile/src/stores/chatStore.ts

# 未來結構（抽取後）
/shared/stores/chatStore.ts
/frontend/src/stores/index.ts  # Re-export from shared
/mobile/src/stores/index.ts    # Re-export from shared
```

---

**文件版本**：v1.0
**建立日期**：2026-01-11
**負責人**：Architect Agent
**下一步**：Full-Stack Frontend Agent 實作並通過所有測試（GREEN Phase）
**特別注意**：E2E 測試需要實體裝置或模擬器，確保 Detox 環境正確配置
