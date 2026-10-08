-- CreateTable
CREATE TABLE "AvailabilitySetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "openingHours" JSONB NOT NULL,
    "sessionLengths" INTEGER[] DEFAULT ARRAY[1, 2]::INTEGER[],
    "minimumNoticeHours" INTEGER NOT NULL DEFAULT 24,
    "bookingWindowDays" INTEGER NOT NULL DEFAULT 30,
    "maxHoursPerClientPerDay" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AvailabilitySetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlackoutDate" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlackoutDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlackoutDate_date_key" ON "BlackoutDate"("date");

-- CreateIndex
CREATE INDEX "BlackoutDate_date_idx" ON "BlackoutDate"("date");


-- Seed the single settings row from what src/content/availability.ts held,
-- so behaviour is identical the moment this lands and the admin screen has
-- something to edit rather than an empty form.
INSERT INTO "AvailabilitySetting" (
  "id", "openingHours", "sessionLengths", "minimumNoticeHours",
  "bookingWindowDays", "maxHoursPerClientPerDay", "updatedAt"
) VALUES (
  'singleton',
  '{"0":["10:00","11:00","14:00","15:00","16:00"],
    "1":["10:00","11:00","14:00","15:00","16:00"],
    "2":["10:00","11:00","14:00","15:00","16:00"],
    "3":["10:00","11:00","14:00","15:00","16:00"],
    "4":["10:00","11:00","14:00","15:00","16:00"],
    "5":["10:00","11:00"],
    "6":[]}'::jsonb,
  ARRAY[1, 2]::INTEGER[],
  24, 30, 2, NOW()
) ON CONFLICT ("id") DO NOTHING;
