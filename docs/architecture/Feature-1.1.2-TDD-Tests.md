# Feature 1.1.2: Session 管理 — TDD 測試規格

> **文件類型**: TDD Red Phase — 測試規格
> **建立日期**: 2026-02-24
> **負責 Agent**: Architect Agent
> **狀態**: 🔴 RED Phase → ⏳ 實作中

---

## 一、功能概述

Feature 1.1.2 實作「Session 管理」功能，讓使用者可以：

- **查詢所有 active sessions**（`sessions` Query）— 回傳所有裝置的登入狀態
- **撤銷特定 session**（`revokeSession` Mutation）— 登出特定裝置（不能撤銷自己）
- **撤銷所有其他 sessions**（`revokeAllSessions` Mutation）— 保留當前 session，登出所有其他裝置

---

## 二、Prisma Schema 異動

**需要將 `createdAt` 加入 Session model**（Better Auth 未預設此欄位）：

```prisma
model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  createdAt    DateTime @default(now())  // 新增

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

**Migration 指令**：`bun prisma migrate dev --name add-session-created-at`

---

## 三、GraphQL Schema 新增

```graphql
"""
Session information for a user's active login session.
"""
type SessionInfo {
  id: ID!
  userAgent: String
  ipAddress: String
  createdAt: String!
  expiresAt: String!
  isCurrent: Boolean!
}

extend type Query {
  """
  Get all active sessions for the current user.
  Requires valid session. Returns UNAUTHENTICATED if not logged in.
  """
  sessions: [SessionInfo!]!
}

