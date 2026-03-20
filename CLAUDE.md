# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Ping - 即時通訊應用 Claude Code 工作指南

## 一、專案簡介
- **專案名稱**：Ping（Yahoo 即時通訊應用復刻）
- **目標**：現代技術棧、Web + Mobile 雙平台、強調即時性與安全性
- **技術選型**：
  - **Frontend (Web)**：TanStack Start + React 19 + TypeScript + Tailwind CSS 4
  - **Frontend (Mobile)**：React Native 0.81 (Expo 54) + Expo Router + TypeScript + **NativeWind**
  - **Backend**：Bun 1.3.5+ + Hono + GraphQL Yoga + Socket.io + Better Auth
  - **Database**：PostgreSQL + Prisma ORM
  - **Cache**：Redis（在線狀態、未讀計數、Socket 映射）
  - **Authentication**：Better Auth（OAuth 社交登入 + Magic Link 備援）

**重要提醒**：
- Mobile 開發**必須使用 NativeWind**（Tailwind CSS for React Native），不使用 `StyleSheet.create`
- Web 和 Mobile 使用相同的 Tailwind class names，提高程式碼共享度
- 開發要遵循經典的 git flow，不要互相汙染影響

---

## 二、總體工作流程（循環）

**這是 Ping 專案的核心開發循環，所有 agents 必須遵循**：

```
1. Architect 確認需求
   ↓
2. 建立/更新 MULTI_AGENT_PLAN.md
   ↓
3. 撰寫測試規格文件（Feature-X.X.X-TDD-Tests.md）
   ↓
4. 建立功能分支（feature/X.X.X-feature-name）
   ↓
5. 分配給 Backend Developer / Fullstack Frontend Developer 開發
   ↓
6. Developer 在分支上實作並通過測試
   ↓
7. 執行測試檢查（確保全部通過 ✅）
   ↓
8. Developer 提交 Pull Request
   ↓
9. Architect Review PR（檢查規格符合度、測試覆蓋率、程式碼品質）
   ↓
10. Review 通過 → Architect Merge PR
    ↓
11. Architect 更新 task-board.md（標記完成）
    ↓
12. 刪除功能分支
    ↓
13. 回到步驟 1（下一個功能）
```

### 各階段詳細說明

#### 步驟 1：Architect 確認需求
- 閱讀 `/docs/task-board.md` 確認當前優先級
- 理解功能需求與業務邏輯
- 更新 SDD 文件（`/docs/architecture/*.md`）

#### 步驟 2：建立/更新 MULTI_AGENT_PLAN.md
- 定義 Feature 編號（例如：Feature 1.1.1）
- 列出涉及的子系統（Backend、Frontend Web、Mobile、DB）
- 明確預期的 Resolvers / Components / Tables
- 設定優先度與依賴關係

#### 步驟 3：撰寫測試規格文件
- Skill: `/qa-test-planner`, `vitest`
- 建立 `Feature-X.X.X-TDD-Tests.md`
- 定義 Backend 測試案例（7+ 個）
- 定義 Frontend (Web) 測試案例（6+ 個）
- 定義 Frontend (Mobile) 測試案例（6+ 個）
- 包含：期望輸入/輸出、錯誤碼、邊界情況，須包含極端邊界情況，不能只考慮 Happy Path

#### 步驟 4：分配給開發者
- Backend Developer：實作 `/backend/**`
- Fullstack Frontend Developer：實作 `/frontend/**`（Web）+ `/mobile/**`（Mobile）
- 開發者遵循 TDD：先跑測試（紅燈）→ 實作（綠燈）→ 重構

#### 步驟 5：執行測試檢查
- Backend：`cd backend && bun test`
- Frontend：`cd frontend && pnpm test`
- Mobile：`cd mobile && pnpm test`
- **必須全部通過 ✅**，否則返回步驟 4

#### 步驟 6：更新 task-board.md
- Architect 確認所有測試通過
- 更新 `/docs/task-board.md` 對應功能狀態為「已完成 ✅」
- 更新進度統計
- 記錄完成時間

#### 步驟 7：循環
- 回到步驟 1，開始下一個功能
- 持續迭代直到 MVP 完成

