-- Close off sessions that already happened.
--
-- Separate from the migration that added COMPLETED to the enum: Postgres
-- will not let a new enum value be used in the same transaction that
-- introduced it.

UPDATE "Booking"
SET "bookingStatus" = 'COMPLETED'
WHERE "bookingStatus" = 'CONFIRMED'
  AND "endsAt" < now();
