# Ping Design Philosophy

A modern instant messaging application reimagining Yahoo! Messenger, blending contemporary technology with emotional design.

---

## Core Design Principles

### Principle 1: Ritual-First, Emotion Visualization

#### Interaction Rituals

Every interaction carries a sense of "ritual," transforming communication from mere text transmission into an emotional experience:

- **Room Entry Effects**: Fade-in animations, ambient sounds, welcome messages
- **Message Send Animations**: Bubble pop-out, light wave diffusion, delivery confirmation
- **Activity Completion Celebrations**: Firework particles, badge unlocks, achievement notifications
- **Emotional Rituals**:
  - 🙏 **Apology**: Blue-purple aura, soft pulse, reconciliation prompt
  - 🎉 **Celebration**: Golden fireworks, confetti animation, achievement unlock
  - 💝 **Reconciliation**: Pink hearts, warm gradient, relationship repair

#### Contextual Sticker System

Preserving LINE's diversity while evolving into "smart contextual stickers":

- **AI Context Recommendations**: Intelligently suggest stickers based on conversation content
- **Dynamic Reaction Stickers**:
  - Heartbreak stickers shatter and disperse
  - Celebration stickers glow and bounce
  - Apology stickers pulse softly
  - More to be added
- **Emotional Ritual Records**: Each ritual creates a replayable "time capsule"

---

### Principle 2: Lightweight Real-time, Reduced Latency

#### Technical Commitments

- **Ultra-low Latency**: End-to-end encryption + edge computing, messages delivered in **< 100ms** (3-5x faster than LINE)
- **Performance Guarantees**:
  - Smooth 60fps scrolling even with 10,000 messages
  - Cross-device sync < 1 second
  - Offline editing, send on reconnect

#### Smart Compression

- **Archive Cards**: Old messages automatically compress into "time capsules," saving space while remaining expandable
- **Infinite Scroll**: Virtualized lists render only visible areas
- **Progressive Loading**: Lazy-load images/videos, prioritize text

#### Fluid Animations

- **Micro-interaction Duration**: 150-300ms (matching human perception)
- **Easing Curves**: ease-out (enter), ease-in (exit)
- **Reduced Motion**: Follows accessibility design, respects user preferences

---

### Principle 3: Relationship Space, Context-Adaptive, Simple & Clean (Escaping LINE's Clutter)

#### Relationship Universes

No longer just a "message list," each relationship becomes a dedicated "space":

**Chat Room Three Zones**:
1. **Real-time Chat Flow** (Central Area)
   - Clean message bubbles
   - No ad interruptions
   - Smooth scrolling experience

2. **Activity Wall** (Sidebar)
   - Mini-games (rock-paper-scissors, collaborative drawing)
   - Live polls
   - Shared to-do lists
   - Countdown reminders

3. **Relationship Timeline** (Top Collapsible)
   - Ritual records (apologies, celebrations, reconciliations)
   - Shared achievements (chat days, message milestones)
   - Important moment markers

#### Adaptive UI

Interface automatically adjusts based on relationship intensity:

- **Active Period** (> 10 daily interactions):
  - Activity Wall auto-expands
  - Suggest mini-games/polls
  - Display real-time typing indicators

- **Steady Period** (3-10 daily interactions):
  - Focus on chat flow
  - Activity Wall collapses to sidebar
  - Maintain clean visuals

- **Cool-down Period** (< 3 interactions/day):
  - Pure chat mode
  - Gentle "long time no see" reminders
  - Suggest revisiting memories

#### Visual Cleanliness Promise

- ✅ **High saturation with hierarchy** (Recreate instant messenger vibrancy without clutter)
- ✅ **No forced push notifications** (Only notify for "ritual-worthy events")
- ✅ **No ad interruptions** (Clean, focused, respectful)
- ✅ **Smart Folding** (Non-essential elements hidden, always expandable)
- ✅ **Simple & Usable** (Follow UX best practices)

---

## Visual Design Language

### Design Positioning: Modern Dark Elegance

Inspired by Discord, enhanced with Yahoo! Messenger's emotional warmth:

- **Theme Modes**:
  - **Dark Mode (Default)**: Deep gray background, high contrast, clear layering
  - **Light Mode (Optional)**: Soft white, warm shadows, lightweight feel
  - **Auto (System Follow)**: Automatically switches based on system preference

### Color System

#### Dark Mode (Primary)

**Background Layers**:
- `bg-primary`: #1E1F22 (Deep gray, main background)
- `bg-secondary`: #2B2D31 (Secondary background, cards, sidebar)
- `bg-tertiary`: #383A40 (Tertiary background, hover state)

