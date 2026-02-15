/**
 * useSessionGuard Hook
 *
 * Periodically checks the Better Auth session validity every 5 minutes.
 * If the session is null/expired, signs out and redirects to /auth.
 *
 * Mount this hook once at the root layout level (inside SessionGuardMounter).
 */

import { useEffect } from "react"

import { getSession, signOut } from "@/lib/auth-client"

const SESSION_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

export function useSessionGuard() {
    useEffect(() => {
        const interval = setInterval(async () => {
            const session = await getSession()
            if (!session?.data) {
                await signOut()
                if (typeof window !== "undefined") {
                    window.location.href = "/auth"
                }
            }
        }, SESSION_CHECK_INTERVAL)

        return () => clearInterval(interval)
    }, [])
}
