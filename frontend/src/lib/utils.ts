import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// ─── Time formatting ──────────────────────────────────────────────────────────

const _timeFormatter = new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
})

/** Formats an ISO 8601 timestamp as "HH:mm" (24-hour, zh-TW locale). */
export function formatMessageTime(iso: string): string {
    return _timeFormatter.format(new Date(iso))
}
