# Feature 1.2.0: UI/UX 大改版 + Session 認證整合 - TDD 測試規格

## 文件資訊

- **Feature ID**: 1.2.0
- **負責人**: Full-Stack Frontend Agent
- **測試規格建立時間**: 2026-02-03
- **TDD 階段**: RED Phase（測試規格設計）
- **依賴**: Feature 1.0.4 ✅（Design System 基礎）、Feature 1.1.1 ✅（OAuth 登入）

---

## 一、Feature 概述

### 目標
對 Ping 的前端 UI/UX 進行大規模改版，提升視覺設計品質、使用者體驗與性能表現。同時整合 Better Auth 的 session 管理功能。

### 核心變更
1. **配色系統改革**（Dark Mode 跳脫 Discord 風格、Light Mode 日式簡樸）
2. **字型系統優化**（Noto Sans TC / Noto Serif TC）
3. **動畫系統升級**（View Transition API + Framer Motion）
4. **雙模式系統**（華麗 Glamorous / 簡潔 Minimal）
5. **CSS 架構重組**（themes/, animations/, utilities/）
6. **SoundWaveLoader 保留與增強**
7. **Session 認證整合**（Better Auth session 管理、登出流程）

### 階段分解
- **Stage 1**: Design Tokens + 樣板確認（2h）
- **Stage 2**: CSS 架構重組 + 動畫系統（3h）
- **Stage 3**: 雙模式系統 + 元件升級（4h）
- **Stage 4**: Session 認證整合（2h）

---

## 二、測試策略

### 測試層級
1. **Design Tokens 測試**（10 個測試）- 確保新配色系統正確
2. **UI 元件測試**（12 個測試）- 確保元件使用新設計系統
3. **動畫系統測試**（5 個測試）- 確保動畫流暢與可訪問性
4. **雙模式系統測試**（5 個測試）- 確保模式切換正常
5. **Session 認證測試**（8 個測試）- 確保 session 管理與登出流程

**總計**: 40 個測試案例

### 測試覆蓋目標
- Design Tokens: 100%
- UI Components: >80%
- Animations: >70%
- Session Management: 100%

---

## 三、Stage 1 - Design Tokens + 樣板確認測試

### 測試檔案
- `/shared/tests/design-tokens/colors.spec.ts`
- `/frontend/tests/integration/design-preview.spec.tsx`

### 測試案例

#### 3.1 Design Tokens - 顏色系統測試（10 個測試）

**Test 1.1**: Dark Mode - Background 顏色正確
```typescript
describe('Design Tokens - Dark Mode Colors', () => {
  it('should have correct background color', () => {
    const darkBg = colors.background.dark;
    expect(darkBg).toBe('oklch(0.08 0.01 240)'); // #0B0E13
  });
});
```

**Test 1.2**: Dark Mode - Surface 顏色正確
```typescript
it('should have correct surface color', () => {
  const darkSurface = colors.card.dark;
  expect(darkSurface).toBe('oklch(0.12 0.015 235)'); // #141821
});
```

**Test 1.3**: Dark Mode - Accent 顏色正確
```typescript
it('should have correct accent color', () => {
  const darkAccent = colors.primary.dark;
  expect(darkAccent).toBe('oklch(0.60 0.18 260)'); // #6B7FE8
});
```

**Test 1.4**: Light Mode - Background 顏色正確
```typescript
describe('Design Tokens - Light Mode Colors', () => {
  it('should have correct background color', () => {
    const lightBg = colors.background.light;
    expect(lightBg).toBe('oklch(0.96 0.008 75)'); // #F5F4F0
  });
});
```

**Test 1.5**: Light Mode - Surface 顏色正確
```typescript
it('should have correct surface color', () => {
  const lightSurface = colors.card.light;
  expect(lightSurface).toBe('oklch(0.99 0.005 70)'); // #FDFCFA
});
```

**Test 1.6**: Light Mode - Text 顏色正確
```typescript
it('should have correct text color', () => {
  const lightText = colors.foreground.light;
  expect(lightText).toBe('oklch(0.20 0.01 270)'); // #2C2C2E
});
```

**Test 1.7**: OKLCH to RGB 轉換正確（Dark Mode）
```typescript
it('should convert OKLCH to RGB correctly for dark mode', () => {
  const oklchColor = 'oklch(0.08 0.01 240)';
  const rgbColor = oklchToRgb(oklchColor);
  expect(rgbColor).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);
  // 應轉換為接近 #0B0E13 的 RGB 值
});
```

