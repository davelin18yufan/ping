/**
 * dev-session.ts — create or delete dev sessions for seeded test users.
 *
 * Usage:
 *   bun run scripts/dev-session.ts              # list seeded users + active sessions
 *   bun run scripts/dev-session.ts alice        # create session for alice
 *   bun run scripts/dev-session.ts bob          # create session for bob
 *   bun run scripts/dev-session.ts charlie      # create session for charlie
 *   bun run scripts/dev-session.ts --clear      # delete all dev sessions
 *
 * After running, the script prints a one-liner to paste in the browser console
 * of an incognito window to log in as that user instantly.
 *
 * Safety: only runs when DATABASE_URL points to a local/dev database
 * (host must be localhost or 127.0.0.1 or a Docker service name).
 */

import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set")

// Safety guard: refuse to run against non-local databases
const urlObj = new URL(DATABASE_URL)
const isLocal =
    urlObj.hostname === "localhost" ||
    urlObj.hostname === "127.0.0.1" ||
    // Docker Compose service names never contain dots
    !urlObj.hostname.includes(".")

if (!isLocal) {
    console.error(`Refusing to create dev sessions on non-local database: ${urlObj.hostname}`)
    process.exit(1)
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Token prefix makes dev sessions easy to identify and bulk-delete
const DEV_TOKEN_PREFIX = "dev-session-"

const SEEDED_USERS = ["alice", "bob", "charlie", "diana"] as const
type SeededUser = (typeof SEEDED_USERS)[number]

const USER_EMAILS: Record<SeededUser, string> = {
    alice: "alice@ping.dev",
    bob: "bob@ping.dev",
    charlie: "charlie@ping.dev",
    diana: "diana@ping.dev",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeToken(name: SeededUser): string {
    return `${DEV_TOKEN_PREFIX}${name}`
}

function printCookieSnippet(token: string, name: string): void {
    console.log(`\nOpen an incognito window at http://localhost:5173, then paste in the console:\n`)
    console.log(
        `  document.cookie = "better-auth.session_token=${token}; path=/; max-age=604800"; location.reload()\n`
    )
    console.log(`You will be logged in as ${name}.`)
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function listSessions(): Promise<void> {
    const devSessions = await prisma.session.findMany({
        where: { token: { startsWith: DEV_TOKEN_PREFIX } },
        include: { user: { select: { name: true, email: true } } },
    })

    if (devSessions.length === 0) {
        console.log("No active dev sessions. Run: bun run scripts/dev-session.ts <name>")
    } else {
        console.log("Active dev sessions:")
        for (const s of devSessions) {
            const expired = s.expiresAt < new Date() ? " [EXPIRED]" : ""
            console.log(`  ${s.token}  →  ${s.user.name} <${s.user.email}>${expired}`)
        }
    }

    const seededUsers = await prisma.user.findMany({
        where: { email: { in: Object.values(USER_EMAILS) } },
        select: { name: true, email: true, id: true },
    })

    console.log("\nSeeded users in DB:")
    for (const u of seededUsers) {
        console.log(`  ${u.name} <${u.email}>  id: ${u.id}`)
    }
}

async function createSession(name: SeededUser): Promise<void> {
    const email = USER_EMAILS[name]
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
        console.error(
            `User "${name}" (${email}) not found. Run the dev seed first:\n  bun run db:seed`
        )
        process.exit(1)
    }

    const token = makeToken(name)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await prisma.session.upsert({
        where: { token },
        update: { expiresAt, updatedAt: new Date() },
        create: {
            id: `dev-${name}-session`,
            token,
            userId: user.id,
            expiresAt,
        },
    })

    console.log(`Session created for ${user.name} (${user.email})`)
    printCookieSnippet(token, user.name)
}

async function clearSessions(): Promise<void> {
    const { count } = await prisma.session.deleteMany({
        where: { token: { startsWith: DEV_TOKEN_PREFIX } },
    })
    console.log(`Deleted ${count} dev session(s).`)
}

// ─── Entry ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const arg = process.argv[2]?.toLowerCase()

    if (!arg) {
        await listSessions()
    } else if (arg === "--clear") {
        await clearSessions()
    } else if ((SEEDED_USERS as readonly string[]).includes(arg)) {
        await createSession(arg as SeededUser)
    } else {
        console.error(
            `Unknown argument: "${arg}"\nUsage: bun run scripts/dev-session.ts [alice|bob|charlie|diana|--clear]`
        )
        process.exit(1)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
