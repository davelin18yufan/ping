# Ping Design System - macOS Glassmorphism Redesign

## Overview

This document outlines the macOS-inspired glassmorphism redesign for Ping, replacing the previous Y2K gel button aesthetic with a modern, refined glass effect design inspired by macOS Big Sur, Monterey, and Ventura.

---

## Design Direction

### Core Aesthetic
- **Style**: macOS Glassmorphism (毛玻璃效果)
- **Reference Apps**:
  - macOS Messages.app (messaging interface)
  - macOS FaceTime.app (call buttons, controls)
  - macOS System Preferences (cards, sidebar)

### Design Principles
1. **Glass Effect First**: All interactive elements use semi-transparent backgrounds with backdrop-filter blur
2. **Communication-Themed**: Buttons match messaging app contexts (send, voice call, video call)
3. **Depth Through Shadows**: Multi-layer shadows create macOS window-like elevation
4. **Subtle Interactions**: Smooth animations (200-300ms) with scale and lift effects

---

## Color System Changes

### Dark Mode: Steel Frost (深鐵灰)

**Before (Noctis Obscuro)**:
- Background: `oklch(0.12 0.01 270)` - Deep purple-blue
- Card: `oklch(0.18 0.015 270)` - Purple-tinted surface
- Primary: `oklch(0.65 0.24 293)` - Purple glow (Y2K vibe)

**After (Steel Frost)**:
- Background: `oklch(0.18 0.005 240)` - Deep steel gray (macOS inspired)
- Card: `oklch(0.24 0.008 240)` - Lighter steel gray
- Primary: `oklch(0.60 0.18 250)` - macOS Messages blue

**Key Changes**:
- Removed purple-blue tint (hue 270° → 240°)
- Reduced saturation (0.01-0.015 → 0.005-0.008)
- Increased lightness for better contrast
- Brand color changed from purple glow to Messages blue

### Light Mode: Kyoto Sunrise (保持溫暖方向)

**Minor Adjustments**:
- Background: `oklch(0.97 0.005 80)` → `oklch(0.96 0.010 70)` (slightly warmer)
- Card: `oklch(0.95 0.008 75)` → `oklch(0.94 0.012 65)` (milky tea tone)
- Primary: `oklch(0.55 0.18 247)` → `oklch(0.58 0.16 250)` (softer blue)
- Accent: `oklch(0.60 0.20 140)` → `oklch(0.65 0.18 50)` (coral orange, warm and friendly)

---

## New Design Tokens

### Glassmorphism Tokens

```typescript
glassBackground: {
    light: "oklch(0.97 0.008 70 / 0.8)", // 80% opacity warm white
    dark: "oklch(0.22 0.008 240 / 0.7)", // 70% opacity steel gray
},
glassBackgroundHover: {
    light: "oklch(0.97 0.008 70 / 0.9)",
    dark: "oklch(0.26 0.008 240 / 0.8)",
},
glassBlur: {
    light: "20px",
    dark: "20px",
},
```

### Glow Colors (Updated for macOS)

```typescript
// Before: Y2K aesthetic (purple, blue, cyan)
--glow-purple: oklch(0.65 0.24 293); // Electric Purple
--glow-blue: oklch(0.65 0.18 247); // Dodger Blue
--glow-cyan: oklch(0.74 0.14 231); // Deep Sky Blue

// After: macOS aesthetic (blue, green, cyan-blue)
--glow-primary: oklch(0.60 0.18 250); // Messages blue
--glow-accent: oklch(0.65 0.15 145); // FaceTime green
--glow-secondary: oklch(0.70 0.18 200); // Cyan-blue
```

---

## Component Design

### 1. Glass Button

**Design Features**:
- Semi-transparent background + `backdrop-filter: blur(20px)`
- Gradient border (lighter top/left, darker bottom/right)
- Soft shadow with subtle top highlight
- Hover: slight lift + scale (1.02)
- Active: compression effect (0.98)

**Variants**:
```css
/* Send Message Button (Primary Blue) */
.glass-button--send {
    background: oklch(from var(--primary) l c h / 0.15);
    border-color: oklch(from var(--primary) l c h / 0.3);
}

/* Voice/Video Call Button (Accent Green, Circular) */
.glass-button--call {
    background: oklch(from var(--accent) l c h / 0.15);
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
}
```

