# Feature 1.2.1: 搜尋與加好友 — TDD 測試規格

> **文件類型**: TDD Red Phase — 測試規格（尚未實作）
> **建立日期**: 2026-02-16
> **負責 Agent**: Architect Agent
> **狀態**: 🔴 RED Phase（等待 Backend + Frontend 實作）

---

## 一、功能概述

Feature 1.2.1 實作「搜尋使用者」與「好友邀請管理」功能，包含：

- **Backend (GraphQL)**：
  - `searchUsers` — 按名稱或 email 搜尋使用者（排除自己，最多 20 筆）
  - `sendFriendRequest` — 發送好友邀請
  - `acceptFriendRequest` — 接受好友邀請
  - `rejectFriendRequest` — 拒絕好友邀請
  - `cancelFriendRequest` — 取消已發出的邀請
  - `friends` — 取得目前使用者的好友列表
  - `pendingFriendRequests` — 取得待確認的收到邀請
  - `sentFriendRequests` — 取得已發出的待確認邀請

- **Frontend Web (TanStack Start)**：
  - `/friends` 路由 — 好友列表頁面含搜尋列
  - 搜尋輸入元件（防抖 300ms，至少 2 個字元）
  - 搜尋結果列表（UserCard、頭像、姓名、加好友按鈕）
  - 好友邀請確認 / 待確認狀態 UI
  - AppHeader 通知徽章（待確認邀請數）

- **Shared**：
  - `useSearchUsers` hook（防抖 + Apollo useLazyQuery）
  - `useFriendActions` hook（sendRequest, accept, reject, cancel）
  - GraphQL fragments: User, FriendRequest, Friendship

---

## 二、資料庫 Schema 參考

現有 Prisma schema（`backend/prisma/schema.prisma`）中已有 `Friendship` model：

```prisma
model Friendship {
  id          String           @id @default(uuid())
  userId1     String           // 邀請者（請求方的 id 較小者）
  userId2     String           // 被邀請者（請求方的 id 較大者）
  status      FriendshipStatus @default(PENDING)
  requestedBy String           // 實際發出邀請的 userId
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  user1     User @relation("FriendshipUser1", ...)
  user2     User @relation("FriendshipUser2", ...)
  requester User @relation("FriendshipRequester", ...)

  @@unique([userId1, userId2])
}

enum FriendshipStatus {
  PENDING
  ACCEPTED
  REJECTED
}
```

**設計約定**：
- `userId1` 永遠是 UUID 排序較小的那方，`userId2` 是較大的那方，確保唯一性約束生效
- `requestedBy` 記錄實際發送邀請的 userId

---

## 三、GraphQL Schema 新增（目標）

```graphql
type FriendRequest {
  id: ID!
  sender: User!
  receiver: User!
  status: FriendshipStatus!
  createdAt: String!
  updatedAt: String!
}

type Friendship {
  id: ID!
  friend: User!        # 從當前使用者視角，另一方
  since: String!       # acceptedAt / updatedAt
}

enum FriendshipStatus {
  PENDING
  ACCEPTED
  REJECTED
}

extend type Query {
  searchUsers(query: String!): [User!]!
  friends: [User!]!
  pendingFriendRequests: [FriendRequest!]!
  sentFriendRequests: [FriendRequest!]!
}

extend type Mutation {
  sendFriendRequest(userId: ID!): FriendRequest!
  acceptFriendRequest(requestId: ID!): Friendship!
  rejectFriendRequest(requestId: ID!): Boolean!
  cancelFriendRequest(requestId: ID!): Boolean!
}
```

---

## 四、Backend 測試規格

**測試檔案位置**: `/backend/tests/integration/friends.spec.ts`

**測試框架**: Bun Test

**Fixtures 需求**:
```typescript
// 測試用戶 fixtures
const userAlice = { id: 'user-alice', email: 'alice@test.com', name: 'Alice Chen' }
const userBob   = { id: 'user-bob',   email: 'bob@test.com',   name: 'Bob Wang' }
const userCarol = { id: 'user-carol', email: 'carol@test.com', name: 'Carol Lin' }
```

---

### TC-B-01: searchUsers — 成功搜尋（名稱匹配）