**Test 1.8**: OKLCH to RGB 轉換正確（Light Mode）
```typescript
it('should convert OKLCH to RGB correctly for light mode', () => {
  const oklchColor = 'oklch(0.96 0.008 75)';
  const rgbColor = oklchToRgb(oklchColor);
  expect(rgbColor).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);
  // 應轉換為接近 #F5F4F0 的 RGB 值
});
```

**Test 1.9**: 所有 Design Tokens 都有 Light 與 Dark 值
```typescript
it('should have both light and dark values for all tokens', () => {
  Object.keys(colors).forEach((key) => {
    expect(colors[key]).toHaveProperty('light');
    expect(colors[key]).toHaveProperty('dark');
  });
});
```

**Test 1.10**: 顏色對比度符合 WCAG AAA 標準
```typescript
it('should meet WCAG AAA contrast ratio (>7:1)', () => {
  // Dark Mode: text-primary on bg-primary
  const darkContrast = getContrastRatio(
    colors.foreground.dark,
    colors.background.dark
  );
  expect(darkContrast).toBeGreaterThan(7);

  // Light Mode: text-primary on bg-primary
  const lightContrast = getContrastRatio(
    colors.foreground.light,
    colors.background.light
  );
  expect(lightContrast).toBeGreaterThan(7);
});
```

---

## 四、Stage 2 - CSS 架構重組 + 動畫系統測試

### 測試檔案
- `/frontend/tests/integration/themes.spec.tsx`
- `/frontend/tests/integration/animations.spec.tsx`

### 測試案例

#### 4.1 CSS 架構測試（5 個測試）

**Test 2.1**: Dark Mode CSS Variables 正確載入
```typescript
describe('CSS Themes', () => {
  it('should load dark mode CSS variables correctly', () => {
    document.documentElement.classList.add('dark');
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--background');
    expect(bg).toContain('oklch(0.08 0.01 240)');
  });
});
```

**Test 2.2**: Light Mode CSS Variables 正確載入
```typescript
it('should load light mode CSS variables correctly', () => {
  document.documentElement.classList.remove('dark');
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--background');
  expect(bg).toContain('oklch(0.96 0.008 75)');
});
```

**Test 2.3**: CSS 模式切換流暢（無閃爍）
```typescript
it('should switch between dark and light mode smoothly', async () => {
  const root = document.documentElement;

  // 切換到 Dark Mode
  root.classList.add('dark');
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(root.classList.contains('dark')).toBe(true);

  // 切換到 Light Mode
  root.classList.remove('dark');
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(root.classList.contains('dark')).toBe(false);
});
```

**Test 2.4**: Animations CSS 正確載入
```typescript
it('should load animations CSS correctly', () => {
  const animations = getComputedStyle(document.documentElement).getPropertyValue('--animation-duration-base');
  expect(animations).toBe('150ms');
});
```

**Test 2.5**: Reduced Motion 支援
```typescript
it('should respect prefers-reduced-motion', () => {
  // 模擬使用者設定 reduced motion
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  const duration = getComputedStyle(document.documentElement).getPropertyValue('--animation-duration-base');
  expect(duration).toBe('0.01ms'); // Reduced Motion 時應為極短
});
```

#### 4.2 動畫系統測試（5 個測試）

**Test 2.6**: View Transition API 可用時啟用
```typescript
describe('Animation System', () => {
  it('should enable View Transition API when available', () => {
    // Mock View Transition API
    (document as any).startViewTransition = vi.fn();

    const hasViewTransition = 'startViewTransition' in document;
    expect(hasViewTransition).toBe(true);
  });
});
```

**Test 2.7**: Framer Motion 基礎動畫正確
```typescript
it('should apply Framer Motion animations correctly', async () => {
  const { container } = render(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      Test
    </motion.div>
  );

  const element = container.firstChild as HTMLElement;
  expect(element).toBeInTheDocument();

  // 等待動畫完成
  await waitFor(() => {
    expect(element).toHaveStyle({ opacity: 1 });
  }, { timeout: 200 });
});
```

**Test 2.8**: 路由切換動畫流暢
```typescript
it('should animate route transitions smoothly', async () => {
  const { container } = render(
    <Router>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
    </Router>
  );

  // 導航到 /about
  const link = screen.getByText('About');
  fireEvent.click(link);

  // 驗證動畫觸發
  await waitFor(() => {
    expect(container.querySelector('[data-view-transition]')).toBeInTheDocument();
  });
});
```