extend type Mutation {
  """
  Revoke a specific session by ID. Cannot revoke the current session.
  Returns true on success.
  """
  revokeSession(sessionId: ID!): Boolean!

  """
  Revoke all sessions except the current one.
  Returns true on success.
  """
  revokeAllSessions: Boolean!
}
```

---

## 四、Context 更新

`GraphQLContext` 需要新增 `sessionId` 欄位，以支援 `isCurrent` 判斷：

```typescript
export interface GraphQLContext {
  userId: string | null
  sessionId: string | null  // 新增：當前 session 的 ID
  isAuthenticated: boolean
  prisma: PrismaClient
}
```

**Context 傳遞鏈**：
```
Cookie → verifySession() → { userId, sessionId }
→ sessionMiddleware (c.set "sessionId")
→ index.ts (request._sessionId = c.get("sessionId"))
→ buildGraphQLContext (context.sessionId = request._sessionId)
→ resolver (context.sessionId → isCurrent)
```

---

## 五、Backend 測試規格

**測試檔案位置**: `/backend/tests/integration/sessions.spec.ts`

**測試框架**: Bun Test

**Fixtures 需求**:
```typescript
const USER_ALICE = { id: 'user-alice', email: 'alice@test.com', name: 'Alice Chen' }
```

---

### TC-B-01: sessions — 取得當前使用者所有 sessions

```typescript
test('sessions query returns all active sessions for the current user', async () => {
  // Arrange: Alice 有 2 個 sessions（當前 + 另一裝置）
  const currentToken = await createSession(prisma, USER_ALICE.id)
  const otherToken   = await createSession(prisma, USER_ALICE.id)

  // Act
  const result = await query(`query { sessions { id expiresAt isCurrent } }`, currentToken)

  // Assert
  expect(result.errors).toBeUndefined()
  const sessions = result.data.sessions
  expect(sessions).toHaveLength(2)

  // 當前 session 有 isCurrent = true
  const current = sessions.find(s => s.isCurrent)
  expect(current).toBeDefined()

  // 另一個 session 有 isCurrent = false
  const other = sessions.find(s => !s.isCurrent)
  expect(other).toBeDefined()
})
```

---

### TC-B-02: sessions — 未認證回傳 UNAUTHENTICATED

```typescript
test('sessions query returns UNAUTHENTICATED when not logged in', async () => {
  const result = await query(`query { sessions { id } }`)

  expect(result.errors).toBeDefined()
  expect(result.errors[0].extensions.code).toBe('UNAUTHENTICATED')
  expect(result.errors[0].extensions.status).toBe(401)
})
```

---

### TC-B-03: revokeSession — 成功撤銷其他裝置的 session

```typescript
test('revokeSession deletes the specified session and returns true', async () => {
  // Arrange: Alice 有 2 個 sessions
  const currentToken = await createSession(prisma, USER_ALICE.id)
  const otherSession = await createSessionRecord(prisma, USER_ALICE.id)

  // Act
  const result = await mutation(
    `mutation { revokeSession(sessionId: "${otherSession.id}") }`,
    {},
    currentToken
  )

  // Assert
  expect(result.errors).toBeUndefined()
  expect(result.data.revokeSession).toBe(true)

  // Verify DB: the other session is deleted
  const deleted = await prisma.session.findUnique({ where: { id: otherSession.id } })
  expect(deleted).toBeNull()
})
```

---

### TC-B-04: revokeSession — 不能撤銷當前 session

```typescript
test('revokeSession returns FORBIDDEN when trying to revoke own current session', async () => {
  // Arrange: Alice 的當前 session
  const currentToken   = await createSession(prisma, USER_ALICE.id)
  const currentSession = await prisma.session.findUnique({ where: { sessionToken: currentToken } })

  // Act
  const result = await mutation(
    `mutation { revokeSession(sessionId: "${currentSession.id}") }`,
    {},
    currentToken
  )

  // Assert
  expect(result.errors).toBeDefined()
  expect(result.errors[0].extensions.code).toBe('FORBIDDEN')
  expect(result.errors[0].extensions.status).toBe(403)
})
```

---

### TC-B-05: revokeAllSessions — 保留當前，刪除其他所有

```typescript
test('revokeAllSessions deletes all sessions except the current one', async () => {
  // Arrange: Alice 有 3 個 sessions
  const currentToken = await createSession(prisma, USER_ALICE.id)
  await createSession(prisma, USER_ALICE.id)
  await createSession(prisma, USER_ALICE.id)

  // Act
  const result = await mutation(`mutation { revokeAllSessions }`, {}, currentToken)

  // Assert
  expect(result.errors).toBeUndefined()
  expect(result.data.revokeAllSessions).toBe(true)

  // Verify DB: only 1 session remains (the current one)
  const remaining = await prisma.session.findMany({ where: { userId: USER_ALICE.id } })
  expect(remaining).toHaveLength(1)
  expect(remaining[0].sessionToken).toBe(currentToken)
})
```

---

### TC-B-06: sessions — 只回傳未過期的 sessions

```typescript
test('sessions query excludes expired sessions', async () => {
  // Arrange: 1 active, 1 expired
  const currentToken = await createSession(prisma, USER_ALICE.id)
  await createExpiredSession(prisma, USER_ALICE.id)

  // Act
  const result = await query(`query { sessions { id } }`, currentToken)

  // Assert
  expect(result.errors).toBeUndefined()
  const sessions = result.data.sessions
  // Only active sessions should be returned
  expect(sessions).toHaveLength(1)
})
```

---

### TC-B-07: revokeSession — 撤銷不存在的 session 回傳 NOT_FOUND

```typescript
test('revokeSession returns NOT_FOUND for non-existent session', async () => {
  const currentToken = await createSession(prisma, USER_ALICE.id)

  const result = await mutation(
    `mutation { revokeSession(sessionId: "non-existent-session-id") }`,
    {},
    currentToken
  )

  expect(result.errors).toBeDefined()
  expect(result.errors[0].extensions.code).toBe('NOT_FOUND')
  expect(result.errors[0].extensions.status).toBe(404)
})
```

---

### TC-B-08: sessions — 只回傳自己的 sessions（不回傳其他使用者）

```typescript
test('sessions query returns only the current user sessions, not other users', async () => {
  // Arrange: Alice 有 1 session，Bob 有 1 session
  const aliceToken = await createSession(prisma, USER_ALICE.id)
  await createSession(prisma, USER_BOB.id) // Should NOT appear in Alice's result

  // Act
  const result = await query(`query { sessions { id } }`, aliceToken)

  // Assert
  expect(result.errors).toBeUndefined()
  expect(result.data.sessions).toHaveLength(1)
})
```

---

## 六、錯誤碼規範

| 情境 | HTTP Status | GraphQL Error Code |
|------|-------------|-------------------|
| 未認證 | 401 | `UNAUTHENTICATED` |
| 嘗試撤銷當前 session | 403 | `FORBIDDEN` |
| 撤銷不存在的 session | 404 | `NOT_FOUND` |

---

## 七、驗收標準

### Backend
- [ ] 所有 8 個 Backend 測試通過（TC-B-01 至 TC-B-08）
- [ ] `sessions` 只回傳未過期的 sessions
- [ ] `sessions` 只回傳當前使用者的 sessions
- [ ] `sessions` 包含正確的 `isCurrent` 判斷
- [ ] `revokeSession` 不能撤銷當前 session（FORBIDDEN）
- [ ] `revokeSession` 不存在回傳 NOT_FOUND
- [ ] `revokeAllSessions` 保留當前 session
- [ ] 所有操作需要認證（401）

---

## 八、依賴關係

| 前置條件 | 狀態 |
|---------|------|
| Feature 1.0.1 Backend 基礎設施（GraphQL + Prisma） | ✅ 完成 |
| Feature 1.1.1 認證系統（Better Auth + Session） | ✅ 完成 |
| Session Prisma model 存在 | ✅ 已在 schema.prisma 定義（需加 createdAt）|

---

*文件由 Architect Agent 建立於 2026-02-24*
