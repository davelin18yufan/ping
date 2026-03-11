import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// ─── Time formatting ──────────────────────────────────────────────────────────

/** Detects the current environment's timezone (browser locale on client, server TZ on SSR). */
export function getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
}

let _cachedTz: string | undefined
let _cachedTimeFormatter: Intl.DateTimeFormat | undefined
let _cachedDateFormatter: Intl.DateTimeFormat | undefined
let _cachedDatePartsFormatter: Intl.DateTimeFormat | undefined

function getFormatters() {
    const tz = getUserTimezone()
    if (tz !== _cachedTz) {
        _cachedTz = tz
        _cachedTimeFormatter = new Intl.DateTimeFormat("zh-TW", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: tz,
        })
        _cachedDateFormatter = new Intl.DateTimeFormat("zh-TW", {
            month: "numeric",
            day: "numeric",
            timeZone: tz,
        })
        _cachedDatePartsFormatter = new Intl.DateTimeFormat("zh-TW", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            timeZone: tz,
        })
    }
    return {
        time: _cachedTimeFormatter!,
        date: _cachedDateFormatter!,
        dateParts: _cachedDatePartsFormatter!,
    }
}

/** Formats an ISO 8601 timestamp as "HH:mm" (24-hour, zh-TW locale, user's local timezone). */
export function formatMessageTime(iso: string): string {
    return getFormatters().time.format(new Date(iso))
}

/** Formats a date as "M/D" in the user's local timezone. */
export function formatConversationDate(iso: string): string {
    return getFormatters().date.format(new Date(iso))
}

/** Returns a date key string (e.g., "2026/03/05") in the user's local timezone for day comparison. */
export function toLocalDateKey(date: Date): string {
    return getFormatters().dateParts.format(date)
}
