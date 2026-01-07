# GitHub Secrets 設定清單

本文件列出 Ping 專案在 GitHub Actions CI/CD 中需要配置的所有 secrets。

## 如何設定 GitHub Secrets

1. 前往 GitHub repository 頁面
2. 點選 **Settings** > **Secrets and variables** > **Actions**
3. 點選 **New repository secret**
4. 輸入 Secret Name 和 Secret Value
5. 點選 **Add secret**

---

## Backend CI 所需 Secrets

### 1. `CI_DATABASE_URL`
- **用途**: CI 環境的 PostgreSQL 資料庫連線字串
- **必要性**: ✅ 必要（用於 Prisma Client 生成與測試）
- **建議值**:
  ```
  postgresql://postgres:postgres@localhost:5432/ping_test
  ```
- **說明**:
  - 此連線字串對應 workflow 中的 PostgreSQL service
  - 使用者名稱: `postgres`
  - 密碼: `postgres`
  - 資料庫名稱: `ping_test`
  - Host: `localhost` (因為 service 在同一個 runner 上)
  - Port: `5432`

---

### 2. `CI_REDIS_URL`
- **用途**: CI 環境的 Redis 連線字串
- **必要性**: ✅ 必要（用於快取與即時通訊測試）
- **建議值**:
  ```
  redis://localhost:6379
  ```
- **說明**:
  - 此連線字串對應 workflow 中的 Redis service
  - 預設無密碼
  - Host: `localhost`
  - Port: `6379`

---

### 3. `CI_BETTER_AUTH_SECRET`
- **用途**: Better Auth 加密 session 的密鑰
- **必要性**: ✅ 必要（用於認證測試）
- **建議值**:
  ```
  test-secret-key-for-ci-cd-pipeline-replace-with-random-string
  ```
- **說明**:
  - 此為測試環境用的密鑰，可使用較簡單的字串
  - **不應與生產環境的密鑰相同**
  - 建議長度: 至少 32 個字元
  - 可使用隨機生成器產生: `openssl rand -base64 32`

---

### 4. `CI_BETTER_AUTH_URL`
- **用途**: Better Auth 服務的 URL
- **必要性**: ✅ 必要（Better Auth 配置需要）
- **建議值**:
  ```
  http://localhost:3000
  ```
- **說明**:
  - CI 環境中的本地伺服器 URL
  - Better Auth 使用此 URL 生成 callback URLs 與 cookies

---

## 生產環境所需 Secrets（未來擴展）

當專案部署到生產環境時，需要額外配置以下 secrets：

### `PROD_DATABASE_URL`
- PostgreSQL 生產資料庫連線字串（含真實密碼）

### `PROD_REDIS_URL`
- Redis 生產環境連線字串（含真實密碼）

### `PROD_BETTER_AUTH_SECRET`
- Better Auth 生產環境密鑰（強隨機字串）

### `PROD_BETTER_AUTH_URL`
- Better Auth 生產環境 URL（例如 `https://api.ping.com`）

### OAuth Provider Secrets
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `GITHUB_CLIENT_ID` - GitHub OAuth Client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth Client Secret
- `APPLE_CLIENT_ID` - Apple OAuth Client ID
- `APPLE_CLIENT_SECRET` - Apple OAuth Client Secret

---

## 安全性注意事項

### ✅ 應該做的事
- 使用強隨機密鑰（生產環境）
- 定期更新敏感 secrets（每 90 天）
- 為 CI 和生產環境使用不同的 secrets
- 限制 secret 存取權限（只給需要的 workflows）

### ❌ 不應該做的事
- 不要在程式碼中硬編碼 secrets
- 不要在 commit message 或 PR 中暴露 secrets
- 不要在 CI logs 中 echo secrets
- 不要重複使用生產環境的 secrets 於 CI 環境

---

## 驗證設定

設定完成後，可透過以下方式驗證：

1. **觸發 CI 流程**:
   ```bash
   git push origin feature/your-branch
   ```

2. **檢查 workflow 執行狀態**:
   - 前往 GitHub repository > **Actions** tab
   - 查看最新的 workflow run
   - 確認所有 jobs 都成功執行 ✅

3. **常見錯誤排查**:
   - **Secret 未設定**: 會顯示空值或 workflow 失敗
   - **DATABASE_URL 格式錯誤**: Prisma 會報錯無法連線
   - **REDIS_URL 格式錯誤**: Redis client 會報錯

---

## 快速設定指令

如果你有 GitHub CLI (`gh`) 安裝，可使用以下指令快速設定：

```bash
# 設定 CI_DATABASE_URL
gh secret set CI_DATABASE_URL --body "postgresql://postgres:postgres@localhost:5432/ping_test"

# 設定 CI_REDIS_URL
gh secret set CI_REDIS_URL --body "redis://localhost:6379"

# 設定 CI_BETTER_AUTH_SECRET (請替換為隨機字串)
gh secret set CI_BETTER_AUTH_SECRET --body "$(openssl rand -base64 32)"

# 設定 CI_BETTER_AUTH_URL
gh secret set CI_BETTER_AUTH_URL --body "http://localhost:3000"
```

---

## 更新記錄

- **2026-01-07**: 初始版本，定義 Backend CI 所需的 4 個 secrets
- **未來**: 新增生產環境與 OAuth provider secrets

---

**維護者**: Backend Developer
**最後更新**: 2026-01-07