```typescript
test('searchUsers returns matching users by name', async () => {
  // Arrange: Alice 已登入，DB 有 Bob 和 Carol
  const ctx = createTestContext({ userId: userAlice.id })

  // Act
  const result = await executeQuery(
    `query { searchUsers(query: "Bob") { id name email } }`,
    ctx
  )

  // Assert
  expect(result.errors).toBeUndefined()
  expect(result.data.searchUsers).toHaveLength(1)
  expect(result.data.searchUsers[0].name).toBe('Bob Wang')
  expect(result.data.searchUsers[0].id).toBe(userBob.id)
})
```

---

### TC-B-02: searchUsers — email 匹配

```typescript
test('searchUsers returns matching users by email', async () => {
  const ctx = createTestContext({ userId: userAlice.id })

  const result = await executeQuery(
    `query { searchUsers(query: "carol@test") { id name email } }`,
    ctx
  )

  expect(result.errors).toBeUndefined()
  expect(result.data.searchUsers).toHaveLength(1)
  expect(result.data.searchUsers[0].email).toBe('carol@test.com')
})
```

---

### TC-B-03: searchUsers — 不回傳自己

```typescript
test('searchUsers excludes the current user from results', async () => {
  const ctx = createTestContext({ userId: userAlice.id })

  const result = await executeQuery(
    `query { searchUsers(query: "alice") { id name } }`,
    ctx
  )

  expect(result.errors).toBeUndefined()
  expect(result.data.searchUsers).toHaveLength(0)
})
```

---

### TC-B-04: searchUsers — 查詢字串少於 2 個字元時回傳空陣列

```typescript
test('searchUsers returns empty array for query shorter than 2 chars', async () => {
  const ctx = createTestContext({ userId: userAlice.id })

  const result = await executeQuery(
    `query { searchUsers(query: "a") { id } }`,
    ctx
  )

  // 應該回傳空陣列（非錯誤），由 resolver 防護
  expect(result.errors).toBeUndefined()
  expect(result.data.searchUsers).toHaveLength(0)
})
```

---

### TC-B-05: sendFriendRequest — 成功發送邀請

```typescript
test('sendFriendRequest creates a PENDING friendship record', async () => {
  const ctx = createTestContext({ userId: userAlice.id })

  const result = await executeMutation(
    `mutation SendReq($userId: ID!) {
      sendFriendRequest(userId: $userId) {
        id
        status
        sender { id name }
        receiver { id name }
      }
    }`,
    { userId: userBob.id },
    ctx
  )

  expect(result.errors).toBeUndefined()
  expect(result.data.sendFriendRequest.status).toBe('PENDING')
  expect(result.data.sendFriendRequest.sender.id).toBe(userAlice.id)
  expect(result.data.sendFriendRequest.receiver.id).toBe(userBob.id)

  // 驗證 DB
  const friendship = await prisma.friendship.findFirst({
    where: { requestedBy: userAlice.id, status: 'PENDING' }
  })
  expect(friendship).not.toBeNull()
})
```

---

### TC-B-06: sendFriendRequest — 重複邀請回傳 409 錯誤

```typescript
test('sendFriendRequest returns CONFLICT error when request already exists', async () => {
  // Arrange: Alice 已發過邀請給 Bob
  await createPendingFriendship(userAlice.id, userBob.id)
  const ctx = createTestContext({ userId: userAlice.id })

  const result = await executeMutation(
    `mutation { sendFriendRequest(userId: "${userBob.id}") { id } }`,
    {},
    ctx
  )

  expect(result.errors).toBeDefined()
  expect(result.errors[0].extensions.code).toBe('CONFLICT')
  expect(result.errors[0].extensions.status).toBe(409)
})
```

---

### TC-B-07: sendFriendRequest — 對自己發送邀請回傳 400 錯誤

```typescript
test('sendFriendRequest returns BAD_REQUEST when sending to self', async () => {
  const ctx = createTestContext({ userId: userAlice.id })

  const result = await executeMutation(
    `mutation { sendFriendRequest(userId: "${userAlice.id}") { id } }`,
    {},
    ctx
  )

  expect(result.errors).toBeDefined()
  expect(result.errors[0].extensions.code).toBe('BAD_REQUEST')
  expect(result.errors[0].extensions.status).toBe(400)
})
```

