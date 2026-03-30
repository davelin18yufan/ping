# Feature 1.3.3 — 訊息氣泡操作（Message Bubble Actions）TDD 測試規格

> **版本**：1.0.0
> **建立日期**：2026-03-27
> **測試階段**：RED Phase（測試先行）
> **測試數量**：Backend 7+、Frontend Web 6+、Mobile 6+
> **依賴**：Feature 1.3.1 ✅

---

## 一、測試環境設定

### Backend
- **Runtime**: Bun 1.3.5+
- **Framework**: `bun:test`
- **Database**: PostgreSQL (Test DB, isolated per test suite)
- **Cache**: Redis (Test instance, flushed before each suite)
- **Fixtures**: `@tests/fixtures/prisma`, `@tests/fixtures/graphql`

### Frontend Web
- **Runner**: Vitest + React Testing Library
- **Mocks**: Apollo Client (MockedProvider), Socket.io client (vi.mock), Clipboard API (vi.fn)
- **User interactions**: `@testing-library/user-event`

### Mobile
- **Runner**: Jest + React Native Testing Library
- **Gesture mocks**: `react-native-gesture-handler` mock, manual fire of gesture events
- **Mocks**: Apollo Client (MockedProvider), Socket.io client (jest.mock)

---

## 二、Backend 測試案例（TC-B-32 ~ TC-B-38）

> 測試檔案：`/backend/tests/integration/message-actions.spec.ts`

### TC-B-32: replyToMessage 成功建立回覆訊息

**目的**：驗證 `replyToMessage` mutation 在合法情境下建立帶 `replyToId` 的訊息

**前置條件**：
- Alice 與 Bob 是對話參與者（`convId` 已存在）
- 對話中存在一條 Bob 發送的訊息 `originalMsgId`
- Alice 以 session cookie 驗證通過

**操作**：
```graphql
mutation {
  replyToMessage(
    conversationId: "convId"
    content: "Got it, thanks!"
    replyToMessageId: "originalMsgId"
  ) {
    id
    content
    replyToId
    replyTo {
      id
      content
      sender { id }
    }
    sender { id }
  }
}
```

**期望結果**：
- `errors` 為 undefined
- `content` = "Got it, thanks!"
- `replyToId` = "originalMsgId"
- `replyTo.id` = "originalMsgId"
- `replyTo.sender.id` = Bob 的 userId
- `sender.id` = Alice 的 userId
- DB 中新訊息的 `reply_to_id` = "originalMsgId"

**邊界情況**：
- `content` 為空字串 → `errors[0].extensions.code` = "BAD_USER_INPUT"
- `content` 超過 2000 字 → `errors[0].extensions.code` = "BAD_USER_INPUT"

---

### TC-B-33: replyToMessage 非參與者 FORBIDDEN

**目的**：驗證非對話參與者無法回覆訊息

**前置條件**：
- Alice 是對話的參與者，Carol 不是
- 對話中存在訊息 `originalMsgId`
- Carol 以 session cookie 驗證通過

**操作**：
```graphql
# Carol 嘗試回覆 Alice-Bob 對話中的訊息
mutation {
  replyToMessage(
    conversationId: "aliceBobConvId"
    content: "Intrude!"
    replyToMessageId: "originalMsgId"
  ) { id }
}
```

**期望結果**：
- `errors[0].extensions.code` = "FORBIDDEN"
- DB 中無新訊息被建立

**邊界情況**：
- `replyToMessageId` 指向不屬於該 `conversationId` 的訊息 → `errors[0].extensions.code` = "BAD_USER_INPUT"（防止跨對話引用注入）
- `replyToMessageId` 不存在 → `errors[0].extensions.code` = "NOT_FOUND"
- 未認證請求 → `errors[0].extensions.code` = "UNAUTHENTICATED"

---

### TC-B-34: pinMessage 成功釘選訊息

**目的**：驗證 `pinMessage` mutation 正確設定 `pinnedAt` 與 `Conversation.pinnedMessageId`

