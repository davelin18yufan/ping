# Ping Design Philosophy

復刻 Yahoo! Messenger 的即時通訊應用，融合現代技術與情感設計。

---

## 核心設計原則

### 原則 1：儀式優先，情緒可視化

#### 互動儀式感
每種互動都有「儀式感」，讓溝通不只是文字傳遞，而是情感體驗：

- **進房間特效**：漸入動畫、環境音效、歡迎訊息
- **訊息送出動畫**：氣泡彈出、光波擴散、送達確認
- **活動完成慶祝**：煙火粒子、徽章解鎖、成就通知
- **情緒儀式**：
  - 🙏 **道歉**：藍紫色光暈、柔和脈衝、和解提示
  - 🎉 **慶祝**：金黃色煙火、彩帶動畫、成就解鎖
  - 💝 **和好**：粉紅色心形、溫暖漸層、關係修復

#### 情境貼圖系統
保有 LINE 的多元性，但進化為「智慧情境貼圖」：

- **AI 情境推薦**：根據對話內容智慧推薦適合的貼圖
- **動態反應貼圖**：
  - 心碎貼圖會碎掉並飄散
  - 慶祝貼圖會發光並彈跳
  - 道歉貼圖會柔和脈衝
  - 待新增
- **情緒儀式紀錄**：每個儀式都會留下可重溫的「時光膠囊」

---

### 原則 2：輕盈即時，降低卡頓

#### 技術承諾
- **超低延遲**：端到端加密 + 邊緣計算，訊息 **< 100ms** 送達（比 LINE 快 3-5 倍）
- **性能保證**：
  - 即使 10,000 條訊息，滑動仍流暢 60fps
  - 跨裝置同步 < 1 秒
  - 離線可編輯，上線即發送

#### 智慧壓縮
- **日誌卡片**：舊訊息自動壓縮成「時間膠囊」，不佔空間但隨時展開
- **無限滾動**：虛擬化列表，只渲染可見區域
- **漸進載入**：圖片/影片懶加載，優先載入文字

#### 流暢動畫
- **微互動時長**：150-300ms（符合人類感知）
- **Easing 曲線**：ease-out（進入）、ease-in（離開）
- **Reduced Motion**：遵循無障礙設計，尊重使用者偏好

---

### 原則 3：關係空間，情境自適應（擺脫 LINE 雜亂設計）

#### 關係小宇宙
不再是「訊息列表」，而是每段關係都是一個「空間」：

**聊天房間三區域**：
1. **即時聊天流**（中央主區）
   - 乾淨訊息氣泡
   - 無廣告干擾
   - 流暢滑動體驗

2. **活動牆**（側邊欄）
   - 小遊戲（猜拳、共同塗鴉）
   - 即時投票
   - 共同待辦清單
   - 倒數日紀念

3. **關係時光軸**（頂部摺疊）
   - 儀式紀錄（道歉、慶祝、和好）
   - 共同成就（聊天天數、訊息里程碑）
   - 重要時刻標記

#### 自適應 UI
根據關係熱度自動調整介面：

- **熱絡期**（每日互動 > 10 次）：
  - 活動牆自動展開
  - 推薦小遊戲/投票
  - 顯示即時打字狀態

- **平穩期**（每日互動 3-10 次）：
  - 專注聊天流
  - 活動牆摺疊至側邊
  - 保持乾淨視覺

- **冷卻期**（< 3 次/日）：
  - 純聊天模式
  - 柔和提醒「好久不見」
  - 推薦重溫回憶

#### 視覺乾淨承諾
- ✅ **高彩度但有層次**（復刻即時通活潑，但不雜亂）
- ✅ **無強迫推送**（通知只推「有儀式感的事件」）
- ✅ **無廣告干擾**（乾淨、專注、尊重使用者）
- ✅ **智慧摺疊**（非必要元素隱藏，隨時可展開）

---

## 視覺設計語言

### 設計定位：現代暗黑優雅（Modern Dark Elegance）

受 Discord 啟發，但加入 Yahoo! Messenger 的情感溫度：

- **主題模式**：
  - **Dark Mode（預設）**：深灰背景、高對比、清晰分層
  - **Light Mode（可選）**：柔和白色、溫暖陰影、輕盈感
  - **Auto（系統跟隨）**：根據系統偏好自動切換

### 色彩系統

#### Dark Mode（主要）
- **背景層級**：
  - `bg-primary`：#1E1F22（深灰，主背景）
  - `bg-secondary`：#2B2D31（次要背景，卡片、側邊欄）
  - `bg-tertiary`：#383A40（三級背景，hover 狀態）

- **前景文字**：
  - `text-primary`：#F2F3F5（主要文字，高對比）
  - `text-secondary`：#B5BAC1（次要文字，描述）
  - `text-tertiary`：#80848E（三級文字，時間戳）

