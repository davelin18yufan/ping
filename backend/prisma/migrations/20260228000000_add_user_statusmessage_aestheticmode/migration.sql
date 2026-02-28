-- CreateEnum
CREATE TYPE "AestheticMode" AS ENUM ('ornate', 'minimal');

-- AlterTable
ALTER TABLE "User"
    ADD COLUMN "statusMessage" TEXT,
    ADD COLUMN "aestheticMode" "AestheticMode" NOT NULL DEFAULT 'ornate';