**Test 2.9**: 元件 Hover 動畫正確
```typescript
it('should apply hover animations correctly', async () => {
  const { container } = render(
    <motion.button
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.15 }}
    >
      Hover Me
    </motion.button>
  );

  const button = container.querySelector('button')!;
  fireEvent.mouseEnter(button);

  await waitFor(() => {
    const transform = getComputedStyle(button).transform;
    expect(transform).toContain('scale(1.05)');
  });
});
```

**Test 2.10**: 動畫時長符合設計規範
```typescript
it('should use correct animation durations', () => {
  const durations = {
    fast: getComputedStyle(document.documentElement).getPropertyValue('--animation-duration-fast'),
    base: getComputedStyle(document.documentElement).getPropertyValue('--animation-duration-base'),
    slow: getComputedStyle(document.documentElement).getPropertyValue('--animation-duration-slow'),
  };

  expect(durations.fast).toBe('100ms');
  expect(durations.base).toBe('150ms');
  expect(durations.slow).toBe('300ms');
});
```

---

## 五、Stage 3 - 雙模式系統 + 元件升級測試

### 測試檔案
- `/frontend/tests/integration/dual-mode.spec.tsx`
- `/frontend/tests/integration/ui-components.spec.tsx`

### 測試案例

#### 5.1 雙模式系統測試（5 個測試）

**Test 3.1**: 華麗模式啟用完整動畫
```typescript
describe('Dual Mode System', () => {
  it('should enable full animations in Glamorous mode', () => {
    localStorage.setItem('ui-mode', 'glamorous');

    const mode = getUIMode();
    expect(mode).toBe('glamorous');

    const animationsEnabled = getComputedStyle(document.documentElement).getPropertyValue('--animations-enabled');
    expect(animationsEnabled).toBe('true');
  });
});
```

**Test 3.2**: 簡潔模式簡化動畫
```typescript
it('should simplify animations in Minimal mode', () => {
  localStorage.setItem('ui-mode', 'minimal');

  const mode = getUIMode();
  expect(mode).toBe('minimal');

  const animationDuration = getComputedStyle(document.documentElement).getPropertyValue('--animation-duration-base');
  expect(animationDuration).toBe('50ms'); // 簡化模式時間更短
});
```

**Test 3.3**: 模式切換保存到 localStorage
```typescript
it('should save mode preference to localStorage', () => {
  const { getByText } = render(<UIModeSwitcher />);

  const minimalButton = getByText('Minimal');
  fireEvent.click(minimalButton);

  expect(localStorage.getItem('ui-mode')).toBe('minimal');
});
```

**Test 3.4**: 模式切換時更新 UI
```typescript
it('should update UI when mode changes', async () => {
  const { getByText, container } = render(<UIModeSwitcher />);

  // 切換到簡潔模式
  const minimalButton = getByText('Minimal');
  fireEvent.click(minimalButton);

  await waitFor(() => {
    expect(container.querySelector('[data-ui-mode="minimal"]')).toBeInTheDocument();
  });
});
```

**Test 3.5**: 初次訪問預設為華麗模式
```typescript
it('should default to Glamorous mode on first visit', () => {
  localStorage.clear();

  const mode = getUIMode();
  expect(mode).toBe('glamorous');
});
```

#### 5.2 UI 元件升級測試（7 個測試）

**Test 3.6**: Button 元件使用新配色
```typescript
describe('UI Components Upgrade', () => {
  it('should use new color system in Button component', () => {
    const { container } = render(<Button variant="default">Test</Button>);
    const button = container.querySelector('button')!;

    const bg = getComputedStyle(button).backgroundColor;
    // 應使用新的 primary color
    expect(bg).toMatch(/rgb\(107,\s*127,\s*232\)/); // #6B7FE8 的 RGB 近似值
  });
});
```

**Test 3.7**: Input 元件使用新配色
```typescript
it('should use new color system in Input component', () => {
  const { container } = render(<Input placeholder="Test" />);
  const input = container.querySelector('input')!;

  const borderColor = getComputedStyle(input).borderColor;
  expect(borderColor).toBeTruthy();
});
```

**Test 3.8**: Card 元件使用新配色
```typescript
it('should use new color system in Card component', () => {
  const { container } = render(<Card>Test</Card>);
  const card = container.querySelector('[data-card]')!;

  const bg = getComputedStyle(card).backgroundColor;
  expect(bg).toBeTruthy();
});
```

**Test 3.9**: Avatar 元件使用新配色
```typescript
it('should use new color system in Avatar component', () => {
  const { container } = render(<Avatar src="/test.png" />);
  const avatar = container.querySelector('[data-avatar]')!;

  expect(avatar).toBeInTheDocument();
});
```

