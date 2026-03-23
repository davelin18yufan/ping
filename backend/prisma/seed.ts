/**
 * Dev Seed — inserts test users, friendships, conversations, and messages
 * directly into the development database for UI verification.
 *
 * Usage:
 *   bun run prisma/dev-seed.ts
 *
 * What it creates (all linked to dave lin — MMjB5N0Ud0t3VUV7H0chbH4lzu43pbOC):
 *   Users   : Alice, Bob, Charlie, Diana
 *   Friends : dave↔Alice (ACCEPTED), dave↔Bob (ACCEPTED),
 *             dave↔Charlie (ACCEPTED), Diana→dave (PENDING)
 *   Chats   : dave↔Alice (1:1 with messages)
 *             dave↔Bob   (1:1 with messages)
 *             dave + Alice + Bob + Charlie (GROUP "Team Ping")
 *
 * Re-run safe: skips existing records (upsert / skipDuplicates).
 */

import { PrismaClient, MessageType, type Conversation, type User } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL is not defined")

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })

// dave lin's user ID (Google OAuth account)
const DAVE_ID = "aZy6ZVV0lt0By16h7fNjtljAJ576dU2f"

// ─── Helper ───────────────────────────────────────────────────────────────────

async function addMessage(conv: Conversation, sender: User, content: string, minutesAgo: number) {
    return prisma.message.create({
        data: {
            conversationId: conv.id,
            senderId: sender.id,
            content,
            messageType: MessageType.TEXT,
            createdAt: new Date(Date.now() - minutesAgo * 60 * 1000),
        },
    })
}

