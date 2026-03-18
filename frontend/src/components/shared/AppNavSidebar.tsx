/**
 * AppNavSidebar — fixed 56px vertical icon rail on the left edge.
 *
 * Provides app-level navigation:
 *   - Chats   (/chats)
 *   - Friends (/friends)
 *   - Settings (/settings)
 *
 * Uses TanStack Router's <Link> with activeProps for active state styling.
 * Tooltips are revealed on hover via CSS (no JS required).
 *
 * Rendered inside _protected layout so it is only visible to authenticated users.
 */

import { Link } from "@tanstack/react-router"
import { MessageSquare, Users } from "lucide-react"

const navItems = [
    { icon: MessageSquare, label: "Chats", to: "/chats" },
    { icon: Users, label: "Friends", to: "/friends" },
] as const

export function AppNavSidebar() {
    return (
        <nav className="app-nav" aria-label="Main navigation">
            <div className="app-nav__top">
                {navItems.map(({ icon: Icon, label, to }) => (
                    <Link
                        key={to}
                        to={to}
                        className="app-nav__item"
                        activeProps={{ className: "app-nav__item app-nav__item--active" }}
                        aria-label={label}
                    >
                        <Icon size={20} aria-hidden="true" />
                        <span className="app-nav__item-tooltip" aria-hidden="true">
                            {label}
                        </span>
                    </Link>
                ))}
            </div>
            <div className="app-nav__bottom">{/* Avatar / profile — future sprint */}</div>
        </nav>
    )
}
