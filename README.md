# Ping - Real-time Messaging Application

A modern real-time messaging application inspired by Yahoo Messenger, built with cutting-edge web and mobile technologies. Ping provides seamless cross-platform communication with a focus on real-time performance and security.

## Features

- **Real-time Messaging**: Instant message delivery powered by Socket.io
- **Friend Management**: Add, accept, and manage friend requests
- **Online Status**: Live presence indicators for all contacts
- **Typing Indicators**: See when your friends are typing
- **Cross-Platform**: Native experiences on Web and Mobile
- **Secure Authentication**: OAuth-based login (Google, GitHub, Apple) with Magic Link fallback
- **Modern UI**: Responsive design with Tailwind CSS (Web) and NativeWind (Mobile)

## Technology Stack

### Frontend (Web)
- **Framework**: Tanstack start
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: TanStack Store
- **GraphQL Client**: Apollo Client
- **Real-time**: Socket.io Client

### Frontend (Mobile)
- **Framework**: React Native 0.81 + Expo 54
- **Router**: Expo Router
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: TanStack Store
- **GraphQL Client**: Apollo Client
- **Real-time**: Socket.io Client

### Backend
- **Runtime**: Bun 1.3.5+
- **Framework**: Hono
- **GraphQL**: GraphQL Yoga
- **Real-time**: Socket.io
- **Authentication**: Better Auth
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis (online status, unread counts, socket mapping)

## Project Structure

```
ping/
├── docs/                   # Architecture documentation and specs
│   ├── architecture/       # System Design Documents (SDD)
│   └── MULTI_AGENT_PLAN.md # Multi-agent collaboration plan
├── backend/                # Backend API server
│   ├── src/
│   │   ├── graphql/       # GraphQL schema and resolvers
│   │   ├── socket/        # Socket.io handlers
│   │   ├── services/      # Business logic
│   │   └── lib/           # Shared utilities
│   ├── prisma/            # Database schema and migrations
│   └── tests/             # Backend tests
├── frontend/              # Tanstack web application
│   ├── src/
│   │   ├── routes/       # Routers
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── stores/       # TanStack Store stores
│   │   └── graphql/      # GraphQL queries/mutations
│   └── tests/            # Frontend tests
├── mobile/               # React Native mobile application
│   ├── src/
│   │   ├── screens/      # Mobile screens
│   │   ├── components/   # React Native components
│   │   ├── navigation/   # Expo Router configuration
│   │   └── lib/          # Mobile-specific utilities
│   └── tests/            # Mobile tests
├── shared/               # Shared code between Web and Mobile (optional)
└── infra/                # Infrastructure and deployment configs
```

## Quick Start

### Prerequisites

- **Node.js**: 24.x or higher
- **Bun**: Latest version ([Install Bun](https://bun.sh/docs/installation))
- **pnpm**: Latest version (`npm install -g pnpm`)
- **PostgreSQL**: 14.x or higher
- **Redis**: 7.x or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ping
   ```

2. **Install dependencies**
   ```bash
   # Backend (uses Bun)
   cd backend
   bun install

   # Frontend (uses pnpm)
   cd ../frontend
   pnpm install

   # Mobile (uses pnpm)
   cd ../mobile
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your database and Redis credentials

   # Frontend
   cd ../frontend
   cp .env.example .env.local
   # Edit .env.local with your API endpoints

   # Mobile
   cd ../mobile
   cp .env.example .env
   # Edit .env with your API endpoints
   ```

4. **Set up the database**
   ```bash
   cd backend
   bunx prisma migrate dev
   bunx prisma generate
   ```

### Development

Run all services in separate terminal windows:

```bash
# Terminal 1 - Backend (http://localhost:3000)
cd backend
bun run dev

# Terminal 2 - Frontend (http://localhost:3001)
cd frontend
pnpm dev

# Terminal 3 - Mobile (Expo Go)
cd mobile
pnpm start
```

### Testing

```bash
# Backend tests
cd backend
bun test

# Frontend tests
cd frontend
pnpm test

# Mobile tests
cd mobile
pnpm test
```

## Development Workflow

This project follows a **Test-Driven Development (TDD)** approach with **System Design Documents (SDD)** guiding all implementation:

1. **Design Phase**: Architect defines features in `/docs/architecture/`
2. **Test Phase (RED)**: Write failing tests first
3. **Implementation Phase (GREEN)**: Implement features to pass tests
4. **Refactor Phase**: Clean up code while maintaining test coverage

For detailed development guidelines, see [CLAUDE.md](./CLAUDE.md).

## Documentation

- [Architecture Overview](./docs/architecture/overview.md)
- [Backend Specification](./docs/architecture/backend.md)
- [Frontend Specification](./docs/architecture/frontend.md)
- [Mobile Specification](./docs/architecture/mobile.md)
- [Database Schema](./docs/architecture/database.md)
- [Multi-Agent Plan](./MULTI_AGENT_PLAN.md)

## Key Architectural Decisions

### Why Bun for Backend?
- Faster startup and execution compared to Node.js
- Built-in TypeScript support without compilation
- Native test runner and bundler

### Why Better Auth?
- Modern, type-safe authentication
- Built-in OAuth support for multiple providers
- Secure session management with cookies
- No complex JWT handling

### Why GraphQL + Socket.io?
- **GraphQL**: Perfect for complex data queries and mutations (CRUD operations)
- **Socket.io**: Optimal for real-time events (messages, presence, typing indicators)
- Best of both worlds for a messaging application

### Code Sharing Strategy
- **Shared**: Types, GraphQL queries, TanStack Store stores, custom hooks
- **Platform-specific**: UI components (React DOM vs React Native)
- **Styling**: Same Tailwind class names via NativeWind for consistency

## Git Workflow

### Branch Naming
```
feature/[feature-name]-[subsystem]

Examples:
- feature/google-oauth-backend
- feature/chat-ui-frontend
- feature/friend-list-mobile
```

### Commit Message Format
```
[flag] message

Flags:
- [feat] - New feature
- [fix] - Bug fix
- [test] - Add or modify tests
- [refactor] - Code refactoring
- [style] - UI/styling changes
- [docs] - Documentation updates
- [chore] - Build tools, dependencies, configs
- [perf] - Performance optimization
- [review] - Code review related

Examples:
[feat] implement Google OAuth login mutation
[fix] correct session validation in auth middleware
[test] add integration tests for OAuth flow
```

## Project Status

⚠️ **Currently in Initial Setup Phase**

- ✅ Backend: Basic Hono server configured (Hello World endpoint)
- ✅ Frontend: Tanstack Start project created with base configuration
- ✅ Mobile: Expo 54 project created with base configuration
- ❌ Database: Prisma schema not yet defined
- ❌ GraphQL: Schema and resolvers not yet implemented
- ❌ Socket.io: Real-time features not yet implemented
- ❌ Better Auth: Authentication system not yet configured
- ❌ Tests: Testing framework and test files not yet created


For detailed contribution guidelines, see [CLAUDE.md](./CLAUDE.md).

---

Built with ❤️ using modern web technologies