- **品牌色（Accent）**：
  - `accent-primary`：#5865F2（品牌藍，CTA 按鈕、連結）
  - `accent-secondary`：#EB459E（活潑粉，儀式慶祝）
  - `accent-success`：#23A55A（成功綠，完成狀態）
  - `accent-warning`：#F0B232（警告黃，提示）
  - `accent-danger`：#F23F43（危險紅，刪除、錯誤）

- **儀式色彩**：
  - 🙏 **道歉**：#7289DA（藍紫光暈）
  - 🎉 **慶祝**：#FEE75C（金黃煙火）
  - 💝 **和好**：#EB459E（粉紅溫暖）

#### Light Mode（可選）
- **背景層級**：
  - `bg-primary`：#FAF9F8（溫暖象牙白，主背景 - 比純白柔和舒適）
  - `bg-secondary`：#F3F2F0（柔和米灰，卡片、側邊欄）
  - `bg-tertiary`：#ECEAE6（淺暖灰，hover 狀態）

- **前景文字**：
  - `text-primary`：#060607（深黑，主要文字）
  - `text-secondary`：#4E5058（灰色，次要文字）
  - `text-tertiary`：#80848E（淺灰，時間戳）

- **品牌色**：保持與 Dark Mode 一致（確保對比度 > 4.5:1）

### 字型系統

#### 字型選擇（避免無聊的系統字型）
- **Heading**：**Montserrat**（幾何 sans-serif，現代專業，比 Poppins 更銳利）
- **Body**：**Inter**（人文 sans-serif，清晰易讀，適合長文）
- **Monospace**：**JetBrains Mono**（等寬字型，適合程式碼、時間戳）

#### 字型大小階層
```typescript
fontSize: {
  xs: '0.75rem',    // 12px - 時間戳、標籤
  sm: '0.875rem',   // 14px - 次要文字、描述
  base: '1rem',     // 16px - 訊息內容
  lg: '1.125rem',   // 18px - 標題、強調
  xl: '1.25rem',    // 20px - 大標題
  '2xl': '1.5rem',  // 24px - 房間標題
  '3xl': '1.875rem' // 30px - 儀式慶祝文字
}
```

#### 字重階層
```typescript
fontWeight: {
  normal: 400,   // 一般文字
  medium: 500,   // 次要標題
  semibold: 600, // 主要標題
  bold: 700      // 強調、CTA
}
```

### 空間系統

#### 邊角圓潤度（友善感）
```typescript
borderRadius: {
  sm: '6px',   // 小元素（標籤、狀態點）
  md: '8px',   // 按鈕、輸入框
  lg: '12px',  // 訊息氣泡
  xl: '16px',  // 卡片、側邊欄
  '2xl': '24px' // 儀式特效容器
}
```

#### 間距階層（呼吸感）
- **緊湊**（4px, 8px）：按鈕內邊距、inline 元素
- **標準**（12px, 16px）：訊息間距、表單欄位
- **寬鬆**（24px, 32px）：區塊間距、頁面邊距
- **超寬**（48px, 64px）：分區間距、儀式特效

### 陰影與深度

#### 分層系統（Discord 風格）
```typescript
shadows: {
  sm: '0 1px 3px rgba(0, 0, 0, 0.2)',        // 微妙浮起（按鈕 hover）
  md: '0 4px 8px rgba(0, 0, 0, 0.3)',        // 卡片、下拉選單
  lg: '0 8px 16px rgba(0, 0, 0, 0.4)',       // Modal、側邊欄
  xl: '0 16px 32px rgba(0, 0, 0, 0.5)',      // 儀式特效容器
  glow: '0 0 20px rgba(88, 101, 242, 0.6)'   // 品牌光暈（CTA）
}
```

### 動畫原則

#### 流暢過渡（避免卡頓）
- **微互動**：150ms（hover, focus）
- **中等動畫**：250ms（展開/摺疊、淡入淡出）
- **大型動畫**：400ms（頁面切換、儀式特效）

#### Easing 曲線
```typescript
transition: {
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',    // 進入（輕快）
  easeIn: 'cubic-bezier(0.7, 0, 0.84, 0)',     // 離開（迅速）
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)'  // 彈跳（儀式特效）
}
```

#### 動畫層次
- **Tier 1（必須）**：送出訊息、進房間、儀式觸發
- **Tier 2（重要）**：展開/摺疊、hover 狀態、loading
- **Tier 3（可選）**：背景粒子、裝飾動畫

#### Reduced Motion 支援
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 元件設計優先級

### Phase 1：核心聊天體驗（MVP）
1. **訊息氣泡**（Message Bubble）
   - 自己/對方差異化
   - 支援文字、貼圖、儀式標記
   - 動態反應（碎掉、彈跳、脈衝）