### 重要原則
- 遵守 `/qa-test-planner` SKILL 設計測試
- 各技術框架要使用相對應存在的 SKILL
- ✅ **所有功能必須有測試規格才能開發**
- ✅ **所有測試必須通過才能標記完成**
- ✅ **task-board.md 是唯一的進度來源**
- ✅ **MULTI_AGENT_PLAN.md 管理當前 sprint 的 features**
- ✅ **每個 feature 完成後立即更新文件**

---

## 三、Agent 分工與職責

### Architect Agent（設計與協調）
**職責**：SDD 維護、API contract 定義、測試規格設計（TDD Red Phase）、多 agent 協調

**可操作**：
- `/docs/architecture/**` - SDD 文件（不寫實作）
- `/MULTI_AGENT_PLAN.md` - Feature 定義與分解
- `Feature-X.X.X-TDD-Tests.md` - 測試規格文件

**輸出物**：SDD 文件、測試規格（RED phase）、PR 審查、CI/CD 配置、task-board.md 更新
**規則**: 須遵守 `/qa-test-planner`, `/vitest` skill

---

### Backend Developer（後端實作）
**職責**：API、商業邏輯、資料庫、即時通訊（TDD Green Phase）

**可操作**：
- `/backend/**` - 所有後端程式碼（src、prisma、tests、migrations）

**禁止修改**：`/frontend/**`、`/mobile/**`、`/docs/**`

**輸出物**：Resolvers、Services、Middleware、Socket handlers、Prisma schema、測試實作

**注意**: 要往 DB 查詢資料須使用 docker 指令，因為資料庫運行在容器中

---

### Fullstack Frontend Developer（雙平台前端）
**職責**：Web + Mobile 雙平台前端、共享程式碼抽取（TDD Green Phase）

**可操作**：
- `/frontend/**` - Web 前端（TanStack Start）
- `/mobile/**` - Mobile 前端（React Native + Expo）
- `/shared/**` - 共享程式碼（types、graphql、stores、hooks）

**禁止修改**：`/backend/**`、`/docs/**`

**輸出物**：
- **Web**: TanStack Start 路由、元件、Apollo Client、Socket.io
- **Mobile**: React Native 畫面、Expo Router、NativeWind 樣式、Deep Link
- **共享**: TypeScript 類型、GraphQL 操作、TanStack Store、自訂 hooks
- **測試**: 單元 / 整合 / E2E 測試實作

**架構技術規範**
- React 須遵照 `/vercel-react-best-practices`
- React-Native 須遵照 `/vercel-react-native-best-practices`
- 框架架構則須遵照 `tanstack-start` , `tanstack-router` 的規範
- 請求主體用 `tanstack-query` 規範

**UI/UX 設計規範**：執行 `/web-design-guidelines` 和 `/frontend-design` Skills，遵守本文末 **Design Context** 與 `.impeccable.md` 的規範。

---

## 四、TDD + SDD 核心規則

### 規則 0：檢查現有結構（所有 Agents）
- ✅ **必須先探索現有檔案**：使用 Glob/Grep 檢查是否已有類似功能或可修改的檔案
- ✅ **必須先閱讀相關程式碼**：使用 Read 工具讀取相關檔案，理解現有架構
- ✅ **優先修改而非新增**：能修改現有檔案就不要新增全新模組
- ✅ **必須檢查命名慣例**：新檔案命名需符合專案現有慣例
- ❌ **禁止盲目新增檔案**：沒有探索專案結構就新增全新模組
- ❌ **禁止重複功能**：新增前必須確認沒有重複或類似的實作

### 規則 1：Architect 設計階段（RED Phase）
- ✅ **必須先有 SDD**：更新 `/docs/architecture/*.md` 完成設計
- ✅ **必須先有測試規格**：建立 `Feature-X.X.X-TDD-Tests.md`（包含 Backend、Web、Mobile 測試案例）
- ✅ **必須更新計畫**：更新 `MULTI_AGENT_PLAN.md`（feature、狀態、子系統、預期產出）
- ❌ **禁止跳過設計階段**：沒有 SDD 和測試規格不得開始實作

### 規則 2：Developer 實作階段（GREEN Phase）
- ✅ **必須先讀取設計**：閱讀 SDD 和測試規格文件
- ✅ **必須先跑測試確認紅燈**：執行測試 → 確認 FAIL ❌
- ✅ **必須讓測試變綠**：實作功能 → 執行測試 → 確認 PASS ✅
- ✅ **完成子任務後詢問 commit**：小步提交，頻繁 commit
- ❌ **禁止沒測試就實作**：先有紅燈測試，才能開始寫程式碼

