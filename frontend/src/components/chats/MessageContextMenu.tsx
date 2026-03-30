/**
 * MessageContextMenu — glass context menu rendered as a fixed portal.
 *
 * Appears at the provided x/y cursor coordinates, clamped to viewport.
 * Supports full keyboard navigation:
 *   ArrowDown / ArrowUp — move focus between items
 *   Enter               — activate focused item
 *   Escape              — close menu
 *
 * Click-outside via mousedown (same pattern as RitualPickerButton).
 * Rendered into document.body via ReactDOM.createPortal.
 *
 * Accessibility:
 *   - role="menu" on container
 *   - role="menuitem" on each item
 *   - aria-label on each item
 */

import { CheckSquare, Copy, Forward, Pin, PinOff, Reply, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

export type BubbleAction =
    | { type: "reply" }
    | { type: "copy" }
    | { type: "forward" }
    | { type: "select" }
    | { type: "pin" }
    | { type: "delete" }

interface MenuItem {
    id: BubbleAction["type"]
    label: string
    icon: React.ReactNode
    destructive?: boolean
    ariaLabel: string
}

interface MessageContextMenuProps {
    x: number
    y: number
    isPinned: boolean
    onAction: (action: BubbleAction) => void
    onClose: () => void
}

const MENU_WIDTH = 188
const MENU_HEIGHT = 260

export function MessageContextMenu({ x, y, isPinned, onAction, onClose }: MessageContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)
    const [focusIndex, setFocusIndex] = useState(-1)

    // Clamp position to viewport
    const left = Math.min(x, window.innerWidth - MENU_WIDTH - 8)
    const top = Math.min(y, window.innerHeight - MENU_HEIGHT - 8)

    const items: MenuItem[] = [
        {
            id: "reply",
            label: "回覆",
            icon: <Reply size={14} aria-hidden="true" />,
            ariaLabel: "Reply to message",
        },
        {
            id: "copy",
            label: "複製",
            icon: <Copy size={14} aria-hidden="true" />,
            ariaLabel: "Copy message text",
        },
        {
            id: "forward",
            label: "轉發",
            icon: <Forward size={14} aria-hidden="true" />,
            ariaLabel: "Forward message",
        },
        {
            id: "select",
            label: "選取",
            icon: <CheckSquare size={14} aria-hidden="true" />,
            ariaLabel: "Select message",
        },
        {
            id: "pin",
            label: isPinned ? "取消釘選" : "釘選",
            icon: isPinned ? (
                <PinOff size={14} aria-hidden="true" />
            ) : (
                <Pin size={14} aria-hidden="true" />
            ),
            ariaLabel: isPinned ? "Unpin message" : "Pin message",
        },
        {
            id: "delete",
            label: "刪除",
            icon: <Trash2 size={14} aria-hidden="true" />,
            destructive: true,
            ariaLabel: "Delete message",
        },
    ]

    // Click-outside: close on mousedown outside the menu
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener("mousedown", handleMouseDown)
        return () => document.removeEventListener("mousedown", handleMouseDown)
    }, [onClose])

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === "Escape") {
                e.preventDefault()
                onClose()
                return
            }
            if (e.key === "ArrowDown") {
                e.preventDefault()
                setFocusIndex((prev) => (prev + 1) % items.length)
                return
            }
            if (e.key === "ArrowUp") {
                e.preventDefault()
                setFocusIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1))
                return
            }
            if (e.key === "Enter" && focusIndex >= 0) {
                e.preventDefault()
                const item = items[focusIndex]
                if (item) {
                    onAction({ type: item.id } as BubbleAction)
                    onClose()
                }
            }
        },
        [focusIndex, items, onAction, onClose]
    )

    // Auto-focus the menu so keyboard navigation works immediately
    useEffect(() => {
        menuRef.current?.focus()
    }, [])

    // Focus the correct item when focusIndex changes
    useEffect(() => {
        if (focusIndex < 0) return
        const btn =
            menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[focusIndex]
        btn?.focus()
    }, [focusIndex])

    const handleItemClick = (item: MenuItem) => {
        onAction({ type: item.id } as BubbleAction)
        onClose()
    }

    const menu = (
        <div
            ref={menuRef}
            role="menu"
            aria-label="Message actions"
            className="bubble-context-menu"
            style={{ left, top }}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            {items.map((item, index) => (
                <div key={item.id}>
                    {/* Divider before Delete */}
                    {item.id === "delete" && (
                        <div className="bubble-context-menu__divider" aria-hidden="true" />
                    )}
                    <button
                        type="button"
                        role="menuitem"
                        aria-label={item.ariaLabel}
                        className={[
                            "bubble-context-menu__item",
                            item.destructive ? "bubble-context-menu__item--destructive" : "",
                            focusIndex === index ? "bubble-context-menu__item--focused" : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        onClick={() => handleItemClick(item)}
                        onMouseEnter={() => setFocusIndex(index)}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                </div>
            ))}
        </div>
    )

    return createPortal(menu, document.body)
}
