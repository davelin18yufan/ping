/**
 * User Resolvers
 *
 * GraphQL resolvers for user-related queries and mutations.
 */

import { GraphQLError } from "graphql"
import { AestheticMode } from "@generated/prisma/enums"
import type { GraphQLContext } from "../context"
import { requireAuth } from "./utils"
import { isUserOnline } from "@/lib/redis"

/**
 * User Query Resolvers
 */
const Query = {
    /**
     * Get the currently authenticated user
     *
     * Requires valid session cookie.
     * Returns the user data from database.
     *
     * @param _parent - Parent resolver result (unused)
     * @param _args - Query arguments (none for me query)
     * @param context - GraphQL context with auth and Prisma
     * @returns User object or null if not authenticated
     * @throws GraphQLError if database query fails
     */
    me: async (_parent: unknown, _args: Record<string, never>, context: GraphQLContext) => {
        const userId = requireAuth(context)

        try {
            // Query user from database
            const user = await context.prisma.user.findUnique({
                where: {
                    id: userId,
                },
                select: {
                    id: true,
                    email: true,
                    emailVerified: true,
                    name: true,
                    image: true,
                    createdAt: true,
                    updatedAt: true,
                    statusMessage: true,
                    aestheticMode: true,
                },
            })

            // User not found (should not happen if session is valid)
            if (!user) {
                throw new GraphQLError("User not found", {
                    extensions: {
                        code: "NOT_FOUND",
                    },
                })
            }

            // Return user with serialized dates
            return {
                ...user,
                emailVerified: user.emailVerified?.toISOString() ?? null,
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString(),
            }
        } catch (error) {
            // Re-throw GraphQLError as-is
            if (error instanceof GraphQLError) {
                throw error
            }

            // Database or other errors
            throw new GraphQLError("Failed to fetch user data", {
                extensions: {
                    code: "INTERNAL_SERVER_ERROR",
                    originalError: error instanceof Error ? error.message : String(error),
                },
            })
        }
    },
}

/**
 * Input shape for the updateProfile mutation
 */
interface UpdateProfileInput {
    name?: string | null
    image?: string | null
    statusMessage?: string | null
    aestheticMode?: AestheticMode | null
}

/**
 * Valid aesthetic mode values
 */
const VALID_AESTHETIC_MODES = Object.values(AestheticMode)

/**
 * Validate a string as an absolute URL.
 * Accepts http:// and https:// schemes only.
 */
function isValidUrl(value: string): boolean {
    try {
        const url = new URL(value)
        return url.protocol === "http:" || url.protocol === "https:"
    } catch {
        return false
    }
}

/**
 * User Mutation Resolvers
 */
const Mutation = {
    /**
     * Update the current user's profile (name and/or avatar image URL).
     *
     * Validation rules:
     *  - name: if provided, must be 1–50 non-empty characters
     *  - image: if provided, must be a valid http/https URL
     *
     * @param _parent - Unused
     * @param args - { input: UpdateProfileInput }
     * @param context - GraphQL context with auth and Prisma
     * @returns Updated User object
     */
    updateProfile: async (
        _parent: unknown,
        args: { input: UpdateProfileInput },
        context: GraphQLContext
    ) => {
        const userId = requireAuth(context)

        const { name, image, statusMessage, aestheticMode } = args.input

        // Validate name if provided
        if (name !== undefined && name !== null) {
            if (name.trim().length === 0) {
                throw new GraphQLError("name must not be empty", {
                    extensions: { code: "BAD_USER_INPUT" },
                })
            }
            if (name.length > 50) {
                throw new GraphQLError("name must be 50 characters or fewer", {
                    extensions: { code: "BAD_USER_INPUT" },
                })
            }
        }

        // Validate image URL if provided
        if (image !== undefined && image !== null) {
            if (!isValidUrl(image)) {
                throw new GraphQLError("image must be a valid URL (http or https)", {
                    extensions: { code: "BAD_USER_INPUT" },
                })
            }
        }

        // Validate statusMessage if provided
        if (statusMessage !== undefined && statusMessage !== null) {
            if (statusMessage.length > 80) {
                throw new GraphQLError("statusMessage must be 80 characters or fewer", {
                    extensions: { code: "BAD_USER_INPUT" },
                })
            }
        }

        // Validate aestheticMode if provided
        if (aestheticMode !== undefined && aestheticMode !== null) {
            if (!(VALID_AESTHETIC_MODES as readonly string[]).includes(aestheticMode)) {
                throw new GraphQLError(
                    `aestheticMode must be one of: ${VALID_AESTHETIC_MODES.join(", ")}`,
                    {
                        extensions: { code: "BAD_USER_INPUT" },
                    }
                )
            }
        }

        // Build update data — only include fields that were explicitly provided
        const updateData: {
            name?: string
            image?: string
            statusMessage?: string | null
            aestheticMode?: AestheticMode
        } = {}
        if (name !== undefined && name !== null) {
            updateData.name = name
        }
        if (image !== undefined && image !== null) {
            updateData.image = image
        }
        // statusMessage: empty string clears the status (stored as null)
        if (statusMessage !== undefined) {
            updateData.statusMessage = statusMessage === "" ? null : (statusMessage ?? null)
        }
        if (aestheticMode !== undefined && aestheticMode !== null) {
            updateData.aestheticMode = aestheticMode
        }

        try {
            const user = await context.prisma.user.update({
                where: { id: userId },
                data: updateData,
                select: {
                    id: true,
                    email: true,
                    emailVerified: true,
                    name: true,
                    image: true,
                    createdAt: true,
                    updatedAt: true,
                    statusMessage: true,
                    aestheticMode: true,
                },
            })

            return {
                ...user,
                emailVerified: user.emailVerified?.toISOString() ?? null,
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString(),
            }
        } catch (error) {
            if (error instanceof GraphQLError) {
                throw error
            }
            throw new GraphQLError("Failed to update profile", {
                extensions: {
                    code: "INTERNAL_SERVER_ERROR",
                    originalError: error instanceof Error ? error.message : String(error),
                },
            })
        }
    },
}

/**
 * User Subscription Resolvers
 * (To be implemented in future features)
 */
const Subscription = {}

/**
 * User Type-level Field Resolvers
 *
 * These resolve computed fields that are not stored in the database
 * but derived from other data sources (e.g., Redis).
 */
const User = {
    /**
     * Resolve isOnline field for a User
     *
     * Checks Redis for the user:online:{id} key.
     * Returns true if the key exists (user sent a heartbeat within the last 35s).
     *
     * @param parent - User object with at least { id: string }
     * @returns true if user is currently online
     */
    isOnline: async (parent: { id: string }): Promise<boolean> => {
        return await isUserOnline(parent.id)
    },
}

/**
 * Export all user resolvers
 */
export const userResolvers = {
    Query,
    Mutation,
    Subscription,
    User,
}