---

### TC-B-08: acceptFriendRequest — 成功接受邀請

```typescript
test('acceptFriendRequest updates status to ACCEPTED and returns Friendship', async () => {
  // Arrange: Bob 收到 Alice 的邀請
  const friendship = await createPendingFriendship(userAlice.id, userBob.id)
  const ctx = createTestContext({ userId: userBob.id })

  const result = await executeMutation(
    `mutation AcceptReq($requestId: ID!) {
      acceptFriendRequest(requestId: $requestId) {
        id
        friend { id name }
        since
      }
    }`,
    { requestId: friendship.id },
    ctx
  )

  expect(result.errors).toBeUndefined()
  expect(result.data.acceptFriendRequest.friend.id).toBe(userAlice.id)

  // 驗證 DB 狀態變更
  const updated = await prisma.friendship.findUnique({ where: { id: friendship.id } })
  expect(updated?.status).toBe('ACCEPTED')
})
```

---

### TC-B-09: acceptFriendRequest — 非接收方嘗試接受回傳 403 錯誤

```typescript
test('acceptFriendRequest returns FORBIDDEN when requester tries to accept own request', async () => {
  const friendship = await createPendingFriendship(userAlice.id, userBob.id)
  const ctx = createTestContext({ userId: userAlice.id }) // Alice 是發送方，不能接受

  const result = await executeMutation(
    `mutation { acceptFriendRequest(requestId: "${friendship.id}") { id } }`,
    {},
    ctx
  )

  expect(result.errors).toBeDefined()
  expect(result.errors[0].extensions.code).toBe('FORBIDDEN')
  expect(result.errors[0].extensions.status).toBe(403)
})
```

---

### TC-B-10: rejectFriendRequest — 成功拒絕邀請

```typescript
test('rejectFriendRequest returns true and sets status to REJECTED', async () => {
  const friendship = await createPendingFriendship(userAlice.id, userBob.id)
  const ctx = createTestContext({ userId: userBob.id })

  const result = await executeMutation(
    `mutation { rejectFriendRequest(requestId: "${friendship.id}") }`,
    {},
    ctx
  )

  expect(result.errors).toBeUndefined()
  expect(result.data.rejectFriendRequest).toBe(true)

  const updated = await prisma.friendship.findUnique({ where: { id: friendship.id } })
  expect(updated?.status).toBe('REJECTED')
})
```

---

### TC-B-11: cancelFriendRequest — 成功取消已發送的邀請

```typescript
test('cancelFriendRequest deletes the PENDING record and returns true', async () => {
  const friendship = await createPendingFriendship(userAlice.id, userBob.id)
  const ctx = createTestContext({ userId: userAlice.id }) // 發送方才可取消

  const result = await executeMutation(
    `mutation { cancelFriendRequest(requestId: "${friendship.id}") }`,
    {},
    ctx
  )

  expect(result.errors).toBeUndefined()
  expect(result.data.cancelFriendRequest).toBe(true)

  const deleted = await prisma.friendship.findUnique({ where: { id: friendship.id } })
  expect(deleted).toBeNull()
})
```

---

### TC-B-12: friends — 回傳已接受的好友列表

```typescript
test('friends query returns only ACCEPTED friendships', async () => {
  // Arrange: Alice-Bob 已接受，Alice-Carol 仍 PENDING
  await createAcceptedFriendship(userAlice.id, userBob.id)
  await createPendingFriendship(userAlice.id, userCarol.id)
  const ctx = createTestContext({ userId: userAlice.id })

  const result = await executeQuery(
    `query { friends { id name } }`,
    ctx
  )

  expect(result.errors).toBeUndefined()
  expect(result.data.friends).toHaveLength(1)
  expect(result.data.friends[0].id).toBe(userBob.id)
})
```

---

### TC-B-13: pendingFriendRequests / sentFriendRequests — 分開回傳收到與發出的邀請

