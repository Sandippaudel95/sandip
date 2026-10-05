-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "groupId" TEXT,
    "amountNpr" INTEGER NOT NULL,
    "receivedAt" DATE NOT NULL,
    "method" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_clientId_idx" ON "Payment"("clientId");

-- CreateIndex
CREATE INDEX "Payment_groupId_idx" ON "Payment"("groupId");

-- CreateIndex
CREATE INDEX "Payment_receivedAt_idx" ON "Payment"("receivedAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: every already-verified booking order becomes one payment for
-- its total, dated at its earliest session. Revenue is about to be read
-- from this table instead of from paymentStatus, so without this the
-- dashboard would read zero for everything earned so far.
--
-- Orders with no client row are skipped rather than guessed at: a payment
-- has to belong to somebody.
INSERT INTO "Payment" ("id", "clientId", "groupId", "amountNpr", "receivedAt", "method", "note", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  g."clientId",
  g."groupId",
  g."total",
  g."firstSession"::date,
  NULL,
  'Recorded automatically when payment tracking was added',
  NOW()
FROM (
  SELECT
    COALESCE("groupId", "id")  AS "groupId",
    MIN("clientId")            AS "clientId",
    SUM("amountNpr")           AS "total",
    MIN("startsAt")            AS "firstSession"
  FROM "Booking"
  WHERE "paymentStatus" = 'VERIFIED'
    AND "bookingStatus" <> 'CANCELLED'
    AND "clientId" IS NOT NULL
  GROUP BY COALESCE("groupId", "id")
) AS g
WHERE g."total" > 0;
