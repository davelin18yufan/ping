import { PrismaClient } from "./generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not defined")
}

const adapter = new PrismaPg({
    connectionString: databaseUrl,
})

export const prisma = new PrismaClient({
    adapter,
})