**前置條件**：
- Alice 是對話 `convId` 的參與者（MEMBER 或 OWNER）
- 訊息 `msgId` 屬於 `convId`，目前 `pinnedAt` = null

**操作**：
```graphql
mutation {
  pinMessage(messageId: "msgId") {
    id
    pinnedAt
  }
}
```

**期望結果**：
- `errors` 為 undefined
- `pinnedAt` 為有效的 ISO 8601 datetime 字串（非 null）
- DB 中 `Conversation.pinnedMessageId` = "msgId"
- Socket.io 廣播事件 `message:pinned` 被發送至 `convId` room，payload 包含 `{ messageId: "msgId", pinnedAt }`

**邊界情況**：
- 訊息已有 `pinnedAt`（重複釘選）→ 冪等，回傳現有 `pinnedAt`，不更新時間戳
- 訊息不屬於任何對話 Alice 是參與者 → `errors[0].extensions.code` = "FORBIDDEN"

---

### TC-B-35: unpinMessage 清除釘選狀態

**目的**：驗證 `unpinMessage` mutation 同時清除訊息 `pinnedAt` 與 `Conversation.pinnedMessageId`

**前置條件**：
- 訊息 `msgId` 已被釘選（`pinnedAt` 非 null）
- `Conversation.pinnedMessageId` = "msgId"
- Alice 是該對話的參與者

**操作**：
```graphql
mutation {
  unpinMessage(messageId: "msgId") {
    id
    pinnedAt
  }
}
```

**期望結果**：
- `errors` 為 undefined
- `pinnedAt` = null
- DB 中 `Conversation.pinnedMessageId` = null
- Socket.io 廣播事件 `message:unpinned` 被發送至 conversation room，payload 包含 `{ messageId: "msgId" }`

**邊界情況**：
- 訊息原本就未釘選（`pinnedAt` = null）→ 冪等，回傳 null，無廣播
- `Conversation.pinnedMessageId` 指向其他訊息（資料不一致狀態）→ 只清除訊息的 `pinnedAt`，並將 `Conversation.pinnedMessageId` 設為 null

---

### TC-B-36: deleteMessage(EVERYONE) 發送者成功為彼此收回

**目的**：驗證訊息發送者可以執行 `DeleteMessageScope.EVERYONE` 軟刪除（`deletedAt` 設定）

**前置條件**：
- Alice 是訊息 `msgId` 的發送者（`sender.id` = Alice）
- 訊息 `createdAt` 在 24 小時以內

**操作**：
```graphql
mutation {
  deleteMessage(messageId: "msgId", scope: EVERYONE)
}
```

**期望結果**：
- 回傳 `true`
- DB 中訊息 `deletedAt` 為有效 datetime（非 null）
- Socket.io 廣播 `message:deleted` 至 conversation room，payload `{ messageId: "msgId", scope: "EVERYONE" }`
- 查詢訊息歷史時，被軟刪除的訊息顯示為「此訊息已收回」佔位符，不回傳原始 `content`

**邊界情況**：
- 訊息 `createdAt` 超過 24 小時 → `errors[0].extensions.code` = "FORBIDDEN"（收回時限）
- 訊息已有 `deletedAt`（重複刪除）→ 冪等，回傳 `true`，不廣播

---

### TC-B-37: deleteMessage(EVERYONE) 非發送者 FORBIDDEN

**目的**：驗證非訊息發送者無法執行 `scope = EVERYONE` 的刪除

**前置條件**：
- Bob 是訊息 `msgId` 的發送者
- Alice（非發送者）是對話的參與者
- Alice 嘗試以 `scope = EVERYONE` 刪除

**操作**：
```graphql
# Authenticated as Alice
mutation {
  deleteMessage(messageId: "msgId", scope: EVERYONE)
}
```

**期望結果**：
- `errors[0].extensions.code` = "FORBIDDEN"
- DB 中訊息 `deletedAt` 仍為 null