**Communication Theme**:
- Send message: Primary blue + paper plane icon (✈️)
- Voice call: Accent green + phone icon (📞)
- Video call: Accent green + camera icon (📹)

### 2. Glass Input

**Design Features**:
- Semi-transparent background (50% opacity)
- 1px semi-transparent white border
- Focus: border changes to primary color + soft glow
- Placeholder: 50% opacity

**Focus State**:
```css
.glass-input:focus {
    background: oklch(from var(--card) l c h / 0.7);
    border-color: var(--primary);
    box-shadow:
        0 0 0 3px oklch(from var(--primary) l c h / 0.15),
        inset 0 1px 2px oklch(0 0 0 / 0.05);
}
```

### 3. Glass Card

**Design Features**:
- Semi-transparent background (60% opacity)
- Gradient border (lighter top/left, darker bottom/right)
- Multi-layer shadows (macOS window style):
  - Layer 1: `0 2px 4px oklch(0 0 0 / 0.05)`
  - Layer 2: `0 4px 8px oklch(0 0 0 / 0.08)`
  - Layer 3: `0 8px 16px oklch(0 0 0 / 0.1)`
  - Top highlight: `inset 0 1px 0 oklch(1 0 0 / 0.1)`
- Hover: lift effect (-2px) + enhanced shadows

**Variants**:
- `glass-card--interactive`: Clickable with active state
- `glass-card--message-own`: For sent messages (primary blue tint)
- `glass-card--message-other`: For received messages (neutral)
- `glass-card--modal`: Higher elevation for modals

---

## SoundWaveLoader Update

**Before**: Purple-blue gradient
```css
background: radial-gradient(
    circle,
    oklch(from var(--glow-purple) l c h / 0.6) 0%,
    oklch(from var(--glow-blue) l c h / 0.4) 35%,
    oklch(from var(--glow-cyan) l c h / 0.2) 60%,
    transparent 75%
);
```

**After**: Messages blue gradient
```css
background: radial-gradient(
    circle,
    oklch(from var(--glow-primary) l c h / 0.6) 0%,
    oklch(from var(--glow-primary) calc(l - 0.05) calc(c + 0.02) calc(h - 10) / 0.4) 35%,
    oklch(from var(--glow-primary) calc(l - 0.1) calc(c + 0.04) calc(h - 20) / 0.2) 60%,
    transparent 75%
);
```

**Key Change**: Glow color shifts from purple to blue (macOS Messages theme)

---

## Browser Support

### Backdrop Filter Support

**Supported Browsers**:
- Chrome/Edge: Native support
- Safari: Requires `-webkit-` prefix
- Firefox: 101+ native support, older versions need flag

**Fallback Strategy** (Graceful Degradation):
```css
@supports not (backdrop-filter: blur(20px)) {
    .glass-button,
    .glass-input,
    .glass-card {
        background: var(--card);
        border-color: var(--border);
    }
}
```

**Fallback Behavior**:
- Glassmorphism not supported: Use solid card background
- Visual hierarchy preserved through borders and shadows
- No functionality loss

---

## File Structure

### Updated Files

```
/shared/design-tokens/
├── colors.ts          # Updated color tokens
├── types.ts           # Added glassmorphism types

/frontend/src/styles/
├── styles.css         # Updated CSS variables
└── components/
    ├── glass-button.css   # New: Glass button component
    ├── glass-input.css    # New: Glass input component
    └── glass-card.css     # New: Glass card component

/frontend/
└── design-preview.html    # Updated: Full glassmorphism showcase
```

### New CSS Classes

**Buttons**:
- `.glass-button` (base)
- `.glass-button--send` (primary blue, send message)
- `.glass-button--call` (accent green, circular, call buttons)
- `.glass-button--secondary` (muted)
- `.glass-button--sm`, `.glass-button--lg` (size variants)
- `.glass-button--icon` (icon-only, circular)

**Inputs**:
- `.glass-input` (base)
- `.glass-textarea` (multiline)
- `.glass-input--search` (with icon padding)
- `.glass-input--error`, `.glass-input--success` (states)
- `.glass-input--sm`, `.glass-input--lg` (size variants)

