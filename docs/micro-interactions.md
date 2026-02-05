# Ping Micro-Interactions Design Guide

微互動設計指南 - 讓每個互動都成為有溫度的儀式

---

## 目錄

- [設計哲學](#設計哲學)
- [核心微互動](#核心微互動)
- [實作規範](#實作規範)
- [可訪問性](#可訪問性)
- [使用者設定](#使用者設定)

---

## 設計哲學

### 為什麼需要微互動?

微互動是 Ping「儀式優先」設計哲學的核心體現。在 Ping 裡,每個點擊、每個 Hover 都不是冷冰冰的操作,而是有溫度的對話。

**設計目標**:
- 強化使用者的操作感與儀式感
- 提供即時的視覺回饋
- 讓介面有生命力,而非靜態工具
- 符合「訊息發送 = 訊號傳遞」的通訊主題

### 一句話描述

> "在 Ping 裡按下發送,水波漣漪向外擴散,訊息氣泡輕盈浮起,每個微互動都像在跟介面對話——這不是冷冰冰的工具,而是有溫度的儀式。"

---

## 核心微互動

### 1. 水波漣漪 Hover 效果 (Ripple Effect)

**用途**: 所有按鈕的 Hover 效果

**設計特點**:
- 從滑鼠位置(按鈕中心)產生圓形波紋
- 波紋向外擴散(scale 0 → 200%)
- 波紋逐漸淡出(opacity 0.3 → 0)
- 持續時間: 500ms
- 可以疊加多個波紋(快速移動時)

**視覺感受**:
> 像點擊水面產生的漣漪,符合「發送訊息 = 訊號傳遞」的主題

**實作範例**:
```css
.glass-button::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: oklch(from var(--primary) l c h / 0.3);
    transform: translate(-50%, -50%);
    transition: none;
    opacity: 0;
    pointer-events: none;
}

.glass-button:hover::before {
    animation: ripple-expand 500ms ease-out;
}

@keyframes ripple-expand {
    0% {
        width: 0;
        height: 0;
        opacity: 0.3;
    }
    50% {
        opacity: 0.2;
    }
    100% {
        width: 200%;
        height: 200%;
        opacity: 0;
    }
}
```

**使用場景**:
- 發送訊息按鈕
- 一般按鈕
- 所有可點擊元素

---

### 2. 發送訊息動畫 (Send Message)

**用途**: 點擊發送按鈕時

**設計特點**:
- 紙飛機圖示飛出
- 按鈕縮小消失
- 重新出現
- 持續時間: 600ms
- Easing: cubic-bezier(0.68, -0.55, 0.265, 1.55) (彈性)

**視覺感受**:
> 訊息像紙飛機一樣飛出去,充滿動感

**實作範例**:
```css
@keyframes send-message-fly {
    0% {
        transform: scale(1) translateX(0);
        opacity: 1;
    }
    50% {
        transform: scale(0.8) translateX(20px) translateY(-10px) rotate(15deg);
        opacity: 0.8;
    }
    100% {
        transform: scale(0.3) translateX(100px) translateY(-30px) rotate(45deg);
        opacity: 0;
    }
}
```

**使用場景**:
- 發送訊息按鈕點擊後
- 任何「發送」操作

---

### 3. 收到訊息動畫 (Receive Message)

**用途**: 收到新訊息時

**設計特點**:
- 訊息氣泡從下方滑入
- 輕微彈跳
- 伴隨微妙的光暈脈衝(2 次)
- 持續時間: 400ms

**視覺感受**:
> 訊息輕盈地彈入聊天室,像收到禮物般的驚喜

**實作範例**:
```css
@keyframes receive-message-slide {
    0% {
        transform: translateY(20px) scale(0.95);
        opacity: 0;
    }
    60% {
        transform: translateY(-2px) scale(1.02);
        opacity: 1;
    }
    100% {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
}

@keyframes receive-glow-pulse {
    0%, 100% {
        box-shadow: 0 0 0 oklch(from var(--primary) l c h / 0);
    }
    25% {
        box-shadow: 0 0 20px oklch(from var(--primary) l c h / 0.3);
    }
    50% {
        box-shadow: 0 0 0 oklch(from var(--primary) l c h / 0);
    }
    75% {
        box-shadow: 0 0 20px oklch(from var(--primary) l c h / 0.3);
    }
}
```

**使用場景**:
- 收到新訊息
- 任何「接收」操作

---

### 4. 打字指示器 (Typing Indicator)

**用途**: 對方正在打字時

**設計特點**:
- 3 個點點依序跳動(wave animation)
- 循環播放
- 配合呼吸般的光暈
- 持續時間: 1.4s (循環)

**視覺感受**:
> 像呼吸般的節奏,傳達「對方正在思考」的感覺

**實作範例**:
```css
.typing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--muted-foreground);
    animation: typing-wave 1.4s ease-in-out infinite;
}

.typing-dot:nth-child(1) {
    animation-delay: 0s;
}

.typing-dot:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typing-wave {
    0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.7;
    }
    30% {
        transform: translateY(-8px);
        opacity: 1;
    }
}

/* Breathing glow */
@keyframes typing-glow-pulse {
    0%, 100% {
        box-shadow: 0 0 10px oklch(from var(--muted) l c h / 0.3);
    }
    50% {
        box-shadow: 0 0 20px oklch(from var(--muted) l c h / 0.6);
    }
}
```

**使用場景**:
- 對方正在打字
- 任何「載入中」狀態

---

### 5. 通話按鈕動畫 (Call Button)

**用途**: 語音/視訊通話按鈕

**設計特點**:
- **Hover**: 圓形擴散(類似聲波,持續循環)
- **Click**: 按鈕脈衝 + 圓形波紋向外擴散
- 持續時間: 800ms

**視覺感受**:
> 聲波向外傳遞,強化「通話」的感覺

**實作範例**:
```css
.glass-button--call::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: transparent;
    border: 2px solid oklch(from var(--accent) l c h / 0.5);
    opacity: 0;
    pointer-events: none;
}

.glass-button--call:hover::after {
    animation: call-wave-expand 1.5s ease-out infinite;
}

@keyframes call-wave-expand {
    0% {
        transform: scale(1);
        opacity: 0.5;
    }
    100% {
        transform: scale(2);
        opacity: 0;
    }
}

@keyframes call-pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.2);
    }
    100% {
        transform: scale(1);
    }
}
```

**使用場景**:
- 語音通話按鈕
- 視訊通話按鈕
- 任何「呼叫」操作

---

### 6. 頭像互動動畫 (Avatar Interaction)

**用途**: 使用者頭像

**設計特點**:
- **Hover**: 外圈光暈旋轉(360 度,2s 循環)
- **Click**: 頭像輕微放大 + 光暈脈衝
- 持續時間: 400ms (click)

**視覺感受**:
> 頭像像被選中般發光,強化「這是人」的感覺

**實作範例**:
```css
.avatar::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: conic-gradient(
        from 0deg,
        oklch(from var(--primary) l c h / 0.5),
        oklch(from var(--accent) l c h / 0.5),
        oklch(from var(--primary) l c h / 0.5)
    );
    opacity: 0;
    transition: opacity 300ms ease;
    pointer-events: none;
}

.avatar:hover::before {
    opacity: 1;
    animation: avatar-ring-rotate 2s linear infinite;
}

@keyframes avatar-ring-rotate {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

@keyframes avatar-pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.15);
        box-shadow: 0 0 20px oklch(from var(--primary) l c h / 0.5);
    }
    100% {
        transform: scale(1);
    }
}
```

**使用場景**:
- 使用者頭像
- 聯絡人頭像
- 任何代表「人」的元素

---

## 實作規範

### 檔案結構

```
/frontend/src/styles/animations/
├── micro-interactions.css      # 所有微互動動畫定義

/frontend/src/contexts/
├── micro-interaction-context.tsx  # 微互動全域設定 Context
```

### 使用微互動 (Web)

**1. 引入 CSS**:
```tsx
import '@/styles/animations/micro-interactions.css';
```

**2. 使用 Context**:
```tsx
import { useMicroInteractionClass } from '@/contexts/micro-interaction-context';

function SendButton() {
    const sendClass = useMicroInteractionClass('send-message');

    const handleSend = () => {
        // Trigger animation
        buttonRef.current?.classList.add(sendClass);

        // Remove after animation completes
        setTimeout(() => {
            buttonRef.current?.classList.remove(sendClass);
        }, 600);
    };

    return <button onClick={handleSend}>Send</button>;
}
```

**3. 使用打字指示器**:
```tsx
import { useTypingIndicator } from '@/contexts/micro-interaction-context';

function ChatWindow() {
    const typingIndicator = useTypingIndicator();

    return (
        <div>
            {isTyping && typingIndicator}
        </div>
    );
}
```

---

## 可訪問性

### Reduced Motion 支援

**所有微互動必須支援 `prefers-reduced-motion`**:

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }

    /* Disable ripple effects */
    .glass-button::before,
    .micro-call-hover::after,
    .micro-avatar-hover::before {
        display: none;
    }

    /* Disable transform animations */
    .micro-send-message,
    .micro-receive-message,
    .micro-call-pulse,
    .micro-avatar-pulse {
        animation: none;
    }

    /* Keep typing indicator functional but simplified */
    .micro-typing-dot {
        animation: none;
        opacity: 0.7;
    }
}
```

### 鍵盤導航

所有微互動元素必須支援鍵盤導航:
- Tab: 聚焦元素
- Enter/Space: 觸發互動
- Escape: 取消互動(如適用)

### 螢幕閱讀器

所有微互動元素必須提供適當的 ARIA 標籤:
```tsx
<button
    className="glass-button"
    aria-label="Send message"
    aria-live="polite"
    aria-busy={isSending}
>
    Send
</button>
```

---

## 使用者設定

### Micro-Interaction Context

提供全域設定,讓使用者控制動畫強度:

**設定選項**:

1. **動畫強度**:
   - `full`: 完整微互動(預設)
   - `reduced`: 簡化微互動(符合 reduced-motion)
   - `none`: 關閉所有微互動

2. **儀式特效**:
   - `true`: 啟用儀式特效(道歉、慶祝、和好)
   - `false`: 停用儀式特效

3. **音效回饋** (未來功能):
   - `true`: 啟用音效
   - `false`: 停用音效

**實作範例**:
```tsx
import { MicroInteractionProvider } from '@/contexts/micro-interaction-context';

function App() {
    return (
        <MicroInteractionProvider>
            <YourApp />
        </MicroInteractionProvider>
    );
}
```

**設定介面**:
```tsx
import { useMicroInteraction } from '@/contexts/micro-interaction-context';

function SettingsPage() {
    const { settings, updateSettings } = useMicroInteraction();

    return (
        <div>
            <label>
                動畫強度:
                <select
                    value={settings.level}
                    onChange={(e) => updateSettings({ level: e.target.value })}
                >
                    <option value="full">完整</option>
                    <option value="reduced">簡化</option>
                    <option value="none">關閉</option>
                </select>
            </label>

            <label>
                <input
                    type="checkbox"
                    checked={settings.ritualEffects}
                    onChange={(e) => updateSettings({ ritualEffects: e.target.checked })}
                />
                啟用儀式特效
            </label>
        </div>
    );
}
```

---

## 設計交付檢查清單

每個微互動實作完成時,需確保:

### 技術品質
- [ ] 動畫流暢(無卡頓)
- [ ] 持續時間符合規範(150-800ms)
- [ ] 使用正確的 easing 曲線
- [ ] 支援 prefers-reduced-motion
- [ ] 無 layout shift
- [ ] 無 console 錯誤

### 視覺品質
- [ ] 動畫符合設計規範
- [ ] 顏色使用 Design Tokens
- [ ] Dark/Light 兩種模式都正確顯示
- [ ] 動畫不干擾閱讀
- [ ] 動畫不造成視覺疲勞

### 可訪問性
- [ ] 支援鍵盤導航
- [ ] 提供 ARIA 標籤
- [ ] 支援螢幕閱讀器
- [ ] 支援 reduced-motion
- [ ] 觸控友善(移動端)

### 使用者體驗
- [ ] 提供即時回饋
- [ ] 不阻擋使用者操作
- [ ] 可被打斷(如適用)
- [ ] 提供使用者設定選項
- [ ] 符合使用者期待

---

## 參考資源

### 設計靈感
- **Material Design Ripple**: Google Material Design 的水波效果
- **iOS Animations**: Apple iOS 的彈性動畫
- **Telegram**: 輕盈流暢的微互動
- **Discord**: 精緻的 Hover 效果

### 技術文檔
- [Framer Motion](https://www.framer.com/motion/)
- [React Spring](https://www.react-spring.dev/)
- [CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)

### 動畫工具
- [Cubic Bezier Generator](https://cubic-bezier.com/)
- [Easing Functions Cheat Sheet](https://easings.net/)
- [Animista](https://animista.net/)

---

**最後更新**: 2026-02-05
**版本**: 1.0.0

**設計核心**: 讓每個微互動都成為有溫度的儀式,而非冷冰冰的操作。
