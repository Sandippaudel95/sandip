"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { fieldErrorsOf } from "@/lib/validation";
import { addHours, nepalToUtc } from "@/lib/time";
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

export type ManualBookingResult =
  | { ok: true; id: string; emailed: boolean }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const schema = z.object({
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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
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

  const parsed = schema.safeParse(Object.fromEntries(formData));
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

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const client = await tx.client.upsert({
        where: { email: d.clientEmail },
        update: { name: d.clientName },
        create: { email: d.clientEmail, name: d.clientName },
      });

      return tx.booking.create({
        data: {
          groupId: randomUUID(),
          clientId: client.id,
          clientName: d.clientName,
          clientEmail: d.clientEmail,
          consultationTopic: d.consultationTopic,
          date: new Date(Date.UTC(y, m - 1, day)),
          timeSlot: d.timeSlot,
          durationHours: d.durationHours,
          startsAt,
          endsAt,
          // Nothing was paid through the site, so there is no reference to
          // record unless the admin has one from a bank transfer.
          transactionId: d.transactionId || "Added by admin",
          amountNpr: d.amountNpr,
          discountNpr: 0,
          couponCode: null,
          paymentStatus: d.paymentStatus,
          bookingStatus: d.bookingStatus,
          adminNote: d.adminNote || null,
        },
      });
    });
  } catch (err) {
    if (isOverlapViolation(err)) {
      return {
        ok: false,
        message:
          "That time overlaps a booking that already exists. Check the calendar and pick another.",
      };
    }
    console.error("[admin] manual booking failed:", err);
    return { ok: false, message: "Could not save. Please try again." };
  }

  let emailed = false;
  if (notify) {
    const payload: BookingEmailData = {
      id: created.groupId ?? created.id,
      clientName: created.clientName,
      clientEmail: created.clientEmail,
      consultationTopic: created.consultationTopic,
      sessions: [
        {
          dateKey: d.date,
          timeSlot: created.timeSlot,
          durationHours: created.durationHours,
        },
      ],
      transactionId: created.transactionId,
      amountNpr: created.amountNpr,
      discountNpr: 0,
      couponCode: null,
    };
    emailed = await sendBookingConfirmed(payload, created.adminNote);
    if (!emailed) {
      await prisma.booking
        .update({ where: { id: created.id }, data: { emailFailed: true } })
        .catch(() => {});
    }
  }

  // The slot is now taken, so the public calendar has to stop offering it.
  revalidatePath("/book");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/clients");
  return { ok: true, id: created.id, emailed };
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

  const parsed = schema.safeParse(Object.fromEntries(formData));
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