**Cards**:
- `.glass-card` (base)
- `.glass-card--interactive` (clickable)
- `.glass-card--compact`, `.glass-card--spacious` (padding variants)
- `.glass-card--highlight` (with border glow)
- `.glass-card--message-own`, `.glass-card--message-other` (chat bubbles)
- `.glass-card--modal` (higher elevation)

---

## Design Preview

Open `/frontend/design-preview.html` in a browser to preview:

1. **Color Palette**: Steel Frost dark mode vs Kyoto Sunrise light mode
2. **Glass Components**: Buttons, inputs, cards with glassmorphism
3. **Communication Buttons**: Send, voice call, video call examples
4. **SoundWaveLoader**: Updated with macOS Messages blue glow
5. **Ritual Colors**: Apology, celebrate, reconcile (preserved)

**Preview Commands**:
```bash
# Open in browser
start frontend/design-preview.html  # Windows
open frontend/design-preview.html   # macOS
xdg-open frontend/design-preview.html  # Linux
```

---

## Next Steps

### Phase 1: Component Migration (Current)
- [x] Update design tokens
- [x] Create glass component styles
- [x] Update design preview
- [ ] Migrate existing components to glass styles

### Phase 2: Component Library
- [ ] Create React glass components (`GlassButton`, `GlassInput`, `GlassCard`)
- [ ] Add Storybook stories for glass components
- [ ] Write component documentation

### Phase 3: Application Integration
- [ ] Apply glass styles to chat interface
- [ ] Update message bubbles with glass effect
- [ ] Implement glass navbar/sidebar
- [ ] Add glass modals and dialogs

### Phase 4: Testing & Optimization
- [ ] Test across browsers (Chrome, Safari, Firefox, Edge)
- [ ] Performance testing (GPU usage, animation smoothness)
- [ ] Accessibility testing (contrast ratios, keyboard navigation)
- [ ] Responsive testing (mobile, tablet, desktop)

---

## Design Checklist

Before deploying glassmorphism components:

### Visual Quality
- [ ] Deep steel gray background in dark mode (not purple-blue)
- [ ] All buttons use glassmorphism (not Y2K gel buttons)
- [ ] Communication buttons match theme (send, call, video)
- [ ] Shadows create depth (multi-layer, macOS style)
- [ ] Borders have subtle highlight/shadow gradient

### Interaction
- [ ] Hover states provide clear feedback (lift + scale)
- [ ] Active states show compression (scale 0.98)
- [ ] Focus states have visible glow (3px ring)
- [ ] Animations are smooth (200-300ms ease-out)
- [ ] No layout shift on hover/focus

### Accessibility
- [ ] Color contrast meets WCAG AAA (7:1 for text)
- [ ] Focus rings visible for keyboard navigation
- [ ] Reduced motion respected (`prefers-reduced-motion`)
- [ ] Touch targets meet minimum 44x44px (mobile)

### Browser Support
- [ ] Safari: `-webkit-backdrop-filter` prefix used
- [ ] Fallback: Solid backgrounds for unsupported browsers
- [ ] Performance: GPU acceleration for transforms/opacity
- [ ] Responsive: Works on mobile, tablet, desktop

---

## References

### Design Inspiration
- **macOS Messages.app**: Blue primary color, glass message bubbles
- **macOS FaceTime.app**: Green call buttons, glass controls
- **macOS System Preferences**: Card layouts, sidebar design
- **macOS Big Sur/Monterey/Ventura**: Overall glassmorphism aesthetic

### Technical Resources
- [Glassmorphism CSS Generator](https://hype4.academy/tools/glassmorphism-generator)
- [OKLCH Color Picker](https://oklch.com/)
- [MDN: backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
- [Can I Use: backdrop-filter](https://caniuse.com/css-backdrop-filter)

### Related Documents
- `/docs/design-philosophy.md` - Core design principles
- `/docs/design-system.md` - Full design system documentation
- `/CLAUDE.md` - Frontend UI/UX design guidelines

---

**Last Updated**: 2026-02-05
**Version**: 1.0.0 (macOS Glassmorphism)
**Status**: Design Complete, Implementation In Progress
