-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "consultationTopic" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "durationHours" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "transactionId" TEXT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "bookingStatus" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "emailFailed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_date_idx" ON "Booking"("date");

-- CreateIndex
CREATE INDEX "Booking_clientEmail_date_idx" ON "Booking"("clientEmail", "date");

-- CreateIndex
CREATE INDEX "Booking_bookingStatus_createdAt_idx" ON "Booking"("bookingStatus", "createdAt");

-- ---------------------------------------------------------------------------
-- Overlap prevention.
--
-- This is the integrity guarantee of the whole system. A unique index on
-- (date, timeSlot) would only block an identical start time; it would still
-- allow booking 11:00 when 10:00-12:00 is already taken. An exclusion
-- constraint over the time range rejects any overlap atomically, so two
-- clients submitting at the same instant cannot both succeed.
--
-- Cancelled bookings are excluded so their slot returns to the pool.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("bookingStatus" <> 'CANCELLED');