**邊界情況**：
- Alice 以 `scope = OWN` 刪除他人訊息 → 允許（軟刪除只影響 Alice 的視圖，實作可記錄於獨立 table 或欄位）
- `messageId` 不存在 → `errors[0].extensions.code` = "NOT_FOUND"
- 未認證請求 → `errors[0].extensions.code` = "UNAUTHENTICATED"

---

### TC-B-38: forwardMessage 成功轉發至另一對話

**目的**：驗證 `forwardMessage` 在目標對話中建立一條相同 `content` 的新訊息

**前置條件**：
- Alice 是來源對話 `srcConvId` 的參與者
- Alice 同時也是目標對話 `dstConvId` 的參與者
- 訊息 `msgId` 屬於 `srcConvId`，內容為 "Hello World"

**操作**：
```graphql
mutation {
  forwardMessage(
    messageId: "msgId"
    targetConversationId: "dstConvId"
  ) {
    id
    content
    conversationId
    sender { id }
  }
}
```

**期望結果**：
- `errors` 為 undefined
- 回傳新訊息，`content` = "Hello World"
- `conversationId` = "dstConvId"
- `sender.id` = Alice 的 userId（轉發者成為新訊息的 sender）
- DB 中 `dstConvId` 多出一條訊息，`replyToId` = null（不帶原始引用）
- Socket.io 廣播 `message:new` 至 `dstConvId` room

**邊界情況**：
- Alice 不是 `targetConversationId` 的參與者 → `errors[0].extensions.code` = "FORBIDDEN"
- 轉發已被軟刪除的訊息（`deletedAt` 非 null）→ `errors[0].extensions.code` = "BAD_USER_INPUT"（無法轉發已收回的訊息）
- `targetConversationId` = `srcConvId`（轉發至自己）→ 允許，建立重複訊息
- `messageId` 不存在 → `errors[0].extensions.code` = "NOT_FOUND"

---

## 三、Frontend Web 測試案例（TC-F-A1 ~ TC-F-A6）

> 測試檔案：`/frontend/tests/integration/message-actions.spec.tsx`

### TC-F-A1: Hover 顯示角落操作圖示叢集

**目的**：驗證滑鼠懸停於訊息氣泡時，角落操作圖示以 opacity 1 顯示

**前置條件**：
- 渲染包含至少一條訊息的 `MessageBubbleWrapper`
- 圖示叢集初始 opacity = 0.15（或 CSS class `opacity-0`）

**操作**：
```tsx
const { getByTestId } = render(<MessageBubbleWrapper message={mockMessage} />);
await userEvent.hover(getByTestId('message-bubble-wrapper'));
```

**期望結果**：
- `getByTestId('message-action-cluster')` 具有 class `opacity-100` 或 CSS computed style `opacity: 1`
- 可見的圖示包含：Reply、Copy、Forward、Pin、Delete（至少 5 個 Lucide 圖示）
- 非 hover 狀態下 `opacity` 回到 0.15

**邊界情況**：
- 訊息已被軟刪除（`deletedAt` 非 null）→ 操作叢集不渲染（或僅顯示「從我這裡移除」一個選項）
- `prefers-reduced-motion` 媒體查詢啟用時 → 無 transition 動畫，但 opacity 仍正確切換

---

### TC-F-A2: 右鍵開啟 Context Menu 於游標位置

**目的**：驗證右鍵點擊後在游標坐標附近渲染 `MessageContextMenu`

**前置條件**：
- 渲染 `MessageBubbleWrapper`，window 尺寸 1280×800

**操作**：
```tsx
fireEvent.contextMenu(getByTestId('message-bubble-wrapper'), {
  clientX: 300,
  clientY: 200,
});
```

**期望結果**：
- `getByRole('menu')` 存在於 DOM 中
- menu 的 `style.left` ≈ "300px" 且 `style.top` ≈ "200px"（允許 ±10px 偏移以防止 viewport overflow）
- Menu 包含選項：回覆、複製、轉發、選取、釘選、刪除