### 規則 3：Frontend 共享程式碼優先（Shared-First）
- ✅ **優先抽取共享邏輯**：types、graphql、stores、hooks 放在 `/shared/`
- ✅ **Web + Mobile 共用邏輯**：避免重複程式碼
- ✅ **使用 NativeWind**：Mobile 使用與 Web 一致的 Tailwind class names
- ❌ **禁止重複實作**：相同邏輯必須共享，不得分別實作

### 規則 4：重構階段（REFACTOR Phase）
- ✅ **必須所有測試綠燈**：確認所有測試 PASS 後才能重構
- ✅ **重構後測試仍須綠燈**：改進程式碼不得破壞測試
- ✅ **檢查測試覆蓋率**：確保 >80% 覆蓋率
- ❌ **禁止破壞測試的重構**：測試變紅立即停止重構

### 規則 5：協作溝通
- ✅ **API Contract 一致**：Backend ↔ Frontend GraphQL schema 和 Socket.io events 必須同步
- ✅ **設計變更通知**：Architect 改 SDD 需通知所有相關 agents
- ✅ **發現設計問題立即回報**：Developer 發現 SDD 不合理立即通知 Architect
- ❌ **禁止自行修改設計**：Developer 不得自行更改 SDD，必須由 Architect 決定

### 規則 6：完成標準
- ✅ **所有測試綠燈**：Backend、Frontend (Web)、Frontend (Mobile) 測試全通過
- ✅ **程式碼品質檢查**：通過 Linter、Formatter、TypeScript 型別檢查
- ✅ **目錄邊界遵守**：Backend Agent 不碰 Frontend 檔案，Frontend Agent 不碰 Backend 檔案
- ✅ **更新文件**：更新 `MULTI_AGENT_PLAN.md` 和 `/docs/task-board.md`
- ❌ **禁止測試未過就標記完成**：任何測試失敗都不得標記為完成

---

## 五、Git 與分支策略

### 分支命名
```
feature/[功能名稱]-[agent]

例如：
- feature/google-oauth-backend
- feature/google-oauth-frontend
- feature/google-oauth-mobile
```

### Commit Message 格式
- 以 `[flag] message` 為主體撰寫
- 以英文撰寫，確保精準明確
- Flag 類型：
  - `[feat]` - 新功能
  - `[fix]` - Bug 修復
  - `[test]` - 新增或修改測試
  - `[refactor]` - 重構程式碼（不改變功能）
  - `[style]` - 樣式調整（格式化、CSS、UI）
  - `[docs]` - 文件更新
  - `[chore]` - 建置工具、依賴更新、設定檔
  - `[perf]` - 效能優化
  - `[review]` - Code review 相關

**範例**：
```bash
[feat] implement Google OAuth login mutation
[fix] correct session validation in auth middleware
[test] add integration tests for OAuth flow
[refactor] extract shared auth logic to service layer
[style] setup NativeWind for Mobile styling
[docs] update Feature-1.1.1-TDD-Tests.md with edge cases
[chore] setup Prisma schema and initial migration
```

### Commit 頻率與時機
**重要原則**：小步提交，頻繁 commit

**建議 commit 時機**：
1. ✅ 完成一個子任務後（例如：Prisma schema 設計完成）
2. ✅ 所有測試通過後（GREEN phase）
3. ✅ 重構完成後（REFACTOR phase）
4. ✅ 修復一個 bug 後
5. ✅ 新增一個完整的測試檔案後
6. ✅ 切換到不同功能前
7. ✅ 當前計劃階段結束

**每次 commit 前檢查**：
- [ ] 程式碼可以正常執行
- [ ] 相關測試通過
- [ ] 沒有 `console.log` 或除錯用程式碼
- [ ] 沒有 TODO/FIXME（或已建立對應 issue）
- [ ] Commit message 清楚描述變更內容

### Agent 提醒機制
**所有 Agent 在完成子任務後都應該**：
1. 總結完成的工作
2. 列出變更的檔案
3. 確認無誤之後跑 `linter` `formatter`才能 commit
3. 建議 commit message
4. **詢問使用者是否要 commit**

