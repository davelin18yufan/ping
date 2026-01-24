# Ping Mobile App

[![Mobile CI](https://github.com/your-org/ping/workflows/Mobile%20CI/badge.svg)](https://github.com/your-org/ping/actions/workflows/mobile-ci.yml)

This is the **Mobile** frontend for the Ping real-time messaging application, built with [Expo](https://expo.dev) and [React Native 0.81](https://reactnative.dev/).

## Tech Stack

- **Framework**: React Native 0.81 + Expo 54
- **Routing**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: TanStack Store
- **GraphQL Client**: Apollo Client
- **Real-time**: Socket.io-client
- **Authentication**: Better Auth Expo (OAuth + Deep Linking)
- **Testing**: Jest + React Native Testing Library
- **Language**: TypeScript

## Prerequisites

- Node.js 20.x or higher
- pnpm 10.28.1 or higher
- Expo Go app (for testing on physical devices)
- iOS Simulator (macOS only) or Android Emulator

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start the Development Server

```bash
pnpm start
```

In the output, you'll find options to open the app in:

- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go) - a limited sandbox for trying out app development with Expo

### 3. Platform-Specific Commands

```bash
# Run on Android
pnpm android

# Run on iOS
pnpm ios

# Run on Web (for testing only)
pnpm web
```

## Available Scripts

| Script               | Description                                       |
| -------------------- | ------------------------------------------------- |
| `pnpm start`         | Start the Expo development server                 |
| `pnpm android`       | Start on Android emulator/device                  |
| `pnpm ios`           | Start on iOS simulator/device                     |
| `pnpm web`           | Start web version (for testing)                   |
| `pnpm lint`          | Run ESLint                                        |
| `pnpm lint:fix`      | Run ESLint with auto-fix                          |
| `pnpm format`        | Format code with Prettier                         |
| `pnpm format:check`  | Check code formatting                             |
| `pnpm typecheck`     | Run TypeScript type checking                      |
| `pnpm test`          | Run Jest tests                                    |
| `pnpm test:watch`    | Run tests in watch mode                           |
| `pnpm test:coverage` | Run tests with coverage report                    |
| `pnpm check`         | Run all checks (typecheck + lint + format + test) |

## CI/CD Pipeline

This project uses **GitHub Actions** for continuous integration. The CI pipeline runs automatically on:

- Push to `main` branch
- Push to any `feature/**` branch
- Pull requests to `main` branch
- Only when changes are made to `/mobile/**` or the CI workflow file

### CI Jobs

The Mobile CI pipeline consists of the following parallel jobs:

#### 1. ESLint Check

- Runs ESLint to check code quality
- Command: `pnpm lint`
- Enforces coding standards and best practices

#### 2. Prettier Format Check

- Validates code formatting with Prettier
- Command: `pnpm format:check`
- Ensures consistent code style across the codebase

#### 3. TypeScript Type Check

- Runs TypeScript compiler in no-emit mode
- Command: `pnpm typecheck`
- Catches type errors before runtime

#### 4. Jest Tests with Coverage

- Runs all 97 Jest unit/integration tests
- Command: `pnpm test:coverage`
- Generates coverage reports
- Uploads coverage to Codecov (if configured)
- Archives coverage artifacts for 30 days

#### 5. All Checks Passed

- Final job that depends on all previous jobs
- Ensures all checks passed successfully
- Fails the pipeline if any job fails

### Running CI Checks Locally

Before pushing your code, you can run the same checks locally to ensure CI will pass:

```bash
# Run all checks (same as CI)
pnpm check

# Or run individual checks
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint check
pnpm format:check     # Prettier check
pnpm test:coverage    # Run tests with coverage
```

### CI Performance Optimizations

The CI pipeline includes several optimizations:

- **pnpm caching**: Dependencies are cached to speed up installations
- **Parallel jobs**: Lint, format check, type check, and tests run in parallel
- **Path filtering**: Only runs when Mobile code changes
- **Frozen lockfile**: Uses `--frozen-lockfile` to ensure reproducible builds

### Viewing CI Results

1. Go to the **Actions** tab in the GitHub repository
2. Click on the **Mobile CI** workflow
3. View individual job logs and test results
4. Download coverage reports from artifacts

## Project Structure

```
mobile/
├── app/                      # Expo Router screens (file-based routing)
│   ├── (tabs)/               # Tab navigation screens
│   ├── auth/                 # Authentication screens
│   └── _layout.tsx           # Root layout
├── components/               # Reusable React Native components
│   ├── auth/                 # Auth-related components
│   ├── chat/                 # Chat components
│   └── common/               # Shared UI components
├── hooks/                    # Custom React hooks
├── lib/                      # Core libraries
│   ├── apollo.ts             # Apollo Client setup (Expo-adapted)
│   ├── socket.ts             # Socket.io client (Expo-adapted)
│   ├── auth.ts               # Better Auth Expo configuration
│   └── utils.ts              # Utility functions
├── constants/                # App constants
├── assets/                   # Images, fonts, etc.
├── tests/                    # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── setup.ts              # Jest setup
├── app.json                  # Expo configuration
├── app.config.ts             # Dynamic Expo config (deep links, schemes)
├── package.json              # Dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

## Shared Code with Web Frontend

This mobile app shares the following code with the web frontend (`/frontend`):

- **Types**: TypeScript type definitions
- **GraphQL**: Queries, mutations, and fragments
- **Stores**: TanStack Store stores
- **Hooks**: Custom React hooks (business logic)
- **Utils**: Utility functions (date formatting, validation)

**Not Shared**: UI components (Web uses React DOM, Mobile uses React Native components)

## Authentication

The app uses **Better Auth Expo** with:

- OAuth providers: Google, GitHub, Apple
- Deep linking for OAuth callbacks
- Secure session storage (Expo SecureStore)
- Magic Link backup authentication

### Deep Link Scheme

```
exp+ping://auth/callback
```

Configure this in your OAuth provider settings.

## Testing

### Test Structure

- **Unit tests**: Individual component/hook tests
- **Integration tests**: Feature-level tests with mocked dependencies
- **Setup**: Custom Jest setup with mocked modules (Apollo, Socket.io, Better Auth)

### Test Configuration

- **Preset**: `jest-expo`
- **Coverage**: Enabled by default
- **Coverage threshold**: >80% (enforced in CI)
- **Mock strategy**: Mock external dependencies (network, native modules)

### Writing Tests

```typescript
// Example test file: tests/integration/auth.spec.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '@/screens/auth/LoginScreen';

describe('LoginScreen', () => {
  it('should navigate to OAuth flow when Google button is pressed', async () => {
    const { getByText } = render(<LoginScreen />);
    const googleButton = getByText('Continue with Google');

    fireEvent.press(googleButton);

    await waitFor(() => {
      // Assertions
    });
  });
});
```

## Development with File-Based Routing

This project uses [Expo Router](https://docs.expo.dev/router/introduction/) for navigation:

- Files in `app/` directory automatically become routes
- `_layout.tsx` files define layout hierarchy
- `(tabs)/` creates a tab navigator
- `[id].tsx` creates dynamic routes

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [Better Auth Expo](https://better-auth.com/docs/integrations/expo)
- [Apollo Client React Native](https://www.apollographql.com/docs/react/integrations/react-native/)

## Troubleshooting

### Common Issues

#### 1. Metro Bundler Cache Issues

```bash
# Clear Expo cache
pnpm start --clear
```

#### 2. Jest Cache Issues

```bash
# Clear Jest cache
pnpm test --clearCache
```

#### 3. NativeWind Styles Not Applying

- Ensure `tailwind.config.js` is properly configured
- Check that `babel.config.js` includes NativeWind preset
- Restart Metro bundler with `--clear` flag

#### 4. Deep Link Not Working

- Verify `app.config.ts` has correct scheme: `exp+ping`
- Check OAuth provider has correct callback URL
- Test deep links with: `npx uri-scheme open exp+ping://auth/callback --ios`

## Contributing

Please follow the project's coding standards:

- Run `pnpm check` before committing
- Write tests for new features
- Follow the TDD workflow (Red → Green → Refactor)
- Use conventional commit messages: `[feat]`, `[fix]`, `[test]`, etc.

## License

Private - Ping Messaging Application