**邊界情況**：
- 游標位於 viewport 右側邊緣（clientX > window.innerWidth - menuWidth）→ menu 向左偏移，不超出視窗
- 游標位於 viewport 底部邊緣（clientY > window.innerHeight - menuHeight）→ menu 向上偏移
- 在 menu 開啟時再次右鍵點擊另一條訊息 → 前一個 menu 關閉，新 menu 在新位置開啟

---

### TC-F-A3: Escape 鍵關閉 Context Menu

**目的**：驗證按下 Escape 鍵後 Context Menu 消失

**前置條件**：
- `MessageContextMenu` 已開啟（右鍵觸發）

**操作**：
```tsx
// Context menu is open
fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
```

**期望結果**：
- `queryByRole('menu')` 回傳 null（menu 從 DOM 移除或 display:none）
- `chatActionsStore` 中的 `contextMenuPosition` 重設為 null

**邊界情況**：
- 多次按 Escape → 不拋出錯誤，保持關閉狀態
- 點擊 menu 以外的任意區域 → menu 也應關閉（outside click handler）

---

### TC-F-A4: Copy 操作寫入剪貼簿

**目的**：驗證點擊「複製」後呼叫 `navigator.clipboard.writeText` 並帶正確內容

**前置條件**：
- `navigator.clipboard.writeText` 以 `vi.fn().mockResolvedValue(undefined)` 模擬
- 訊息 `content` = "Hello World"

**操作**：
```tsx
fireEvent.contextMenu(messageBubble);
fireEvent.click(getByRole('menuitem', { name: /複製/i }));
```

**期望結果**：
- `navigator.clipboard.writeText` 被呼叫一次，參數為 "Hello World"
- 短暫顯示 toast/tooltip「已複製」（持續約 2 秒後消失）
- Context menu 關閉

**邊界情況**：
- `navigator.clipboard.writeText` 拋出 Permission Denied → 降級為 `document.execCommand('copy')`，顯示錯誤 toast
- 訊息已被軟刪除（`deletedAt` 非 null）→ 複製的內容為「此訊息已收回」佔位符文字

---

### TC-F-A5: Select 操作進入多選模式

**目的**：驗證點擊「選取」後進入 multi-select 模式，訊息顯示發光環 + scale(0.97)

**前置條件**：
- 渲染訊息列表（3 條訊息），初始非 multi-select 狀態
- `chatActionsStore.isMultiSelectMode` = false

**操作**：
```tsx
fireEvent.contextMenu(getByTestId('message-bubble-wrapper-1'));
fireEvent.click(getByRole('menuitem', { name: /選取/i }));
```

**期望結果**：
- `chatActionsStore.isMultiSelectMode` = true
- 被點擊的訊息立即被選中（`selectedMessageIds` 包含該訊息 id）
- 訊息氣泡具有 class `ring-2 ring-primary scale-97`（或等效發光環樣式）
- 底部出現多選操作列（顯示已選數量 + Delete、Forward 按鈕）
- 其他訊息也可點擊選取（不需右鍵）

**邊界情況**：
- 點擊空白區域或按 Escape → 退出 multi-select 模式，清除 `selectedMessageIds`
- 全選後取消全選 → `selectedMessageIds` 清空，`isMultiSelectMode` 回到 false

---

### TC-F-A6: ReplyQuoteBlock 顯示正確 border 顏色與內容

**目的**：驗證 `ReplyQuoteBlock` 依引用訊息發送者視角渲染正確的 border 顏色、sender 姓名與截斷內容

**前置條件**：
- 當前登入使用者 id = "alice-id"
- 場景 A：`replyTo.sender.id` = "bob-id"（對方的訊息）
- 場景 B：`replyTo.sender.id` = "alice-id"（自己的訊息）
- `replyTo.content` = "This is a very long message that should be truncated at around fifty characters for display"