**提示範例**：
> "✅ Prisma schema 設計完成。所有 Better Auth 和業務 tables 已定義。
>
> Would you like to commit these changes?
>
> Suggested commit message: `[chore] setup Prisma schema with Better Auth integration`
>
> Files changed:
> - `/backend/prisma/schema.prisma`
> - `/backend/prisma/migrations/20250101000000_init/migration.sql`"

---

## 七、編碼規範與重要約定

### TypeScript + Naming
- 檔名：camelCase (utils.ts、authService.ts)
- 類型名稱：PascalCase (User、AuthResponse)
- 變數：camelCase
- 常數：CONSTANT_CASE

### 結構化錯誤處理
```typescript
// ✅ 好
try {
  const result = await authenticateWithGoogle(code);
  return result;
} catch (error) {
  logger.error('OAuth failed', { code, error });
  throw new AuthError('Invalid OAuth code', 401);
}

// ❌ 不好
try {
  // ...
} catch (e) {
  console.log('error');
  throw e;
}
```

### GraphQL 命名
- Query：單數或複數名詞，例如 `me`、`user`、`users`
- Mutation：動詞 + 名詞，例如 `sendFriendRequest`、`markMessagesAsRead`
- Subscription：過去分詞或 `on*` 前綴，例如 `messageReceived`

### 禁止事項
- ❌ 直接 console.log（使用結構化 logger）
- ❌ 跨目錄邊界修改（Backend Agent 不碰 Frontend 檔案）
- ❌ TODO / FIXME（完整實作後再提交）
- ❌ 未驗證的外部 API 調用
- ❌ 在業務邏輯層面做 UI 邏輯

### Linter & Formatter
- 前後端都使用 `Oxclint`, `Oxfmt` ，並且統一風格,可以細微個別設定
- 全部區塊分開設定以利將來拆分

### 前端 UI/UX 設計規範

**UI 工作前必須執行**：`/web-design-guidelines` → `/frontend-design` → 閱讀 `.impeccable.md`（設計 Context）。

**Design Token 同步規則**（新增/修改 token 時兩邊都要更新）：

| 平台 | 來源 | 格式 |
|------|------|------|
| Web | `@shared/design-tokens/css/*.css` | `var(--token)` |
| Mobile | `@shared/design-tokens/*.ts` | TS import |

**設計交付檢查**：
- [ ] 執行過 `/web-design-guidelines` 和 `/frontend-design`
- [ ] 使用 `.glass-button`、`.glass-card`、`.glass-input` 等設計系統 classes
- [ ] 無硬編碼顏色，無 inline styles，無重複樣式
- [ ] 圖示只用 Lucide React，無 emoji 圖示
- [ ] Hover 不造成 layout shift，Dark/Light 兩模式正確
- [ ] `prefers-reduced-motion` 有處理，WCAG AAA 對比度

---

## 七-1、開發環境配置

### Git Bash (MINGW64) 環境注意事項

**問題**：在 Git Bash 中執行 `npm` 或 `pnpm` 命令時，可能會遇到無輸出問題。

**原因**：在 Git Bash (MINGW64) 環境下，npm 和 pnpm 的 shell script 版本在非互動模式下不會輸出到 stdout。

**解決方案**：使用 `cmd.exe //C` 執行命令以獲得正確輸出。

**範例**：
```bash
# ❌ 在 Git Bash 可能無輸出
pnpm install
npm install

# ✅ 正確做法（確保有輸出）
cmd.exe //C "pnpm install"
cmd.exe //C "npm install"
cmd.exe //C "pnpm add package-name"
cmd.exe //C "npm run build"
```

**適用範圍**：
- 所有 `npm` 命令
- 所有 `pnpm` 命令
- 需要查看輸出的場景（安裝、建置、測試等）

**注意**：
- 此問題僅影響 Git Bash 環境
- 在 Windows CMD、PowerShell 或 Linux/macOS 終端機中可直接使用 `npm`/`pnpm`
- Claude Code 在 Git Bash 環境下執行 Bash 工具時應使用此方式

---

## 八、重要檔案與起點

