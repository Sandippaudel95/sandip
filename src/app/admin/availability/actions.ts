"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SELECTABLE_TIMES, type Weekday } from "@/content/availability";

/* Every action re-checks the session: a Server Action is its own endpoint
   and can be POSTed to directly, so the route guard is not enough. */
async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authorised.");
}

export type AvailabilityResult = { ok: boolean; message?: string };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const rulesSchema = z.object({
  sessionLengths: z
    .array(z.number().int().min(1).max(12))
    .min(1, "Offer at least one session length."),
  minimumNoticeHours: z.number().int().min(0).max(720),
  bookingWindowDays: z.number().int().min(1).max(365),
  maxHoursPerClientPerDay: z.number().int().min(1).max(24),
});

/**
 * Save opening hours and the booking rules.
 *
 * Hours arrive as one checkbox per weekday-and-time, which is verbose on
 * the wire but means the form carries the full intended state: a weekday
 * with nothing ticked is closed, and there is no way to half-apply it.
 */
export async function saveAvailability(
  formData: FormData,
): Promise<AvailabilityResult> {
  await requireAdmin();

  const openingHours: Record<string, string[]> = {};
  for (let day = 0; day <= 6; day += 1) {
    const times = formData
      .getAll(`day-${day}`)
      .map(String)
      .filter((t) => HHMM.test(t) && SELECTABLE_TIMES.includes(t));
    openingHours[String(day as Weekday)] = [...new Set(times)].sort();
  }

  if (Object.values(openingHours).every((t) => t.length === 0)) {
    return {
      ok: false,
      message: "Every day is closed. Open at least one hour somewhere.",
    };
  }

  const parsed = rulesSchema.safeParse({
    sessionLengths: formData
      .getAll("sessionLengths")
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n)),
    minimumNoticeHours: Number(formData.get("minimumNoticeHours")),
    bookingWindowDays: Number(formData.get("bookingWindowDays")),
    maxHoursPerClientPerDay: Number(formData.get("maxHoursPerClientPerDay")),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the values entered.",
    };
  }
  const rules = parsed.data;

  // A length nobody has the open hours for would show in the picker and
  // then offer no dates at all, which reads as a broken calendar.
  const longestRun = Math.max(
    ...Object.values(openingHours).map((times) => {
      let best = 0;
      let run = 0;
      for (const t of SELECTABLE_TIMES) {
        run = times.includes(t) ? run + 1 : 0;
        best = Math.max(best, run);
      }
      return best;
    }),
  );
  const tooLong = rules.sessionLengths.filter((h) => h > longestRun);
  if (tooLong.length) {
    return {
      ok: false,
      message: `No day has ${tooLong[0]} hours open back to back, so a ${tooLong[0]}-hour session could never be booked. Open more consecutive hours or remove that length.`,
    };
  }

  try {
    await prisma.availabilitySetting.upsert({
      where: { id: "singleton" },
      update: { openingHours, ...rules },
      create: { id: "singleton", openingHours, ...rules },
    });
  } catch (err) {
    console.error("[availability] save failed:", err);
    return { ok: false, message: "Could not save. Please try again." };
  }

  revalidatePath("/admin/availability");
  revalidatePath("/book");
  return { ok: true, message: "Saved." };
}

/** Close a single date, whatever its weekday's hours say. */
export async function addBlackoutDate(
  formData: FormData,
): Promise<AvailabilityResult> {
  await requireAdmin();

  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, message: "Choose a date to close." };
  }
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 120);

  try {
    await prisma.blackoutDate.upsert({
      // A plain DATE column, so midnight UTC is the date itself, not an
      // instant that could land on the day either side.
      where: { date: new Date(`${date}T00:00:00.000Z`) },
      update: { reason: reason || null },
      create: { date: new Date(`${date}T00:00:00.000Z`), reason: reason || null },
    });
  } catch (err) {
    console.error("[availability] blackout add failed:", err);
    return { ok: false, message: "Could not close that date." };
  }

  revalidatePath("/admin/availability");
  revalidatePath("/book");
  return { ok: true, message: "Date closed." };
}

export async function removeBlackoutDate(
  id: string,
): Promise<AvailabilityResult> {
  await requireAdmin();
  try {
    await prisma.blackoutDate.delete({ where: { id } });
  } catch (err) {
    console.error("[availability] blackout remove failed:", err);
    return { ok: false, message: "Could not reopen that date." };
  }
  revalidatePath("/admin/availability");
  revalidatePath("/book");
  return { ok: true };
}
