"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { fieldErrorsOf } from "@/lib/validation";
import { addHours, nepalToUtc } from "@/lib/time";
import { splitByHours } from "@/lib/money";
import { runDates, type RunPattern } from "@/lib/run";
import {
  sendBookingConfirmed,
  sendBookingRescheduled,
  type BookingEmailData,
} from "@/lib/email";

/* Every action re-checks the session: a Server Action is its own endpoint
   and can be POSTed to directly, so the route guard is not enough. */
async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authorised.");
}

/* Neon suspends an idle compute and takes seconds to wake; a run of
   fifteen inserts needs more room than the 2s Prisma allows by default. */
const TX_OPTIONS = { maxWait: 15_000, timeout: 30_000 };

export type ManualBookingResult =
  | { ok: true; id: string; emailed: boolean }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const baseSchema = z.object({
  clientName: z.string().trim().min(2, "Enter the client's name.").max(100),
  clientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),
  consultationTopic: z
    .string()
    .trim()
    .min(3, "Add a short description of the topic.")
    .max(300),
  timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a time."),
  durationHours: z.coerce
    .number()
    .int()
    .min(1, "Choose a length.")
    .max(12, "That is longer than a day's work."),
  amountNpr: z.coerce.number().int().min(0, "Enter an amount.").max(10_000_000),
  paymentStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
  bookingStatus: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
  adminNote: z.string().trim().max(500).optional().or(z.literal("")),
  transactionId: z.string().trim().max(100).optional().or(z.literal("")),
});

/** Editing works on one existing session, so it still carries a date. */
const editSchema = baseSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
});

/**
 * Add a booking the admin agreed elsewhere.
 *
 * Leads arrive by WhatsApp, Facebook and TikTok, get agreed in a chat, and
 * never touch the booking form. Without this they exist nowhere, so the
 * calendar keeps offering a time that is actually taken.
 *
 * Deliberately skips the opening hours, the notice window and the daily
 * cap. Those exist to keep strangers inside sensible bounds; the admin
 * agreeing a Saturday evening is not a mistake to be prevented. The one
 * rule that still applies is the overlap exclusion constraint, because
 * double-booking is a mistake whoever makes it.
 */
export async function createManualBooking(
  formData: FormData,
): Promise<ManualBookingResult> {
  await requireAdmin();

  const parsed = baseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;
  const notify = formData.get("notify") === "on";

  let dates: string[];
  try {
    dates = z
      .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .min(1)
      .max(60)
      .parse(JSON.parse(String(formData.get("dates") ?? "[]")));
  } catch {
    return { ok: false, message: "Choose at least one date." };
  }
  dates = [...new Set(dates)].sort();

  // One agreed total for the package, divided across the sessions, so the
  // rows still sum to exactly what was charged.
  const shares = splitByHours(
    d.amountNpr,
    dates.map(() => d.durationHours),
  );

  const groupId = randomUUID();
  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const client = await tx.client.upsert({
        where: { email: d.clientEmail },
        update: { name: d.clientName },
        create: { email: d.clientEmail, name: d.clientName },
      });

      // One at a time, so the exclusion constraint can reject a single
      // clashing date and take the whole run back with it: half a booked
      // engagement would be worse than none.
      const rows = [];
      for (const [i, date] of dates.entries()) {
        const [y, m, day] = date.split("-").map(Number);
        rows.push(
          await tx.booking.create({
            data: {
              groupId,
              clientId: client.id,
              clientName: d.clientName,
              clientEmail: d.clientEmail,
              consultationTopic: d.consultationTopic,
              date: new Date(Date.UTC(y, m - 1, day)),
              timeSlot: d.timeSlot,
              durationHours: d.durationHours,
              startsAt: nepalToUtc(date, d.timeSlot),
              endsAt: nepalToUtc(date, addHours(d.timeSlot, d.durationHours)),
              transactionId: d.transactionId || "Added by admin",
              amountNpr: shares[i],
              discountNpr: 0,
              couponCode: null,
              paymentStatus: d.paymentStatus,
              bookingStatus: d.bookingStatus,
              adminNote: d.adminNote || null,
            },
          }),
        );
      }
      return rows;
    }, TX_OPTIONS);
  } catch (err) {
    if (isOverlapViolation(err)) {
      return {
        ok: false,
        message:
          "One of those times overlaps a booking that already exists, so none were saved. Check the preview and untick the clashing date.",
      };
    }
    console.error("[admin] manual booking failed:", err);
    return { ok: false, message: "Could not save. Please try again." };
  }

  let emailed = false;
  if (notify) {
    const payload: BookingEmailData = {
      id: groupId,
      clientName: d.clientName,
      clientEmail: d.clientEmail,
      consultationTopic: d.consultationTopic,
      sessions: dates.map((date) => ({
        dateKey: date,
        timeSlot: d.timeSlot,
        durationHours: d.durationHours,
      })),
      transactionId: created[0].transactionId,
      amountNpr: d.amountNpr,
      discountNpr: 0,
      couponCode: null,
    };
    emailed = await sendBookingConfirmed(payload, d.adminNote || null);
    if (!emailed) {
      await prisma.booking
        .updateMany({ where: { groupId }, data: { emailFailed: true } })
        .catch(() => {});
    }
  }

  // The slots are now taken, so the public calendar has to stop offering
  // them.
  revalidatePath("/book");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/clients");
  return { ok: true, id: created[0].id, emailed };
}

