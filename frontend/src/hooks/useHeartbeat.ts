/**
 * useHeartbeat — online presence heartbeat manager
 *
 * Mount once at the root layout. Responsibilities:
 *  1. Emit "heartbeat" every 30 seconds so the server keeps the session alive
 *     (server TTL is 35 s, giving a 5 s safety window).
 *  2. Emit "user:away" when the tab becomes hidden or the window is about to unload.
 *  3. Re-emit "heartbeat" immediately when the tab becomes visible again.
 *
 * Only emits if the socket is currently connected — avoids queuing events
 * when the socket is still establishing a connection.
 */

import { useEffect } from "react"

import { getSocketClient } from "@/lib/socket"

/** Must be shorter than the server-side presence TTL (35 s). */
const HEARTBEAT_INTERVAL_MS = 30_000

export function useHeartbeat() {
    useEffect(() => {
        function sendHeartbeat() {
            const socket = getSocketClient()
            if (socket?.connected) {
                socket.emit("heartbeat")
            }
        }

        function sendAway() {
            const socket = getSocketClient()
            if (socket?.connected) {
                socket.emit("user:away")
            }
        }

        function handleVisibilityChange() {
            if (document.visibilityState === "hidden") {
                sendAway()
            } else if (document.visibilityState === "visible") {
                sendHeartbeat()
            }
        }

        const intervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

        document.addEventListener("visibilitychange", handleVisibilityChange)
        window.addEventListener("beforeunload", sendAway)

        return () => {
            clearInterval(intervalId)
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            window.removeEventListener("beforeunload", sendAway)
        }
    }, [])
}
