-- Store instants as timestamptz.
--
-- `timestamp without time zone` carries no offset, so its meaning depends on
-- the convention each reader assumes. A driver reading it on a machine set to
-- Asia/Kathmandu returns a different instant than one on a UTC server, which
-- is exactly the split between local development and Vercel. Existing values
-- were written as UTC, so they are reinterpreted as such.

ALTER TABLE "Booking" DROP CONSTRAINT "Booking_no_overlap";

ALTER TABLE "Booking"
  ALTER COLUMN "startsAt"  TYPE TIMESTAMPTZ(3) USING "startsAt"  AT TIME ZONE 'UTC',
  ALTER COLUMN "endsAt"    TYPE TIMESTAMPTZ(3) USING "endsAt"    AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

-- Rebuild the overlap guard over the timezone-aware range type.
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("bookingStatus" <> 'CANCELLED');
