import Redis from "ioredis"

/**
 * Redis client for Ping messaging application
 *
 * Key families:
 *
 * @group Presence Display
 * `user:online:{userId}` STRING — "true" with TTL 35 s (heartbeat) or no TTL (socket-tied).
 * Drives the green dot in the UI. Expires automatically when client stops heartbeating.
 *
 * @group Cross-Device Socket Index
 * `user:sockets:{userId}` SET — all active Socket.io connection IDs for a user.
 * Lets the server know whether any device is still connected before clearing presence.
 *
 * @group Unread Badge Count
 * `user:unread:{userId}:{conversationId}` STRING (integer) — incremented on new message,
 * reset to 0 when the conversation is opened. Used to render notification badges.
 *
 * @group Typing Indicators
 * `typing:{conversationId}:{userId}` STRING — "1" with TTL 8 s.
 * Each typist has an independent countdown; no shared-expiry race condition.
 */

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

export const redis = new Redis(REDIS_URL, {
    retryStrategy(times) {
        // exponential backoff
        const delay = Math.min(times * 50, 2000)
        console.log(`🔄 Redis reconnecting... attempt ${times}, delay ${delay}ms`)
        return delay
    },
    maxRetriesPerRequest: 3,
    // Enable offline queue (queue commands when disconnected)
    enableOfflineQueue: true,
    connectTimeout: 10000,
    // Lazy connect (don't connect immediately, wait for first command)
    lazyConnect: false,
})

// Event handlers
redis.on("connect", () => {
    console.log("✅ Redis connected successfully")
})

redis.on("ready", () => {
    console.log("🚀 Redis ready to accept commands")
})

redis.on("error", (error) => {
    console.error("❌ Redis connection error:", error.message)
})

redis.on("close", () => {
    console.log("⚠️  Redis connection closed")
})

redis.on("reconnecting", (timeUntilReconnect: number) => {
    console.log(`🔄 Redis reconnecting in ${timeUntilReconnect}ms...`)
})

/**
 * Helper functions for common Redis operations
 */

/**
 * Set user online status with TTL (for heartbeat scenarios)
 * @param userId - User ID
 * @param ttl - Time to live in seconds (default: 30 seconds)
 */
export async function setUserOnline(userId: string, ttl: number = 30) {
    await redis.setex(`user:online:${userId}`, ttl, "true")
}

/**
 * Set user online status without TTL (for socket connection scenarios)
 * Use this when the online status should persist as long as socket is connected
 * @param userId - User ID
 */
export async function setPersistentUserOnline(userId: string) {
    await redis.set(`user:online:${userId}`, "true")
}

/**
 * Check if user is online
 * @param userId - User ID
 * @returns true if online, false otherwise
 */
export async function isUserOnline(userId: string): Promise<boolean> {
    const status = await redis.get(`user:online:${userId}`)
    return status === "true"
}

/**
 * Remove user online status
 * @param userId - User ID
 */
export async function setUserOffline(userId: string) {
    await redis.del(`user:online:${userId}`)
}

/**
 * Map user to socket connection ID
 * @param userId - User ID
 * @param socketId - Socket.io connection ID
 */
export async function addUserSocket(userId: string, socketId: string) {
    await redis.sadd(`user:sockets:${userId}`, socketId)
}

/**
 * Remove socket connection mapping
 * @param userId - User ID
 * @param socketId - Socket.io connection ID
 */
export async function removeUserSocket(userId: string, socketId: string) {
    await redis.srem(`user:sockets:${userId}`, socketId)
}

/**
 * Get all socket IDs for a user (for multiple devices)
 * @param userId - User ID
 * @returns Array of socket IDs
 */
export async function getUserSockets(userId: string): Promise<string[]> {
    return await redis.smembers(`user:sockets:${userId}`)
}

/**
 * Increment unread message count
 * @param userId - User ID
 * @param conversationId - Conversation ID
 * @returns New unread count
 */
export async function incrementUnreadCount(
    userId: string,
    conversationId: string
): Promise<number> {
    return await redis.incr(`user:unread:${userId}:${conversationId}`)
}

/**
 * Get unread message count
 * @param userId - User ID
 * @param conversationId - Conversation ID
 * @returns Unread count
 */
export async function getUnreadCount(userId: string, conversationId: string): Promise<number> {
    const count = await redis.get(`user:unread:${userId}:${conversationId}`)
    return count ? parseInt(count, 10) : 0
}

/**
 * Reset unread message count
 * @param userId - User ID
 * @param conversationId - Conversation ID
 */
export async function resetUnreadCount(userId: string, conversationId: string) {
    await redis.del(`user:unread:${userId}:${conversationId}`)
}

/**
 * Set a per-user typing indicator key with TTL.
 * Key pattern: typing:{conversationId}:{userId}
 *
 * @param conversationId - Conversation ID
 * @param userId - Typing user ID
 * @param ttl - Time to live in seconds (default: 8 seconds)
 */
export async function setTypingIndicator(
    conversationId: string,
    userId: string,
    ttl: number = 8
): Promise<void> {
    await redis.setex(`typing:${conversationId}:${userId}`, ttl, "1")
}

/**
 * Delete a per-user typing indicator key.
 * Key pattern: typing:{conversationId}:{userId}
 *
 * @param conversationId - Conversation ID
 * @param userId - Typing user ID
 */
export async function clearTypingIndicator(conversationId: string, userId: string): Promise<void> {
    await redis.del(`typing:${conversationId}:${userId}`)
}

/**
 * Delete a per-user typing indicator key if it exists, and report whether it was present.
 *
 * Redis DEL returns the number of keys actually deleted (0 or 1), which makes it an
 * atomic check-and-delete. The caller can use the return value to decide whether to
 * broadcast a typing:update { isTyping: false } — avoiding spurious broadcasts to rooms
 * where the user was never typing.
 *
 * @param conversationId - Conversation ID
 * @param userId - Typing user ID
 * @returns true if the key existed and was deleted (user was actively typing)
 */
export async function clearTypingIndicatorIfExists(
    conversationId: string,
    userId: string
): Promise<boolean> {
    const deleted = await redis.del(`typing:${conversationId}:${userId}`)
    return deleted > 0
}

/**
 * Get all user IDs currently typing in a conversation.
 *
 * Scans Redis for `typing:{conversationId}:*` keys and extracts the userId
 * segment. Returns a Set for O(1) membership checks and uniqueness guarantee.
 *
 * @param conversationId - Conversation to query
 * @returns Set of user IDs with an active typing indicator
 */
export async function getActiveTypingUsers(conversationId: string): Promise<Set<string>> {
    const prefix = `typing:${conversationId}:`
    const keys = await redis.keys(`${prefix}*`)
    const userIds = keys.map((key) => key.slice(prefix.length)).filter(Boolean)
    return new Set(userIds)
}

/**
 * Gracefully disconnect from Redis
 */
export async function disconnectRedis() {
    await redis.quit()
    console.log("👋 Redis disconnected")
}