async function addRitual(
    conv: Conversation,
    sender: User,
    ritualType: MessageType,
    minutesAgo: number
) {
    return prisma.message.create({
        data: {
            conversationId: conv.id,
            senderId: sender.id,
            content: null,
            messageType: ritualType,
            createdAt: new Date(Date.now() - minutesAgo * 60 * 1000),
        },
    })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    // Verify dave's account exists (created via Google OAuth login)
    const dave = await prisma.user.findUniqueOrThrow({
        where: { id: DAVE_ID },
    })
    console.log(`Seeding dev database for: ${dave.name} (${dave.email})`)

    // ── 1. Seed users ─────────────────────────────────────────────────────────

    const [alice, bob, charlie, diana] = await Promise.all([
        prisma.user.upsert({
            where: { email: "alice@ping.dev" },
            update: {},
            create: {
                email: "alice@ping.dev",
                name: "Alice",
                emailVerified: true,
                statusMessage: "Building something awesome",
            },
        }),
        prisma.user.upsert({
            where: { email: "bob@ping.dev" },
            update: {},
            create: {
                email: "bob@ping.dev",
                name: "Bob",
                emailVerified: true,
                statusMessage: "On a coffee break",
            },
        }),
        prisma.user.upsert({
            where: { email: "charlie@ping.dev" },
            update: {},
            create: {
                email: "charlie@ping.dev",
                name: "Charlie",
                emailVerified: true,
            },
        }),
        prisma.user.upsert({
            where: { email: "diana@ping.dev" },
            update: {},
            create: {
                email: "diana@ping.dev",
                name: "Diana",
                emailVerified: true,
                statusMessage: "Away for the weekend",
            },
        }),
    ])
    console.log("  Users upserted: Alice, Bob, Charlie, Diana")

    // ── 2. Friendships (all linked to dave) ───────────────────────────────────

    // userId1 must be lexicographically smaller than userId2 (@@unique constraint)
    const friendPairs: [User, "ACCEPTED" | "PENDING", "dave" | "other"][] = [
        [alice, "ACCEPTED", "dave"],
        [bob, "ACCEPTED", "dave"],
        [charlie, "ACCEPTED", "dave"],
        [diana, "PENDING", "other"], // diana sent request to dave
    ]

    for (const [peer, status, requester] of friendPairs) {
        const [low, high] = DAVE_ID < peer.id ? [DAVE_ID, peer.id] : [peer.id, DAVE_ID]
        await prisma.friendship.upsert({
            where: { userId1_userId2: { userId1: low, userId2: high } },
            update: { status },
            create: {
                userId1: low,
                userId2: high,
                status,
                requestedBy: requester === "dave" ? DAVE_ID : peer.id,
            },
        })
    }
    console.log(
        "  Friendships: dave↔Alice (accepted), dave↔Bob (accepted), dave↔Charlie (accepted), Diana→dave (pending)"
    )

    // ── 3. dave ↔ Alice  (1:1) ────────────────────────────────────────────────

    const daveAliceConv = await prisma.conversation.create({
        data: {
            type: "ONE_TO_ONE",
            participants: {
                create: [
                    { userId: DAVE_ID, role: "MEMBER" },
                    { userId: alice.id, role: "MEMBER" },
                ],
            },
        },
    })
    await addMessage(daveAliceConv, alice, "Hey Dave! Did you see the new UI changes?", 120)
    await addMessage(daveAliceConv, dave, "Just checked — the glassmorphism looks great!", 115)
    await addRitual(daveAliceConv, alice, MessageType.SONIC_PING, 113)
    await addMessage(
        daveAliceConv,
        alice,
        "Right? The Sonic Ping animation is my favourite part!",
        110
    )
    await addRitual(daveAliceConv, dave, MessageType.CELEBRATE, 108)
    await addMessage(
        daveAliceConv,
        dave,
        "Agreed. Let me know when the mobile version is ready.",
        100
    )
    await addRitual(daveAliceConv, alice, MessageType.LONGING, 50)
    await addMessage(daveAliceConv, alice, "Miss working on this together.", 48)
    await addRitual(daveAliceConv, dave, MessageType.QUESTION, 35)
    await addMessage(daveAliceConv, alice, "Will do! Probably by Friday.", 30)
    await addRitual(daveAliceConv, alice, MessageType.APOLOGY, 10)
    await addMessage(daveAliceConv, alice, "Sorry, pushed to next Monday actually!", 9)

    // ── 4. dave ↔ Bob  (1:1) ─────────────────────────────────────────────────

    const daveBobConv = await prisma.conversation.create({
        data: {
            type: "ONE_TO_ONE",
            participants: {
                create: [
                    { userId: DAVE_ID, role: "MEMBER" },
                    { userId: bob.id, role: "MEMBER" },
                ],
            },
        },
    })
    await addMessage(daveBobConv, dave, "Bob, can you push the backend changes today?", 200)
    await addMessage(daveBobConv, bob, "On it. Should be done in an hour.", 195)
    await addRitual(daveBobConv, bob, MessageType.TAUNT, 193)
    await addMessage(daveBobConv, bob, "Easy for someone who doesn't write the hard parts ;)", 192)
    await addRitual(daveBobConv, dave, MessageType.REJECTION, 191)
    await addMessage(daveBobConv, dave, "Not taking that. Get back to work!", 190)
    await addMessage(daveBobConv, bob, "Done — PR is up for review", 60)
    await addMessage(daveBobConv, dave, "Nice, reviewing now.", 55)
    console.log("  1:1 conversations: dave↔Alice, dave↔Bob")

    // ── 5. GROUP: dave + Alice + Bob + Charlie ─────────────────────────────────

    const teamConv = await prisma.conversation.create({
        data: {
            type: "GROUP",
            name: "Team Ping",
            participants: {
                create: [
                    { userId: DAVE_ID, role: "OWNER" },
                    { userId: alice.id, role: "MEMBER" },
                    { userId: bob.id, role: "MEMBER" },
                    { userId: charlie.id, role: "MEMBER" },
                ],
            },
        },
    })
    await addMessage(teamConv, dave, "Welcome to Team Ping! This is our main channel.", 300)
    await addMessage(teamConv, alice, "Awesome, glad to have a group chat now 🎉", 295)
    await addMessage(teamConv, bob, "Let's ship it!", 290)
    await addMessage(teamConv, charlie, "I'm in. What's the plan for this week?", 285)
    await addMessage(teamConv, dave, "Focus: finish chat UI, then move to mobile.", 280)
    await addMessage(teamConv, alice, "Frontend is looking solid already.", 45)
    await addMessage(teamConv, bob, "Backend tests all green ✅", 40)
    await addMessage(teamConv, dave, "Great progress everyone!", 5)
    console.log("  GROUP conversation: Team Ping (dave, Alice, Bob, Charlie)")

    console.log("\nDev seed complete!")
    console.log("\nLog in as dave lin via Google OAuth to see all conversations and friends.")
}

main()
    .catch((e) => {
        console.error("Dev seed failed:", e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
