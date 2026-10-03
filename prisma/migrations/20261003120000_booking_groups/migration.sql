-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Booking_groupId_idx" ON "Booking"("groupId");


-- Every existing booking becomes a group of one, so grouping logic never
-- has to special-case a null and "one payment per group" holds for the
-- whole table from the start.
UPDATE "Booking" SET "groupId" = "id" WHERE "groupId" IS NULL;
