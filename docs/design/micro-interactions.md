# Ping Micro-Interactions Design Guide

Making every interaction a meaningful ritual with warmth

---

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Core Micro-interactions](#core-micro-interactions)
- [Implementation Specifications](#implementation-specifications)
- [Accessibility](#accessibility)
- [User Settings](#user-settings)

---

## Design Philosophy

### Why Micro-interactions?

Micro-interactions are the core manifestation of Ping's "ritual-first" design philosophy. In Ping, every click, every hover is not a cold operation, but a conversation with warmth.

**Design Goals**:
- Enhance user's sense of operation and ritual
- Provide immediate visual feedback
- Make the interface lively, not a static tool
- Align with "message sending = signal transmission" communication theme

### One-sentence Description

> "In Ping, pressing send creates rippling water waves, message bubbles float up lightly—every micro-interaction is like conversing with the interface. This isn't a cold tool, but a warm ritual."

---

## Core Micro-interactions

### 1. Ripple Effect (Hover Effect)

**Usage**: All button hover effects

**Design Features**:
- Circular ripple originates from mouse position (button center)
- Ripple expands outward (scale 0 → 200%)
- Ripple gradually fades out (opacity 0.3 → 0)
- Duration: 500ms
- Can stack multiple ripples (during rapid movement)

**Visual Feel**:
> Like clicking on water surface creating ripples, aligning with "sending message = signal transmission" theme

**Implementation Example**:
```css
.glass-button::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: oklch(from var(--primary) l c h / 0.3);
    transform: translate(-50%, -50%);
    transition: none;
    opacity: 0;
    pointer-events: none;
}

.glass-button:hover::before {
    animation: ripple-expand 500ms ease-out;
}

@keyframes ripple-expand {
    0% {
        width: 0;
        height: 0;
        opacity: 0.3;
    }
    50% {
        opacity: 0.2;
    }
    100% {
        width: 200%;
        height: 200%;
        opacity: 0;
    }
}
```

**Usage Scenarios**:
- Send message button
- General buttons
- All clickable elements

---

### 2. Send Message Animation

**Usage**: When clicking send button

**Design Features**:
- Paper plane icon flies out
- Button shrinks and disappears
- Reappears
- Duration: 600ms
- Easing: cubic-bezier(0.68, -0.55, 0.265, 1.55) (elastic)

**Visual Feel**:
> Message flies out like a paper plane, full of dynamism

**Implementation Example**:
```css
@keyframes send-message-fly {
    0% {
        transform: scale(1) translateX(0);
        opacity: 1;
    }
    50% {
        transform: scale(0.8) translateX(20px) translateY(-10px) rotate(15deg);
        opacity: 0.8;
    }
    100% {
        transform: scale(0.3) translateX(100px) translateY(-30px) rotate(45deg);
        opacity: 0;
    }
}
```

**Usage Scenarios**:
- Send message button after click
- Any "send" operation

---

### 3. Receive Message Animation

**Usage**: When receiving new message

**Design Features**:
- Message bubble slides in from below
- Slight bounce
- Accompanied by subtle aura pulse (2 times)
- Duration: 400ms

**Visual Feel**:
> Message bounces into chat room lightly, like receiving a surprise gift

**Implementation Example**:
```css
@keyframes receive-message-slide {
    0% {
        transform: translateY(20px) scale(0.95);
        opacity: 0;
    }
    60% {
        transform: translateY(-2px) scale(1.02);
        opacity: 1;
    }
    100% {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
}

@keyframes receive-glow-pulse {
    0%, 100% {
        box-shadow: 0 0 0 oklch(from var(--primary) l c h / 0);
    }
    25% {
        box-shadow: 0 0 20px oklch(from var(--primary) l c h / 0.3);
    }
    50% {
        box-shadow: 0 0 0 oklch(from var(--primary) l c h / 0);
    }
    75% {
        box-shadow: 0 0 20px oklch(from var(--primary) l c h / 0.3);
    }
}
```

**Usage Scenarios**:
- Receiving new message
- Any "receive" operation

---

### 4. Typing Indicator

**Usage**: When other party is typing

**Design Features**:
- 3 dots bounce sequentially (wave animation)
- Loops continuously
- Coordinated with breathing-like aura
- Duration: 1.4s (loop)

**Visual Feel**:
> Like breathing rhythm, conveying "other person is thinking" feeling

**Implementation Example**:
```css
.typing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--muted-foreground);
    animation: typing-wave 1.4s ease-in-out infinite;
}

.typing-dot:nth-child(1) {
    animation-delay: 0s;
}

.typing-dot:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typing-wave {
    0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.7;
    }
    30% {
        transform: translateY(-8px);
        opacity: 1;
    }
}

/* Breathing glow */
@keyframes typing-glow-pulse {
    0%, 100% {
        box-shadow: 0 0 10px oklch(from var(--muted) l c h / 0.3);
    }
    50% {
        box-shadow: 0 0 20px oklch(from var(--muted) l c h / 0.6);
    }
}
```

**Usage Scenarios**:
- Other party typing
- Any "loading" state

---

### 5. Call Button Animation

**Usage**: Voice/video call buttons

**Design Features**:
- **Hover**: Circular diffusion (like sound waves, continuous loop)
- **Click**: Button pulse + circular ripple expands outward
- Duration: 800ms

**Visual Feel**:
> Sound waves transmitting outward, reinforcing "call" feeling

**Implementation Example**:
```css
.glass-button--call::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: transparent;
    border: 2px solid oklch(from var(--accent) l c h / 0.5);
    opacity: 0;
    pointer-events: none;
}

.glass-button--call:hover::after {
    animation: call-wave-expand 1.5s ease-out infinite;
}

@keyframes call-wave-expand {
    0% {
        transform: scale(1);
        opacity: 0.5;
    }
    100% {
        transform: scale(2);
        opacity: 0;
    }
}

@keyframes call-pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.2);
    }
    100% {
        transform: scale(1);
    }
}
```

**Usage Scenarios**:
- Voice call button
- Video call button
- Any "call" operation

---

### 6. Avatar Interaction Animation

**Usage**: User avatars

**Design Features**:
- **Hover**: Outer ring aura rotates (360 degrees, 2s loop)
- **Click**: Avatar slightly enlarges + aura pulse
- Duration: 400ms (click)

**Visual Feel**:
> Avatar glows as if selected, reinforcing "this is a person" feeling

**Implementation Example**:
```css
.avatar::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: conic-gradient(
        from 0deg,
        oklch(from var(--primary) l c h / 0.5),
        oklch(from var(--accent) l c h / 0.5),
        oklch(from var(--primary) l c h / 0.5)
    );
    opacity: 0;
    transition: opacity 300ms ease;
    pointer-events: none;
}

.avatar:hover::before {
    opacity: 1;
    animation: avatar-ring-rotate 2s linear infinite;
}

@keyframes avatar-ring-rotate {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

@keyframes avatar-pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.15);
        box-shadow: 0 0 20px oklch(from var(--primary) l c h / 0.5);
    }
    100% {
        transform: scale(1);
    }
}
```

**Usage Scenarios**:
- User avatars
- Contact avatars
- Any element representing "person"

---

## Implementation Specifications

### File Structure

```
/frontend/src/styles/animations/
├── micro-interactions.css      # All micro-interaction animation definitions

/frontend/src/contexts/
├── micro-interaction-context.tsx  # Micro-interaction global settings Context
```

### Using Micro-interactions (Web)

**1. Import CSS**:
```tsx
import '@/styles/animations/micro-interactions.css';
```

**2. Use Context**:
```tsx
import { useMicroInteractionClass } from '@/contexts/micro-interaction-context';

function SendButton() {
    const sendClass = useMicroInteractionClass('send-message');

    const handleSend = () => {
        // Trigger animation
        buttonRef.current?.classList.add(sendClass);

        // Remove after animation completes
        setTimeout(() => {
            buttonRef.current?.classList.remove(sendClass);
        }, 600);
    };

    return <button onClick={handleSend}>Send</button>;
}
```

**3. Use Typing Indicator**:
```tsx
import { useTypingIndicator } from '@/contexts/micro-interaction-context';

function ChatWindow() {
    const typingIndicator = useTypingIndicator();

    return (
        <div>
            {isTyping && typingIndicator}
        </div>
    );
}
```

---

## Accessibility

### Reduced Motion Support

**All micro-interactions must support `prefers-reduced-motion`**:

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }

    /* Disable ripple effects */
    .glass-button::before,
    .micro-call-hover::after,
    .micro-avatar-hover::before {
        display: none;
    }

    /* Disable transform animations */
    .micro-send-message,
    .micro-receive-message,
    .micro-call-pulse,
    .micro-avatar-pulse {
        animation: none;
    }

    /* Keep typing indicator functional but simplified */
    .micro-typing-dot {
        animation: none;
        opacity: 0.7;
    }
}
```

### Keyboard Navigation

All micro-interaction elements must support keyboard navigation:
- Tab: Focus element
- Enter/Space: Trigger interaction
- Escape: Cancel interaction (if applicable)

### Screen Readers

All micro-interaction elements must provide appropriate ARIA labels:
```tsx
<button
    className="glass-button"
    aria-label="Send message"
    aria-live="polite"
    aria-busy={isSending}
>
    Send
</button>
```

---

## User Settings

### Micro-Interaction Context

Provides global settings allowing users to control animation intensity:

**Settings Options**:

1. **Animation Intensity**:
   - `full`: Full micro-interactions (default)
   - `reduced`: Simplified micro-interactions (aligns with reduced-motion)
   - `none`: Disable all micro-interactions

2. **Ritual Effects**:
   - `true`: Enable ritual effects (apology, celebration, reconciliation)
   - `false`: Disable ritual effects

3. **Sound Feedback** (Future feature):
   - `true`: Enable sounds
   - `false`: Disable sounds

**Implementation Example**:
```tsx
import { MicroInteractionProvider } from '@/contexts/micro-interaction-context';

function App() {
    return (
        <MicroInteractionProvider>
            <YourApp />
        </MicroInteractionProvider>
    );
}
```

**Settings Interface**:
```tsx
import { useMicroInteraction } from '@/contexts/micro-interaction-context';

function SettingsPage() {
    const { settings, updateSettings } = useMicroInteraction();

    return (
        <div>
            <label>
                Animation Intensity:
                <select
                    value={settings.level}
                    onChange={(e) => updateSettings({ level: e.target.value })}
                >
                    <option value="full">Full</option>
                    <option value="reduced">Reduced</option>
                    <option value="none">None</option>
                </select>
            </label>

            <label>
                <input
                    type="checkbox"
                    checked={settings.ritualEffects}
                    onChange={(e) => updateSettings({ ritualEffects: e.target.checked })}
                />
                Enable Ritual Effects
            </label>
        </div>
    );
}
```

---

## Border Ripple Effect (Universal Interaction Pattern)

### Design Philosophy

**Core Concept**: When hovering over glass elements, the border "breathes" outward like ripples

**Visual Metaphor**:
- Like dropping a stone in water, creating ripples
- Reinforces "sending message = signal transmission" theme
- Unifies all interactive element hover states

### Implementation Specification

**Basic Border Ripple**:
```css
.glass-element {
    position: relative;
    border: 1px solid oklch(from var(--primary) l c h / 0.2);
    transition: all 300ms ease-out;
}

.glass-element::before {
    content: '';
    position: absolute;
    inset: -1px;
    border: 1px solid oklch(from var(--primary) l c h / 0);
    border-radius: inherit;
    transition: all 300ms ease-out;
    pointer-events: none;
}

.glass-element:hover::before {
    inset: -12px;
    border-color: oklch(from var(--primary) l c h / 0.15);
}

.glass-element:active::before {
    inset: -18px;
    border-color: oklch(from var(--primary) l c h / 0.25);
}
```

**Advanced Version** (Multi-layer Ripple):
```css
.glass-element--enhanced {
    position: relative;
}

/* Outer ripple ring */
.glass-element--enhanced::before {
    content: '';
    position: absolute;
    inset: -1px;
    border: 2px solid oklch(from var(--primary) l c h / 0);
    border-radius: inherit;
    transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
}

/* Inner glow ring */
.glass-element--enhanced::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 0 oklch(from var(--primary) l c h / 0);
    transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
}

.glass-element--enhanced:hover::before {
    inset: -16px;
    border-color: oklch(from var(--primary) l c h / 0.2);
}

.glass-element--enhanced:hover::after {
    box-shadow: inset 0 0 20px oklch(from var(--primary) l c h / 0.15);
}

.glass-element--enhanced:active::before {
    inset: -24px;
    border-color: oklch(from var(--primary) l c h / 0.3);
}

.glass-element--enhanced:active::after {
    box-shadow: inset 0 0 30px oklch(from var(--primary) l c h / 0.25);
}
```

### Usage Scenarios

**Buttons**:
```css
.glass-button:hover::before {
    inset: -12px;
    border-color: oklch(from var(--primary) l c h / 0.15);
}
```

**Input Fields**:
```css
.glass-input:focus::before {
    inset: -8px;
    border-color: oklch(from var(--primary) l c h / 0.25);
}
```

**Cards**:
```css
.glass-card:hover::before {
    inset: -16px;
    border-color: oklch(from var(--primary) l c h / 0.1);
}
```

**Avatars**:
```css
.avatar:hover::before {
    inset: -8px;
    border-color: oklch(from var(--primary) l c h / 0.3);
}
```

### Performance Optimization

**GPU Acceleration**:
```css
.glass-element::before {
    will-change: inset, border-color;
    transform: translateZ(0);
}
```

**Reduced Motion Support**:
```css
@media (prefers-reduced-motion: reduce) {
    .glass-element::before {
        transition: none;
        display: none;
    }
}
```

---

## Design Delivery Checklist

Every micro-interaction implementation must ensure:

### Technical Quality
- [ ] Animation is smooth (no jank)
- [ ] Duration follows specifications (150-800ms)
- [ ] Uses correct easing curve
- [ ] Supports prefers-reduced-motion
- [ ] No layout shift
- [ ] No console errors

### Visual Quality
- [ ] Animation follows design specifications
- [ ] Colors use Design Tokens
- [ ] Both Dark/Light modes display correctly
- [ ] Animation doesn't interfere with reading
- [ ] Animation doesn't cause visual fatigue

### Accessibility
- [ ] Supports keyboard navigation
- [ ] Provides ARIA labels
- [ ] Supports screen readers
- [ ] Supports reduced-motion
- [ ] Touch-friendly (mobile)

### User Experience
- [ ] Provides immediate feedback
- [ ] Doesn't block user operations
- [ ] Can be interrupted (if applicable)
- [ ] Provides user settings options
- [ ] Meets user expectations

---

## Reference Resources

### Design Inspiration
- **Material Design Ripple**: Google Material Design's ripple effect
- **iOS Animations**: Apple iOS elastic animations
- **Telegram**: Lightweight fluid micro-interactions
- **Discord**: Refined hover effects

### Technical Documentation
- [Framer Motion](https://www.framer.com/motion/)
- [React Spring](https://www.react-spring.dev/)
- [CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)

### Animation Tools
- [Cubic Bezier Generator](https://cubic-bezier.com/)
- [Easing Functions Cheat Sheet](https://easings.net/)
- [Animista](https://animista.net/)

---

**Last Updated**: 2026-02-05
**Version**: 2.0.0

**Design Core**: Make every micro-interaction a warm ritual, not a cold operation.
