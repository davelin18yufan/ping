-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageType" ADD VALUE 'APOLOGY';
ALTER TYPE "MessageType" ADD VALUE 'CELEBRATE';
ALTER TYPE "MessageType" ADD VALUE 'TAUNT';
ALTER TYPE "MessageType" ADD VALUE 'LONGING';
ALTER TYPE "MessageType" ADD VALUE 'QUESTION';
ALTER TYPE "MessageType" ADD VALUE 'REJECTION';

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Verification" ALTER COLUMN "updatedAt" DROP DEFAULT;
