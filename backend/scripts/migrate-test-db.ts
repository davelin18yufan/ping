/**
 * migrate-test-db.ts — apply pending Prisma migrations to the test database.
 *
 * Reads TEST_DATABASE_URL from the environment (.env) and runs
 * `prisma migrate deploy` against the test DB so that the schema stays in sync
 * with the dev DB after every new migration.
 *
 * Usage:
 *   bun run db:migrate:test
 *
 * Safety:
 *   - Only applies existing migrations (never creates new ones).
 *   - Refuses to run if TEST_DATABASE_URL is not set.
 *   - Never touches DATABASE_URL (dev/production DB is untouched).
 */

import { execSync } from "node:child_process"
// Bun automatically loads .env — no explicit config() call needed

const testUrl = process.env.TEST_DATABASE_URL

if (!testUrl) {
    console.error(
        "ERROR: TEST_DATABASE_URL is not set.\n" +
            "Add it to backend/.env before running this script.\n" +
            'Example: TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/ping_test"'
    )
    process.exit(1)
}

console.log("Applying migrations to test database...")
console.log(`Target: ${testUrl.replace(/:([^:@]+)@/, ":***@")}`) // mask password

try {
    execSync("bunx prisma migrate deploy", {
        env: { ...process.env, DATABASE_URL: testUrl },
        stdio: "inherit",
        // import.meta.dir is the scripts/ directory; go up one level to backend/
        cwd: import.meta.dir + "/..",
    })
    console.log("Test database migrations applied successfully.")
} catch {
    console.error("Migration failed — see output above.")
    process.exit(1)
}
