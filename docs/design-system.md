# Ping Design System

統一的 Design System，確保 Web 和 Mobile 視覺一致性。

## 目錄

- [概述](#概述)
- [Design Tokens](#design-tokens)
- [元件系統](#元件系統)
- [使用指南](#使用指南)
- [最佳實踐](#最佳實踐)

---

## 概述

Ping Design System 提供：

- **共享 Design Tokens**：顏色、間距、字型、陰影、圓角
- **Primitive Components**：Headless 元件，Web 和 Mobile 共享邏輯
- **UI Components**：Web (React) 和 Mobile (React Native) 的視覺實作

### 技術棧

- **Web**: Tailwind CSS v4 (CSS-based config)
- **Mobile**: Tailwind CSS v3 + NativeWind v4
- **共享**: TypeScript + React Hooks

---

## Design Tokens

### 顏色系統

所有顏色使用 OKLCH 色彩空間定義，確保視覺一致性。

**位置**: `/shared/design-tokens/colors.ts`

**包含 28 個顏色 tokens**:
- `background`, `foreground`
- `card`, `cardForeground`
- `popover`, `popoverForeground`
- `primary`, `primaryForeground`
- `secondary`, `secondaryForeground`
- `muted`, `mutedForeground`
- `accent`, `accentForeground`
- `destructive`, `destructiveForeground`
- `border`, `input`, `ring`
- `chart1` - `chart5`
- `sidebar*` (8 個相關 tokens)

**Light/Dark Mode**: 每個 token 都有 light 和 dark 模式值

**範例**:
```typescript
import { colors } from '@shared/design-tokens';

console.log(colors.primary.light); // "oklch(0.21 0.006 285.885)"
console.log(colors.primary.dark);  // "oklch(0.985 0 0)"
```

### 間距系統

基於 0.25rem (4px) 增量的間距 scale。

**位置**: `/shared/design-tokens/spacing.ts`

**範例**:
```typescript
import { spacing } from '@shared/design-tokens';

console.log(spacing[4]);  // "1rem" (16px)
console.log(spacing[8]);  // "2rem" (32px)
```

### 字型系統

**Font Family**:
- `sans`: 系統字型 stack（-apple-system, BlinkMacSystemFont, ...）
- `mono`: 等寬字型 stack（source-code-pro, Menlo, ...）

**Font Size**: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl - 9xl（包含對應 line-height）

**Font Weight**: thin (100) - black (900)

**位置**: `/shared/design-tokens/typography.ts`

### 陰影系統

**Web Shadows**: CSS box-shadow 字串

**Native Shadows**: React Native shadow 物件（shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation）

**位置**: `/shared/design-tokens/shadows.ts`

**範例**:
```typescript
import { shadows, nativeShadows } from '@shared/design-tokens';

// Web
console.log(shadows.md);
// "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)"

// Mobile
console.log(nativeShadows.md);
// { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, ... }
```

### 圓角系統

**Web Border Radius**: CSS calc() 字串（基於 --radius: 0.625rem）

**Native Border Radius**: 數字 pixel 值

**位置**: `/shared/design-tokens/radius.ts`

---

## 元件系統

### Primitive Components (Headless)

**位置**: `/shared/components/primitives/`

**目的**: 提供共享的元件邏輯，不包含視覺樣式

**範例 - Button Primitive**:
```typescript
import { useButton, type ButtonProps } from '@shared/components/primitives/button';

function MyButton(props: ButtonProps) {
  const { state, handlers, isDisabled } = useButton(props);

  // 使用 state 和 handlers 實作自訂 UI
}
```

### UI Components

#### Web Button

**位置**: `/frontend/src/components/ui/button.tsx`

**使用範例**:
```tsx
import { Button } from '@/components/ui/button';

function Example() {
  return (
    <>
      <Button variant="default">Default Button</Button>
      <Button variant="destructive" size="sm">Delete</Button>
      <Button variant="outline" loading>Loading...</Button>
    </>
  );
}
```

**Variants**: default, destructive, outline, secondary, ghost, link

**Sizes**: default, sm, lg, icon

#### Mobile Button

**位置**: `/mobile/src/components/ui/button.tsx`

**使用範例**:
```tsx
import { Button } from '@/components/ui/button';

function Example() {
  return (
    <>
      <Button variant="default" onPress={() => console.log('Pressed')}>
        Default Button
      </Button>
      <Button variant="destructive" size="sm">Delete</Button>
      <Button variant="outline" loading>Loading...</Button>
    </>
  );
}
```

**Variants**: 與 Web 相同

**Sizes**: 與 Web 相同

---

## 使用指南

### Web 使用 Design Tokens

**直接使用 Tailwind classes**（推薦）:
```tsx
<div className="bg-primary text-primary-foreground p-4 rounded-lg">
  Content
</div>
```

**在 CSS 中使用 CSS variables**:
```css
.custom-component {
  background-color: var(--primary);
  color: var(--primary-foreground);
}
```

### Mobile 使用 Design Tokens

**使用 NativeWind classes**（推薦）:
```tsx
<View className="bg-primary p-4 rounded-lg">
  <Text className="text-primary-foreground">Content</Text>
</View>
```

**直接引用 design tokens**（進階用法）:
```tsx
import { nativeShadows } from '@shared/design-tokens';

<View style={nativeShadows.md}>
  <Text>Content with shadow</Text>
</View>
```

### OKLCH 轉 RGB 工具

Mobile 需要將 OKLCH 顏色轉換為 RGB 格式：

```typescript
import { oklchToRgb } from '@shared/design-tokens';

const rgbColor = oklchToRgb('oklch(0.5 0.2 180)');
// Returns: "rgb(0, 200, 180)"
```

**注意**: Tailwind config 已自動處理此轉換，通常不需要手動調用。

---

## 最佳實踐

### 1. 優先使用 Design Tokens

**✅ 好的做法**:
```tsx
<button className="bg-primary text-primary-foreground">
  Submit
</button>
```

**❌ 避免硬編碼顏色**:
```tsx
<button className="bg-blue-500 text-white">
  Submit
</button>
```

### 2. 使用共享元件

當 Web 和 Mobile 需要相同邏輯時，優先使用 Primitive Components。

**範例**:
```tsx
// ✅ 使用 Primitive
import { useButton } from '@shared/components/primitives/button';

// ❌ 重複實作相同邏輯
```

### 3. 響應式設計

**Web**:
```tsx
<div className="px-4 sm:px-6 lg:px-8">
  Content
</div>
```

**Mobile**: NativeWind 不支援 breakpoints，使用 React Native Dimensions API。

### 4. Light/Dark Mode

**Web**: 使用 Tailwind 的 `dark:` variant
```tsx
<div className="bg-background text-foreground">
  {/* 自動根據 .dark class 切換顏色 */}
</div>
```

**Mobile**: NativeWind v4 支援 dark mode（需配置 `darkMode: 'class'`）
```tsx
<View className="bg-background">
  <Text className="text-foreground">Content</Text>
</View>
```

### 5. 可訪問性

- 使用 semantic HTML elements（Web）
- 確保顏色對比度 >4.5:1（WCAG AA）
- 為所有可互動元素提供適當的 focus 狀態
- Mobile: 使用 `accessible` 和 `accessibilityLabel` props

### 6. 效能最佳化

**Web**:
- 避免過度使用 `cn()` 函式（僅在需要合併 classes 時使用）
- 使用 `React.memo` 包裹純展示元件

**Mobile**:
- 使用 `React.memo` 減少不必要的 re-renders
- 複雜樣式使用 `StyleSheet.create()` 而非 inline styles（對於 NativeWind 不適用的情況）

---

## 擴展 Design System

### 新增 Design Token

1. 在 `/shared/design-tokens/` 新增或修改檔案
2. 更新 `/shared/design-tokens/index.ts` 匯出
3. 更新 `/frontend/src/styles.css`（Web CSS variables）
4. 更新 `/mobile/tailwind.config.ts`（如需要）
5. 更新此文檔

### 新增 Primitive Component

1. 在 `/shared/components/primitives/` 建立新目錄
2. 建立 `types.ts`, `use-*.ts`, `index.ts`
3. 在 Web 和 Mobile 分別實作 UI 版本
4. 新增測試
5. 更新此文檔

---

## 參考資源

- [Tailwind CSS v4 文檔](https://tailwindcss.com/docs)
- [NativeWind v4 文檔](https://www.nativewind.dev/)
- [OKLCH 色彩空間](https://oklch.com/)
- [Culori 函式庫](https://culorjs.org/)
- [Class Variance Authority](https://cva.style/docs)

---

**最後更新**: 2026-01-25
**版本**: 1.0.4
