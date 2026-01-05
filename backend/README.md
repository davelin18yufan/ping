# Ping Backend Server

Real-time messaging backend built with Bun, Hono, GraphQL Yoga, Socket.io, and Better Auth.

## Tech Stack

- **Runtime**: Bun 1.3.5+
- **Framework**: Hono
- **GraphQL**: GraphQL Yoga
- **Real-time**: Socket.io
- **Authentication**: Better Auth
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Linter**: Oxlint
- **Formatter**: Oxfmt

## Installation

Install dependencies:

```sh
bun install
```

## Development

Run development server with hot reload:

```sh
bun run dev
```

Open http://localhost:3000

## Available Scripts

### Development
- `bun run dev` - Start development server with hot reload

### Database
- `bun run db:migrate` - Run Prisma migrations (development)
- `bun run db:seed` - Seed the database
- `bun run db:studio` - Open Prisma Studio
- `bun run db:generate` - Generate Prisma Client
- `bun run prisma:generate` - Generate Prisma Client (CI-friendly)
- `bun run prisma:migrate:deploy` - Deploy migrations (production)

### Code Quality
- `bun run lint` - Run Oxlint checks
- `bun run lint:fix` - Auto-fix linting issues
- `bun run format` - Format code with Oxfmt
- `bun run format:check` - Check code formatting
- `bun run type-check` - Run TypeScript type checking

### Testing
- `bun test` - Run all tests (not yet configured)
- `bun run test:redis` - Test Redis connection

## CI/CD

### GitHub Actions Workflow

The backend has automated CI/CD configured in `.github/workflows/backend-ci.yml`.

**Triggers:**
- Push to `main` or `feature/**` branches (when `backend/**` files change)
- Pull requests targeting `main` (when `backend/**` files change)

**Jobs:**

1. **Lint and Format Check**
   - Runs Oxlint to check code quality
   - Verifies code formatting with Oxfmt

2. **TypeScript Type Check**
   - Generates Prisma Client
   - Runs TypeScript compiler in no-emit mode

3. **Tests** (commented out, will be enabled when tests are implemented)
   - Spins up PostgreSQL and Redis services
   - Runs database migrations
   - Executes test suite

### Running CI Checks Locally

Before pushing, ensure all CI checks pass:

```sh
# Run all checks
bun run lint && bun run format:check && bun run type-check

# Fix formatting issues
bun run format

# Fix linting issues
bun run lint:fix
```

## Code Quality Standards

- **Linter**: Oxlint with strict rules (correctness errors, suspicious warnings)
- **Formatter**: Oxfmt (100 char line width, 2 space indentation, semicolons)
- **TypeScript**: Strict mode with comprehensive type checking
- **Ignored Patterns**: `node_modules`, `dist`, `build`, `generated`, `prisma/migrations`

## VS Code Setup

This project includes VS Code configuration for automatic formatting and linting:
- Auto-format on save with Oxfmt
- Auto-fix linting issues on save with Oxlint
- Organized imports on save

Install recommended extension: `oxc.oxc-vscode`

## Environment Variables

Create a `.env` file with:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ping"
REDIS_URL="redis://localhost:6379"
# Add other environment variables as needed
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts           # Application entry point
│   ├── middleware.ts      # Better Auth middleware, authentication, error handling
│   ├── graphql/           # GraphQL schema and resolvers
│   ├── socket/            # Socket.io event handlers
│   ├── services/          # Business logic
│   ├── lib/               # Utilities (Redis, Prisma, Auth)
│   └── types.ts           # TypeScript type definitions
├── prisma/
│   ├── schema.prisma      # Prisma schema
│   ├── migrations/        # Database migrations
│   └── seed.ts            # Database seeding script
├── tests/                 # Test files (to be implemented)
├── .oxlintrc.json         # Oxlint configuration
├── .oxfmtrc.json          # Oxfmt configuration
└── tsconfig.json          # TypeScript configuration
```

## Contributing

1. Follow the TDD workflow (Red → Green → Refactor)
2. Ensure all CI checks pass before committing
3. Use commit message format: `[flag] message` (e.g., `[feat] implement user authentication`)
4. Avoid cross-directory modifications (stay within `backend/**`)

For more details, see `/CLAUDE.md` in the repository root.
