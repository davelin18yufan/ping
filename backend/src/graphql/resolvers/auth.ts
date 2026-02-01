/**
 * Authentication Resolvers
 *
 * GraphQL resolvers for authentication operations:
 * - OAuth login (Google, GitHub, Apple)
 * - Session management
 * - User registration
 */

import { GraphQLError } from "graphql"
import type { GraphQLContext } from "../context"
import { verifyGoogleOAuthCode, createSession } from "@/services/authService"

/**
 * Authentication Mutation Resolvers
 */
const Mutation = {
    /**
     * Authenticate with Google OAuth
     *
     * Verifies Google OAuth code and creates user session.
     * Returns authenticated user and session cookie.
     *
     * @param _parent - Parent resolver result (unused)
     * @param args - Mutation arguments with code
     * @param context - GraphQL context with Prisma
     * @returns AuthResponse with user data
     * @throws GraphQLError if code is invalid or authentication fails
     */
    authenticateWithGoogle: async (
        _parent: unknown,
        args: { code: string },
        context: GraphQLContext
    ) => {
        try {
            // Validate input
            if (!args.code || args.code.trim() === "") {
                throw new GraphQLError("OAuth code is required", {
                    extensions: {
                        code: "BAD_REQUEST",
                        statusCode: 400,
                    },
                })
            }

            // Verify OAuth code and get/create user
            const user = await verifyGoogleOAuthCode(args.code, context.prisma)

            // Create session
            const sessionToken = await createSession(user.id, context.prisma)

            // Return success response
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.name,
                    avatarUrl: user.image,
                },
                success: true,
                message: "Authentication successful",
                sessionToken, //! For testing purposes
            }
        } catch (error) {
            // Handle specific errors
            if (error instanceof Error) {
                if (error.message.includes("Invalid OAuth code")) {
                    throw new GraphQLError("Invalid OAuth code", {
                        extensions: {
                            code: "INVALID_OAUTH_CODE",
                            statusCode: 401,
                        },
                    })
                }

                if (error.message.includes("required")) {
                    throw new GraphQLError(error.message, {
                        extensions: {
                            code: "BAD_REQUEST",
                            statusCode: 400,
                        },
                    })
                }
            }

            // Re-throw GraphQLError as-is
            if (error instanceof GraphQLError) {
                throw error
            }

            // Database or other errors
            throw new GraphQLError("Authentication failed", {
                extensions: {
                    code: "INTERNAL_SERVER_ERROR",
                    statusCode: 500,
                    originalError: error instanceof Error ? error.message : String(error),
                },
            })
        }
    },
}

/**
 * Export all auth resolvers
 */
export const authResolvers = {
    Mutation,
}
