/**
 * User Integration Tests — Feature 1.2.2
 *
 * Test Coverage:
 *  TC-U-01: Authenticated user gets full me data
 *  TC-U-02: Unauthenticated me query returns UNAUTHENTICATED error
 *  TC-U-03: me.isOnline reflects Redis presence state
 *  TC-U-04: updateProfile — success with new name
 *  TC-U-05: updateProfile — success with new image URL
 *  TC-U-06: updateProfile without auth returns UNAUTHENTICATED
 *  TC-U-07: updateProfile with name > 50 chars returns BAD_USER_INPUT
 *  TC-U-08: updateProfile with empty string name returns BAD_USER_INPUT
 *  TC-U-09: updateProfile with invalid image URL returns BAD_USER_INPUT
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { PrismaClient } from "@generated/prisma/client"
import { createTestPrismaClient, cleanupTestPrisma } from "@tests/fixtures/prisma"
import {
    executeGraphQL,
    createTestUserWithSession,
    parseGraphQLResponse,
} from "@tests/fixtures/graphql"
import { redis } from "@/lib/redis"

describe("User Queries & Mutations (Feature 1.2.2)", () => {
    let testPrisma: PrismaClient

    beforeEach(() => {
        testPrisma = createTestPrismaClient()
    })

    afterEach(async () => {
        await cleanupTestPrisma(testPrisma)

        // Clean up any Redis keys created during tests
        const keys = await redis.keys("user:online:*")
        if (keys.length > 0) {
            await redis.del(...keys)
        }
    })

    // =========================================================================
    // me Query (TC-U-01 ~ TC-U-03)
    // =========================================================================

    /**
     * TC-U-01: Authenticated user gets full me data
     * Verifies: id, name, email, image, createdAt, isOnline all returned.
     */
    test("TC-U-01: me returns complete user data for authenticated user", async () => {
        const { user, sessionToken } = await createTestUserWithSession(testPrisma)

        const response = await executeGraphQL(
            `query {
                me {
                    id
                    email
                    name
                    image
                    createdAt
                    isOnline
                }
            }`,
            undefined,
            sessionToken
        )

        expect(response.status).toBe(200)

        const result = await parseGraphQLResponse<{ me: unknown }>(response)
        expect(result.errors).toBeUndefined()

        const me = result.data?.me as {
            id: string
            email: string
            name: string | null
            image: string | null
            createdAt: string
            isOnline: boolean
        }

        expect(me).toBeDefined()
        expect(me.id).toBe(user.id)
        expect(me.email).toBe(user.email)
        expect(me.name).toBe(user.name)
        expect(me.image).toBeNull()
        expect(typeof me.createdAt).toBe("string")
        expect(new Date(me.createdAt).toISOString()).toBe(user.createdAt.toISOString())
        expect(typeof me.isOnline).toBe("boolean")
    })

    /**
     * TC-U-02: Unauthenticated me query returns UNAUTHENTICATED
     */
    test("TC-U-02: me returns UNAUTHENTICATED error when not logged in", async () => {
        const response = await executeGraphQL(`query { me { id email } }`)

        expect(response.status).toBe(200)

        const result = await parseGraphQLResponse(response)
        expect(result.errors).toBeDefined()
        expect(result.errors?.length).toBeGreaterThan(0)
        expect(result.errors?.[0]?.message).toBe("Not authenticated")
        expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED")
    })

    /**
     * TC-U-03: me.isOnline reflects Redis presence
     */
    test("TC-U-03: me.isOnline reflects current Redis presence key", async () => {
        const { user, sessionToken } = await createTestUserWithSession(testPrisma)

        // Ensure offline first
        await redis.del(`user:online:${user.id}`)

        const offlineResponse = await executeGraphQL(
            `query { me { id isOnline } }`,
            undefined,
            sessionToken
        )
        const offlineResult = await parseGraphQLResponse<{
            me: { id: string; isOnline: boolean }
        }>(offlineResponse)
        expect(offlineResult.errors).toBeUndefined()
        expect(offlineResult.data?.me.isOnline).toBe(false)

        // Set online
        await redis.setex(`user:online:${user.id}`, 35, "true")

        const onlineResponse = await executeGraphQL(
            `query { me { id isOnline } }`,
            undefined,
            sessionToken
        )
        const onlineResult = await parseGraphQLResponse<{
            me: { id: string; isOnline: boolean }
        }>(onlineResponse)
        expect(onlineResult.errors).toBeUndefined()
        expect(onlineResult.data?.me.isOnline).toBe(true)
    })

    // =========================================================================
    // updateProfile Mutation (TC-U-04 ~ TC-U-09)
    // =========================================================================

    /**
     * TC-U-04: updateProfile — success with new name
     */
    test("TC-U-04: updateProfile successfully updates user name", async () => {
        const { user, sessionToken } = await createTestUserWithSession(testPrisma)
        const newName = "Updated Name"

        const response = await executeGraphQL(
            `mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                    name
                    image
                }
            }`,
            { input: { name: newName } },
            sessionToken
        )

        expect(response.status).toBe(200)

        const result = await parseGraphQLResponse<{
            updateProfile: { id: string; name: string | null; image: string | null }
        }>(response)
        expect(result.errors).toBeUndefined()
        expect(result.data?.updateProfile).toBeDefined()
        expect(result.data?.updateProfile.id).toBe(user.id)
        expect(result.data?.updateProfile.name).toBe(newName)

        // Verify persisted in database
        const updated = await testPrisma.user.findUnique({ where: { id: user.id } })
        expect(updated?.name).toBe(newName)
    })

    /**
     * TC-U-05: updateProfile — success with new image URL
     */
    test("TC-U-05: updateProfile successfully updates avatar image URL", async () => {
        const { user, sessionToken } = await createTestUserWithSession(testPrisma)
        const newImage = "https://example.com/avatar.png"

        const response = await executeGraphQL(
            `mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                    name
                    image
                }
            }`,
            { input: { image: newImage } },
            sessionToken
        )

        expect(response.status).toBe(200)

        const result = await parseGraphQLResponse<{
            updateProfile: { id: string; name: string | null; image: string | null }
        }>(response)
        expect(result.errors).toBeUndefined()
        expect(result.data?.updateProfile.image).toBe(newImage)

        // Verify persisted
        const updated = await testPrisma.user.findUnique({ where: { id: user.id } })
        expect(updated?.image).toBe(newImage)
    })

    /**
     * TC-U-06: updateProfile without auth returns UNAUTHENTICATED
     */
    test("TC-U-06: updateProfile returns UNAUTHENTICATED when not logged in", async () => {
        const response = await executeGraphQL(
            `mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                }
            }`,
            { input: { name: "New Name" } }
        )

        expect(response.status).toBe(200)

        const result = await parseGraphQLResponse(response)
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED")
    })

    /**
     * TC-U-07: updateProfile with name > 50 chars returns BAD_USER_INPUT
     */
    test("TC-U-07: updateProfile rejects name longer than 50 characters", async () => {
        const { sessionToken } = await createTestUserWithSession(testPrisma)
        const tooLongName = "A".repeat(51)

        const response = await executeGraphQL(
            `mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                }
            }`,
            { input: { name: tooLongName } },
            sessionToken
        )

        expect(response.status).toBe(200)

        const result = await parseGraphQLResponse(response)
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT")
    })

    /**
     * TC-U-08: updateProfile with empty string name returns BAD_USER_INPUT
     */
    test("TC-U-08: updateProfile rejects empty string as name", async () => {
        const { sessionToken } = await createTestUserWithSession(testPrisma)

        const response = await executeGraphQL(
            `mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                }
            }`,
            { input: { name: "" } },
            sessionToken
        )

        expect(response.status).toBe(200)

        const result = await parseGraphQLResponse(response)
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT")
    })

    /**
     * TC-U-09: updateProfile with invalid image URL returns BAD_USER_INPUT
     */
    test("TC-U-09: updateProfile rejects non-URL string as image", async () => {
        const { sessionToken } = await createTestUserWithSession(testPrisma)

        const response = await executeGraphQL(
            `mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                }
            }`,
            { input: { image: "not-a-valid-url" } },
            sessionToken
        )

        expect(response.status).toBe(200)

        const result = await parseGraphQLResponse(response)
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT")
    })

    // =========================================================================
    // statusMessage & aestheticMode (TC-U-10 ~ TC-U-14)
    // =========================================================================

    /**
     * TC-U-10: updateProfile — success with statusMessage set to "Busy"
     */
    test("TC-U-10: updateProfile successfully sets statusMessage to Busy", async () => {
        const { user, sessionToken } = await createTestUserWithSession(testPrisma)

        const response = await executeGraphQL(
            `mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                    statusMessage
                }
            }`,
            { input: { statusMessage: "Busy" } },
            sessionToken
        )

        expect(response.status).toBe(200)

        const result = await parseGraphQLResponse<{
            updateProfile: { id: string; statusMessage: string | null }
        }>(response)
        expect(result.errors).toBeUndefined()
        expect(result.data?.updateProfile.id).toBe(user.id)
        expect(result.data?.updateProfile.statusMessage).toBe("Busy")

        // Verify persisted in database
        const updated = await testPrisma.user.findUnique({ where: { id: user.id } })
        expect(updated?.statusMessage).toBe("Busy")
    })

    /**
     * TC-U-11: updateProfile with statusMessage > 80 chars returns BAD_USER_INPUT
     */
    test("TC-U-11: updateProfile rejects statusMessage longer than 80 characters", async () => {
        const { sessionToken } = await createTestUserWithSession(testPrisma)
        const tooLongStatus = "A".repeat(81)

        const response = await executeGraphQL(
            `mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                }
            }`,
            { input: { statusMessage: tooLongStatus } },
            sessionToken
        )

        expect(response.status).toBe(200)

        const result = await parseGraphQLResponse(response)
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT")
    })

    /**
     * TC-U-12: updateProfile with empty string statusMessage clears the status (returns null)
     */
    test("TC-U-12: updateProfile clears statusMessage when empty string is provided", async () => {
        const { user, sessionToken } = await createTestUserWithSession(testPrisma)

        // First set a status message directly in the database
        await testPrisma.user.update({
            where: { id: user.id },
            data: { statusMessage: "Previous status" },
        })

        // Now clear it with an empty string via GraphQL
        const response = await executeGraphQL(
            `mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                    statusMessage
                }
            }`,
            { input: { statusMessage: "" } },
            sessionToken
        )

        expect(response.status).toBe(200)

        const result = await parseGraphQLResponse<{
            updateProfile: { id: string; statusMessage: string | null }
        }>(response)
        expect(result.errors).toBeUndefined()
        expect(result.data?.updateProfile.statusMessage).toBeNull()

        // Verify cleared in database
        const updated = await testPrisma.user.findUnique({ where: { id: user.id } })
        expect(updated?.statusMessage).toBeNull()
    })

    /**
     * TC-U-13: updateProfile — success switching aestheticMode to "minimal"
     */
    test("TC-U-13: updateProfile successfully switches aestheticMode to minimal", async () => {
        const { user, sessionToken } = await createTestUserWithSession(testPrisma)

        const response = await executeGraphQL(
            `mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                    aestheticMode
                }
            }`,
            { input: { aestheticMode: "minimal" } },
            sessionToken
        )

        expect(response.status).toBe(200)

        const result = await parseGraphQLResponse<{
            updateProfile: { id: string; aestheticMode: string }
        }>(response)
        expect(result.errors).toBeUndefined()
        expect(result.data?.updateProfile.id).toBe(user.id)
        expect(result.data?.updateProfile.aestheticMode).toBe("minimal")

        // Verify persisted in database
        const updated = await testPrisma.user.findUnique({ where: { id: user.id } })
        expect(updated?.aestheticMode).toBe("minimal")
    })

    /**
     * TC-U-14: updateProfile with invalid aestheticMode ("dark") is rejected by GraphQL
     * enum validation at the schema layer — returns HTTP 400 before reaching the resolver
     */
    test("TC-U-14: updateProfile rejects invalid aestheticMode value dark", async () => {
        const { sessionToken } = await createTestUserWithSession(testPrisma)

        const response = await executeGraphQL(
            `mutation UpdateProfile($input: UpdateProfileInput!) {
                updateProfile(input: $input) {
                    id
                }
            }`,
            { input: { aestheticMode: "dark" } },
            sessionToken
        )

        // GraphQL enum validation happens at schema level → HTTP 400
        expect(response.status).toBe(400)
    })
})