2. **訊息輸入框**（Message Input）
   - 文字輸入 + 表情符號
   - 儀式觸發按鈕（道歉、慶祝、和好）
   - 送出動畫

3. **聊天列表**（Chat List）
   - 房間列表（一對一、群組）
   - 未讀計數
   - 最後訊息預覽

### Phase 2：關係空間（Enhanced UX）
4. **聊天房間容器**（Chat Room）
   - 三區域佈局（聊天流 + 活動牆 + 時光軸）
   - 進房間特效
   - 自適應 UI（關係熱度）

5. **活動牆**（Activity Wall）
   - 小遊戲（猜拳、塗鴉）
   - 投票系統
   - 共同清單

6. **關係時光軸**（Timeline）
   - 儀式紀錄
   - 成就解鎖
   - 重要時刻

### Phase 3：進階功能（Delight）
7. **儀式特效系統**（Ritual Effects）
   - 道歉光暈
   - 慶祝煙火
   - 和好心形

8. **智慧貼圖選擇器**（Smart Sticker Picker）
   - AI 情境推薦
   - 動態搜尋
   - 常用收藏

9. **日誌卡片**（Archive Card）
   - 智慧壓縮舊訊息
   - 時間膠囊
   - 快速展開/摺疊

---

## 可訪問性原則

### WCAG AAA 標準
- ✅ **對比度**：文字對比度 > 7:1（AAA 級）
- ✅ **鍵盤導航**：所有功能可用 Tab/Enter 操作
- ✅ **螢幕閱讀器**：ARIA 標籤完整
- ✅ **焦點可見**：focus ring 清晰（2px 實線）

### 包容性設計
- ✅ **色盲友善**：不單靠顏色傳達資訊（加上圖示/文字）
- ✅ **動畫可關閉**：Reduced Motion 支援
- ✅ **字型可縮放**：支援 200% 縮放不破版
- ✅ **觸控友善**：按鈕至少 44x44px（移動端）

---

## 技術實作原則

### 效能目標
- ⚡ **First Contentful Paint**: < 1.5s
- ⚡ **Time to Interactive**: < 3s
- ⚡ **Largest Contentful Paint**: < 2.5s
- ⚡ **Cumulative Layout Shift**: < 0.1
- ⚡ **訊息渲染**: < 16ms (60fps)

### 優化策略
- **虛擬化滾動**：只渲染可見區域（react-window）
- **圖片懶加載**：Intersection Observer
- **程式碼分割**：路由懶加載（React.lazy）
- **Service Worker**：離線快取
- **WebP 格式**：圖片壓縮 50%+

### 瀏覽器支援
- **Modern Browsers**：Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Polyfills**：CSS Grid, Flexbox, Custom Properties
- **Progressive Enhancement**：核心功能在舊瀏覽器也能用

---

## 設計交付清單

每個元件設計完成時，需確保：

### 視覺品質
- [ ] 無 emoji 用作圖示（使用 Lucide React / Heroicons）
- [ ] 所有圖示來自一致的圖示集
- [ ] Hover 狀態不造成 layout shift
- [ ] Dark/Light 兩種模式都正確顯示

### 互動體驗
- [ ] 所有可點擊元素有 `cursor-pointer`
- [ ] Hover 狀態提供清晰視覺回饋
- [ ] 轉場動畫流暢（150-300ms）
- [ ] 鍵盤導航時 focus 狀態可見

### 技術品質
- [ ] TypeScript 類型完整
- [ ] Props 有 JSDoc 註解
- [ ] 通過 ESLint/Oxlint（0 warnings）
- [ ] 格式化符合 Prettier/Oxfmt

### 測試覆蓋
- [ ] 單元測試（邏輯測試）
- [ ] 視覺回歸測試（Chromatic）
- [ ] 可訪問性測試（axe-core）

---

## 參考資源

### 設計靈感
- **Discord**：暗黑模式、清晰分層、流暢動畫
- **Yahoo! Messenger**：活潑色彩、情感溫度、儀式感
- **Telegram**：輕盈流暢、性能優先、乾淨介面
- **Notion**：自適應 UI、智慧摺疊、深度整合

### 技術文檔
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Radix UI](https://www.radix-ui.com/)（無障礙基礎元件）
- [React Window](https://react-window.vercel.app/)（虛擬化滾動）

### 色彩工具
- [OKLCH Color Picker](https://oklch.com/)
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Coolors Palette Generator](https://coolors.co/)

---

**最後更新**：2026-01-26
**版本**：1.0.0

**設計哲學核心**：讓每次對話都成為值得紀念的儀式，讓每段關係都有專屬的空間。