**操作（場景 A）**：
```tsx
render(
  <ReplyQuoteBlock
    replyTo={{ sender: { id: 'bob-id', name: 'Bob' }, content: '...' }}
    currentUserId="alice-id"
  />
);
```

**期望結果（場景 A）**：
- 左側 border 顏色 class 含 `border-muted-foreground`（或對應 CSS variable `--muted-foreground`）
- 顯示 sender 姓名 "Bob"
- content 截斷後不超過 50 個字元，末尾顯示 "..."

**期望結果（場景 B - 自己的訊息）**：
- 左側 border 顏色 class 含 `border-primary`（`--primary`）
- 顯示 sender 姓名 "You" 或 "你"（本地化）

**邊界情況**：
- `replyTo.content` 少於 50 字 → 不截斷，不顯示 "..."
- `replyTo` 被軟刪除（`deletedAt` 非 null）→ 顯示「引用的訊息已收回」灰色斜體佔位符
- `replyTo.sender` 為 null（資料異常）→ 顯示「未知發送者」，不崩潰

---

## 四、Mobile 測試案例（TC-M-A1 ~ TC-M-A6）

> 測試檔案：`/mobile/tests/integration/message-actions.test.tsx`

### TC-M-A1: 長按（500ms）開啟 Action Sheet

**目的**：驗證長按訊息氣泡 500ms 後觸發底部 glass `MessageActionSheet`

**前置條件**：
- 渲染 `MessageBubbleWrapper.native` 包裹的訊息
- `MessageActionSheet` 初始不可見

**操作**：
```tsx
// Simulate long press gesture (500ms threshold)
const bubble = getByTestId('message-bubble-native');
fireEvent(bubble, 'longPress');
```

**期望結果**：
- `getByTestId('message-action-sheet')` 存在且 visible
- Action Sheet 從底部以 spring 動畫滑入（`translateY: 0`）
- 背景出現半透明 overlay（blocking interactions behind）

**邊界情況**：
- 長按未達 500ms 提前放開 → Action Sheet 不開啟
- 訊息已被軟刪除（`deletedAt` 非 null）→ Action Sheet 開啟但只顯示「從我這裡移除」一個選項

---

### TC-M-A2: 向右滑動超過 60px 觸發回覆模式

**目的**：驗證訊息氣泡向右滑動超過閾值後進入 reply 模式

**前置條件**：
- 渲染訊息氣泡（使用 `react-native-gesture-handler` mock）
- `MessageInput` 的 reply preview bar 初始隱藏

**操作**：
```tsx
// Simulate pan gesture: dx = 80px (exceeds 60px threshold)
fireEvent(bubble, 'onGestureEvent', {
  nativeEvent: { translationX: 80, state: State.ACTIVE },
});
fireEvent(bubble, 'onHandlerStateChange', {
  nativeEvent: { translationX: 80, state: State.END },
});
```

**期望結果**：
- `chatActionsStore.replyingToMessage` 被設為該訊息 id
- `MessageInput` 頂部出現 reply preview bar，顯示被引用訊息的 sender 姓名與截斷內容
- 輕觸 vibration feedback 觸發（`Haptics.impactAsync` 被呼叫一次）
- 氣泡回到原始位置（spring 回彈）

**邊界情況**：
- 滑動方向為向左（`translationX` < 0）→ 不觸發 reply 模式
- 滑動距離 = 60px（邊界值）→ 不觸發（需嚴格 > 60）
- 已被軟刪除的訊息 → 向右滑動不觸發 reply 模式，無 haptic

---

### TC-M-A3: Action Sheet 顯示全部 6 個操作選項

**目的**：驗證 `MessageActionSheet` 包含所有 6 個操作

**前置條件**：
- 訊息為正常狀態（`deletedAt` = null，`pinnedAt` = null）
- 訊息發送者為當前登入使用者（Alice）

