/**
 * Google OAuth Authentication Integration Tests
 *
 * Tests Feature 1.1.1 - OAuth Google Login
 *
 * Test Coverage:
 * 1. Valid OAuth code exchange for session
 * 2. Invalid OAuth code returns 401
 * 3. Repeated OAuth login returns same user
 * 4. Valid session created in database
 * 5. Missing code returns 400
 * 6. Session cookie for authenticated requests
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import type { PrismaClient } from "@generated/prisma/client"
import { createTestPrismaClient, cleanupTestPrisma } from "@tests/fixtures/prisma"
import { executeGraphQL, parseGraphQLResponse } from "@tests/fixtures/graphql"

describe("Google OAuth Authentication", () => {
    let testPrisma: PrismaClient

    beforeEach(() => {
        testPrisma = createTestPrismaClient()
    })

    afterEach(async () => {
        await cleanupTestPrisma(testPrisma)
    })

    describe("POST /graphql - authenticateWithGoogle mutation", () => {
        /**
         * Test 1: Valid OAuth code exchange for session
         */
        test("should exchange valid Google OAuth code for session", async () => {
            const googleCode = "valid_google_code_xyz123"

            const response = await executeGraphQL(
                `
                    mutation AuthenticateWithGoogle($code: String!) {
                        authenticateWithGoogle(code: $code) {
                            user {
                                id
                                email
                                displayName
                                avatarUrl
                            }
                            success
                            message
                            sessionToken
                        }
                    }
                `,
                { code: googleCode }
            )

            const json = await parseGraphQLResponse<{
                authenticateWithGoogle: {
                    user: { id: string; email: string; displayName: string; avatarUrl: string }
                    success: boolean
                    message: string
                    sessionToken: string
                }
            }>(response)

            // Verify response structure
            expect(response.status).toBe(200)
            expect(json.data).toBeDefined()
            expect(json.data?.authenticateWithGoogle).toBeDefined()

            // Verify user data
            if (!json.data) throw new Error("json.data is undefined")
            const authResponse = json.data.authenticateWithGoogle

            expect(authResponse.user).toBeDefined()
            expect(authResponse.user.email).toBe("test@example.com")
            expect(authResponse.user.displayName).toBe("Test User")
            expect(authResponse.success).toBe(true)
            expect(authResponse.sessionToken).toBeDefined()

            // Verify session in database
            const session = await testPrisma.session.findFirst({
                where: { sessionToken: authResponse.sessionToken },
            })

            expect(session).toBeDefined()
            expect(session?.userId).toBe(authResponse.user.id)
            expect(session?.expires.getTime()).toBeGreaterThan(Date.now())
        })

        /**
         * Test 2: Invalid OAuth code returns 401
         */
        test("should return 401 for invalid Google code", async () => {
            const invalidCode = "invalid_code_12345"

            const response = await executeGraphQL(
                `
                    mutation AuthenticateWithGoogle($code: String!) {
                        authenticateWithGoogle(code: $code) {
                            success
                            message
                        }
                    }
                `,
                { code: invalidCode }
            )

            const json = await parseGraphQLResponse<{
                authenticateWithGoogle: { success: boolean; message: string }
            }>(response)

            // Verify error response
            expect(json.errors).toBeDefined()
            expect(json.errors).toHaveLength(1)

            const error = json.errors?.[0]
            expect(error?.message).toContain("Invalid OAuth code")
            expect(error?.extensions?.code).toBe("INVALID_OAUTH_CODE")
            expect(error?.extensions?.statusCode).toBe(401)
        })

        /**
         * Test 3: Repeated OAuth login returns same user
         */
        test("should return same user for repeated OAuth login", async () => {
            const googleCode = "same_google_code_abc"

            // First login
            const response1 = await executeGraphQL(
                `
                    mutation AuthenticateWithGoogle($code: String!) {
                        authenticateWithGoogle(code: $code) {
                            user {
                                id
                                email
                            }
                        }
                    }
                `,
                { code: googleCode }
            )

            const json1 = await parseGraphQLResponse<{
                authenticateWithGoogle: { user: { id: string; email: string } }
            }>(response1)
            if (!json1.data) throw new Error("json1.data is undefined")
            const userId1 = json1.data.authenticateWithGoogle.user.id

            // Second login
            const response2 = await executeGraphQL(
                `
                    mutation AuthenticateWithGoogle($code: String!) {
                        authenticateWithGoogle(code: $code) {
                            user {
                                id
                                email
                            }
                        }
                    }
                `,
                { code: googleCode }
            )

            const json2 = await parseGraphQLResponse<{
                authenticateWithGoogle: { user: { id: string; email: string } }
            }>(response2)
            if (!json2.data) throw new Error("json2.data is undefined")
            const userId2 = json2.data.authenticateWithGoogle.user.id

            // Verify same user returned
            expect(userId1).toBe(userId2)

            // Verify only one user exists in database
            const users = await testPrisma.user.findMany({
                where: { email: "same@example.com" },
            })
            expect(users).toHaveLength(1)
        })

        /**
         * Test 4: Valid session created in database
         */
        test("should create valid session in database", async () => {
            const googleCode = "session_test_code_123"

            const response = await executeGraphQL(
                `
                    mutation AuthenticateWithGoogle($code: String!) {
                        authenticateWithGoogle(code: $code) {
                            user {
                                id
                            }
                            sessionToken
                        }
                    }
                `,
                { code: googleCode }
            )

            const json = await parseGraphQLResponse<{
                authenticateWithGoogle: {
                    user: { id: string }
                    sessionToken: string
                }
            }>(response)
            if (!json.data) throw new Error("json.data is undefined")
            const authResponse = json.data.authenticateWithGoogle

            const userId = authResponse.user.id
            const sessionToken = authResponse.sessionToken

            // Verify session in database
            const sessions = await testPrisma.session.findMany({ where: { userId } })
            expect(sessions.length).toBeGreaterThan(0)

            const session = sessions.find((s) => s.sessionToken === sessionToken)
            expect(session).toBeDefined()
            expect(session?.expires.getTime()).toBeGreaterThan(Date.now())
        })

        /**
         * Test 5: Missing code returns 400
         */
        test("should return 400 for missing code", async () => {
            const response = await executeGraphQL(
                `
                    mutation AuthenticateWithGoogle($code: String!) {
                        authenticateWithGoogle(code: $code) {
                            success
                        }
                    }
                `,
                { code: "" }
            )

            const json = await parseGraphQLResponse<{
                authenticateWithGoogle: { success: boolean }
            }>(response)

            // Verify error response
            expect(json.errors).toBeDefined()
            expect(json.errors).toHaveLength(1)

            const error = json.errors?.[0]
            expect(error?.message).toContain("required")
            expect(error?.extensions?.code).toBe("BAD_REQUEST")
            expect(error?.extensions?.statusCode).toBe(400)
        })

        /**
         * Test 6: Session cookie for authenticated requests
         */
        test("should use session cookie for authenticated requests", async () => {
            const googleCode = "auth_test_code_456"

            // First: Login and get session token
            const loginResponse = await executeGraphQL(
                `
                    mutation AuthenticateWithGoogle($code: String!) {
                        authenticateWithGoogle(code: $code) {
                            user {
                                id
                            }
                            sessionToken
                        }
                    }
                `,
                { code: googleCode }
            )

            const loginJson = await parseGraphQLResponse<{
                authenticateWithGoogle: {
                    user: { id: string }
                    sessionToken: string
                }
            }>(loginResponse)
            if (!loginJson.data) throw new Error("loginJson.data is undefined")
            const sessionToken = loginJson.data.authenticateWithGoogle.sessionToken

            // Second: Use session cookie to query current user
            const meResponse = await executeGraphQL(
                `
                    query {
                        me {
                            id
                            email
                        }
                    }
                `,
                undefined,
                sessionToken
            )

            const meJson = await parseGraphQLResponse<{
                me: { id: string; email: string }
            }>(meResponse)

            // Verify me query returns current user
            expect(meJson.data).toBeDefined()
            if (!meJson.data) throw new Error("meJson.data is undefined")
            expect(meJson.data.me).toBeDefined()

            const user = meJson.data.me
            expect(user.email).toBe("auth@example.com")
        })
    })
})