### 立即查看
1. `/docs/architecture/overview.md` - SDD 總覽
2. `/docs/task-board` - 總計畫板
3. `/MULTI_AGENT_PLAN.md` - 當前任務面板

---

## 九、常見 Q&A

**Q：多個 agent 同時工作時如何避免衝突？**
A：靠 `/docs/architecture` 與 `MULTI_AGENT_PLAN.md` 的同步。每個 agent 只在自己的目錄邊界內操作，git branch 按功能分開。

**Q：發現 SDD 設計不合理怎麼辦？**
A：不要自作聰明修改，立即通知 Architect Agent，由 Architect 決定是否改設計。保持同步很重要。

**Q：測試規格還沒寫就發現需要改 Schema 怎麼辦？**
A：停止實作，立即通知 Architect Agent 更新測試規格與 SDD。TDD 的順序很重要：先設計 → 寫測試規格 → 實作。

**Q：怎麼知道目前的進度？**
A：看 `MULTI_AGENT_PLAN.md` 的狀態欄，每天更新。

---

### 共享程式碼策略
- Web 與 Mobile 可共享：`types/`、`graphql/`、`stores/`、`hooks/`
- 不可共享：UI 元件（Web 用 React DOM，Mobile 用 React Native）
- 使用 `/shared/` 目錄（可選）或直接在各子專案內管理

---

## 語言與溝通規範
- 對話總是用繁體中文回覆、唯有專有技術名詞以英文呈現（例如 GraphQL、Socket.io）
- 程式碼內容（包括 string）以及註解總是以英文撰寫(包括PR跟commit)
- 程式碼中不准出現表情符號
- 有疑慮的地方必須要發問
- 各技術框架要使用相對應存在的 SKILL

---

## Design Context

> Maintained by `/impeccable:teach-impeccable`. Full detail in `.impeccable.md`.

### Users
Close friends and intimate personal circles. Used in moments of genuine connection — checking in, sharing a laugh, making up, celebrating. Often one-handed, on a commute or sofa. The interface should feel like a familiar space that belongs to *this* relationship.

### Brand Personality
**溫暖 · 儀式感 · 親密** (Warm · Ritual · Intimate). Understated confidence. Makes small things feel special. A message sent is a moment, not a data transfer.

### Aesthetic Direction
macOS Glassmorphism — "Steel Frost" dark (`oklch(0.18 0.005 240)`) + "Kyoto Sunrise" warm light (`oklch(0.96 0.010 70)`). Messages blue primary (`oklch(0.60 0.18 250)`). Ritual colors: cyan (nudge), blue-purple (apology), gold (celebration), pink (reconciliation). Typography: Montserrat + Inter + JetBrains Mono. Spring physics animations via `motion/react`.

### Anti-References
- **Slack** — corporate, cold, transactional. No utility-first sterility.
- **LINE** — chaotic sticker culture, ad-cluttered, visually noisy. Fix the clutter, keep the warmth.
- **Pure minimalism** — white backgrounds, no animation, no personality. Restraint ≠ emptiness.

### Design Principles
1. **Ritual over Transaction** — Every interaction is a moment. The `InteractionEvent` pattern is the heart of this.
2. **Warm Precision** — Exact spacing, perfect timing, curated glassmorphism. Imprecise warmth is sloppiness.
3. **Clean ≠ Stripped** — Hierarchy and restraint, not removal. Every element earns its place.
4. **Depth through Layering** — Color, motion, and space communicate relationship state, not just messages.
5. **Both Platforms, One Soul** — Web glassmorphism and Mobile NativeWind feel like siblings. Same token, same soul.

### Current Priority
**Polish and refinement** — Architecture is solid. The gap between "works" and "delights" is in the details: consistent spacing, perfectly-timed micro-interactions, ritual animations that make users stop and notice.

### Technical Constraints (Design)
- OKLCH colors only. CSS relative color syntax: `oklch(from var(--token) l c h / 0.5)`.
- All tokens from `@shared/design-tokens`. No hardcoded colors in components.
- Icons: Lucide React only. No emoji as icons.
- Use `.glass-button`, `.glass-card`, `.glass-input`. Extend via `--interaction-color` pattern.
- Respect `prefers-reduced-motion` and `[data-aesthetic="minimal"]` in all animations.
- WCAG AAA target: contrast > 7:1, full keyboard nav, ARIA labels.