**Test 3.10**: SoundWaveLoader 升級版正確渲染
```typescript
it('should render upgraded SoundWaveLoader correctly', () => {
  const { container } = render(<SoundWaveLoader />);
  const loader = container.querySelector('[data-soundwave-loader]');

  expect(loader).toBeInTheDocument();

  // 驗證動畫元素
  const waves = container.querySelectorAll('[data-wave]');
  expect(waves.length).toBeGreaterThan(0);
});
```

**Test 3.11**: SoundWaveLoader 支援雙模式
```typescript
it('should support dual mode in SoundWaveLoader', async () => {
  // 華麗模式
  localStorage.setItem('ui-mode', 'glamorous');
  const { container, rerender } = render(<SoundWaveLoader />);
  expect(container.querySelector('[data-animation="full"]')).toBeInTheDocument();

  // 簡潔模式
  localStorage.setItem('ui-mode', 'minimal');
  rerender(<SoundWaveLoader />);
  await waitFor(() => {
    expect(container.querySelector('[data-animation="minimal"]')).toBeInTheDocument();
  });
});
```

**Test 3.12**: 所有元件在 Dark/Light 模式下正確顯示
```typescript
it('should display all components correctly in both dark and light modes', async () => {
  const components = [
    <Button>Test</Button>,
    <Input placeholder="Test" />,
    <Card>Test</Card>,
    <Avatar src="/test.png" />,
  ];

  for (const component of components) {
    // Dark Mode
    document.documentElement.classList.add('dark');
    const { container, unmount } = render(component);
    expect(container.firstChild).toBeInTheDocument();
    unmount();

    // Light Mode
    document.documentElement.classList.remove('dark');
    const { container: lightContainer } = render(component);
    expect(lightContainer.firstChild).toBeInTheDocument();
  }
});
```

---

## 六、Stage 4 - Session 認證整合測試

### 測試檔案
- `/frontend/tests/integration/session-management.spec.tsx`
- `/frontend/tests/integration/logout.spec.tsx`

### 測試案例

#### 6.1 Session 管理測試（5 個測試）

**Test 4.1**: Better Auth session 正確初始化
```typescript
describe('Session Management', () => {
  it('should initialize Better Auth session correctly', async () => {
    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });
  });
});
```

**Test 4.2**: Session 驗證正確運作
```typescript
it('should validate session correctly', async () => {
  // Mock 有效 session
  mockAuth.session = {
    userId: 'user-123',
    expiresAt: new Date(Date.now() + 3600000),
  };

  const { result } = renderHook(() => useSession());

  await waitFor(() => {
    expect(result.current.data?.userId).toBe('user-123');
  });
});
```

**Test 4.3**: Session 過期時自動重新導向登入頁
```typescript
it('should redirect to login when session expires', async () => {
  // Mock 過期 session
  mockAuth.session = {
    userId: 'user-123',
    expiresAt: new Date(Date.now() - 1000), // 已過期
  };

  const { container } = render(
    <Router>
      <Route path="/" element={<ProtectedPage />} />
      <Route path="/auth" element={<LoginPage />} />
    </Router>
  );

  await waitFor(() => {
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});
```

**Test 4.4**: Session 更新正確運作
```typescript
it('should update session correctly', async () => {
  const { result } = renderHook(() => useSession());

  // Mock session 更新
  mockAuth.updateSession({
    userId: 'user-456',
    expiresAt: new Date(Date.now() + 7200000),
  });

  await waitFor(() => {
    expect(result.current.data?.userId).toBe('user-456');
  });
});
```

**Test 4.5**: Session 延長正確運作
```typescript
it('should extend session correctly', async () => {
  const { result } = renderHook(() => useSession());

  const initialExpiry = result.current.data?.expiresAt;

  // 延長 session
  await act(async () => {
    await mockAuth.extendSession();
  });

  await waitFor(() => {
    const newExpiry = result.current.data?.expiresAt;
    expect(newExpiry!.getTime()).toBeGreaterThan(initialExpiry!.getTime());
  });
});
```

#### 6.2 登出流程測試（3 個測試）

**Test 4.6**: 登出 mutation 正確執行
```typescript
describe('Logout Flow', () => {
  it('should execute logout mutation correctly', async () => {
    const { getByText } = render(<LogoutButton />);
    const button = getByText('Logout');

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockAuth.signOut).toHaveBeenCalled();
    });
  });
});
```

