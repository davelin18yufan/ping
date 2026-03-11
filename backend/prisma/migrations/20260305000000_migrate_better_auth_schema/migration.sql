-- Migrate from NextAuth-style schema to Better Auth canonical schema
--
-- Changes per model:
--   User        : emailVerified DateTime? → Boolean, name String? → String
--   Session     : sessionToken→token, expires→expiresAt, +updatedAt/ipAddress/userAgent
--   Account     : provider→providerId, providerAccountId→accountId,
--                 snake_case tokens→camelCase, remove NextAuth-only cols,
--                 +accessTokenExpiresAt/refreshTokenExpiresAt/password/createdAt/updatedAt
--   Verification: token→value, expires→expiresAt, +createdAt/updatedAt,
--                 unique([identifier,token]) → index(identifier)

-- ============================================================
-- User
-- ============================================================

-- Backfill NULL names before making the column NOT NULL
UPDATE "User" SET "name" = SPLIT_PART("email", '@', 1) WHERE "name" IS NULL;
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

-- Convert emailVerified: DateTime? → Boolean
-- Existing non-NULL timestamps mean the email was verified → true
ALTER TABLE "User"
    ALTER COLUMN "emailVerified" TYPE BOOLEAN
        USING ("emailVerified" IS NOT NULL),
    ALTER COLUMN "emailVerified" SET NOT NULL,
    ALTER COLUMN "emailVerified" SET DEFAULT false;

-- ============================================================
-- Session
-- ============================================================

ALTER TABLE "Session" RENAME COLUMN "sessionToken" TO "token";
ALTER TABLE "Session" RENAME COLUMN "expires"      TO "expiresAt";

ALTER TABLE "Session"
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "ipAddress" TEXT,
    ADD COLUMN "userAgent" TEXT;

-- Recreate unique index under new column name
DROP INDEX IF EXISTS "Session_sessionToken_key";
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- ============================================================
-- Account
-- ============================================================

-- Rename NextAuth columns to Better Auth names
ALTER TABLE "Account" RENAME COLUMN "provider"          TO "providerId";
ALTER TABLE "Account" RENAME COLUMN "providerAccountId" TO "accountId";
ALTER TABLE "Account" RENAME COLUMN "refresh_token"     TO "refreshToken";
ALTER TABLE "Account" RENAME COLUMN "access_token"      TO "accessToken";
ALTER TABLE "Account" RENAME COLUMN "id_token"          TO "idToken";

-- Drop NextAuth-only columns (no Better Auth equivalent)
ALTER TABLE "Account"
    DROP COLUMN IF EXISTS "type",
    DROP COLUMN IF EXISTS "expires_at",
    DROP COLUMN IF EXISTS "token_type",
    DROP COLUMN IF EXISTS "session_state";

-- Add Better Auth-specific columns
ALTER TABLE "Account"
    ADD COLUMN "accessTokenExpiresAt"  TIMESTAMP(3),
    ADD COLUMN "refreshTokenExpiresAt" TIMESTAMP(3),
    ADD COLUMN "password"              TEXT,
    ADD COLUMN "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Replace unique constraint with Better Auth field names
DROP INDEX IF EXISTS "Account_provider_providerAccountId_key";
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- ============================================================
-- Verification
-- ============================================================

ALTER TABLE "Verification" RENAME COLUMN "token"   TO "value";
ALTER TABLE "Verification" RENAME COLUMN "expires"  TO "expiresAt";

ALTER TABLE "Verification"
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop old unique constraints; Better Auth only indexes by identifier
DROP INDEX IF EXISTS "Verification_token_key";
DROP INDEX IF EXISTS "Verification_identifier_token_key";
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");
