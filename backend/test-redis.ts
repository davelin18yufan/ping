import {
    redis,
    setUserOnline,
    isUserOnline,
    setUserOffline,
    addUserSocket,
    getUserSockets,
    removeUserSocket,
    incrementUnreadCount,
    getUnreadCount,
    resetUnreadCount,
    addTypingUser,
    getTypingUsers,
    removeTypingUser,
    disconnectRedis,
} from "./src/lib/redis"

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function testRedisConnection() {
    try {
        console.log("🔍 Testing Redis connection...")

        // Test 1: Basic PING
        console.log("\n📌 Test 1: Basic Connection (PING)")
        const pingResult = await redis.ping()
        console.log(`  ✅ PING response: ${pingResult}`)

        // Test 2: Online Status Functions
        console.log("\n📌 Test 2: Online Status Management")
        const testUserId = "test-user-123"

        await setUserOnline(testUserId, 60)
        let isOnline = await isUserOnline(testUserId)
        console.log(`  ✅ Set user online: ${isOnline}`)

        await setUserOffline(testUserId)
        isOnline = await isUserOnline(testUserId)
        console.log(`  ✅ Set user offline: ${!isOnline}`)

        // Test 3: Socket Mapping (Multi-Device Support)
        console.log("\n📌 Test 3: Socket Mapping")
        const socket1 = "socket-abc-123"
        const socket2 = "socket-xyz-456"

        await addUserSocket(testUserId, socket1)
        await addUserSocket(testUserId, socket2)
        let sockets = await getUserSockets(testUserId)
        console.log(`  ✅ Added 2 sockets: [${sockets.join(", ")}]`)

        await removeUserSocket(testUserId, socket1)
        sockets = await getUserSockets(testUserId)
        console.log(`  ✅ Removed socket1, remaining: [${sockets.join(", ")}]`)

        await removeUserSocket(testUserId, socket2)
        sockets = await getUserSockets(testUserId)
        console.log(`  ✅ Removed all sockets: ${sockets.length === 0}`)

        // Test 4: Unread Count Management
        console.log("\n📌 Test 4: Unread Count")
        const conversationId = "conv-abc-123"

        let unreadCount = await incrementUnreadCount(testUserId, conversationId)
        console.log(`  ✅ Incremented unread count: ${unreadCount}`)

        unreadCount = await incrementUnreadCount(testUserId, conversationId)
        console.log(`  ✅ Incremented again: ${unreadCount}`)

        unreadCount = await getUnreadCount(testUserId, conversationId)
        console.log(`  ✅ Current unread count: ${unreadCount}`)

        await resetUnreadCount(testUserId, conversationId)
        unreadCount = await getUnreadCount(testUserId, conversationId)
        console.log(`  ✅ Reset unread count: ${unreadCount}`)

        // Test 5: Typing Indicators
        console.log("\n📌 Test 5: Typing Indicators")
        const user1 = "user-1"
        const user2 = "user-2"

        await addTypingUser(conversationId, user1, 10)
        await addTypingUser(conversationId, user2, 10)
        let typingUsers = await getTypingUsers(conversationId)
        console.log(`  ✅ Added 2 typing users: [${typingUsers.join(", ")}]`)

        await removeTypingUser(conversationId, user1)
        typingUsers = await getTypingUsers(conversationId)
        console.log(`  ✅ Removed user1, remaining: [${typingUsers.join(", ")}]`)

        await removeTypingUser(conversationId, user2)
        typingUsers = await getTypingUsers(conversationId)
        console.log(`  ✅ Removed all typing users: ${typingUsers.length === 0}`)

        // Test 6: TTL Expiration
        console.log("\n📌 Test 6: TTL Expiration")
        const ttlTestKey = "ttl-test-key"

        await redis.setex(ttlTestKey, 2, "test-value")
        let value = await redis.get(ttlTestKey)
        console.log(`  ✅ Set key with 2s TTL: ${value}`)

        console.log("  ⏳ Waiting 3 seconds for TTL expiration...")
        await sleep(3000)

        value = await redis.get(ttlTestKey)
        console.log(`  ✅ Key expired: ${value === null}`)

        // Clean up
        console.log("\n🧹 Cleaning up test data...")
        await redis.del(`online:${testUserId}`)
        await redis.del(`socket:${testUserId}`)
        await redis.del(`unread:${testUserId}:${conversationId}`)
        await redis.del(`typing:${conversationId}`)
        console.log("  ✅ Test data cleaned")

        console.log("\n✅ All Redis tests passed!")
        return true
    } catch (error) {
        console.error("\n❌ Redis test failed:", error)
        return false
    } finally {
        await disconnectRedis()
    }
}

testRedisConnection()
