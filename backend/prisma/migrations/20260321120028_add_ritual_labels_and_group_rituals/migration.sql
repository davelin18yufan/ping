-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "allowRituals" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ConversationRitualLabel" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "ritualType" "MessageType" NOT NULL,
    "labelOwn" TEXT NOT NULL,
    "labelOther" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationRitualLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationRitualLabel_conversationId_ritualType_key" ON "ConversationRitualLabel"("conversationId", "ritualType");

-- AddForeignKey
ALTER TABLE "ConversationRitualLabel" ADD CONSTRAINT "ConversationRitualLabel_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationRitualLabel" ADD CONSTRAINT "ConversationRitualLabel_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