**操作**：
```tsx
// Long press to open action sheet
fireEvent(getByTestId('message-bubble-native'), 'longPress');
```

**期望結果**：
- Action Sheet 中可見以下 6 個選項（依序）：
  1. 回覆（Reply icon）
  2. 複製（Copy icon）
  3. 轉發（Forward icon）
  4. 選取（Checkmark icon）
  5. 釘選（Pin icon）
  6. 刪除（Trash icon，紅色警示色）
- 若訊息已釘選（`pinnedAt` 非 null）→ 第 5 選項改為「取消釘選」

**邊界情況**：
- 訊息發送者為他人（Bob）→ 刪除選項僅顯示「從我這裡移除」，不顯示「為彼此收回」sub-option
- 群組對話且使用者為 OWNER → 可刪除任何成員的訊息（scope = EVERYONE）

---

### TC-M-A4: 點擊刪除顯示確認 Sub-Modal

**目的**：驗證點擊「刪除」後出現確認 sub-modal，包含兩個刪除選項

**前置條件**：
- `MessageActionSheet` 已開啟
- 訊息發送者 = 當前使用者（有 EVERYONE 選項）

**操作**：
```tsx
// Action sheet is open
fireEvent.press(getByText('刪除'));
```

**期望結果**：
- `MessageActionSheet` 轉換為刪除確認 sub-modal（或新 modal 出現）
- Sub-modal 顯示兩個按鈕：
  - 「從我這裡移除」（執行 `deleteMessage(scope: OWN)`）
  - 「為彼此收回」（執行 `deleteMessage(scope: EVERYONE)`，紅色警示）
- 「取消」按鈕可關閉 sub-modal 回到 Action Sheet（或直接關閉）

**邊界情況**：
- 確認「為彼此收回」後，若 API 回傳錯誤（例如超過 24h 時限）→ 顯示 inline 錯誤訊息「此訊息已超過收回時限」
- 快速連點「為彼此收回」→ 防止重複提交（按鈕 disabled 狀態）

---

### TC-M-A5: 選取操作進入 Multi-Select 模式

**目的**：驗證長按 → 選取後，Mobile 進入 multi-select 模式且訊息顯示選取狀態

**前置條件**：
- 渲染訊息列表（至少 3 條），`isMultiSelectMode` = false

**操作**：
```tsx
// Long press then tap "Select"
fireEvent(getByTestId('message-bubble-native-1'), 'longPress');
fireEvent.press(getByText('選取'));
```

**期望結果**：
- `chatActionsStore.isMultiSelectMode` = true
- 選中的訊息顯示發光環效果（`borderWidth: 2, borderColor: primary color`）
- 訊息 scale 縮小至 0.97
- 頂部或底部 toolbar 出現多選操作列（顯示「已選 1 條」+ 刪除/轉發按鈕）
- 其他訊息可單點選取（不需長按）

**邊界情況**：
- 按下 Android back button 或 iOS swipe-down → 退出 multi-select 模式
- multi-select 模式下嘗試長按 → 不重複開啟 Action Sheet，直接切換選取狀態

---

### TC-M-A6: 向右滑動未達閾值自動回彈（不觸發回覆）

**目的**：驗證滑動距離 ≤ 60px 時氣泡回彈，不觸發回覆模式

**前置條件**：
- 渲染訊息氣泡，`chatActionsStore.replyingToMessage` = null

**操作**：
```tsx
// Simulate pan gesture: dx = 40px (below 60px threshold)
fireEvent(bubble, 'onGestureEvent', {
  nativeEvent: { translationX: 40, state: State.ACTIVE },
});
fireEvent(bubble, 'onHandlerStateChange', {
  nativeEvent: { translationX: 40, state: State.END },
});
```

**期望結果**：
- `chatActionsStore.replyingToMessage` 仍為 null
- 氣泡以 spring 動畫回彈至原始位置（`translateX` 回到 0）
- `MessageInput` reply preview bar 不出現
- 無 haptic feedback