interface RunDatePreviewShape {
  date: string;
  clashes: boolean;
}

/**
 * The dates a repeat would produce, each flagged if it is already taken.
 *
 * Read-only. Shown before saving because the insert is all-or-nothing: a
 * clash discovered on save loses the whole run, and finding out which of
 * fifteen dates was the problem by trial and error is miserable.
 */
export async function previewRun(input: {
  startDate: string;
  timeSlot: string;
  durationHours: number;
  pattern: RunPattern;
  count: number;
}): Promise<RunDatePreviewShape[]> {
  await requireAdmin();

  const count = Math.min(Math.max(Math.trunc(input.count) || 1, 1), 60);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) return [];
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.timeSlot)) return [];

  const dates = runDates(input.startDate, input.pattern, count);
  const ranges = dates.map((date) => ({
    date,
    startsAt: nepalToUtc(date, input.timeSlot),
    endsAt: nepalToUtc(date, addHours(input.timeSlot, input.durationHours)),
  }));

  const taken = await prisma.booking.findMany({
    where: {
      bookingStatus: { not: "CANCELLED" },
      startsAt: { lt: ranges[ranges.length - 1].endsAt },
      endsAt: { gt: ranges[0].startsAt },
    },
    select: { startsAt: true, endsAt: true },
  });

  return ranges.map((r) => ({
    date: r.date,
    clashes: taken.some((b) => r.startsAt < b.endsAt && r.endsAt > b.startsAt),
  }));
}

/** Postgres raises 23P01 (exclusion_violation) when the ranges overlap. */
function isOverlapViolation(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err);
  return text.includes("23P01") || text.includes("Booking_no_overlap");
}

/**
 * Edit an existing booking: move it, or correct its payment details.
 *
 * Plans change — the admin takes a day off, a client asks for a later
 * slot — and without this the only way to move a session was to delete it
 * and retype it, losing the record that it was ever the earlier time.
 *
 * Scope is deliberately mixed, and the form says so: the date, time,
 * length and amount belong to this one session, while the payment and
 * booking status apply to the whole group, because one order is paid for
 * and decided once.
 */
export async function updateBooking(
  id: string,
  formData: FormData,
): Promise<ManualBookingResult> {
  await requireAdmin();

  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Booking not found." };

  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;
  const notify = formData.get("notify") === "on";

  const startsAt = nepalToUtc(d.date, d.timeSlot);
  const endsAt = nepalToUtc(d.date, addHours(d.timeSlot, d.durationHours));
  const [y, m, day] = d.date.split("-").map(Number);

  const moved =
    startsAt.getTime() !== existing.startsAt.getTime() ||
    endsAt.getTime() !== existing.endsAt.getTime();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          clientName: d.clientName,
          clientEmail: d.clientEmail,
          consultationTopic: d.consultationTopic,
          date: new Date(Date.UTC(y, m - 1, day)),
          timeSlot: d.timeSlot,
          durationHours: d.durationHours,
          startsAt,
          endsAt,
          amountNpr: d.amountNpr,
          transactionId: d.transactionId || existing.transactionId,
          adminNote: d.adminNote || null,
          paymentStatus: d.paymentStatus,
          bookingStatus: d.bookingStatus,
        },
      });

      // One order is paid for once, so the statuses move together even
      // though the time only moved for this session.
      if (existing.groupId) {
        await tx.booking.updateMany({
          where: { groupId: existing.groupId, id: { not: id } },
          data: {
            paymentStatus: d.paymentStatus,
            bookingStatus: d.bookingStatus,
          },
        });
      }
    });
  } catch (err) {
    if (isOverlapViolation(err)) {
      return {
        ok: false,
        message:
          "That time overlaps another booking. Pick a different time, or cancel the other one first.",
      };
    }
    console.error("[admin] booking update failed:", err);
    return { ok: false, message: "Could not save. Please try again." };
  }

  let emailed = false;
  if (notify) {
    const payload: BookingEmailData = {
      id: existing.groupId ?? existing.id,
      clientName: d.clientName,
      clientEmail: d.clientEmail,
      consultationTopic: d.consultationTopic,
      sessions: [
        { dateKey: d.date, timeSlot: d.timeSlot, durationHours: d.durationHours },
      ],
      transactionId: d.transactionId || existing.transactionId,
      amountNpr: d.amountNpr,
      discountNpr: 0,
      couponCode: null,
    };
    emailed = moved
      ? await sendBookingRescheduled(payload, d.adminNote || null)
      : await sendBookingConfirmed(payload, d.adminNote || null);
    await prisma.booking
      .update({ where: { id }, data: { emailFailed: !emailed } })
      .catch(() => {});
  }

  // The old slot is free again and the new one is taken, so the public
  // calendar has to be rebuilt either way.
  revalidatePath("/book");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/clients");
  return { ok: true, id, emailed };
}
