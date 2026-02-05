# Ping Frosted Glass & Bubble Card Design

霜化玻璃與訊息氣泡設計指南

---

## 目錄

- [設計哲學](#設計哲學)
- [霜化玻璃設計](#霜化玻璃設計)
- [訊息氣泡設計](#訊息氣泡設計)
- [實作規範](#實作規範)

---

## 設計哲學

### 為什麼從毛玻璃進化到霜化玻璃?

**原有問題**:
- 卡片有明顯邊框(1px solid)
- 陰影不夠柔和
- 缺乏「雲朵浮在空中」的輕盈感

**新設計方向**:
- **移除邊框**: 透過模糊和陰影自然區隔空間
- **增強模糊效果**: blur(20px → 30px),背景若隱若現
- **擴散陰影**: 超柔和的多層陰影,最大模糊半徑達 96px
- **雲朵浮空感**: Hover 時向上浮起,陰影擴散增強

### 視覺感受

> "卡片不再是硬邊框的矩形,而是柔軟的雲朵浮在空中,輕盈、通透、自然。"

---

## 霜化玻璃設計

### 核心特性

#### 1. 無邊框 (Borderless)

**移除明顯邊框**:
```css
/* ❌ 舊設計 */
border: 1px solid oklch(1 0 0 / 0.1);

/* ✅ 新設計 */
border: 1px solid oklch(1 0 0 / 0.03); /* 極淡邊框,幾乎看不見 */
/* 或完全移除 */
border: none;
```

**設計理由**:
- 邊框會破壞霜化玻璃的自然感
- 透過模糊和陰影已足夠區隔空間
- 符合 macOS Big Sur 之後的設計語言

#### 2. 增強模糊效果 (Enhanced Blur)

**提升模糊強度**:
```css
/* ❌ 舊設計 */
backdrop-filter: blur(20px) saturate(150%);

/* ✅ 新設計 */
backdrop-filter: blur(30px) saturate(180%);
```

**背景透明度調整**:
```css
/* ❌ 舊設計 */
background: oklch(from var(--card) l c h / 0.6);

/* ✅ 新設計 */
background: oklch(from var(--card) l c h / 0.5);
```

**設計理由**:
- 更強的模糊讓背景若隱若現
- 降低透明度增強霜化感
- 飽和度提升讓顏色更鮮明

#### 3. 擴散陰影 (Diffusion Shadow)

**多層次柔和陰影**:
```css
/* ❌ 舊設計 */
box-shadow:
    0 2px 4px oklch(0 0 0 / 0.05),
    0 4px 8px oklch(0 0 0 / 0.08),
    0 8px 16px oklch(0 0 0 / 0.1);

/* ✅ 新設計 */
box-shadow:
    0 8px 32px oklch(0 0 0 / 0.08),   /* 近距離柔和陰影 */
    0 16px 64px oklch(0 0 0 / 0.12),  /* 遠距離擴散陰影 */
    0 24px 96px oklch(0 0 0 / 0.15);  /* 超遠距離擴散(雲朵感) */
```

**設計理由**:
- 模糊半徑大幅增加(16px → 96px)
- 透明度降低(0.3 → 0.08~0.15),更柔和
- 三層陰影創造深度,模擬雲朵浮在空中

#### 4. 雲朵浮空效果 (Cloud Floating)

**靜態狀態**: 輕微的懸浮感

**Hover 狀態**:
```css
.glass-card:hover {
    /* 向上浮起(2px → 8px) */
    transform: translateY(-8px);

    /* 陰影擴散增強 */
    box-shadow:
        0 12px 40px oklch(0 0 0 / 0.10),
        0 24px 80px oklch(0 0 0 / 0.15),
        0 36px 120px oklch(0 0 0 / 0.20);

    /* 背景稍微變亮 */
    background: oklch(from var(--card) calc(l + 0.02) c h / 0.6);
}
```

**設計理由**:
- 浮起距離增加(2px → 8px),強化雲朵感
- 陰影模糊半徑增加 20%
- 背景變亮(lightness +2%),模擬光線照射

### 完整範例

```css
/* Frosted Glass Card */
.glass-card {
    /* Enhanced Glassmorphism */
    background: oklch(from var(--card) l c h / 0.5);
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);

    /* No border or extremely subtle border */
    border: 1px solid oklch(1 0 0 / 0.03);
    border-radius: var(--radius-lg);

    /* Diffusion Shadow (Cloud-like) */
    box-shadow:
        0 8px 32px oklch(0 0 0 / 0.08),
        0 16px 64px oklch(0 0 0 / 0.12),
        0 24px 96px oklch(0 0 0 / 0.15);

    padding: 1.5rem;
    transition: all 400ms ease-out;
}

.glass-card:hover {
    transform: translateY(-8px);
    box-shadow:
        0 12px 40px oklch(0 0 0 / 0.10),
        0 24px 80px oklch(0 0 0 / 0.15),
        0 36px 120px oklch(0 0 0 / 0.20);
    background: oklch(from var(--card) calc(l + 0.02) c h / 0.6);
}
```

---

## 訊息氣泡設計

### 設計目標

**從規整到有機**:
- 統一圓角 → 非對稱圓角
- 靜態形狀 → 動態形變
- 矩形卡片 → 訊息氣泡

### 非對稱圓角 (Asymmetric Rounded Corners)

#### 設計原理

訊息氣泡特色: **模擬手寫訊息的自然感,左下/右下有「尾巴」**

**通用卡片** (無方向性):
```css
.bubble-card {
    border-radius: 1.5rem 1.2rem 1.5rem 1.2rem;
    /* top-left, top-right, bottom-right, bottom-left */
}
```

**發送訊息氣泡** (右側,尾巴在右下):
```css
.bubble-card--send {
    border-radius: 1.5rem 1.5rem 0.5rem 1.5rem;
    /* 右下角小圓角(0.5rem) = 氣泡尾巴 */
}
```

**接收訊息氣泡** (左側,尾巴在左下):
```css
.bubble-card--receive {
    border-radius: 1.5rem 1.5rem 1.5rem 0.5rem;
    /* 左下角小圓角(0.5rem) = 氣泡尾巴 */
}
```

### 圓角微縮動畫 (Bubble Squeeze)

**Hover 時**: 圓角變大
```css
.bubble-card:hover {
    border-radius: 1.8rem 1.5rem 1.8rem 1.5rem;
    /* 圓角增加 0.3rem */
}
```

**Active 時**: 輕微擠壓
```css
.bubble-card:active {
    transform: translateY(-2px) scale(0.98);
    border-radius: 1.2rem 1rem 1.2rem 1rem;
    /* 圓角減少,模擬被按壓 */
}
```

**設計理由**:
- 模擬真實氣泡被按壓的感覺
- 150ms 快速回饋,符合使用者期待
- 使用彈性 easing: cubic-bezier(0.68, -0.55, 0.265, 1.55)

### 完整範例

```css
/* Base bubble card */
.bubble-card {
    background: oklch(from var(--card) l c h / 0.5);
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);
    border: none;
    border-radius: 1.5rem 1.2rem 1.5rem 1.2rem;
    box-shadow:
        0 8px 32px oklch(0 0 0 / 0.08),
        0 16px 64px oklch(0 0 0 / 0.12),
        0 24px 96px oklch(0 0 0 / 0.15);
    padding: 1.5rem;
    transition:
        transform 150ms cubic-bezier(0.68, -0.55, 0.265, 1.55),
        border-radius 150ms ease-out,
        box-shadow 300ms ease-out,
        background 300ms ease-out;
}

.bubble-card:hover {
    border-radius: 1.8rem 1.5rem 1.8rem 1.5rem;
    transform: translateY(-4px);
    box-shadow:
        0 12px 40px oklch(0 0 0 / 0.10),
        0 24px 80px oklch(0 0 0 / 0.15),
        0 36px 120px oklch(0 0 0 / 0.20);
    background: oklch(from var(--card) calc(l + 0.02) c h / 0.6);
}

.bubble-card:active {
    transform: translateY(-2px) scale(0.98);
    border-radius: 1.2rem 1rem 1.2rem 1rem;
}

/* Send message bubble (right side, tail at bottom-right) */
.bubble-card--send {
    border-radius: 1.5rem 1.5rem 0.5rem 1.5rem;
    background: oklch(from var(--primary) l c h / 0.15);
    margin-left: auto;
    max-width: 70%;
}

.bubble-card--send:hover {
    border-radius: 1.8rem 1.8rem 0.8rem 1.8rem;
}

.bubble-card--send:active {
    border-radius: 1.2rem 1.2rem 0.4rem 1.2rem;
}

/* Receive message bubble (left side, tail at bottom-left) */
.bubble-card--receive {
    border-radius: 1.5rem 1.5rem 1.5rem 0.5rem;
    background: oklch(from var(--card) l c h / 0.5);
    margin-right: auto;
    max-width: 70%;
}

.bubble-card--receive:hover {
    border-radius: 1.8rem 1.8rem 1.8rem 0.8rem;
}

.bubble-card--receive:active {
    border-radius: 1.2rem 1.2rem 1.2rem 0.4rem;
}
```

### 有機形狀變體

**訊息卡片**: 明顯的氣泡感(非對稱圓角)
```css
.bubble-card--message {
    padding: 0.75rem 1rem;
    border-radius: 1.5rem 1.5rem 1.5rem 0.5rem; /* or 0.5rem at bottom-right */
    max-width: 70%;
}
```

**設定卡片**: 較規整的圓角(對稱)
```css
.bubble-card--settings {
    border-radius: 1.5rem;
}
```

**通話按鈕**: 完全圓形
```css
.glass-button--call {
    border-radius: 50%;
}
```

---

## 實作規範

### 檔案結構

```
/frontend/src/styles/components/
├── glass-card.css       # 霜化玻璃卡片
├── glass-button.css     # 霜化玻璃按鈕
├── glass-input.css      # 霜化玻璃輸入框
├── bubble-card.css      # 訊息氣泡卡片
```

### 使用霜化玻璃卡片

```tsx
import '@/styles/components/glass-card.css';

function ProfileCard() {
    return (
        <div className="glass-card">
            <h3>使用者資料</h3>
            <p>這是一張霜化玻璃卡片</p>
        </div>
    );
}
```

### 使用訊息氣泡

```tsx
import '@/styles/components/bubble-card.css';

function MessageBubble({ message, isOwn }) {
    return (
        <div className={`bubble-card ${isOwn ? 'bubble-card--send' : 'bubble-card--receive'}`}>
            <p>{message.content}</p>
            <span>{formatTime(message.createdAt)}</span>
        </div>
    );
}
```

### Safari 支援檢查

```css
@supports not (backdrop-filter: blur(30px)) {
    .glass-card,
    .bubble-card {
        background: var(--card);
        border: 1px solid var(--border);
    }

    .bubble-card--send {
        background: var(--primary);
        color: var(--primary-foreground);
    }
}
```

---

## 設計對比

### 霜化玻璃演進

| 特性 | 舊設計 (Glassmorphism) | 新設計 (Frosted Glass) |
|------|------------------------|------------------------|
| 邊框 | 1px solid (opacity 0.1) | 無或極淡 (opacity 0.03) |
| 模糊強度 | blur(20px) | blur(30px) |
| 背景透明度 | 60% | 50% |
| 陰影模糊半徑 | 最大 16px | 最大 96px |
| Hover 浮起 | 2px | 8px |
| 視覺感受 | 毛玻璃 | 雲朵浮空 |

### 訊息氣泡演進

| 特性 | 舊設計 (Regular Card) | 新設計 (Bubble Card) |
|------|----------------------|----------------------|
| 圓角 | 統一 (0.625rem) | 非對稱 (1.5rem / 0.5rem) |
| 形狀 | 矩形 | 有機氣泡 |
| Hover | 無圓角變化 | 圓角變大 |
| Active | 無形變 | 輕微擠壓 (scale 0.98) |
| 視覺感受 | 規整卡片 | 訊息氣泡 |

---

## 設計交付檢查清單

### 霜化玻璃
- [ ] 卡片無明顯邊框(opacity < 0.05)
- [ ] 模糊效果增強(blur 30px)
- [ ] 擴散陰影超柔和(最大模糊 96px)
- [ ] Hover 浮起效果流暢(雲朵感)
- [ ] Dark/Light 兩種模式都正確顯示
- [ ] Safari fallback 正常運作

### 訊息氣泡
- [ ] 非對稱圓角(模擬氣泡尾巴)
- [ ] Hover 圓角變大(1.5rem → 1.8rem)
- [ ] Active 輕微擠壓(scale 0.98)
- [ ] 提供發送/接收兩種變體
- [ ] 圓角變化流暢(150ms)
- [ ] 支援 reduced-motion

---

## 參考資源

### 設計靈感
- **macOS Big Sur**: 霜化玻璃設計語言
- **iOS Messages**: 訊息氣泡形狀
- **Telegram**: 有機形狀卡片
- **Notion**: 柔和陰影與深度

### 技術文檔
- [backdrop-filter on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
- [box-shadow on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow)
- [border-radius on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/border-radius)

### 設計工具
- [CSS Box Shadow Generator](https://cssgenerator.org/box-shadow-css-generator.html)
- [Glassmorphism Generator](https://hype4.academy/tools/glassmorphism-generator)
- [OKLCH Color Picker](https://oklch.com/)

---

**最後更新**: 2026-02-05
**版本**: 1.0.0

**設計核心**: 卡片不再是硬邊框的矩形,而是柔軟的雲朵浮在空中;訊息不再是規整的方塊,而是有機的氣泡傳遞情感。
