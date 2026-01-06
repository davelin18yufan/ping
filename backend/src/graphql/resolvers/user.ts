/**
 * User Resolvers
 *
 * GraphQL resolvers for user-related queries and mutations.
 */

import { GraphQLError } from "graphql";
import type { GraphQLContext } from "../context";

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
  me: async (
    _parent: unknown,
    _args: Record<string, never>,
    context: GraphQLContext,
  ) => {
    // Check authentication
    if (!context.isAuthenticated || !context.userId) {
      throw new GraphQLError("Unauthorized: You must be logged in", {
        extensions: {
          code: "UNAUTHORIZED",
        },
      });
    }

    try {
      // Query user from database
      const user = await context.prisma.user.findUnique({
        where: {
          id: context.userId,
        },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          name: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // User not found (should not happen if session is valid)
      if (!user) {
        throw new GraphQLError("User not found", {
          extensions: {
            code: "NOT_FOUND",
          },
        });
      }

      // Return user with serialized dates
      return {
        ...user,
        emailVerified: user.emailVerified?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      // Re-throw GraphQLError as-is
      if (error instanceof GraphQLError) {
        throw error;
      }

      // Database or other errors
      throw new GraphQLError("Failed to fetch user data", {
        extensions: {
          code: "INTERNAL_SERVER_ERROR",
          originalError: error instanceof Error ? error.message : String(error),
        },
      });
    }
  },
};

/**
 * User Mutation Resolvers
 * (To be implemented in future features)
 */
const Mutation = {};

/**
 * User Subscription Resolvers
 * (To be implemented in future features)
 */
const Subscription = {};

/**
 * Export all user resolvers
 */
export const userResolvers = {
  Query,
  Mutation,
  Subscription,
};
