-- Record what each booking was actually charged.
--
-- The amount is computed server-side and stored, rather than recalculated
-- on display: the hourly rate and the coupon list both change over time,
-- and a past booking must keep the price it was made at.

ALTER TABLE "Booking"
  ADD COLUMN "amountNpr"   INTEGER,
  ADD COLUMN "discountNpr" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "couponCode"  TEXT;

-- Backfill any rows made before pricing was stored, at the current rate.
UPDATE "Booking" SET "amountNpr" = "durationHours" * 5000 WHERE "amountNpr" IS NULL;

ALTER TABLE "Booking" ALTER COLUMN "amountNpr" SET NOT NULL;

CREATE INDEX "Booking_couponCode_idx" ON "Booking"("couponCode");
