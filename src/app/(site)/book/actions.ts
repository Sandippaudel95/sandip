"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingSchema, fieldErrorsOf, type ActionResult } from "@/lib/validation";
import {
  configuredTimes,
  dailyCapMessage,
  earliestStart,
  hoursBookedBy,
  lastBookableDate,
} from "@/lib/slots";
import { addHours, nepalToUtc } from "@/lib/time";
import {
  sendAdminNotice,
  sendBookingReceived,
  type BookingEmailData,
} from "@/lib/email";
import {
  couponRejectionMessage,
  quote,
  quoteOrFullPrice,
  type Quote,
} from "@/lib/pricing";
import { getAvailabilitySettings } from "@/lib/availability";

/* Neon suspends an idle compute and takes several seconds to wake. Prisma
   waits only 2s for a connection by default, so the first booking after a
   quiet spell fails with P2028 before any work happens. These give the
   database room to come back. */
const TX_OPTIONS = { maxWait: 15_000, timeout: 20_000 };

const SLOT_TAKEN =
  "That time has just been taken by someone else. Please choose another slot.";

export type CouponPreview =
  | { ok: true; quote: Quote }
  | { ok: false; message: string };

/**
 * Check a coupon and return the price it produces.
 *
 * Only ever a preview: createBooking recomputes the quote itself, so a
 * client that fakes or replays this result still pays the right amount.
 */
export async function previewCoupon(
  code: string,
  durationHours: number,
): Promise<CouponPreview> {
  const hours = Number(durationHours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 3) {
    return { ok: false, message: "Choose a session length first." };
  }

  const result = await quote(hours, code);
  if ("rejected" in result) {
    return { ok: false, message: couponRejectionMessage[result.rejected] };
  }
  return { ok: true, quote: result.quote };
}

export async function createBooking(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const input = parsed.data;

  // Honeypot. Silently accept so a bot learns nothing, but save nothing.
  if (input.website) return { ok: true, reference: "ok" };

  const {
    date,
    timeSlot,
    durationHours,
    clientName,
    clientEmail,
    consultationTopic,
    transactionId,
  } = input;

  // Priced here, never from anything the browser sent. An invalid coupon
  // is ignored rather than failing the booking: the client has already
  // paid by this point, and the full price is the safe fallback.
  const submittedCoupon = String(formData.get("couponCode") ?? "").trim();
  const q = await quoteOrFullPrice(durationHours, submittedCoupon);

  const startsAt = nepalToUtc(date, timeSlot);
  const endsAt = nepalToUtc(date, addHours(timeSlot, durationHours));

  // Re-read the rules here rather than trusting anything the form sent:
  // the admin may have closed this slot since the page was rendered.
  const rules = await getAvailabilitySettings();

  if (!rules.sessionLengths.includes(durationHours)) {
    return { ok: false, message: "That session length is not offered." };
  }

  // The slot must be one we actually offer, and every hour it spans must be
  // inside opening hours. Without this a crafted POST could book 03:00.
  const offered = configuredTimes(date, rules);
  for (let h = 0; h < durationHours; h += 1) {
    if (!offered.includes(addHours(timeSlot, h))) {
      return { ok: false, message: "That time is not available for booking." };
    }
  }

  if (startsAt < earliestStart(rules)) {
    return {
      ok: false,
      message: "That time is too soon. Please choose a later slot.",
    };
  }

  if (date > lastBookableDate(rules)) {
    return { ok: false, message: "That date is too far ahead." };
  }

  const [y, m, d] = date.split("-").map(Number);

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      // Serialise concurrent submissions from the same person for the same
      // day. Under READ COMMITTED both could otherwise read the old total and
      // both pass the cap. The lock is held to the end of the transaction and
      // only blocks this one email-and-date pair.
      const lockKey = `${clientEmail.toLowerCase()}|${date}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // Daily cap, per client, read on the transaction's own connection.
      const already = await hoursBookedBy(clientEmail, date, tx);
      if (already + durationHours > rules.maxHoursPerClientPerDay) {
        throw new CapExceeded(
          dailyCapMessage(already, rules.maxHoursPerClientPerDay),
        );
      }

      // Every booking belongs to a client record, so the CRM has a person
      // to hang history on rather than a loose email string.
      const client = await tx.client.upsert({
        where: { email: clientEmail.trim().toLowerCase() },
        update: { name: clientName },
        create: { email: clientEmail.trim().toLowerCase(), name: clientName },
      });

      return tx.booking.create({
        data: {
          clientId: client.id,
          clientName,
          clientEmail,
          consultationTopic,
          date: new Date(Date.UTC(y, m - 1, d)),
          timeSlot,
          durationHours,
          startsAt,
          endsAt,
          transactionId,
          amountNpr: q.totalNpr,
          discountNpr: q.discountNpr,
          couponCode: q.couponCode,
        },
      });
    }, TX_OPTIONS);
  } catch (err) {
    if (err instanceof CapExceeded) {
      return { ok: false, message: err.message };
    }
    // The exclusion constraint rejected an overlap: someone booked this slot
    // between the availability query and this insert. This is the race the
    // constraint exists to catch, and it is expected under load.
    if (isOverlapViolation(err)) {
      return { ok: false, message: SLOT_TAKEN };
    }
    console.error("[booking] create failed:", err);
    return {
      ok: false,
      message: "Something went wrong saving your booking. Please try again.",
    };
  }

  // Email must never fail the booking: it is already saved.
  const payload: BookingEmailData = {
    id: created.id,
    clientName: created.clientName,
    clientEmail: created.clientEmail,
    consultationTopic: created.consultationTopic,
    dateKey: date,
    timeSlot: created.timeSlot,
    durationHours: created.durationHours,
    transactionId: created.transactionId,
    amountNpr: created.amountNpr,
    discountNpr: created.discountNpr,
    couponCode: created.couponCode,
  };

  const [toClient, toAdmin] = await Promise.all([
    sendBookingReceived(payload),
    sendAdminNotice(payload),
  ]);

  if (!toClient || !toAdmin) {
    await prisma.booking
      .update({ where: { id: created.id }, data: { emailFailed: true } })
      .catch((e) => console.error("[booking] could not flag email failure:", e));
  }

  return { ok: true, reference: created.id };
}

class CapExceeded extends Error {}

/** Postgres raises 23P01 (exclusion_violation) when the ranges overlap. */
function isOverlapViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2010 wraps a raw database error; P2002 is a unique violation.
    if (err.code === "P2002") return true;
    const meta = err.meta as { code?: string } | undefined;
    if (meta?.code === "23P01") return true;
  }
  return (
    err instanceof Error &&
    (err.message.includes("23P01") ||
      err.message.includes("Booking_no_overlap"))
  );
}
