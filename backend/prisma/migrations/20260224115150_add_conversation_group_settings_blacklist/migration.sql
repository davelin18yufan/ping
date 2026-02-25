-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('OWNER', 'MEMBER');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "name" TEXT,
ADD COLUMN     "onlyOwnerCanEdit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onlyOwnerCanInvite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onlyOwnerCanKick" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Blacklist_blockerId_idx" ON "Blacklist"("blockerId");

-- CreateIndex
CREATE UNIQUE INDEX "Blacklist_blockerId_blockedId_key" ON "Blacklist"("blockerId", "blockedId");

-- AddForeignKey
ALTER TABLE "Blacklist" ADD CONSTRAINT "Blacklist_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blacklist" ADD CONSTRAINT "Blacklist_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