```typescript
test('pendingFriendRequests returns only received PENDING requests', async () => {
  // Bob 發邀請給 Alice，Carol 也發邀請給 Alice
  await createPendingFriendship(userBob.id, userAlice.id)
  await createPendingFriendship(userCarol.id, userAlice.id)
  const ctx = createTestContext({ userId: userAlice.id })

  const pending = await executeQuery(`query { pendingFriendRequests { id sender { id } } }`, ctx)
  expect(pending.data.pendingFriendRequests).toHaveLength(2)

  const sent = await executeQuery(`query { sentFriendRequests { id receiver { id } } }`, ctx)
  expect(sent.data.sentFriendRequests).toHaveLength(0)
})
```

---

### TC-B-14: 未認證使用者呼叫 friends 時回傳 401 錯誤

```typescript
test('friends query returns UNAUTHENTICATED error when no session', async () => {
  const ctx = createTestContext({ userId: null }) // 未認證

  const result = await executeQuery(`query { friends { id } }`, ctx)

  expect(result.errors).toBeDefined()
  expect(result.errors[0].extensions.code).toBe('UNAUTHENTICATED')
  expect(result.errors[0].extensions.status).toBe(401)
})
```

---

## 五、Frontend Web 測試規格

**測試檔案位置**:
- `/frontend/tests/integration/friends-page.spec.tsx` — 頁面整合測試
- `/frontend/tests/unit/hooks/useSearchUsers.spec.ts` — Hook 單元測試
- `/frontend/tests/unit/hooks/useFriendActions.spec.ts` — Hook 單元測試

**測試框架**: Vitest + React Testing Library + MSW

**Mocks 需求**:
```typescript
// MSW handlers for GraphQL
const searchUsersHandler = graphql.query('SearchUsers', (req, res, ctx) => {
  const { query } = req.variables
  const results = mockUsers.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase())
  )
  return res(ctx.data({ searchUsers: results }))
})

const sendFriendRequestHandler = graphql.mutation('SendFriendRequest', (req, res, ctx) => {
  return res(ctx.data({
    sendFriendRequest: {
      id: 'req-123',
      status: 'PENDING',
      sender: mockUserAlice,
      receiver: mockUserBob,
    }
  }))
})
```

---

### TC-F-01: FriendsPage 渲染正確的初始狀態

```typescript
test('FriendsPage renders search input and empty friends list on mount', async () => {
  render(<FriendsPage />, { wrapper: AppProviders })

  // 搜尋框應該存在
  expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument()

  // 初始時不顯示搜尋結果
  expect(screen.queryByTestId('search-results')).not.toBeInTheDocument()
})
```

---

### TC-F-02: useSearchUsers hook — 防抖 300ms 行為

```typescript
test('useSearchUsers debounces search query with 300ms delay', async () => {
  const { result } = renderHook(() => useSearchUsers(), { wrapper: ApolloProvider })

  // 快速輸入（不應立即觸發 query）
  act(() => { result.current.setQuery('Bo') })
  expect(result.current.loading).toBe(false)

  // 等待 300ms 後才觸發
  await act(async () => { await vi.advanceTimersByTimeAsync(300) })
  expect(result.current.loading).toBe(true)
})
```

---

### TC-F-03: useSearchUsers hook — 查詢少於 2 字元不觸發 API

```typescript
test('useSearchUsers does not call API for queries shorter than 2 chars', async () => {
  const searchSpy = vi.fn()
  server.use(
    graphql.query('SearchUsers', (req, res, ctx) => {
      searchSpy()
      return res(ctx.data({ searchUsers: [] }))
    })
  )

  const { result } = renderHook(() => useSearchUsers(), { wrapper: ApolloProvider })

  act(() => { result.current.setQuery('a') })
  await act(async () => { await vi.advanceTimersByTimeAsync(400) })

  expect(searchSpy).not.toHaveBeenCalled()
})
```

---

### TC-F-04: 搜尋結果顯示 UserCard

```typescript
test('search results render UserCard with name, avatar, and add-friend button', async () => {
  render(<FriendsPage />, { wrapper: AppProviders })

  const searchInput = screen.getByPlaceholderText(/search users/i)
  await userEvent.type(searchInput, 'Bob')

  // 等待防抖 + API 回應
  await waitFor(() => {
    expect(screen.getByTestId('user-card-user-bob')).toBeInTheDocument()
  }, { timeout: 600 })

  expect(screen.getByText('Bob Wang')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /add friend/i })).toBeInTheDocument()
})
```

