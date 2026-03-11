/**
 * Session RPC — fetches the current session from the backend via createServerFn.
 *
 * createServerFn creates an RPC bridge:
 *  - During SSR: runs on the server, forwards cookie header to the backend
 *  - During client-side navigation: makes an RPC call to the same server handler
 *
 * Why NOT *.server.ts?
 *  TanStack Start's import-protection Vite plugin blocks *.server.* files from
 *  client bundles entirely. createServerFn already enforces the server boundary
 *  at runtime — the file itself does not need the .server. naming convention.
 *
 * Why forward cookies?
 *  The frontend betterAuth instance has no database adapter and uses a different
 *  BETTER_AUTH_SECRET. Only the backend can validate sessions. We proxy the
 *  browser's cookie header to /api/auth/get-session so the backend can verify.
 *
 * @see https://www.better-auth.com/docs/integrations/tanstack
 */

import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"

import type { AuthSession } from "@/lib/auth-client"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

/**
 * Fetch the current session from the backend.
 *
 * Forwards the browser's cookie header so Better Auth on the backend
 * can validate the session token.
 *
 * @returns Session object ({ user, session }) if authenticated, null otherwise.
 */
export const getSession = createServerFn({ method: "GET" }).handler(
    async (): Promise<AuthSession | null> => {
        const headers = getRequestHeaders()
        const cookieHeader =
            headers.get?.("cookie") ?? (headers as Record<string, string>)["cookie"] ?? ""

        try {
            const res = await fetch(`${API_URL}/api/auth/get-session`, {
                headers: {
                    cookie: cookieHeader,
                },
            })

            if (!res.ok) return null

            const text = await res.text()
            if (!text) return null

            const data = JSON.parse(text) as AuthSession | null
            return data?.user ? data : null
        } catch {
            return null
        }
    }
)
