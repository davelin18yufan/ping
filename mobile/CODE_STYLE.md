# Ping Mobile - Code Style Guide

This document describes the code style configuration for the Ping Mobile application (React Native/Expo).

## Technologies

- **Framework**: React Native 0.81 + Expo 54
- **Language**: TypeScript 5.9 (strict mode)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Routing**: Expo Router (file-based routing)
- **Testing**: Jest + React Native Testing Library

## Code Style Standards

### Indentation & Formatting

- **Indent**: 4 spaces (no tabs)
- **Line width**: 80 characters
- **Semicolons**: No semicolons
- **Quotes**: Double quotes
- **Trailing comma**: ES5 style
- **Arrow functions**: Always use parentheses around parameters
- **End of line**: LF (Unix-style)

### TypeScript Configuration

All TypeScript settings are aligned with frontend/backend for consistency:

- **Strict mode**: Enabled
- **No unused locals**: Error
- **No unused parameters**: Error
- **No fallthrough cases in switch**: Error
- **No unchecked indexed access**: Enabled
- **Target**: ES2022
- **JSX**: react-native

### Path Aliases

The following path aliases are configured in `tsconfig.json`:

```typescript
import { Component } from "@/components/Component"
import { useHook } from "@/hooks/useHook"
import { CONSTANT } from "@/constants/constant"
import image from "@/assets/image.png"
```

## ESLint Configuration

### Key Rules

- **No console**: Off (allowed in mobile dev)
- **No debugger**: Error
- **Equality**: Always use `===` and `!==`
- **No var**: Error (use `const` or `let`)
- **Prefer const**: Warning
- **React hooks**: Rules of hooks enforced

### TypeScript Rules

- **No unused vars**: Error (with underscore prefix exemption)
- **No explicit any**: Warning (prefer proper typing)
- **No non-null assertion**: Warning (use proper null checks)

### Testing Library Rules

For test files (`*.spec.tsx`, `*.test.tsx`):

- **Await async queries**: Error
- **No await sync queries**: Error
- **No debugging utils**: Warning
- **Prefer screen queries**: Warning

## Prettier Configuration

Prettier is integrated with ESLint via `eslint-plugin-prettier`. Key settings:

- Tailwind CSS class sorting via `prettier-plugin-tailwindcss`
- Consistent formatting across all `.ts`, `.tsx`, `.js`, `.jsx`, and `.json` files

## Commands

### Linting

```bash
# Run ESLint
pnpm lint

# Run ESLint with auto-fix
pnpm lint --fix
```

### Formatting

```bash
# Format all files
pnpm exec prettier --write "**/*.{ts,tsx,js,jsx,json}"

# Check formatting without writing
pnpm exec prettier --check "**/*.{ts,tsx,js,jsx,json}"
```

### Type Checking

```bash
# Run TypeScript type checker
pnpm exec tsc --noEmit
```

## File Structure

```
mobile/
├── app/                    # Expo Router routes (file-based routing)
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── constants/              # App constants (theme, colors, etc.)
├── assets/                 # Images, fonts, etc.
├── tests/                  # Test files and mocks
├── .prettierrc             # Prettier configuration
├── .prettierignore         # Prettier ignore patterns
├── eslint.config.js        # ESLint configuration (flat config)
├── tsconfig.json           # TypeScript configuration
└── .editorconfig           # Editor configuration
```

## Best Practices

### Component Naming

- **Components**: PascalCase (`LoginScreen`, `MessageBubble`)
- **Hooks**: camelCase with `use` prefix (`useAuth`, `useMessages`)
- **Constants**: CONSTANT_CASE (`PRIMARY_COLOR`, `API_URL`)
- **Functions**: camelCase (`handleLogin`, `formatDate`)

### File Organization

- One component per file
- Co-locate component styles using NativeWind classes
- Place shared types in separate files
- Group related components in directories

### NativeWind Usage

Always use NativeWind (Tailwind CSS for React Native) instead of `StyleSheet.create`:

```tsx
// ✅ Good - NativeWind
;<View className="flex-1 bg-gray-50 p-4">
    <Text className="text-lg font-bold text-gray-800">Hello</Text>
</View>

// ❌ Bad - StyleSheet.create
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f9fafb",
        padding: 16,
    },
})
```

### Testing

- Write tests alongside implementation (TDD approach)
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Mock external dependencies

## Integration with Frontend/Backend

This mobile configuration is designed to maintain consistency with:

- **Frontend** (`/frontend`): Same TypeScript rules, similar path aliases
- **Backend** (`/backend`): Same indentation (4 spaces), no semicolons, double quotes

All configurations follow the guidelines specified in `/CLAUDE.md`.

## Troubleshooting

### ESLint Issues

If ESLint shows unexpected errors, try:

1. Clear ESLint cache: `rm -rf node_modules/.cache`
2. Reinstall dependencies: `pnpm install`
3. Restart your editor

### Prettier Issues

If Prettier formatting is inconsistent:

1. Check `.prettierrc` configuration
2. Ensure `prettier-plugin-tailwindcss` is installed
3. Run `pnpm exec prettier --check .` to see which files have issues

### TypeScript Issues

If TypeScript shows type errors:

1. Ensure `tsconfig.json` is correctly configured
2. Run `pnpm exec tsc --noEmit` to see all type errors
3. Check path aliases are correctly set up

---

**Last updated**: 2025-01-22
**Maintained by**: Fullstack Frontend Developer