---

### TC-F-05: useFriendActions hook — sendRequest 成功後按鈕變為 Pending 狀態

```typescript
test('sendFriendRequest changes button state to pending after success', async () => {
  render(<UserCard user={mockUserBob} />, { wrapper: AppProviders })

  const addButton = screen.getByRole('button', { name: /add friend/i })
  await userEvent.click(addButton)

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /pending/i })).toBeInTheDocument()
  })

  // 確認按鈕已禁用
  expect(screen.getByRole('button', { name: /pending/i })).toBeDisabled()
})
```

---

### TC-F-06: 好友邀請確認 UI — 接受與拒絕按鈕

```typescript
test('pending request card shows accept and reject buttons', async () => {
  // 模擬有待確認邀請
  server.use(
    graphql.query('PendingFriendRequests', (req, res, ctx) =>
      res(ctx.data({ pendingFriendRequests: [mockPendingRequest] }))
    )
  )

  render(<FriendsPage />, { wrapper: AppProviders })

  await waitFor(() => {
    expect(screen.getByTestId('pending-requests-section')).toBeInTheDocument()
  })

  expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
})
```

---

### TC-F-07: AppHeader 通知徽章顯示待確認邀請數

```typescript
test('AppHeader shows notification badge with pending request count', async () => {
  server.use(
    graphql.query('PendingFriendRequests', (req, res, ctx) =>
      res(ctx.data({ pendingFriendRequests: [mockPendingRequest, mockPendingRequest2] }))
    )
  )

  render(<AppHeader />, { wrapper: AppProviders })

  await waitFor(() => {
    const badge = screen.getByTestId('friend-request-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('2')
  })
})
```

---

### TC-F-08: useFriendActions hook — cancelFriendRequest 成功後恢復 Add Friend 按鈕

```typescript
test('cancelFriendRequest restores add-friend button after cancellation', async () => {
  // Arrange: 使用者已發出邀請
  server.use(
    graphql.query('SentFriendRequests', (req, res, ctx) =>
      res(ctx.data({ sentFriendRequests: [mockSentRequest] }))
    ),
    graphql.mutation('CancelFriendRequest', (req, res, ctx) =>
      res(ctx.data({ cancelFriendRequest: true }))
    )
  )

  render(<UserCard user={mockUserBob} existingRequestId="req-123" />, { wrapper: AppProviders })

  // 初始狀態應為 Pending（已有發送的邀請）
  const cancelButton = await screen.findByRole('button', { name: /cancel request/i })
  await userEvent.click(cancelButton)

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /add friend/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add friend/i })).toBeEnabled()
  })
})
```

---

### TC-F-09: 好友列表正確顯示已接受的好友

```typescript
test('friends list renders accepted friends with name and avatar', async () => {
  server.use(
    graphql.query('Friends', (req, res, ctx) =>
      res(ctx.data({ friends: [mockUserBob, mockUserCarol] }))
    )
  )

  render(<FriendsPage />, { wrapper: AppProviders })

  await waitFor(() => {
    expect(screen.getByText('Bob Wang')).toBeInTheDocument()
    expect(screen.getByText('Carol Lin')).toBeInTheDocument()
  })

  expect(screen.queryByText(/no friends yet/i)).not.toBeInTheDocument()
})
```

---

## 六、Shared Hooks 測試規格

**測試檔案位置**: `/frontend/tests/unit/hooks/`

### useSearchUsers Hook 規格

```typescript
// 期望的 hook interface
interface UseSearchUsersReturn {
  query: string
  setQuery: (q: string) => void
  results: User[]
  loading: boolean
  error: ApolloError | undefined
}
```

測試案例摘要：
- TC-F-02: 防抖 300ms
- TC-F-03: 少於 2 字元不觸發 API
- 空查詢時清空結果
- loading 狀態正確切換
- API 錯誤時 error 物件填入

### useFriendActions Hook 規格