**Foreground Text**:
- `text-primary`: #F2F3F5 (Primary text, high contrast)
- `text-secondary`: #B5BAC1 (Secondary text, descriptions)
- `text-tertiary`: #80848E (Tertiary text, timestamps)

**Brand Colors (Accent)**:
- `accent-primary`: #5865F2 (Brand blue, CTA buttons, links)
- `accent-secondary`: #EB459E (Vibrant pink, ritual celebrations)
- `accent-success`: #23A55A (Success green, completion status)
- `accent-warning`: #F0B232 (Warning yellow, alerts)
- `accent-danger`: #F23F43 (Danger red, delete, errors)

**Ritual Colors**:
- 🙏 **Apology**: #7289DA (Blue-purple aura)
- 🎉 **Celebration**: #FEE75C (Golden fireworks)
- 💝 **Reconciliation**: #EB459E (Pink warmth)

#### Light Mode (Optional)

**Background Layers**:
- `bg-primary`: #FAF9F8 (Warm ivory white, main background - softer than pure white)
- `bg-secondary`: #F3F2F0 (Soft beige-gray, cards, sidebar)
- `bg-tertiary`: #ECEAE6 (Light warm gray, hover state)

**Foreground Text**:
- `text-primary`: #060607 (Deep black, primary text)
- `text-secondary`: #4E5058 (Gray, secondary text)
- `text-tertiary`: #80848E (Light gray, timestamps)

**Brand Colors**: Consistent with Dark Mode (ensuring contrast ratio > 4.5:1)

### Typography System

#### Font Selection (Avoiding Boring System Fonts)

- **Heading**: **Montserrat** (Geometric sans-serif, modern professional, sharper than Poppins)
- **Body**: **Inter** (Humanist sans-serif, clear readability, suitable for long text)
- **Monospace**: **JetBrains Mono** (Monospace, suitable for code, timestamps)

#### Font Size Hierarchy

```typescript
fontSize: {
  xs: '0.75rem',    // 12px - timestamps, labels
  sm: '0.875rem',   // 14px - secondary text, descriptions
  base: '1rem',     // 16px - message content
  lg: '1.125rem',   // 18px - headings, emphasis
  xl: '1.25rem',    // 20px - large headings
  '2xl': '1.5rem',  // 24px - room titles
  '3xl': '1.875rem' // 30px - ritual celebration text
}
```

#### Font Weight Hierarchy

```typescript
fontWeight: {
  normal: 400,   // Regular text
  medium: 500,   // Secondary headings
  semibold: 600, // Primary headings
  bold: 700      // Emphasis, CTAs
}
```

### Spacing System

#### Border Radius (Friendliness)

```typescript
borderRadius: {
  sm: '6px',   // Small elements (labels, status dots)
  md: '8px',   // Buttons, input fields
  lg: '12px',  // Message bubbles
  xl: '16px',  // Cards, sidebar
  '2xl': '24px' // Ritual effect containers
}
```

#### Spacing Hierarchy (Breathing Room)

- **Tight** (4px, 8px): Button padding, inline elements
- **Standard** (12px, 16px): Message spacing, form fields
- **Relaxed** (24px, 32px): Block spacing, page margins
- **Extra Relaxed** (48px, 64px): Section spacing, ritual effects

### Shadows & Depth

#### Layering System (Discord Style)

```typescript
shadows: {
  sm: '0 1px 3px rgba(0, 0, 0, 0.2)',        // Subtle lift (button hover)
  md: '0 4px 8px rgba(0, 0, 0, 0.3)',        // Cards, dropdowns
  lg: '0 8px 16px rgba(0, 0, 0, 0.4)',       // Modal, sidebar
  xl: '0 16px 32px rgba(0, 0, 0, 0.5)',      // Ritual effect containers
  glow: '0 0 20px rgba(88, 101, 242, 0.6)'   // Brand glow (CTAs)
}
```

### Animation Principles

#### Fluid Transitions (Avoiding Jank)

- **Micro-interactions**: 150ms (hover, focus)
- **Medium Animations**: 250ms (expand/collapse, fade in/out)
- **Large Animations**: 400ms (page transitions, ritual effects)

#### Easing Curves

```typescript
transition: {
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',    // Enter (snappy)
  easeIn: 'cubic-bezier(0.7, 0, 0.84, 0)',     // Exit (quick)
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)'  // Bounce (ritual effects)
}
```

#### Animation Hierarchy