**邊界情況**：
- 滑動距離 = 59px → 仍不觸發（嚴格 > 60 才觸發）
- 滑動方向為斜角（translationX = 80, translationY = 50）→ 若 Y 偏移過大（> 30px）視為滾動，不觸發 reply
- 在訊息列表快速滾動時誤觸滑動手勢 → 滾動優先，reply 手勢不觸發（gesture competition resolution）

---

## 五、測試 Fixtures

### Backend Fixtures

```typescript
// /backend/tests/fixtures/message-actions.ts

export const createMessageActionsFixture = async (prisma: PrismaClient) => {
  const alice = await prisma.user.create({
    data: { id: 'alice-id', name: 'Alice', email: 'alice@test.com' },
  });
  const bob = await prisma.user.create({
    data: { id: 'bob-id', name: 'Bob', email: 'bob@test.com' },
  });
  const conversation = await prisma.conversation.create({
    data: {
      type: 'ONE_TO_ONE',
      participants: {
        create: [
          { userId: 'alice-id', role: 'MEMBER' },
          { userId: 'bob-id', role: 'MEMBER' },
        ],
      },
    },
  });
  const originalMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: 'bob-id',
      content: 'Hello from Bob',
    },
  });
  return { alice, bob, conversation, originalMessage };
};
```

### Frontend Mocks

```typescript
// /frontend/tests/__mocks__/message-actions.mock.ts

export const mockMessage = {
  id: 'msg-1',
  content: 'Hello World',
  senderId: 'alice-id',
  createdAt: new Date().toISOString(),
  replyToId: null,
  replyTo: null,
  pinnedAt: null,
  deletedAt: null,
};

export const mockMessageWithReply = {
  ...mockMessage,
  id: 'msg-2',
  content: 'Got it!',
  replyToId: 'msg-1',
  replyTo: {
    id: 'msg-1',
    content: 'Hello World',
    sender: { id: 'bob-id', name: 'Bob' },
  },
};

export const mockDeleteMessageMutation = {
  request: {
    query: DELETE_MESSAGE_MUTATION,
    variables: { messageId: 'msg-1', scope: 'EVERYONE' },
  },
  result: { data: { deleteMessage: true } },
};
```

---

## 六、Socket.io 事件規格

以下事件需要在 Backend 實作並在 Frontend 監聽：

| 事件名稱 | 方向 | Payload | 觸發時機 |
|---------|------|---------|---------|
| `message:pinned` | Server → Client | `{ messageId: string, conversationId: string, pinnedAt: string }` | `pinMessage` mutation 成功後 |
| `message:unpinned` | Server → Client | `{ messageId: string, conversationId: string }` | `unpinMessage` mutation 成功後 |
| `message:deleted` | Server → Client | `{ messageId: string, conversationId: string, scope: 'OWN' \| 'EVERYONE' }` | `deleteMessage` mutation 成功後 |
| `message:forwarded` | Server → Client | `{ newMessageId: string, targetConversationId: string }` | `forwardMessage` mutation 成功後（廣播至目標對話 room）|

---

## 七、測試覆蓋率目標

| 模組 | 目標覆蓋率 | 備注 |
|------|-----------|------|
| Backend resolvers（message-actions）| > 90% | 含所有 mutation + guard |
| Frontend `MessageBubbleWrapper` | > 85% | hover、right-click、key 事件 |
| Frontend `MessageContextMenu` | > 85% | 選項點擊、位置計算、overflow 防護 |
| Frontend `ReplyQuoteBlock` | > 90% | border 顏色邏輯為核心 |
| Frontend `DeleteMessageModal` | > 85% | 兩個 scope 分支 |
| Mobile `MessageBubbleWrapper.native` | > 85% | gesture 閾值判斷 |
| Mobile `MessageActionSheet` | > 85% | 所有 6 個選項 + 狀態分支 |
| Shared `chatActionsStore` | > 90% | multi-select 狀態機 |
