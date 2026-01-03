import { PrismaClient } from "./generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function testConnection() {
  try {
    console.log("🔍 Testing Prisma connection...")

    const users = await prisma.user.findMany()

    console.log("✅ Connection successful!")
    console.log(`📊 Found ${users.length} users in database:`)

    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email})`)
    })

    return true
  } catch (error) {
    console.error("❌ Connection failed:", error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