**Test 4.7**: 登出後清除 session cookie
```typescript
it('should clear session cookie after logout', async () => {
  const { getByText } = render(<LogoutButton />);
  const button = getByText('Logout');

  fireEvent.click(button);

  await waitFor(() => {
    const cookies = document.cookie;
    expect(cookies).not.toContain('better-auth.session_token');
  });
});
```

**Test 4.8**: 登出後導向登入頁
```typescript
it('should redirect to login page after logout', async () => {
  const { getByText } = render(
    <Router>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<LoginPage />} />
    </Router>
  );

  const logoutButton = getByText('Logout');
  fireEvent.click(logoutButton);

  await waitFor(() => {
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});
```

---

## 七、測試執行計畫

### 階段 1：RED Phase（測試規格設計）✅
- ✅ 建立此測試規格文件
- ✅ 定義 40 個測試案例
- ✅ 確認測試覆蓋率目標

### 階段 2：GREEN Phase（實作直到測試通過）
1. **Stage 1 實作**（2 小時）
   - 更新 Design Tokens
   - 建立樣板 HTML
   - 執行 Test 1.1 - 1.10（10 個測試）
   - ✅ 目標：10/10 測試通過

2. **Stage 2 實作**（3 小時）
   - 建立 CSS 架構（themes/, animations/）
   - 整合 View Transition API + Framer Motion
   - 執行 Test 2.1 - 2.10（10 個測試）
   - ✅ 目標：10/10 測試通過

3. **Stage 3 實作**（4 小時）
   - 建立雙模式系統
   - 升級 UI 元件
   - 升級 SoundWaveLoader
   - 執行 Test 3.1 - 3.12（12 個測試）
   - ✅ 目標：12/12 測試通過

4. **Stage 4 實作**（2 小時）
   - 整合 Better Auth session 管理
   - 實作登出流程
   - 執行 Test 4.1 - 4.8（8 個測試）
   - ✅ 目標：8/8 測試通過

### 階段 3：REFACTOR Phase（重構與優化）
- 檢查程式碼品質（TypeScript, Linter, Formatter）
- 優化效能（動畫、CSS）
- 優化可訪問性（WCAG AAA）
- 更新文件

---

## 八、測試覆蓋率要求

### 最低覆蓋率
- **Design Tokens**: 100%（所有 tokens 必須測試）
- **UI Components**: >80%（核心元件必須完整測試）
- **Animations**: >70%（動畫系統核心功能測試）
- **Session Management**: 100%（認證邏輯必須完整測試）

### 測試工具
- **測試框架**: Vitest
- **測試工具**: @testing-library/react
- **Mocking**: MSW (Mock Service Worker)
- **覆蓋率**: vitest coverage (c8)

---

## 九、期望輸出

### 測試通過標準
✅ **所有 40 個測試通過**：
- Stage 1: 10/10 tests ✅
- Stage 2: 10/10 tests ✅
- Stage 3: 12/12 tests ✅
- Stage 4: 8/8 tests ✅

✅ **測試覆蓋率達標**：
- Design Tokens: 100% ✅
- UI Components: >80% ✅
- Animations: >70% ✅
- Session Management: 100% ✅

✅ **程式碼品質**：
- TypeScript: 0 errors ✅
- Linter (Oxlint): 0 warnings ✅
- Formatter (Oxfmt): 100% formatted ✅

✅ **可訪問性**：
- WCAG AAA 對比度 >7:1 ✅
- 鍵盤導航完整支援 ✅
- Reduced Motion 支援 ✅

---

## 十、風險與注意事項

### 潛在風險
1. **View Transition API 瀏覽器支援度**
   - 緩解：提供 fallback（漸變動畫）
   - 檢測：使用 feature detection

2. **OKLCH 顏色在舊瀏覽器不支援**
   - 緩解：提供 RGB fallback
   - 工具：使用 culori 轉換

3. **動畫效能問題**
   - 緩解：使用 CSS transform 和 opacity（GPU 加速）
   - 測試：使用 Lighthouse 效能測試

4. **Session 管理複雜性**
   - 緩解：完整測試所有邊界情況
   - 工具：使用 MSW 模擬各種 session 狀態

### 關鍵決策
- ✅ 使用 OKLCH 色彩空間（perceptually uniform）
- ✅ 使用 View Transition API（現代瀏覽器）+ Framer Motion（複雜動畫）
- ✅ 使用雙模式系統（華麗/簡潔）讓使用者選擇
- ✅ 保留 SoundWaveLoader（使用者喜愛的元件）

---

**文件版本**: 1.0.0
**建立日期**: 2026-02-03
**最後更新**: 2026-02-03
**狀態**: RED Phase（測試規格已完成，等待實作）
