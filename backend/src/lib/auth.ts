/**
 * Better Auth Configuration
 *
 * Initializes Better Auth with:
 * - Prisma adapter for database integration
 * - OAuth providers (Google, GitHub, Apple)
 * - Session management with secure cookies
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getPrisma } from "./prisma";

// Validate required environment variables
const requiredEnvVars = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}. Please check your .env file.`,
    );
  }
}

// Check if any OAuth providers are configured
const hasGoogleOAuth =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
const hasGitHubOAuth =
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET;

if (!hasGoogleOAuth && !hasGitHubOAuth) {
  console.warn(
    "No OAuth providers configured. At least Google or GitHub OAuth is required for authentication.",
  );
}

/**
 * Better Auth Client Instance
 *
 * Configured with:
 * - Prisma adapter for User, Session, Account, Verification tables
 * - OAuth providers (Google, GitHub, Apple)
 * - Secure session cookies (httpOnly, sameSite, secure in production)
 * - 7-day session expiration
 */
export const auth = betterAuth({
  // Database adapter
  database: prismaAdapter(getPrisma(), {
    provider: "postgresql",
  }),

  // Base URL for auth endpoints
  baseURL: process.env.BETTER_AUTH_URL,

  // Secret for signing tokens and cookies
  secret: process.env.BETTER_AUTH_SECRET,

  // Email and password authentication (disabled for MVP)
  emailAndPassword: {
    enabled: false,
  },

  // OAuth social providers
  socialProviders: {
    google: hasGoogleOAuth
      ? {
          clientId: process.env.GOOGLE_CLIENT_ID ?? "",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }
      : undefined,
    github: hasGitHubOAuth
      ? {
          clientId: process.env.GITHUB_CLIENT_ID ?? "",
          clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
        }
      : undefined,
  },

  // Session configuration
  session: {
    // Session expiration: 7 days
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds

    // Update session activity on every request
    updateAge: 60 * 60 * 24, // 1 day in seconds

    // Cookie configuration
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    },
  },

  // Advanced options
  advanced: {
    // Use secure cookies in production
    useSecureCookies: process.env.NODE_ENV === "production",

    // Cross-site request settings
    crossSubDomainCookies: {
      enabled: false,
    },
  },

  // Trust proxy in production (for secure cookies behind reverse proxy)
  trustedOrigins:
    process.env.NODE_ENV === "production"
      ? [process.env.BETTER_AUTH_URL ?? ""]
      : undefined,
});

/**
 * Type-safe auth client with all methods
 */
export type Auth = typeof auth;

/**
 * Export auth handler for Hono integration
 */
export const authHandler = auth.handler;

/**
 * Helper function to verify session from request
 *
 * @param request - Hono request object
 * @returns User ID if session is valid, null otherwise
 */
export async function verifySession(
  request: Request,
): Promise<string | null> {
  try {
    // Get session from cookie
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) {
      return null;
    }

    // Parse session token from cookie
    const sessionToken = parseCookie(
      cookieHeader,
      "better-auth.session_token",
    );
    if (!sessionToken) {
      return null;
    }

    // Verify session with Better Auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return null;
    }

    return session.user.id;
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}

/**
 * Helper function to parse cookie value
 *
 * @param cookieHeader - Cookie header string
 * @param name - Cookie name to extract
 * @returns Cookie value or null if not found
 */
function parseCookie(cookieHeader: string, name: string): string | null {
  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split("=");
    if (cookieName === name) {
      return cookieValue ?? null;
    }
  }
  return null;
}
