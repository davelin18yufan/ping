import Redis from "ioredis"

/**
 * Redis client for Ping messaging application
 *
 * Usage scenarios:
 * 1. Online Status - Track user presence (online/offline/away)
 * 2. Unread Count - Cache message unread counters for fast access
 * 3. Socket Mapping - Map user IDs to Socket.io connection IDs
 * 4. Rate Limiting - API rate limiting and throttling
 * 5. Session Cache - Temporary session data caching
 *
 * Key naming conventions (following resource:entity:id pattern):
 * - user:online:{userId} - User online status (STRING, persistent or with TTL)
 * - user:sockets:{userId} - Socket connection ID(s) (SET for multiple devices)
 * - user:unread:{userId}:{conversationId} - Unread message count (STRING)
 * - conversation:typing:{conversationId} - Users currently typing (SET with TTL)
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
 * Add user to typing indicator
 * @param conversationId - Conversation ID
 * @param userId - User ID
 * @param ttl - Time to live in seconds (default: 5 seconds)
 */
export async function addTypingUser(conversationId: string, userId: string, ttl: number = 5) {
    await redis.sadd(`conversation:typing:${conversationId}`, userId)
    await redis.expire(`conversation:typing:${conversationId}`, ttl)
}

/**
 * Remove user from typing indicator
 * @param conversationId - Conversation ID
 * @param userId - User ID
 */
export async function removeTypingUser(conversationId: string, userId: string) {
    await redis.srem(`conversation:typing:${conversationId}`, userId)
}

/**
 * Get all users currently typing in a conversation
 * @param conversationId - Conversation ID
 * @returns Array of user IDs
 */
export async function getTypingUsers(conversationId: string): Promise<string[]> {
    return await redis.smembers(`conversation:typing:${conversationId}`)
}

/**
 * Gracefully disconnect from Redis
 */
export async function disconnectRedis() {
    await redis.quit()
    console.log("👋 Redis disconnected")
}
