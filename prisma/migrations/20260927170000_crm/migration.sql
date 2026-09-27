-- CRM: clients, engagements, and a completed state for bookings.
--
-- The backfill runs in the same transaction as the DDL, so the database
-- cannot end up with the columns but not the data.

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('LEAD', 'ACTIVE', 'PAST', 'ARCHIVED');
CREATE TYPE "EngagementType" AS ENUM ('THESIS_REVIEW', 'PAPER_REVIEW', 'DATA_ANALYSIS', 'RESEARCH_CONSULTANCY', 'TRAINING', 'OTHER');
CREATE TYPE "EngagementStatus" AS ENUM ('ENQUIRY', 'QUOTED', 'AGREED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');

-- A session that has happened, as distinct from one still to come.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organisation" TEXT,
    "level" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "nextAction" TEXT,
    "nextActionDate" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");
CREATE INDEX "Client_status_idx" ON "Client"("status");
CREATE INDEX "Client_nextActionDate_idx" ON "Client"("nextActionDate");

-- CreateTable
CREATE TABLE "Engagement" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "EngagementType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "EngagementStatus" NOT NULL DEFAULT 'ENQUIRY',
    "feeNpr" INTEGER NOT NULL DEFAULT 0,
    "amountPaidNpr" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATE,
    "dueAt" DATE,
    "completedAt" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Engagement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Engagement_clientId_idx" ON "Engagement"("clientId");
CREATE INDEX "Engagement_status_idx" ON "Engagement"("status");
CREATE INDEX "Engagement_dueAt_idx" ON "Engagement"("dueAt");

ALTER TABLE "Engagement"
  ADD CONSTRAINT "Engagement_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Link bookings to clients.
ALTER TABLE "Booking" ADD COLUMN "clientId" TEXT;
CREATE INDEX "Booking_clientId_idx" ON "Booking"("clientId");
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
-- Backfill, run immediately after the DDL.
--
-- Grouped on lowercased email: Client.email is unique, so treating
-- "A@x.com" and "a@x.com" as two clients would violate the constraint.
-- The most recent booking supplies the name.

INSERT INTO "Client" ("id", "name", "email", "status", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    (ARRAY_AGG("clientName" ORDER BY "createdAt" DESC))[1],
    lower("clientEmail"),
    'ACTIVE',
    MIN("createdAt"),
    now()
FROM "Booking"
GROUP BY lower("clientEmail")
ON CONFLICT ("email") DO NOTHING;

UPDATE "Booking" b
SET "clientId" = c."id"
FROM "Client" c
WHERE lower(b."clientEmail") = c."email"
  AND b."clientId" IS NULL;
