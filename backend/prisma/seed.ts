import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is not defined")
}

const adapter = new PrismaPg({
	connectionString: databaseUrl,
})

const prisma = new PrismaClient({ adapter })

async function main() {
	// Create multiple sample users
	await prisma.user.createMany({
		data: [
			{ email: "alice@example.com", name: "Alice" },
			{ email: "bob@example.com", name: "Bob" },
			{ email: "charlie@example.com", name: "Charlie" },
			{ email: "diana@example.com", name: "Diana" },
			{ email: "eve@example.com", name: "Eve" },
			{ email: "frank@example.com", name: "Frank" },
			{ email: "grace@example.com", name: "Grace" },
			{ email: "henry@example.com", name: "Henry" },
			{ email: "isabella@example.com", name: "Isabella" },
			{ email: "jack@example.com", name: "Jack" },
		],
		skipDuplicates: true, // prevents errors if you run the seed multiple times
	})

	console.log("Seed data inserted!")
}

main()
	.catch((e) => {
		console.error("❌ Seeding failed:", e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