- **Tier 1 (Must-have)**: Send message, enter room, trigger ritual
- **Tier 2 (Important)**: Expand/collapse, hover state, loading
- **Tier 3 (Optional)**: Background particles, decorative animations

#### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Component Design Priority

### Phase 1: Core Chat Experience (MVP)

1. **Message Bubble**
   - Self/other differentiation
   - Support text, stickers, ritual markers
   - Dynamic reactions (shatter, bounce, pulse)

2. **Message Input**
   - Text input + emoji picker
   - Ritual trigger buttons (apology, celebration, reconciliation)
   - Send animation

3. **Chat List**
   - Room list (one-on-one, groups)
   - Unread count
   - Last message preview

### Phase 2: Relationship Space (Enhanced UX)

4. **Chat Room Container**
   - Three-zone layout (chat flow + activity wall + timeline)
   - Room entry effects
   - Adaptive UI (relationship intensity)

5. **Activity Wall**
   - Mini-games (rock-paper-scissors, drawing)
   - Poll system
   - Shared lists

6. **Relationship Timeline**
   - Ritual records
   - Achievement unlocks
   - Important moments

### Phase 3: Advanced Features (Delight)

7. **Ritual Effects System**
   - Apology aura
   - Celebration fireworks
   - Reconciliation hearts

8. **Smart Sticker Picker**
   - AI context recommendations
   - Dynamic search
   - Favorites

9. **Archive Card**
   - Smart compression of old messages
   - Time capsules
   - Quick expand/collapse

---

## Accessibility Principles

### WCAG AAA Standards

- ✅ **Contrast Ratio**: Text contrast > 7:1 (AAA level)
- ✅ **Keyboard Navigation**: All features operable with Tab/Enter
- ✅ **Screen Reader**: Complete ARIA labels
- ✅ **Focus Visible**: Clear focus ring (2px solid)

### Inclusive Design

- ✅ **Color Blind Friendly**: Don't rely solely on color (add icons/text)
- ✅ **Animation Opt-out**: Reduced Motion support
- ✅ **Font Scalable**: Support 200% zoom without layout break
- ✅ **Touch Friendly**: Buttons at least 44x44px (mobile)

---

## Technical Implementation Principles

### Performance Goals

- ⚡ **First Contentful Paint**: < 1.5s
- ⚡ **Time to Interactive**: < 3s
- ⚡ **Largest Contentful Paint**: < 2.5s
- ⚡ **Cumulative Layout Shift**: < 0.1
- ⚡ **Message Render**: < 16ms (60fps)

### Optimization Strategies

- **Virtualized Scrolling**: Render only visible areas (react-window)
- **Image Lazy Loading**: Intersection Observer
- **Code Splitting**: Route lazy loading (React.lazy)
- **Service Worker**: Offline caching
- **WebP Format**: 50%+ image compression

### Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Polyfills**: CSS Grid, Flexbox, Custom Properties
- **Progressive Enhancement**: Core features work on older browsers

---

## Design Delivery Checklist

Every component design must ensure:

### Visual Quality

- [ ] No emoji used as icons (use Lucide React / Heroicons)
- [ ] All icons from consistent icon set
- [ ] Hover states don't cause layout shift
- [ ] Both Dark/Light modes display correctly

### Interaction Experience

- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transition animations are fluid (150-300ms)
- [ ] Focus state visible for keyboard navigation

### Technical Quality

- [ ] TypeScript types complete
- [ ] Props have JSDoc comments
- [ ] Passes ESLint/Oxlint (0 warnings)
- [ ] Formatted with Prettier/Oxfmt

### Test Coverage

- [ ] Unit tests (logic testing)
- [ ] Visual regression tests (Chromatic)
- [ ] Accessibility tests (axe-core)

---

## Reference Resources

### Design Inspiration

- **Discord**: Dark mode, clear layering, fluid animations
- **Yahoo! Messenger**: Vibrant colors, emotional warmth, ritual sense
- **Telegram**: Lightweight fluidity, performance-first, clean interface
- **Notion**: Adaptive UI, smart folding, deep integration

### Technical Documentation

- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Radix UI](https://www.radix-ui.com/) (Accessible primitive components)
- [React Window](https://react-window.vercel.app/) (Virtualized scrolling)

### Color Tools

- [OKLCH Color Picker](https://oklch.com/)
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Coolors Palette Generator](https://coolors.co/)

---

**Last Updated**: 2026-02-05
**Version**: 2.0.0

**Core Design Philosophy**: Make every conversation a memorable ritual, give every relationship its own dedicated space.
