/**
 * SearchInput — shared search bar primitive
 *
 * Structure: [search icon] [<input type="search">] [clear button?]
 * Styling: purely through className props — callers supply CSS classes.
 *
 * Used by:
 *   - ChatsLayout sidebar search  (chats-layout__search-* classes)
 *   - FriendSearchInput           (friend-search__* / glass-input classes)
 *
 * Accessibility:
 *   - aria-label required (no visible <label> by default — icon is decorative)
 *   - Clear button has its own aria-label
 *   - role="searchbox" via type="search"
 */

import { Search, X } from "lucide-react"
import { type InputHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

interface SearchInputProps extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "onChange"
> {
    value: string
    onChange: (value: string) => void
    /** Called when the clear (×) button is clicked. If omitted, no clear button is rendered. */
    onClear?: () => void
    /** Class applied to the outer wrapper div. */
    wrapperClassName?: string
    /** Class applied to the search icon element. */
    iconClassName?: string
    /** Class applied to the <input> element. */
    inputClassName?: string
    /** Class applied to the clear button. */
    clearClassName?: string
    /** Size for the search icon (px). Default 14. */
    iconSize?: number
    /** Slot rendered after the input (e.g. a loading spinner). */
    suffix?: React.ReactNode
}

export function SearchInput({
    value,
    onChange,
    onClear,
    wrapperClassName,
    iconClassName,
    inputClassName,
    clearClassName,
    iconSize = 14,
    suffix,
    placeholder,
    "aria-label": ariaLabel,
    autoComplete = "off",
    className,
    ...rest
}: SearchInputProps) {
    return (
        <div className={wrapperClassName}>
            <Search
                size={iconSize}
                className={cn("shrink-0 pointer-events-none", iconClassName)}
                aria-hidden="true"
            />

            <input
                type="search"
                className={cn(inputClassName, className)}
                placeholder={placeholder}
                aria-label={ariaLabel}
                autoComplete={autoComplete}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                {...rest}
            />

            {suffix}

            {onClear && value && (
                <button
                    type="button"
                    className={clearClassName}
                    onClick={onClear}
                    aria-label="Clear search"
                >
                    <X size={12} aria-hidden="true" />
                </button>
            )}
        </div>
    )
}