```typescript
// 期望的 hook interface
interface UseFriendActionsReturn {
  sendRequest: (userId: string) => Promise<FriendRequest>
  acceptRequest: (requestId: string) => Promise<Friendship>
  rejectRequest: (requestId: string) => Promise<boolean>
  cancelRequest: (requestId: string) => Promise<boolean>
  loading: boolean
  error: ApolloError | undefined
}
```

---

## 七、GraphQL Fragments（Shared）

新增至 `/shared/graphql/fragments/` 或 `/frontend/src/graphql/`：

```graphql
fragment UserBasicFields on User {
  id
  name
  email
  image
}

fragment FriendRequestFields on FriendRequest {
  id
  status
  createdAt
  sender {
    ...UserBasicFields
  }
  receiver {
    ...UserBasicFields
  }
}

fragment FriendshipFields on Friendship {
  id
  friend {
    ...UserBasicFields
  }
  since
}
```

---

## 八、錯誤碼規範

| 情境 | HTTP Status | GraphQL Error Code |
|------|-------------|-------------------|
| 未認證 | 401 | `UNAUTHENTICATED` |
| 對自己送邀請 | 400 | `BAD_REQUEST` |
| 非接收方接受 | 403 | `FORBIDDEN` |
| 邀請已存在 | 409 | `CONFLICT` |
| 邀請不存在 | 404 | `NOT_FOUND` |
| 已為好友 | 409 | `CONFLICT` |

---

## 九、驗收標準

### Backend
- [ ] 所有 14 個 Backend 測試通過（TC-B-01 至 TC-B-14）
- [ ] `searchUsers` 最多回傳 20 筆
- [ ] `searchUsers` 不回傳自己
- [ ] `sendFriendRequest` 防止重複邀請（409）
- [ ] `acceptFriendRequest` 驗證接收方身份（403）
- [ ] `cancelFriendRequest` 驗證發送方身份（403）
- [ ] 所有 mutations 需要認證（401）
- [ ] Prisma 使用正確的 userId1/userId2 排序確保唯一性

### Frontend Web
- [ ] 所有 9 個 Frontend 測試通過（TC-F-01 至 TC-F-09）
- [ ] 搜尋防抖 300ms 正確運作
- [ ] 少於 2 字元不觸發 API
- [ ] UserCard 正確顯示好友請求狀態（Add Friend / Pending / Cancel / Friends）
- [ ] AppHeader 徽章顯示待確認邀請數
- [ ] 無硬編碼顏色（使用 Design Tokens）
- [ ] Dark / Light Mode 皆正確顯示

### Shared
- [ ] `useSearchUsers` hook 含防抖邏輯
- [ ] `useFriendActions` hook 包含所有 4 個操作
- [ ] GraphQL fragments 定義完整
- [ ] TypeScript 類型完整（0 errors）

---

## 十、實作說明（Backend Agent 參考）

### 搜尋實作提示

```typescript
// backend/src/graphql/resolvers/friends.ts
searchUsers: async (_, { query }, ctx) => {
  if (!ctx.userId) throw new UnauthenticatedError()
  if (query.trim().length < 2) return []

  return ctx.prisma.user.findMany({
    where: {
      AND: [
        { id: { not: ctx.userId } },  // 排除自己
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ]
        }
      ]
    },
    take: 20,
  })
}
```

### userId1/userId2 排序慣例

```typescript
// 確保 userId1 < userId2（字串排序），符合 @@unique([userId1, userId2])
function normalizeFriendshipIds(idA: string, idB: string) {
  return idA < idB
    ? { userId1: idA, userId2: idB }
    : { userId1: idB, userId2: idA }
}
```

---

## 十一、依賴關係

| 前置條件 | 狀態 |
|---------|------|
| Feature 1.0.1 Backend 基礎設施（GraphQL + Prisma） | ✅ 完成 |
| Feature 1.0.2 Frontend 基礎設施（Apollo Client） | ✅ 完成 |
| Feature 1.2.0 AppHeader 元件（徽章整合點） | ✅ 完成 |
| Prisma `Friendship` model | ✅ 已在 schema.prisma 定義 |

---

*文件由 Architect Agent 建立於 2026-02-16*
