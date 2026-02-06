# Ping Design System

Unified Design System ensuring visual consistency across Web and Mobile platforms.

---

## Table of Contents

- [Overview](#overview)
- [Design Tokens](#design-tokens)
- [Glassmorphism Design](#glassmorphism-design)
- [Component System](#component-system)
- [Usage Guide](#usage-guide)
- [Best Practices](#best-practices)

---

## Overview

Ping Design System provides:

- **Shared Design Tokens**: Colors, spacing, typography, shadows, radius
- **Primitive Components**: Headless components with shared logic for Web and Mobile
- **UI Components**: Visual implementations for Web (React) and Mobile (React Native)
- **Glassmorphism Aesthetic**: macOS-inspired frosted glass effects

### Technology Stack

- **Web**: Tailwind CSS v4 (CSS-based config)
- **Mobile**: Tailwind CSS v3 + NativeWind v4
- **Shared**: TypeScript + React Hooks

---

## Design Tokens

### Color System

All colors are defined using OKLCH color space for visual consistency.

**Location**: `/shared/design-tokens/colors.ts`

**Includes 28 color tokens**:
- `background`, `foreground`
- `card`, `cardForeground`
- `popover`, `popoverForeground`
- `primary`, `primaryForeground`
- `secondary`, `secondaryForeground`
- `muted`, `mutedForeground`
- `accent`, `accentForeground`
- `destructive`, `destructiveForeground`
- `border`, `input`, `ring`
- `chart1` - `chart5`
- `sidebar*` (8 related tokens)

**Light/Dark Mode**: Each token has light and dark mode values

**Example**:
```typescript
import { colors } from '@shared/design-tokens';

console.log(colors.primary.light); // "oklch(0.21 0.006 285.885)"
console.log(colors.primary.dark);  // "oklch(0.985 0 0)"
```

#### Color Palette Changes (macOS-inspired)

**Dark Mode: Steel Frost**

**Before (Purple-tinted)**:
- Background: `oklch(0.12 0.01 270)` - Deep purple-blue
- Card: `oklch(0.18 0.015 270)` - Purple-tinted surface

**After (Steel Gray)**:
- Background: `oklch(0.18 0.005 240)` - Deep steel gray (macOS-inspired)
- Card: `oklch(0.24 0.008 240)` - Lighter steel gray
- Primary: `oklch(0.60 0.18 250)` - macOS Messages blue

**Key Changes**:
- Removed purple-blue tint (hue 270° → 240°)
- Reduced saturation (0.01-0.015 → 0.005-0.008)
- Increased lightness for better contrast
- Brand color changed from purple glow to Messages blue

**Light Mode: Kyoto Sunrise**

**Minor Adjustments**:
- Background: `oklch(0.96 0.010 70)` - Slightly warmer
- Card: `oklch(0.94 0.012 65)` - Milky tea tone
- Primary: `oklch(0.58 0.16 250)` - Softer blue
- Accent: `oklch(0.65 0.18 50)` - Coral orange (warm and friendly)

### Spacing System

Based on 0.25rem (4px) incremental spacing scale.

**Location**: `/shared/design-tokens/spacing.ts`

**Example**:
```typescript
import { spacing } from '@shared/design-tokens';

console.log(spacing[4]);  // "1rem" (16px)
console.log(spacing[8]);  // "2rem" (32px)
```

### Typography System

**Font Family**:
- `sans`: System font stack (-apple-system, BlinkMacSystemFont, ...)
- `mono`: Monospace font stack (source-code-pro, Menlo, ...)

**Font Size**: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl - 9xl (includes corresponding line-height)

**Font Weight**: thin (100) - black (900)

**Location**: `/shared/design-tokens/typography.ts`

### Shadow System

**Web Shadows**: CSS box-shadow strings

**Native Shadows**: React Native shadow objects (shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation)

**Location**: `/shared/design-tokens/shadows.ts`

**Example**:
```typescript
import { shadows, nativeShadows } from '@shared/design-tokens';

// Web
console.log(shadows.md);
// "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)"

// Mobile
console.log(nativeShadows.md);
// { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, ... }
```

### Border Radius System

**Web Border Radius**: CSS calc() strings (based on --radius: 0.625rem)

**Native Border Radius**: Numeric pixel values

**Location**: `/shared/design-tokens/radius.ts`

---

## Glassmorphism Design

### Design Philosophy

Evolved from Y2K gel buttons to macOS-inspired glassmorphism (frosted glass effects).

**Core Aesthetic**:
- **Style**: macOS Glassmorphism (frosted glass effect)
- **Reference Apps**: macOS Messages, FaceTime, System Preferences

**Design Principles**:
1. **Glass Effect First**: All interactive elements use semi-transparent backgrounds with backdrop-filter blur
2. **Communication-Themed**: Buttons match messaging app contexts (send, voice call, video call)
3. **Depth Through Shadows**: Multi-layer diffusion shadows create cloud-like floating sensation
4. **Subtle Interactions**: Smooth animations (200-400ms) with lift and ripple effects

### Glassmorphism Design Tokens

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
    dark: "30px",  // Enhanced blur for frosted effect
},
```

### Why Frosted Glass?

**Evolution from Standard Glassmorphism**:

**Previous Issues**:
- Cards had visible borders (1px solid)
- Shadows not soft enough
- Lacked "cloud floating in air" lightweight feeling

**New Design Direction**:
- **Remove Borders**: Space separated naturally through blur and shadows
- **Enhanced Blur**: blur(20px → 30px), background faintly visible
- **Diffusion Shadows**: Ultra-soft multi-layer shadows, max blur radius 96px
- **Cloud Floating**: Hover lifts upward, shadows expand

**Visual Feel**:
> "Cards are no longer hard-edged rectangles, but soft clouds floating in air—lightweight, translucent, natural."

### Frosted Glass Components

#### 1. Glass Card

**Design Features**:
- Semi-transparent background (50% opacity)
- Enhanced blur: `backdrop-filter: blur(30px) saturate(180%)`
- No borders or extremely subtle borders (opacity < 0.03)
- Multi-layer diffusion shadows:
  - Layer 1: `0 8px 32px oklch(0 0 0 / 0.08)`
  - Layer 2: `0 16px 64px oklch(0 0 0 / 0.12)`
  - Layer 3: `0 24px 96px oklch(0 0 0 / 0.15)` (cloud-like floating)
- Hover: lift upward 8px + enhanced shadow diffusion

**Complete Example**:
```css
.glass-card {
    /* Enhanced Glassmorphism */
    background: oklch(from var(--card) l c h / 0.5);
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);

    /* No border or extremely subtle */
    border: 1px solid oklch(1 0 0 / 0.03);
    border-radius: var(--radius-lg);

    /* Diffusion Shadow (Cloud-like) */
    box-shadow:
        0 8px 32px oklch(0 0 0 / 0.08),
        0 16px 64px oklch(0 0 0 / 0.12),
        0 24px 96px oklch(0 0 0 / 0.15);

    padding: 1.5rem;
    transition: all 400ms ease-out;
}

.glass-card:hover {
    transform: translateY(-8px);
    box-shadow:
        0 12px 40px oklch(0 0 0 / 0.10),
        0 24px 80px oklch(0 0 0 / 0.15),
        0 36px 120px oklch(0 0 0 / 0.20);
    background: oklch(from var(--card) calc(l + 0.02) c h / 0.6);
}
```

**Variants**:
- `glass-card--interactive`: Clickable with active state
- `glass-card--message-own`: For sent messages (primary blue tint)
- `glass-card--message-other`: For received messages (neutral)
- `glass-card--modal`: Higher elevation for modals

#### 2. Glass Button

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

#### 3. Glass Input

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

### Bubble Card Design

**Design Goal**: Evolve from uniform to organic shapes

**From Uniform to Organic**:
- Uniform radius → Asymmetric radius
- Static shape → Dynamic morphing
- Rectangular card → Message bubble

#### Asymmetric Rounded Corners

**Design Principle**: Simulate natural handwritten message feel, with "tails" at bottom-left/right

**Universal Card** (No directionality):
```css
.bubble-card {
    border-radius: 1.5rem 1.2rem 1.5rem 1.2rem;
    /* top-left, top-right, bottom-right, bottom-left */
}
```

**Sent Message Bubble** (Right side, tail at bottom-right):
```css
.bubble-card--send {
    border-radius: 1.5rem 1.5rem 0.5rem 1.5rem;
    /* Small radius at bottom-right (0.5rem) = bubble tail */
}
```

**Received Message Bubble** (Left side, tail at bottom-left):
```css
.bubble-card--receive {
    border-radius: 1.5rem 1.5rem 1.5rem 0.5rem;
    /* Small radius at bottom-left (0.5rem) = bubble tail */
}
```

#### Bubble Squeeze Animation

**Hover**: Corners enlarge
```css
.bubble-card:hover {
    border-radius: 1.8rem 1.5rem 1.8rem 1.5rem;
    /* Corners increase by 0.3rem */
}
```

**Active**: Slight compression
```css
.bubble-card:active {
    transform: translateY(-2px) scale(0.98);
    border-radius: 1.2rem 1rem 1.2rem 1rem;
    /* Corners reduce, simulating press */
}
```

**Design Rationale**:
- Simulates real bubble compression feel
- 150ms quick feedback matches user expectation
- Uses elastic easing: cubic-bezier(0.68, -0.55, 0.265, 1.55)

### Browser Support

#### Backdrop Filter Support

**Supported Browsers**:
- Chrome/Edge: Native support
- Safari: Requires `-webkit-` prefix
- Firefox: 101+ native support, older versions need flag

**Fallback Strategy** (Graceful Degradation):
```css
@supports not (backdrop-filter: blur(30px)) {
    .glass-button,
    .glass-input,
    .glass-card,
    .bubble-card {
        background: var(--card);
        border: 1px solid var(--border);
    }

    .bubble-card--send {
        background: var(--primary);
        color: var(--primary-foreground);
    }
}
```

---

## Component System

### Primitive Components (Headless)

**Location**: `/shared/components/primitives/`

**Purpose**: Provide shared component logic without visual styles

**Example - Button Primitive**:
```typescript
import { useButton, type ButtonProps } from '@shared/components/primitives/button';

function MyButton(props: ButtonProps) {
  const { state, handlers, isDisabled } = useButton(props);

  // Use state and handlers to implement custom UI
}
```

### UI Components

#### Web Button

**Location**: `/frontend/src/components/ui/button.tsx`

**Usage Example**:
```tsx
import { Button } from '@/components/ui/button';

function Example() {
  return (
    <>
      <Button variant="default">Default Button</Button>
      <Button variant="destructive" size="sm">Delete</Button>
      <Button variant="outline" loading>Loading...</Button>
    </>
  );
}
```

**Variants**: default, destructive, outline, secondary, ghost, link

**Sizes**: default, sm, lg, icon

#### Mobile Button

**Location**: `/mobile/src/components/ui/button.tsx`

**Usage Example**:
```tsx
import { Button } from '@/components/ui/button';

function Example() {
  return (
    <>
      <Button variant="default" onPress={() => console.log('Pressed')}>
        Default Button
      </Button>
      <Button variant="destructive" size="sm">Delete</Button>
      <Button variant="outline" loading>Loading...</Button>
    </>
  );
}
```

**Variants**: Same as Web

**Sizes**: Same as Web

---

## Usage Guide

### Web Using Design Tokens

**Direct Tailwind classes** (Recommended):
```tsx
<div className="bg-primary text-primary-foreground p-4 rounded-lg">
  Content
</div>
```

**CSS variables in CSS**:
```css
.custom-component {
  background-color: var(--primary);
  color: var(--primary-foreground);
}
```

### Mobile Using Design Tokens

**NativeWind classes** (Recommended):
```tsx
<View className="bg-primary p-4 rounded-lg">
  <Text className="text-primary-foreground">Content</Text>
</View>
```

**Direct design token reference** (Advanced):
```tsx
import { nativeShadows } from '@shared/design-tokens';

<View style={nativeShadows.md}>
  <Text>Content with shadow</Text>
</View>
```

### Using Glassmorphism Components

**Web - Glass Card**:
```tsx
import '@/styles/components/glass-card.css';

function ProfileCard() {
    return (
        <div className="glass-card">
            <h3>User Profile</h3>
            <p>This is a frosted glass card</p>
        </div>
    );
}
```

**Web - Message Bubble**:
```tsx
import '@/styles/components/bubble-card.css';

function MessageBubble({ message, isOwn }) {
    return (
        <div className={`bubble-card ${isOwn ? 'bubble-card--send' : 'bubble-card--receive'}`}>
            <p>{message.content}</p>
            <span>{formatTime(message.createdAt)}</span>
        </div>
    );
}
```

### OKLCH to RGB Converter

Mobile requires converting OKLCH colors to RGB format:

```typescript
import { oklchToRgb } from '@shared/design-tokens';

const rgbColor = oklchToRgb('oklch(0.5 0.2 180)');
// Returns: "rgb(0, 200, 180)"
```

**Note**: Tailwind config automatically handles this conversion, manual calls typically unnecessary.

---

## Best Practices

### 1. Prioritize Design Tokens

**✅ Good Practice**:
```tsx
<button className="bg-primary text-primary-foreground">
  Submit
</button>
```

**❌ Avoid Hardcoded Colors**:
```tsx
<button className="bg-blue-500 text-white">
  Submit
</button>
```

### 2. Use Shared Components

When Web and Mobile need same logic, prioritize Primitive Components.

**Example**:
```tsx
// ✅ Use Primitive
import { useButton } from '@shared/components/primitives/button';

// ❌ Duplicate implementation of same logic
```

### 3. Responsive Design

**Web**:
```tsx
<div className="px-4 sm:px-6 lg:px-8">
  Content
</div>
```

**Mobile**: NativeWind doesn't support breakpoints, use React Native Dimensions API.

### 4. Light/Dark Mode

**Web**: Use Tailwind's `dark:` variant
```tsx
<div className="bg-background text-foreground">
  {/* Automatically switches colors based on .dark class */}
</div>
```

**Mobile**: NativeWind v4 supports dark mode (requires `darkMode: 'class'` config)
```tsx
<View className="bg-background">
  <Text className="text-foreground">Content</Text>
</View>
```

### 5. Accessibility

- Use semantic HTML elements (Web)
- Ensure color contrast >4.5:1 (WCAG AA)
- Provide appropriate focus states for all interactive elements
- Mobile: Use `accessible` and `accessibilityLabel` props

### 6. Performance Optimization

**Web**:
- Avoid overusing `cn()` function (only when merging classes needed)
- Use `React.memo` to wrap pure presentational components

**Mobile**:
- Use `React.memo` to reduce unnecessary re-renders
- Use `StyleSheet.create()` for complex styles not applicable to NativeWind

---

## Extending Design System

### Adding Design Token

1. Create or modify file in `/shared/design-tokens/`
2. Update `/shared/design-tokens/index.ts` exports
3. Update `/frontend/src/styles.css` (Web CSS variables)
4. Update `/mobile/tailwind.config.ts` (if needed)
5. Update this documentation

### Adding Primitive Component

1. Create new directory in `/shared/components/primitives/`
2. Create `types.ts`, `use-*.ts`, `index.ts`
3. Implement UI versions separately for Web and Mobile
4. Add tests
5. Update this documentation

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
    ├── glass-button.css   # Glass button component
    ├── glass-input.css    # Glass input component
    ├── glass-card.css     # Glass card component (frosted glass)
    └── bubble-card.css    # Bubble card component (message bubbles)
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
- `.glass-card` (base frosted glass)
- `.glass-card--interactive` (clickable)
- `.glass-card--compact`, `.glass-card--spacious` (padding variants)
- `.glass-card--highlight` (with border glow)
- `.glass-card--message-own`, `.glass-card--message-other` (chat bubbles)
- `.glass-card--modal` (higher elevation)

**Bubble Cards**:
- `.bubble-card` (base)
- `.bubble-card--send` (right side, tail at bottom-right)
- `.bubble-card--receive` (left side, tail at bottom-left)

---

## Design Evolution Comparison

### Frosted Glass Evolution

| Feature | Old Design (Glassmorphism) | New Design (Frosted Glass) |
|---------|---------------------------|---------------------------|
| Border | 1px solid (opacity 0.1) | None or extremely subtle (opacity 0.03) |
| Blur Strength | blur(20px) | blur(30px) |
| Background Opacity | 60% | 50% |
| Shadow Blur Radius | Max 16px | Max 96px |
| Hover Lift | 2px | 8px |
| Visual Feel | Frosted glass | Cloud floating in air |

### Message Bubble Evolution

| Feature | Old Design (Regular Card) | New Design (Bubble Card) |
|---------|-------------------------|------------------------|
| Corners | Uniform (0.625rem) | Asymmetric (1.5rem / 0.5rem) |
| Shape | Rectangle | Organic bubble |
| Hover | No corner change | Corners enlarge |
| Active | No morphing | Slight compression (scale 0.98) |
| Visual Feel | Uniform card | Message bubble |

---

## Design Delivery Checklist

Before deploying glassmorphism/bubble components:

### Visual Quality
- [ ] Cards have no visible borders (opacity < 0.05)
- [ ] Enhanced blur effect (blur 30px)
- [ ] Ultra-soft diffusion shadows (max blur 96px)
- [ ] Smooth hover lift effect (cloud-like)
- [ ] Both Dark/Light modes display correctly
- [ ] Safari fallback works properly

### Interaction
- [ ] Hover states provide clear feedback (lift + scale)
- [ ] Active states show compression (scale 0.98)
- [ ] Focus states have visible glow (3px ring)
- [ ] Animations are smooth (200-400ms ease-out)
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

## Reference Resources

### Design Inspiration
- **macOS Messages**: Blue primary color, glass message bubbles
- **macOS FaceTime**: Green call buttons, glass controls
- **macOS System Preferences**: Card layouts, sidebar design
- **macOS Big Sur/Monterey/Ventura**: Overall glassmorphism aesthetic

### Technical Resources
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [NativeWind v4 Documentation](https://www.nativewind.dev/)
- [OKLCH Color Space](https://oklch.com/)
- [Culori Library](https://culorjs.org/)
- [Class Variance Authority](https://cva.style/docs)
- [Glassmorphism CSS Generator](https://hype4.academy/tools/glassmorphism-generator)
- [MDN: backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)

### Related Documents
- `/docs/design/design-philosophy.md` - Core design principles
- `/docs/design/micro-interactions.md` - Interaction details and animations
- `/CLAUDE.md` - Frontend UI/UX design guidelines

---

**Last Updated**: 2026-02-05
**Version**: 2.0.0 (macOS Glassmorphism + Frosted Glass)

**Design Core**: Cards are no longer hard-edged rectangles, but soft clouds floating in air; messages are no longer uniform blocks, but organic bubbles conveying emotion.
