/**
 * GlassButton — typed wrapper around the design system .glass-button classes.
 *
 * Maps variant/size props to the CSS class names defined in glass-button.css,
 * so consumers never hard-code class strings and get full TypeScript safety.
 *
 * Usage:
 *   <GlassButton variant="send" size="icon" onClick={handleSend} />
 *   <GlassButton variant="destructive">Delete</GlassButton>
 */

import * as React from "react"

export type GlassButtonVariant =
    | "default"
    | "send"
    | "call"
    | "secondary"
    | "destructive"
    | "icon"
    | "google"
    | "github"

export type GlassButtonSize = "sm" | "default" | "lg" | "icon"

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: GlassButtonVariant
    size?: GlassButtonSize
}

const variantClassMap: Record<GlassButtonVariant, string> = {
    default: "glass-button",
    send: "glass-button glass-button--send",
    call: "glass-button glass-button--call",
    secondary: "glass-button glass-button--secondary",
    destructive: "glass-button glass-button--destructive",
    icon: "glass-button glass-button--icon",
    google: "glass-button glass-button--google",
    github: "glass-button glass-button--github",
}

const sizeClassMap: Record<GlassButtonSize, string> = {
    sm: "glass-button--sm",
    default: "",
    lg: "glass-button--lg",
    icon: "glass-button--icon-size",
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
    ({ variant = "default", size = "default", className, ...props }, ref) => {
        const variantClass = variantClassMap[variant]
        const sizeClass = sizeClassMap[size]
        const combined = [variantClass, sizeClass, className].filter(Boolean).join(" ")
        return <button ref={ref} className={combined} {...props} />
    }
)
GlassButton.displayName = "GlassButton"
